/**
 * Entry point for the Torvos terminal application.
 * Creates a single global TerminalEngine instance and boots it up.
 */
window.startTorvosTerminal = function () {
    // Instantiate the terminal engine (defined in js/terminal/core.js)
    const terminal = new TerminalEngine();

    // Expose the instance globally so other scripts/console debugging can reach it
    window.__TERMINAL__ = terminal;

    // Kick off initialization (sets up DOM, filesystem, input handling, etc.)
    terminal.init();
};

// Wait until the DOM is fully parsed before starting the terminal,
// since init() needs to attach to existing DOM elements.
document.addEventListener("DOMContentLoaded", () => {
    window.startTorvosTerminal();
});
