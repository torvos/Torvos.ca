/**
 * Shell-parsing utilities for TerminalEngine: brace expansion, quote-aware
 * tokenizing/splitting, I/O redirection parsing, variable and arithmetic
 * expansion, command substitution ($(...)), and alias expansion. These are
 * used by execute.js to turn a raw typed command line into something that
 * can actually be run.
 */
Object.assign(TerminalEngine.prototype, {

    /**
     * Expands brace patterns like "file{1,2,3}.txt" into
     * ["file1.txt", "file2.txt", "file3.txt"]. Recurses to support multiple
     * brace groups in one string (e.g. "a{1,2}{x,y}").
     * @param {string} input - Input string possibly containing a {a,b,c} group.
     * @returns {string[]} All expanded variants (or [input] if no braces found).
     */
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
            // Recurse in case there are additional brace groups left to expand
            results.push(
                ...this.expandBraces(expanded)
            );
        }
        return results;
    },

    /**
     * Splits `str` on `delimiter`, but ignores delimiters that appear inside
     * single or double quotes (so quoted content is never split apart).
     * @param {string} str - String to split.
     * @param {string} delimiter - Single character to split on.
     * @returns {string[]} The split parts, quotes left intact.
     */
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

    /**
     * Replaces every character inside single/double quotes with "x", while
     * leaving quote characters and unquoted text untouched. Used so regexes
     * like the redirect-operator matcher can safely scan for unquoted
     * special characters without accidentally matching inside a quoted string.
     * @param {string} str - Input string.
     * @returns {string} Same length string with quoted contents masked.
     */
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

    /**
     * Removes a single pair of surrounding matching quotes (either both
     * single or both double), if present. Leaves the string unchanged if
     * it isn't fully wrapped in matching quotes.
     */
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

    /**
     * Parses a single command string into its command name, arguments, and
     * any trailing I/O redirection (>, >>, 2>, 2>>, <). Redirection is
     * detected via maskQuotes so operators inside quotes aren't mistaken
     * for real redirects.
     * @param {string} command - Raw command text (aliases/vars already expanded).
     * @returns {{cmd: string, args: string[], redirects: Object}}
     */
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
            // Strip the redirect portion off before tokenizing the rest as args
            command = command.slice(0, match.index).trim();
        }
        const parts = this.tokenize(command);

        return {
            cmd: parts[0],
            args: parts.slice(1),
            redirects
        };
    },

    // Expands backslash escapes the way bash's $'...' (ANSI-C quoting) does:
    // \n -> newline, \t -> tab, etc. Unrecognized escapes are left as-is.
    expandAnsiCEscapes(str) {
        const map = {
            n: "\n", t: "\t", r: "\r", "\\": "\\",
            "'": "'", '"': '"', "0": "\0",
            a: "\x07", b: "\b", f: "\f", v: "\v"
        };
        let result = "";
        for (let i = 0; i < str.length; i++) {
            if (str[i] === "\\" && i + 1 < str.length && map[str[i + 1]] !== undefined) {
                result += map[str[i + 1]];
                i++;
            } else {
                result += str[i];
            }
        }
        return result;
    },

    /**
     * Splits a command line into individual argument tokens, honoring
     * single quotes (literal, no escapes), double quotes (literal, quotes
     * just group whitespace), and bash-style $'...' ANSI-C quoting (which
     * expands backslash escapes like \n). Whitespace outside quotes
     * separates tokens.
     * @param {string} command - Raw command text.
     * @returns {string[]} Array of parsed tokens (command name + args combined).
     */
    tokenize(command) {
        const parts = [];
        let current = "";
        let inSingle = false;
        let inDouble = false;
        let hasToken = false; // tracks whether `current` holds a token-in-progress (handles "")

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
            // $'...' ANSI-C quoting: backslash escapes (\n, \t, ...) become
            // real characters, e.g. echo $'line1\nline2'
            if (ch === "$" && command[i + 1] === "'") {
                hasToken = true;
                let j = i + 2;
                let raw = "";
                while (j < command.length && command[j] !== "'") {
                    if (command[j] === "\\" && j + 1 < command.length) {
                        raw += command[j] + command[j + 1];
                        j += 2;
                    } else {
                        raw += command[j];
                        j++;
                    }
                }
                current += this.expandAnsiCEscapes(raw);
                i = j;
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

    /**
     * Expands `$?` (last exit code) and `$VARNAME` references against the
     * shell's environment variables. Unknown variables expand to "".
     */
    expandVariables(input) {
        return input
            .replace(/\$\?/g, () => String(this.lastExitCode ?? 0))
            .replace(
                /\$([A-Za-z_][A-Za-z0-9_]*)/g,
                (_, name) => this.env[name] ?? ""
            );
    },

    /**
     * Expands bash-style arithmetic expressions `$((expr))` by evaluating
     * them with evaluateArithmetic. On evaluation error, silently expands
     * to "0" (mirroring the tolerant behavior expected in a toy shell).
     */
    expandArithmetic(input) {
        return input.replace(/\$\(\((.*?)\)\)/g, (_, expr) => {
            try {
                return String(this.evaluateArithmetic(expr));
            } catch {
                return "0";
            }
        });
    },

    /**
     * Tokenizes an arithmetic expression string into numbers and operator/
     * paren characters, for use by evaluateArithmetic's recursive-descent parser.
     * @throws {Error} If an unexpected character is encountered.
     */
    tokenizeArithmetic(str) {
        const tokens = [];
        let i = 0;
        while (i < str.length) {
            const ch = str[i];
            if (/\s/.test(ch)) {
                i++;
                continue;
            }
            if (/\d/.test(ch)) {
                let num = "";
                while (i < str.length && /\d/.test(str[i])) {
                    num += str[i++];
                }
                tokens.push(num);
                continue;
            }
            if ("+-*/%()".includes(ch)) {
                tokens.push(ch);
                i++;
                continue;
            }
            throw new Error("invalid arithmetic expression");
        }
        return tokens;
    },

    /**
     * Evaluates a simple arithmetic expression (integers, + - * / %,
     * parentheses, unary +/-) using a small recursive-descent parser.
     * Variable names inside the expression are substituted from this.env
     * first (undefined/empty vars become 0), mimicking bash's `$((x + 1))`
     * behavior where bare variable names are allowed inside arithmetic contexts.
     * @param {string} expr - The raw expression inside $(( ... )).
     * @returns {number} Integer result (truncated toward zero, like bash).
     * @throws {Error} On malformed expressions or division/modulo by zero.
     */
    evaluateArithmetic(expr) {
        const substituted = expr.replace(
            /\$?([A-Za-z_][A-Za-z0-9_]*)/g,
            (_, name) => {
                const value = this.env[name];
                return value !== undefined && value !== "" ? value : "0";
            }
        );

        const tokens = this.tokenizeArithmetic(substituted);
        let pos = 0;

        const peek = () => tokens[pos];
        const advance = () => tokens[pos++];

        // factor := ('+' | '-')? factor | '(' expr ')' | NUMBER
        const parseFactor = () => {
            if (peek() === "+") {
                advance();
                return parseFactor();
            }
            if (peek() === "-") {
                advance();
                return -parseFactor();
            }
            if (peek() === "(") {
                advance();
                const value = parseExpr();
                if (advance() !== ")") {
                    throw new Error("missing closing parenthesis");
                }
                return value;
            }
            const token = advance();
            if (token === undefined || !/^\d+$/.test(token)) {
                throw new Error("invalid arithmetic expression");
            }
            return parseInt(token, 10);
        };

        // term := factor (('*' | '/' | '%') factor)*
        const parseTerm = () => {
            let value = parseFactor();
            while (peek() === "*" || peek() === "/" || peek() === "%") {
                const op = advance();
                const rhs = parseFactor();
                if ((op === "/" || op === "%") && rhs === 0) {
                    throw new Error("division by 0");
                }
                if (op === "*") value *= rhs;
                else if (op === "/") value = Math.trunc(value / rhs);
                else value = value % rhs;
            }
            return value;
        };

        // expr := term (('+' | '-') term)*
        const parseExpr = () => {
            let value = parseTerm();
            while (peek() === "+" || peek() === "-") {
                const op = advance();
                const rhs = parseTerm();
                value = op === "+" ? value + rhs : value - rhs;
            }
            return value;
        };

        const result = tokens.length === 0 ? 0 : parseExpr();

        if (pos !== tokens.length) {
            // Not all tokens were consumed -> trailing garbage in the expression
            throw new Error("invalid arithmetic expression");
        }
        if (typeof result !== "number" || !Number.isFinite(result)) {
            throw new Error("invalid arithmetic result");
        }

        return Math.trunc(result);
    },

    /**
     * Finds the first `$(...)` command-substitution pattern in `str`
     * starting at index `from`, correctly matching nested parentheses.
     * Distinguishes `$((...))` arithmetic expansion (skipped, not a command
     * substitution) from a genuine `$(...)` command substitution.
     * @returns {{start:number, end:number, inner:string}|null} Position info
     *   and the inner command text, or null if none/unbalanced.
     */
    findCommandSubstitution(str, from = 0) {
        const idx = str.indexOf("$(", from);
        if (idx === -1) return null;
        if (str[idx + 2] === "(") {
            // "$((" - arithmetic expansion, not command substitution. Skip past
            // it and keep looking (expandArithmetic should normally have already
            // removed these by the time this runs, but this guards stray cases).
            return this.findCommandSubstitution(str, idx + 1);
        }
        let depth = 1;
        let i = idx + 2;
        for (; i < str.length && depth > 0; i++) {
            if (str[i] === "(") depth++;
            else if (str[i] === ")") depth--;
        }
        if (depth !== 0) return null; // unbalanced - leave as-is
        return { start: idx, end: i, inner: str.slice(idx + 2, i - 1) };
    },

    /**
     * Repeatedly finds and replaces `$(...)` command substitutions in `str`
     * with the captured stdout of actually running the inner command
     * (via runCaptured, defined in execute.js). Trailing newlines are
     * stripped from the captured output to match bash's behavior.
     * @param {string} str - Input string possibly containing $(...) patterns.
     * @returns {Promise<string>} The string with all substitutions resolved.
     * @throws {Error} If substitutions appear to nest more than 50 deep
     *   (guards against pathological/infinite input).
     */
    async expandCommandSubstitution(str) {
        let result = str;
        let guard = 0;
        while (true) {
            const found = this.findCommandSubstitution(result);
            if (!found) break;
            if (++guard > 50) {
                throw new Error("too many nested command substitutions");
            }
            const captured = await this.runCaptured(found.inner);
            // bash strips trailing newlines from $(...) output, but keeps
            // internal newlines intact
            const text = (captured.stdout ?? "").replace(/\r?\n+$/, "");
            result = result.slice(0, found.start) + text + result.slice(found.end);
        }
        return result;
    },

    /**
     * If the first word of `input` matches a defined alias, substitutes it
     * with the alias's expansion (e.g. "ll" -> "ls -la"). Only the first
     * word is checked/replaced, matching simple shell alias semantics.
     */
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
