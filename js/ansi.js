window.ANSI = {

    /* =========================================================
       COLOR MAP
    ========================================================= */

    colors: {

        black:   "#111111",
        red:     "#ff5f56",
        green:   "#27c93f",
        yellow:  "#ffbd2e",
        blue:    "#4aa3ff",
        magenta: "#ff4fd8",
        cyan:    "#00d8ff",
        white:   "#e6e6e6",
        gray:    "#888888"

    },

    /* =========================================================
       MAIN RENDER FUNCTION
       Supports: [red]text[/red] OR [red]text[/]
    ========================================================= */

    render(text) {

        if (!text) return "";

        let output = this.escapeHtml(text);

        // Convert [color]...[/] or [/color]
        Object.keys(this.colors).forEach(color => {

            const regexOpen = new RegExp(`\\[${color}\\]`, "g");
            const regexClose = new RegExp(`\\[\\/${color}\\]|\\[\\/\\]`, "g");

            output = output
                .replace(regexOpen, `<span style="color:${this.colors[color]}">`)
                .replace(regexClose, `</span>`);

        });

        return output;

    },

    /* =========================================================
       STRIP ANSI / TAGS (useful for logic / width calc)
    ========================================================= */

    strip(text) {

        return text
            .replace(/\[[a-zA-Z]+\]/g, "")
            .replace(/\[\/[a-zA-Z]*\]/g, "")
            .replace(/<\/?span[^>]*>/g, "");

    },

    /* =========================================================
       ESCAPE HTML
    ========================================================= */

    escapeHtml(text) {

        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    },

    /* =========================================================
       PRESET HELPERS (used by commands)
    ========================================================= */

    success(msg) {
        return `[green]${msg}[/]`;
    },

    error(msg) {
        return `[red]${msg}[/]`;
    },

    warning(msg) {
        return `[yellow]${msg}[/]`;
    },

    info(msg) {
        return `[cyan]${msg}[/]`;
    },

    dir(name) {
        return `[blue]${name}/[/]`;
    },

    file(name) {
        return `[white]${name}[/]`;
    }

};