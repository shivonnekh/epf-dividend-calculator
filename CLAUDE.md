# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server at http://localhost:5173
npm run build     # Production build → dist/
npm run preview   # Preview the production build locally
```

No test runner is configured. There is no linter configured — rely on the build succeeding as the correctness check.

After any change, always confirm `npm run build` exits cleanly before committing.

## Git Workflow

Every change must be committed and pushed to GitHub (`origin/main`):

```bash
git add <specific files>          # never git add -A blindly
git commit -m "type: description"
git push
```

Commit message types: `feat`, `fix`, `refactor`, `style`, `docs`.

## Architecture

State-managed single-page app with no router — navigation is driven by a `view` string in context.

### Data flow

```
AppContext (src/context/AppContext.jsx)
  └─ holds: { data, darkMode, view, selectedPersonId, selectedYear }
  └─ exposes: all CRUD actions + navigate* helpers
  └─ persists: localStorage keys "epf-calculator-v1" and "epf-dark-mode"

App.jsx
  └─ renders one of: <Dashboard> | <PersonDetail> | <YearView>
     based on context.view
```

### Data shape (localStorage)

```js
{
  persons: [{
    id: string,           // uuid
    name: string,
    years: [{
      year: number,
      openingBalance: number,
      annualRate: number,   // e.g. 5.50 (percent, NOT decimal)
      contributions: { 1: number, ..., 12: number }  // keys are month numbers as strings
    }]
  }]
}
```

### Calculation engine (`src/utils/calculations.js`)

This is the core business logic — treat it carefully.

**EPF Monthly Rest formula:**
- `monthlyRate = annualRate / 100 / 12`
- January's balance used for dividend = `openingBalance`
- Month M's balance used for dividend = month M-1 closing balance
- Month M closing balance = month M opening balance + month M contribution *(dividend NOT included yet)*
- `yearClosingBalance = December closing balance + totalAnnualDividend`

Dividends are credited at **year-end**, not monthly. Contributions in month M affect dividends only from month M+1 onwards.

All rounding uses `round2` (2 dp) and `round4` (4 dp) helpers with `Number.EPSILON` to avoid floating point drift. Never replace these with `toFixed()` alone.

### Styling conventions

Tailwind utility-first. Reusable component classes are defined in `src/index.css` under `@layer components`:

| Class | Usage |
|---|---|
| `.card` | White/dark card with border and rounded corners |
| `.btn-primary` | Blue filled button |
| `.btn-secondary` | Gray button |
| `.btn-danger` | Red button |
| `.input-field` | Styled text/number input |
| `.label` | Form field label |
| `.stat-label` / `.stat-value` | Dashboard stat display |

Dark mode is Tailwind's `class` strategy — toggled by adding/removing `dark` on `<html>`. Always pair light and dark variants: `bg-white dark:bg-gray-800`.

`gray-750` is a custom Tailwind color (`#374151`) defined in `tailwind.config.js` — use it for alternating table rows in dark mode.

### Export utilities

- `src/utils/exportPDF.js` — uses `jsPDF` + `jspdf-autotable`. Import as `import autoTable from 'jspdf-autotable'` and call `autoTable(doc, {...})`.
- `src/utils/exportCSV.js` — generates UTF-8 BOM CSV and triggers a browser download via a temporary `<a>` element.

Both utilities call `calculateYearData` directly — they do not receive pre-calculated results.

### Component responsibilities

| Component | Responsibility |
|---|---|
| `Dashboard.jsx` | Person list, add/edit/delete person. Exports `ConfirmDialog` for reuse. |
| `PersonDetail.jsx` | Year list for one person, per-year summary stats |
| `YearView.jsx` | Monthly table with inline `EditableCell`, rate scenario panel, chart toggle |
| `Charts.jsx` | Three Recharts charts; receives `monthData` array from `calculateYearData` |
| `AddYearModal.jsx` | Auto-fills opening balance from previous year's closing balance via `calculateYearData` |
