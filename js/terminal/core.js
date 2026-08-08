// TerminalEngine is defined here and extended by the other files in
// js/terminal/*.js, each of which adds a related group of methods via
// Object.assign(TerminalEngine.prototype, {...}). Load this file first.
class TerminalEngine {

    constructor() {
        this.output = document.getElementById("output");
        this.promptEl = document.getElementById("prompt");
        this.commandEl = document.getElementById("command");
        this.cursorEl = document.getElementById("cursor");
        this.hiddenInput = document.getElementById("hidden-input");
        this.editorContainer = document.getElementById("editor-container");
        this.editorEl = document.getElementById("editor");

        this.currentInput = "";
        this.history = [];
        this.historyIndex = -1;
        this.cursorPos = 0;
        this.hasbooted = 0;
        this.cwd = HOME;
        this.lastExpansionEmpty = false;
        this.lastExitCode = 0;
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
            EDITOR: "edit",
            SCRIPTDEBUG: "false"
        };

        this.aliases = {
            "ll": "ls -la",
            "cd..": "cd .."
        };

        this.fs = FileSystemAPI;
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
                return;
            }            
            this.history = settings.history ?? [];
            this.historyIndex = settings.historyIndex ?? -1;
            this.cursorPos = settings.cursorPos ?? 0;
            this.hasbooted = settings.hasbooted ?? 0;
            this.cwd = settings.cwd ?? HOME;

            this.env = {
                ...this.env,
                ...(settings.env ?? {})
            };

            this.aliases = {
                ...this.aliases,
                ...(settings.aliases ?? {})
            };            
        }
        const savedFileSystem = localStorage.getItem("FileSystem");
        let filesystemWasCorrupted = false;
        if (savedFileSystem) {
            const restored = FileSystemAPI.restore(savedFileSystem);
            if (!restored) {
                localStorage.removeItem("FileSystem");
                filesystemWasCorrupted = true;
            }
        }

        const params = new URLSearchParams(window.location.search);
        await this.write(`Torvos v${this.version}`, {color: "#c707ce"});
        if (filesystemWasCorrupted) {
            await this.write(`[WARN] Saved filesystem was corrupted, restored defaults..[FAIL]`, {color: "#ff5555"});
        }
        if (params.has("quickboot")){
            this.hasbooted = 1;
        }
        if (this.hasbooted === 1){
            await this.write(`[INFO] Resuming previous session.................[ OK ]`, {color: "#ffffff"});
        } else if (this.hasbooted === 0) {
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
        createVirtualDev();
        this.renderPrompt();     
        this.renderInput();   
        this.saveSettings();
        this.hiddenInput.focus();
    }

    saveSettings(){
        const terminalSettings = {
            history: this.history,
            historyIndex: this.historyIndex,
            cursorPos: this.cursorPos,
            hasbooted: this.hasbooted,
            version: this.version,
            cwd: this.cwd,
            env: this.env,
            aliases: this.aliases
        };

        localStorage.setItem("terminalSettings", JSON.stringify(terminalSettings));
        localStorage.setItem("FileSystem", FileSystemAPI.serialize());
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

    getPageSize() {
        const terminal = document.getElementById("terminal");
        const lineHeight = parseFloat(getComputedStyle(document.body).lineHeight);

        return Math.floor(terminal.clientHeight / lineHeight) - 1;
    }
}
