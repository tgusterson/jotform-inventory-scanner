import { useId, useLayoutEffect, useRef, useState } from "react";
import "./ScannedItemsTable.css";
import { buildGridColumns } from "../lib/gridColumns";
import type { ColumnConfig, ScannedItem } from "../lib/types";
import type { ItemErrors } from "../lib/validation";

const LONG_CODE_LENGTH = 40;

type ScannedItemsTableProps = {
    items: ScannedItem[];
    columns: ColumnConfig[];
    errors: ItemErrors;
    showAllErrors: boolean;
    onValueChange: (id: string, key: string, value: string) => void;
    onDelete: (id: string) => void;
};

export function ScannedItemsTable({
    items,
    columns,
    errors,
    showAllErrors,
    onValueChange,
    onDelete,
}: ScannedItemsTableProps) {
    const baseId = useId();
    const tableRef = useRef<HTMLDivElement>(null);
    const hasItems = items.length > 0;

    // Column widths are computed from the config and handed to the CSS as a custom property.
    useLayoutEffect(() => {
        tableRef.current?.style.setProperty("--bsit-grid-columns", buildGridColumns(columns));
    }, [columns, hasItems]);
    // UI-only state: ids of rows whose full code is showing.
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    // UI-only state: "itemId:columnKey" of fields the user has left.
    const [touched, setTouched] = useState<Set<string>>(new Set());

    function markTouched(id: string, key: string) {
        setTouched((current) => new Set(current).add(`${id}:${key}`));
    }

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
            <p className="bsit-scanned-items__empty">
                Scan a barcode or QR code to add the first row.
            </p>
        );
    }

    return (
        <form noValidate onSubmit={(event) => event.preventDefault()}>
        <div
            ref={tableRef}
            className="bsit-scanned-items"
            role="table"
            aria-label="Scanned items"
        >
            <div className="bsit-scanned-items__head" role="rowgroup">
                <div className="bsit-scanned-items__row bsit-scanned-items__row--header" role="row">
                    <div
                        className="bsit-scanned-items__header bsit-scanned-items__header--code"
                        role="columnheader"
                    >
                        Code
                    </div>
                    {columns.map((column) => (
                        <div
                            key={column.key}
                            className={`bsit-scanned-items__header bsit-scanned-items__header--${column.type}`}
                            role="columnheader"
                        >
                            {column.label}
                        </div>
                    ))}
                    <div
                        className="bsit-scanned-items__header bsit-scanned-items__header--action"
                        role="columnheader"
                    >
                        Action
                    </div>
                </div>
            </div>

            <div className="bsit-scanned-items__body" role="rowgroup">
                {items.map((item) => {
                    const isLong = item.code.length > LONG_CODE_LENGTH;
                    const isExpanded = expandedIds.has(item.id);
                    const codeId = `${baseId}-${item.id}-code`;

                    return (
                        <div key={item.id} className="bsit-scanned-items__row" role="row">
                            <div
                                className="bsit-scanned-items__cell bsit-scanned-items__cell--code"
                                role="cell"
                                data-expanded={isExpanded}
                            >
                                <span
                                    id={codeId}
                                    className="bsit-scanned-items__code"
                                    title={item.code}
                                >
                                    {item.code}
                                </span>

                                {isLong && (
                                    <button
                                        type="button"
                                        className="bsit-scanned-items__toggle"
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
                                const errorId = `${inputId}-error`;
                                const message =
                                    showAllErrors || touched.has(`${item.id}:${column.key}`)
                                        ? errors[item.id]?.[column.key]
                                        : undefined;

                                return (
                                    <div
                                        key={column.key}
                                        className="bsit-scanned-items__cell bsit-scanned-items__cell--field"
                                        role="cell"
                                        data-invalid={message ? "true" : undefined}
                                    >
                                        <label
                                            className="bsit-scanned-items__label"
                                            htmlFor={inputId}
                                        >
                                            {column.label}
                                            <span className="bsit-scanned-items__label-code">
                                                {" "}for {item.code}
                                            </span>
                                            {column.required && (
                                                <span
                                                    className="bsit-scanned-items__required"
                                                    aria-hidden="true"
                                                >
                                                    {" "}*
                                                </span>
                                            )}
                                        </label>
                                        {/* Number columns use a text input so "12abc" reaches our validation instead of being blanked by the browser. */}
                                        <input
                                            id={inputId}
                                            className={`bsit-scanned-items__input bsit-scanned-items__input--${column.type}`}
                                            type="text"
                                            inputMode={column.type === "number" ? "decimal" : undefined}
                                            value={item.values[column.key] ?? ""}
                                            aria-required={column.required ? "true" : undefined}
                                            aria-invalid={message ? "true" : undefined}
                                            aria-describedby={message ? errorId : undefined}
                                            onChange={(event) =>
                                                onValueChange(item.id, column.key, event.target.value)
                                            }
                                            onBlur={() => markTouched(item.id, column.key)}
                                        />
                                        {message && (
                                            <p id={errorId} className="bsit-scanned-items__error">
                                                {message}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}

                            <div
                                className="bsit-scanned-items__cell bsit-scanned-items__cell--action"
                                role="cell"
                            >
                                <button
                                    type="button"
                                    className="bsit-scanned-items__delete"
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
        </form>
    );
}
