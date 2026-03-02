# EPF Dividend Calculator 🇲🇾

A fully-featured Malaysia KWSP/EPF dividend calculator using the **Monthly Rest Method**.
No backend, no accounts — everything is stored in your browser's localStorage.

---

## Features

- **Multi-profile support** — Track EPF for multiple people (Person A, Person B, etc.), each fully isolated
- **Year-by-year breakdown** — Opening balance, dividend rate, 12-month contributions, auto-calculated dividends
- **Accurate EPF calculation** — Monthly Rest Method: contributions in month M only affect dividends from month M+1
- **Editable inline** — Click any contribution or opening balance cell to edit it instantly
- **Rate scenarios** — Toggle between 5.50%, 6.00%, 6.30%, 6.50% to compare outcomes without saving
- **Charts** — Balance growth line chart, monthly dividend bar chart, contributions vs dividend bar chart
- **Export to PDF** — Professionally formatted report with summary boxes and monthly table
- **Export to CSV** — Full monthly breakdown + summary, Excel-compatible with BOM
- **Export all years** — Single CSV with all years summarised for a person
- **Dark mode** — Persisted toggle in the header
- **Fully responsive** — Works on mobile, tablet, and desktop

---

## Calculation Method

```
Monthly Rate = Annual Rate ÷ 12 ÷ 100

For each month (Jan → Dec):
  Balance Used for Dividend  = Previous month's closing balance (or opening balance for Jan)
  Monthly Dividend           = Balance Used × Monthly Rate
  Month-end Balance          = Balance Used + This Month's Contribution

Total Annual Dividend = Sum of all 12 monthly dividends
Year Closing Balance  = December month-end balance + Total Annual Dividend
```

> Dividends are credited at year-end — not monthly.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or newer
- npm (comes with Node.js)

### Install & Run

```bash
# 1. Navigate to the project folder
cd epf-calculator

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Then open **http://localhost:5173** in your browser.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

The built files will be in the `dist/` folder — ready to deploy to any static host (Netlify, Vercel, GitHub Pages, etc.).

---

## Project Structure

```
epf-calculator/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Root app with view routing
    ├── index.css             # Tailwind + custom component styles
    ├── context/
    │   └── AppContext.jsx    # Global state + localStorage persistence
    ├── utils/
    │   ├── calculations.js   # EPF Monthly Rest calculation engine
    │   ├── formatters.js     # RM currency + number formatting
    │   ├── exportPDF.js      # jsPDF report generation
    │   └── exportCSV.js      # CSV download helpers
    └── components/
        ├── Header.jsx        # Sticky nav with breadcrumb + dark mode
        ├── Dashboard.jsx     # Profile list + add/edit/delete
        ├── PersonModal.jsx   # Add/edit profile modal
        ├── PersonDetail.jsx  # Year list for a person
        ├── AddYearModal.jsx  # Add year with auto-fill + duplicate contrib
        ├── YearView.jsx      # Monthly table + editable cells + scenario panel
        └── Charts.jsx        # Recharts line, bar, grouped bar charts
```

---

## Tech Stack

| Library | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 5 | Build tool & dev server |
| Tailwind CSS 3 | Utility-first styling |
| Recharts | Charts |
| jsPDF + autoTable | PDF export |
| lucide-react | Icons |
| uuid | Unique profile IDs |

---

## Tips

- **Opening balance for a new year** is auto-filled from the previous year's closing balance
- **Duplicate contributions** from the previous year when adding a new year to save time
- **Scenario panel** lets you compare 4 different dividend rates without changing your saved data
- **All data lives in localStorage** — clearing browser data will erase it. Use CSV export to back up.
