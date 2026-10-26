# Jotform Inventory Scanner

A Jotform custom iFrame widget that scans barcodes and QR codes with the device camera. Each scan adds a row, and extra columns (job number, quantity, etc.) are configured in the widget settings. The widget also runs standalone (outside Jotform) for development.

Built with React, TypeScript and Vite, and hosted on GitHub Pages.

## Using the widget in Jotform

1. Host the build and add a **Custom Widget** to your form using the widget URL. Pushing to `main` deploys to GitHub Pages automatically (`.github/workflows/deploy.yml`), at `https://<user>.github.io/jotform-inventory-scanner/`.
2. In the widget settings, set the `columns` setting: one column per line, written as a label followed by optional `;`-separated flags and options (see below). Text that looks like JSON (starts with `[` or `{`) is not supported, because Jotform corrupts settings that look like JSON, and is reported as an error.

   If `columns` is empty, the default columns in `src/lib/columns.ts` are used: a single `Quantity` number column, default `1`, minimum `1`.

### Columns setting format

One column per line; blank lines are ignored. Each line is the column label, then any flags and options, separated by `;`, in any order:

```
Job number; required; pattern=[A-Za-z]{2}\d{7}; message=2 letters then 7 digits
Quantity; number; required; default=1; min=1; max=999
Notes
```

Flags (names are not case-sensitive):

| Flag | Meaning |
| --- | --- |
| `number` | Number column. |
| `text` | Text column (the default). |
| `required` | The column must be filled in. |

Options (`name=value`; the value is everything after the first `=`, trimmed):

| Option | Meaning |
| --- | --- |
| `default=` | Default value for new rows. |
| `min=`, `max=` | Number limits. Only valid on number columns, and `min` must not exceed `max`. |
| `pattern=` | Regular expression the value must match, written as is. |
| `message=` | Text shown when the value doesn't match the pattern. |
| `width=` | Column width in the table layout (600px and wider): `narrow`, `normal` or `wide` (not case-sensitive). Number columns default to `narrow`, text columns to `normal`. Anything else is reported and the default is used. |

The label comes first and is required. It is also used to build the column key.

A `;` only separates parts when a known flag or option follows it, so `pattern=` and `message=` values can contain `;` (and `=`). Setting an option twice keeps the last value and reports it.

Patterns always match the **whole** value, so `\d{7}` rejects `12345678`. You can include `^` and `$` or leave them out. Write backslashes once: `\d`, not `\\d`.

The older `Label`, `Label=default`, `Label:number` and `Label:number=1` syntax still works on lines without a `;`.

Examples:

| Purpose | Line |
| --- | --- |
| Job number (2 letters + 7 digits) | `Job number; pattern=^[A-Za-z]{2}\d{7}$` |
| Digits only | `Batch; pattern=\d+` |
| Whole number quantity | `Quantity; number; min=1; pattern=\d+` |

Problems in the setting (a missing label, an unknown option, an invalid number or pattern, a repeated option) are shown in a banner at the top of the widget, including in the live form, with the line number. A line with problems still produces a column with its valid options; if no valid columns remain, the default columns are used.

### Validation

Column rules (`required`, `number`, `min`, `max`, `pattern`) are checked by the widget itself, not by the browser, so there are no browser popups. Only the configured columns are validated; the scanned code never is.

How a value is checked (the first problem found is shown):

1. Empty (after trimming spaces): an error if `required`, otherwise valid and no other rule is checked.
2. Number columns: the whole value must be a number (`12abc` is rejected), then `min` and `max` are applied. Decimals and negatives are allowed unless you set `min`/`max`.
3. `pattern`: the trimmed value must match. The error is your `message`, or `<label> is not in the expected format`.

Messages for the other rules are `<label> is required`, `<label> must be a number`, `<label> must be at least <min>` and `<label> must be at most <max>`.

When errors show: a field shows its error after the user leaves it. When the form is submitted, every error is shown at once, and if nothing has been scanned the widget shows "Scan at least one item". Required columns are marked with `*`.

The widget tells Jotform whether the value is valid: `valid: false` when any rule fails or nothing was scanned. Jotform only blocks the submission when the widget is set to **Required** in the form builder; otherwise the data is still submitted.

### Submitted value

The value is a JSON array with one object per scanned item. Keys are `Code` followed by each column label, and all values are strings. Jotform renders this as a table in notification emails.

```json
[{ "Code": "ABC-123", "Job number": "J7", "Quantity": "3" }]
```

When a submission is edited, the saved value is restored into the table. Values are matched to columns by label (not case-sensitive), so renaming a column in the `columns` setting leaves old values for the old label unmatched. Earlier line-based and HTML-table formats are still parsed (see `src/lib/legacyFormats.ts`).

## Development

```sh
npm install
npm run dev            # local dev server
npm run test:run       # run tests once
npm run test:coverage  # tests with coverage report
npm run lint           # ESLint
npm run build          # type-check and production build
```

Camera access needs HTTPS or `localhost`. Debug logging is controlled by `DEBUG` in `src/lib/debug.ts`; set it to `false` before a production release.

Outside Jotform the widget runs standalone with the default columns. To try other columns locally, change `DEFAULT_COLUMNS` in `src/lib/columns.ts` temporarily.

