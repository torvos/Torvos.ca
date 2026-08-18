/**
 * `tr` command.
 * Translates, deletes, or squeezes characters from piped stdin. Supports
 * SET1/SET2 with literal characters and simple ranges (e.g. "a-z"), plus
 * -c (complement SET1), -d (delete), and -s (squeeze repeats). Like the
 * real tr, this only reads from stdin - it's a pipe filter, not a
 * file-reading command.
 */
registerCommand("tr", {
    name: "Translate, squeeze, or delete characters.",
    synopsis : "tr [OPTIONS] SET1 [SET2]",
    description: "is a built-in utility that reads text from standard input and translates characters found in SET1 to the corresponding character in SET2, optionally deleting or squeezing repeated characters instead.",
    options: [
        "-c    Use the complement of SET1 (operate on characters NOT in SET1).",
        "-d    Delete characters found in SET1 instead of translating them.",
        "-s    Squeeze consecutive repeats of translated/kept characters into one."
    ],
    examples: [
        "echo hello | tr a-z A-Z",
        "echo \"a1b2c3\" | tr -d '0-9'",
        "echo \"aaabbbccc\" | tr -s 'a-c'"
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

        const parsed = terminal.parseFlags(args, { c: false, d: false, s: false });
        const complement = parsed.flags.has("c");
        const deleteMode = parsed.flags.has("d");
        const squeeze = parsed.flags.has("s");
        const set1raw = parsed.args[0];
        const set2raw = parsed.args[1];

        if (!set1raw) {
            return { stdout: "", stderr: "tr: missing operand", exitCode: 1 };
        }
        if (!deleteMode && !squeeze && !set2raw) {
            return { stdout: "", stderr: "tr: missing operand after SET1 (SET2 is required for translation)", exitCode: 1 };
        }
        if (!stdin) {
            return { stdout: "", stderr: "tr: missing input (pipe text into tr)", exitCode: 1 };
        }

        function expandSet(str) {
            const result = [];
            let i = 0;
            while (i < str.length) {
                if (str[i] === "\\" && i + 1 < str.length) {
                    const esc = str[i + 1];
                    const map = { n: "\n", t: "\t", r: "\r", "\\": "\\" };
                    result.push(map[esc] ?? esc);
                    i += 2;
                    continue;
                }
                if (i + 2 < str.length && str[i + 1] === "-") {
                    const start = str.charCodeAt(i);
                    const end = str.charCodeAt(i + 2);
                    for (let c = start; c <= end; c++) {
                        result.push(String.fromCharCode(c));
                    }
                    i += 3;
                    continue;
                }
                result.push(str[i]);
                i++;
            }
            return result;
        }

        const set1 = expandSet(set1raw);
        const set2 = set2raw ? expandSet(set2raw) : [];
        const set1Set = new Set(set1);

        const map = new Map();
        if (!deleteMode && !complement && set2.length) {
            set1.forEach((ch, i) => {
                map.set(ch, set2[Math.min(i, set2.length - 1)]);
            });
        }

        let out = "";
        for (const ch of stdin) {
            const inSet1 = set1Set.has(ch);
            const shouldAct = complement ? !inSet1 : inSet1;

            if (!shouldAct) {
                out += ch;
                continue;
            }
            if (deleteMode) {
                continue; // character dropped entirely
            }
            if (!complement && map.has(ch)) {
                out += map.get(ch);
            } else if (complement && set2.length) {
                out += set2[0];
            } else {
                out += ch;
            }
        }

        if (squeeze) {
            const squeezeSet = new Set(deleteMode ? set1 : (set2.length ? set2 : set1));
            let result = "";
            let prev = null;
            for (const ch of out) {
                if (ch === prev && squeezeSet.has(ch)) continue;
                result += ch;
                prev = ch;
            }
            out = result;
        }

        return {
            stdout: out,
            stderr: "",
            exitCode: 0
        };
    }
});
