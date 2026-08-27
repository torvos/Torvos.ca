/**
 * Keyboard/pointer input handling for TerminalEngine: binds all DOM event
 * listeners (focus management, key handling for normal input/pager/editor
 * shortcuts, paste handling), plus the Enter-key command dispatch, command
 * history navigation, and Tab autocompletion.
 */
Object.assign(TerminalEngine.prototype, {

    /**
     * Sets up all event listeners used by the terminal: viewport resize
     * handling (for mobile keyboards), click-to-focus behavior, the main
     * keydown handler for the hidden input field (which drives typing,
     * history, pager, and readline-style shortcuts), and paste handling.
     * Called once from the constructor.
     */
    bindEvents() {

        // Keeps a CSS variable in sync with the visual viewport height so
        // layout can react correctly when mobile on-screen keyboards appear.
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

        // Recompute how many lines fit on screen (for the pager) on window resize
        window.addEventListener("resize", () => {
            this.pager.pageSize = this.getPageSize();
        });

        // Clicking anywhere in the page should refocus whichever input
        // surface is currently active (the hidden text input for normal
        // shell use, or the editor textarea when the full-screen editor is
        // open). A single document-level listener covers clicks inside
        // #output too, since it bubbles up from there - no separate
        // listener needed on #output itself.
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
        
        // On mobile, when the on-screen keyboard opens/closes the visual
        // viewport resizes; keep the page scrolled to the bottom so input stays visible.
        if (window.visualViewport) {
            visualViewport.addEventListener("resize", () => {
                window.scrollTo(0, document.body.scrollHeight);
            });
        }

        // Keydown handler used while the full-screen editor is active
        // (wired up separately in editor.js when the editor opens).
        this.editorKeyHandler = (event) => {

            // Ctrl+S: save the file being edited
            if (event.ctrlKey && event.key.toLowerCase() === "s") {
                event.preventDefault();
                this.saveEditor();
                return;
            }

            // Ctrl+X: save and exit the editor
            if (event.ctrlKey && event.key.toLowerCase() === "x") {
                event.preventDefault();
                this.closeEditor(true);
                return;
            }

            // Escape: exit the editor without saving
            if (event.key === "Escape") {
                event.preventDefault();
                this.closeEditor(false);
                return;
            }

            // Any other keystroke is considered a content modification
            this.editor.modified = true;
        };

        // Main keydown handler for normal shell input (also handles pager keys)
        this.hiddenInput.addEventListener("keydown", (e) => {

            // While the pager ("--More--") is showing, only space/enter (advance)
            // and 'q' (quit paging) are meaningful; swallow everything else.
            if (this.pager.active) {
                e.preventDefault();

                if (e.key === " " || e.key === "Enter") {
                    this.output.lastChild.remove(); // remove the "--More--" line
                    this.pager.active = false;
                    this.pager.linesPrinted = 0;
                    this.pager.resolver();
                }

                if (e.key === "q") {
                    this.output.lastChild.remove();
                    this.pager.active = false;
                    this.pager.linesPrinted = 0;
                    this.pager.resolver(false); // signal "quit early" to the pager consumer
                }
                return;
            }

            // While an IME/predictive-text composition is in progress (common
            // on Android keyboards, and required for CJK input methods), let
            // it finish uninterrupted. The composed result will show up via
            // the "input" listener below rather than being built here from
            // individual keydown events, which mobile keyboards often don't
            // fire in a usable form (e.key === "Unidentified", etc.).
            if (e.isComposing || e.keyCode === 229) {
                return;
            }

            // Readline-style Ctrl+<key> shortcuts (Ctrl+C, Ctrl+L, Ctrl+A, etc.)
            if (e.ctrlKey && !e.metaKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case "c": // Ctrl+C: cancel the current input line
                        e.preventDefault();
                        this.cancelCommand();
                        this.syncHiddenInput();
                        this.renderInput();
                        return;

                    case "l": // Ctrl+L: clear the screen
                        e.preventDefault();
                        this.clearScreen();
                        this.renderInput();
                        return;

                    case "v": // Ctrl+V: let the browser's native paste event handle it
                        return;

                    case "a": // Ctrl+A: move cursor to start of line
                        e.preventDefault();
                        this.cursorPos = 0;
                        this.syncHiddenInput();
                        this.renderInput();
                        return;

                    case "e": // Ctrl+E: move cursor to end of line
                        e.preventDefault();
                        this.cursorPos = this.currentInput.length;
                        this.syncHiddenInput();
                        this.renderInput();
                        return;

                    case "u": // Ctrl+U: delete from cursor to start of line
                        e.preventDefault();
                        this.currentInput = this.currentInput.slice(this.cursorPos);
                        this.cursorPos = 0;
                        this.syncHiddenInput();
                        this.renderInput();
                        return;

                    case "k": // Ctrl+K: delete from cursor to end of line
                        e.preventDefault();
                        this.currentInput = this.currentInput.slice(0, this.cursorPos);
                        this.syncHiddenInput();
                        this.renderInput();
                        return;

                    case "w": { // Ctrl+W: delete the word immediately before the cursor
                        e.preventDefault();
                        const before = this.currentInput.slice(0, this.cursorPos);
                        const after = this.currentInput.slice(this.cursorPos);
                        // Strip trailing whitespace, then strip the trailing "word"
                        const trimmedBefore = before.replace(/\s+$/, "").replace(/\S+$/, "");
                        this.currentInput = trimmedBefore + after;
                        this.cursorPos = trimmedBefore.length;
                        this.syncHiddenInput();
                        this.renderInput();
                        return;
                    }

                    default:
                        // Swallow any other Ctrl-combo so it doesn't get typed literally
                        e.preventDefault();
                        return;
                }
            }

            switch (e.key) {

                case "Enter":
                    this.handleEnter();
                    break;

                case "Backspace":
                    e.preventDefault();
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
                    // While waiting for a password, ignore printable keys entirely
                    // (password input isn't echoed/stored by this handler).
                    if (this.inputMode === INPUT_WAIT_FOR_PASSWORD){break;}

                    // Any single printable character (no modifier keys) gets
                    // inserted into currentInput at the cursor position.
                    // Recognized here means a normal physical-keyboard keydown
                    // reported a real, single-character e.key; anything else
                    // (predictive text, swipe-typing, autocorrect, IME
                    // composition - common on mobile keyboards, where e.key is
                    // often "Unidentified" or the event doesn't fire per
                    // character) is left for the "input" listener below to
                    // pick up from the native input value instead.
                    if (e.key.length === 1 &&
                        !e.metaKey &&
                        !e.altKey &&
                        !e.ctrlKey) {
                            e.preventDefault();
                            this.currentInput =
                                this.currentInput.slice(0, this.cursorPos) +
                                e.key +
                                this.currentInput.slice(this.cursorPos);
                            this.cursorPos++;
                        }
                    break;
            }
            // Keep the native hidden input's value/caret aligned with
            // whatever we just did above (including Arrow-key cursor moves,
            // which the browser also moves natively but we treat our own
            // tracking as the source of truth for consistency).
            this.syncHiddenInput();
            this.renderInput();
        });

        // Handles pasting text into the shell: strips newlines (collapsing
        // multi-line paste into a single line, like a real terminal would
        // otherwise try to "run" each line) and inserts it at the cursor.
        this.hiddenInput.addEventListener("paste", (e) => {
            if (this.inputMode !== INPUT_NORMAL || this.pager.active) {
                return;
            }
            e.preventDefault();
            const text = (e.clipboardData || window.clipboardData).getData("text");
            if (!text) {
                return;
            }
            const clean = text.replace(/\r\n?/g, "\n").replace(/\n/g, " ");
            this.currentInput =
                this.currentInput.slice(0, this.cursorPos) +
                clean +
                this.currentInput.slice(this.cursorPos);
            this.cursorPos += clean.length;
            this.syncHiddenInput();
            this.renderInput();
        });

        // Fallback for content a mobile keyboard commits without a usable
        // keydown (autocorrect replacements, swipe-typing whole words, IME
        // composition results). The native input's value/caret is the
        // source of truth here since keydown's e.key can't be trusted for
        // these cases - by the time this fires, our preventDefault() calls
        // above mean it only runs for edits WE didn't already apply.
        this.hiddenInput.addEventListener("input", () => {
            if (this.inputMode === INPUT_WAIT_FOR_PASSWORD ||
                this.inputMode === INPUT_EDITOR ||
                this.pager.active) {
                return;
            }
            this.currentInput = this.hiddenInput.value;
            this.cursorPos = this.hiddenInput.selectionStart ?? this.currentInput.length;
            this.renderInput();
        });

        // On-screen Tab/Esc buttons (touch devices only - see terminal.css).
        // mousedown is prevented so tapping the button doesn't blur/steal
        // focus away from whichever input surface is currently active.
        const mobileTabBtn = document.getElementById("mobile-tab-btn");
        if (mobileTabBtn) {
            mobileTabBtn.addEventListener("mousedown", (e) => e.preventDefault());
            mobileTabBtn.addEventListener("click", () => {
                if (this.inputMode !== INPUT_NORMAL) return;
                this.autocomplete();
                this.syncHiddenInput();
                this.renderInput();
                this.hiddenInput.focus();
            });
        }

        const mobileEscBtn = document.getElementById("mobile-esc-btn");
        if (mobileEscBtn) {
            mobileEscBtn.addEventListener("mousedown", (e) => e.preventDefault());
            mobileEscBtn.addEventListener("click", () => {
                this.closeEditor(false);
            });
        }
    },

    // Keeps the (invisible) native #hidden-input element's value and caret
    // position in sync with our own currentInput/cursorPos tracking.
    // Needed whenever we edit currentInput ourselves rather than letting the
    // browser apply its own native edit: setting .value alone resets the
    // native caret to the end of the string, so without this, the next
    // native edit a mobile keyboard makes (autocorrect, swipe-typing, IME)
    // would start from the wrong position - and the "input" event fallback
    // listener needs an accurate baseline to read from.
    syncHiddenInput() {
        this.hiddenInput.value = this.currentInput;
        this.hiddenInput.setSelectionRange(this.cursorPos, this.cursorPos);
    },

    /**
     * Handles the Enter key across all input modes: executing a shell
     * command in normal mode, or advancing the username/password login
     * prompt flow. Also persists settings and re-focuses input afterward.
     */
    async handleEnter() {
        const input = this.currentInput.trim();

        switch (this.inputMode) {
            case INPUT_NORMAL:
                if (!input){
                    // Empty line: just print a fresh prompt, nothing to run
                    this.write(`${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$`);
                    document.getElementById("scroll-anchor").scrollIntoView({block: "end"});
                    return;
                }
                if (input === "reset"){
                    // Special-cased hard reset: wipe saved state and reload the page
                    localStorage.removeItem("terminalSettings");
                    localStorage.removeItem("FileSystem");
                    location.reload();
                    return;
                } 
                // Record the command in history (capped to MAX_HISTORY entries)
                this.history.push(input);
                const MAX_HISTORY = 1000;
                if (this.history.length > MAX_HISTORY) {
                    this.history.shift();
                }
                this.historyIndex = this.history.length;
                this.write(`${DEFAULT_USER}@${HOSTNAME}:${this.cwd}$ ${input}`);
    
                // Hide the live input line while the command runs, then restore it
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
                // Username entered (value itself isn't checked); move on to password prompt
                this.currentInput = "";
                this.renderInput();
                this.inputMode = INPUT_WAIT_FOR_PASSWORD;
                this.promptEl.textContent = "password:";
                break;
            case INPUT_WAIT_FOR_PASSWORD:
                // This demo login flow always fails after a password attempt
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

    // Handles Ctrl+C: prints "^C" and discards the current input line.
    cancelCommand() {
        this.write("^C");
        this.currentInput = "";
        this.renderInput();
    },

    // Moves backward (older) through command history, like pressing Up in a real shell.
    historyUp() {
        if (this.history.length === 0) return;
        if (this.historyIndex > 0) {
            this.historyIndex--;
        }
        this.currentInput = this.history[this.historyIndex] || "";
        this.cursorPos = this.currentInput.length;
        this.syncHiddenInput();
        this.renderInput();
    },

    // Moves forward (newer) through command history; past the newest entry clears the line.
    historyDown() {
        if (this.history.length === 0) return;
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.currentInput = this.history[this.historyIndex];
        } else {
            this.currentInput = "";
        }
        this.cursorPos = this.currentInput.length;
        this.syncHiddenInput();
        this.renderInput();
    },

    /**
     * Handles Tab-key autocompletion for the word at the cursor - not
     * necessarily the last word on the line, so completing an earlier
     * argument doesn't disturb anything typed after it. That word spans
     * from the nearest whitespace before the cursor to the nearest
     * whitespace after it (so completing mid-word replaces the whole
     * word, not just the part before the cursor).
     *
     * If the word is the very first one on the line and doesn't already
     * look like a path (no "/"), it's completed against known command
     * names; otherwise it's completed as a filesystem path relative to
     * cwd. Only autocompletes when there is exactly one unambiguous
     * match - otherwise nothing changes, including the cursor position.
     */
    autocomplete() {
        if (!this.currentInput.trim()) return;

        const input = this.currentInput;
        const before = input.slice(0, this.cursorPos);
        const after = input.slice(this.cursorPos);

        const wordStart = before.search(/\S*$/);
        const wordEnd = this.cursorPos + after.match(/^\S*/)[0].length;

        const partial = before.slice(wordStart);      // text to match, up to the cursor
        const linePrefix = input.slice(0, wordStart);  // everything before this word
        const lineSuffix = input.slice(wordEnd);       // everything after this word

        // Nothing but whitespace before this word -> it's the first word
        // on the line (a command name), unless it already looks like a path.
        const isFirstWord = linePrefix.trim() === "";

        let completion;
        if (isFirstWord && !partial.includes(ROOT)) {
            const commands = Object.keys(window.Commands);
            completion = commands.find(c => c.startsWith(partial));
        } else {
            const matches = this.findPathMatches(partial);
            completion = matches.length === 1 ? matches[0] : undefined;
        }

        if (!completion) {
            // No match, or more than one - leave the input and cursor
            // exactly as they were rather than guessing.
            return;
        }

        this.currentInput = linePrefix + completion + lineSuffix;
        this.cursorPos = (linePrefix + completion).length;
        this.syncHiddenInput();
        this.renderInput();
    },

    /**
     * Finds filesystem entries under the appropriate directory whose name
     * starts with the given partial path's final segment, used for path
     * autocompletion. Handles both absolute-ish partials containing "/"
     * and bare names relative to the current working directory.
     * @param {string} partial - The partial path typed by the user so far.
     * @returns {string[]} Matching completions, each with a trailing "/"
     *   if the match is itself a directory.
     */
    findPathMatches(partial) {

        let directory;
        let prefix;

        if (partial.includes(ROOT)) {
            // Split off everything after the last "/" as the prefix to match,
            // and resolve the directory portion before it.
            const split = partial.split(ROOT);
            prefix = split.pop();

            directory = split.join(ROOT);

            if (directory === "") {
                directory = ROOT;
            } else {
                directory = this.fs.getFullPath(directory, this.cwd);
            }

        } else {
            // No "/" in the partial - match against entries in the current directory
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

                // Preserve the directory portion of the original partial as a prefix
                // on each completion result.
                const base = partial.includes(ROOT)
                    ? partial.substring(0, partial.lastIndexOf(ROOT) + 1)
                    : "";

                return base + name + (this.fs.isDirectory(child) ? ROOT : "");
            });
    }

});
