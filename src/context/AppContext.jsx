import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const AppContext = createContext(null)

const STORAGE_KEY = 'epf-calculator-v1'
const DARK_KEY = 'epf-dark-mode'

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { persons: [] }
}

function loadDark() {
  try {
    return localStorage.getItem(DARK_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppProvider({ children }) {
  const [data, setData] = useState(loadData)
  const [darkMode, setDarkMode] = useState(loadDark)
  // view: 'dashboard' | 'person' | 'year'
  const [view, setView] = useState('dashboard')
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)

  // Persist data
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}
  }, [data])

  // Persist + apply dark mode
  useEffect(() => {
    try { localStorage.setItem(DARK_KEY, String(darkMode)) } catch {}
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  const currentPerson = data.persons.find(p => p.id === selectedPersonId) ?? null

  // ── Navigation ───────────────────────────────────────────────────────────────

  const navigateToDashboard = useCallback(() => {
    setView('dashboard')
    setSelectedPersonId(null)
    setSelectedYear(null)
  }, [])

  const navigateToPerson = useCallback((personId) => {
    setSelectedPersonId(personId)
    setSelectedYear(null)
    setView('person')
  }, [])

  const navigateToYear = useCallback((personId, year) => {
    setSelectedPersonId(personId)
    setSelectedYear(year)
    setView('year')
  }, [])

  // ── Person CRUD ───────────────────────────────────────────────────────────────

  const addPerson = useCallback((name) => {
    const id = uuidv4()
    setData(prev => ({
      ...prev,
      persons: [...prev.persons, { id, name, years: [] }],
    }))
    return id
  }, [])

  const updatePerson = useCallback((personId, updates) => {
    setData(prev => ({
      ...prev,
      persons: prev.persons.map(p => p.id === personId ? { ...p, ...updates } : p),
    }))
  }, [])

  const deletePerson = useCallback((personId) => {
    setData(prev => ({
      ...prev,
      persons: prev.persons.filter(p => p.id !== personId),
    }))
    if (selectedPersonId === personId) {
      setView('dashboard')
      setSelectedPersonId(null)
      setSelectedYear(null)
    }
  }, [selectedPersonId])

  // ── Year CRUD ─────────────────────────────────────────────────────────────────

  const addYear = useCallback((personId, yearObj) => {
    setData(prev => ({
      ...prev,
      persons: prev.persons.map(p => {
        if (p.id !== personId) return p
        if (p.years.some(y => y.year === yearObj.year)) return p
        const newYears = [...p.years, yearObj].sort((a, b) => a.year - b.year)
        return { ...p, years: newYears }
      }),
    }))
  }, [])

  const updateYear = useCallback((personId, year, updates) => {
    setData(prev => ({
      ...prev,
      persons: prev.persons.map(p => {
        if (p.id !== personId) return p
        return {
          ...p,
          years: p.years.map(y => y.year === year ? { ...y, ...updates } : y),
        }
      }),
    }))
  }, [])

  const deleteYear = useCallback((personId, year) => {
    setData(prev => ({
      ...prev,
      persons: prev.persons.map(p => {
        if (p.id !== personId) return p
        return { ...p, years: p.years.filter(y => y.year !== year) }
      }),
    }))
    if (selectedYear === year) {
      setView('person')
      setSelectedYear(null)
    }
  }, [selectedYear])

  const updateContribution = useCallback((personId, year, month, value) => {
    setData(prev => ({
      ...prev,
      persons: prev.persons.map(p => {
        if (p.id !== personId) return p
        return {
          ...p,
          years: p.years.map(y => {
            if (y.year !== year) return y
            return {
              ...y,
              contributions: { ...y.contributions, [month]: Math.max(0, parseFloat(value) || 0) },
            }
          }),
        }
      }),
    }))
  }, [])

  return (
    <AppContext.Provider value={{
      data,
      darkMode,
      setDarkMode,
      view,
      selectedPersonId,
      selectedYear,
      currentPerson,
      navigateToDashboard,
      navigateToPerson,
      navigateToYear,
      addPerson,
      updatePerson,
      deletePerson,
      addYear,
      updateYear,
      deleteYear,
      updateContribution,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
