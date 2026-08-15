// Global configuration constants shared across the terminal engine and commands.

const TERMINAL_VERSION = "2.8.0";   // Displayed by commands like `man`/version banners
const ROOT = "/";                   // Filesystem root path
const HOME = "/home/guest";         // Default home directory for the guest user
const DEFAULT_USER = "guest";       // Username used when no login has occurred
const HOSTNAME = "torvos";          // Hostname shown in the prompt (e.g. guest@torvos)

// Input mode identifiers used by js/terminal/input.js to decide how to
// interpret keystrokes (normal shell input vs. full-screen editor vs.
// prompts collecting login credentials).
const INPUT_NORMAL = "normal";
const INPUT_EDITOR = "editor";
const INPUT_WAIT_FOR_USERNAME = "waitingUsername";
const INPUT_WAIT_FOR_PASSWORD = "waitingPassword";

// Shared colors for multi-color command output (ls/tree/find/grep/stat/man/etc).
// Kept in one place so entries, matches, and labels stay visually consistent
// across every command that colors part of its output.
const COLOR_STDOUT = "#ffffff";     // default color used for plain stdout text
const COLOR_ERROR = "#ff6060";      // matches the red used for stderr lines
const COLOR_DIRECTORY = "#66aaff";  // directory names in ls/tree/find
const COLOR_SYMLINK = "#5fd7ff";    // symlink names/targets in ls
const COLOR_MATCH = "#ffff66";      // grep's matched substring
const COLOR_LABEL = "#888888";      // dim field labels in stat/printenv
const COLOR_HEADING = "#66ff99";    // section headings in man
