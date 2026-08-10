import { useCallback, useEffect, useState } from 'react'
import { profileApi } from '../services/api.js'

// isNewUser    — true only when NO user_profiles row existed before this login.
//                Set by AuthContext BEFORE the upsert, so it's never contaminated
//                by the upsert creating the row.
// onboardingComplete — separate concept: tracks setup progress widget visibility.
//                NULL here is fine for existing users; it does NOT mean new user.
export function useOnboarding(
  userId, isNewUser, onboardingComplete, setOnboardingComplete,
  transactions, budgets, goals, payCycle
) {
  const [showWelcome,      setShowWelcome]      = useState(false)
  const [onboardingStatus, setOnboardingStatus] = useState('loading')
  const [stepMessage,      setStepMessage]      = useState(null)

  const steps = {
    cycle:   !!payCycle,
    income:  transactions.some(t => t.type === 'income'),
    expense: transactions.some(t => t.type === 'expense'),
    budget:  budgets.length > 0,
    goal:    goals.length > 0,
  }
  const stepKeys    = ['cycle', 'income', 'expense', 'budget', 'goal']
  const doneCount   = stepKeys.filter(k => steps[k]).length
  const allDone     = doneCount === stepKeys.length
  const progressPct = Math.round((doneCount / stepKeys.length) * 100)

  // ── Welcome modal decision ───────────────────────────────────────────────────
  // ONLY based on isNewUser — never on onboarding_complete or null checks.
  // isNewUser === undefined means AuthContext hasn't finished yet → wait.
  useEffect(() => {
    if (!userId || isNewUser === undefined) return

    if (isNewUser === true) {
      // Genuinely new — no prior profile row existed
      setShowWelcome(true)
      setOnboardingStatus('new')
    } else {
      // Existing user — never show welcome regardless of onboarding_complete value
      setShowWelcome(false)
      // Determine progress widget visibility from actual data
      const done = allDone || onboardingComplete === true
      setOnboardingStatus(done ? 'done' : 'incomplete')
    }
  }, [userId, isNewUser]) // only re-run when these change — not on every data change

  // Auto-hide progress widget when all steps completed
  useEffect(() => {
    if (onboardingStatus === 'done' || onboardingStatus === 'loading' || onboardingStatus === 'new') return
    if (allDone) setOnboardingStatus('done')
  }, [allDone, onboardingStatus])

  const _markSeen = useCallback(() => {
    if (!userId) return
    profileApi.setOnboardingComplete(userId, true)
    setOnboardingComplete(true)
  }, [userId, setOnboardingComplete])

  const startOnboarding = useCallback(() => {
    setShowWelcome(false)
    _markSeen()
    setOnboardingStatus('incomplete')
  }, [_markSeen])

  const skipOnboarding = useCallback(() => {
    setShowWelcome(false)
    _markSeen()
    setOnboardingStatus('incomplete')
  }, [_markSeen])

  const dismissStepMessage = useCallback(() => setStepMessage(null), [])

  const showStepSuccess = useCallback((step) => {
    const messages = {
      cycle:   { text: "Great! Your Pay Cycle has been created. Now let's add your first Income.", next: 'add' },
      income:  { text: "Awesome! Now record your first Expense.", next: 'add' },
      expense: { text: "Excellent! Now create your Budget.", next: 'dashboard' },
      budget:  { text: "Almost done! Create your first Savings Goal.", next: 'goals' },
      goal:    { text: "🎉 Congratulations! Your FinanceFlow setup is complete!", next: null },
    }
    if (messages[step]) setStepMessage(messages[step])
  }, [])

  return {
    showWelcome, steps, stepKeys, doneCount, progressPct, allDone,
    onboardingStatus, stepMessage,
    startOnboarding, skipOnboarding, showStepSuccess, dismissStepMessage,
  }
}
