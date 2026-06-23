import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { validateData, performAutoBackup, shouldAutoBackupToday } from '../utils/backup'
import {
  hasSupabaseConfig,
  loadCloudState,
  saveCloudState,
  subscribeCloudState,
  makeCloudSaver,
  getClientId,
} from '../lib/epfSync'

const AppContext = createContext(null)

const STORAGE_KEY = 'epf-calculator-v1'
const DARK_KEY = 'epf-dark-mode'

/**
 * Load persisted data. If localStorage contains corrupt JSON, move it aside to a
 * timestamped backup key so it is never silently overwritten by the save effect.
 *
 * Returns { data, status } where status is 'ok' | 'empty' | 'corrupt'.
 */
function loadData() {
  let raw
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch {
    return { data: { persons: [] }, status: 'empty' }
  }

  if (!raw) {
    return { data: { persons: [] }, status: 'empty' }
  }

  try {
    const parsed = JSON.parse(raw)
    const result = validateData(parsed)
    if (result.ok) {
      return { data: result.data, status: 'ok' }
    }
    // Parsed but failed schema — treat as corrupt.
    preserveCorrupt(raw)
    return { data: { persons: [] }, status: 'corrupt' }
  } catch {
    preserveCorrupt(raw)
    return { data: { persons: [] }, status: 'corrupt' }
  }
}

function preserveCorrupt(raw) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    localStorage.setItem(`${STORAGE_KEY}-corrupt-${ts}`, raw)
    // eslint-disable-next-line no-console
    console.warn(
      `[EPF] localStorage contained invalid data. Original preserved at ` +
      `${STORAGE_KEY}-corrupt-${ts}. Starting from empty state.`
    )
  } catch {
    // Nothing we can do if localStorage is completely unavailable.
  }
}

function loadDark() {
  try {
    return localStorage.getItem(DARK_KEY) === 'true'
  } catch {
    return false
  }
}

export function AppProvider({ children }) {
  const [loadResult] = useState(loadData)
  const [data, setData] = useState(loadResult.data)
  const [darkMode, setDarkMode] = useState(loadDark)
  const [loadStatus, setLoadStatus] = useState(loadResult.status)
  // Cloud sync status: 'idle' | 'syncing' | 'saved' | 'error' | 'offline'
  const [cloudStatus, setCloudStatus] = useState(hasSupabaseConfig ? 'syncing' : 'offline')
  // view: 'dashboard' | 'person' | 'year'
  const [view, setView] = useState('dashboard')
  const [selectedPersonId, setSelectedPersonId] = useState(null)
  const [selectedYear, setSelectedYear] = useState(null)

  // ── Cloud sync plumbing ──────────────────────────────────────────────────
  const clientIdRef = useRef(null)
  const saverRef = useRef(null)
  // Block cloud writes until the initial cloud hydration completes, so the
  // stale localStorage state can't race the authoritative cloud state.
  const hydratedRef = useRef(false)
  // Skip the next save when we just applied a remote update (avoid echo).
  const suppressNextSaveRef = useRef(false)

  // Hydrate from the cloud once on mount, then subscribe to realtime updates.
  useEffect(() => {
    if (!hasSupabaseConfig) return
    let cancelled = false
    clientIdRef.current = getClientId()
    saverRef.current = makeCloudSaver(clientIdRef.current, {
      onSaving: () => setCloudStatus('syncing'),
      onSaved: () => setCloudStatus('saved'),
      onError: () => setCloudStatus('error'),
    })

    ;(async () => {
      const remote = await loadCloudState()
      if (cancelled) return
      const remoteResult = remote?.data ? validateData(remote.data) : null
      const remoteHasData =
        remoteResult?.ok && (remoteResult.data.persons?.length ?? 0) > 0
      if (remoteHasData) {
        // Cloud is the source of truth — adopt it.
        suppressNextSaveRef.current = true
        setData(remoteResult.data)
        setLoadStatus('ok')
      } else {
        // Cloud is empty (or just the seeded blank row) — push our local
        // data up so this device becomes the shared starting point. Never
        // let an empty cloud row wipe local data.
        try {
          await saveCloudState(data, clientIdRef.current)
        } catch {
          /* offline / not seeded — will retry on next edit */
        }
      }
      hydratedRef.current = true
      setCloudStatus('saved')
    })()

    const unsub = subscribeCloudState(({ data: remoteData, updatedBy }) => {
      if (updatedBy && updatedBy === clientIdRef.current) return // our own echo
      if (!remoteData) return
      const result = validateData(remoteData)
      if (!result.ok) return
      suppressNextSaveRef.current = true
      setData(result.data)
    })

    // Best-effort flush before the tab closes.
    const onBeforeUnload = () => saverRef.current?.flushNow?.()
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      cancelled = true
      unsub?.()
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist data on change. Skip the very first render to avoid a no-op write
  // (and as defense-in-depth against accidentally overwriting with empty state).
  const isInitialRender = useRef(true)
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false
      return
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch {}

    // Daily auto-backup: once per calendar day, on first data change of the day.
    if (shouldAutoBackupToday()) {
      performAutoBackup(data)
    }

    // Cloud save (debounced). Skipped until the initial hydration completes
    // and skipped once right after applying a remote update (avoid echo).
    if (hasSupabaseConfig && saverRef.current) {
      if (!hydratedRef.current) return
      if (suppressNextSaveRef.current) {
        suppressNextSaveRef.current = false
        return
      }
      saverRef.current.schedule(data)
    }
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
              contributions: { ...y.contributions, [month]: parseFloat(value) || 0 },
            }
          }),
        }
      }),
    }))
  }, [])

  // ── Bulk replace (used by Import) ─────────────────────────────────────────────

  /**
   * Replace all data with the given payload (already validated upstream).
   * Resets navigation to the dashboard so we don't point at a stale id.
   */
  const replaceAllData = useCallback((newData) => {
    setData({ persons: newData.persons })
    setView('dashboard')
    setSelectedPersonId(null)
    setSelectedYear(null)
  }, [])

  const dismissLoadStatus = useCallback(() => {
    setLoadStatus('ok')
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
      loadStatus,
      cloudStatus,
      dismissLoadStatus,
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
      replaceAllData,
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
