/**
 * `printf` command.
 * Formats and prints arguments per the standard `printf` conventions:
 * supports %s/%d/%i/%f/%x/%o/%% conversions (with an optional numeric
 * width, e.g. %5d or %-5d), always interprets backslash escapes in the
 * format string (\n, \t, \r, \\), and - like real printf - repeats the
 * format string against any leftover arguments until they're consumed.
 */
registerCommand("printf", {
    name: "Format and print text.",
    synopsis : "printf FORMAT [ARGUMENT...]",
    description: "is a built-in utility that formats and prints text according to a FORMAT string containing %s/%d/%f/%x/%o conversion specifiers. Unlike echo, it always interprets backslash escapes and never adds an implicit trailing newline. If more arguments are given than the format consumes, the format is reused until all arguments are consumed.",
    options: [
        "%s          String",
        "%d, %i      Integer",
        "%f          Floating point (6 decimal places)",
        "%x, %o      Hexadecimal / octal",
        "%%          Literal percent sign",
        "%Nd, %-Nd   Right/left-pad the conversion to width N"
    ],
    examples: [
        "printf \"%s is %d\\n\" torvos 5",
        "printf \"%-10s|%5d\\n\" left 3"
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

        const format = args[0];
        if (format === undefined) {
            return {
                stdout: "",
                stderr: "printf: missing format operand",
                exitCode: 1
            };
        }
        const values = args.slice(1);

        function processEscapes(text) {
            return text
                .replace(/\\\\/g, "\u0000")
                .replace(/\\n/g, "\n")
                .replace(/\\t/g, "\t")
                .replace(/\\r/g, "\r")
                .replace(/\u0000/g, "\\");
        }

        const specRegex = /%(-?\d*)([sdifxo%])/g;
        const hasConversion = /%(-?\d*)[sdifxo]/.test(format);

        let valueIndex = 0;
        let out = "";
        let iterations = 0;
        const maxIterations = 1000; // safety cap against pathological input

        do {
            let lastEnd = 0;
            specRegex.lastIndex = 0;
            let match;
            let consumedThisPass = false;

            while ((match = specRegex.exec(format)) !== null) {
                out += processEscapes(format.slice(lastEnd, match.index));
                lastEnd = specRegex.lastIndex;

                const [, widthStr, spec] = match;

                if (spec === "%") {
                    out += "%";
                    continue;
                }

                const rawArg = values[valueIndex];
                valueIndex++;
                consumedThisPass = true;

                let text;
                switch (spec) {
                    case "s":
                        text = rawArg ?? "";
                        break;
                    case "d":
                    case "i":
                        text = String(parseInt(rawArg, 10) || 0);
                        break;
                    case "f":
                        text = (parseFloat(rawArg) || 0).toFixed(6);
                        break;
                    case "x":
                        text = (parseInt(rawArg, 10) || 0).toString(16);
                        break;
                    case "o":
                        text = (parseInt(rawArg, 10) || 0).toString(8);
                        break;
                }

                if (widthStr) {
                    const leftAlign = widthStr.startsWith("-");
                    const width = parseInt(leftAlign ? widthStr.slice(1) : widthStr, 10);
                    if (!Number.isNaN(width)) {
                        text = leftAlign ? text.padEnd(width) : text.padStart(width);
                    }
                }

                out += text;
            }
            out += processEscapes(format.slice(lastEnd));

            iterations++;
            if (!hasConversion) break; // nothing to repeat for
            if (valueIndex >= values.length) break; // all arguments consumed
            if (!consumedThisPass) break; // safety: avoid infinite loop
        } while (iterations < maxIterations);

        return {
            stdout: out,
            stderr: "",
            exitCode: 0
        };
    }
});
