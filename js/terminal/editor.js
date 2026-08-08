Object.assign(TerminalEngine.prototype, {

    openEditor(node, path) {
        this.editor.active = true;
        this.editor.node = node;
        this.editor.path = path;
        this.editor.modified = false;
        this.inputMode = INPUT_EDITOR;
        document.getElementById("input-line").style.display = "none";
        document.getElementById("output").style.display = "none";
        this.editorEl.addEventListener("keydown", this.editorKeyHandler);
        this.editorContainer.style.display = "flex";
        this.editorEl.value = node.content ?? "";

        requestAnimationFrame(() => {
            this.editorEl.focus();
            this.editorEl.setSelectionRange(
                this.editorEl.value.length,
                this.editorEl.value.length
            );
        });
        document.getElementById("editor-header").textContent = `Editing: ${path} | Ctrl+S Save | Ctrl+X Save & Exit | Esc Exit`;
    },

    saveEditor() {
        if (!this.editor.active){
            return;
        }
        this.editor.node.content = this.editorEl.value;
        this.editor.node.modified = Date.now();
        this.saveSettings();
        this.editor.modified = false;
    },

    closeEditor(save = false) {
        if (!this.editor.active){
            return;
        }
        if (save){
            this.saveEditor();
        }
        this.editor.active = false;
        this.editor.node = null;
        this.editorContainer.style.display = "none";
        this.editorEl.removeEventListener("keydown",this.editorKeyHandler);
        document.getElementById("input-line").style.display = "";
        document.getElementById("output").style.display = "";
        this.inputMode = INPUT_NORMAL;
        this.hiddenInput.focus();
        this.showPrompt();
    }

});
