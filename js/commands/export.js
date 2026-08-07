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
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        const assignment = args[0];

        if (!assignment) {
            return {
                stdout: "",
                stderr: "export: missing operand",
                exitCode: 1
            };
        }

        const eq = assignment.indexOf("=");

        if (eq === -1 || eq === 0) {
            return {
                stdout: "",
                stderr: "export: usage: export NAME=VALUE",
                exitCode: 1
            };
        }

        const name = assignment.slice(0, eq);
        const value = assignment.slice(eq + 1);

        terminal.env[name] = value;

        return {
            stdout: "",
            stderr: "",
            exitCode: 0
        };
    }
});