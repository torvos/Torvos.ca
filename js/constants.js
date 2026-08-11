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
