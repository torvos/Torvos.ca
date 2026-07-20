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
        this.hasbooted = 0;
        this.cwd = "/home/guest";
        this.bindEvents();
        this.version = "2.7.5";
        this.pager = {
            active: false,
            linesPrinted: 0,
            pageSize: 0,
            resolver: null
        };
        this.editor = {
            active: false,
            node: null,
            path: "",
            content: "",
            cursor: 0,
            modified: false
        };
        this.editorContainer = document.getElementById("editor-container");
        this.editorEl = document.getElementById("editor");
    }

    async init() {

        this.inputMode = "normal";

        const savedSettings = localStorage.getItem("terminalSettings");
        if (savedSettings) {        
            const settings = JSON.parse(savedSettings);
 
            if(settings.version != "2.7.5"){
                localStorage.removeItem("terminalSettings");
                localStorage.removeItem("FileSystem");
                this.cwd = "/home/guest";
                location.reload();
            }            

            this.history = settings.history ?? [];
            this.historyIndex = settings.historyIndex ?? "-1";
            this.cursorPos = settings.cursorPos ?? "0";
            this.hasbooted = settings.hasbooted ?? "0";
            this.cwd = settings.cwd ?? "/home/guest";
        }

        const savedFileSystem = localStorage.getItem("FileSystem");
        if (savedFileSystem) {
            window.FileSystem = JSON.parse(savedFileSystem);
        }

        const params = new URLSearchParams(window.location.search);
        
        await this.write(`Torvos v${this.version}`, {color: "#c707ce"});

        if (this.hasbooted === 1){
            await this.write(`[INFO] Resuming previous session.................[ OK ]`, {color: "#ffffff"});
        } else if (this.hasbooted === 0 || params.has("quickboot")) {
            await this.typeItOut(`Initializing kernel................ [ OK ]`);
            await this.typeItOut(`Mounting virtual filesystem........ [ OK ]`);
            await this.typeItOut(`Starting network stack............. [ OK ]`);
            await this.typeItOut(`Loading user profile............... [ OK ]`);
            await this.typeItOut(`Establishing secure session........ [ OK ]`);
            this.hasbooted = 1;
        }
        await this.write(`+------------------------------------------------------+`, {color: "#ffffff"});
        await this.write(`| ████████╗ ██████╗ ██████╗ ██╗   ██╗ ██████╗ ███████╗ |`, {color: "#ffffff"});
        await this.write(`| ╚══██╔══╝██╔═══██╗██╔══██╗██║   ██║██╔═══██╗██╔════╝ |`, {color: "#ffffff"});
        await this.write(`|    ██║   ██║   ██║██████╔╝██║   ██║██║   ██║███████╗ |`, {color: "#ffffff"});
        await this.write(`|    ██║   ██║   ██║██╔══██╗╚██╗ ██╔╝██║   ██║╚════██║ |`, {color: "#ffffff"});
        await this.write(`|    ██║   ╚██████╔╝██║  ██║ ╚████╔╝ ╚██████╔╝███████║ |`, {color: "#ffffff"});
        await this.write(`|    ╚═╝    ╚═════╝ ╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ╚══════╝ |`, {color: "#ffffff"});
        await this.write(`|            Welcome type 'help' to begin.             |`, {color: "#ffffff"});
        await this.write(`+------------------------------------------------------+`, {color: "#ffffff"});

        if (params.has("run")) {
            const command = params.get("run");
            this.currentInput = command;
            this.promptEl.textContent = `${this.config.username}@${this.config.hostname}:${this.cwd}$ ${command}`;   
            this.cursorPos = command.length;
            this.renderInput();   
            this.hiddenInput.focus();
            this.handleEnter();
        }

        const style = getComputedStyle(document.documentElement);
        const lineHeight = parseFloat(style.lineHeight) || parseFloat(getComputedStyle(document.body).lineHeight);
        this.pager.pageSize = Math.floor(document.getElementById("terminal").clientHeight / lineHeight) - 1;
        
        this.renderPrompt();     
        this.renderInput();   
        this.saveSettings();
        this.hiddenInput.focus();
    }

    saveSettings(){
        const history = this.history;
        const historyIndex = this.historyIndex;
        const cursorPos = this.cursorPos;
        const hasbooted = this.hasbooted;
        const version = this.version;
        const cwd = this.cwd;

        const terminalSettings = {
            history,
            historyIndex,
            cursorPos,
            hasbooted,
            version,
            cwd
        };

        localStorage.setItem("terminalSettings", JSON.stringify(terminalSettings));
        localStorage.setItem("FileSystem", JSON.stringify(window.FileSystem));
    }

    parseFlags(args, flagDefs = {}) {
        const flags = new Set();
        const options = {};
        const remaining = [];

        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            if (!arg.startsWith("-") || arg === "-") {
                remaining.push(arg);
                continue;
            }

            const chars = arg.slice(1);

            for (let j = 0; j < chars.length; j++) {
                const flag = chars[j];
                if (!(flag in flagDefs)) {
                    remaining.push("-" + chars.slice(j));
                    break;
                }
                flags.add(flag);
                if (flagDefs[flag]) {
                    if (j + 1 < chars.length) {
                        options[flag] = chars.slice(j + 1);
                    }
                    else if (i + 1 < args.length) {
                        options[flag] = args[++i];
                    }
                    break;
                }
            }
        }

        return {
            flags,
            options,
            args: remaining
        };
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    scrollToBottom() {
        const terminal = document.getElementById("terminal");
        terminal.scrollTop = terminal.scrollHeight;
    }

    getPageSize() {
        const terminal = document.getElementById("terminal");
        const lineHeight = parseFloat(getComputedStyle(document.body).lineHeight);

        return Math.floor(terminal.clientHeight / lineHeight) - 1;
    }

    bindEvents() {

        window.addEventListener("resize", () => {
            this.pager.pageSize = this.getPageSize();
        });

        document.addEventListener("click", () => {
            this.hiddenInput.focus();
        });
        
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
                if (input === "reset"){
                    localStorage.removeItem("terminalSettings");
                    localStorage.removeItem("FileSystem");
                    location.reload();
                    return;
                } 
                this.history.push(input);
                this.historyIndex = this.history.length;
                this.write(`${this.config.username}@${this.config.hostname}:${this.cwd}$${input}`);
    
                document.getElementById("input-line").classList.add("hidden");
                await this.execute(input);
                document.getElementById("input-line").classList.remove("hidden");

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
        document.getElementById("hidden-input").value = "";
        this.cursorPos = 0;
        this.saveSettings();
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
                const result = await window.Commands[cmd](this, args);
                if (typeof result === "string") {
                    const lines = result.split(/\r?\n/);
                    for (const line of lines) {
                        this.write(line, {color: "#ffffff"});
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
        document.getElementById("hidden-input").value = this.currentInput;
        this.cursorPos = this.currentInput.length;
        this.renderInput();
    }

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
        if (!path.startsWith("/"))
            path = resolveRelativePath(this.cwd, path);

        let node = window.FileSystem["/"];
        const parts = path.split("/").filter(Boolean);

        for (const part of parts) {
            if (!node.children || !node.children[part]) {
                return null;
            }
            node = node.children[part];
        }
        return node;
    }

    findPathMatches(partial) {

        let directory;
        let prefix;

        if (partial.includes("/")) {

            const split = partial.split("/");
            prefix = split.pop();

            directory = split.join("/");

            if (directory === "") {
                directory = "/";
            } else {
                directory = resolveRelativePath(this.cwd, directory);
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
        const resolved = resolveRelativePath(this.cwd, path);
        const node = this.getNode(resolved);
        if (!node) {
            return `cd: ${path}: No such file or directory`;
        }
        if (node.type !== "dir") {
            return `cd: ${path}: Not a directory`;
        }
        this.cwd = resolved;
        this.renderPrompt();
    }

    async pageBreak() {
        this.pager.active = true;

        this.write("--More--");

        return new Promise(resolve => {
            this.pager.resolver = resolve;
        });
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
            div.innerText = output || "\u00A0";
        }
        
        if (options.color) {
            div.style.color = options.color;
        }
        this.output.appendChild(div);
        this.scrollToBottom();
    }

    async typeItOut(text, options = {}) {
        const div = document.createElement("div");
        this.output.appendChild(div);
        if (options.color) {
            div.style.color = options.color;
        }        
        await this.typeWrite(div, text);
        this.scrollToBottom();
    }

    async typeWrite(div, text, delay = 15) {
        const safeText = text ?? "";
        for (let i = 0; i < safeText.length; i++) {
            div.textContent += safeText[i];
            await this.sleep(delay);
        }
    }

    openEditor(node, path) {
        this.editor.active = true;
        this.editor.node = node;
        this.editor.path = path;
        this.editor.modified = false;
        this.inputMode = "editor";
        document.getElementById("input-line").style.display = "none";
        document.getElementById("output").style.display = "none";
        this.editorEl.addEventListener("keydown", this.editorKeyHandler);
        this.editorContainer.style.display = "flex";
        this.editorEl.value = node.content ?? "";
        this.editorEl.focus();
        this.editorEl.setSelectionRange(
            this.editorEl.value.length,
            this.editorEl.value.length
        );
        document.getElementById("editor-header").innerHTML =`Editing: ${path} | Ctrl+S Save | Ctrl+X Save & Exit | Esc Exit`;
    }

    saveEditor() {
        if (!this.editor.active){
            return;
        }
        this.editor.node.content = this.editorEl.value;
        localStorage.setItem(
            "FileSystem",
            JSON.stringify(window.FileSystem)
        );
        this.editor.modified = false;
    }

    closeEditor(save = false) {
        if (!this.editor.active){
            return;
        }
        if (save){
            this.saveEditor();
        }
        this.editor.active = false;
        this.editor.node = null;
        this.editorContainer.style.display = "none";
        this.editorEl.removeEventListener("keydown",this.editorKeyHandler);
        document.getElementById("input-line").style.display = "";
        document.getElementById("output").style.display = "";
        this.inputMode = "normal";
        this.hiddenInput.focus();
        this.showPrompt();
    }    

}