/**
 * `export` command.
 * Sets or updates an environment variable given a "NAME=VALUE" argument.
 * Note: bare "NAME=VALUE" (without the export keyword) is actually handled
 * separately as a direct assignment in execute.js - this command exists for
 * explicit `export NAME=VALUE` invocations.
 */
registerCommand("export", {
    name: "Set or update environment variables.",
    synopsis : "export NAME=VALUE",
    description: "Create or modify an environment variable that will be available to subsequently executed commands. A bare NAME=VALUE (without 'export') works the same way.",
    options: [],
    examples: [
        "export EDITOR=vim",
        "export PATH=/bin",
        "NAME=world",
    ],
    async execute(terminal, args, stdin) {    
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };                
        }
        const assignment = args[0];

        if (!assignment) {
            return {
                stdout: "",
                stderr: "export: missing operand",
                exitCode: EXIT_FAILURE
            };
        }

        const eq = assignment.indexOf("=");

        if (eq === -1 || eq === 0) {
            // No "=" found, or it's the very first character (empty variable name)
            return {
                stdout: "",
                stderr: "export: usage: export NAME=VALUE",
                exitCode: EXIT_FAILURE
            };
        }

        const name = assignment.slice(0, eq);
        const value = assignment.slice(eq + 1);

        terminal.env[name] = value;

        return {
            stdout: "",
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
