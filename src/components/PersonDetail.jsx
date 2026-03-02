import { useState } from 'react'
import { Plus, Calendar, ChevronRight, Trash2, TrendingUp, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateYearData } from '../utils/calculations'
import { formatRM, formatPercent } from '../utils/formatters'
import { exportAllYearsCSV } from '../utils/exportCSV'
import AddYearModal from './AddYearModal'
import { ConfirmDialog } from './Dashboard'

export default function PersonDetail() {
  const { currentPerson, selectedPersonId, navigateToYear, deleteYear } = useApp()
  const [showAddYear, setShowAddYear] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  if (!currentPerson) return null

  const yearsCalc = currentPerson.years.map(y => ({
    ...y,
    calc: calculateYearData(y.openingBalance, y.annualRate, y.contributions),
  }))

  // Running total dividend across all years
  const allTimeDividend = yearsCalc.reduce((s, y) => s + y.calc.totalDividend, 0)
  const allTimeContrib = yearsCalc.reduce((s, y) => s + y.calc.totalContributions, 0)
  const latestBalance = yearsCalc.length > 0 ? yearsCalc[yearsCalc.length - 1].calc.yearClosingBalance : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {currentPerson.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            EPF Annual Summary
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {currentPerson.years.length > 0 && (
            <button
              onClick={() => exportAllYearsCSV(currentPerson)}
              className="btn-secondary"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
          )}
          <button onClick={() => setShowAddYear(true)} className="btn-primary shrink-0">
            <Plus className="w-4 h-4" />
            Add Year
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {yearsCalc.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <div className="card p-4">
            <p className="stat-label">Current Balance</p>
            <p className="stat-value text-blue-600 dark:text-blue-400">{formatRM(latestBalance)}</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">All-time Dividend</p>
            <p className="stat-value text-green-600 dark:text-green-400">{formatRM(allTimeDividend)}</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">All-time Contributions</p>
            <p className="stat-value">{formatRM(allTimeContrib)}</p>
          </div>
          <div className="card p-4">
            <p className="stat-label">Years Tracked</p>
            <p className="stat-value">{currentPerson.years.length}</p>
          </div>
        </div>
      )}

      {/* Year list */}
      {yearsCalc.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No years yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mb-6">
            Add a year with your opening balance, dividend rate and contributions to get started.
          </p>
          <button onClick={() => setShowAddYear(true)} className="btn-primary mx-auto">
            <Plus className="w-4 h-4" />
            Add First Year
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {yearsCalc.map(({ year, openingBalance, annualRate, calc }) => (
            <YearRow
              key={year}
              year={year}
              openingBalance={openingBalance}
              annualRate={annualRate}
              calc={calc}
              onOpen={() => navigateToYear(selectedPersonId, year)}
              onDelete={() => setDeleteConfirm(year)}
            />
          ))}
        </div>
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title={`Delete Year ${deleteConfirm}?`}
          message="This will permanently delete all data for this year including monthly contributions."
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => { deleteYear(selectedPersonId, deleteConfirm); setDeleteConfirm(null) }}
        />
      )}

      {showAddYear && (
        <AddYearModal person={currentPerson} onClose={() => setShowAddYear(false)} />
      )}
    </div>
  )
}

function YearRow({ year, openingBalance, annualRate, calc, onOpen, onDelete }) {
  return (
    <div
      className="card hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group cursor-pointer"
      onClick={onOpen}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Year badge */}
          <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl flex flex-col items-center justify-center shrink-0 border border-blue-100 dark:border-blue-800">
            <span className="text-blue-600 dark:text-blue-400 font-bold text-lg leading-none">{year}</span>
            <span className="text-blue-500 dark:text-blue-500 text-xs mt-0.5">{annualRate}%</span>
          </div>

          {/* Stats grid */}
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Opening Balance</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatRM(openingBalance)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Contributions</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{formatRM(calc.totalContributions)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dividend</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">{formatRM(calc.totalDividend)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Closing Balance</p>
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">{formatRM(calc.yearClosingBalance)}</p>
              </div>
            </div>

            {/* Progress bar: dividend as % of opening */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full"
                  style={{ width: `${Math.min(100, calc.effectiveReturn * 10)}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                {formatPercent(calc.effectiveReturn)} return
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onDelete() }}
              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Delete year"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>
    </div>
  )
}
