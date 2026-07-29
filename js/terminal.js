class TerminalEngine {
    
    constructor() {
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
        this.cwd = HOME;
        this.bindEvents();
        this.version = TERMINAL_VERSION;

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
        this.env = {
            HOME: "/home/guest",
            USER: "guest",
            HOSTNAME: "torvos",
            PWD: "/home/guest",
            OLDPWD: "/home/guest",
            SHELL: "/bin/bash",
            PATH: "/bin:/usr/bin",
            EDITOR: "edit"
        };
        this.aliases = {
            "ll": "ls -la",
            "cd..": "cd .."
        };        
        this.editorContainer = document.getElementById("editor-container");
        this.editorEl = document.getElementById("editor");
    }

    async init() {
        this.inputMode = INPUT_NORMAL;
        const savedSettings = localStorage.getItem("terminalSettings");
        if (savedSettings) {        
            const settings = JSON.parse(savedSettings);
            if(settings.version != TERMINAL_VERSION){
                localStorage.removeItem("terminalSettings");
                localStorage.removeItem("FileSystem");
                this.cwd = HOME;
                location.reload();
            }            
            this.history = settings.history ?? [];
            this.historyIndex = settings.historyIndex ?? "-1";
            this.cursorPos = settings.cursorPos ?? "0";
            this.hasbooted = settings.hasbooted ?? "0";
            this.cwd = settings.cwd ?? HOME;
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
            this.promptEl.textContent = `${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$ ${command}`;   
            this.cursorPos = command.length;
            this.renderInput();   
            this.hiddenInput.focus();
            this.handleEnter();
        }

        const style = getComputedStyle(document.documentElement);
        const lineHeight = parseFloat(style.lineHeight) || parseFloat(getComputedStyle(document.body).lineHeight);
        this.pager.pageSize = Math.floor(document.getElementById("terminal").clientHeight / lineHeight) - 1;
        
        createVirtualBin();
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

    parseFlags(args, flagSpec = {}) {
        const flags = new Set();
        const options = {};
        const remaining = [];
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            if (arg === "--") {
                remaining.push(...args.slice(i + 1));
                break;
            }
            if (arg.startsWith("--")) {
                const eq = arg.indexOf("=");
                if (eq !== -1) {
                    const name = arg.substring(2, eq);
                    const value = arg.substring(eq + 1);
                    if (flagSpec[name] === true) {
                        options[name] = value;
                    } else {
                        flags.add(name);
                    }
                } else {
                    const name = arg.substring(2);
                    if (flagSpec[name] === true) {
                        if (i + 1 >= args.length) {
                            throw new Error(`Missing value for --${name}`);
                        }
                        options[name] = args[++i];
                    } else {
                        flags.add(name);
                    }
                }
                continue;
            }

            const wholeFlag = arg.substring(1);

            if (flagSpec.hasOwnProperty(wholeFlag)) {
                if (flagSpec[wholeFlag] === true) {
                    if (i + 1 >= args.length) {
                        throw new Error(`Missing value for -${wholeFlag}`);
                    }
                    options[wholeFlag] = args[++i];
                } else {
                    flags.add(wholeFlag);
                }
                continue;
            }

            if (arg.startsWith("-") && arg.length > 1) {
                const cluster = arg.substring(1);
                for (let j = 0; j < cluster.length; j++) {
                    const flag = cluster[j];
                    if (flagSpec[flag] === true) {
                        if (j < cluster.length - 1) {
                            options[flag] = cluster.substring(j + 1);
                            break;
                        }
                        if (i + 1 >= args.length) {
                            throw new Error(`Missing value for -${flag}`);
                        }
                        options[flag] = args[++i];
                        break;
                    } else {
                        flags.add(flag);
                    }
                }
                continue;
            }
            remaining.push(arg);
        }

        return {
            flags,
            options,
            args: remaining
        };

    };

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
            this.hiddenInput.focus();
        });

        document.addEventListener("click", () => {
            this.hiddenInput.focus();
        });

        document.addEventListener("pointerdown", () => {
            this.hiddenInput.focus();
        });

        window.addEventListener("focus", () => {
            this.hiddenInput.focus();
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
    }

    renderPrompt() {
        this.promptEl.textContent =
            `${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$`;
    }

    renderInput() {
        const before = this.currentInput.slice(0, this.cursorPos);
        const after = this.currentInput.slice(this.cursorPos);

        this.commandEl.innerHTML =
            `<span>${before}</span>` +
            `<span id="cursor">█</span>` +
            `<span>${after}</span>`;
    }

    expandBraces(input) {
        const match = input.match(/\{([^{}]+)\}/);
        if (!match) {
            return [input];
        }
        const values = match[1].split(",");
        const results = [];
        for (const value of values) {
            const expanded = input.replace(
                match[0],
                value.trim()
            );
            results.push(
                ...this.expandBraces(expanded)
            );
        }
        return results;
    }

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
                this.historyIndex = this.history.length;
                this.write(`${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$${input}`);
    
                document.getElementById("input-line").classList.add("hidden");
                await this.execute(input);
                document.getElementById("input-line").classList.remove("hidden");
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
    }

    parseCommand(command) {
        const redirectRegex = /\s*(2>>|2>|>>|>|<)\s*([^\s]+)\s*$/;
        const match = command.match(redirectRegex);
        let redirects = {};
        if (match) {
            redirects = {
                operator: match[1],
                target: match[2]
            };
            command = command.slice(0, match.index).trim();
        }
        const parts = command.match(/"[^"]*"|'[^']*'|\S+/g) || [];

        return {
            cmd: parts[0],
            args: parts.slice(1).map(a =>
                a.replace(/^["']|["']$/g, "")
            ),
            redirects
        };
    }    

    writeRedirect(path, text, append = false) {
        const resolved = resolveRelativePath(this.cwd, path);
        let node = resolvePath(resolved);
        if(resolved.includes("/bin/")){
            return `Cannot create files in /bin`;
        }             
        if (!node) {
            const parts = resolved
                .split(ROOT)
                .filter(Boolean);
            const filename = parts.pop();
            const parentPath = ROOT + parts.join(ROOT);
            const parent = resolvePath(parentPath);
            if (!parent.node || parent.node.type !== "dir") {
                return `Invalid parent directory`;
            }
            parent.node.children[filename] = {
                type: "file",
                hidden: false,
                mode: "rw-r--r--",
                owner: "guest",
                group: "guest",
                created: Date.now(),
                modified: Date.now(),
                accessed: Date.now(),
                content: ""
            };
            node = parent.node.children[filename];
        }
        if (node.type !== "file") {
            return `Invalid directory specified in redirection operator`;
        }

        node.content = append
            ? ((node.content ?? "") 
                ? node.content + "\n" + (text ?? "")
                : (text ?? ""))
            : (text ?? "");

        node.modified = Date.now();
        node.accessed = Date.now();


        this.saveSettings();

        return true;
    }

    expandVariables(input) {
        return input.replace(
            /\$([A-Za-z_][A-Za-z0-9_]*)/g,
            (_, name) => this.env[name] ?? ""
        );
    }

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

    async execute(input) {
        input = this.expandAlias(input);
        input = this.expandVariables(input);
        const expandedCommands = this.expandBraces(input);
        for (const expandedInput of expandedCommands) {
            const commandGroups = expandedInput
                .split(";")
                .map(cmd => cmd.trim())
                .filter(Boolean);

            for (const group of commandGroups) {
                const pipeline = group
                    .split("|")
                    .map(cmd => cmd.trim())
                    .filter(Boolean);

                let stdin = "";

                for (let index = 0; index < pipeline.length; index++) {

                    const parsed = this.parseCommand(pipeline[index]);
                    const cmd = parsed.cmd;
                    const args = parsed.args;
                    const redirects = parsed.redirects;
                    if (redirects.operator === "<") {
                        const node = resolvePath(
                            resolveRelativePath(
                                this.cwd,
                                redirects.target
                            )
                        );
                        if (!node || node.type !== "file") {
                            stdin = "";
                            if (index === pipeline.length - 1) {
                                this.write(
                                    `${redirects.target}: No such file`,
                                    {
                                        color:"#ff6060"
                                    }
                                );
                            }
                            break;
                        }
                        stdin = node.content ?? "";
                    }

                    let result;
                    
                    if (window.Commands && window.Commands[cmd]) {
                        result = await window.Commands[cmd](
                            this,
                            args,
                            stdin
                        );
                    }
                    else if (cmd === "login") {
                        this.inputMode = INPUT_WAIT_FOR_USERNAME;
                        this.promptEl.textContent = "user:";
                        return;
                    }
                    else {
                        result = {
                            stdout:"",
                            stderr:`command not found: ${cmd}`,
                            exitCode:127
                        };
                    }

                    if (typeof result === "string") {
                        result = {
                            stdout: result,
                            stderr:"",
                            exitCode:0
                        };
                    }

                    result.stdout ??= "";
                    result.stderr ??= "";
                    result.exitCode ??= 0;
                    let redirectreturn = "";

                    switch (redirects.operator) {
                        case ">":
                            redirectreturn = this.writeRedirect(
                                redirects.target,
                                result.stdout,
                                false
                            );
                            if (typeof redirectreturn === 'string'){
                                result.stderr = redirectreturn;
                                result.exitCode = 1;
                            }
                            break;
                        case ">>":
                            redirectreturn = this.writeRedirect(
                                redirects.target,
                                result.stdout,
                                true
                            );
                            if (typeof redirectreturn === 'string'){
                                result.stderr = redirectreturn;
                                result.exitCode = 1;
                            }
                            break;
                        case "2>":
                            redirectreturn = this.writeRedirect(
                                redirects.target,
                                result.stderr,
                                false
                            );
                            if (typeof redirectreturn === 'string'){
                                result.stderr = redirectreturn;
                                result.exitCode = 1;
                            }
                            break;
                        case "2>>":
                            redirectreturn = this.writeRedirect(
                                redirects.target,
                                result.stderr,
                                true
                            );
                            if (typeof redirectreturn === 'string'){
                                result.stderr = redirectreturn;
                                result.exitCode = 1;
                            }
                            break;
                    }

                    if (result.exitCode !== 0) {
                        if (result.stderr) {
                            const lines = result.stderr.split(/\r?\n/);
                            for (const line of lines) {
                                this.write(
                                    line,
                                    {
                                        color:"#ff6060"
                                    }
                                );
                                await this.sleep(50);
                            }
                        }
                        break;
                    }

                    stdin = result.stdout;

                    if (index === pipeline.length - 1) {
                        if (result.stdout) {
                            const lines =
                                result.stdout.split(/\r?\n/);
                            for (const line of lines) {
                                this.write(
                                    line,
                                    {
                                        color:"#ffffff"
                                    }
                                );
                                await this.sleep(50);
                            }
                        }
                    }
                }
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
    }

    getNode(path) {
        if (!path.startsWith(ROOT))
            path = resolveRelativePath(this.cwd, path);

        let node = window.FileSystem[ROOT];
        const parts = path.split(ROOT).filter(Boolean);

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

        if (partial.includes(ROOT)) {

            const split = partial.split(ROOT);
            prefix = split.pop();

            directory = split.join(ROOT);

            if (directory === "") {
                directory = ROOT;
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

                const base = partial.includes(ROOT)
                    ? partial.substring(0, partial.lastIndexOf(ROOT) + 1)
                    : "";

                return base + name + (child.type === "dir" ? ROOT : "");
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
        this.editor.node.modified = Date.now();
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

window.createVirtualBin = function() {
    const bin = {
        type: "dir",
        hidden: false,
        mode: "rwxr-xr-x",
        owner: "root",
        group: "root",
        created: Date.parse("2020-01-01T08:00:00Z"),
        modified: Date.parse("2026-07-01T10:00:00Z"),
        accessed: Date.parse("2026-07-01T10:00:00Z"),
        children: {}
    };
    for (const command of Object.keys(Commands).sort()) {
        bin.children[command] = {
            type: "file",
            hidden: false,
            mode: "rwxr-xr-x",
            owner: "root",
            group: "root",
            created: Date.parse("2020-01-01T08:00:00Z"),
            modified: Date.parse("2026-07-01T10:00:00Z"),
            accessed: Date.parse("2026-07-01T10:00:00Z"),
            content: ""
        };
    }
    window.FileSystem[ROOT].children["bin"] = bin;
};
