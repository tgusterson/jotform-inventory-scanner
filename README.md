# Jotform Inventory Scanner

A Jotform custom iFrame widget that scans barcodes and QR codes with the device camera. Each scan adds a row, and extra columns (job number, quantity, etc.) are configured in the widget settings. The widget also runs standalone (outside Jotform) for development.

Built with React, TypeScript and Vite, and hosted on GitHub Pages.

## Using the widget in Jotform

1. Host the build (GitHub Pages) and add a **Custom Widget** to your form using the widget URL.
2. In the widget settings, set the `columns` setting, one column per line:

   | Line | Meaning |
   | --- | --- |
   | `Label` | Text column |
   | `Label=default` | Text column with a default value |
   | `Label:number` | Number column |
   | `Label:number=1` | Number column with a default value |

   If `columns` is empty, the default columns in `src/lib/columns.ts` are used.

### Submitted value

The value is a JSON array with one object per scanned item. Keys are `Code` followed by each column label, and all values are strings. Jotform renders this as a table in notification emails.

```json
[{ "Code": "ABC-123", "Job number": "J7", "Quantity": "3" }]
```

When a submission is edited, the saved value is restored into the table. Earlier line-based and HTML-table formats are still parsed (see `src/lib/legacyFormats.ts`).

## Development

```sh
npm install
npm run dev            # local dev server
npm run test:run       # run tests once
npm run test:coverage  # tests with coverage report
npm run build          # type-check and production build
```

Camera access needs HTTPS or `localhost`. Debug logging is controlled by `DEBUG` in `src/lib/debug.ts`; set it to `false` before a production release.

### Project structure

- `src/BarcodeScanner/`: UI components and their CSS
- `src/lib/`: reducer, submission format, Jotform wrapper, column parsing, types
- `src/styles/`: design tokens and the public styling contract
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

`1rem` is 10px inside the widget (the root font size is 62.5%). The layout switches from cards to a table at a viewport width of 600px; this breakpoint can't be changed with a token.

### Public classes

- Root and messages: `bsit-barcode-scanner`, `bsit-barcode-scanner__error`
- Controls: `bsit-scanner-controls`, `bsit-scanner-controls__open`, `bsit-scanner-controls__open-title`, `bsit-scanner-controls__open-hint`, `bsit-scanner-controls__clear`
- Camera: `bsit-camera-view`, `bsit-camera-view__video`, `bsit-camera-view__frame`, `bsit-camera-view__corner` (plus `--top-left`, `--top-right`, `--bottom-left`, `--bottom-right`), `bsit-camera-view__hint`, `bsit-camera-view__close`
- Items: `bsit-scanned-items`, `bsit-scanned-items__empty`, `bsit-scanned-items__head`, `bsit-scanned-items__body`, `bsit-scanned-items__row` (and `--header`), `bsit-scanned-items__header` (plus `--code`, `--text`, `--number`, `--action`), `bsit-scanned-items__cell` (plus `--code`, `--field`, `--action`), `bsit-scanned-items__code`, `bsit-scanned-items__toggle`, `bsit-scanned-items__label`, `bsit-scanned-items__label-code`, `bsit-scanned-items__input` (plus `--text`, `--number`), `bsit-scanned-items__delete`

The machine-readable lists are in `src/styles/publicApi.ts` and are checked by tests.

### State attributes

States are exposed as `data-` attributes instead of modifier classes:

- `.bsit-camera-view__frame[data-state="scanning" | "success"]`
- `.bsit-scanned-items__cell--code[data-expanded="true" | "false"]` (whether the full code is showing)

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