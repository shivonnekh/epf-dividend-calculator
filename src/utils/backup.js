/**
 * Backup / restore helpers for EPF Calculator data.
 *
 * Data shape (see CLAUDE.md):
 * {
 *   persons: [{
 *     id: string,
 *     name: string,
 *     years: [{
 *       year: number,
 *       openingBalance: number,
 *       annualRate: number,
 *       contributions: { "1": number, ..., "12": number }
 *     }]
 *   }]
 * }
 */

export const BACKUP_FILE_VERSION = 1

const LAST_EXPORT_KEY = 'epf-last-export-at'
const LAST_AUTO_BACKUP_KEY = 'epf-last-auto-backup-date'

// ── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a data object before accepting it as EPF data.
 * Returns { ok: true, data } on success, { ok: false, error } on failure.
 * Does NOT mutate input.
 */
export function validateData(input) {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'File is empty or not JSON.' }
  }

  // Backup files from exportData() wrap data in { version, exportedAt, data }.
  // Raw data blobs have { persons } at the top level. Accept both.
  const payload = Array.isArray(input.persons) ? input : input.data
  if (!payload || !Array.isArray(payload.persons)) {
    return { ok: false, error: 'Missing "persons" array.' }
  }

  for (const [i, p] of payload.persons.entries()) {
    if (!p || typeof p !== 'object') {
      return { ok: false, error: `persons[${i}] is not an object.` }
    }
    if (typeof p.id !== 'string' || !p.id) {
      return { ok: false, error: `persons[${i}].id is missing.` }
    }
    if (typeof p.name !== 'string') {
      return { ok: false, error: `persons[${i}].name is missing.` }
    }
    if (!Array.isArray(p.years)) {
      return { ok: false, error: `persons[${i}].years is not an array.` }
    }
    for (const [j, y] of p.years.entries()) {
      if (!y || typeof y !== 'object') {
        return { ok: false, error: `persons[${i}].years[${j}] is not an object.` }
      }
      if (typeof y.year !== 'number') {
        return { ok: false, error: `persons[${i}].years[${j}].year must be a number.` }
      }
      if (typeof y.openingBalance !== 'number') {
        return { ok: false, error: `persons[${i}].years[${j}].openingBalance must be a number.` }
      }
      if (typeof y.annualRate !== 'number') {
        return { ok: false, error: `persons[${i}].years[${j}].annualRate must be a number.` }
      }
      if (!y.contributions || typeof y.contributions !== 'object') {
        return { ok: false, error: `persons[${i}].years[${j}].contributions must be an object.` }
      }
    }
  }

  return { ok: true, data: { persons: payload.persons } }
}

// ── Export ──────────────────────────────────────────────────────────────────

/**
 * Build the wrapped export payload (immutable; does not touch the input).
 */
export function buildExportPayload(data) {
  return {
    version: BACKUP_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'epf-calculator',
    data,
  }
}

/**
 * Trigger a browser download of the given data as JSON.
 * Filename defaults to `epf-backup-YYYY-MM-DD.json`.
 */
export function downloadJSON(data, filename) {
  const payload = buildExportPayload(data)
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename ?? `epf-backup-${todayISODate()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Revoke after a tick so the download starts first.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Manual export — user-initiated. Updates the "last export" marker.
 */
export function exportData(data) {
  downloadJSON(data, `epf-backup-${todayISODate()}.json`)
  try { localStorage.setItem(LAST_EXPORT_KEY, new Date().toISOString()) } catch {}
}

// ── Import ──────────────────────────────────────────────────────────────────

/**
 * Read and validate a JSON file chosen by the user.
 * Resolves to the clean `{ persons: [...] }` data or throws with a user-friendly error.
 */
export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error('No file selected.'))
    if (file.size > 10 * 1024 * 1024) {
      return reject(new Error('File too large (>10MB).'))
    }
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read file.'))
    reader.onload = () => {
      let parsed
      try {
        parsed = JSON.parse(reader.result)
      } catch {
        return reject(new Error('Not valid JSON.'))
      }
      const result = validateData(parsed)
      if (!result.ok) return reject(new Error(result.error))
      resolve(result.data)
    }
    reader.readAsText(file)
  })
}

// ── Auto-backup (once per day, on first data change) ────────────────────────

/**
 * Check if we've already auto-backed-up today. Returns true if we should back up now.
 */
export function shouldAutoBackupToday() {
  try {
    const last = localStorage.getItem(LAST_AUTO_BACKUP_KEY)
    return last !== todayISODate()
  } catch {
    return false
  }
}

/**
 * Perform the daily auto-backup download and mark it done for today.
 */
export function performAutoBackup(data) {
  if (!data || !Array.isArray(data.persons) || data.persons.length === 0) {
    // Nothing to back up yet.
    return false
  }
  downloadJSON(data, `epf-backup-${todayISODate()}.json`)
  try { localStorage.setItem(LAST_AUTO_BACKUP_KEY, todayISODate()) } catch {}
  return true
}

// ── Status helpers ──────────────────────────────────────────────────────────

export function getLastExportDate() {
  try {
    const raw = localStorage.getItem(LAST_EXPORT_KEY)
    if (!raw) return null
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export function daysSince(date) {
  if (!date) return null
  const ms = Date.now() - date.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

// ── Internals ───────────────────────────────────────────────────────────────

function todayISODate() {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
