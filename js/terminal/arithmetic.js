/**
 * Bash-style `$((...))` arithmetic expansion for TerminalEngine.
 *
 * Split out of parser.js because it's a self-contained subsystem: a
 * tokenizer + small recursive-descent parser/evaluator for integer
 * arithmetic that doesn't share any of parser.js's quote-tracking state
 * machine, and is only ever entered through expandArithmetic() below
 * (called from execute.js alongside expandVariables()).
 */
Object.assign(TerminalEngine.prototype, {

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

});
