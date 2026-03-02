import { useState, useMemo, useRef, useEffect } from 'react'
import {
  Download, FileText, BarChart2, Edit3, Info,
  TrendingUp, ChevronDown, Check, X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateYearData, calculateScenarios, MONTH_NAMES } from '../utils/calculations'
import { formatRM, formatPercent } from '../utils/formatters'
import { exportYearPDF } from '../utils/exportPDF'
import { exportYearCSV } from '../utils/exportCSV'
import Charts from './Charts'

const SCENARIO_RATES = [5.50, 6.00, 6.30, 6.50]

export default function YearView() {
  const { currentPerson, selectedPersonId, selectedYear, updateYear, updateContribution } = useApp()

  const [showCharts, setShowCharts] = useState(false)
  const [activeScenario, setActiveScenario] = useState(null) // null = use actual rate
  const [editingRate, setEditingRate] = useState(false)
  const [editingOB, setEditingOB] = useState(false)

  const yearData = currentPerson?.years.find(y => y.year === selectedYear)

  const displayRate = activeScenario !== null ? activeScenario : yearData?.annualRate ?? 5.5

  const calc = useMemo(() => {
    if (!yearData) return null
    return calculateYearData(yearData.openingBalance, displayRate, yearData.contributions)
  }, [yearData, displayRate])

  const scenarios = useMemo(() => {
    if (!yearData) return []
    return calculateScenarios(yearData.openingBalance, yearData.contributions, SCENARIO_RATES)
  }, [yearData])

  if (!yearData || !calc) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            Year {selectedYear}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">{currentPerson.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowCharts(v => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showCharts
                ? 'bg-blue-600 text-white'
                : 'btn-secondary'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Charts
          </button>
          <button onClick={() => exportYearCSV(currentPerson, yearData)} className="btn-secondary">
            <Download className="w-4 h-4" />
            CSV
          </button>
          <button onClick={() => exportYearPDF(currentPerson, yearData)} className="btn-primary">
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <SummaryCard
          label="Opening Balance"
          value={formatRM(yearData.openingBalance)}
          onEdit={() => setEditingOB(true)}
          highlight="blue"
        />
        <SummaryCard
          label={`Annual Rate${activeScenario !== null ? ' (scenario)' : ''}`}
          value={`${displayRate}%`}
          subtext={activeScenario !== null ? `Actual: ${yearData.annualRate}%` : undefined}
          onEdit={activeScenario === null ? () => setEditingRate(true) : undefined}
          highlight={activeScenario !== null ? 'orange' : 'default'}
        />
        <SummaryCard
          label="Total Dividend"
          value={formatRM(calc.totalDividend)}
          highlight="green"
        />
        <SummaryCard
          label="Closing Balance"
          value={formatRM(calc.yearClosingBalance)}
          highlight="blue"
        />
      </div>

      {/* Additional stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="card p-3">
          <p className="stat-label">Avg Monthly Balance</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatRM(calc.avgBalance)}</p>
        </div>
        <div className="card p-3">
          <p className="stat-label">Effective Return</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatPercent(calc.effectiveReturn)}</p>
        </div>
        <div className="card p-3">
          <p className="stat-label">Total Contributions</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatRM(calc.totalContributions)}</p>
        </div>
        <div className="card p-3">
          <p className="stat-label">Monthly Rate</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{(displayRate / 12).toFixed(4)}%</p>
        </div>
      </div>

      {/* Scenario panel */}
      <ScenarioPanel
        scenarios={scenarios}
        actualRate={yearData.annualRate}
        activeScenario={activeScenario}
        onSelect={setActiveScenario}
      />

      {/* Charts */}
      {showCharts && (
        <div className="mb-6">
          <Charts monthData={calc.monthData} />
        </div>
      )}

      {/* Monthly table */}
      <MonthlyTable
        yearData={yearData}
        calc={calc}
        onUpdateContribution={(month, val) => updateContribution(selectedPersonId, selectedYear, month, val)}
        onUpdateOpeningBalance={(val) => updateYear(selectedPersonId, selectedYear, { openingBalance: val })}
      />

      {/* Info note */}
      <div className="mt-4 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-700">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
        <p>
          <strong>EPF Monthly Rest Method:</strong> Each month's dividend is based on the opening balance for that month.
          Contributions made in month M only affect dividends from month M+1 onwards.
          The total annual dividend is credited to your account at year-end.
        </p>
      </div>

      {/* Edit modals */}
      {editingOB && (
        <EditFieldModal
          title="Edit Opening Balance"
          label="Opening Balance (RM)"
          value={String(yearData.openingBalance)}
          type="number"
          onSave={val => {
            updateYear(selectedPersonId, selectedYear, { openingBalance: Math.max(0, parseFloat(val) || 0) })
            setEditingOB(false)
          }}
          onClose={() => setEditingOB(false)}
        />
      )}

      {editingRate && (
        <EditRateModal
          value={yearData.annualRate}
          onSave={val => {
            updateYear(selectedPersonId, selectedYear, { annualRate: Math.max(0, parseFloat(val) || 0) })
            setActiveScenario(null)
            setEditingRate(false)
          }}
          onClose={() => setEditingRate(false)}
        />
      )}
    </div>
  )
}

