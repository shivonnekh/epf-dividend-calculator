import { useState, useEffect } from 'react'
import { X, Calendar, Percent, DollarSign, Copy } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { calculateYearData } from '../utils/calculations'
import { formatRM } from '../utils/formatters'

const PRESET_RATES = ['5.50', '6.00', '6.30']
const THIS_YEAR = new Date().getFullYear()

export default function AddYearModal({ person, onClose }) {
  const { addYear, selectedPersonId } = useApp()

  const existingYears = person.years.map(y => y.year)
  const sortedYears = [...person.years].sort((a, b) => a.year - b.year)
  const lastYear = sortedYears[sortedYears.length - 1] ?? null

  // Suggest the next year
  const suggestedYear = lastYear ? lastYear.year + 1 : THIS_YEAR

  const [yearInput, setYearInput] = useState(String(suggestedYear))
  const [openingBalance, setOpeningBalance] = useState('')
  const [annualRate, setAnnualRate] = useState('5.50')
  const [duplicateContrib, setDuplicateContrib] = useState(false)
  const [error, setError] = useState('')

  // Auto-fill opening balance from previous year closing
  useEffect(() => {
    const y = parseInt(yearInput)
    if (isNaN(y)) return
    const prevYear = person.years.find(yr => yr.year === y - 1)
    if (prevYear) {
      const calc = calculateYearData(prevYear.openingBalance, prevYear.annualRate, prevYear.contributions)
      setOpeningBalance(String(calc.yearClosingBalance))
    }
  }, [yearInput, person.years])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const yearNum = parseInt(yearInput)
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > 2100) {
      setError('Please enter a valid year (1990 – 2100)')
      return
    }
    if (existingYears.includes(yearNum)) {
      setError(`Year ${yearNum} already exists for this profile`)
      return
    }

    const ob = Math.max(0, parseFloat(openingBalance) || 0)
    const rate = Math.max(0, parseFloat(annualRate) || 5.50)

    // Build contributions
    let contributions = {}
    if (duplicateContrib && lastYear) {
      contributions = { ...lastYear.contributions }
    } else {
      for (let m = 1; m <= 12; m++) contributions[m] = 0
    }

    addYear(selectedPersonId, {
      year: yearNum,
      openingBalance: ob,
      annualRate: rate,
      contributions,
    })

    onClose()
  }

  // Calculate preview
  const prevYear = person.years.find(y => y.year === parseInt(yearInput) - 1)
  const suggestedOB = prevYear
    ? calculateYearData(prevYear.openingBalance, prevYear.annualRate, prevYear.contributions).yearClosingBalance
    : null

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Add New Year</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">

          {/* Year */}
          <div>
            <label className="label" htmlFor="year-input">
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              Year
            </label>
            <input
              id="year-input"
              type="number"
              value={yearInput}
              onChange={e => { setYearInput(e.target.value); setError('') }}
              className="input-field"
              placeholder="e.g. 2025"
              min="1990"
              max="2100"
              autoFocus
            />
          </div>

          {/* Opening Balance */}
          <div>
            <label className="label" htmlFor="opening-balance">
              <DollarSign className="w-3.5 h-3.5 inline mr-1" />
              Opening Balance (RM)
            </label>
            <input
              id="opening-balance"
              type="number"
              step="0.01"
              min="0"
              value={openingBalance}
              onChange={e => setOpeningBalance(e.target.value)}
              placeholder="0.00"
              className="input-field"
            />
            {suggestedOB !== null && (
              <div className="mt-1.5 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Auto-filled from {parseInt(yearInput) - 1} closing balance
                </p>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                  {formatRM(suggestedOB)}
                </span>
              </div>
            )}
          </div>

          {/* Annual Rate */}
          <div>
            <label className="label">
              <Percent className="w-3.5 h-3.5 inline mr-1" />
              Annual Dividend Rate (%)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="20"
              value={annualRate}
              onChange={e => setAnnualRate(e.target.value)}
              className="input-field"
            />
            {/* Quick-select presets */}
            <div className="flex gap-2 mt-2">
              {PRESET_RATES.map(rate => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setAnnualRate(rate)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    annualRate === rate
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
          </div>

          {/* Duplicate contributions */}
          {lastYear && (
            <label className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800">
              <input
                type="checkbox"
                checked={duplicateContrib}
                onChange={e => setDuplicateContrib(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                  <Copy className="w-3.5 h-3.5 text-blue-500" />
                  Copy contributions from {lastYear.year}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Duplicates all 12 monthly contribution amounts
                </p>
              </div>
            </label>
          )}

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button type="submit" className="flex-1 btn-primary justify-center">
              Add Year
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
