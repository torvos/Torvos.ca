/**
 * Read/write handlers for the virtual device files under /dev, mirroring
 * standard Unix device semantics: /dev/null discards writes and reads as
 * empty, /dev/zero reads as null bytes, /dev/random and /dev/urandom read
 * as random bytes, /dev/full reads as null bytes but always refuses
 * writes (simulating a full disk). All other writes succeed silently,
 * same as their real counterparts.
 *
 * Fully self-contained - unlike the rest of the virtual filesystem, these
 * handlers don't need access to the FileSystem tree itself (there's no
 * "content" to read from disk for a device file; read()/write() just
 * compute or discard data directly), so this lives in its own small IIFE
 * rather than sharing filesystem.js's.
 */
(function() {
    function generateRandomBytes(count) {
        const chars =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        let output = "";

        for (let i = 0; i < count; i++) {
            output += chars[Math.floor(Math.random() * chars.length)];
        }

        return output;
    }

    window.FileDevices = {
        null: {
            read() {
                return "";
            },
            write(data) {
                return true;
            }
        },

        zero: {
            read(count = 4096) {
                return "\0".repeat(count);
            },
            write(data) {
                return true;
            }
        },

        random: {
            read(count = 4096) {
                return generateRandomBytes(count);
            },

            write(data) {
                return true;
            }
        },

        urandom: {
            read(count = 4096) {
                return generateRandomBytes(count);
            },

            write(data) {
                return true;
            }
        },

        // /dev/full - reads like /dev/zero, but every write fails (as if the
        // disk were completely out of space). Useful for testing how a
        // program handles a failed write.
        full: {
            read(count = 4096) {
                return "\0".repeat(count);
            },
            write(data) {
                return false;
            }
        }
    };
})();
