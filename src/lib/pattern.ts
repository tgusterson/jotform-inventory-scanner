/** Compiles a pattern that must match the whole value, with or without ^ and $. */
export function compilePattern(pattern: string): RegExp | null {
    try {
        return new RegExp(`^(?:${pattern})$`);
    } catch {
        return null;
    }
}
