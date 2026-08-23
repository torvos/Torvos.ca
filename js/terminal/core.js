/**
 * TerminalEngine
 * ---------------
 * The central class that owns all terminal state (DOM references, command
 * history, current working directory, environment variables, aliases,
 * the pager, and the full-screen editor) and coordinates boot-up,
 * persistence, and shared helper utilities used by other terminal/*.js
 * files (input.js, execute.js, parser.js, render.js, editor.js, bootstrap.js).
 */
class TerminalEngine {

    constructor() {
        // Cache references to the DOM elements the terminal renders into/reads from.
        this.output = document.getElementById("output");
        this.promptEl = document.getElementById("prompt");
        this.commandEl = document.getElementById("command");
        this.cursorEl = document.getElementById("cursor");
        this.hiddenInput = document.getElementById("hidden-input"); // captures real keyboard input
        this.editorContainer = document.getElementById("editor-container");
        this.editorEl = document.getElementById("editor");

        // Current shell input line and command history state
        this.currentInput = "";
        this.history = [];
        this.historyIndex = -1;
        this.cursorPos = 0;

        // Tracks whether the boot sequence has already played (persisted across
        // reloads so returning users don't see the boot animation every time).
        this.hasbooted = 0;

        this.cwd = HOME;                 // current working directory
        this.lastExpansionEmpty = false; // set by parser when a glob/expansion matched nothing
        this.lastExitCode = 0;           // exit status of the last executed command
        this.sessionStart = Date.now();  // when this page/tab session began (used by `neofetch`'s Uptime)

        // Wire up keyboard/DOM event listeners (defined in js/terminal/input.js)
        this.bindEvents();

        this.version = TERMINAL_VERSION;

        // Tracks, per seed file path (resume.md, contact.md, etc.), the
        // last seedVersion reconciled for this profile - see
        // reconcileSeed() in filesystem.js. Populated from saved settings
        // (or left empty for a fresh profile) in init().
        this.seedSync = {};

        // State for the `more`/`less`-style pager used by commands with long output
        this.pager = {
            active: false,
            linesPrinted: 0,
            pageSize: 0,
            resolver: null // Promise resolver used to pause execution until the user pages through
        };

        // State for the full-screen text editor (see js/terminal/editor.js)
        this.editor = {
            active: false,
            node: null,
            path: "",
            content: "",
            cursor: 0,
            modified: false
        };

        // Default environment variables, mirroring a typical Unix shell
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

        // Built-in default aliases; user-defined ones merge in on top during init()
        this.aliases = {
            "ll": "ls -la",
            "cd..": "cd .."
        };

        // Reference to the virtual filesystem API (see js/filesystem.js)
        this.fs = FileSystemAPI;
    }

