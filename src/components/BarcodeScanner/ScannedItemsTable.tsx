import type { ColumnConfig, ScannedItem } from "./types";

type ScannedItemsTableProps = {
    items: ScannedItem[];
    columns: ColumnConfig[];
    onValueChange: (id: string, key: string, value: string) => void;
    onDelete: (id: string) => void;
};

export function ScannedItemsTable({
    items,
    columns,
    onValueChange,
    onDelete,
}: ScannedItemsTableProps) {
    if (items.length === 0) {
        return (
            <p className="scanned-items__empty">
                Scan a barcode or QR code to add the first row.
            </p>
        );
    }

    return (
        <div className="scanned-items">
            <table className="scanned-items__table">
                <thead>
                    <tr>
                        <th className="scanned-items__header">Code</th>
                        {columns.map((column) => (
                            <th key={column.key} className="scanned-items__header">
                                {column.label}
                            </th>
                        ))}
                        <th className="scanned-items__header">Action</th>
                    </tr>
                </thead>

                <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td className="scanned-items__cell">{item.code}</td>

                            {columns.map((column) => (
                                <td key={column.key} className="scanned-items__cell">
                                    <input
                                        className={
                                            column.type === "number"
                                                ? "scanned-items__input scanned-items__input--number"
                                                : "scanned-items__input"
                                        }
                                        type={column.type}
                                        inputMode={column.type === "number" ? "numeric" : undefined}
                                        value={item.values[column.key] ?? ""}
                                        onChange={(event) =>
                                            onValueChange(item.id, column.key, event.target.value)
                                        }
                                        aria-label={`${column.label} for ${item.code}`}
                                    />
                                </td>
                            ))}

                            <td className="scanned-items__cell">
                                <button type="button" onClick={() => onDelete(item.id)}>
                                    Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}