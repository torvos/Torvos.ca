window.startTorvosTerminal = function () {
    const terminal = new TerminalEngine(window.TorvosConfig);
    window.__TERMINAL__ = terminal;
    terminal.init();
};

document.addEventListener("DOMContentLoaded", () => {
    const boot = new BootSequence(window.TorvosConfig, terminal);
    boot.start();
});