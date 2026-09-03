/**
 * `diff` command.
 * Compares two files line by line and prints their differences in the
 * classic ed-style format (NcM/NaM/NdM hunks with < / --- / > markers).
 * Either operand may be "-" to read from piped stdin instead of a file.
 * Exit code: 0 if identical, 1 if different, 2 on error (matches real diff).
 */
registerCommand("diff", {
    name: "Compare two files line by line.",
    synopsis : "diff FILE1 FILE2",
    description: "is a built-in utility that compares the contents of two files and prints the lines that differ between them, grouped into hunks showing what would need to change to turn FILE1 into FILE2.",
    options: [],
    examples: [
        "diff old.txt new.txt",
        "cat new.txt | diff old.txt -"
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

        const [file1, file2] = args;
        if (!file1 || !file2) {
            return {
                stdout: "",
                stderr: "diff: missing operand",
                exitCode: 2
            };
        }

        function readOperand(target) {
            if (target === "-") {
                if (!stdin) {
                    return { error: "diff: -: no piped input" };
                }
                return { content: stdin };
            }
            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                return { error: `diff: ${target}: No such file or directory` };
            }
            if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
                return { error: `diff: ${target}: Permission denied` };
            }
            if (terminal.fs.isDirectory(node)) {
                return { error: `diff: ${target}: Is a directory` };
            }
            node.accessed = Date.now();
            return { content: terminal.fs.readContent(node) };
        }

        const first = readOperand(file1);
        if (first.error) {
            return { stdout: "", stderr: first.error, exitCode: 2 };
        }
        const second = readOperand(file2);
        if (second.error) {
            return { stdout: "", stderr: second.error, exitCode: 2 };
        }

        const a = first.content.split(/\r?\n/);
        const b = second.content.split(/\r?\n/);

        // --- LCS-based line diff, classic ed-style ("normal") output ---
        function diffLines(a, b) {
            const n = a.length, m = b.length;
            const dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
            for (let i = n - 1; i >= 0; i--) {
                for (let j = m - 1; j >= 0; j--) {
                    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
                }
            }
            const ops = [];
            let i = 0, j = 0;
            while (i < n && j < m) {
                if (a[i] === b[j]) { ops.push(["keep", a[i]]); i++; j++; }
                else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(["del", a[i]]); i++; }
                else { ops.push(["ins", b[j]]); j++; }
            }
            while (i < n) { ops.push(["del", a[i]]); i++; }
            while (j < m) { ops.push(["ins", b[j]]); j++; }

            const hunks = [];
            let aLine = 1, bLine = 1, k = 0;
            while (k < ops.length) {
                if (ops[k][0] === "keep") { aLine++; bLine++; k++; continue; }
                const hunk = { aStart: aLine, bStart: bLine, dels: [], inss: [] };
                while (k < ops.length && ops[k][0] !== "keep") {
                    if (ops[k][0] === "del") { hunk.dels.push(ops[k][1]); aLine++; }
                    else { hunk.inss.push(ops[k][1]); bLine++; }
                    k++;
                }
                hunk.aEnd = aLine - 1;
                hunk.bEnd = bLine - 1;
                hunks.push(hunk);
            }
            return hunks;
        }

        function formatRange(start, end) {
            return start === end ? `${start}` : `${start},${end}`;
        }

        const hunks = diffLines(a, b);
        const out = [];
        for (const h of hunks) {
            const hasDel = h.dels.length > 0;
            const hasIns = h.inss.length > 0;
            if (hasDel && hasIns) {
                out.push(`${formatRange(h.aStart, h.aEnd)}c${formatRange(h.bStart, h.bEnd)}`);
                for (const l of h.dels) out.push(`< ${l}`);
                out.push("---");
                for (const l of h.inss) out.push(`> ${l}`);
            } else if (hasDel) {
                out.push(`${formatRange(h.aStart, h.aEnd)}d${h.bStart - 1}`);
                for (const l of h.dels) out.push(`< ${l}`);
            } else {
                out.push(`${h.aStart - 1}a${formatRange(h.bStart, h.bEnd)}`);
                for (const l of h.inss) out.push(`> ${l}`);
            }
        }

        return {
            stdout: out.join("\n"),
            stderr: "",
            exitCode: out.length === 0 ? 0 : 1
        };
    }
});
