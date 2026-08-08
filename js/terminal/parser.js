Object.assign(TerminalEngine.prototype, {

    expandBraces(input) {
        const match = input.match(/\{([^{}]+)\}/);
        if (!match) {
            return [input];
        }
        const values = match[1].split(",");
        const results = [];
        for (const value of values) {
            const expanded = input.replace(
                match[0],
                value.trim()
            );
            results.push(
                ...this.expandBraces(expanded)
            );
        }
        return results;
    },

    // Splits `str` on single-character `delimiter`, but only where the
    // delimiter appears outside of a quoted region. Quote characters are
    // kept in the output segments so downstream parsing (tokenize, regexes)
    // still sees them.
    splitTopLevel(str, delimiter) {
        const parts = [];
        let current = "";
        let inSingle = false;
        let inDouble = false;

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inSingle) {
                current += ch;
                if (ch === "'") inSingle = false;
                continue;
            }
            if (inDouble) {
                current += ch;
                if (ch === '"') inDouble = false;
                continue;
            }
            if (ch === "'") {
                inSingle = true;
                current += ch;
                continue;
            }
            if (ch === '"') {
                inDouble = true;
                current += ch;
                continue;
            }
            if (ch === delimiter) {
                parts.push(current);
                current = "";
                continue;
            }
            current += ch;
        }
        parts.push(current);
        return parts;
    },

    // Returns a same-length copy of `str` where every character inside a
    // quoted region (including the quote marks themselves) is replaced with
    // a neutral placeholder. Used so structural regexes (like redirect
    // detection) can be run against it without being confused by operator
    // characters or whitespace that happen to appear inside quoted text -
    // while match indices still line up with the original string.
    maskQuotes(str) {
        let masked = "";
        let inSingle = false;
        let inDouble = false;

        for (const ch of str) {
            if (inSingle) {
                masked += "x";
                if (ch === "'") inSingle = false;
                continue;
            }
            if (inDouble) {
                masked += "x";
                if (ch === '"') inDouble = false;
                continue;
            }
            if (ch === "'") {
                inSingle = true;
                masked += "x";
                continue;
            }
            if (ch === '"') {
                inDouble = true;
                masked += "x";
                continue;
            }
            masked += ch;
        }
        return masked;
    },

    stripMatchingQuotes(str) {
        if (
            str.length >= 2 &&
            ((str.startsWith('"') && str.endsWith('"')) ||
                (str.startsWith("'") && str.endsWith("'")))
        ) {
            return str.slice(1, -1);
        }
        return str;
    },

    parseCommand(command) {
        const redirectRegex = /\s*(2>>|2>|>>|>|<)\s*([^\s]+)\s*$/;
        const match = this.maskQuotes(command).match(redirectRegex);
        let redirects = {};
        if (match) {
            redirects = {
                operator: match[1],
                target: this.stripMatchingQuotes(
                    command.slice(match.index + match[0].indexOf(match[1]) + match[1].length, match.index + match[0].length).trim()
                )
            };
            command = command.slice(0, match.index).trim();
        }
        const parts = this.tokenize(command);

        return {
            cmd: parts[0],
            args: parts.slice(1),
            redirects
        };
    },

    tokenize(command) {
        const parts = [];
        let current = "";
        let inSingle = false;
        let inDouble = false;
        let hasToken = false;

        for (let i = 0; i < command.length; i++) {
            const ch = command[i];
            if (inSingle) {
                if (ch === "'") {
                    inSingle = false;
                } else {
                    current += ch;
                }
                continue;
            }
            if (inDouble) {
                if (ch === '"') {
                    inDouble = false;
                } else {
                    current += ch;
                }
                continue;
            }
            if (ch === "'") {
                inSingle = true;
                hasToken = true;
                continue;
            }
            if (ch === '"') {
                inDouble = true;
                hasToken = true;
                continue;
            }
            if (/\s/.test(ch)) {
                if (hasToken) {
                    parts.push(current);
                    current = "";
                    hasToken = false;
                }
                continue;
            }
            current += ch;
            hasToken = true;
        }

        if (hasToken) {
            parts.push(current);
        }
        return parts;
    },

    expandVariables(input) {
        return input
            .replace(/\$\?/g, () => String(this.lastExitCode ?? 0))
            .replace(
                /\$([A-Za-z_][A-Za-z0-9_]*)/g,
                (_, name) => this.env[name] ?? ""
            );
    },

    expandArithmetic(input) {
        return input.replace(/\$\(\((.*?)\)\)/g, (_, expr) => {
            try {
                return String(this.evaluateArithmetic(expr));
            } catch {
                return "0";
            }
        });
    },

    evaluateArithmetic(expr) {
        const substituted = expr.replace(
            /\$?([A-Za-z_][A-Za-z0-9_]*)/g,
            (_, name) => {
                const value = this.env[name];
                return value !== undefined && value !== "" ? value : "0";
            }
        );

        if (!/^[\d\s+\-*/%().]*$/.test(substituted)) {
            throw new Error("invalid arithmetic expression");
        }

        const result = Function(`"use strict"; return (${substituted || "0"});`)();

        if (typeof result !== "number" || !Number.isFinite(result)) {
            throw new Error("invalid arithmetic result");
        }

        return Math.trunc(result);
    },

    expandAlias(input) {
        const parts = input.trim().split(/\s+/);
        if (!parts.length)
            return input;
        if (this.aliases[parts[0]]) {
            parts[0] = this.aliases[parts[0]];
            return parts.join(" ");
        }
        return input;
    }

});
