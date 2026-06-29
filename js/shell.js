class Shell {

    constructor(terminal) {

        this.terminal = terminal;

        this.isBusy = false;

        this.username = window.TorvosConfig.username;
        this.hostname = window.TorvosConfig.hostname;

    }

    /* =========================================================
       EXECUTE COMMAND
    ========================================================= */

    async execute(input) {

        if (!input || this.isBusy) return;

        const trimmed = input.trim();

        if (!trimmed) return;

        const parts = trimmed.split(" ");

        const cmd = parts[0];
        const args = parts.slice(1);

        const handler = window.Commands?.[cmd];

        if (!handler) {

            this.terminal.printLine(
                window.ANSI.error(`command not found: ${cmd}`)
            );

            return;

        }

        try {

            this.isBusy = true;

            const result = handler(this.terminal, args, this);

            // Handle async commands (typing, delays, etc.)
            if (result instanceof Promise) {

                const output = await result;

                if (output !== undefined && output !== "") {

                    this.render(output);

                }

            } else {

                if (result !== undefined && result !== "") {

                    this.render(result);

                }

            }

        } catch (err) {

            this.terminal.printLine(
                window.ANSI.error(`error: ${err.message}`)
            );

        } finally {

            this.isBusy = false;

        }

    }

    /* =========================================================
       RENDER OUTPUT (ANSI SAFE)
    ========================================================= */

    render(output) {

        if (typeof output === "string") {

            this.terminal.printLine(
                window.ANSI.render(output)
            );

        } else {

            this.terminal.printLine(output);

        }

    }

    /* =========================================================
       PROMPT BUILDER
    ========================================================= */

    getPrompt() {

        const cwd = this.terminal.cwd || "~";

        return `${this.username}@${this.hostname}:${cwd}$`;

    }

    /* =========================================================
       UPDATE PROMPT UI
    ========================================================= */

    updatePrompt() {

        if (this.terminal.promptEl) {

            this.terminal.promptEl.textContent = this.getPrompt();

        }

    }

    /* =========================================================
       CHANGE DIRECTORY HELPERS
    ========================================================= */

    setCwd(newPath) {

        this.terminal.cwd = newPath;

        this.updatePrompt();

    }

    getCwd() {

        return this.terminal.cwd;

    }

    /* =========================================================
       SYSTEM HOOKS (future expansion)
    ========================================================= */

    async delay(ms) {

        return new Promise(r => setTimeout(r, ms));

    }

}