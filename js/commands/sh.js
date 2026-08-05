registerCommand("sh", {
    name: "Execute commands from a script file.",
    synopsis: "sh [OPTIONS] SCRIPT [ARGS...]",
    description: "Read the specified file line by line and execute each non-empty, non-comment line as a command, in order, as if it had been typed at the prompt. Lines beginning with '#' are treated as comments and skipped. Positional parameters ($0, $1.., $@, $#) are available to the script based on ARGS.",
    options: [
        "-x    Print each command to standard output before it is executed."
    ],
    examples: [
        "sh backup.sh",
        "sh deploy.sh prod",
        "sh -x setup.sh"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };
        }

        const parsed = terminal.parseFlags(args, { x: false });
        const trace = parsed.flags.has("x");
        const target = parsed.args[0];

        if (!target) {
            return {
                stdout: "",
                stderr: "sh: missing script operand",
                exitCode: 1
            };
        }

        return this.runScript(terminal, target, parsed.args.slice(1), { trace, label: "sh" });
    },

    async runScript(terminal, target, scriptArgs, options = {}) {
        const trace = options.trace ?? false;
        const label = options.label ?? target;

        if (terminal.fs.isInBin(target, terminal.cwd)) {
            return {
                stdout: "",
                stderr: `${label}: cannot execute files in /bin`,
                exitCode: 1
            };
        }

        const node = terminal.fs.get(target, terminal.cwd);

        if (!node) {
            return {
                stdout: "",
                stderr: `${label}: ${target}: No such file or directory`,
                exitCode: 127
            };
        }

        if (terminal.fs.isDirectory(node)) {
            return {
                stdout: "",
                stderr: `${label}: ${target}: Is a directory`,
                exitCode: 126
            };
        }

        if (!terminal.fs.isFile(node)) {
            return {
                stdout: "",
                stderr: `${label}: ${target}: not executable`,
                exitCode: 126
            };
        }

        const mode = node.mode || "";
        const ownerExecutable = mode[2] === "x";
        if (!ownerExecutable) {
            return {
                stdout: "",
                stderr: `${label}: ${target}: Permission denied`,
                exitCode: 126
            };
        }

        const fullPath = terminal.fs.getFullPath(target, terminal.cwd);

        terminal._scriptStack ??= [];
        const MAX_SCRIPT_DEPTH = 10;

        if (terminal._scriptStack.length >= MAX_SCRIPT_DEPTH) {
            return {
                stdout: "",
                stderr: `${label}: ${target}: script recursion limit exceeded`,
                exitCode: 1
            };
        }
        if (terminal._scriptStack.includes(fullPath)) {
            return {
                stdout: "",
                stderr: `${label}: ${target}: recursive script invocation blocked`,
                exitCode: 1
            };
        }

        function applyPositionalParams(line) {
            return line
                .replace(/\$@/g, scriptArgs.join(" "))
                .replace(/\$#/g, String(scriptArgs.length))
                .replace(/\$0\b/g, target)
                .replace(/\$([1-9])\b/g, (_, n) => scriptArgs[Number(n) - 1] ?? "");
        }

        node.accessed = Date.now();
        terminal._scriptStack.push(fullPath);

        try {
            const lines = (node.content ?? "").split(/\r?\n/);

            for (const rawLine of lines) {
                const line = rawLine.trim();

                if (!line || line.startsWith("#")) {
                    continue;
                }

                const command = applyPositionalParams(line);

                if (trace=="true") {
                    terminal.write(`+ ${command}`, { color: "#888888" });
                }

                await terminal.execute(command);
            }
        } finally {
            terminal._scriptStack.pop();
        }

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});
