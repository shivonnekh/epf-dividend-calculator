import { supabase, hasSupabaseConfig } from './supabase.js'

export { hasSupabaseConfig }

/**
 * epfSync.js — cloud persistence for the EPF Calculator.
 *
 * The EPF Calculator stores all data as a single JSON blob (the same
 * shape persisted to localStorage: { persons: [...] }). For cross-device
 * sync we keep that blob in Supabase.
 *
 * We REUSE the Whaley project's `app_state` table but under a dedicated
 * row id ('epf-primary') so the two apps never collide — Whaley only ever
 * touches id='primary'. No new table or migration required.
 *
 * RLS on that table requires an authenticated session, so we sign in
 * anonymously (same model as Whaley) before any read/write.
 *
 * Failure is always soft: if the network/cloud is unavailable the app
 * keeps working against localStorage and retries on the next edit.
 */

const STATE_ID = 'epf-primary'

let sessionPromise = null

/**
 * Ensure we have an anonymous Supabase session. Idempotent — concurrent
 * callers share a single in-flight sign-in. Resolves to true on success,
 * false if cloud is unconfigured/unreachable (caller falls back to local).
 */
export async function ensureSession() {
  if (!hasSupabaseConfig) return false
  if (sessionPromise) return sessionPromise

  sessionPromise = (async () => {
    try {
      const { data } = await supabase.auth.getSession()
      if (data?.session) return true
      const { error } = await supabase.auth.signInAnonymously()
      if (error) {
        // eslint-disable-next-line no-console
        console.warn('[epf] anonymous sign-in failed — local-only mode', error)
        return false
      }
      return true
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[epf] sign-in threw — local-only mode', e)
      return false
    }
  })()

  return sessionPromise
}

/**
 * Fetch the EPF blob from the cloud.
 * Returns { data, updatedBy } or null if missing / unavailable.
 */
export async function loadCloudState() {
  const ok = await ensureSession()
  if (!ok) return null
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('state, updated_by')
      .eq('id', STATE_ID)
      .maybeSingle()
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[epf] loadCloudState failed', error)
      return null
    }
    if (!data) return null
    return { data: data.state, updatedBy: data.updated_by }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[epf] loadCloudState threw', e)
    return null
  }
}

/**
 * Save the EPF blob. The 'epf-primary' row is pre-seeded in the DB (see
 * the seed SQL in README/handoff), so we only ever UPDATE it — matching
 * the table's RLS (SELECT + UPDATE for authenticated; no INSERT policy).
 *
 * `clientId` identifies this device so realtime subscribers can filter
 * their own echo. Throws on error (or if the row is missing) so the
 * debounced saver can re-queue and the UI can surface a status.
 */
export async function saveCloudState(state, clientId) {
  const ok = await ensureSession()
  if (!ok) throw new Error('No cloud session')
  const { data, error } = await supabase
    .from('app_state')
    .update({ state, updated_by: clientId ?? null })
    .eq('id', STATE_ID)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) {
    throw new Error(
      "Cloud row 'epf-primary' not found — run the one-time seed SQL in Supabase.",
    )
  }
}

/**
 * Subscribe to realtime changes on the EPF row.
 *   onChange({ data, updatedBy })
 * Returns an unsubscribe function.
 */
export function subscribeCloudState(onChange) {
  if (!hasSupabaseConfig) return () => {}
  const channel = supabase
    .channel(`app_state:${STATE_ID}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'app_state',
        filter: `id=eq.${STATE_ID}`,
      },
      (payload) => {
        const row = payload?.new
        if (!row) return
        onChange({ data: row.state, updatedBy: row.updated_by })
      },
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Debounced cloud saver — coalesces rapid edits into one write.
 */
export function makeCloudSaver(clientId, { onSaving, onSaved, onError } = {}, delayMs = 600) {
  let timer = null
  let pending = null
  let inFlight = false

  async function flush() {
    if (pending == null) return
    const next = pending
    pending = null
    inFlight = true
    onSaving?.()
    try {
      await saveCloudState(next, clientId)
      onSaved?.()
    } catch (e) {
      // Re-queue so the next edit retries.
      pending = pending ?? next
      onError?.(e)
    } finally {
      inFlight = false
    }
  }

  return {
    schedule(state) {
      pending = state
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, delayMs)
    },
    async flushNow() {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      if (inFlight) return
      await flush()
    },
  }
}

/** Stable per-device id used for self-echo filtering on realtime. */
export function getClientId() {
  const KEY = 'epf-client-id'
  try {
    let id = localStorage.getItem(KEY)
    if (!id) {
      id = `c-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
      localStorage.setItem(KEY, id)
    }
    return id
  } catch {
    return `c-${Math.random().toString(36).slice(2)}`
  }
}
