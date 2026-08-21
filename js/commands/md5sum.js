/**
 * `md5sum` command.
 * Computes the MD5 digest of piped stdin or one or more files, printing
 * "<hash>  <name>" per GNU coreutils' format (stdin is shown as "-").
 * Browsers' WebCrypto API doesn't expose MD5 (only SHA-*), so this is a
 * small self-contained implementation of the algorithm per RFC 1321.
 */
registerCommand("md5sum", {
    name: "Compute MD5 checksums.",
    synopsis : "md5sum [FILE]...",
    description: "is a built-in utility that computes and prints the 128-bit MD5 message digest of each given file, or of standard input if none is given.",
    options: [],
    examples: [
        "md5sum resume.md",
        "echo hello | md5sum"
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

        // --- MD5 implementation (RFC 1321) ---
        function md5(input) {
            function rotl(x, n) { return (x << n) | (x >>> (32 - n)); }

            const s = [
                7,12,17,22, 7,12,17,22, 7,12,17,22, 7,12,17,22,
                5, 9,14,20, 5, 9,14,20, 5, 9,14,20, 5, 9,14,20,
                4,11,16,23, 4,11,16,23, 4,11,16,23, 4,11,16,23,
                6,10,15,21, 6,10,15,21, 6,10,15,21, 6,10,15,21
            ];
            const K = new Int32Array(64);
            for (let i = 0; i < 64; i++) {
                K[i] = (Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296)) | 0;
            }

            const bytes = new TextEncoder().encode(input);
            const bitLen = bytes.length * 8;

            // Pad: 0x80, then zeros until length % 64 == 56, then 8 bytes of bit length (LE)
            const padLen = ((bytes.length % 64) < 56 ? 56 : 120) - (bytes.length % 64);
            const total = bytes.length + padLen + 8;
            const buf = new Uint8Array(total);
            buf.set(bytes, 0);
            buf[bytes.length] = 0x80;
            const dv = new DataView(buf.buffer);
            dv.setUint32(total - 8, bitLen >>> 0, true);
            dv.setUint32(total - 4, Math.floor(bitLen / 4294967296) >>> 0, true);

            let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;

            for (let chunkStart = 0; chunkStart < total; chunkStart += 64) {
                const M = new Int32Array(16);
                for (let i = 0; i < 16; i++) {
                    M[i] = dv.getUint32(chunkStart + i * 4, true);
                }
                let A = a0, B = b0, C = c0, D = d0;
                for (let i = 0; i < 64; i++) {
                    let F, g;
                    if (i < 16) { F = (B & C) | (~B & D); g = i; }
                    else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
                    else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
                    else { F = C ^ (B | ~D); g = (7 * i) % 16; }
                    F = (F + A + K[i] + M[g]) | 0;
                    A = D; D = C; C = B;
                    B = (B + rotl(F, s[i])) | 0;
                }
                a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
            }

            function toHexLE(n) {
                const buf4 = new Uint8Array(4);
                new DataView(buf4.buffer).setInt32(0, n, true);
                return Array.from(buf4).map(b => b.toString(16).padStart(2, "0")).join("");
            }

            return toHexLE(a0) + toHexLE(b0) + toHexLE(c0) + toHexLE(d0);
        }
        // --- end MD5 implementation ---

        const targets = args.filter(a => a !== "--help");

        if (targets.length === 0) {
            if (!stdin) {
                return {
                    stdout: "",
                    stderr: "md5sum: missing operand",
                    exitCode: 1
                };
            }
            return {
                stdout: `${md5(stdin)}  -`,
                stderr: "",
                exitCode: 0
            };
        }

        let out = "";
        let err = "";
        let exitCode = 0;

        for (const target of targets) {
            const node = terminal.fs.get(target, terminal.cwd);
            if (!node) {
                err += `md5sum: ${target}: No such file or directory\n`;
                exitCode = 1;
                continue;
            }
            if (terminal.fs.isProtected(target, terminal.cwd) && !terminal.fs.isDevice(node)) {
                err += `md5sum: ${target}: Permission denied\n`;
                exitCode = 1;
                continue;
            }
            if (terminal.fs.isDirectory(node)) {
                err += `md5sum: ${target}: Is a directory\n`;
                exitCode = 1;
                continue;
            }
            node.accessed = Date.now();
            out += `${md5(terminal.fs.readContent(node))}  ${target}\n`;
        }

        return {
            stdout: out.replace(/\r?\n$/, ""),
            stderr: err.replace(/\r?\n$/, ""),
            exitCode
        };
    }
});
