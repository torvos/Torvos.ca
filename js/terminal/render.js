/**
 * Rendering-related methods for TerminalEngine: writing lines to the
 * output pane, drawing the prompt/input line with a blinking cursor,
 * animated "typewriter" text, and the pager's "--More--" break.
 */
Object.assign(TerminalEngine.prototype, {

    // Scrolls the terminal output container to the bottom (used after
    // any new content is appended so the latest line stays in view).
    scrollToBottom() {
        const terminal = document.getElementById("terminal");
        terminal.scrollTop = terminal.scrollHeight;
    },

    // Redraws the shell prompt text (user@host:cwd$ ) based on current state.
    renderPrompt() {
        this.promptEl.textContent =
            `${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$ `;
    },

    // Redraws the current input line, splitting it into "before cursor" /
    // cursor block / "after cursor" spans so the cursor can be rendered
    // as a solid block at the correct position.
    renderInput() {
        const before = this.currentInput.slice(0, this.cursorPos);
        const after = this.currentInput.slice(this.cursorPos);

        const beforeSpan = document.createElement("span");
        beforeSpan.textContent = before;

        const cursorSpan = document.createElement("span");
        cursorSpan.id = "cursor";
        cursorSpan.textContent = "█";

        const afterSpan = document.createElement("span");
        afterSpan.textContent = after;

        this.commandEl.replaceChildren(beforeSpan, cursorSpan, afterSpan);
    },

    // Clears all terminal output (used by the `clear`/`reset` commands).
    clearScreen() {
        this.output.innerHTML = "";
    },

    /**
     * Appends a line of text to the terminal output.
     * If a segment's text contains a URL or email address, it is HTML-escaped
     * and those matches are turned into clickable <a> links; otherwise it's
     * inserted as plain text (safe from HTML injection either way).
     *
     * Supports two calling styles:
     *   - Whole-line color (legacy, still works exactly as before):
     *       terminal.write("disk not found", { color: "#ff6060" });
     *   - Multiple colors within a single line, by passing an array of
     *     { text, color } segments instead of a string. Segments with no
     *     color inherit the terminal's default text color:
     *       terminal.write([
     *           { text: "error: ", color: "#ff6060" },
     *           { text: "disk not found" }
     *       ]);
     *
     * @param {string|Array<{text: string, color?: string}>} text - The line
     *   to print, or an array of colored segments making up the line.
     * @param {Object} [options] - Optional rendering options.
     * @param {string} [options.color] - CSS color for the whole line, used
     *   only when `text` is a plain string.
     */
    write(text, options = {}) {
        const div = document.createElement("div");

        // Escapes special HTML characters so user/file content can't inject markup
        const escapeHtml = (str) => str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        // Detect http(s) URLs and email addresses so they can be linkified.
        // This runs AFTER escapeHtml (see linkify below), so by this point
        // any literal "<", ">", '"', "'" in the original text have already
        // become "&lt;", "&gt;", "&quot;", "&#39;" sequences. Excluding
        // those specific sequences (but still allowing a bare "&amp;" -
        // i.e. a literal "&", which is extremely common in real URLs, e.g.
        // query-string separators like "?a=1&b=2") stops the URL match
        // right at that boundary, so a URL sitting hard up against such a
        // character with no whitespace in between (e.g. "http://x.com<b>")
        // doesn't have the escaped entity swallowed into its href.
        const pattern1 = /\b(https?:\/\/(?:[^\s&]|&(?!lt;|gt;|quot;|#39;))+)/gi;
        const pattern2 = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

        // Escapes a chunk of text and turns any URLs/emails within it into
        // clickable links. The escape happens first, so this is safe to
        // drop into innerHTML even if the source text contains "<"/">"/etc.
        const linkify = (str) => escapeHtml(str)
            .replace(
                pattern1,
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            )
            .replace(
                pattern2,
                '<a href="mailto:$&">$&</a>'
            );

        // Normalize the input into a list of segments so both calling
        // styles above are handled identically below.
        const segments = Array.isArray(text)
            ? text
            : [{ text: text ?? "", color: options.color }];

        let wroteContent = false;
        for (const segment of segments) {
            const segmentText = segment?.text ?? "";
            if (!segmentText) continue;
            wroteContent = true;

            const span = document.createElement("span");
            span.innerHTML = linkify(segmentText);
            // Set via the style property (not string-interpolated CSS) so a
            // segment's color can never break out of the element's markup.
            if (segment.color) {
                span.style.color = segment.color;
            }
            div.appendChild(span);
        }

        if (!wroteContent) {
            // No segments had any text: a non-breaking space keeps empty
            // lines from collapsing to zero height.
            div.innerText = "\u00A0";
        }

        this.output.appendChild(div);
        this.scrollToBottom();
    },

    /**
     * Splits a shell error line such as "cat: no such file: foo" (or
     * "command not found: ls-a") into a red "label: " prefix and the rest
     * of the message in the terminal's default text color, ready to hand
     * to write(). Falls back to coloring the whole line red if there's no
     * "label: " to split off.
     * @param {string} line - A raw stderr line (typically "cmd: message").
     * @returns {Array<{text: string, color?: string}>} Segments for write().
     */
    formatErrorLine(line) {
        const match = line.match(/^([^:]*:\s*)([\s\S]*)$/);
        if (!match) {
            return [{ text: line, color: "#ff6060" }];
        }
        const [, prefix, rest] = match;
        return [
            { text: prefix, color: "#ff6060" },
            { text: rest }
        ];
    },

    /**
     * Prints a line using an animated "typewriter" effect (one character
     * at a time). Used during the boot sequence for dramatic effect.
     * Accepts the same two calling styles as write(): a plain string with
     * an optional whole-line options.color, or an array of colored
     * { text, color } segments (typed out left to right, in order).
     * @param {string|Array<{text: string, color?: string}>} text - The line
     *   to type out, or an array of colored segments making up the line.
     * @param {Object} [options] - Optional rendering options (e.g. color).
     */
    async typeItOut(text, options = {}) {
        const div = document.createElement("div");
        this.output.appendChild(div);

        const segments = Array.isArray(text)
            ? text
            : [{ text: text ?? "", color: options.color }];

        for (const segment of segments) {
            const span = document.createElement("span");
            if (segment.color) {
                span.style.color = segment.color;
            }
            div.appendChild(span);
            await this.typeWrite(span, segment?.text ?? "");
        }

        this.scrollToBottom();
    },

    /**
     * Reveals `text` inside `div` one character at a time with a delay
     * between each character, awaiting completion before returning.
     * @param {HTMLElement} div - Target element to type text into.
     * @param {string} text - Text to reveal.
     * @param {number} [delay=15] - Milliseconds to wait between characters.
     */
    async typeWrite(div, text, delay = 15) {
        const safeText = text ?? "";
        for (let i = 0; i < safeText.length; i++) {
            div.textContent += safeText[i];
            await this.sleep(delay);
        }
    },

    /**
     * Pauses long command output with a "--More--" prompt (like the Unix
     * `more` pager) and returns a Promise that resolves once the user
     * presses a key to continue (handled in input.js).
     */
    async pageBreak() {
        this.pager.active = true;

        this.write("--More--");

        return new Promise(resolve => {
            this.pager.resolver = resolve;
        });
    }

});
