# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

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