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
  └─ holds: { data, darkMode, view, selectedPersonId, selectedYear, cloudStatus }
  └─ exposes: all CRUD actions + navigate* helpers
  └─ persists: localStorage keys "epf-calculator-v1" and "epf-dark-mode"
  └─ syncs:    Supabase (cloud) — see "Cloud sync" below

App.jsx
  └─ renders one of: <Dashboard> | <PersonDetail> | <YearView>
     based on context.view
```

### Cloud sync (`src/lib/supabase.js`, `src/lib/epfSync.js`)

Cross-device sync: open the deployed URL on any device → same data, live.
localStorage stays as the offline fallback / cache.

**Backend = the Whaley app's Supabase project (shared, intentionally).**
- Same `app_state` table, but a dedicated row `id = 'epf-primary'`
  (Whaley only ever touches `id = 'primary'` — the rows never collide).
- RLS allows SELECT + UPDATE for any authenticated session; there is **no
  INSERT policy**. The `epf-primary` row was seeded once via SQL, so the
  client only ever UPDATEs it (never inserts). To re-seed in a fresh DB:
  ```sql
  insert into public.app_state (id, state)
  values ('epf-primary', '{"persons":[]}'::jsonb)
  on conflict (id) do nothing;
  ```
- Auth: silent anonymous sign-in (`signInAnonymously`), required by RLS.
  Auth storage key is namespaced (`epf-supabase-auth`) so it doesn't clash
  with Whaley's session in the same browser.
- Realtime: `app_state` is already in the `supabase_realtime` publication,
  so peer edits to `epf-primary` push automatically. Self-echo is filtered
  via a per-device `clientId` (`epf-client-id` in localStorage).

**Hydration rules (AppContext):**
- On load: anon sign-in → read cloud row.
  - Cloud has ≥1 person → adopt cloud as source of truth.
  - Cloud empty / just-seeded blank → push LOCAL up (seed). An empty cloud
    row NEVER wipes local data.
- On change: debounced UPDATE to cloud (600ms), skipped until initial
  hydration completes and skipped once right after applying a remote update.

**Env vars** (copy from the Whaley project — never commit real values):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` in `.env.local` (dev) and on
the Vercel project (prod). Missing env = app runs local-only, no sync.

### Deployment (Vercel)

- Live: **https://epf-calculator-rust.vercel.app** (Vercel project
  `epf-calculator`, account `shivonnekhoo` — same account as Whaley).
- Deployed via Vercel CLI, **not Git-connected**: ship changes with
  `vercel --prod` from the repo root. (To auto-deploy on push, connect the
  GitHub repo in the Vercel dashboard.)

### Data shape (localStorage + cloud blob)

The exact same `{ persons: [...] }` object is what's stored in localStorage
(`epf-calculator-v1`) AND in the Supabase `epf-primary` row's `state` column.
`validateData()` (`src/utils/backup.js`) gates every load from both sources.

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
