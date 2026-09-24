import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext.jsx'

// Bump this if a form's saved shape ever changes in a way that would make
// old drafts unsafe to restore. Old-version drafts are discarded, not applied.
const DRAFT_VERSION = 1
const DEFAULT_DEBOUNCE_MS = 400
const DEFAULT_MAX_AGE_MS  = 7 * 24 * 60 * 60 * 1000 // 7 days — anything older is treated as stale

// Deterministic stringify (sorted keys) so two objects with the same values
// but different insertion order are still recognised as equal.
function canon(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canon).join(',')}]`
  const keys = Object.keys(value).sort()
  return `{${keys.map(k => JSON.stringify(k) + ':' + canon(value[k])).join(',')}}`
}

function buildKey(userId, formType, recordId) {
  const suffix = (recordId !== null && recordId !== undefined && recordId !== '')
    ? `${formType}_${recordId}` : formType
  return `financeflow_draft_${userId}_${suffix}`
}

function readRaw(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null // corrupted JSON — never let a bad draft crash the app
  }
}

function safeRemove(key) {
  try { localStorage.removeItem(key) } catch { /* storage unavailable — ignore */ }
}

/**
 * useDraftPersistence — reusable local-draft autosave/recovery for FinanceFlow forms.
 *
 * WHAT IT DOES
 * - Debounced autosave of the current form values to localStorage while the
 *   user types (so a mobile app-switch or a suspended/reloaded PWA tab never
 *   silently wipes an in-progress form).
 * - Flushes immediately — bypassing the debounce — when the tab is hidden,
 *   the page is being unloaded, or the app is backgrounded.
 * - Drafts are namespaced per authenticated user + form type (+ record id
 *   for edit forms), so one account's unfinished data can never appear for
 *   another account on a shared device.
 * - "Worth recovering" is judged by comparing the saved data against the
 *   form's own starting values (`baseline`) — not a generic emptiness check.
 *   This is what makes edit forms (already pre-filled from the database)
 *   behave correctly: only real unsaved *changes* trigger a recoverable
 *   draft, so opening an edit modal never falsely claims you have unfinished
 *   work when you haven't touched anything yet.
 * - While a recoverable draft is awaiting the user's Continue/Discard choice,
 *   new input is never autosaved over it — the old draft stays intact until
 *   the user explicitly continues (which keeps building on it) or discards
 *   it (which deletes it and lets fresh input save normally).
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * - It never talks to Supabase and never auto-submits anything. Restoring a
 *   draft only repopulates local component state — the user still has to
 *   press the existing Save button.
 * - It never decides what "sensitive" means — callers should simply never
 *   pass password/token/CVV/PIN/full-card-number fields into `baseline` or
 *   `saveDraft()` in the first place (none of FinanceFlow's forms collect
 *   those today).
 *
 * @param {string} formType  e.g. 'expense' | 'income' | 'goal' | 'bill' | 'credit_card' | 'budget'
 * @param {object} baseline  the form's starting values, used only for equality checks — never written to storage
 * @param {object} [opts]
 * @param {string|number|null} [opts.recordId]   set for edit forms so the draft key doesn't collide with the "new" draft for the same form type
 * @param {boolean} [opts.ready=true]             delay reading/offering a draft until data the form depends on (categories, goals, cards…) has finished loading
 * @param {number}  [opts.debounceMs=400]
 * @param {number}  [opts.maxAgeMs=7 days]        drafts older than this are discarded rather than offered
 *
 * @returns {{
 *   pendingDraft: object|null,      // a recoverable draft found on mount — show a "resume?" prompt when non-null
 *   saveDraft: (data: object) => void,   // call on every form change; internally debounced
 *   flush: () => void,               // force an immediate (non-debounced) save of the last data passed to saveDraft
 *   clearDraft: () => void,          // remove the draft — call after a successful Supabase save
 *   acceptPendingDraft: () => object|null,  // returns the draft data and clears the "pending" state (caller applies it to form state)
 *   discardPendingDraft: () => void, // user chose not to resume — clears both the prompt and the stored draft
 * }}
 */
export function useDraftPersistence(formType, baseline, opts = {}) {
  const { recordId = null, ready = true, debounceMs = DEFAULT_DEBOUNCE_MS, maxAgeMs = DEFAULT_MAX_AGE_MS } = opts

  const auth   = useAuth()
  const userId = auth?.session?.user?.id || null
  const storageKey = userId ? buildKey(userId, formType, recordId) : null

  const baselineSig = canon(baseline)
  const baselineSigRef = useRef(baselineSig)
  useEffect(() => { baselineSigRef.current = baselineSig }, [baselineSig])

  const [pendingDraft, setPendingDraft] = useState(null)
  const latestDataRef  = useRef(null)
  const timerRef       = useRef(null)
  const checkedKeyRef  = useRef(null)
  // Mirrors `pendingDraft` for synchronous reads inside flush() (which is
  // memoized and shouldn't be re-created every time pendingDraft changes).
  const pendingDraftRef = useRef(null)
  useEffect(() => { pendingDraftRef.current = pendingDraft }, [pendingDraft])

  // ── Look for a recoverable draft once we know who the user is AND any
  //    data the form depends on has loaded ("ready") ─────────────────────
  useEffect(() => {
    if (!storageKey || !ready) return
    if (checkedKeyRef.current === storageKey) return // only check once per key per mount
    checkedKeyRef.current = storageKey

    const parsed = readRaw(storageKey)
    if (!parsed || typeof parsed !== 'object' || !parsed.data) { safeRemove(storageKey); return }
    if (parsed.version !== DRAFT_VERSION) { safeRemove(storageKey); return }
    const savedAt = new Date(parsed.savedAt).getTime()
    if (!Number.isFinite(savedAt) || Date.now() - savedAt > maxAgeMs) { safeRemove(storageKey); return }
    if (canon(parsed.data) === baselineSigRef.current) { safeRemove(storageKey); return } // identical to the unchanged form — nothing to recover

    setPendingDraft(parsed.data)
  }, [storageKey, ready, maxAgeMs])

  const flush = useCallback((data) => {
    if (!storageKey) return
    // A recoverable draft is still awaiting the user's Continue/Discard choice —
    // never overwrite it with fresh (e.g. blank-form) input in the meantime.
    // It will start saving normally again once acceptPendingDraft() or
    // discardPendingDraft() resolves the prompt.
    if (pendingDraftRef.current !== null) return
    const payload = data !== undefined ? data : latestDataRef.current
    if (payload === null || payload === undefined) return
    if (canon(payload) === baselineSigRef.current) { safeRemove(storageKey); return } // no real changes yet — don't litter storage
    try {
      localStorage.setItem(storageKey, JSON.stringify({ data: payload, savedAt: new Date().toISOString(), version: DRAFT_VERSION }))
    } catch {
      // Storage full/unavailable/private-mode — this is a best-effort reliability
      // feature, so it must never throw or interrupt the user's typing.
    }
  }, [storageKey])

  const saveDraft = useCallback((data) => {
    latestDataRef.current = data
    if (!storageKey) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => flush(data), debounceMs)
  }, [storageKey, debounceMs, flush])

  const clearDraft = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    latestDataRef.current = null
    if (storageKey) safeRemove(storageKey)
  }, [storageKey])

  const discardPendingDraft = useCallback(() => {
    setPendingDraft(null)
    clearDraft()
  }, [clearDraft])

  const acceptPendingDraft = useCallback(() => {
    const data = pendingDraft
    setPendingDraft(null)
    return data
  }, [pendingDraft])

  // ── Flush immediately when the app is backgrounded, the tab is hidden, or
  //    the page is about to unload/reload — this is the core of surviving
  //    mobile app-switching and PWA suspension ─────────────────────────────
  useEffect(() => {
    if (!storageKey) return
    function flushNow() {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      flush()
    }
    function onVisibility() { if (document.visibilityState === 'hidden') flushNow() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', flushNow)
    window.addEventListener('beforeunload', flushNow)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', flushNow)
      window.removeEventListener('beforeunload', flushNow)
    }
  }, [storageKey, flush])

  // Clear any pending debounce timer on unmount so it never fires after the
  // component (and its data) is gone.
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return { pendingDraft, saveDraft, flush, clearDraft, acceptPendingDraft, discardPendingDraft }
}
