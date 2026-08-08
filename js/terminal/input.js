Object.assign(TerminalEngine.prototype, {

    bindEvents() {

        function updateVisualViewportHeight() {
            if (window.visualViewport) {
                const layoutHeight = window.visualViewport.height;
                document.documentElement.style.setProperty('--visual-vh', `${layoutHeight}px`);
            }
        }

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateVisualViewportHeight);
            window.visualViewport.addEventListener('scroll', updateVisualViewportHeight);
        }

        window.addEventListener('DOMContentLoaded', updateVisualViewportHeight);

        window.addEventListener("resize", () => {
            this.pager.pageSize = this.getPageSize();
        });

        output.addEventListener("click", () => {
            if (this.inputMode === INPUT_NORMAL) {            
                this.hiddenInput.focus();
            }
            else if (this.inputMode === INPUT_EDITOR) {
                this.editorEl.focus();
            }
        });

        document.addEventListener("click", () => {
            if (this.inputMode === INPUT_NORMAL) {            
                this.hiddenInput.focus();
            }
            else if (this.inputMode === INPUT_EDITOR) {
                this.editorEl.focus();
            }
        });

        document.addEventListener("pointerdown", () => {
            if (this.inputMode === INPUT_NORMAL) {            
                this.hiddenInput.focus();
            }
            else if (this.inputMode === INPUT_EDITOR) {
                this.editorEl.focus();
            }
        });
        
        if (window.visualViewport) {
            visualViewport.addEventListener("resize", () => {
                window.scrollTo(0, document.body.scrollHeight);
            });
        }

        this.editorKeyHandler = (event) => {

            if (event.ctrlKey && event.key.toLowerCase() === "s") {
                event.preventDefault();
                this.saveEditor();
                return;
            }

            if (event.ctrlKey && event.key.toLowerCase() === "x") {
                event.preventDefault();
                this.closeEditor(true);
                return;
            }

            if (event.key === "Escape") {
                event.preventDefault();
                this.closeEditor(false);
                return;
            }

            this.editor.modified = true;
        };

        this.hiddenInput.addEventListener("keydown", (e) => {

            if (this.pager.active) {
                e.preventDefault();

                if (e.key === " " || e.key === "Enter") {
                    this.output.lastChild.remove();
                    this.pager.active = false;
                    this.pager.linesPrinted = 0;
                    this.pager.resolver();
                }

                if (e.key === "q") {
                    this.output.lastChild.remove();
                    this.pager.active = false;
                    this.pager.linesPrinted = 0;
                    this.pager.resolver(false);
                }
                return;
            }

            if (e.ctrlKey && e.key === "c") {
                e.preventDefault();
                this.cancelCommand();
                this.renderInput();
                return;
            }

            if (e.ctrlKey && e.key === "l") {
                e.preventDefault();
                this.clearScreen();
                this.renderInput();
                return;
            }

            switch (e.key) {

                case "Enter":
                    this.handleEnter();
                    break;

                case "Backspace":
                    if (this.cursorPos === 0) break;
                    this.currentInput =
                        this.currentInput.slice(0, this.cursorPos - 1) +
                        this.currentInput.slice(this.cursorPos);
                    this.cursorPos--;
                    document.getElementById("hidden-input").value = this.currentInput;
                    break;                    

                case "ArrowUp":
                    this.historyUp();
                    break;

                case "ArrowDown":
                    this.historyDown();
                    break;

                case "ArrowLeft":
                    this.cursorPos = Math.max(0, this.cursorPos - 1);
                    break;

                case "ArrowRight":
                    this.cursorPos = Math.min(this.currentInput.length, this.cursorPos + 1);
                    break;

                case "Tab":
                    e.preventDefault();
                    this.autocomplete();
                    break;

                default:
                    if (this.inputMode === INPUT_WAIT_FOR_PASSWORD){break;}
                    if (e.key.length === 1 &&
                        !e.metaKey &&
                        !e.altKey) {
                            this.currentInput =
                                this.currentInput.slice(0, this.cursorPos) +
                                e.key +
                                this.currentInput.slice(this.cursorPos);
                            this.cursorPos++;
                        }
                    break;
            }
            this.renderInput();
        });
    },

    async handleEnter() {
        const input = this.currentInput.trim();

        switch (this.inputMode) {
            case INPUT_NORMAL:
                if (!input){
                    this.write(`${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$`);
                    document.getElementById("scroll-anchor").scrollIntoView({block: "end"});
                    return;
                }
                if (input === "reset"){
                    localStorage.removeItem("terminalSettings");
                    localStorage.removeItem("FileSystem");
                    location.reload();
                    return;
                } 
                this.history.push(input);
                const MAX_HISTORY = 1000;
                if (this.history.length > MAX_HISTORY) {
                    this.history.shift();
                }
                this.historyIndex = this.history.length;
                this.write(`${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$ ${input}`);
    
                document.getElementById("input-line").classList.add("hidden");
                try {
                    await this.execute(input);
                } finally {
                    document.getElementById("input-line").classList.remove("hidden");
                }
                this.hiddenInput.focus();
                this.currentInput = "";
                this.renderInput();
                break;
            case INPUT_WAIT_FOR_USERNAME:
                this.currentInput = "";
                this.renderInput();
                this.inputMode = INPUT_WAIT_FOR_PASSWORD;
                this.promptEl.textContent = "password:";
                break;
            case INPUT_WAIT_FOR_PASSWORD:
                this.write("Login incorrect")
                this.currentInput = "";
                this.renderInput();
                this.inputMode = INPUT_NORMAL;
                this.renderPrompt();
                break;
        }
        document.getElementById("hidden-input").value = "";
        this.cursorPos = 0;
        this.saveSettings();
        this.scrollToBottom();
    },

    cancelCommand() {
        this.write("^C");
        this.currentInput = "";
        this.renderInput();
    },

    historyUp() {
        if (this.history.length === 0) return;
        if (this.historyIndex > 0) {
            this.historyIndex--;
        }
        this.currentInput = this.history[this.historyIndex] || "";
        document.getElementById("hidden-input").value = this.currentInput;
        this.cursorPos = this.currentInput.length;
        this.renderInput();
    },

    historyDown() {
        if (this.history.length === 0) return;
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentInput = this.history[this.historyIndex];
        } else {
            this.currentInput = "";
            this.cursorPos = 0;
            this.renderInput();
        }
        document.getElementById("hidden-input").value = this.currentInput;
        this.renderInput();
    },

    autocomplete() {
        if (!this.currentInput.trim()) return;

        const isAtEndOfWord = !this.currentInput.endsWith(" ");
        const parts = this.currentInput.trimStart().split(/\s+/);
        if (parts.length === 1) {
            const partial = parts[0];

            if (partial.includes(ROOT)) {
                const matches = this.findPathMatches(partial);

                if (matches.length === 1) {
                    this.currentInput = matches[0];
                    this.cursorPos = this.currentInput.length;
                    this.renderInput();
                }

                return;
            }

            const commands = Object.keys(window.Commands);
            const match = commands.find(c => c.startsWith(partial));

            if (match) {
                this.currentInput = match;
                this.cursorPos = this.currentInput.length;
                this.renderInput();
            }

            return;
        }

        const partial = parts.pop();
        const matches = this.findPathMatches(partial);

        if (matches.length === 1) {
            parts.push(matches[0]);
            this.currentInput = parts.join(" ");
            this.renderInput();
        }
        this.cursorPos = this.currentInput.length;
    },

    findPathMatches(partial) {

        let directory;
        let prefix;

        if (partial.includes(ROOT)) {

            const split = partial.split(ROOT);
            prefix = split.pop();

            directory = split.join(ROOT);

            if (directory === "") {
                directory = ROOT;
            } else {
                directory = this.fs.getFullPath(directory, this.cwd);
            }

        } else {
            directory = this.cwd;
            prefix = partial;
        }

        const node = this.fs.getNode(directory);

        if (!node || !this.fs.isDirectory(node)) {
            return [];
        }

        return Object.keys(node.children)
            .filter(name => name.startsWith(prefix))
            .map(name => {
                const child = node.children[name];

                const base = partial.includes(ROOT)
                    ? partial.substring(0, partial.lastIndexOf(ROOT) + 1)
                    : "";

                return base + name + (this.fs.isDirectory(child) ? ROOT : "");
            });
    }

});
