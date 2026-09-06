/**
 * Chmod-style permission-mode conversion helpers: numeric ("755") <->
 * symbolic ("rwxr-xr-x") mode strings, plus applying a symbolic chmod
 * operation (e.g. "u+x", "u+rwx,g-w,o=") to an existing mode string.
 *
 * Fully self-contained - these are pure string-transformation functions
 * with no dependency on the virtual filesystem tree itself, so unlike
 * most of fileapi.js they don't need to share its closure. Loaded as a
 * temporary global (see the matching comment in fileapi.js, which pulls
 * these out and deletes the global immediately) purely to keep fileapi.js
 * from growing even larger - they're already fully public today via
 * FileSystemAPI.numericToMode()/.symbolicToMode(), so this doesn't change
 * what's reachable from outside the module, only where the code lives.
 */
window.__FS_MODE_HELPERS__ = (function() {

    /**
     * Converts a numeric permission string (e.g. "755") into the symbolic
     * "rwxr-xr-x" form used for display/storage.
     * @param {string} value - Numeric mode, e.g. "0755" or "755".
     * @returns {string} 9-character symbolic permission string.
     */
    function numericToMode(value) {
        value = value.slice(-3); // only the last 3 digits (owner/group/other) matter
        const map = {
            0: "---",
            1: "--x",
            2: "-w-",
            3: "-wx",
            4: "r--",
            5: "r-x",
            6: "rw-",
            7: "rwx"
        };
        return (
            map[value[0]] +
            map[value[1]] +
            map[value[2]]
        );
    }

    /**
     * Applies a chmod-style symbolic permission change (e.g. "u+x", "go-w",
     * "a=rw", "+x", "u+rwx,g-w,o=") to an existing 9-character mode string,
     * as used by the `chmod` command. Supports everything real chmod's
     * symbolic mode does except the special s/t/X bits:
     * - Multiple comma-separated clauses, applied in order (each clause
     *   sees the result of the ones before it): "u+rwx,g-w,o=".
     * - Omitting the user-class letters, which defaults to all three
     *   classes: "+x" behaves like "a+x".
     * - Omitting the permission letters after "=", which clears all of
     *   the given class(es)' bits: "o=" removes all of other's permissions.
     * @param {string} current - Existing 9-char symbolic mode string.
     * @param {string} operation - One or more comma-separated clauses,
     *   each matching /^([ugoa]*)([+\-=])([rwx]*)$/.
     * @returns {string|null} The updated 9-character mode string, or null
     *   if any clause doesn't match the expected pattern (the caller
     *   should treat this as an invalid-mode error, not apply it).
     */
    function symbolicToMode(current, operation) {
        let chars = current.split("");
        const groups = {
            u: [0,1,2],
            g: [3,4,5],
            o: [6,7,8]
        };
        const offsetOf = { r: 0, w: 1, x: 2 };

        for (const clause of operation.split(",")) {
            const match = clause.match(/^([ugoa]*)([+\-=])([rwx]*)$/);
            if (!match) {
                return null;
            }
            const usersRaw = match[1];
            const action = match[2];
            const permissions = match[3];
            // No class letters, or an explicit "a", both mean all three -
            // matches real chmod (umask aside, which this shell doesn't model).
            const users = (usersRaw === "" || usersRaw.includes("a")) ? "ugo" : usersRaw;

            for (const user of users) {
                const indexes = groups[user];
                if (action === "=") {
                    // Clear this class's bits first, then set only
                    // whatever was actually requested (which may be
                    // nothing at all, e.g. "o=" clears without setting).
                    for (const index of indexes) {
                        chars[index] = "-";
                    }
                }
                for (const perm of permissions) {
                    const index = indexes[offsetOf[perm]];
                    chars[index] = (action === "-") ? "-" : perm;
                }
            }
        }
        return chars.join("");
    }

    return { numericToMode, symbolicToMode };
})();
