import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScannedItemsTable } from "./ScannedItemsTable";
import type { ColumnConfig, ScannedItem } from "../lib/types";

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

  it("gives every input a label containing its column label and the code", () => {
    renderTable();

    expect(screen.getByLabelText(/Job number/)).toHaveAttribute("type", "text");
    expect(screen.getByLabelText(/Quantity/)).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("Quantity for ABC123")).toBeInTheDocument();
  });

  it("keeps the full code in the title attribute", () => {
    renderTable();

    expect(screen.getByText("ABC123")).toHaveAttribute("title", "ABC123");
  });

  describe("full code toggle", () => {
    const longCode = "https://example.com/" + "a".repeat(40);
    const longItems: ScannedItem[] = [
      { id: "long", code: longCode, values: { job: "", qty: "1" } },
    ];

    it("is not shown for short codes", () => {
      renderTable();

      expect(screen.queryByRole("button", { name: "Show full code" })).not.toBeInTheDocument();
    });

    it("is not shown for a code of exactly 40 characters", () => {
      renderTable({
        items: [{ id: "x", code: "a".repeat(40), values: { job: "", qty: "1" } }],
      });

      expect(screen.queryByRole("button", { name: "Show full code" })).not.toBeInTheDocument();
    });

    it("expands and collapses a long code", async () => {
      const user = userEvent.setup();
      renderTable({ items: longItems });

      const toggle = screen.getByRole("button", { name: "Show full code" });
      const cell = screen.getByText(longCode).closest("[data-expanded]");

      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(cell).toHaveAttribute("data-expanded", "false");

      await user.click(toggle);

      expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
      expect(cell).toHaveAttribute("data-expanded", "true");

      await user.click(screen.getByRole("button", { name: "Show less" }));

      expect(cell).toHaveAttribute("data-expanded", "false");
    });
  });
});
