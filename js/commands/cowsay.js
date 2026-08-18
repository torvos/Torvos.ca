/**
 * `cowsay` command.
 * Wraps the given text (or piped stdin) in a speech bubble above a small
 * ASCII cow, in the style of the classic Unix novelty program.
 */
registerCommand("cowsay", {
    name: "Display a cow saying the given text.",
    synopsis : "cowsay [TEXT...]",
    description: "is a novelty program that generates an ASCII picture of a cow saying the given text (or piped input) in a speech bubble.",
    options: [],
    examples: [
        "cowsay Hello there",
        "fortune | cowsay"
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

        const text = (args.length ? args.join(" ") : stdin || "Moo!").trim() || "Moo!";

        function wrapText(str, width) {
            const words = str.split(/\s+/);
            const lines = [];
            let current = "";
            for (const w of words) {
                const candidate = current ? `${current} ${w}` : w;
                if (candidate.length > width) {
                    if (current) lines.push(current);
                    current = w;
                } else {
                    current = candidate;
                }
            }
            if (current) lines.push(current);
            return lines.length ? lines : [""];
        }

        const maxWidth = 40;
        const lines = wrapText(text, maxWidth);
        const width = Math.max(...lines.map(l => l.length));

        const top = ` ${"_".repeat(width + 2)}`;
        const bottom = ` ${"-".repeat(width + 2)}`;
        const body = lines.map((line, i) => {
            const padded = line.padEnd(width);
            if (lines.length === 1) return `< ${padded} >`;
            if (i === 0) return `/ ${padded} \\`;
            if (i === lines.length - 1) return `\\ ${padded} /`;
            return `| ${padded} |`;
        });

        const cow = [
            "        \\   ^__^",
            "         \\  (oo)\\_______",
            "            (__)\\       )\\/\\",
            "                ||----w |",
            "                ||     ||"
        ];

        const output = [top, ...body, bottom, ...cow].join("\n");

        return {
            stdout: output,
            stderr: "",
            exitCode: 0
        };
    }
});
