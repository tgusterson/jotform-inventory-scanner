export function toKey(label: string): string {
    return (
        label
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "") || "column"
    );
}

// Make keys unique, e.g. two "Notes" columns become notes and notes_2.
export function uniqueKey(label: string, usedKeys: Set<string>): string {
    const baseKey = toKey(label);
    let key = baseKey;
    let suffix = 2;

    while (usedKeys.has(key)) {
        key = `${baseKey}_${suffix++}`;
    }

    usedKeys.add(key);

    return key;
}
