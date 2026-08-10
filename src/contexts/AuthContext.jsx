import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase.js'
import { profileApi } from '../services/api.js'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [session,        setSession]        = useState(null)
  const [authLoading,    setAuthLoading]    = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profile,        setProfile]        = useState(null)
  // isNewUser: undefined = not yet determined, true = no prior profile existed, false = existing user
  const [isNewUser,          setIsNewUser]          = useState(undefined)
  const [onboardingComplete, setOnboardingComplete] = useState(undefined)

  // ── Step 1: Resolve Supabase session ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: l } = supabase.auth.onAuthStateChange((_, s) => {
      setSession(s)
      if (!s) {
        setProfile(null)
        setIsNewUser(undefined)
        setOnboardingComplete(undefined)
      }
    })
    return () => l.subscription.unsubscribe()
  }, [])

  // ── Step 2: Profile check + upsert ──────────────────────────────────────────
  // SEQUENCE (no shortcuts):
  // 1. Fetch existing profile FIRST — determines isNewUser
  // 2. Upsert profile (create or update last_seen etc)
  // 3. Expose isNewUser and onboardingComplete to the app
  //
  // isNewUser is based ONLY on whether a row existed before step 2.
  // onboarding_complete is a separate concept — controls the progress widget only.
  // NULL onboarding_complete on an existing user = old user, NOT a new user.
  useEffect(() => {
    if (!session) return

    const userId = session.user.id
    const m = session.user.user_metadata || {}
    const profilePayload = {
      user_id:    userId,
      email:      session.user.email,
      full_name:  m.full_name || m.name || null,
      avatar_url: m.avatar_url || m.picture || null,
      last_seen:  new Date().toISOString(),
    }

    setProfile(profilePayload)
    setProfileLoading(true)
    setIsNewUser(undefined)
    setOnboardingComplete(undefined)

    async function resolveProfile() {
      // ── Step A: Check if profile already exists ──────────────────────────
      // This MUST happen before the upsert — upsert would create the row,
      // making it impossible to tell if it was new.
      const { data: existing } = await profileApi.fetchOne(userId)
      // existing === null  → no row in DB → genuinely new user
      // existing !== null  → row exists → existing user regardless of onboarding_complete value
      const newUser = existing === null

      // ── Step B: Upsert profile (create or refresh last_seen / avatar) ────
      // onboarding_complete is NOT in the payload — Supabase leaves it untouched
      // for existing users. For new users (INSERT path) it stays NULL in DB,
      // but we use isNewUser to decide the welcome modal, not this column.
      await profileApi.upsert(profilePayload)

      // ── Step C: Expose results ────────────────────────────────────────────
      setIsNewUser(newUser)
      setOnboardingComplete(existing?.onboarding_complete ?? null)
      setProfileLoading(false)
    }

    resolveProfile().catch(err => {
      console.error('[FinanceFlow] profile resolve failed:', err)
      // Fail safe: treat as existing user — never show welcome to someone with data
      setIsNewUser(false)
      setOnboardingComplete(null)
      setProfileLoading(false)
    })
  }, [session])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
    setIsNewUser(undefined)
    setOnboardingComplete(undefined)
  }

  return (
    <Ctx.Provider value={{
      session,
      loading: authLoading || profileLoading,
      profile,
      isNewUser,
      onboardingComplete,
      setOnboardingComplete,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
