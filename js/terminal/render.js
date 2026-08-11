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
     * If the text contains a URL or email address, it is HTML-escaped and
     * those matches are turned into clickable <a> links; otherwise it's
     * inserted as plain text (safe from HTML injection either way).
     * @param {string} text - The line to print.
     * @param {Object} [options] - Optional rendering options.
     * @param {string} [options.color] - CSS color to apply to the line.
     */
    write(text, options = {}) {
        const div = document.createElement("div");
        const raw = text ?? "";

        // Escapes special HTML characters so user/file content can't inject markup
        const escapeHtml = (str) => str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        // Detect http(s) URLs and email addresses so they can be linkified
        const pattern1 = /\b(https?:\/\/[^\s<]+)/gi;
        const pattern2 = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

        if (pattern1.test(raw) || pattern2.test(raw)){
            // Escape first, then wrap URLs/emails in anchor tags
            const output = escapeHtml(raw)
            .replace(
                /\b(https?:\/\/[^\s<]+)/gi,
                '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
            )
            .replace(
                /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
                '<a href="mailto:$&">$&</a>'
            );        
            div.innerHTML = output;
        } else {
            // No links present: use innerText for safety; a non-breaking space
            // keeps empty lines from collapsing to zero height.
            div.innerText = raw || "\u00A0";
        }
        
        if (options.color) {
            div.style.color = options.color;
        }
        this.output.appendChild(div);
        this.scrollToBottom();
    },

    /**
     * Prints a line using an animated "typewriter" effect (one character
     * at a time). Used during the boot sequence for dramatic effect.
     * @param {string} text - The line to type out.
     * @param {Object} [options] - Optional rendering options (e.g. color).
     */
    async typeItOut(text, options = {}) {
        const div = document.createElement("div");
        this.output.appendChild(div);
        if (options.color) {
            div.style.color = options.color;
        }        
        await this.typeWrite(div, text);
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
