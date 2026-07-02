class TerminalEngine {

    constructor(config) {
        this.config = config;
        this.output = document.getElementById("output");
        this.promptEl = document.getElementById("prompt");
        this.commandEl = document.getElementById("command");
        this.cursorEl = document.getElementById("cursor");
        this.hiddenInput = document.getElementById("hidden-input");
        this.currentInput = "";
        this.history = [];
        this.historyIndex = -1;
        this.cursorPos = 0;
        this.cwd = "~";
        this.bindEvents();
    }

    async init() {
        this.inputMode = "normal";
        await this.typeItOut(`Torvos v2.6.0`, {color: "#c707ce"});
        await this.typeItOut(`Initializing kernel................ [ OK ]`);
        await this.typeItOut(`Mounting virtual filesystem........ [ OK ]`);
        await this.typeItOut(`Starting network stack............. [ OK ]`);
        await this.typeItOut(`Loading user profile............... [ OK ]`);
        await this.typeItOut(`Establishing secure session........ [ OK ]`);
        await this.typeItOut(`Welcome to Torvos.ca type 'help' to begin.`, {color: "#ffffff"});
        this.renderPrompt();     
        this.renderInput();   
        this.hiddenInput.focus();
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    bindEvents() {
        document.addEventListener("click", () => {
            this.hiddenInput.focus();
        });

        this.hiddenInput.addEventListener("keydown", (e) => {
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
                    if (this.inputMode === "waitingPassword"){break;}
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
    }

    renderPrompt() {
        this.promptEl.textContent =
            `${this.config.username}@${this.config.hostname}:${this.cwd}$`;
    }

    renderInput() {
        const before = this.currentInput.slice(0, this.cursorPos);
        const after = this.currentInput.slice(this.cursorPos);

        this.commandEl.innerHTML =
            `<span>${before}</span>` +
            `<span id="cursor">█</span>` +
            `<span>${after}</span>`;
    }

    async handleEnter() {
        const input = this.currentInput.trim();

        switch (this.inputMode) {
            case "normal":
                if (!input){
                    this.write(`${this.config.username}@${this.config.hostname}:${this.cwd}$`);
                    document.getElementById("scroll-anchor").scrollIntoView({block: "end"});
                    return;
                } 
                this.history.push(input);
                this.historyIndex = this.history.length;
                this.write(`${this.config.username}@${this.config.hostname}:${this.cwd}$${input}`);
                this.execute(input);
                this.currentInput = "";
                this.renderInput();
                break;
            case "waitingUsername":
                this.currentInput = "";
                this.renderInput();
                this.inputMode = "waitingPassword";
                this.promptEl.textContent = "password:";
                break;
            case "waitingPassword":
                this.write("Login incorrect")
                this.currentInput = "";
                this.renderInput();
                this.inputMode = "normal";
                this.renderPrompt();
                break;
        }
    }

    async execute(input) {

        // Add in support for expansion { }
        // Add in support for stdin <

        const commands = input.split("|");
        for (let i = 0; i < commands.length; i++) {
            const parts = commands[i].trim().split(" ");
            const cmd = parts[0];
            const args = parts.slice(1);
            if (window.Commands && window.Commands[cmd]) {
                const result = window.Commands[cmd](this, args);
                if (result){
                    const lines = result.split(/\r?\n/);
                    for (const line of lines) {
                        this.write(line);
                        await this.sleep(50);
                    } 
                } 
            } else if (cmd === "login"){
                this.inputMode = "waitingUsername";
                this.promptEl.textContent = "user:";
            } else {
                this.write(`command not found: ${cmd}`);
            }         
        }
    }

    clearScreen() {
        this.output.innerHTML = "";
    }

    cancelCommand() {
        this.write("^C");
        this.currentInput = "";
        this.renderInput();
    }

    historyUp() {
        if (this.history.length === 0) return;
        if (this.historyIndex > 0) {
            this.historyIndex--;
        }
        this.currentInput = this.history[this.historyIndex] || "";
        this.cursorPos = this.currentInput.length;
        this.renderInput();
    }

    historyDown() {
        if (this.history.length === 0) return;
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentInput = this.history[this.historyIndex];
        } else {
            this.currentInput = this.history[this.historyIndex] || "";
            this.cursorPos = this.currentInput.length;
            this.renderInput();
        }
        this.renderInput();
    }

    autocomplete() {
        if (!this.currentInput.trim()) return;

        const isAtEndOfWord = !this.currentInput.endsWith(" ");
        const parts = this.currentInput.trimStart().split(/\s+/);
        if (parts.length === 1) {
            const partial = parts[0];

            const commands = Object.keys(window.Commands);
            const match = commands.find(c => c.startsWith(partial));

            if (match) {
                this.currentInput = match;
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
    }

    getNode(path) {
        if (!path.startsWith("~"))
            path = this.cwd + "/" + path;

        const parts = path.split("/").filter(Boolean);
        let node = window.FileSystem["~"];

        parts.shift();
        for (const part of parts) {
            if (!node.children)
                return null;
            node = node.children[part];
            if (!node)
                return null;
        }
        return node;
    }

    findPathMatches(partial) {

        let directory;
        let prefix;

        if (partial.includes("/")) {

            const split = partial.split("/");
            prefix = split.pop();

            directory = split.join("/") || "~";

            if (!directory.startsWith("~")) {
                directory = this.cwd + "/" + directory;
            }

        } else {
            directory = this.cwd;
            prefix = partial;
        }

        const node = this.getNode(directory);

        if (!node || node.type !== "dir") {
            return [];
        }

        return Object.keys(node.children)
            .filter(name => name.startsWith(prefix))
            .map(name => {
                const child = node.children[name];

                const base = partial.includes("/")
                    ? partial.substring(0, partial.lastIndexOf("/") + 1)
                    : "";

                return base + name + (child.type === "dir" ? "/" : "");
            });
    }

    changeDirectory(path) {
        if (path === "~") {
            this.cwd = "~";
        } else if (path === "..") {
            this.cwd = "~";
        } else {
            this.cwd = `${this.cwd}/${path}`;
        }
        this.renderPrompt();
    }

    write(text, options = {}) {
        const div = document.createElement("div");
        let output = text ?? "";

        const pattern1 = /\b(https?:\/\/[^\s<]+)/gi;
        const pattern2 = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
 
        if (pattern1.test(output) || pattern2.test(output)){
            output = output
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
            div.innerText = output;
        }

        if (options.color) {
            div.style.color = options.color;
        }
        this.output.appendChild(div);
        document.getElementById("scroll-anchor").scrollIntoView({block: "end"});
    }

    async typeItOut(text, options = {}) {
        const div = document.createElement("div");
        this.output.appendChild(div);
        if (options.color) {
            div.style.color = options.color;
        }        
        await this.typeWrite(div, text);
        document.getElementById("scroll-anchor").scrollIntoView({block: "end"});
    }

    async typeWrite(div, text, delay = 15) {
        const safeText = text ?? "";
        for (let i = 0; i < safeText.length; i++) {
            div.textContent += safeText[i];
            await this.sleep(delay);
        }
    }

}