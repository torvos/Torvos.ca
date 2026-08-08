Object.assign(TerminalEngine.prototype, {

    scrollToBottom() {
        const terminal = document.getElementById("terminal");
        terminal.scrollTop = terminal.scrollHeight;
    },

    renderPrompt() {
        this.promptEl.textContent =
            `${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$ `;
    },

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

    clearScreen() {
        this.output.innerHTML = "";
    },

    write(text, options = {}) {
        const div = document.createElement("div");
        const raw = text ?? "";

        const escapeHtml = (str) => str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

        const pattern1 = /\b(https?:\/\/[^\s<]+)/gi;
        const pattern2 = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

        if (pattern1.test(raw) || pattern2.test(raw)){
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
            div.innerText = raw || "\u00A0";
        }
        
        if (options.color) {
            div.style.color = options.color;
        }
        this.output.appendChild(div);
        this.scrollToBottom();
    },

    async typeItOut(text, options = {}) {
        const div = document.createElement("div");
        this.output.appendChild(div);
        if (options.color) {
            div.style.color = options.color;
        }        
        await this.typeWrite(div, text);
        this.scrollToBottom();
    },

    async typeWrite(div, text, delay = 15) {
        const safeText = text ?? "";
        for (let i = 0; i < safeText.length; i++) {
            div.textContent += safeText[i];
            await this.sleep(delay);
        }
    },

    async pageBreak() {
        this.pager.active = true;

        this.write("--More--");

        return new Promise(resolve => {
            this.pager.resolver = resolve;
        });
    }

});
