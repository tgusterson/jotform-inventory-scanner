# Project context

- React + TypeScript + Vite app, used as a Jotform custom iFrame widget and hosted on GitHub Pages.
- Scans barcodes and QR codes with react-zxing. Each scan adds a row; extra columns are configured through the Jotform widget setting "columns".
- UI is in src/BarcodeScanner/; non-UI logic (reducer, submission format, Jotform wrapper, types) is in src/lib/. The "columns" setting is one column per line (`Label; number; required; default=1; min=1; max=9; pattern=\d+; message=...`, plus the old `Label:number=1` syntax) and is parsed by parseConfig() in src/lib/parseConfig.ts into a WidgetConfig ({ columns }) plus a list of config errors, which BarcodeScanner shows in a banner. JSON is not supported because Jotform corrupts settings that look like JSON. Patterns are written with single backslashes and compiled with compilePattern() (full match). Column rules are checked by validateItems()/validateValue() in src/lib/validation.ts (never the scanned code); the result drives field errors and the `valid` flag sent on submit. main.tsx renders BarcodeScanner directly. BarcodeScanner.tsx owns the state; CameraView, ScannerControls and ScannedItemsTable are presentational components.
- Styling: plain CSS with BEM class names. No inline styles. 1rem = 10px (html font-size is 62.5%).
- Styling rules: every class uses the `bsit-` prefix and BEM; all component CSS is inside `@layer bsit` (reset in `@layer bsit-reset`); use `--bsit-` tokens from src/styles/tokens.css instead of hard-coded colours, fonts, radii or repeated spacing; states use `data-` attributes, not modifier classes; no `!important`. Public classes and tokens must not be renamed or removed without updating src/styles/publicApi.ts and the README Styling section (it is a breaking change).
- Must keep working standalone (outside Jotform); all Jotform calls go through getJotform() in jotform.ts.

# Conventions

- Keep changes small and focused on the request.
- Don't add dependencies without asking.
- Run npm run build after changes to check types.