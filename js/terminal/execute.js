Object.assign(TerminalEngine.prototype, {

    async execute(input) {
        this.lastExpansionEmpty = false;
        input = this.expandAlias(input);
        const expandedCommands = this.expandBraces(input);
        for (const expandedInput of expandedCommands) {
            const commandGroups = this.splitTopLevel(expandedInput, ";")
                .map(cmd => cmd.trim())
                .filter(Boolean);

            for (const rawGroup of commandGroups) {
                const group = this.expandArithmetic(this.expandVariables(rawGroup));
                const pipeline = this.splitTopLevel(group, "|")
                    .map(cmd => cmd.trim())
                    .filter(Boolean);

                const assignMatch = pipeline.length === 1 &&
                    pipeline[0].match(/^([A-Za-z_][A-Za-z0-9_]*)=([\s\S]*)$/);

                if (assignMatch) {
                    const varName = assignMatch[1];
                    let varValue = assignMatch[2];
                    const isQuoted =
                        (varValue.startsWith('"') && varValue.endsWith('"') && varValue.length >= 2) ||
                        (varValue.startsWith("'") && varValue.endsWith("'") && varValue.length >= 2);
                    if (isQuoted) {
                        varValue = varValue.slice(1, -1);
                    }
                    this.env[varName] = varValue;
                    this.lastExitCode = 0;
                    continue;
                }

                let stdin = "";

                for (let index = 0; index < pipeline.length; index++) {
                    const parsed = this.parseCommand(pipeline[index]);
                    const cmd = parsed.cmd;
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
                    if (redirects.operator === "<") {
                        const node = this.fs.get(redirects.target, this.cwd);
                        if (!node || !this.fs.isFile(node)) {
                            stdin = "";
                            if (index === pipeline.length - 1) {
                                this.write(
                                    `${redirects.target}: No such file`,
                                    {
                                        color:"#ff6060"
                                    }
                                );
                            }
                            break;
                        }
                        stdin = node.content ?? "";
                    }

                    let result;
                    
                    const command = window.Commands?.[cmd];

                    if (command?.execute) {
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
                        result = {
                            stdout:"",
                            stderr:`command not found: ${cmd}`,
                            exitCode:127
                        };
                    }

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
                        if (result.stderr) {
                            const lines = result.stderr.split(/\r?\n/);
                            for (const line of lines) {
                                this.write(
                                    line,
                                    {
                                        color:"#ff6060"
                                    }
                                );
                                await this.sleep(50);
                            }
                        }
                        break;
                    }

                    stdin = result.stdout;

                    if (index === pipeline.length - 1) {
                        if (result.stdout) {
                            const lines =
                                result.stdout.split(/\r?\n/);
                            for (const line of lines) {
                                this.write(
                                    line,
                                    {
                                        color:"#ffffff"
                                    }
                                );
                                await this.sleep(50);
                            }
                        }
                    }
                }
            }
        }
    },

    writeRedirect(path, text, append = false) {
        if(this.fs.isInBin(path, this.cwd)){
            return `Cannot create files in /bin`;
        }             
        let node = this.fs.get(path, this.cwd);
        if (!node) {
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
