/**
 * Isolates localStorage before any app script can touch it. Must be the
 * very first script test.html loads.
 *
 * localStorage is shared per-origin, not per-page - without this, booting
 * a test terminal (and every test's filesystem resets/mutations) would
 * read and overwrite the exact same keys the real app at index.html
 * uses, potentially destroying a real saved session. Swapping in a
 * throwaway in-memory store here means test.html can never touch
 * anything outside its own tab, no matter what the app code does.
 */
(function () {
    "use strict";
    const inMemoryStorage = {};
    const fakeLocalStorage = {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(inMemoryStorage, key) ? inMemoryStorage[key] : null;
        },
        setItem(key, value) { inMemoryStorage[key] = String(value); },
        removeItem(key) { delete inMemoryStorage[key]; },
        clear() { for (const key of Object.keys(inMemoryStorage)) delete inMemoryStorage[key]; },
    };
    Object.defineProperty(window, "localStorage", {
        value: fakeLocalStorage,
        writable: true,
        configurable: true,
    });
})();
