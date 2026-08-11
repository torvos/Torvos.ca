// Global registry that maps command names (e.g. "ls", "cat") to their
// implementation objects/functions. Populated by each file in js/commands/.
window.Commands = {};

/**
 * Registers a command so the terminal's executor/parser can look it up by name.
 * @param {string} name - The command name as typed by the user (e.g. "grep").
 * @param {Function|Object} command - The command implementation (handler function
 *   or object with a run/execute method, depending on how commands/*.js define it).
 */
window.registerCommand = function(name, command) {
    // Warn (but still allow) if a command name is being overwritten,
    // to help catch accidental duplicate registrations during development.
    if (window.Commands[name]) {
        console.warn(`Command '${name}' is already registered.`);
    }

    window.Commands[name] = command;
};
