/**
 * Shell-parsing utilities for TerminalEngine: brace expansion, quote-aware
 * tokenizing/splitting, I/O redirection parsing, variable expansion,
 * command substitution ($(...)), and alias expansion. These are used by
 * execute.js to turn a raw typed command line into something that can
 * actually be run.
 *
 * `$((...))` arithmetic expansion itself lives in js/terminal/arithmetic.js -
 * it's a self-contained tokenizer/evaluator with no dependency on the
 * quote-tracking state shared by everything else in this file. This file
 * still calls into it (expandArithmetic(), from execute.js's expansion
 * pipeline) the same way it always has.
 */
Object.assign(TerminalEngine.prototype, {

    /**
     * Expands brace patterns like "file{1,2,3}.txt" into
     * ["file1.txt", "file2.txt", "file3.txt"]. Recurses to support both
     * multiple brace groups in one string (e.g. "a{1,2}{x,y}") and nested
     * groups (e.g. "a{1,{2,3}}" -> "a1", "a2", "a3").
     *
     * Only considers a "{...}" group that appears OUTSIDE any quotes -
     * matching real bash, where quoting (either kind) suppresses brace
     * expansion entirely: `echo {a,b}` expands, but `echo "{a,b}"` prints
     * `{a,b}` literally. An escaped "{" or "}" (e.g. `echo \{a,b\}`)
     * is likewise left alone rather than treated as a real brace group.
     *
     * Matching real bash, a "{...}" group with no top-level comma inside it
     * (e.g. "file{bar}") is NOT a real brace expansion and is left as
     * literal text - `echo foo{bar}` prints `foo{bar}`, not `foobar`.
     * @param {string} input - Input string possibly containing a {a,b,c} group.
     * @returns {string[]} All expanded variants (or [input] if no braces found).
     */
    expandBraces(input) {
        const group = this.findBraceGroup(input);
        if (!group) {
            return [input];
        }

        const { start, end, inner } = group;
        const alternatives = this.splitBraceAlternatives(inner);

        if (alternatives.length < 2) {
            // No top-level comma inside the braces - not a real expansion.
            // Leave this group exactly as-is and keep looking for a real
            // one later in the string.
            const tailResults = this.expandBraces(input.slice(end + 1));
            const prefix = input.slice(0, end + 1);
            return tailResults.map(tail => prefix + tail);
        }

        const results = [];
        for (const alt of alternatives) {
            const expanded =
                input.slice(0, start) + alt.trim() + input.slice(end + 1);
            // Recurse over the whole reconstructed string: this picks up
            // both any further sibling groups ("a{1,2}{x,y}") and any
            // brace group that was nested inside this alternative
            // ("a{1,{2,3}}" - once "{2,3}" is substituted in, the next
            // call finds it as an ordinary top-level group of its own).
            results.push(...this.expandBraces(expanded));
        }
        return results;
    },

    /**
     * Finds the first top-level (unquoted, unescaped) "{...}" group in
     * `input`, matching nested braces by depth so e.g. "{1,{2,3}}" is
     * found as a single group spanning the outer braces rather than
     * stopping at the first inner "}".
     * @param {string} input
     * @returns {{start: number, end: number, inner: string}|null} Index of
     *   the opening "{", index of the matching closing "}", and the text
     *   between them - or null if there's no complete top-level group.
     */
    findBraceGroup(input) {
        let inSingle = false;
        let inDouble = false;
        let start = -1;
        let depth = 0;

        for (let i = 0; i < input.length; i++) {
            const ch = input[i];

            if (!inSingle && ch === "\\" && i + 1 < input.length) {
                const next = input[i + 1];
                if (!inDouble || "$`\"\\\n".includes(next)) {
                    i++; // an escaped character can't start/end a brace group
                    continue;
                }
            }

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

            if (ch === "{") {
                if (start === -1) start = i;
                depth++;
            } else if (ch === "}" && start !== -1) {
                depth--;
                if (depth === 0) {
                    return { start, end: i, inner: input.slice(start + 1, i) };
                }
            }
        }

        return null; // no group found, or an unbalanced "{" with no match
    },

    /**
     * Splits the inside of a brace group on top-level commas - i.e. commas
     * that aren't themselves inside a nested "{...}" group or a quoted
     * section. Used so "{a,{b,c},d}"'s inner text "a,{b,c},d" splits into
     * ["a", "{b,c}", "d"] rather than breaking the nested group apart.
     * @param {string} str - Text between a brace group's outer { and }.
     * @returns {string[]} The comma-separated alternatives.
     */
    splitBraceAlternatives(str) {
        const parts = [];
        let current = "";
        let inSingle = false;
        let inDouble = false;
        let depth = 0;

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];

            if (!inSingle && ch === "\\" && i + 1 < str.length) {
                const next = str[i + 1];
                if (!inDouble || "$`\"\\\n".includes(next)) {
                    current += ch + next;
                    i++;
                    continue;
                }
            }

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
            if (ch === "'") { inSingle = true; current += ch; continue; }
            if (ch === '"') { inDouble = true; current += ch; continue; }

            if (ch === "{") { depth++; current += ch; continue; }
            if (ch === "}") { depth--; current += ch; continue; }

            if (ch === "," && depth === 0) {
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
     * Splits `str` on `delimiter`, but ignores delimiters that appear inside
     * single or double quotes (so quoted content is never split apart).
     * Backslash-escaped characters are skipped over as a pair so an escaped
     * quote (e.g. the `\"` in `"a\";b"`) doesn't look like it closes the
     * quote early - which would otherwise make the `;` right after it look
     * like a real top-level delimiter instead of quoted text.
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

            // Backslash escaping (bash rules): outside quotes, "\" escapes
            // ANY next character. Inside double quotes, it only escapes
            // $ ` " \ and newline - anything else is left as a literal
            // backslash and falls through to the normal handling below.
            // Single quotes (checked next) never allow escapes at all.
            if (!inSingle && ch === "\\" && i + 1 < str.length) {
                const next = str[i + 1];
                if (!inDouble || "$`\"\\\n".includes(next)) {
                    current += ch + next;
                    i++;
                    continue;
                }
            }

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
     * A backslash-escaped character (e.g. the `\"` in `"a\";b"`, or an
     * unquoted `\>`) is masked as a pair too, for the same reason
     * splitTopLevel() treats it as a pair: an escaped quote shouldn't be
     * read as closing the quote, and an escaped operator character
     * shouldn't be read as a real operator.
     * @param {string} str - Input string.
     * @returns {string} Same length string with quoted contents masked.
     */
    maskQuotes(str) {
        let masked = "";
        let inSingle = false;
        let inDouble = false;

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];

            if (!inSingle && ch === "\\" && i + 1 < str.length) {
                const next = str[i + 1];
                if (!inDouble || "$`\"\\\n".includes(next)) {
                    masked += "xx";
                    i++;
                    continue;
                }
            }

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
     * single quotes (literal, no escapes at all), double quotes (mostly
     * literal, but "\" still escapes $ ` " \ and newline), bash-style
     * $'...' ANSI-C quoting (which expands backslash escapes like \n),
     * and backslash-escaping outside quotes (escapes any next character,
     * e.g. `a\ b` is one token "a b", `a\;b` is one token "a;b"). This
     * mirrors bash's actual escaping rules rather than treating "\" as an
     * ordinary character - without it, something like `echo "a\";b"`
     * would see the `\"` as closing the quote early instead of as an
     * escaped literal `"`, corrupting both this token and (via
     * splitTopLevel, which uses the same rules) how the line gets split
     * on `;`/`|` in the first place.
     * Whitespace outside quotes separates tokens.
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

            // Backslash escaping (bash rules): outside quotes, "\" escapes
            // ANY next character. Inside double quotes, it only escapes
            // $ ` " \ and newline - anything else is left as a literal
            // backslash and falls through to the plain double-quote
            // handling below. Single quotes (handled above) never escape.
            if (ch === "\\" && i + 1 < command.length) {
                const next = command[i + 1];
                if (!inDouble || "$`\"\\\n".includes(next)) {
                    current += next;
                    hasToken = true;
                    i++;
                    continue;
                }
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
     *
     * Skips expansion entirely inside single-quoted regions - matching
     * real bash, where single quotes suppress ALL expansion, so
     * `echo '$HOME'` must print the literal text `$HOME` rather than the
     * actual value (which is exactly what double quotes, or no quotes at
     * all, DO allow: `echo "$HOME"` and `echo $HOME` both still expand).
     * A backslash-escaped `$` (outside single quotes) is also left alone,
     * matching bash's `\$` escape.
     * @param {string} input
     * @returns {string}
     */
    expandVariables(input) {
        let result = "";
        let inSingle = false;
        let inDouble = false;

        for (let i = 0; i < input.length; i++) {
            const ch = input[i];

            if (!inSingle && ch === "\\" && i + 1 < input.length) {
                const next = input[i + 1];
                if (!inDouble || "$`\"\\\n".includes(next)) {
                    result += ch + next;
                    i++;
                    continue;
                }
            }

            if (ch === "'" && !inDouble) {
                inSingle = !inSingle;
                result += ch;
                continue;
            }
            if (ch === '"' && !inSingle) {
                inDouble = !inDouble;
                result += ch;
                continue;
            }

            if (inSingle) {
                // No expansion at all inside single quotes - copy through as-is
                result += ch;
                continue;
            }

            if (ch === "$" && input[i + 1] === "?") {
                result += String(this.lastExitCode ?? 0);
                i++; // skip the "?"
                continue;
            }
            if (ch === "$") {
                const nameMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(input.slice(i + 1));
                if (nameMatch) {
                    result += this.env[nameMatch[0]] ?? "";
                    i += nameMatch[0].length; // the leading "$" itself is consumed by the loop's own i++
                    continue;
                }
            }

            result += ch;
        }

        return result;
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
