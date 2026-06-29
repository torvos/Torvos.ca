window.Typing = {

    /* =========================================================
       CONFIG
    ========================================================= */

    defaultSpeed: window.TorvosConfig?.typingSpeed || 15,

    /* =========================================================
       TYPE TEXT INTO ELEMENT (CHAR-BY-CHAR)
    ========================================================= */

    async type(element, text, speed = this.defaultSpeed) {

        if (!element) return;

        element.innerHTML = "";

        const safeText = text ?? "";

        for (let i = 0; i < safeText.length; i++) {

            element.innerHTML += safeText[i];

            await this.sleep(speed);

        }

    },

    /* =========================================================
       TYPE INTO TERMINAL OUTPUT AS NEW LINE
    ========================================================= */

    async typeLine(terminal, text, speed = this.defaultSpeed) {

        return new Promise(async (resolve) => {

            const div = document.createElement("div");

            terminal.output.appendChild(div);

            terminal.scrollBottom();

            const safeText = text ?? "";

            for (let i = 0; i < safeText.length; i++) {

                div.innerHTML += safeText[i];

                terminal.scrollBottom();

                await this.sleep(speed);

            }

            resolve(div);

        });

    },

    /* =========================================================
       TYPE MULTI-LINE OUTPUT (SEQUENTIAL LINES)
    ========================================================= */

    async typeBlock(terminal, text, speed = this.defaultSpeed, lineDelay = 0) {

        const lines = (text || "").split("\n");

        for (const line of lines) {

            await this.typeLine(terminal, line, speed);

            if (lineDelay > 0) {
                await this.sleep(lineDelay);
            }

        }

    },

    /* =========================================================
       INSTANT PRINT (fallback / performance mode)
    ========================================================= */

    printLine(terminal, text) {

        const div = document.createElement("div");

        div.innerHTML = text;

        terminal.output.appendChild(div);

        terminal.scrollBottom();

    },

    /* =========================================================
       UTILITY: SLEEP
    ========================================================= */

    sleep(ms) {

        return new Promise(resolve => setTimeout(resolve, ms));

    }

};