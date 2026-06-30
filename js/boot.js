class BootSequence {

    constructor(config) {
        this.config = config;
        this.bootOverlay = document.getElementById("boot-overlay");
        this.bootOutput = document.getElementById("boot-output");
        this.terminalContainer = document.getElementById("terminal-container");
        this.bootSound = document.getElementById("boot-sound");
        this.lines = this.getBootLines();
        this.index = 0;
    }

    getBootLines() {

        return [

            { text: "Torvos v2.6.0", delay: 400, color: "#33ff66" },

            { text: "Initializing kernel................ [ OK ]", delay: 300, color: "#33ff66" },
            { text: "Mounting virtual filesystem........ [ OK ]", delay: 250, color: "#33ff66" },
            { text: "Starting network stack............. [ OK ]", delay: 250, color: "#33ff66" },
            { text: "Loading user profile............... [ OK ]", delay: 300, color: "#33ff66" },
            { text: "Establishing secure session........ [ OK ]", delay: 250, color: "#33ff66" },
            { text: "", delay: 200 },
            { text: "Welcome to Torvos.ca", delay: 500, color: "#ffffff", glow: true },
            { text: "", delay: 300 },
            { text: "Type 'help' to begin.", delay: 200, color: "#888" }
        ];
    }

    start() {

        if (this.bootSound && this.config.enableSounds) {
            this.bootSound.volume = 0.4;
            this.bootSound.play().catch(() => {});
        }

        this.bootOverlay.classList.remove("hidden");
        this.typeNextLine();
    }

    typeNextLine() {
        if (this.index >= this.lines.length) {
            return this.finish();
        }
        const line = this.lines[this.index];
        const div = document.createElement("div");
        div.style.color = line.color || "#33ff66";
        if (line.glow) {
            div.classList.add("glow");
        }
        this.bootOutput.appendChild(div);
        this.typeText(div, line.text, 0, () => {
            setTimeout(() => {
                this.index++;
                this.typeNextLine();
            }, line.delay || 200);
        });
    }

    typeText(element, text, i, callback) {
        if (i >= text.length) {
            callback();
            return;
        }
        element.textContent += text[i];
        if (this.config.enableSounds && this.config.typingSound) {
            this.config.typingSound.currentTime = 0;
            this.config.typingSound.play().catch(() => {});
        }
        setTimeout(() => {
            this.typeText(element, text, i + 1, callback);
        }, this.config.typingSpeed || 15);
    }

    finish() {
        setTimeout(() => {
            // fade boot text instead of removing it instantly
            this.bootOverlay.style.transition = "opacity 600ms ease";
            this.bootOverlay.style.opacity = "0";
            setTimeout(() => {
                // DO NOT just show terminal abruptly
                this.bootOverlay.remove();
                const terminal = document.getElementById("terminal-container");
                // Make terminal appear softly (if you keep container)
                if (terminal) {
                    terminal.classList.remove("hidden");
                    terminal.style.opacity = "0";
                    terminal.style.transition = "opacity 600ms ease";
                    requestAnimationFrame(() => {
                        terminal.style.opacity = "1";
                    });
                }
                this.startTerminal();
            }, 600);
        }, 500);
    }

    startTerminal() {
        if (window.startTorvosTerminal) {
            window.startTorvosTerminal();
        }
    }
}