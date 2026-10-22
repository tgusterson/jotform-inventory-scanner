// TODO: set DEBUG to false before production.
export const DEBUG = true;

export function log(...args: unknown[]) {
    if (DEBUG) {
        console.log("[bsit]", ...args);
    }
}
