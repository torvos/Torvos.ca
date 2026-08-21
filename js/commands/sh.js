/**
 * `sh` command.
 * A small shell-script interpreter: reads a file, tokenizes/parses it into
 * a tiny AST (commands, if/elif/else/fi, while/do/done, for/in/do/done,
 * break/continue), then walks that AST executing each statement through
 * the terminal's normal terminal.execute() pipeline. Supports positional
 * parameters ($0, $1.., $@, $#), POSIX-style [ ] test expressions, and a
 * script recursion depth/loop-iteration guard to prevent runaway scripts.
 *
 * Wrapped in an IIFE so all the parsing/execution helper functions stay
 * private to this file; only the `sh` command itself is registered globally.
 */
(function () {

    // Shell keywords that can never appear as the start of a bare command line
    // (parseStatement uses this to reject dangling/misplaced keywords).
    const KEYWORDS = ["then", "do", "fi", "done", "else", "elif"];

    /**
     * Splits a single logical script line into whitespace-separated tokens,
     * honoring single/double quotes (contents kept literal, quote chars
     * preserved in the token) and treating ";" as its own token so
     * splitStatements can later split compound lines like "if x; then".
     */
    function tokenizeLine(line) {
        const tokens = [];
        let current = "";
        let inSingle = false;
        let inDouble = false;
        let hasToken = false;

        const flush = () => {
            if (hasToken) { tokens.push(current); current = ""; hasToken = false; }
        };

        for (const ch of line) {
            if (inSingle) {
                current += ch; hasToken = true;
                if (ch === "'") inSingle = false;
                continue;
            }
            if (inDouble) {
                current += ch; hasToken = true;
                if (ch === '"') inDouble = false;
                continue;
            }
            if (ch === "'") { inSingle = true; current += ch; hasToken = true; continue; }
            if (ch === '"') { inDouble = true; current += ch; hasToken = true; continue; }
            if (ch === ";") { flush(); tokens.push(";"); continue; }
            if (/\s/.test(ch)) { flush(); continue; }
            current += ch;
            hasToken = true;
        }
        flush();

        return tokens;
    }

    /**
     * Joins physical script lines back together wherever a single/double
     * quote opened on one line is still unclosed at its end (e.g. a
     * variable assignment like `x="line one\nline two"` written as an
     * actual multi-line string). Comment/blank-line skipping only applies
     * to lines that start a new logical line (i.e. no quote is currently
     * open) - a "#" or blank line appearing inside an open quote is literal
     * content, not a comment or something to skip.
     * @param {string[]} rawLines - Physical lines (not yet trimmed).
     * @returns {string[]} Logical lines, quote-spanning lines joined with "\n".
     */
    function mergeQuoteContinuations(rawLines) {
        const merged = [];
        let buffer = null;
        let inSingle = false;
        let inDouble = false;

        for (const rawLine of rawLines) {
            if (buffer === null) {
                const trimmed = rawLine.trim();
                if (!trimmed || trimmed.startsWith("#")) {
                    continue;
                }
                buffer = rawLine;
            } else {
                buffer += "\n" + rawLine;
            }

            // Update the running quote state against this line's characters
            // (state persists across lines so a quote opened earlier stays
            // "open" until its matching close character is found).
            for (const ch of rawLine) {
                if (inSingle) {
                    if (ch === "'") inSingle = false;
                    continue;
                }
                if (inDouble) {
                    if (ch === '"') inDouble = false;
                    continue;
                }
                if (ch === "'") { inSingle = true; continue; }
                if (ch === '"') { inDouble = true; continue; }
            }

            if (!inSingle && !inDouble) {
                merged.push(buffer);
                buffer = null;
            }
            // else: quote still open, keep accumulating on the next line
        }
        if (buffer !== null) {
            // Quote never closed before end of file - push what we have so
            // the parser can surface a clear syntax error rather than
            // silently dropping the tail of the script.
            merged.push(buffer);
        }
        return merged;
    }

    // Keywords that must start their own statement/clause even when they
    // appear on the same physical line as other tokens (e.g. "for x in y do").
    const STANDALONE_KEYWORDS = new Set(["do", "then", "else", "fi", "done"]);

    /**
     * Breaks a single raw script line into one or more logical "clauses" -
     * separate statements split on ";" and on standalone control-flow
     * keywords, so e.g. "if [ -f x ]; then" becomes two clauses:
     * "if [ -f x ]" and "then". This lets the parser treat each keyword as
     * its own line regardless of how the script author formatted it.
     */
    function splitStatements(line) {
        const tokens = tokenizeLine(line);
        const clauses = [];
        let current = [];
        const flush = () => {
            if (current.length) {
                clauses.push(current.join(" "));
                current = [];
            }
        };

        for (const token of tokens) {
            if (token === ";") {
                flush();
                continue;
            }
            if (STANDALONE_KEYWORDS.has(token)) {
                flush();
                clauses.push(token);
                continue;
            }
            current.push(token);
        }
        flush();

        return clauses;
    }

    /**
     * Parses an array of pre-split logical script lines into a tree of
     * statement objects (the "program"). Uses a simple recursive-descent
     * approach with a shared `pos` cursor over `lines`.
     * @param {string[]} lines - Logical lines (already split by splitStatements).
     * @returns {Object[]} Top-level list of statement nodes.
     * @throws {Error} On any structural syntax error (missing fi/done, etc).
     */
    function parseScript(lines) {
        let pos = 0;

        function peek() {
            return lines[pos];
        }

        function firstWord(line) {
            return line.split(/\s+/, 1)[0];
        }

        // Parses statements until the next line's first word is one of stopWords
        // (used to know when an if/while/for body ends).
        function parseStatements(stopWords) {
            const stmts = [];
            while (pos < lines.length && !stopWords.includes(firstWord(peek()))) {
                stmts.push(parseStatement());
            }
            return stmts;
        }

        // Consumes the block-opening keyword (e.g. "then"/"do") that should
        // follow a header clause, whether it's inline ("...; then") or on
        // its own following line. Returns the header text with the keyword
        // stripped off.
        function consumeHeaderKeyword(headerRemainder, keyword) {
            const inlineMatch = headerRemainder.match(new RegExp(`;\\s*${keyword}\\s*$`));
            if (inlineMatch) {
                return headerRemainder.slice(0, inlineMatch.index).trim();
            }
            if (pos < lines.length && peek() === keyword) {
                pos++;
                return headerRemainder.trim();
            }
            throw new Error(`syntax error: expected '${keyword}' after '${headerRemainder.trim()}'`);
        }

        // Parses an `if <cond> then <body> [elif <cond> then <body>]* [else <body>] fi` block.
        function parseIf(headerRemainder) {
            const condition = consumeHeaderKeyword(headerRemainder, "then");
            const branches = [{ condition, body: parseStatements(["elif", "else", "fi"]) }];

            while (pos < lines.length && firstWord(peek()) === "elif") {
                const elifRemainder = lines[pos++].replace(/^elif\s+/, "");
                const elifCondition = consumeHeaderKeyword(elifRemainder, "then");
                branches.push({ condition: elifCondition, body: parseStatements(["elif", "else", "fi"]) });
            }

            let elseBody = [];
            if (pos < lines.length && peek() === "else") {
                pos++;
                elseBody = parseStatements(["fi"]);
            }

            if (pos >= lines.length || lines[pos++] !== "fi") {
                throw new Error("syntax error: missing 'fi'");
            }

            return { type: "if", branches, elseBody };
        }

        // Parses a `while <cond> do <body> done` block.
        function parseWhile(headerRemainder) {
            const condition = consumeHeaderKeyword(headerRemainder, "do");
            const body = parseStatements(["done"]);
            if (pos >= lines.length || lines[pos++] !== "done") {
                throw new Error("syntax error: missing 'done'");
            }
            return { type: "while", condition, body };
        }

        // Parses a `for VAR in ITEMS do <body> done` block.
        function parseFor(varName, headerRemainder) {
            const itemsText = consumeHeaderKeyword(headerRemainder, "do");
            const body = parseStatements(["done"]);
            if (pos >= lines.length || lines[pos++] !== "done") {
                throw new Error("syntax error: missing 'done'");
            }
            return { type: "for", varName, itemsText, body };
        }

        // Parses a single statement starting at the current position,
        // dispatching to the matching control-flow parser or treating it
        // as a plain shell command otherwise.
        function parseStatement() {
            const line = lines[pos++];

            const ifMatch = line.match(/^if\s+([\s\S]*)$/);
            if (ifMatch) return parseIf(ifMatch[1]);

            const whileMatch = line.match(/^while\s+([\s\S]*)$/);
            if (whileMatch) return parseWhile(whileMatch[1]);

            const forMatch = line.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([\s\S]*)$/);
            if (forMatch) return parseFor(forMatch[1], forMatch[2]);

            if (line === "break") return { type: "break" };
            if (line === "continue") return { type: "continue" };

            if (KEYWORDS.includes(firstWord(line))) {
                // A block keyword showed up where a plain command was expected
                // (e.g. a stray "fi" with no matching "if")
                throw new Error(`syntax error near unexpected token '${line}'`);
            }

            return { type: "command", text: line };
        }

        const program = parseStatements([]);
        if (pos < lines.length) {
            // Statements ran out before consuming all lines - something like
            // an unmatched "done"/"fi" was left dangling
            throw new Error(`syntax error near unexpected token '${lines[pos]}'`);
        }
        return program;
    }

    /**
     * Evaluates a tokenized POSIX-style `[ ... ]` test expression:
     *   - `!` EXPR              - negation
     *   - TOKEN                  - true if non-empty
     *   - -f/-d/-e/-z/-n OPERAND - file/string tests
     *   - LEFT op RIGHT          - string (=, ==, !=) or numeric
     *     (-eq, -ne, -lt, -le, -gt, -ge) comparison
     * @param {TerminalEngine} terminal
     * @param {string[]} tokens - Tokens between the [ and ] brackets.
     * @returns {boolean}
     */
    function evaluateTestTokens(terminal, tokens) {
        if (tokens.length === 0) return false;

        if (tokens[0] === "!") {
            return !evaluateTestTokens(terminal, tokens.slice(1));
        }

        if (tokens.length === 1) {
            return tokens[0].length > 0;
        }

        if (tokens.length === 2) {
            const [op, operand] = tokens;
            const node = terminal.fs.get(operand, terminal.cwd);
            switch (op) {
                case "-f": return !!node && terminal.fs.isFile(node);
                case "-d": return !!node && terminal.fs.isDirectory(node);
                case "-e": return !!node;
                case "-z": return operand.length === 0;
                case "-n": return operand.length > 0;
                default: return false;
            }
        }

        if (tokens.length === 3) {
            const [left, op, right] = tokens;
            switch (op) {
                case "=": case "==": return left === right;
                case "!=": return left !== right;
                case "-eq": return Number(left) === Number(right);
                case "-ne": return Number(left) !== Number(right);
                case "-lt": return Number(left) < Number(right);
                case "-le": return Number(left) <= Number(right);
                case "-gt": return Number(left) > Number(right);
                case "-ge": return Number(left) >= Number(right);
                default: return false;
            }
        }

        return false;
    }

    // Tokenizes and evaluates the text found between [ and ] in a test expression.
    function evaluateTest(terminal, exprText) {
        return evaluateTestTokens(terminal, terminal.tokenize(exprText));
    }

    /**
     * Evaluates an if/while condition. Expands variables first, then:
     *   - a leading "!" negates the result
     *   - "[ expr ]" is evaluated as a POSIX test expression
     *   - anything else is run as an actual shell command, and the
     *     condition is true iff that command exited with code 0
     *     (mirroring real shell `if some_command; then` behavior)
     */
    async function evaluateCondition(terminal, conditionRaw) {
        const condition = terminal.expandVariables(conditionRaw).trim();
        if (!condition) return false;

        let negate = false;
        let expr = condition;
        if (expr.startsWith("!")) {
            negate = true;
            expr = expr.slice(1).trim();
        }

        let result;
        if (expr.startsWith("[") && expr.endsWith("]")) {
            result = evaluateTest(terminal, expr.slice(1, -1).trim());
        } else {
            await terminal.execute(expr);
            result = terminal.lastExitCode === 0;
        }

        return negate ? !result : result;
    }

    // Expands the "in ITEMS" clause of a for-loop: variable-expands the
    // text, tokenizes it, then resolves any wildcard tokens against the
    // filesystem (falling back to the literal token if nothing matches).
    function expandForItems(terminal, itemsText) {
        const expanded = terminal.expandVariables(itemsText);
        const tokens = terminal.tokenize(expanded);
        const items = [];
        for (const token of tokens) {
            const globbed = terminal.fs.expandWildcards(token, terminal.cwd);
            items.push(...(globbed.length > 0 ? globbed : [token]));
        }
        return items;
    }

    // Safety cap on while/for loop iterations, guarding against scripts
    // that would otherwise loop forever (e.g. `while true; do ...; done`).
    const MAX_LOOP_ITERATIONS = 100000;

    // Periodically yields to the event loop during long-running loops so
    // the browser tab doesn't lock up / become unresponsive mid-script.
    async function maybeYield(iteration) {
        if (iteration % 200 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    // Runs a list of statements in sequence, stopping early and propagating
    // a "break"/"continue" signal upward if one of them produces one
    // (used so break/continue inside nested blocks can escape enclosing
    // if-statements to reach the nearest loop).
    async function runStatements(terminal, stmts) {
        for (const stmt of stmts) {
            const signal = await runStatement(terminal, stmt);
            if (signal) return signal;
        }
        return null;
    }

    /**
     * Executes a single parsed statement node.
     * @returns {"break"|"continue"|null} A control-flow signal to propagate
     *   up to the nearest enclosing loop, or null if execution should
     *   simply continue with the next statement.
     */
    async function runStatement(terminal, stmt) {
        switch (stmt.type) {

            case "command": {
                // When SCRIPTDEBUG (set via `sh -x`) is on, echo the command
                // before running it, like bash's `set -x` trace mode
                if (terminal.env.SCRIPTDEBUG === "true") {
                    terminal.write(`+ ${stmt.text}`, { color: "#888888" });
                }
                await terminal.execute(stmt.text);
                return null;
            }

            case "if": {
                // Try each branch's condition in order (if, then each elif);
                // run the first one that's true, or the else body if none matched
                for (const branch of stmt.branches) {
                    if (await evaluateCondition(terminal, branch.condition)) {
                        return runStatements(terminal, branch.body);
                    }
                }
                return runStatements(terminal, stmt.elseBody);
            }

            case "while": {
                let iterations = 0;
                while (await evaluateCondition(terminal, stmt.condition)) {
                    if (++iterations > MAX_LOOP_ITERATIONS) {
                        terminal.write(terminal.formatErrorLine("sh: while loop exceeded maximum iteration limit"));
                        break;
                    }
                    await maybeYield(iterations);
                    const signal = await runStatements(terminal, stmt.body);
                    if (signal === "break") break;
                    // Note: "continue" signals simply fall through here since
                    // the while's own condition check re-runs on the next iteration
                }
                return null;
            }

            case "for": {
                const items = expandForItems(terminal, stmt.itemsText);
                for (let i = 0; i < items.length; i++) {
                    if (i > MAX_LOOP_ITERATIONS) {
                        terminal.write(terminal.formatErrorLine("sh: for loop exceeded maximum iteration limit"));
                        break;
                    }
                    await maybeYield(i);
                    terminal.env[stmt.varName] = items[i];
                    const signal = await runStatements(terminal, stmt.body);
                    if (signal === "break") break;
                }
                return null;
            }

            // break/continue: bubble the signal up to runStatements, which
            // propagates it until it reaches the enclosing while/for handler above
            case "break":
                return "break";

            case "continue":
                return "continue";
        }
        return null;
    }

    registerCommand("sh", {
        name: "Execute commands from a script file.",
        synopsis: "sh [OPTIONS] SCRIPT [ARGS...]",
        description: "Read the specified file and execute it as a shell script, in order, as if it had been typed at the prompt. Lines beginning with '#' are treated as comments and skipped. Positional parameters ($0, $1.., $@, $#) are available based on ARGS, and $? holds the exit code of the last command run. Supports variable assignment (NAME=value), $((arithmetic)) expansion, if/elif/else/fi, for/in/do/done and while/do/done loops, break/continue, and POSIX-style [ ] test expressions.",
        options: [
            "-x    Print each command to standard output before it is executed."
        ],
        examples: [
            "sh backup.sh",
            "sh deploy.sh prod",
            "sh -x setup.sh",
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

            const parsed = terminal.parseFlags(args, { x: false });
            const trace = parsed.flags.has("x");
            const target = parsed.args[0];

            if (!target) {
                return {
                    stdout: "",
                    stderr: "sh: missing script operand",
                    exitCode: 1
                };
            }

            return this.runScript(terminal, target, parsed.args.slice(1), { trace, label: "sh" });
        },

        /**
         * Loads, parses, and runs a script file. Also invoked directly by
         * execute.js when a bare path like "./script.sh" is typed at the
         * prompt (not just via the explicit `sh` command), which is why
         * this is exposed as a method here rather than kept private.
         * @param {TerminalEngine} terminal
         * @param {string} target - Path to the script file.
         * @param {string[]} scriptArgs - Positional args ($1, $2, ... within the script).
         * @param {Object} [options]
         * @param {boolean} [options.trace] - Enable `-x`-style command echoing.
         * @param {string} [options.label] - Name to use in error messages
         *   (defaults to the target path; overridden to "sh" for explicit invocations).
         * @returns {Promise<{stdout:string, stderr:string, exitCode:number}>}
         */
        async runScript(terminal, target, scriptArgs, options = {}) {
            const trace = options.trace === true || options.trace === "true";
            const label = options.label ?? target;

            if (terminal.fs.isProtected(target, terminal.cwd)) {
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: Permission denied`,
                    exitCode: 1
                };
            }

            const node = terminal.fs.get(target, terminal.cwd);

            if (!node) {
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: No such file or directory`,
                    exitCode: 127
                };
            }

            if (terminal.fs.isDirectory(node)) {
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: Is a directory`,
                    exitCode: 126
                };
            }

            if (!terminal.fs.isFile(node)) {
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: not executable`,
                    exitCode: 126
                };
            }

            // Check the owner-execute bit (3rd char of the 9-char mode string)
            const mode = node.mode || "";
            const ownerExecutable = mode[2] === "x";
            if (!ownerExecutable) {
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: Permission denied`,
                    exitCode: 126
                };
            }

            const fullPath = terminal.fs.getFullPath(target, terminal.cwd);

            // Track a stack of currently-running script paths on the terminal
            // instance itself, so nested `sh` calls (a script running another
            // script) can detect runaway recursion or depth limits.
            terminal._scriptStack ??= [];
            const MAX_SCRIPT_DEPTH = 10;

            if (terminal._scriptStack.length >= MAX_SCRIPT_DEPTH) {
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: script recursion limit exceeded`,
                    exitCode: 1
                };
            }
            if (terminal._scriptStack.includes(fullPath)) {
                // Same script is already somewhere up the call stack - direct or
                // indirect self-invocation, block it rather than looping forever
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: recursive script invocation blocked`,
                    exitCode: 1
                };
            }

            // Substitutes $0/$1../$@/$# positional-parameter references in a
            // line with the script's invocation path/arguments.
            function applyPositionalParams(line) {
                return line
                    .replace(/\$@/g, scriptArgs.join(" "))
                    .replace(/\$#/g, String(scriptArgs.length))
                    .replace(/\$0\b/g, target)
                    .replace(/\$([1-9])\b/g, (_, n) => scriptArgs[Number(n) - 1] ?? "");
            }

            // Preprocess the raw file content into parser-ready logical lines:
            // strip comments/blank lines, substitute positional params, and
            // split each physical line into its constituent statement clauses.
            const rawLines = terminal.fs.readContent(node).split(/\r?\n/);
            const logicalLines = mergeQuoteContinuations(rawLines);
            const lines = [];
            for (const rawLine of logicalLines) {
                const trimmed = rawLine.trim();
                if (!trimmed || trimmed.startsWith("#")) {
                    continue;
                }
                const substituted = applyPositionalParams(trimmed);
                lines.push(...splitStatements(substituted));
            }

            let program;
            try {
                program = parseScript(lines);
            } catch (err) {
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: ${err.message}`,
                    exitCode: 2
                };
            }

            node.accessed = Date.now();
            terminal._scriptStack.push(fullPath);

            // Temporarily force SCRIPTDEBUG on for the duration of this script
            // when -x was passed, then restore whatever it was before
            const previousDebug = terminal.env.SCRIPTDEBUG;
            if (trace) {
                terminal.env.SCRIPTDEBUG = "true";
            }

            try {
                await runStatements(terminal, program);
            } finally {
                if (trace) {
                    terminal.env.SCRIPTDEBUG = previousDebug;
                }
                terminal._scriptStack.pop();
            }

            return {
                stdout: "",
                stderr: "",
                exitCode: terminal.lastExitCode ?? 0
            };
        }
    });

})();
