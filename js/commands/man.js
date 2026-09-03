/**
 * `man` command.
 * Looks up another command's registered metadata object (name, synopsis,
 * description, options, examples) and formats it into a traditional
 * man-page-style layout.
 */
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

    async execute(terminal, args) {
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: EXIT_SUCCESS
            };                
        }
        if (args.length === 0) {
            return {
                stdout: "",
                stderr: "man: missing command operand",
                exitCode: EXIT_FAILURE
            };
        }
        const commandName = args[0];
        const command = window.Commands[commandName];
        if (!command) {
            return {
                stdout: "",
                stderr: `man: no manual entry for ${commandName}`,
                exitCode: EXIT_FAILURE
            };
        }
        // Build the man-page sections from the command's metadata fields
        const lines = [];
        const lineSegments = [];

        // Pushes a section heading (colored) or a plain body/blank line
        // (default color) to both parallel arrays in one go.
        function pushLine(text, isHeading) {
            lines.push(text);
            lineSegments.push(
                text ? [{ text, color: isHeading ? COLOR_HEADING : COLOR_STDOUT }] : undefined
            );
        }

        pushLine("SUMMARY", true);
        pushLine(`    ${command.name}`, false);
        pushLine("", false);
        pushLine("USAGE SYNTAX", true);
        pushLine(`    ${command.synopsis}`, false);
        pushLine("", false);
        pushLine("DESCRIPTION", true);
        pushLine(`    ${command.description}`, false);
        pushLine("", false);
        if (command.options?.length) {
            pushLine("OPTIONS", true);
            for (const option of command.options) {
                pushLine(`    ${option}`, false);
            }
            pushLine("", false);
        }
        if (command.examples?.length) {
            pushLine("EXAMPLES", true);
            for (const example of command.examples) {
                pushLine(`    ${example}`, false);
            }
            pushLine("", false);
        }
        // Trim the trailing blank line/segment the same way trimEnd() did below.
        while (lines.length && lines[lines.length - 1] === "") {
            lines.pop();
            lineSegments.pop();
        }
        return {
            stdout: lines.join("\n"),
            stdoutSegments: lineSegments,
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
