import { useRef, useState } from 'react'
import { Plus, User, ChevronRight, Edit2, Trash2, TrendingUp, Calendar, Layers, Download, Upload, AlertTriangle, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateYearData } from '../utils/calculations'
import { formatRM } from '../utils/formatters'
import { exportData, importFromFile, getLastExportDate, daysSince } from '../utils/backup'
import PersonModal from './PersonModal'

export default function Dashboard() {
  const { data, navigateToPerson, deletePerson, replaceAllData, loadStatus, dismissLoadStatus } = useApp()
  const [showAdd, setShowAdd] = useState(false)
  const [editPerson, setEditPerson] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [importConfirm, setImportConfirm] = useState(null) // { data, fileName }
  const [importError, setImportError] = useState(null)
  const [exportFlash, setExportFlash] = useState(false)
  const fileInputRef = useRef(null)

  const totalYears = data.persons.reduce((s, p) => s + p.years.length, 0)
  const lastExport = getLastExportDate()
  const staleExport = lastExport ? daysSince(lastExport) >= 7 : data.persons.length > 0

  function handleExport() {
    exportData(data)
    setExportFlash(true)
    setTimeout(() => setExportFlash(false), 2000)
  }

  function handleImportClick() {
    setImportError(null)
    fileInputRef.current?.click()
  }

  async function handleFileChosen(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    try {
      const parsed = await importFromFile(file)
      setImportConfirm({ data: parsed, fileName: file.name })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.')
    }
  }

  function confirmImport() {
    if (!importConfirm) return
    replaceAllData(importConfirm.data)
    setImportConfirm(null)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Corrupt-load warning banner */}
      {loadStatus === 'corrupt' && (
        <div className="mb-6 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-800 dark:text-amber-200">Saved data was unreadable</p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              The previous data in this browser was corrupted and could not be loaded. It has been preserved
              under a backup key (check DevTools → Local Storage) but the app has started from empty state.
              If you have a <code className="text-xs">.json</code> export, use Import below.
            </p>
          </div>
          <button
            onClick={dismissLoadStatus}
            className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stale-export reminder (Safari ITP protection) */}
      {staleExport && loadStatus !== 'corrupt' && (
        <div className="mb-6 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-blue-800 dark:text-blue-200">
              {lastExport ? 'Backup is getting old' : 'No backup yet'}
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              Safari auto-deletes browser storage after 7 days of inactivity. Click <b>Export</b> to save
              a JSON file you can re-import if that happens.
            </p>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            EPF Dividend Calculator
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-0.5 text-sm">
            Malaysia KWSP — Monthly Rest Method
          </p>
          {lastExport && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Last export: {lastExport.toLocaleDateString()} ({daysSince(lastExport)}d ago)
            </p>
          )}
        </div>
        <div className="flex gap-2 shrink-0 self-start sm:self-auto flex-wrap">
          <button
            onClick={handleImportClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            title="Import from JSON backup"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={handleExport}
            disabled={data.persons.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            title={data.persons.length === 0 ? 'Nothing to export yet' : 'Download JSON backup'}
          >
            <Download className="w-4 h-4" />
            {exportFlash ? 'Exported ✓' : 'Export'}
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Add Profile
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFileChosen}
            className="hidden"
          />
        </div>
      </div>

      {/* Import error toast */}
      {importError && (
        <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-red-800 dark:text-red-200">Import failed</p>
            <p className="text-red-700 dark:text-red-300 mt-1">{importError}</p>
          </div>
          <button
            onClick={() => setImportError(null)}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats bar */}
      {data.persons.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <User className="w-4 h-4 text-blue-500" />
              <span className="stat-label !mb-0">Profiles</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.persons.length}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-green-500" />
              <span className="stat-label !mb-0">Years Tracked</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalYears}</p>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Layers className="w-4 h-4 text-purple-500" />
              <span className="stat-label !mb-0">Method</span>
            </div>
            <p className="text-sm font-bold text-gray-900 dark:text-white">Monthly Rest</p>
          </div>
        </div>
      )}

      {/* Person grid */}
      {data.persons.length === 0 ? (
        <EmptyState onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.persons.map(person => (
            <PersonCard
              key={person.id}
              person={person}
              onOpen={() => navigateToPerson(person.id)}
              onEdit={() => setEditPerson(person)}
              onDelete={() => setDeleteConfirm(person)}
            />
          ))}

          {/* Add new tile */}
          <button
            onClick={() => setShowAdd(true)}
            className="card border-dashed hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all flex flex-col items-center justify-center gap-2 p-8 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 min-h-[140px]"
          >
            <div className="w-10 h-10 rounded-full border-2 border-dashed border-current flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Add Profile</span>
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

      {/* Import confirm dialog */}
      {importConfirm && (
        <ConfirmDialog
          title="Import and replace data?"
          message={
            `"${importConfirm.fileName}" contains ${importConfirm.data.persons.length} profile${
              importConfirm.data.persons.length === 1 ? '' : 's'
            } and will REPLACE all current data in this browser. ` +
            (data.persons.length > 0
              ? `You currently have ${data.persons.length} profile${data.persons.length === 1 ? '' : 's'} — these will be overwritten. Export your current data first if you want to keep it.`
              : '')
          }
          onCancel={() => setImportConfirm(null)}
          onConfirm={confirmImport}
          confirmLabel="Import & Replace"
          confirmClass="btn-primary"
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

function PersonCard({ person, onOpen, onEdit, onDelete }) {
  // Get latest year's closing balance if available
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

  return (
    <div
      className="card hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group cursor-pointer"
      onClick={onOpen}
    >
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          {/* Avatar + name */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                {person.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {person.years.length} {person.years.length === 1 ? 'year' : 'years'} tracked
              </p>
            </div>
          </div>

          {/* Action buttons — visible on hover */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Edit profile"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Delete profile"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Stats */}
        {latestYear ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">
                Years: {person.years[0].year}
                {person.years.length > 1 ? ` – ${person.years[person.years.length - 1].year}` : ''}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                Latest: {latestYear.year} ({latestYear.annualRate}%)
              </span>
            </div>
            {latestBalance !== null && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2">
                <p className="text-xs text-blue-600 dark:text-blue-400 mb-0.5">Latest Closing Balance</p>
                <p className="font-bold text-blue-700 dark:text-blue-300 text-sm">{formatRM(latestBalance)}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400 dark:text-gray-500 italic">No years added yet</p>
        )}

        <div className="mt-3 flex items-center justify-end text-blue-600 dark:text-blue-400 text-xs font-medium">
          <span>View Details</span>
          <ChevronRight className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="text-center py-20">
      <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-5">
        <TrendingUp className="w-10 h-10 text-blue-400 dark:text-blue-500" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Start tracking your EPF
      </h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto mb-6">
        Create a profile and add your yearly opening balance, contributions, and dividend rate to calculate your KWSP dividends accurately.
      </p>
      <button onClick={onAdd} className="btn-primary mx-auto">
        <Plus className="w-4 h-4" />
        Create First Profile
      </button>
    </div>
  )
}

export function ConfirmDialog({ title, message, onCancel, onConfirm, confirmLabel = 'Delete', confirmClass = 'btn-danger' }) {
  // Close on Escape
  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm fade-in p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
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
