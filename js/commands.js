window.Commands = {};

window.registerCommand = function(name, command) {
    if (window.Commands[name]) {
        console.warn(`Command '${name}' is already registered.`);
    }

    window.Commands[name] = command;
};