// ── Summary Card ───────────────────────────────────────────────────────────────

function SummaryCard({ label, value, subtext, onEdit, highlight = 'default' }) {
  const bg = {
    default: 'card',
    blue:    'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl',
    green:   'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl',
    orange:  'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl',
  }[highlight]

  const textColor = {
    default: 'text-gray-900 dark:text-white',
    blue:    'text-blue-700 dark:text-blue-300',
    green:   'text-green-700 dark:text-green-300',
    orange:  'text-orange-700 dark:text-orange-300',
  }[highlight]

  const labelColor = {
    default: 'text-gray-500 dark:text-gray-400',
    blue:    'text-blue-600 dark:text-blue-400',
    green:   'text-green-600 dark:text-green-400',
    orange:  'text-orange-600 dark:text-orange-400',
  }[highlight]

  return (
    <div className={`${bg} p-4`}>
      <div className="flex items-center justify-between mb-1">
        <p className={`text-xs font-medium uppercase tracking-wide ${labelColor}`}>{label}</p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Edit"
          >
            <Edit3 className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className={`text-lg font-bold ${textColor}`}>{value}</p>
      {subtext && <p className="text-xs text-orange-500 dark:text-orange-400 mt-0.5">{subtext}</p>}
    </div>
  )
}

// ── Scenario Panel ─────────────────────────────────────────────────────────────

