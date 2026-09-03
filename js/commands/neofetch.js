/**
 * `neofetch` command.
 * Prints a small ASCII-art logo alongside a summary of "system" info
 * (OS, host, kernel/version, uptime, shell, command count, terminal),
 * in the classic neofetch layout: logo on the left, info lines on the
 * right, top-aligned - extra info lines beyond the logo's height just
 * continue with blank left-hand padding.
 */
registerCommand("neofetch", {
    name: "Display system information with an ASCII logo.",
    synopsis : "neofetch",
    description: "is a command-line utility that displays system information (OS, host, kernel, uptime, shell) alongside an ASCII-art logo.",
    options: [],
    examples: [
        "neofetch"
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

        function formatUptime(ms) {
            const totalSeconds = Math.max(0, Math.floor(ms / 1000));
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            if (hours > 0) {
                return `${hours}h ${minutes}m`;
            }
            if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            }
            return `${seconds}s`;
        }

        const user = terminal.env.USER ?? DEFAULT_USER;
        const host = terminal.env.HOSTNAME ?? HOSTNAME;
        const shell = (terminal.env.SHELL ?? "/bin/sh").split("/").pop();
        const uptime = formatUptime(Date.now() - (terminal.sessionStart ?? Date.now()));
        const commandCount = Object.keys(window.Commands ?? {}).length;

        const header = `${user}@${host}`;

        const logo = [
            "████████╗",
            "╚══██╔══╝",
            "   ██║   ",
            "   ██║   ",
            "   ██║   ",
            "   ╚═╝   ",
        ];
        const logoWidth = logo[0].length;

        const info = [
            { text: header, color: COLOR_DIRECTORY, isHeader: true },
            { text: "-".repeat(header.length), color: COLOR_LABEL },
            { label: "OS", value: "TorvOS (Web Edition)" },
            { label: "Host", value: `${host}.ca` },
            { label: "Kernel", value: `Torvos ${TERMINAL_VERSION}` },
            { label: "Uptime", value: uptime },
            { label: "Shell", value: shell },
            { label: "Commands", value: String(commandCount) },
            { label: "Terminal", value: "torvos-term" },
        ];

        const rowCount = Math.max(logo.length, info.length);
        const lines = [];
        const lineSegments = [];

        for (let i = 0; i < rowCount; i++) {
            const logoPart = logo[i] ?? " ".repeat(logoWidth);
            const infoEntry = info[i];

            let infoText = "";
            const segments = [{ text: logoPart, color: COLOR_HEADING }];

            if (infoEntry) {
                segments.push({ text: "  " });
                if (infoEntry.isHeader || !infoEntry.label) {
                    infoText = infoEntry.text;
                    segments.push({ text: infoEntry.text, color: infoEntry.color });
                } else {
                    infoText = `${infoEntry.label}: ${infoEntry.value}`;
                    segments.push({ text: `${infoEntry.label}: `, color: COLOR_LABEL });
                    segments.push({ text: infoEntry.value, color: COLOR_STDOUT });
                }
            }

            lines.push(`${logoPart}  ${infoText}`.replace(/\s+$/, "") || logoPart);
            lineSegments.push(segments);
        }

        return {
            stdout: lines.join("\n"),
            stdoutSegments: lineSegments,
            stderr: "",
            exitCode: EXIT_SUCCESS
        };
    }
});
