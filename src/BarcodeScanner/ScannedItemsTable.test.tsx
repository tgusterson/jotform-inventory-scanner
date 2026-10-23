import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ScannedItemsTable } from "./ScannedItemsTable";
import { buildGridColumns } from "../lib/gridColumns";
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
      errors={{}}
      showAllErrors={false}
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
    expect(screen.getByLabelText(/Quantity/)).toHaveAttribute("inputmode", "decimal");
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

describe("ScannedItemsTable grid columns", () => {
  function renderWith(cols: ColumnConfig[]) {
    const props = {
      items,
      errors: {},
      showAllErrors: false,
      onValueChange: vi.fn(),
      onDelete: vi.fn(),
    };
    const view = render(<ScannedItemsTable {...props} columns={cols} />);

    return {
      table: () => screen.getByRole("table"),
      rerender: (next: ColumnConfig[]) =>
        view.rerender(<ScannedItemsTable {...props} columns={next} />),
    };
  }

  it("sets the grid template from the column widths", () => {
    const { table } = renderWith([
      { key: "q", label: "Q", type: "number" },
      { key: "n", label: "N", type: "text", width: "wide" },
    ]);

    expect(table().style.getPropertyValue("--bsit-grid-columns")).toBe(
      buildGridColumns([
        { key: "q", label: "Q", type: "number" },
        { key: "n", label: "N", type: "text", width: "wide" },
      ]),
    );
  });

  it("updates the grid template when the columns change", () => {
    const { table, rerender } = renderWith([{ key: "q", label: "Q", type: "number" }]);

    rerender([]);

    expect(table().style.getPropertyValue("--bsit-grid-columns")).toBe(buildGridColumns([]));
  });
});

describe("ScannedItemsTable validation", () => {
  const validationColumns: ColumnConfig[] = [
    { key: "job", label: "Job number", type: "text", required: true, pattern: "\\d+" },
    { key: "qty", label: "Quantity", type: "number", min: 1 },
  ];
  const errors = { "item-1": { job: "Job number is required" } };

  it("hides errors until the field is blurred", async () => {
    const user = userEvent.setup();

    renderTable({ columns: validationColumns, errors });

    const input = screen.getByLabelText(/Job number/);

    expect(screen.queryByText("Job number is required")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");

    await user.click(input);
    await user.tab();

    expect(screen.getByText("Job number is required")).toBeInTheDocument();
  });

  it("shows all errors when showAllErrors is true", () => {
    renderTable({ columns: validationColumns, errors, showAllErrors: true });

    expect(screen.getByText("Job number is required")).toBeInTheDocument();
  });

  it("links the invalid input to its message", () => {
    renderTable({ columns: validationColumns, errors, showAllErrors: true });

    const input = screen.getByLabelText(/Job number/);
    const message = screen.getByText("Job number is required");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", message.id);
    expect(message).toHaveClass("bsit-scanned-items__error");
    expect(input.closest("[data-invalid]")).toHaveAttribute("data-invalid", "true");
  });

  it("marks required columns", () => {
    const { container } = render(
      <ScannedItemsTable
        items={items}
        columns={validationColumns}
        errors={{}}
        showAllErrors={false}
        onValueChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(/Job number/)).toHaveAttribute("aria-required", "true");
    expect(screen.getByLabelText(/Quantity/)).not.toHaveAttribute("aria-required");
    expect(container.querySelectorAll(".bsit-scanned-items__required")).toHaveLength(1);
    expect(container.querySelector(".bsit-scanned-items__required")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("uses no native validation attributes and disables browser validation", () => {
    const { container } = render(
      <ScannedItemsTable
        items={items}
        columns={validationColumns}
        errors={{}}
        showAllErrors={false}
        onValueChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    for (const input of screen.getAllByRole("textbox")) {
      for (const name of ["required", "pattern", "min", "max"]) {
        expect(input).not.toHaveAttribute(name);
      }
    }

    expect(container.querySelector("form")).toHaveAttribute("novalidate");
  });

  it("only reveals the error of the field that was blurred", async () => {
    const user = userEvent.setup();
    const twoErrors = {
      "item-1": { job: "Job number is required", qty: "Quantity must be at least 1" },
    };

    renderTable({ columns: validationColumns, errors: twoErrors });
    await user.click(screen.getByLabelText(/Job number/));
    await user.tab();

    expect(screen.getByText("Job number is required")).toBeInTheDocument();
    expect(screen.queryByText("Quantity must be at least 1")).not.toBeInTheDocument();
  });

  it("keeps a touched field's error tracking in sync when the error is fixed", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <ScannedItemsTable
        items={items}
        columns={validationColumns}
        errors={errors}
        showAllErrors={false}
        onValueChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText(/Job number/));
    await user.tab();
    expect(screen.getByText("Job number is required")).toBeInTheDocument();

    rerender(
      <ScannedItemsTable
        items={items}
        columns={validationColumns}
        errors={{}}
        showAllErrors={false}
        onValueChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const input = screen.getByLabelText(/Job number/);

    expect(screen.queryByText("Job number is required")).not.toBeInTheDocument();
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).not.toHaveAttribute("aria-describedby");
    expect(input.closest("[data-invalid]")).toBeNull();
  });

  it("gives each row's error message a unique id", () => {
    const twoItems: ScannedItem[] = [
      { id: "item-1", code: "A", values: { job: "" } },
      { id: "item-2", code: "B", values: { job: "" } },
    ];

    renderTable({
      items: twoItems,
      columns: [validationColumns[0]],
      errors: {
        "item-1": { job: "Job number is required" },
        "item-2": { job: "Job number is required" },
      },
      showAllErrors: true,
    });

    const ids = screen.getAllByText("Job number is required").map((node) => node.id);

    expect(ids[0]).toBeTruthy();
    expect(new Set(ids).size).toBe(2);
  });

  it("prevents the default form submission", () => {
    const { container } = render(
      <ScannedItemsTable
        items={items}
        columns={validationColumns}
        errors={{}}
        showAllErrors={false}
        onValueChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const notPrevented = fireEvent.submit(container.querySelector("form")!);

    expect(notPrevented).toBe(false);
  });

  it("does not render a form or errors for the empty state", () => {
    const { container } = render(
      <ScannedItemsTable
        items={[]}
        columns={validationColumns}
        errors={{}}
        showAllErrors
        onValueChange={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(container.querySelector("form")).toBeNull();
  });
});