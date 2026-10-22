import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScannedItemsTable } from "./ScannedItemsTable";
import type { ColumnConfig, ScannedItem } from "./types";

const columns: ColumnConfig[] = [
  { key: "job", label: "Job number", type: "text" },
  { key: "qty", label: "Quantity", type: "number", defaultValue: "1" },
];

const items: ScannedItem[] = [
  { id: "item-1", code: "ABC123", values: { job: "", qty: "1" } },
];

function renderTable(overrides: Partial<Parameters<typeof ScannedItemsTable>[0]> = {}) {
  const onValueChange = vi.fn();
  const onDelete = vi.fn();

  render(
    <ScannedItemsTable
      items={items}
      columns={columns}
      onValueChange={onValueChange}
      onDelete={onDelete}
      {...overrides}
    />,
  );

  return { onValueChange, onDelete };
}

describe("ScannedItemsTable", () => {
  it("shows the empty message when there are no items", () => {
    renderTable({ items: [] });

    expect(
      screen.getByText("Scan a barcode or QR code to add the first row."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders headers for Code, each column and Action", () => {
    renderTable();

    const headers = screen.getAllByRole("columnheader").map((header) => header.textContent);

    expect(headers).toEqual(["Code", "Job number", "Quantity", "Action"]);
  });

  it("calls onValueChange with the item id, column key and value when typing", async () => {
    const user = userEvent.setup();
    const { onValueChange } = renderTable();

    await user.type(screen.getByLabelText("Job number for ABC123"), "X");

    expect(onValueChange).toHaveBeenCalledWith("item-1", "job", "X");
  });

  it("calls onDelete with the item id when Delete is clicked", async () => {
    const user = userEvent.setup();
    const { onDelete } = renderTable();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledWith("item-1");
  });
});
