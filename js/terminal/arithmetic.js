/**
 * Bash-style `$((...))` arithmetic expansion for TerminalEngine.
 *
 * Split out of parser.js because it's a self-contained subsystem: a
 * tokenizer + small recursive-descent parser/evaluator for integer
 * arithmetic. It DOES still need to share parser.js's quote-tracking
 * rules (see findArithmeticExpansion below) so a single-quoted `$((...))`
 * is left alone, matching real bash - but not the balanced-paren
 * scanning, which is self-contained here since arithmetic parens don't
 * interact with the rest of the line the way command-substitution parens do.
 * Only ever entered through expandArithmetic() below (called from
 * execute.js alongside expandVariables()).
 */
Object.assign(TerminalEngine.prototype, {

    /**
     * Finds the first top-level (unquoted, unescaped) `$((...))` in `str`,
     * matching its closing `))` by tracking paren depth - so a nested,
     * parenthesized expression like `$((1+(2+3)))` finds the REAL end
     * (after all three closing parens) rather than stopping at the first
     * `))` it sees (which, for that example, is one character too early -
     * the closing paren of `(2+3)` immediately followed by just the first
     * of the wrapper's own two, i.e. `3)` + `)` + trailing `)`, not `3))` +
     * trailing `)`; a naive scan-for-"))"" approach mistakes the former
     * for the latter and returns a truncated, unbalanced inner expression).
     * Single-quote/backslash handling mirrors findCommandSubstitution() in
     * parser.js: a `$((` inside single quotes is never an expansion
     * (single quotes suppress all expansion), and a backslash-escaped
     * `\$((` is left alone entirely.
     * @param {string} str
     * @param {number} [from=0]
     * @returns {{start:number, end:number, inner:string}|null}
     */
    findArithmeticExpansion(str, from = 0) {
        let inSingle = false;
        let inDouble = false;

        for (let i = from; i < str.length; i++) {
            const ch = str[i];

            if (!inSingle && ch === "\\" && i + 1 < str.length) {
                const next = str[i + 1];
                if (!inDouble || "$`\"\\\n".includes(next)) {
                    i++;
                    continue;
                }
            }

            if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
            if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
            if (inSingle) continue; // single quotes suppress arithmetic expansion entirely

            if (ch === "$" && str[i + 1] === "(" && str[i + 2] === "(") {
                const end = this.matchArithmeticClose(str, i + 3);
                if (end === null) return null; // unbalanced - leave as-is
                return { start: i, end, inner: str.slice(i + 3, end - 2) };
            }
        }

        return null;
    },

    /**
     * Given the index right after a `$((`'s two opening parens, scans
     * forward for the matching `))` - counting depth so any parens WITHIN
     * the expression itself (e.g. the `(2+3)` in `$((1+(2+3)))`) are
     * tracked and skipped rather than mistaken for the wrapper's own close.
     * @param {string} str
     * @param {number} start
     * @returns {number|null} Index just past the matching "))", or null if
     *   the parens never balance out.
     */
    matchArithmeticClose(str, start) {
        let depth = 0;

        for (let i = start; i < str.length; i++) {
            const ch = str[i];
            if (ch === "(") {
                depth++;
            } else if (ch === ")") {
                if (depth === 0) {
                    // This ")" is the wrapper's own first closing paren -
                    // it must be immediately followed by the second one.
                    return str[i + 1] === ")" ? i + 2 : null;
                }
                depth--;
            }
        }

        return null; // never closed
    },

    /**
     * Expands every `$((expr))` arithmetic expression in `input` by
     * evaluating it with evaluateArithmetic - repeatedly, so multiple
     * (or nested-after-substitution) expressions in the same string all
     * resolve. On evaluation error, silently expands to "0" (mirroring
     * the tolerant behavior expected in a toy shell).
     */
    expandArithmetic(input) {
        let result = input;
        let guard = 0;

        while (true) {
            const found = this.findArithmeticExpansion(result);
            if (!found) break;
            if (++guard > 50) break; // guards against pathological/infinite input

            let value;
            try {
                value = this.evaluateArithmetic(found.inner);
            } catch {
                value = 0;
            }
            result = result.slice(0, found.start) + String(value) + result.slice(found.end);
        }

        return result;
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

});
