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

    init() {

        this.renderPrompt();

        this.printLine(`Welcome to ${this.config.hostname}. Type 'help'.`);

        this.hiddenInput.focus();

    }

    bindEvents() {

        document.addEventListener("click", () => {
            this.hiddenInput.focus();
        });

    this.hiddenInput.addEventListener("keydown", (e) => {

        // -------------------------
        // CONTROL SHORTCUTS
        // -------------------------

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

        // -------------------------
        // SPECIAL KEYS
        // -------------------------

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

                // ONLY printable characters go here
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

        if (!input) return;

        this.history.push(input);
        this.historyIndex = this.history.length;

        this.printLine(
            `${this.config.username}@${this.config.hostname}:${this.cwd}$ ${input}`
        );

        this.execute(input);

        this.currentInput = "";

        this.renderInput();

    }

    execute(input) {

        const parts = input.split(" ");
        const cmd = parts[0];
        const args = parts.slice(1);

        if (window.Commands && window.Commands[cmd]) {

            const result = window.Commands[cmd](this, args);

            if (result) this.printLine(result);

        } else {

            this.printLine(`command not found: ${cmd}`);

        }

    }

    printLine(text) {

        const div = document.createElement("div");

        div.textContent = text;

        this.output.appendChild(div);

        this.scrollBottom();

    }

    clearScreen() {

        this.output.innerHTML = "";

    }

    cancelCommand() {

        this.printLine("^C");

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

    scrollBottom() {

        window.scrollTo(0, document.body.scrollHeight);

    }

}