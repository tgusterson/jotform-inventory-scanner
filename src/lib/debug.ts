// Logging is off in production. It is on in dev builds, and can be switched on
// for a deployed widget by adding ?debug to the widget URL.
export function isDebugEnabled(): boolean {
    return (
        import.meta.env.DEV ||
        new URLSearchParams(window.location.search).has("debug")
    );
}

export function log(...args: unknown[]) {
    if (isDebugEnabled()) {
        console.log("[bsit]", ...args);
    }
}
