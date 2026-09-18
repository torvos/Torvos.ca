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
     * Sets up every redirect for one command stage, in the order they were
     * written, exactly like a real shell opens each file descriptor in
     * sequence before the command ever runs:
     *  - `<` reads its target immediately; the LAST `<` (if there's more
     *    than one) is what the command actually receives as stdin.
     *  - `>`/`>>`/`2>`/`2>>` truncate (`>`) or touch (`>>`, which never
     *    truncates - only creates the file if it's missing) their target
     *    immediately too, the same way opening an fd for writing does -
     *    which is why an earlier, later-overridden target (the `a` in
     *    `echo hi > a > b`) still ends up created-and-empty rather than
     *    untouched. Only the LAST redirect for a given stream (stdout or
     *    stderr) is remembered to actually receive the command's real
     *    output once it's run - see applyOutputRedirects() below.
     * On the first redirect that fails to open at all (missing/unreadable
     * input file, unwritable output path), setup stops right there,
     * matching real shells: the command never runs, and any redirect that
     * failed to even fully set up doesn't affect this stage's stdin.
     * Shared between the main pipeline dispatch and runCaptured() (used
     * by `$(...)` command substitution), so both honor redirects the
     * exact same way.
     * @param {Array<{operator: string, target: string}>} redirects
     * @param {string|null} initialStdin - Stdin as it stood before this
     *   stage's own `<` redirects (if any) are applied - e.g. piped in
     *   from an earlier pipeline stage.
     * @returns {{error: string|null, stdin: string|null, stdoutRedirect: Object|null, stderrRedirect: Object|null}}
     */
    setupRedirects(redirects, initialStdin = null) {
        let stdin = initialStdin;
        let stdoutRedirect = null;
        let stderrRedirect = null;
        let error = null;

        for (const redirect of redirects) {
            if (redirect.operator === "<") {
                const node = this.fs.get(redirect.target, this.cwd);
                if (!node || (!this.fs.isFile(node) && !this.fs.isDevice(node))) {
                    error = `${redirect.target}: No such file`;
                } else if (
                    // Reading a protected, non-device file (e.g. /bin/ls)
                    // is blocked - reading an existing device (e.g.
                    // /dev/random) is exactly what it's there for.
                    this.fs.isProtected(redirect.target, this.cwd) && !this.fs.isDevice(node)
                ) {
                    error = `${redirect.target}: Permission denied`;
                } else {
                    stdin = this.fs.readContent(node);
                }
            } else {
                const isAppend = redirect.operator === ">>" || redirect.operator === "2>>";
                const setupResult = this.writeRedirect(redirect.target, "", isAppend);
                if (typeof setupResult === "string") {
                    error = setupResult;
                } else if (redirect.operator === ">" || redirect.operator === ">>") {
                    stdoutRedirect = redirect;
                } else {
                    stderrRedirect = redirect;
                }
            }
            if (error) break;
        }

        return { error, stdin, stdoutRedirect, stderrRedirect };
    },

    /**
     * Applies output redirection (if any) to an already-produced command
     * result, writing stdout/stderr to a file instead of leaving them in
     * `result` - `stdoutRedirect`/`stderrRedirect` are already resolved
     * (by setupRedirects() above) to whichever redirect for that stream
     * was LAST in the command: an earlier same-stream redirect was already
     * truncated/touched during setup and receives nothing further,
     * matching a real shell reassigning the fd. On success, the redirected
     * stream is cleared from `result` so it isn't ALSO printed to the
     * terminal (or substituted by `$(...)`) - real shells never show
     * output once it's been redirected to a file. The exit code is
     * untouched either way (a command's success/failure isn't affected by
     * where its output went); only the failure branch here still surfaces
     * text, since that's reporting a NEW error (e.g. an invalid path)
     * about the redirect itself, not the original command's output.
     * @param {{stdout: string, stderr: string, exitCode: number}} result
     * @param {Object|null} stdoutRedirect
     * @param {Object|null} stderrRedirect
     * @returns {{stdout: string, stderr: string, exitCode: number}} `result`, mutated in place.
     */
    applyOutputRedirects(result, stdoutRedirect, stderrRedirect) {
        if (stdoutRedirect) {
            const redirectReturn = this.writeRedirect(
                stdoutRedirect.target,
                result.stdout,
                stdoutRedirect.operator === ">>"
            );
            if (typeof redirectReturn === "string") {
                result.stderr = redirectReturn;
                result.exitCode = EXIT_FAILURE;
            } else {
                result.stdout = "";
            }
        }
        if (stderrRedirect) {
            const redirectReturn = this.writeRedirect(
                stderrRedirect.target,
                result.stderr,
                stderrRedirect.operator === "2>>"
            );
            if (typeof redirectReturn === "string") {
                result.stderr = redirectReturn;
                result.exitCode = EXIT_FAILURE;
            } else {
                result.stderr = "";
            }
        }
        return result;
    },

    /**
     * Top-level entry point: takes a raw line of shell input and expands +
     * executes it (writing output/errors directly to the terminal as it
     * goes, by default).
     *
     * `options.capture` (used internally by sh.js, not by normal user
     * input) switches to accumulating stdout/stderr into a returned
     * {stdout, stderr, exitCode} instead of writing them - so a script
     * statement's output can flow into a pipe or redirect like any other
     * command's, instead of always being printed live. See the comment on
     * `this._pipeOutputConsumed` below for how this is decided.
     * @param {string} input - Raw command line text.
     * @param {Object} [options]
     * @param {boolean} [options.capture=false]
     * @returns {Promise<{stdout:string, stderr:string, exitCode:number}>|undefined}
     */
    async execute(input, options = {}) {
        const capture = options.capture === true;
        const capturedOut = [];
        const capturedErr = [];

        // Writes one unit of output (a line, possibly with color segments)
        // - or, in capture mode, accumulates it instead and skips the
        // per-line animation delay (there's no point animating work
        // nobody can see yet).
        const emit = async (text, opts) => {
            if (capture) {
                capturedOut.push(
                    typeof text === "string"
                        ? text
                        : (Array.isArray(text) ? text.map(s => s.text ?? s).join("") : String(text))
                );
            } else {
                this.write(text, opts);
                await this.sleep(LINE_PRINT_DELAY_MS);
            }
        };
        const emitErrorLine = async (line) => {
            if (capture) {
                capturedErr.push(line);
            } else {
                this.write(this.formatErrorLine(line));
                await this.sleep(LINE_PRINT_DELAY_MS);
            }
        };
        this.lastExpansionEmpty = false;

        // A quote that never finds its matching close (`echo "hello` or
        // `echo 'hello`) is a genuine syntax error in a real shell - one
        // that's interactive would just show a continuation prompt (PS2)
        // and wait for more input rather than running anything; a
        // one-shot invocation (like every command this terminal runs)
        // instead refuses to run any of it. This terminal has no
        // multi-line continuation, so rejecting the line outright here -
        // instead of silently treating "the rest of the line" as though
        // the quote had been closed, which is what everything below would
        // otherwise do on its own - is the closest faithful match.
        if (this.hasUnterminatedQuotes(input)) {
            const line = "syntax error: unexpected end of file (unterminated quote)";
            this.lastExitCode = EXIT_SYNTAX_ERROR;
            if (capture) {
                return { stdout: "", stderr: line, exitCode: EXIT_SYNTAX_ERROR };
            }
            await emitErrorLine(line);
            return;
        }

        // Expand aliases (e.g. "ll" -> "ls -la") and brace patterns
        // (e.g. "echo {a,b}" -> two commands to run: "echo a", "echo b")
        input = this.expandAlias(input);
        const expandedCommands = this.expandBraces(input);

        // A pipe or and-or operator ("|", "&&", "||") with a missing
        // command on one side ("| cmd", "cmd |", "cmd | | cmd2", "cmd &&",
        // ...) is a syntax error, same as an unterminated quote above -
        // checked across every brace-expanded variant BEFORE any of them
        // run, so (matching real shells, which refuse to run anything on a
        // line with a syntax error anywhere in it) an error later in the
        // line can't let something earlier on it run first.
        for (const expandedInput of expandedCommands) {
            const badToken = this.findMalformedShellSyntax(expandedInput);
            if (badToken) {
                const line = `syntax error near unexpected token \`${badToken}'`;
                this.lastExitCode = EXIT_SYNTAX_ERROR;
                if (capture) {
                    return { stdout: "", stderr: line, exitCode: EXIT_SYNTAX_ERROR };
                }
                await emitErrorLine(line);
                return;
            }
        }

        for (const expandedInput of expandedCommands) {
            // Split on unquoted ";" to get each sequential command/group
            const commandGroups = this.splitTopLevel(expandedInput, ";")
                .map(cmd => cmd.trim())
                .filter(Boolean);

            for (const rawGroup of commandGroups) {
                for (const segment of this.splitAndOr(rawGroup)) {
                    // "&&" only runs if the previous segment succeeded;
                    // "||" only runs if it failed. The very first segment
                    // (op === null) always runs. Skipping still lets the
                    // OUTER for-loop reach any later segments - matching
                    // real bash, e.g. `false && echo a || echo b` runs
                    // "echo b" even though "echo a" is skipped.
                    if (segment.op === "&&" && this.lastExitCode !== EXIT_SUCCESS) {
                        continue;
                    }
                    if (segment.op === "||" && this.lastExitCode === EXIT_SUCCESS) {
                        continue;
                    }
                    // Expand $VAR, $?, and $((arithmetic)) references first.
                    // Note this uses the environment as it stood BEFORE any
                    // assignment(s) below - real bash resolves the words of
                    // a simple command using the shell's existing variable
                    // table, and a prefix assignment on that SAME command
                    // only ever updates the environment the command's own
                    // process actually runs in, never the parent shell's
                    // variable-substitution text (that's already been
                    // resolved to plain text by now). This is why, in real
                    // bash, `FOO=hello echo $FOO` prints whatever $FOO
                    // already was - NOT "hello" - even though `echo` itself
                    // does see FOO=hello in ITS OWN environment (e.g.
                    // `FOO=hello printenv FOO` DOES print "hello", since
                    // printenv reads its process's environment directly
                    // rather than via shell substitution).
                    let group = this.expandArithmetic(this.expandVariables(segment.text));

                    // Peel off any number of leading "NAME=value" words.
                    // This must happen BEFORE resolving $(...) command
                    // substitution and BEFORE splitting on "|": like real
                    // shells, the right-hand side of an assignment is never
                    // word-split, so a substituted value's own ";"/"|"
                    // characters (e.g. `x=$(cat file)` where the file
                    // contains a pipe) must not be reinterpreted here as
                    // pipe/statement separators. splitLeadingAssignments()
                    // finds each assignment word's boundary without
                    // resolving any $(...) it contains, for the same reason.
                    const { assignments, rest } = this.splitLeadingAssignments(group);

                    if (assignments.length > 0 && rest.trim() === "") {
                        // One or more assignments with nothing after them
                        // (e.g. "x=5" or "x=5 y=6") - a real, PERSISTENT
                        // shell variable assignment, not a temporary
                        // override for some command.
                        //
                        // A plain assignment ("x=5") always succeeds, but if
                        // a value contains command substitution(s)
                        // ("x=$(false)"), real bash reports $? as the exit
                        // status of the LAST substitution run anywhere in
                        // this line - not unconditional success. Default to
                        // success here; expandCommandSubstitution's calls to
                        // runCaptured() below will overwrite this.lastExitCode
                        // with the real exit code as a side effect if (and
                        // only if) a substitution actually ran, so it's left
                        // alone after that rather than being reset to
                        // EXIT_SUCCESS.
                        this.lastExitCode = EXIT_SUCCESS;
                        for (const { name, rawValue } of assignments) {
                            const varValue = this.dequoteAssignmentValue(
                                await this.expandCommandSubstitution(rawValue)
                            );
                            this.env[name] = varValue;
                        }
                        continue; // nothing further to execute for this group
                    }

                    // Any assignments followed by an actual command (e.g.
                    // "FOO=hello echo $FOO", "FOO=a BAR=b some-cmd") are a
                    // TEMPORARY override of that command's environment only
                    // - set for the duration of running it, then restored
                    // right afterward so they never leak into the shell's
                    // own variables, exactly like the persistent-assignment
                    // case above never runs when there's a command present.
                    let restoreEnv = null;
                    if (assignments.length > 0) {
                        restoreEnv = [];
                        for (const { name, rawValue } of assignments) {
                            const varValue = this.dequoteAssignmentValue(
                                await this.expandCommandSubstitution(rawValue)
                            );
                            restoreEnv.push({
                                name,
                                hadValue: Object.prototype.hasOwnProperty.call(this.env, name),
                                previousValue: this.env[name]
                            });
                            this.env[name] = varValue;
                        }
                        group = rest;
                    }

                    // Not a (pure) assignment - resolve $(...) command substitution now.
                    group = await this.expandCommandSubstitution(group);


                    // Split on unquoted "|" to build the pipeline stages
                    const pipeline = this.splitTopLevel(group, "|")
                        .map(cmd => cmd.trim())
                        .filter(Boolean);

                    // piped input carried between pipeline stages - `null` means
                    // "nothing is feeding this stage" (no earlier pipe stage, no
                    // `<` redirect), which is NOT the same as a stage that WAS fed
                    // input but that input happened to be empty (e.g.
                    // `printf '' | cat`, or `< empty.txt cat`). Commands that read
                    // stdin need to tell those two cases apart, so this only ever
                    // becomes "" once something has actually supplied it below.
                    let stdin = null;

                    // Prefix-assigned env vars (if any) need to actually be
                    // in place for the pipeline below to see them (e.g. a
                    // command reading terminal.env directly, like
                    // printenv/env - and a nested $(...) substitution in
                    // one of the command's own args, resolved just above,
                    // already saw them too), but must come back out
                    // afterward no matter how the pipeline finishes.
                    try {
                        for (let index = 0; index < pipeline.length; index++) {
                        const parsed = this.parseCommand(pipeline[index]);
                        const cmd = this.restoreGlobChars(parsed.cmd);

                        // Expand any wildcard args (*, ?) against the filesystem;
                        // args with no matches are passed through literally, but
                        // flagged via lastExpansionEmpty if they looked like a glob.
                        // A "*"/"?" that came from inside quotes was already swapped
                        // for an inert placeholder by tokenize() (see the comment
                        // there), so it doesn't trigger expansion here at all -
                        // restoreGlobChars() below swaps it back to the real
                        // character right before the command actually sees it.
                        let args = [];
                        for (const arg of parsed.args) {
                            const expanded = this.fs.expandWildcards(arg, this.cwd);
                            if (expanded.length > 0) {
                                args.push(...expanded.map((a) => this.restoreGlobChars(a)));
                            } else {
                                if (arg.includes("*") || arg.includes("?")) {
                                    this.lastExpansionEmpty = true;
                                }
                                args.push(this.restoreGlobChars(arg));
                            }
                        }                    
                        const redirects = parsed.redirects;

                        // Set up every redirect (see setupRedirects() below for the
                        // full rules); shared with runCaptured() so $(...) command
                        // substitution honors redirects the exact same way.
                        const setup = this.setupRedirects(redirects, stdin);
                        const redirectSetupError = setup.error;
                        stdin = setup.stdin;
                        const stdoutRedirect = setup.stdoutRedirect;
                        const stderrRedirect = setup.stderrRedirect;

                        let result;

                        const command = window.Commands?.[cmd];

                        // Tells a command (currently only sh.js pays attention
                        // to this) whether ANYTHING will actually consume its
                        // returned stdout/stderr - a later pipe stage, an
                        // output/error redirect on this stage, or (if this
                        // whole execute() call is itself running in capture
                        // mode, e.g. a script statement inside an outer script
                        // that's being piped/redirected) the caller of THIS
                        // execute() call. If nothing does, output can be
                        // written live to the screen as it's produced instead
                        // of being held until the command fully finishes.
                        this._pipeOutputConsumed =
                            capture ||
                            index < pipeline.length - 1 ||
                            !!stdoutRedirect ||
                            !!stderrRedirect;

                        if (redirectSetupError) {
                            // A redirect failed above - the command never runs at all
                            // (real shells don't run a command whose redirects
                            // couldn't be set up), but its failure still needs to
                            // flow through as this stage's result.
                            result = {
                                stdout: "",
                                stderr: redirectSetupError,
                                exitCode: EXIT_FAILURE
                            };
                        }
                        else if (command?.execute) {
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
                                    exitCode: EXIT_FAILURE
                                };
                            }
                            // Commands that can write to the virtual filesystem
                            // (rm, mv, cp, mkdir, ...) declare `mutatesFilesystem: true`
                            // on their registration - mark the session dirty so
                            // saveSettings() knows to persist it. Marked regardless
                            // of exit code: a partially-failed multi-target command
                            // (e.g. `rm -f a b` where only `a` exists) can still have
                            // mutated the filesystem before reporting an error.
                            if (command.mutatesFilesystem) {
                                this.fsDirty = true;
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
                                    exitCode: EXIT_FAILURE
                                };
                            }
                        }
                        else {
                            // Not a known command and not a path -> classic shell error
                            result = {
                                stdout:"",
                                stderr:`command not found: ${cmd}`,
                                exitCode: EXIT_COMMAND_NOT_FOUND
                            };
                        }

                        // Normalize a plain string return value into the standard
                        // {stdout, stderr, exitCode} result shape
                        if (typeof result === "string") {
                            result = {
                                stdout: result,
                                stderr:"",
                                exitCode: EXIT_SUCCESS
                            };
                        }

                        result.stdout ??= "";
                        result.stderr ??= "";
                        result.exitCode ??= 0;
                        this.lastExitCode = result.exitCode;

                        // Apply output redirection, if any (see
                        // applyOutputRedirects() below for the full rules;
                        // shared with runCaptured() for the same reason as
                        // setupRedirects() above).
                        result = this.applyOutputRedirects(result, stdoutRedirect, stderrRedirect);

                        this.lastExitCode = result.exitCode;

                        // Only the LAST stage's stdout is actually printed to the
                        // terminal (earlier stages' output is consumed by the next
                        // stage in the pipe). This happens regardless of exit code:
                        // a non-zero exit (e.g. `diff` reporting differences, or
                        // `grep -c` reporting zero matches) isn't necessarily an
                        // error - real shells still print stdout in that case, they
                        // just also surface the exit code via $? and stop further
                        // `&&` chaining. This must run BEFORE the error handling
                        // below, or a non-zero exit would swallow stdout entirely.
                        if (index === pipeline.length - 1 && result.stdout) {
                            const lines = result.stdout.split(/\r?\n/);
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
                                await emit(
                                    segments ?? lines[i],
                                    { color: COLOR_STDOUT }
                                );
                            }
                        }

                        if (result.exitCode !== 0) {
                            // Non-zero exit: print stderr (line by line, with a
                            // small delay for effect). This does NOT stop the
                            // rest of the pipeline - a real shell pipe runs every
                            // stage regardless of an earlier stage's exit code
                            // (only the pipe's overall exit status, via
                            // this.lastExitCode above, reflects the LAST stage).
                            // `false | echo hi` must still run `echo hi`, and
                            // `sh script.sh | grep x` must still run `grep` even
                            // if the script's last command failed (sh's own exit
                            // code is that command's, per its execute() below).
                            if (result.stderr) {
                                const lines = result.stderr.split(/\r?\n/);
                                for (const line of lines) {
                                    await emitErrorLine(line);
                                }
                            }
                        }

                        // Stage's stdout (possibly empty, if it failed) becomes
                        // stdin for the next pipeline stage, same as a real
                        // shell pipe - regardless of this stage's exit code.
                        stdin = result.stdout;
                        }
                    } finally {
                        if (restoreEnv) {
                            for (const { name, hadValue, previousValue } of restoreEnv) {
                                if (hadValue) {
                                    this.env[name] = previousValue;
                                } else {
                                    delete this.env[name];
                                }
                            }
                        }
                    }
                }
            }
        }

        if (capture) {
            return {
                stdout: capturedOut.join("\n"),
                stderr: capturedErr.join("\n"),
                exitCode: this.lastExitCode
            };
        }
    },

    // Runs a command (or pipeline) and returns its {stdout, stderr, exitCode}
    // WITHOUT writing anything to the terminal. Used by $(...) command
    // substitution. Supports variables/arithmetic/nested substitution and
    // pipes, but not ; sequencing or redirects (same as real shells' $(...)).
    async runCaptured(input) {
        // Same reasoning as the check in execute() - a pipe's validity is
        // part of the command's STRUCTURE, which is determined by the
        // literal text as typed, before any expansion; checking only
        // AFTER expanding (like the quote check just below does, for its
        // own good reason) would risk a "|" that only exists because some
        // unrelated substitution's OUTPUT happened to contain one being
        // flagged as if it had actually been typed as a pipe.
        const badToken = this.findMalformedShellSyntax(input);
        if (badToken) {
            return {
                stdout: "",
                stderr: `syntax error near unexpected token \`${badToken}'`,
                exitCode: EXIT_SYNTAX_ERROR
            };
        }

        let expanded = this.expandArithmetic(this.expandVariables(input));
        expanded = await this.expandCommandSubstitution(expanded);

        // Same check as the top of execute() - a variable's value could
        // itself splice in a stray quote character that only becomes
        // unbalanced once expanded in here, even if the original typed
        // line looked fine.
        if (this.hasUnterminatedQuotes(expanded)) {
            return {
                stdout: "",
                stderr: "syntax error: unexpected end of file (unterminated quote)",
                exitCode: EXIT_SYNTAX_ERROR
            };
        }

        const pipeline = this.splitTopLevel(expanded, "|")
            .map(cmd => cmd.trim())
            .filter(Boolean);

        // See the matching comment in the main dispatch loop above - `null`
        // means "no stdin was piped in", distinct from an empty string.
        let stdin = null;
        let result = { stdout: "", stderr: "", exitCode: EXIT_SUCCESS };

        for (const stage of pipeline) {
            const parsed = this.parseCommand(stage);
            const cmd = this.restoreGlobChars(parsed.cmd);
            let args = [];
            for (const arg of parsed.args) {
                const expandedArg = this.fs.expandWildcards(arg, this.cwd);
                const pieces = expandedArg.length > 0 ? expandedArg : [arg];
                args.push(...pieces.map((a) => this.restoreGlobChars(a)));
            }

            // Set up any redirects on this stage (>, >>, 2>, 2>>, <) the
            // same way the main dispatch loop does - previously this was
            // skipped entirely inside $(...) substitution, so something
            // like `$(echo hi > file)` silently threw the redirect away
            // instead of writing to `file`.
            const setup = this.setupRedirects(parsed.redirects, stdin);
            stdin = setup.stdin;

            const command = window.Commands?.[cmd];
            // Everything run inside $(...) has its output fully consumed
            // programmatically (never printed live) - see the matching
            // comment on this._pipeOutputConsumed in the main dispatch loop
            // above; sh.js checks this to decide whether to capture a
            // script's output instead of writing it straight to the screen.
            this._pipeOutputConsumed = true;
            if (setup.error) {
                // A redirect failed above - the command never runs at all,
                // same as the main dispatch loop.
                result = { stdout: "", stderr: setup.error, exitCode: EXIT_FAILURE };
            } else if (command?.execute) {
                try {
                    result = await command.execute(this, args, stdin);
                } catch (err) {
                    result = { stdout: "", stderr: `${cmd}: ${err.message}`, exitCode: EXIT_FAILURE };
                }
                // See the matching comment in the main dispatch loop above -
                // a mutating command run inside $(...) still needs to mark
                // the session dirty.
                if (command.mutatesFilesystem) {
                    this.fsDirty = true;
                }
            } else if (cmd && cmd.includes("/")) {
                try {
                    result = await window.Commands.sh.runScript(this, cmd, args, { label: cmd });
                } catch (err) {
                    result = { stdout: "", stderr: `${cmd}: ${err.message}`, exitCode: EXIT_FAILURE };
                }
            } else {
                result = { stdout: "", stderr: `command not found: ${cmd}`, exitCode: EXIT_COMMAND_NOT_FOUND };
            }

            if (typeof result === "string") {
                result = { stdout: result, stderr: "", exitCode: EXIT_SUCCESS };
            }
            result.stdout ??= "";
            result.stderr ??= "";
            result.exitCode ??= 0;

            if (!setup.error) {
                result = this.applyOutputRedirects(result, setup.stdoutRedirect, setup.stderrRedirect);
            }

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
        let node = this.fs.get(path, this.cwd);

        if (!node) {
            // Target doesn't exist yet - creating a brand-new entry
            // anywhere under a protected directory (/bin, /dev) is never
            // allowed, even though writing to an EXISTING device down
            // there (e.g. /dev/null) is fine - see the isProtected() case
            // just below for that distinction.
            if (this.fs.isProtected(path, this.cwd)) {
                return `Cannot create files here`;
            }
            // Try to create it in its parent directory
            const parent = this.fs.getParent(path, this.cwd);
            if (!parent || !this.fs.isDirectory(parent.parent)) {
                return `Invalid parent directory`;
            }
            parent.parent.children[parent.name] = this.fs.createFile(parent.name.startsWith("."));
            node = parent.parent.children[parent.name];
        } else if (this.fs.isProtected(path, this.cwd) && !this.fs.isDevice(node)) {
            // Existing target under a protected directory, but not a
            // device (e.g. /bin/ls) - devices are the one thing under a
            // protected directory that's genuinely meant to be written
            // to (that's the whole feature of /dev/null, /dev/full...).
            return `Permission denied`;
        }
        if (!this.fs.isFile(node) && !this.fs.isDevice(node)) {
            return `Invalid directory specified in redirection operator`;
        }

        const wrote = this.fs.writeContent(node, text ?? "", { append });
        if (!wrote) {
            // A device (e.g. /dev/full) refused the write
            return `No space left on device`;
        }

        node.accessed = Date.now();

        // Just mark the session dirty - saving here directly would mean a
        // single command with several redirects (`echo hi > a > b > c`,
        // now that multiple redirects on one command are supported) pays
        // for a full filesystem re-serialization once per redirect,
        // instead of once for the whole command. handleEnter() already
        // calls saveSettings() exactly once after every command finishes
        // (same as every other filesystem-mutating command does via the
        // `mutatesFilesystem` flag above) - that single call picks up
        // this flag and persists everything that changed, however many
        // redirects were involved.
        this.fsDirty = true;

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
        // fs.get() follows symlinks (unlike fs.getNode()), so `cd` into a
        // symlink pointing at a directory works the same way it does in a
        // real shell, rather than failing with "Not a directory" just
        // because the final path segment happens to be a symlink.
        const node = this.fs.get(path, this.cwd);
        if (!node) {
            return `cd: ${path}: No such file or directory`;
        }
        if (!this.fs.isDirectory(node)) {
            return `cd: ${path}: Not a directory`;
        }
        // Keep the logical (as-typed) path rather than the symlink's
        // resolved target - matches a real shell's default `cd` (without
        // `-P`): `pwd` shows the symlink path you navigated through, not
        // what it points to.
        this.cwd = resolved;
        this.renderPrompt();
    }

});