function ScenarioPanel({ scenarios, actualRate, activeScenario, onSelect }) {
  return (
    <div className="card p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Dividend Rate Scenarios
        </p>
        {activeScenario !== null && (
          <button
            onClick={() => onSelect(null)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" />
            Reset to actual
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Actual rate button */}
        <button
          onClick={() => onSelect(null)}
          className={`rounded-xl p-3 text-left transition-all border ${
            activeScenario === null
              ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
          }`}
        >
          <div className="text-xs font-medium mb-1 opacity-70">Actual Rate</div>
          <div className="font-bold text-sm">{actualRate}%</div>
        </button>

        {scenarios.map(s => (
          <button
            key={s.rate}
            onClick={() => onSelect(s.rate === actualRate ? null : s.rate)}
            className={`rounded-xl p-3 text-left transition-all border ${
              activeScenario === s.rate
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="text-xs font-medium mb-1 opacity-70">@ {s.rate}%</div>
            <div className="font-bold text-sm">{formatRM(s.totalDividend)}</div>
            <div className="text-xs opacity-70 mt-0.5">Close: {formatRM(s.yearClosingBalance)}</div>
          </button>
        ))}
      </div>

      {activeScenario !== null && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <TrendingUp className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Viewing scenario at <strong>{activeScenario}%</strong>.
          Dividend would be <strong>{formatRM(scenarios.find(s => s.rate === activeScenario)?.totalDividend)}</strong>,
          closing balance <strong>{formatRM(scenarios.find(s => s.rate === activeScenario)?.yearClosingBalance)}</strong>.
          <span className="text-blue-500 dark:text-blue-400 ml-1">(Read-only — actual rate unchanged)</span>
        </div>
      )}
    </div>
  )
}

// ── Monthly Table ──────────────────────────────────────────────────────────────

function MonthlyTable({ yearData, calc, onUpdateContribution, onUpdateOpeningBalance }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Monthly Breakdown</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">Click cells to edit contributions</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-28">Month</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Opening Balance
                <span className="block normal-case font-normal text-gray-400 text-xs">(Balance for Div)</span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contribution
                <span className="block normal-case font-normal text-gray-400 text-xs">(editable)</span>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dividend</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Closing Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {calc.monthData.map((m, idx) => (
              <tr
                key={m.month}
                className={`table-row-hover ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-750/30'}`}
              >
                <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200">{m.monthName}</td>

                {/* Opening balance — editable only for Jan (= year opening balance) */}
                <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300">
                  {m.month === 1 ? (
                    <EditableCell
                      value={yearData.openingBalance}
                      onChange={onUpdateOpeningBalance}
                      highlight
                    />
                  ) : (
                    <span>{formatRM(m.openingBalance)}</span>
                  )}
                </td>

                {/* Contribution — always editable */}
                <td className="px-4 py-2.5 text-right">
                  <EditableCell
                    value={yearData.contributions[m.month] ?? 0}
                    onChange={val => onUpdateContribution(m.month, val)}
                  />
                </td>

                <td className="px-4 py-2.5 text-right text-green-600 dark:text-green-400 font-medium tabular-nums">
                  {formatRM(m.dividend)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                  {formatRM(m.closingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-blue-50 to-blue-50/50 dark:from-blue-900/20 dark:to-transparent border-t-2 border-blue-200 dark:border-blue-800">
              <td className="px-4 py-3 font-bold text-gray-900 dark:text-white" colSpan={2}>
                Year-End Total
              </td>
              <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white tabular-nums">
                {formatRM(calc.totalContributions)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400 tabular-nums">
                {formatRM(calc.totalDividend)}
              </td>
              <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                {formatRM(calc.yearClosingBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

// ── Editable Cell ──────────────────────────────────────────────────────────────

function EditableCell({ value, onChange, highlight = false }) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function startEdit() {
    setInput(String(value ?? 0))
    setEditing(true)
  }

  function commit() {
    setEditing(false)
    const n = parseFloat(input)
    if (!isNaN(n) && n >= 0) onChange(n)
  }

  function handleKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setEditing(false) }
    if (e.key === 'Tab') { commit() }
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        value={input}
        onChange={e => setInput(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        className="w-28 text-right border-2 border-blue-500 rounded-lg px-2 py-0.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none text-sm tabular-nums"
      />
    )
  }

  return (
    <button
      onClick={startEdit}
      className={`text-right rounded px-2 py-0.5 transition-colors group w-full max-w-full tabular-nums ${
        highlight
          ? 'font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
          : 'text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
      }`}
      title="Click to edit"
    >
      {formatRM(value)}
    </button>
  )
}

// ── Edit Field Modal ───────────────────────────────────────────────────────────

function EditFieldModal({ title, label, value, type = 'text', onSave, onClose }) {
  const [input, setInput] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  function handleSubmit(e) {
    e.preventDefault()
    onSave(input)
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm fade-in p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">{label}</label>
            <input
              ref={inputRef}
              type={type}
              step="0.01"
              min="0"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">Cancel</button>
            <button type="submit" className="flex-1 btn-primary justify-center"><Check className="w-4 h-4" /> Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditRateModal({ value, onSave, onClose }) {
  const [rate, setRate] = useState(String(value))

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm fade-in p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Edit Annual Dividend Rate</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Annual Rate (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="20"
              value={rate}
              onChange={e => setRate(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>
          {/* Quick presets */}
          <div className="grid grid-cols-4 gap-2">
            {['5.00', '5.50', '6.00', '6.30'].map(r => (
              <button
                key={r}
                onClick={() => setRate(r)}
                className={`py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  rate === r ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {r}%
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Historical EPF rates: 2023 (5.50%), 2022 (5.35%), 2021 (6.10%)
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium">Cancel</button>
            <button onClick={() => onSave(rate)} className="flex-1 btn-primary justify-center"><Check className="w-4 h-4" /> Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}