    /**
     * Boots the terminal: restores any saved session/filesystem from
     * localStorage, plays (or skips) the boot animation, prints the
     * welcome banner, optionally auto-runs a command from the URL query
     * string, and finally renders the prompt so the user can start typing.
     */
    async init() {
        this.inputMode = INPUT_NORMAL;

        // Attempt to restore previous session settings (history, cwd, env, aliases)
        const savedSettings = localStorage.getItem("terminalSettings");
        let settingsWereCorrupted = false;
        if (savedSettings) {
            let settings = null;
            try {
                settings = JSON.parse(savedSettings);
            } catch (err) {
                // Corrupted/invalid JSON (e.g. manual edit, partial write) —
                // wipe it out and fall back to defaults rather than throwing
                // and leaving the terminal unable to boot at all.
                localStorage.removeItem("terminalSettings");
                localStorage.removeItem("FileSystem");
                settingsWereCorrupted = true;
            }

            if (settings) {
                // Note: there's no version check/wipe here anymore. A
                // saved session from an older TERMINAL_VERSION is merged
                // on top of today's defaults the same way any saved
                // session is (see the `??`/spread fallbacks below), and
                // any seed CONTENT that changed between versions is
                // reconciled file-by-file below via reconcileSeed() -
                // there's nothing left that a full wipe was uniquely
                // necessary for.
                this.history = settings.history ?? [];
                this.historyIndex = settings.historyIndex ?? -1;
                this.cursorPos = settings.cursorPos ?? 0;
                this.hasbooted = settings.hasbooted ?? 0;
                this.cwd = settings.cwd ?? HOME;
                this.seedSync = settings.seedSync ?? {};

                // Merge saved env/aliases on top of the defaults so new default
                // keys introduced in later versions still show up.
                this.env = {
                    ...this.env,
                    ...(settings.env ?? {})
                };

                this.aliases = {
                    ...this.aliases,
                    ...(settings.aliases ?? {})
                };
            }
        }

        // Attempt to restore the saved virtual filesystem
        const savedFileSystem = localStorage.getItem("FileSystem");
        let filesystemWasCorrupted = false;
        if (savedFileSystem) {
            const restored = FileSystemAPI.restore(savedFileSystem);
            if (!restored) {
                // Restore failed (e.g. corrupted/invalid JSON) — fall back to defaults
                localStorage.removeItem("FileSystem");
                filesystemWasCorrupted = true;
            }
        }

        // Bring the starter seed files (resume.md, contact.md, etc.) up to
        // date with whatever this version of the code ships, without
        // touching anything else in the user's filesystem - see
        // reconcileSeed()'s own docs in filesystem.js for the exact rules
        // (missing/outdated files are (re)written from the current seed
        // content whenever their seedVersion moves forward, even if the
        // user had edited or deleted them; everything else is untouched).
        const { seedSync, changes: seedChanges } = FileSystemAPI.reconcileSeed(this.seedSync);
        this.seedSync = seedSync;

        const params = new URLSearchParams(window.location.search);
        await this.write(`Torvos v${this.version}`, {color: "#c707ce"});
        if (settingsWereCorrupted) {
            await this.write(`[WARN] Saved session settings were corrupted, restored defaults..[FAIL]`, {color: "#ff5555"});
        }
        if (filesystemWasCorrupted) {
            await this.write(`[WARN] Saved filesystem was corrupted, restored defaults..[FAIL]`, {color: "#ff5555"});
        }
        for (const change of seedChanges) {
            const verb = change.action === "added" ? "added" : "updated";
            await this.write(`[INFO] ${change.path} was ${verb} by the developer.......[ OK ]`, {color: "#ffffff"});
        }

        // `?quickboot` query param lets you skip straight to a "resumed session" state
        if (params.has("quickboot")){
            this.hasbooted = 1;
        }

        if (this.hasbooted === 1){
            // Returning session: skip the animated boot sequence
            await this.write(`[INFO] Resuming previous session.................[ OK ]`, {color: "#ffffff"});
        } else if (this.hasbooted === 0) {
            // First-ever boot: play the animated "typing" boot sequence
            await this.typeItOut(`Initializing kernel................ [ OK ]`);
            await this.typeItOut(`Mounting virtual filesystem........ [ OK ]`);
            await this.typeItOut(`Starting network stack............. [ OK ]`);
            await this.typeItOut(`Loading user profile............... [ OK ]`);
            await this.typeItOut(`Establishing secure session........ [ OK ]`);
            this.hasbooted = 1;
        }

        // Print the ASCII-art welcome banner
        await this.write(`+------------------------------------------------------+`, {color: "#ffffff"});
        await this.write(`| ████████╗ ██████╗ ██████╗ ██╗   ██╗ ██████╗ ███████╗ |`, {color: "#ffffff"});
        await this.write(`| ╚══██╔══╝██╔═══██╗██╔══██╗██║   ██║██╔═══██╗██╔════╝ |`, {color: "#ffffff"});
        await this.write(`|    ██║   ██║   ██║██████╔╝██║   ██║██║   ██║███████╗ |`, {color: "#ffffff"});
        await this.write(`|    ██║   ██║   ██║██╔══██╗╚██╗ ██╔╝██║   ██║╚════██║ |`, {color: "#ffffff"});
        await this.write(`|    ██║   ╚██████╔╝██║  ██║ ╚████╔╝ ╚██████╔╝███████║ |`, {color: "#ffffff"});
        await this.write(`|    ╚═╝    ╚═════╝ ╚═╝  ╚═╝  ╚═══╝   ╚═════╝ ╚══════╝ |`, {color: "#ffffff"});
        await this.write(`|            Welcome type 'help' to begin.             |`, {color: "#ffffff"});
        await this.write(`+------------------------------------------------------+`, {color: "#ffffff"});

        // `?run=<command>` lets a URL auto-type and auto-execute a command on load
        if (params.has("run")) {
            const command = params.get("run");
            this.currentInput = command;
            this.promptEl.textContent = `${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$ ${command}`;   
            this.cursorPos = command.length;
            this.renderInput();   
            this.hiddenInput.focus();
            this.handleEnter();
        }

        // Compute how many output lines fit on screen, used by the pager
        const style = getComputedStyle(document.documentElement);
        const lineHeight = parseFloat(style.lineHeight) || parseFloat(getComputedStyle(document.body).lineHeight);
        this.pager.pageSize = Math.floor(document.getElementById("terminal").clientHeight / lineHeight) - 1;
        
        // Seed the virtual filesystem with standard /bin and /dev entries
        createVirtualBin();
        createVirtualDev();

        this.renderPrompt();     
        this.renderInput();   
        this.saveSettings();
        this.hiddenInput.focus();
    }

