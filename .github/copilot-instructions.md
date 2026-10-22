# Project context

- React + TypeScript + Vite app, used as a Jotform custom iFrame widget and hosted on GitHub Pages.
- Scans barcodes and QR codes with react-zxing. Each scan adds a row; extra columns are configured through the Jotform widget setting "columns".
- Main code is in src/components/BarcodeScanner/. BarcodeScanner.tsx owns the state; CameraView, ScannerControls and ScannedItemsTable are presentational components.
- Styling: plain CSS with BEM class names. No inline styles. 1rem = 10px (html font-size is 62.5%).
- Must keep working standalone (outside Jotform); all Jotform calls go through getJotform() in jotform.ts.

# Conventions

- Keep changes small and focused on the request.
- Don't add dependencies without asking.
- Run npm run build after changes to check types.