### Project structure

- `src/main.tsx`: entry point
- `src/BarcodeScanner/`: UI components and their CSS
- `src/lib/`: pure logic, each with a test beside it: `parseConfig` (columns setting), `validation`, `pattern`, `gridColumns` (table column widths), `itemsReducer`, `submissionFormat`, the Jotform wrapper and `bootstrap`, plus types
- `src/styles/`: design tokens and the public styling contract

A one-line description of every file is in `.github/copilot-instructions.md`.

## Styling

The widget's styles are plain CSS with BEM class names, all prefixed with `bsit-`. Everything we ship lives in the CSS cascade layer `bsit` (the reset in `bsit-reset`). Jotform's widget **Custom CSS** tab injects unlayered CSS, so your rules always win over ours without `!important` or extra specificity.

### Using the Custom CSS tab

In the Jotform form builder, open the widget's settings, go to the **Custom CSS** tab and add rules that target the public classes or override the design tokens below.

> Renaming or removing a public class or token is a **breaking change** and needs a major version. Anything not listed here is internal and may change at any time.

### Design tokens

Defined on `:root` in `src/styles/tokens.css`.

| Token | Default |
| --- | --- |
| `--bsit-color-primary` | `#1f6feb` |
| `--bsit-color-primary-text` | `#ffffff` |
| `--bsit-color-text` | `#1f2933` |
| `--bsit-color-text-muted` | `#52606d` |
| `--bsit-color-border` | `#9aa5b1` |
| `--bsit-color-background` | `#ffffff` |
| `--bsit-color-surface` | `#f5f7fa` |
| `--bsit-color-success` | `#22c55e` |
| `--bsit-color-error` | `#b00020` |
| `--bsit-color-overlay` | `rgba(0, 0, 0, 0.5)` |
| `--bsit-color-camera-background` | `#000000` |
| `--bsit-font-family` | `Arial, Helvetica, sans-serif` |
| `--bsit-font-family-mono` | `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` |
| `--bsit-font-size-base` | `1.6rem` |
| `--bsit-font-size-small` | `1.4rem` |
| `--bsit-space-1` to `--bsit-space-6` | `0.4rem`, `0.8rem`, `1.2rem`, `1.6rem`, `2rem`, `2.4rem` |
| `--bsit-radius` | `0.8rem` |
| `--bsit-input-height` | `4.4rem` |
| `--bsit-col-code` | `14rem` (minimum width of the Code column) |
| `--bsit-col-narrow`, `--bsit-col-normal`, `--bsit-col-wide` | `9rem`, `16rem`, `28rem` (minimum widths for `width=narrow`, `normal`, `wide`) |

`1rem` is 10px inside the widget (the root font size is 62.5%). The layout switches from cards to a table at a viewport width of 600px; this breakpoint can't be changed with a token. In the table layout, each column grows from its minimum width (Code `1.2fr`, narrow `0.6fr`, normal `1fr`, wide `2fr`); if there are too many columns to fit, the table scrolls sideways instead of squashing them.

### Public classes

- Root and messages: `bsit-barcode-scanner`, `bsit-barcode-scanner__error`, `bsit-config-errors`, `bsit-config-errors__title`, `bsit-config-errors__list`
- Controls: `bsit-scanner-controls`, `bsit-scanner-controls__open`, `bsit-scanner-controls__open-title`, `bsit-scanner-controls__open-hint`, `bsit-scanner-controls__clear`
- Camera: `bsit-camera-view`, `bsit-camera-view__video`, `bsit-camera-view__frame`, `bsit-camera-view__corner` (plus `--top-left`, `--top-right`, `--bottom-left`, `--bottom-right`), `bsit-camera-view__hint`, `bsit-camera-view__close`
- Items: `bsit-scanned-items`, `bsit-scanned-items__empty`, `bsit-scanned-items__head`, `bsit-scanned-items__body`, `bsit-scanned-items__row` (and `--header`), `bsit-scanned-items__header` (plus `--code`, `--text`, `--number`, `--action`), `bsit-scanned-items__cell` (plus `--code`, `--field`, `--action`), `bsit-scanned-items__code`, `bsit-scanned-items__toggle`, `bsit-scanned-items__label`, `bsit-scanned-items__label-code`, `bsit-scanned-items__input` (plus `--text`, `--number`), `bsit-scanned-items__required`, `bsit-scanned-items__error`, `bsit-scanned-items__delete`

The machine-readable lists are in `src/styles/publicApi.ts` and are checked by tests.

### State attributes

States are exposed as `data-` attributes instead of modifier classes:

- `.bsit-camera-view__frame[data-state="scanning" | "success"]`
- `.bsit-scanned-items__cell--code[data-expanded="true" | "false"]` (whether the full code is showing)
- `.bsit-scanned-items__cell--field[data-invalid="true"]` (the field currently shows a validation error)

### Examples

Change the primary colour and corner radius through tokens:

```css
:root {
  --bsit-color-primary: #0a7d5a;
  --bsit-radius: 0.4rem;
}
```

Enlarge the code text:

```css
.bsit-scanned-items__code {
  font-size: 1.8rem;
}
```