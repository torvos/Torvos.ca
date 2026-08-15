/**
 * Command execution pipeline for TerminalEngine. This is where a fully
 * parsed/expanded command line actually gets run: alias/brace expansion,
 * `;`-separated command sequencing, variable assignment (`X=value`),
 * `|` piping between commands, wildcard expansion, I/O redirection
 * (`>`, `>>`, `<`, `2>`, `2>>`), and finally dispatching to the matching
 * entry in window.Commands (or a script file via `sh`, or a
 * "command not found" error).
 */
Object.assign(TerminalEngine.prototype, {

    /**
     * Top-level entry point: takes a raw line of shell input the user
     * pressed Enter on, expands it, and executes each resulting command
     * (writing output/errors directly to the terminal as it goes).
     * @param {string} input - Raw command line text.
     */
    async execute(input) {
        this.lastExpansionEmpty = false;

        // Expand aliases (e.g. "ll" -> "ls -la") and brace patterns
        // (e.g. "echo {a,b}" -> two commands to run: "echo a", "echo b")
        input = this.expandAlias(input);
        const expandedCommands = this.expandBraces(input);

        for (const expandedInput of expandedCommands) {
            // Split on unquoted ";" to get each sequential command/group
            const commandGroups = this.splitTopLevel(expandedInput, ";")
                .map(cmd => cmd.trim())
                .filter(Boolean);

            for (const rawGroup of commandGroups) {
                // Expand $VAR, $?, and $((arithmetic)) references, then resolve
                // any $(command substitution) by actually running the inner command
                let group = this.expandArithmetic(this.expandVariables(rawGroup));
                group = await this.expandCommandSubstitution(group);

                // Split on unquoted "|" to build the pipeline stages
                const pipeline = this.splitTopLevel(group, "|")
                    .map(cmd => cmd.trim())
                    .filter(Boolean);

                // A lone "NAME=value" (no pipe) is treated as an environment
                // variable assignment rather than a command to run.
                const assignMatch = pipeline.length === 1 &&
                    pipeline[0].match(/^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/);

                if (assignMatch) {
                    const varName = assignMatch[1];
                    let varValue = assignMatch[2];
                    const isAnsiC =
                        varValue.startsWith("$'") && varValue.endsWith("'") && varValue.length >= 3;
                    const isQuoted =
                        (varValue.startsWith('"') && varValue.endsWith('"') && varValue.length >= 2) ||
                        (varValue.startsWith("'") && varValue.endsWith("'") && varValue.length >= 2);
                    if (isAnsiC) {
                        varValue = this.expandAnsiCEscapes(varValue.slice(2, -1));
                    } else if (isQuoted) {
                        varValue = varValue.slice(1, -1);
                    }
                    this.env[varName] = varValue;
                    this.lastExitCode = 0;
                    continue; // nothing further to execute for this group
                }

                let stdin = ""; // piped input carried between pipeline stages

                for (let index = 0; index < pipeline.length; index++) {
                    const parsed = this.parseCommand(pipeline[index]);
                    const cmd = parsed.cmd;

                    // Expand any wildcard args (*, ?) against the filesystem;
                    // args with no matches are passed through literally, but
                    // flagged via lastExpansionEmpty if they looked like a glob.
                    let args = [];
                    for (const arg of parsed.args) {
                        const expanded = this.fs.expandWildcards(arg, this.cwd);
                        if (expanded.length > 0) {
                            args.push(...expanded);
                        } else {
                            if (arg.includes("*") || arg.includes("?")) {
                                this.lastExpansionEmpty = true;
                            }
                            args.push(arg);
                        }
                    }                    
                    const redirects = parsed.redirects;

                    // Input redirection (`< file`) - read the file's content as stdin
                    if (redirects.operator === "<") {
                        const node = this.fs.get(redirects.target, this.cwd);
                        if (!node || !this.fs.isFile(node)) {
                            stdin = "";
                            if (index === pipeline.length - 1) {
                                this.write(
                                    this.formatErrorLine(`${redirects.target}: No such file`)
                                );
                            }
                            break;
                        }
                        stdin = node.content ?? "";
                    }

                    let result;
                    
                    const command = window.Commands?.[cmd];

                    if (command?.execute) {
                        // Registered built-in command - run its execute() handler
                        try {
                            result = await command.execute(
                                this,
                                args,
                                stdin
                            );
                        } catch (err) {
                            result = {
                                stdout: "",
                                stderr: `${cmd}: ${err.message}`,
                                exitCode: 1
                            };
                        }
                    }
                    else if (cmd.includes("/")) {
                        // Not a built-in, but looks like a path (e.g. "./script.sh")
                        // - try to run it as a shell script via the `sh` command
                        try {
                            result = await window.Commands.sh.runScript(
                                this,
                                cmd,
                                args,
                                { trace: this.env.SCRIPTDEBUG, label: cmd }
                            );
                        } catch (err) {
                            result = {
                                stdout: "",
                                stderr: `${cmd}: ${err.message}`,
                                exitCode: 1
                            };
                        }
                    }
                    else {
                        // Not a known command and not a path -> classic shell error
                        result = {
                            stdout:"",
                            stderr:`command not found: ${cmd}`,
                            exitCode:127
                        };
                    }

                    // Normalize a plain string return value into the standard
                    // {stdout, stderr, exitCode} result shape
                    if (typeof result === "string") {
                        result = {
                            stdout: result,
                            stderr:"",
                            exitCode:0
                        };
                    }

                    result.stdout ??= "";
                    result.stderr ??= "";
                    result.exitCode ??= 0;
                    this.lastExitCode = result.exitCode;
                    let redirectreturn = "";

                    // Apply output redirection, if any, writing stdout/stderr to a file instead
                    switch (redirects.operator) {
                        case ">":
                            redirectreturn = this.writeRedirect(
                                redirects.target,
                                result.stdout,
                                false
                            );
                            if (typeof redirectreturn === 'string'){
                                result.stderr = redirectreturn;
                                result.exitCode = 1;
                            }
                            break;
                        case ">>":
                            redirectreturn = this.writeRedirect(
                                redirects.target,
                                result.stdout,
                                true
                            );
                            if (typeof redirectreturn === 'string'){
                                result.stderr = redirectreturn;
                                result.exitCode = 1;
                            }
                            break;
                        case "2>":
                            redirectreturn = this.writeRedirect(
                                redirects.target,
                                result.stderr,
                                false
                            );
                            if (typeof redirectreturn === 'string'){
                                result.stderr = redirectreturn;
                                result.exitCode = 1;
                            }
                            break;
                        case "2>>":
                            redirectreturn = this.writeRedirect(
                                redirects.target,
                                result.stderr,
                                true
                            );
                            if (typeof redirectreturn === 'string'){
                                result.stderr = redirectreturn;
                                result.exitCode = 1;
                            }
                            break;
                    }

                    this.lastExitCode = result.exitCode;

                    if (result.exitCode !== 0) {
                        // Non-zero exit: print stderr (line by line, with a small
                        // delay for effect) and stop the rest of the pipeline.
                        if (result.stderr) {
                            const lines = result.stderr.split(/\r?\n/);
                            for (const line of lines) {
                                this.write(this.formatErrorLine(line));
                                await this.sleep(50);
                            }
                        }
                        break;
                    }

                    // Successful stage - its stdout becomes stdin for the next pipeline stage
                    stdin = result.stdout;

                    // Only the LAST stage's stdout is actually printed to the terminal
                    // (earlier stages' output is consumed by the next stage in the pipe)
                    if (index === pipeline.length - 1) {
                        if (result.stdout) {
                            const lines =
                                result.stdout.split(/\r?\n/);
                            // A command can optionally return `stdoutSegments`
                            // - an array of colored { text, color } segments
                            // per line, parallel to `stdout`'s lines - to
                            // color parts of its output (e.g. ls coloring
                            // directory names). Only used for display; piping
                            // and redirection always use the plain `stdout`
                            // string above, untouched. If a command's
                            // stdoutSegments doesn't line up 1:1 with its own
                            // stdout (a bug in that command), ignore it
                            // entirely and fall back to plain rendering
                            // rather than risk printing mismatched/missing
                            // lines.
                            const validSegments =
                                Array.isArray(result.stdoutSegments) &&
                                result.stdoutSegments.length === lines.length;
                            for (let i = 0; i < lines.length; i++) {
                                const segments = validSegments
                                    ? result.stdoutSegments[i]
                                    : undefined;
                                this.write(
                                    segments ?? lines[i],
                                    { color: "#ffffff" }
                                );
                                await this.sleep(50);
                            }
                        }
                    }
                }
            }
        }
    },

    // Runs a command (or pipeline) and returns its {stdout, stderr, exitCode}
    // WITHOUT writing anything to the terminal. Used by $(...) command
    // substitution. Supports variables/arithmetic/nested substitution and
    // pipes, but not ; sequencing or redirects (same as real shells' $(...)).
    async runCaptured(input) {
        let expanded = this.expandArithmetic(this.expandVariables(input));
        expanded = await this.expandCommandSubstitution(expanded);

        const pipeline = this.splitTopLevel(expanded, "|")
            .map(cmd => cmd.trim())
            .filter(Boolean);

        let stdin = "";
        let result = { stdout: "", stderr: "", exitCode: 0 };

        for (const stage of pipeline) {
            const parsed = this.parseCommand(stage);
            const cmd = parsed.cmd;
            let args = [];
            for (const arg of parsed.args) {
                const expandedArg = this.fs.expandWildcards(arg, this.cwd);
                args.push(...(expandedArg.length > 0 ? expandedArg : [arg]));
            }

            const command = window.Commands?.[cmd];
            if (command?.execute) {
                try {
                    result = await command.execute(this, args, stdin);
                } catch (err) {
                    result = { stdout: "", stderr: `${cmd}: ${err.message}`, exitCode: 1 };
                }
            } else if (cmd && cmd.includes("/")) {
                try {
                    result = await window.Commands.sh.runScript(this, cmd, args, { label: cmd });
                } catch (err) {
                    result = { stdout: "", stderr: `${cmd}: ${err.message}`, exitCode: 1 };
                }
            } else {
                result = { stdout: "", stderr: `command not found: ${cmd}`, exitCode: 127 };
            }

            if (typeof result === "string") {
                result = { stdout: result, stderr: "", exitCode: 0 };
            }
            result.stdout ??= "";
            result.stderr ??= "";
            result.exitCode ??= 0;

            stdin = result.stdout;
        }

        this.lastExitCode = result.exitCode;
        return result;
    },

    /**
     * Writes (or appends) text to a file for output redirection (>, >>, 2>, 2>>).
     * Creates the target file if it doesn't exist yet (as long as its parent
     * directory exists). Refuses to write into /bin.
     * @param {string} path - Target file path (relative or absolute).
     * @param {string} text - Content to write/append.
     * @param {boolean} [append=false] - Append instead of overwrite.
     * @returns {true|string} true on success, or an error message string on failure.
     */
    writeRedirect(path, text, append = false) {
        if(this.fs.isInBin(path, this.cwd)){
            return `Cannot create files in /bin`;
        }             
        let node = this.fs.get(path, this.cwd);
        if (!node) {
            // Target doesn't exist yet - try to create it in its parent directory
            const parent = this.fs.getParent(path, this.cwd);
            if (!parent || !this.fs.isDirectory(parent.parent)) {
                return `Invalid parent directory`;
            }
            parent.parent.children[parent.name] = this.fs.createFile(parent.name.startsWith("."));
            node = parent.parent.children[parent.name];
        }
        if (!this.fs.isFile(node)) {
            return `Invalid directory specified in redirection operator`;
        }

        node.content = append
            ? ((node.content ?? "") 
                ? node.content + "\n" + (text ?? "")
                : (text ?? ""))
            : (text ?? "");

        node.modified = Date.now();
        node.accessed = Date.now();


        this.saveSettings();

        return true;
    },

    /**
     * Changes the current working directory, validating that the resolved
     * path exists and is a directory before committing the change.
     * @param {string} path - Target path (relative or absolute).
     * @returns {string|undefined} An error message string on failure, or
     *   undefined on success (and updates this.cwd + re-renders the prompt).
     */
    changeDirectory(path) {
        const resolved = this.fs.getFullPath(path, this.cwd);
        const node = this.fs.getNode(resolved);
        if (!node) {
            return `cd: ${path}: No such file or directory`;
        }
        if (!this.fs.isDirectory(node)) {
            return `cd: ${path}: Not a directory`;
        }
        this.cwd = resolved;
        this.renderPrompt();
    }

});
