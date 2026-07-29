window.startTorvosTerminal = function () {
    const terminal = new TerminalEngine();
    window.__TERMINAL__ = terminal;
    terminal.init();
};

document.addEventListener("DOMContentLoaded", () => {
    window.startTorvosTerminal();
});