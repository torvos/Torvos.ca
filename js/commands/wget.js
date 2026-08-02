registerCommand("wget", {
    name: "Download files from the web.",
    synopsis : "wget URL",
    description: "Download files from the web.",
    options: [],
    examples: [
        "wget http://example.com/index.html"
    ],
    async execute(terminal, args, stdin) {
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }        
        return {
            stdout: "",
            stderr: "guest users are not permitted to run the wget command.",
            exitCode: 1
        };
    }
});