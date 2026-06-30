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
        this.cwd = "~";
        this.bindEvents();
    }

    async init() {
        this.write(`Torvos v2.6.0`);
        await this.sleep(50);
        this.write(`Initializing kernel................ [ OK ]`);
        await this.sleep(50);
        this.write(`Mounting virtual filesystem........ [ OK ]`);
        await this.sleep(50);
        this.write(`Starting network stack............. [ OK ]`);
        await this.sleep(50);
        this.write(`Loading user profile............... [ OK ]`);
        await this.sleep(50);
        this.write(`Establishing secure session........ [ OK ]`);
        await this.sleep(50);
        this.write(`Welcome to Torvos.ca`);
        await this.sleep(50);
        this.write(`Type 'help' to begin.`);
        await this.sleep(50);
        this.renderPrompt();        
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
                    this.currentInput = this.currentInput.slice(0, -1);
                    break;

                case "ArrowUp":
                    this.historyUp();
                    break;

                case "ArrowDown":
                    this.historyDown();
                    break;

                case "Tab":
                    e.preventDefault();
                    this.autocomplete();
                    break;

                default:

                if (
                        e.key.length === 1 &&
                        !e.metaKey &&
                        !e.altKey
                    ) {
                        this.currentInput += e.key;
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
        this.commandEl.textContent = this.currentInput;
    }

    handleEnter() {
        const input = this.currentInput.trim();
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
    }

    async execute(input) {

        const parts = input.split(" ");
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
        } else {
            this.write(`command not found: ${cmd}`);
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
        this.renderInput();
    }

    historyDown() {
        if (this.history.length === 0) return;
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentInput = this.history[this.historyIndex];
        } else {
            this.historyIndex = this.history.length;
            this.currentInput = "";
        }
        this.renderInput();
    }

    autocomplete() {
        if (!window.Commands) return;
        const keys = Object.keys(window.Commands);
        const match = keys.find(k =>
            k.startsWith(this.currentInput)
        );
        if (match) {
            this.currentInput = match;
            this.renderInput();
        }
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
        div.innerHTML = output;
        this.output.appendChild(div);
        document.getElementById("scroll-anchor").scrollIntoView({block: "end"});
    }

    
}