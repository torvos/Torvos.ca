/**
 * Full-screen text editor overlay (used by the `edit` command), letting
 * the user view and modify a file's contents in a dedicated textarea
 * instead of the normal line-based shell input.
 */
Object.assign(TerminalEngine.prototype, {

    /**
     * Opens the full-screen editor for a given filesystem node, hiding the
     * normal terminal input/output and showing the editor textarea
     * pre-filled with the file's current content.
     * @param {Object} node - The filesystem file node to edit.
     * @param {string} path - Display path shown in the editor header.
     */
    openEditor(node, path) {
        this.editor.active = true;
        this.editor.node = node;
        this.editor.path = path;
        this.editor.modified = false;
        this.inputMode = INPUT_EDITOR;
        document.getElementById("input-line").style.display = "none";
        document.getElementById("output").style.display = "none";
        document.body.classList.add("editor-mode");
        this.editorEl.addEventListener("keydown", this.editorKeyHandler);
        this.editorContainer.style.display = "flex";
        this.editorEl.value = node.content ?? "";

        // Wait a frame before focusing/placing the cursor so the textarea
        // is visible and laid out first.
        requestAnimationFrame(() => {
            this.editorEl.focus();
            this.editorEl.setSelectionRange(
                this.editorEl.value.length,
                this.editorEl.value.length
            );
        });
        document.getElementById("editor-header").textContent = `Editing: ${path} | Ctrl+S Save | Ctrl+X Save & Exit | Esc Exit`;
    },

    /**
     * Writes the editor textarea's current contents back to the file node
     * and persists the updated filesystem, without closing the editor.
     */
    saveEditor() {
        if (!this.editor.active){
            return;
        }
        this.editor.node.content = this.editorEl.value;
        this.editor.node.modified = Date.now();
        this.saveSettings();
        this.editor.modified = false;
    },

    /**
     * Closes the editor overlay and restores normal terminal input/output.
     * @param {boolean} [save=false] - If true, saves changes before closing.
     */
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
        document.body.classList.remove("editor-mode");
        document.getElementById("input-line").style.display = "";
        document.getElementById("output").style.display = "";
        this.inputMode = INPUT_NORMAL;
        this.hiddenInput.focus();
        this.showPrompt();
    }

});
