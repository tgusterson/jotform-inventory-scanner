import type { ScannedItem } from "./types";

type ScannedItemsTableProps = {
    items: ScannedItem[];
    onJobNumberChange: (id: string, jobNumber: string) => void;
    onQuantityChange: (id: string, quantity: number) => void;
    onDelete: (id: string) => void;
};

export function ScannedItemsTable({
    items,
    onJobNumberChange,
    onQuantityChange,
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
                        <th className="scanned-items__header">Job number</th>
                        <th className="scanned-items__header">Quantity</th>
                        <th className="scanned-items__header">Action</th>
                    </tr>
                </thead>

                <tbody>
                    {items.map((item) => (
                        <tr key={item.id}>
                            <td className="scanned-items__cell">{item.code}</td>

                            <td className="scanned-items__cell">
                                <input
                                    className="scanned-items__input"
                                    type="text"
                                    value={item.jobNumber}
                                    onChange={(event) =>
                                        onJobNumberChange(item.id, event.target.value)
                                    }
                                    placeholder="Enter job number"
                                />
                            </td>

                            <td className="scanned-items__cell">
                                <input
                                    className="scanned-items__input scanned-items__input--quantity"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={item.quantity}
                                    onChange={(event) =>
                                        onQuantityChange(
                                            item.id,
                                            Math.max(1, Number(event.target.value) || 1),
                                        )
                                    }
                                />
                            </td>

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