/**
 * Display-formatting helpers for filesystem metadata: human-readable
 * sizes ("4.2K"), `ls -l`-style dates, hard-link counts, and full
 * long-format entry lines - plus the size/date calculations they build on.
 *
 * getDirectorySize/getSize/formatLongEntry take the node they operate on
 * as a plain parameter (rather than looking it up in the tree themselves),
 * so - like mode.js - none of this needs fileapi.js's private FileSystem
 * variable. Loaded as a temporary global that fileapi.js consumes and
 * deletes immediately; see the matching comment there.
 */
window.__FS_FORMAT_HELPERS__ = (function() {

    /**
     * Formats a byte count into a human-readable size string with a
     * K/M/G/T/P unit suffix (e.g. `ls -h`, `df`, `du`-style output).
     */
    function formatSize(bytes) {
        if (bytes < 1024) {
            return `${bytes}B`;
        }
        const units = ["K", "M", "G", "T"];
        let size = bytes;
        for (const unit of units) {
            size /= 1024;
            if (size < 1024) {
                return `${size.toFixed(1)}${unit}`;
            }
        }
        return `${size.toFixed(1)}P`;
    }

    /**
     * Recursively computes the total size in bytes of a node: for a file,
     * its UTF-8 encoded content length; for a directory, the sum of all
     * descendant files.
     */
    function getDirectorySize(node) {
        if (!node) {
            return 0;
        }
        if (node.type === "file") {
            return new TextEncoder().encode(node.content || "").length;
        }
        let total = 0;
        for (const child of Object.values(node.children || {})) {
            total += getDirectorySize(child);
        }
        return total;
    }

    /**
     * Returns a node's "size" for `ls -l`-style display purposes: byte
     * length for files, or immediate child count for directories (not
     * recursive, unlike getDirectorySize).
     */
    function getSize(node) {
        if (node.type === "file") {
            return new TextEncoder().encode(node.content || "").length;
        }
        if (node.type === "dir") {
            return Object.keys(node.children || {}).length;
        }
        return 0;
    }

    // Formats a timestamp for `ls -l`-style display (e.g. "Jul 01, 10:00").
    function formatDate(timestamp) {
        return new Date(timestamp).toLocaleString("en-CA", {
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
        });
    }

    /**
     * Computes the "link count" column shown by `ls -l`. Files always
     * report 1; directories mimic Unix's convention of 2 (for "." and its
     * own entry in the parent) plus one for each immediate subdirectory
     * (each of which has a ".." pointing back).
     */
    function getLinkCount(node) {
        if (node.type === "file") {
            return 1;
        }
        const subdirs = Object.values(node.children || {})
            .filter(child => child.type === "dir")
            .length;
        return 2 + subdirs;
    }

    /**
     * Formats a single filesystem entry as an `ls -l` long-format line:
     * type+permissions, link count, owner, group, size, modified date, name
     * (with a trailing "/" for dirs, or "-> target" for symlinks).
     */
    function formatLongEntry(name, node) {
        const typeChar = node.type === "dir" ? "d" : node.type === "symlink" ? "l" : node.type === "device" ? "c" : "-";
        const mode = node.mode;
        const links = getLinkCount(node);
        const group = node.group;
        const size = getDirectorySize(node);
        const modified = formatDate(node.modified);    const owner = node.owner;
        return `${typeChar}${mode} ${String(links).padStart(2)} ${owner.padEnd(8)} ${group.padEnd(8)} ${String(size).padStart(6)} ${modified} ${name}${node.type === "dir" ? "/" : ""}${node.type === "symlink" ? ` -> ${node.target}` : ""}`;
    }

    return { formatSize, getDirectorySize, getSize, formatDate, getLinkCount, formatLongEntry };
})();
