registerCommand("curl", {
    name: "Retrieve data from a URL.",
    synopsis : "curl URL",
    description: "Download the contents of a URL and write the response to standard output.",
    options: [],
    examples: [
        "curl https://example.com"
    ],
    execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }
        return {
            stdout: "",
            stderr: "guest users are not permitted to run the curl command.",
            exitCode: 1
        };
    }
});