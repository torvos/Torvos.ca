(function () {

    const KEYWORDS = ["then", "do", "fi", "done", "else", "elif"];

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

    const STANDALONE_KEYWORDS = new Set(["do", "then", "else", "fi", "done"]);

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

    function parseScript(lines) {
        let pos = 0;

        function peek() {
            return lines[pos];
        }

        function firstWord(line) {
            return line.split(/\s+/, 1)[0];
        }

        function parseStatements(stopWords) {
            const stmts = [];
            while (pos < lines.length && !stopWords.includes(firstWord(peek()))) {
                stmts.push(parseStatement());
            }
            return stmts;
        }

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

        function parseWhile(headerRemainder) {
            const condition = consumeHeaderKeyword(headerRemainder, "do");
            const body = parseStatements(["done"]);
            if (pos >= lines.length || lines[pos++] !== "done") {
                throw new Error("syntax error: missing 'done'");
            }
            return { type: "while", condition, body };
        }

        function parseFor(varName, headerRemainder) {
            const itemsText = consumeHeaderKeyword(headerRemainder, "do");
            const body = parseStatements(["done"]);
            if (pos >= lines.length || lines[pos++] !== "done") {
                throw new Error("syntax error: missing 'done'");
            }
            return { type: "for", varName, itemsText, body };
        }

        function parseStatement() {
            const line = lines[pos++];

            const ifMatch = line.match(/^if\s+(.*)$/);
            if (ifMatch) return parseIf(ifMatch[1]);

            const whileMatch = line.match(/^while\s+(.*)$/);
            if (whileMatch) return parseWhile(whileMatch[1]);

            const forMatch = line.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.*)$/);
            if (forMatch) return parseFor(forMatch[1], forMatch[2]);

            if (line === "break") return { type: "break" };
            if (line === "continue") return { type: "continue" };

            if (KEYWORDS.includes(firstWord(line))) {
                throw new Error(`syntax error near unexpected token '${line}'`);
            }

            return { type: "command", text: line };
        }

        const program = parseStatements([]);
        if (pos < lines.length) {
            throw new Error(`syntax error near unexpected token '${lines[pos]}'`);
        }
        return program;
    }

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

    function evaluateTest(terminal, exprText) {
        return evaluateTestTokens(terminal, terminal.tokenize(exprText));
    }

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

    const MAX_LOOP_ITERATIONS = 100000;

    async function maybeYield(iteration) {
        if (iteration % 200 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }

    async function runStatements(terminal, stmts) {
        for (const stmt of stmts) {
            const signal = await runStatement(terminal, stmt);
            if (signal) return signal;
        }
        return null;
    }

    async function runStatement(terminal, stmt) {
        switch (stmt.type) {

            case "command": {
                if (terminal.env.SCRIPTDEBUG === "true") {
                    terminal.write(`+ ${stmt.text}`, { color: "#888888" });
                }
                await terminal.execute(stmt.text);
                return null;
            }

            case "if": {
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
                        terminal.write("sh: while loop exceeded maximum iteration limit", { color: "#ff6060" });
                        break;
                    }
                    await maybeYield(iterations);
                    const signal = await runStatements(terminal, stmt.body);
                    if (signal === "break") break;
                }
                return null;
            }

            case "for": {
                const items = expandForItems(terminal, stmt.itemsText);
                for (let i = 0; i < items.length; i++) {
                    if (i > MAX_LOOP_ITERATIONS) {
                        terminal.write("sh: for loop exceeded maximum iteration limit", { color: "#ff6060" });
                        break;
                    }
                    await maybeYield(i);
                    terminal.env[stmt.varName] = items[i];
                    const signal = await runStatements(terminal, stmt.body);
                    if (signal === "break") break;
                }
                return null;
            }

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

        async runScript(terminal, target, scriptArgs, options = {}) {
            const trace = options.trace === true || options.trace === "true";
            const label = options.label ?? target;

            if (terminal.fs.isInBin(target, terminal.cwd)) {
                return {
                    stdout: "",
                    stderr: `${label}: cannot execute files in /bin`,
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
                return {
                    stdout: "",
                    stderr: `${label}: ${target}: recursive script invocation blocked`,
                    exitCode: 1
                };
            }

            function applyPositionalParams(line) {
                return line
                    .replace(/\$@/g, scriptArgs.join(" "))
                    .replace(/\$#/g, String(scriptArgs.length))
                    .replace(/\$0\b/g, target)
                    .replace(/\$([1-9])\b/g, (_, n) => scriptArgs[Number(n) - 1] ?? "");
            }

            const rawLines = (node.content ?? "").split(/\r?\n/);
            const lines = [];
            for (const rawLine of rawLines) {
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