    /**
     * Persists terminal session state (history, cwd, env, aliases, etc.)
     * and the virtual filesystem to localStorage so they survive page reloads.
     */
    saveSettings(){
        const terminalSettings = {
            history: this.history,
            historyIndex: this.historyIndex,
            cursorPos: this.cursorPos,
            hasbooted: this.hasbooted,
            version: this.version,
            cwd: this.cwd,
            env: this.env,
            aliases: this.aliases,
            seedSync: this.seedSync
        };

        // localStorage.setItem can throw (quota exceeded, private-browsing
        // mode, storage disabled, etc.) — catch it so a save failure just
        // means "this session isn't persisted", not "the terminal breaks".
        try {
            localStorage.setItem("terminalSettings", JSON.stringify(terminalSettings));
            localStorage.setItem("FileSystem", FileSystemAPI.serialize());
        } catch (err) {
            console.error("Torvos: failed to save session to localStorage", err);
            if (!this._storageWriteWarned) {
                this._storageWriteWarned = true;
                this.write(
                    `[WARN] Unable to save session (storage full or unavailable) - your changes won't persist across reloads.`,
                    {color: "#ff5555"}
                );
            }
        }
    }

    /**
     * Parses a command's argument array into long/short flags, options with
     * values, and remaining positional arguments — similar to a lightweight
     * getopt. Supports:
     *   - `--` to stop flag parsing and treat the rest as positional args
     *   - `--name=value` and `--name value` long options
     *   - `-x` short boolean flags, including clustered flags like `-la`
     *   - `-xVALUE` / `-x VALUE` short options that take a value
     *
     * @param {string[]} args - Raw argument tokens (command name excluded).
     * @param {Object} [flagSpec] - Map of flag/option name -> true if it expects
     *   a value (e.g. `{n: true}` for `-n <num>`), or omitted/false for a
     *   plain boolean flag.
     * @returns {{flags: Set<string>, options: Object, args: string[]}}
     *   flags: boolean flags that were present (without leading dashes)
     *   options: flag name -> string value, for flags that take a value
     *   args: remaining non-flag positional arguments
     */
    parseFlags(args, flagSpec = {}) {
        const flags = new Set();
        const options = {};
        const remaining = [];
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];

            // `--` ends flag parsing; everything after is positional
            if (arg === "--") {
                remaining.push(...args.slice(i + 1));
                break;
            }

            if (arg.startsWith("--")) {
                // Long option, e.g. --color or --color=auto
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
                        // Expects a value from the next argument
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

            // Not a flag at all (bare "-" or doesn't start with "-") -> positional arg
            if (arg === "-" || !arg.startsWith("-")) {
                remaining.push(arg);
                continue;
            }

            // Short flag or cluster of short flags, e.g. -l, -la, -n5
            const wholeFlag = arg.substring(1);

            if (flagSpec.hasOwnProperty(wholeFlag)) {
                // The whole thing after "-" matches a single known flag/option name
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

            // Otherwise treat it as a cluster of single-character flags (e.g. -la = -l -a)
            const cluster = wholeFlag;
            for (let j = 0; j < cluster.length; j++) {
                const flag = cluster[j];
                if (flagSpec[flag] === true) {
                    if (j < cluster.length - 1) {
                        // Remainder of the cluster is treated as this flag's inline value,
                        // e.g. -n5 -> flag "n" with value "5"
                        options[flag] = cluster.substring(j + 1);
                        break;
                    }
                    // Value-taking flag was the last char in the cluster -> take next arg
                    if (i + 1 >= args.length) {
                        throw new Error(`Missing value for -${flag}`);
                    }
                    options[flag] = args[++i];
                    break;
                } else {
                    flags.add(flag);
                }
            }
        }

        return {
            flags,
            options,
            args: remaining
        };
    }

    /**
     * Returns a Promise that resolves after the given delay.
     * Used to animate boot text / simulate latency for commands like ping.
     * @param {number} ms - Milliseconds to wait.
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Calculates how many text lines currently fit in the visible terminal
     * area, used by the pager to decide when to pause output ("--More--").
     * @returns {number} Number of lines that fit on screen (minus one for the prompt).
     */
    getPageSize() {
        const terminal = document.getElementById("terminal");
        const lineHeight = parseFloat(getComputedStyle(document.body).lineHeight);

        return Math.floor(terminal.clientHeight / lineHeight) - 1;
    }
}
