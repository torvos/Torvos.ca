registerCommand("man", {
    name: "Display the manual page for a command.",
    synopsis: "man COMMAND",
    description: "Display the built-in manual page for the specified command. Manual pages include the command synopsis, description, supported options, and usage examples.",
    options: [],
    examples: [
        "man ls",
        "man grep",
        "man mkdir"
    ],

    execute(terminal, args) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        if (args.length === 0) {
            return {
                stdout: "",
                stderr: "man: missing command operand",
                exitCode: 1
            };
        }
        const commandName = args[0];
        const command = window.Commands[commandName];
        if (!command) {
            return {
                stdout: "",
                stderr: `man: no manual entry for ${commandName}`,
                exitCode: 1
            };
        }
        const lines = [];
        lines.push("SUMMARY");
        lines.push(`    ${command.name}`);
        lines.push("");
        lines.push("USAGE SYNTAX");
        lines.push(`    ${command.synopsis}`);
        lines.push("");
        lines.push("DESCRIPTION");
        lines.push(`    ${command.description}`);
        lines.push("");
        if (command.options?.length) {
            lines.push("OPTIONS");
            for (const option of command.options) {
                lines.push(`    ${option.flag}`);
                lines.push(`        ${option.description}`);
                lines.push("");
            }
        }
        if (command.examples?.length) {
            lines.push("EXAMPLES");
            for (const example of command.examples) {
                lines.push(`    ${example}`);
            }
            lines.push("");
        }
        return {
            stdout: lines.join("\n").trimEnd(),
            stderr: "",
            exitCode: 0
        };
    }
});