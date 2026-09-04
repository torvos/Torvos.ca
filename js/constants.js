// Global configuration constants shared across the terminal engine and commands.

const TERMINAL_VERSION = "3.0.0";   // Displayed by commands like `man`/version banners
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
const COLOR_DEVICE = "#ffcc66";     // device file names in ls (/dev/*)
const COLOR_MATCH = "#ffff66";      // grep's matched substring
const COLOR_LABEL = "#888888";      // dim field labels in stat/printenv
const COLOR_HEADING = "#66ff99";    // section headings in man
const COLOR_SUCCESS = "#66ff99";    // green used for success/PASS-style status text
const COLOR_MAGENTA = "#ff66ff";    // magenta, used by echo's ANSI color code support
const COLOR_WARNING = "#ff5555";    // boot-time warning messages (corrupted save data, storage full)

//Exit codes
const EXIT_SUCCESS = 0;
const EXIT_FAILURE = 1;
const EXIT_COMMAND_NOT_FOUND = 127;
const EXIT_NOT_EXECUTABLE = 126;    // found but not runnable (a directory, non-regular file, or missing the execute bit)

// Ownership - the two "users" any file/directory can be owned by in this
// virtual filesystem. DEFAULT_USER above is the interactive user; this is
// the system/admin owner used for protected paths like /bin and /dev.
const SYSTEM_USER = "root";

// Output timing (milliseconds), used by the "typewriter" animation effect
const LINE_PRINT_DELAY_MS = 50;     // delay between each printed line of command output
const PAGER_SCROLL_DELAY_MS = 20;   // delay between each line when less/more scroll

// localStorage keys used to persist a session across reloads - kept in one
// place so core.js (save/restore) and input.js (the `reset` command) can't
// drift out of sync with each other.
const STORAGE_KEY_SETTINGS = "terminalSettings";
const STORAGE_KEY_FILESYSTEM = "FileSystem";