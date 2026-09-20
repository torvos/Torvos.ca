/**
 * Bash-style `$((...))` arithmetic EVALUATION for TerminalEngine: a
 * tokenizer + small recursive-descent parser/evaluator for integer
 * arithmetic. Split out of parser.js because it's a self-contained
 * subsystem with no dependency on the quote-tracking state shared by
 * everything else in that file.
 *
 * Finding a `$((...))`'s boundaries in a larger string (matchArithmeticClose
 * below) and deciding whether one applies at all (single quotes still
 * suppress it, matching real bash) is handled here too, since paren-
 * balancing for arithmetic doesn't interact with the rest of the line the
 * way command-substitution paren-balancing does. But actually FINDING and
 * expanding every `$((...))` in a string, is expandAll()'s job, in
 * parser.js - not a separate pass here - see the comment on that function
 * for why doing this as a separate pass used to be a real (if subtle)
 * correctness bug.
 */
Object.assign(TerminalEngine.prototype, {

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
