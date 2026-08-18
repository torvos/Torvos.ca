/**
 * `date` command.
 * Prints the current date/time in the classic Unix default format, or in
 * a custom format when given a "+FORMAT" string (a small subset of the
 * real `date` command's % specifiers).
 */
registerCommand("date", {
    name: "Display the current date and time.",
    synopsis : "date [+FORMAT]",
    description: "is a built-in utility that prints the current date and time. An optional +FORMAT argument controls the output using strftime-style specifiers.",
    options: [
        "+FORMAT    Custom output format. Supported specifiers: %Y %y %m %d %H %M %S %a %A %b %B %p %Z %s"
    ],
    examples: [
        "date",
        "date +%Y-%m-%d",
        "date '+%A, %B %d %Y'"
    ],
    async execute(terminal, args, stdin) {
        // Print usage info and exit early when --help is passed
        if (args.includes("--help")) {
            return {
                stdout: `${this.name} Usage syntax: "${this.synopsis}"`,
                stderr: "",
                exitCode: 0
            };                
        }

        const now = new Date();
        const dayNamesShort = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
        const dayNamesLong = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        const monthNamesShort = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const monthNamesLong = ["January","February","March","April","May","June","July","August","September","October","November","December"];

        function pad(n, width = 2) {
            return String(n).padStart(width, "0");
        }

        const formatArg = args.find(a => a.startsWith("+"));

        if (formatArg) {
            const fmt = formatArg.slice(1);
            const hours24 = now.getHours();
            const hours12 = ((hours24 + 11) % 12) + 1;
            const replacements = {
                "%Y": String(now.getFullYear()),
                "%y": pad(now.getFullYear() % 100),
                "%m": pad(now.getMonth() + 1),
                "%d": pad(now.getDate()),
                "%H": pad(hours24),
                "%I": pad(hours12),
                "%M": pad(now.getMinutes()),
                "%S": pad(now.getSeconds()),
                "%a": dayNamesShort[now.getDay()],
                "%A": dayNamesLong[now.getDay()],
                "%b": monthNamesShort[now.getMonth()],
                "%B": monthNamesLong[now.getMonth()],
                "%p": hours24 < 12 ? "AM" : "PM",
                "%Z": "UTC",
                "%s": String(Math.floor(now.getTime() / 1000)),
                "%%": "%"
            };
            const output = fmt.replace(/%[A-Za-z%]/g, token => replacements[token] ?? token);
            return {
                stdout: output,
                stderr: "",
                exitCode: 0
            };
        }

        // Default format: "Mon Aug 17 14:32:05 UTC 2026"
        const output =
            `${dayNamesShort[now.getDay()]} ${monthNamesShort[now.getMonth()]} ${pad(now.getDate())} ` +
            `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())} UTC ${now.getFullYear()}`;

        return {
            stdout: output,
            stderr: "",
            exitCode: 0
        };
    }
});
