import { useId, useState } from "react";
import type { ColumnConfig, ScannedItem } from "./types";

const LONG_CODE_LENGTH = 40;

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
    const baseId = useId();
    // UI-only state: ids of rows whose full code is showing.
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    function toggleExpanded(id: string) {
        setExpandedIds((current) => {
            const next = new Set(current);

            if (!next.delete(id)) {
                next.add(id);
            }

            return next;
        });
    }

    if (items.length === 0) {
        return (
            <p className="scanned-items__empty">
                Scan a barcode or QR code to add the first row.
            </p>
        );
    }

    return (
        <div className="scanned-items" role="table" aria-label="Scanned items">
            <div className="scanned-items__head" role="rowgroup">
                <div className="scanned-items__row scanned-items__row--header" role="row">
                    <div
                        className="scanned-items__header scanned-items__header--code"
                        role="columnheader"
                    >
                        Code
                    </div>
                    {columns.map((column) => (
                        <div
                            key={column.key}
                            className={`scanned-items__header scanned-items__header--${column.type}`}
                            role="columnheader"
                        >
                            {column.label}
                        </div>
                    ))}
                    <div
                        className="scanned-items__header scanned-items__header--action"
                        role="columnheader"
                    >
                        Action
                    </div>
                </div>
            </div>

            <div className="scanned-items__body" role="rowgroup">
                {items.map((item) => {
                    const isLong = item.code.length > LONG_CODE_LENGTH;
                    const isExpanded = expandedIds.has(item.id);
                    const codeId = `${baseId}-${item.id}-code`;

                    return (
                        <div key={item.id} className="scanned-items__row" role="row">
                            <div
                                className="scanned-items__cell scanned-items__cell--code"
                                role="cell"
                            >
                                <span
                                    id={codeId}
                                    className={
                                        isExpanded
                                            ? "scanned-items__code scanned-items__code--expanded"
                                            : "scanned-items__code"
                                    }
                                    title={item.code}
                                >
                                    {item.code}
                                </span>

                                {isLong && (
                                    <button
                                        type="button"
                                        className="scanned-items__toggle"
                                        aria-expanded={isExpanded}
                                        aria-controls={codeId}
                                        onClick={() => toggleExpanded(item.id)}
                                    >
                                        {isExpanded ? "Show less" : "Show full code"}
                                    </button>
                                )}
                            </div>

                            {columns.map((column) => {
                                const inputId = `${baseId}-${item.id}-${column.key}`;

                                return (
                                    <div
                                        key={column.key}
                                        className="scanned-items__cell"
                                        role="cell"
                                    >
                                        <label
                                            className="scanned-items__label"
                                            htmlFor={inputId}
                                        >
                                            {column.label}
                                            <span className="scanned-items__label-code">
                                                {" "}for {item.code}
                                            </span>
                                        </label>
                                        <input
                                            id={inputId}
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
                                        />
                                    </div>
                                );
                            })}

                            <div
                                className="scanned-items__cell scanned-items__cell--action"
                                role="cell"
                            >
                                <button
                                    type="button"
                                    className="scanned-items__delete"
                                    onClick={() => onDelete(item.id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
