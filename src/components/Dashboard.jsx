import { useState } from 'react'
import { Plus, Edit2, Trash2, TrendingUp, ArrowUpRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateYearData } from '../utils/calculations'
import { formatRM } from '../utils/formatters'
import PersonModal from './PersonModal'

function computePortfolioBalance(persons) {
  return persons.reduce((sum, person) => {
    if (!person.years.length) return sum
    const latest = [...person.years].sort((a, b) => b.year - a.year)[0]
    const calc = calculateYearData(latest.openingBalance, latest.annualRate, latest.contributions)
    return sum + calc.yearClosingBalance
  }, 0)
}

export default function Dashboard() {
  const { data, navigateToPerson, deletePerson } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editPerson, setEditPerson] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const totalYears = data.persons.reduce((s, p) => s + p.years.length, 0)
  const portfolioBalance = computePortfolioBalance(data.persons)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10">
        <div>
          <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-amber-500 dark:text-amber-400 mb-2.5">
            Malaysia KWSP · Monthly Rest Method
          </p>
          <h1 className="font-display text-4xl sm:text-5xl text-slate-900 dark:text-white leading-[1.05]">
            EPF Dividend<br className="hidden xs:block" /> Calculator
          </h1>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2.5 tracking-wide">
            Precision dividend tracking across all profiles
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-gold shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          New Profile
        </button>
      </div>

      {/* Portfolio overview panel */}
      {data.persons.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden mb-10 shadow-sm">
          <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <div className="w-1 h-3.5 rounded-full bg-amber-500 dark:bg-amber-400" />
            <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-slate-400 dark:text-slate-500">
              Portfolio Overview
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 dark:divide-slate-800">
            <div className="px-6 py-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-400 dark:text-slate-500 mb-1.5">
                Combined Balance
              </p>
              <p className="font-display text-2xl sm:text-3xl text-amber-600 dark:text-amber-400 leading-none">
                {formatRM(portfolioBalance)}
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-400 dark:text-slate-500 mb-1.5">
                Profiles
              </p>
              <p className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-white leading-none">
                {data.persons.length}
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-400 dark:text-slate-500 mb-1.5">
                Years Tracked
              </p>
              <p className="font-display text-2xl sm:text-3xl text-slate-900 dark:text-white leading-none">
                {totalYears}
              </p>
            </div>
            <div className="px-6 py-5">
              <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-400 dark:text-slate-500 mb-1.5">
                Calculation
              </p>
              <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 mt-1 tracking-wide">
                Monthly Rest
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Person grid */}
      {data.persons.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.persons.map((person, index) => (
            <PersonCard
              key={person.id}
              person={person}
              index={index}
              onOpen={() => navigateToPerson(person.id)}
              onEdit={() => setEditPerson(person)}
              onDelete={() => setDeleteConfirm(person)}
            />
          ))}

          {/* Add new tile */}
          <button
            onClick={() => setShowAdd(true)}
            className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700/70 hover:border-amber-400 dark:hover:border-amber-500/60 transition-all hover:bg-amber-50/50 dark:hover:bg-amber-900/10 p-10 min-h-[200px]"
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600 group-hover:border-amber-400 dark:group-hover:border-amber-500 flex items-center justify-center transition-colors text-slate-400 dark:text-slate-500 group-hover:text-amber-500 dark:group-hover:text-amber-400">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
              Add Profile
            </span>
          </button>
        </div>
      )}

      {/* Delete confirm dialog */}
      {deleteConfirm && (
        <ConfirmDialog
          title={`Delete "${deleteConfirm.name}"?`}
          message="This will permanently delete this profile and all its yearly data. This cannot be undone."
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={() => { deletePerson(deleteConfirm.id); setDeleteConfirm(null) }}
        />
      )}

      {(showAdd || editPerson) && (
        <PersonModal
          person={editPerson}
          onClose={() => { setShowAdd(false); setEditPerson(null) }}
        />
      )}
    </div>
  )
}

function PersonCard({ person, index, onOpen, onEdit, onDelete }) {
  const sortedYears = [...person.years].sort((a, b) => b.year - a.year)
  const latestYear = sortedYears[0]

  let latestBalance = null
  if (latestYear) {
    const calc = calculateYearData(latestYear.openingBalance, latestYear.annualRate, latestYear.contributions)
    latestBalance = calc.yearClosingBalance
  }

  const initials = person.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const yearRangeStr = person.years.length > 0
    ? person.years[0].year + (person.years.length > 1 ? `–${person.years[person.years.length - 1].year}` : '')
    : null

  return (
    <div
      className="card-premium group cursor-pointer"
      style={{ animationDelay: `${index * 55}ms` }}
      onClick={onOpen}
    >
      {/* Amber top stripe */}
      <div className="h-[2px] bg-gradient-to-r from-amber-500 via-amber-400/60 to-transparent dark:from-amber-400 dark:via-amber-500/40 rounded-t-2xl" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Monogram */}
            <div className="w-11 h-11 rounded-xl bg-slate-900 dark:bg-slate-800 flex items-center justify-center shrink-0 ring-1 ring-slate-800 dark:ring-slate-700">
              <span className="font-display text-base text-amber-400 leading-none tracking-tight">
                {initials}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 dark:text-white text-[15px] leading-tight truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                {person.name}
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {person.years.length} {person.years.length === 1 ? 'year' : 'years'}
                {yearRangeStr && (
                  <span className="ml-1 text-slate-300 dark:text-slate-600">·</span>
                )}
                {yearRangeStr && <span className="ml-1">{yearRangeStr}</span>}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
              title="Edit profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete profile"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Balance block */}
        {latestBalance !== null ? (
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl px-4 py-4 mb-4 border border-slate-100 dark:border-slate-700/50">
            <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-slate-400 dark:text-slate-500 mb-1.5">
              Latest Closing Balance
            </p>
            <p className="font-display text-[1.6rem] text-slate-900 dark:text-white leading-none">
              {formatRM(latestBalance)}
            </p>
            {latestYear && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                {latestYear.year}
                <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>
                {latestYear.annualRate}% per annum
              </p>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl px-4 py-3.5 mb-4 border border-slate-100 dark:border-slate-700/40">
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              No year data yet — add a year to begin tracking
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors flex items-center gap-1">
            View Details
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-24">
      <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-100 dark:border-amber-900/30 shadow-sm">
        <TrendingUp className="w-9 h-9 text-amber-500 dark:text-amber-400" />
      </div>
      <p className="text-[10px] font-bold tracking-[0.28em] uppercase text-amber-500 dark:text-amber-400 mb-3">
        Get Started
      </p>
      <h3 className="font-display text-4xl text-slate-900 dark:text-white mb-3 leading-tight">
        Track your EPF growth
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
        Create a profile and add your yearly opening balance, contributions, and dividend rate to calculate your KWSP dividends accurately.
      </p>
      <button onClick={onAdd} className="btn-gold mx-auto">
        <Plus className="w-4 h-4" />
        Create First Profile
      </button>
    </div>
  )
}

export function ConfirmDialog({ title, message, onCancel, onConfirm, confirmLabel = 'Delete', confirmClass = 'btn-danger' }) {
  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/60 w-full max-w-sm fade-in p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 justify-center ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
