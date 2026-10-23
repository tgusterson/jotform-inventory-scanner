# Project context

- React + TypeScript + Vite app, used as a Jotform custom iFrame widget and hosted on GitHub Pages.
- Scans barcodes and QR codes with react-zxing. Each scan adds a row; extra columns are configured through the Jotform widget setting "columns".
- UI is in src/BarcodeScanner/; non-UI logic is in src/lib/ (see the file map below). The "columns" setting is one column per line (`Label; number; required; default=1; min=1; max=9; pattern=\d+; message=...`, plus the old `Label:number=1` syntax) and is parsed by parseConfig() into a WidgetConfig ({ columns }) plus a list of config errors, which BarcodeScanner shows in a banner. JSON is not supported because Jotform corrupts settings that look like JSON. Patterns are written with single backslashes and compiled with compilePattern() (full match). Column rules are checked by validateItems()/validateValue() (never the scanned code); the result drives field errors and the `valid` flag sent on submit. BarcodeScanner.tsx owns the state; CameraView, ScannerControls and ScannedItemsTable are presentational components.
- Styling: plain CSS with BEM class names. No inline styles. 1rem = 10px (html font-size is 62.5%).
- Styling rules: every class uses the `bsit-` prefix and BEM; all component CSS is inside `@layer bsit` (reset in `@layer bsit-reset`); use `--bsit-` tokens from src/styles/tokens.css instead of hard-coded colours, fonts, radii or repeated spacing; states use `data-` attributes, not modifier classes; no `!important`. Public classes and tokens must not be renamed or removed without updating src/styles/publicApi.ts and the README Styling section (it is a breaking change).
- Must keep working standalone (outside Jotform); all Jotform calls go through getJotform() in jotform.ts.

# File map

There is no src/components/ folder. UI lives in src/BarcodeScanner/, logic in src/lib/. Tests sit beside the file they test (`*.test.ts` / `*.test.tsx`).

Rules:

- UI components (React, CSS) go in src/BarcodeScanner/.
- Pure logic goes in src/lib/, with a test file beside it.
- Every new file must be added to this map in the same change.

src/ (top level)

- main.tsx: entry point; calls bootstrap() and renders BarcodeScanner with the config, config errors and saved value.
- index.css: global reset (`@layer bsit-reset`) and the layer order.
- test/setup.ts: Vitest setup.

src/BarcodeScanner/

- BarcodeScanner.tsx: owns the scan state, config error banner, memoised validation, Jotform submit handler and frame resizing.
- BarcodeScanner.css: layout and config error banner styles.
- CameraView.tsx / CameraView.css: camera preview with react-zxing, scan frame and code detection.
- isBoxInsideFrame.ts: checks a detected barcode box lies inside the on-screen scan frame.
- ScannerControls.tsx / ScannerControls.css: open camera and clear all buttons.
- ScannedItemsTable.tsx / ScannedItemsTable.css: editable rows (cards below 600px, CSS grid from 600px with tracks from buildGridColumns), field errors, required marker, touched-on-blur tracking, `<form noValidate>`.

src/lib/

- types.ts: shared types (ColumnConfig, WidgetConfig, ScannedItem, ParsedSubmission).
- columns.ts: DEFAULT_COLUMNS, used when the setting is blank or has no valid columns.
- parseConfig.ts: parses the "columns" setting into a WidgetConfig plus a list of config errors.
- columnKey.ts: builds unique column keys from labels (toKey, uniqueKey).
- gridColumns.ts: buildGridColumns() builds the table's grid-template-columns from each column's width (narrow/normal/wide).
- pattern.ts: compilePattern(), full-match regex compiler that returns null for invalid patterns.
- validation.ts: validateValue() and validateItems() for column rules, with a compiled-pattern cache.
- itemsReducer.ts: reducer for adding, editing, deleting and clearing scanned items.
- submissionFormat.ts: formats items into the submitted value and parses a saved value back into rows.
- legacyFormats.ts: parsers for older submission formats, so old saved values still restore.
- findColumn.ts: finds a column by label (exact, then case-insensitive).
- jotform.ts: typed wrapper around the Jotform widget API; getJotform() is the only entry point.
- bootstrap.ts: waits for Jotform's ready event, reads the "columns" setting and saved value, and renders.
- debug.ts: log() helper controlled by the DEBUG flag.

src/styles/

- tokens.css: `--bsit-` design tokens.
- publicApi.ts: PUBLIC_CLASSES and PUBLIC_TOKENS, the public styling contract.
- publicApi.test.tsx: checks every public class is rendered.

# Conventions

- Keep changes small and focused on the request.
- Don't add dependencies without asking.
- Run npm run build after changes to check types.