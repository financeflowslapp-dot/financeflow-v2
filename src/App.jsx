import { useEffect, useRef, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { Avatar } from './components/ui/Avatar.jsx'
import { CategoryModal } from './components/modals/CategoryModal.jsx'
import { WelcomeModal, StepSuccessBar } from './components/Onboarding.jsx'
import { useAuth } from './contexts/AuthContext.jsx'
import { useTheme } from './contexts/ThemeContext.jsx'
import { useTransactions } from './hooks/useTransactions.js'
import { useCategories } from './hooks/useCategories.js'
import { useBudgets } from './hooks/useBudgets.js'
import { usePayCycle } from './hooks/usePayCycle.js'
import { useAdmin } from './hooks/useAdmin.js'
import { useGoals } from './hooks/useGoals.js'
import { useBills } from './hooks/useBills.js'
import { useCreditCards } from './hooks/useCreditCards.js'
import { useOnboarding } from './hooks/useOnboarding.js'
import { Login } from './pages/Login.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { AddEntry } from './pages/AddEntry.jsx'
import { History } from './pages/History.jsx'
import { Recurring } from './pages/Recurring.jsx'
import { Goals } from './pages/Goals.jsx'
import { Bills } from './pages/Bills.jsx'
import { CreditCards } from './pages/CreditCards.jsx'
import { Admin } from './pages/Admin.jsx'
import { CycleModal } from './components/modals/CycleModal.jsx'

const BASE_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'add',       label: '+ Add'     },
  { id: 'goals',     label: '🎯 Goals'  },
  { id: 'bills',     label: '📄 Bills'  },
  { id: 'cards',     label: '💳 Cards'  },
  { id: 'history',   label: 'History'   },
  { id: 'recurring', label: 'Recurring' },
]
const ADMIN_TAB = { id: 'admin', label: '👥 Users' }

// ── Last-active-screen persistence ──────────────────────────────────────────
// Restores whichever main screen (Dashboard/Income-Expense/Goals/Bills/
// Cards/History/Recurring) the user was last on after the PWA is backgrounded
// and reloads/remounts, instead of always snapping back to Dashboard.
//
// WHY A PLAIN `useState('dashboard')` + "restore in a useEffect" DOESN'T WORK:
// AuthContext resolves the Supabase session asynchronously (`getSession()` is
// a promise). So on every reload, App's FIRST render always has
// `session === null`. If activeTab starts hardcoded at 'dashboard' and is
// only corrected once an effect later discovers the real user id, there are
// two ways that "correction" gets lost by the time anything is visible:
//   1. On a normal in-app tab switch (no reload), the effect's dependency
//      (userId) never changes again, so it never re-runs and never
//      overwrites a tab the user deliberately picked — this part is fine.
//   2. On an actual reload, the risk is the OPPOSITE direction: because the
//      restore only runs after userId resolves, anything that reads
//      `activeTab` before that (e.g. a persist effect that isn't carefully
//      gated) can re-save the still-default 'dashboard' value over the
//      correct stored one, permanently clobbering it. Depending on effect
//      ordering/dependency arrays, that clobber can happen silently on
//      every single reload — which matches the "still doesn't work" report.
// The fix here removes the dependency on effect timing entirely: the
// correct tab is computed synchronously, as part of the FIRST render, using
// React's lazy `useState(() => ...)` initializer — not discovered later.
//
// HOW THE INITIAL GUESS IS MADE WITHOUT WAITING FOR AUTH:
// The authenticated user's id isn't known synchronously on cold start
// (Supabase's own session read is itself async), so the lazy initializer
// can't key off it directly. Instead we keep one extra, tiny pointer key —
// "which user id last used this browser" — written every time a user id
// becomes known. On the very next mount, before auth has resolved, the
// initializer uses that pointer to make an informed guess. Once the real
// session resolves, an effect re-validates that guess against the ACTUAL
// user id and corrects it if wrong (e.g. a different user just logged in) —
// so a stale/incorrect guess is only ever used for the first paint, and
// only behind the existing authLoading/isNewUser spinner gates below, never
// shown to the person.
//
// Mirrors useDraftPersistence's approach: plain localStorage, namespaced per
// authenticated user, read/written defensively so unavailable/private-mode
// storage never throws. Entirely separate from the draft-recovery keys/logic
// in useDraftPersistence.js — nothing here touches that file.
//
// 'admin' is intentionally excluded from restoration: isAdmin is resolved
// asynchronously after login, so trusting a stored 'admin' tab before that
// check completes could either flash an unauthorized screen or (for a user
// since demoted) leave the main area blank. Every other main tab has no such
// permission gate, so it's safe to restore immediately.
const NAV_TAB_STORAGE_PREFIX = 'financeflow_active_tab_'
const LAST_USER_ID_KEY = 'financeflow_last_user_id' // not sensitive: same Supabase user id already embedded in the draft-recovery keys and the Supabase auth token itself; used only to guess which per-user tab key to read before auth resolves
const RESTORABLE_TAB_IDS = new Set(BASE_TABS.map(t => t.id))

function navTabStorageKey(userId) {
  return `${NAV_TAB_STORAGE_PREFIX}${userId}`
}

function readStoredActiveTab(userId) {
  if (!userId) return null
  try {
    const stored = localStorage.getItem(navTabStorageKey(userId))
    return RESTORABLE_TAB_IDS.has(stored) ? stored : null
  } catch {
    return null // storage unavailable/private mode — fall back to default tab
  }
}

function writeStoredActiveTab(userId, tab) {
  if (!userId) return
  try {
    localStorage.setItem(navTabStorageKey(userId), tab)
  } catch {
    // storage full/unavailable — this is a best-effort convenience feature,
    // it must never throw or interrupt navigation
  }
}

// Lazy initializer: runs exactly once, synchronously, during the first
// render — before AuthContext's session promise has resolved. Guesses using
// whichever user id last used this browser; the effect in App() re-validates
// this against the real, authenticated user id as soon as it's known.
function getInitialActiveTab() {
  try {
    const lastUserId = localStorage.getItem(LAST_USER_ID_KEY)
    return readStoredActiveTab(lastUserId) || 'dashboard'
  } catch {
    return 'dashboard'
  }
}

export default function App() {
  const { session, loading: authLoading, profile, isNewUser, onboardingComplete, setOnboardingComplete, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeTab,    setActiveTab]    = useState(getInitialActiveTab)
  const [showCatModal, setShowCatModal] = useState(false)
  const [catError,     setCatError]     = useState('')
  const [cycleModal,   setCycleModal]   = useState(null) // null | 'edit' | 'new'

  const userId = session?.user?.id || null

  // Once the REAL authenticated user id is known, re-validate the initial
  // guess against that specific user's own stored tab. If it's the same
  // user who last used this browser, `stored` matches the guess exactly and
  // this setActiveTab call is a same-value no-op (React bails out — no
  // extra render, no flicker). If it's a different user (Test 6: logout →
  // login as someone else in the same session, no reload in between), this
  // explicitly resets to that user's own stored tab, or 'dashboard' if they
  // have none — the previous user's screen is never shown or persisted
  // under the new user's key.
  const [navReady, setNavReady] = useState(false)
  useEffect(() => {
    if (!userId) return
    setActiveTab(readStoredActiveTab(userId) || 'dashboard')
    try { localStorage.setItem(LAST_USER_ID_KEY, userId) } catch { /* ignore */ }
    setNavReady(true)
  }, [userId])

  // Persist the active main screen on every change so it can be restored on
  // the next reload/remount. Centralized here in App — every way of changing
  // screens (nav clicks, onNavigate from Dashboard/StepSuccessBar, etc.)
  // already flows through setActiveTab/navigateTo, so this one effect covers
  // all of them without touching per-page navigation code. Gated on
  // `navReady` so this can never fire (and clobber the stored value) before
  // the validation effect above has run at least once for this user.
  useEffect(() => {
    if (!userId || !navReady) return
    writeStoredActiveTab(userId, activeTab)
  }, [userId, navReady, activeTab])

  const { transactions, loading: txnLoading, fetchTransactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions(session?.user?.id)
  const { categories, incomeCategories, expenseCategories, fetchCategories, addCategory, deleteCategory, reorderCategories } = useCategories()
  const { budgets, fetchBudgets, saveBudgets }   = useBudgets()
  const { payCycle, cycleHistory, fetchPayCycle, savePayCycle, editPayCycle } = usePayCycle()
  const { isAdmin, userProfiles, allTransactions, checkAdmin, fetchAdminData } = useAdmin()
  const { goals, fetchGoals, addGoal, deleteGoal, addContribution, allocateToGoal, reverseAllocation, updateKeywords } = useGoals()
  const { bills, fetchBills, addBill, deleteBill } = useBills()
  const { creditCards, fetchCreditCards, addCreditCard, updateCreditCard, deleteCreditCard, recordPurchase, recordRepayment, reverseCardEffect } = useCreditCards()

  const {
    showWelcome, steps, stepKeys, doneCount, progressPct, allDone,
    onboardingStatus, stepMessage,
    startOnboarding, skipOnboarding, showStepSuccess, dismissStepMessage,
  } = useOnboarding(session?.user?.id, isNewUser, onboardingComplete, setOnboardingComplete, transactions, budgets, goals, payCycle)

  useEffect(() => {
    if (!session) return
    fetchTransactions(); fetchCategories(); fetchBudgets()
    fetchPayCycle(); fetchGoals(); fetchBills(); fetchCreditCards()
    checkAdmin().then(ok => { if (ok) fetchAdminData() })
  }, [session])

  // Detect onboarding step completions and show contextual messages.
  // useRef holds previous step state without triggering re-renders.
  const prevStepsRef = useRef({})
  useEffect(() => {
    if (onboardingStatus === 'loading' || onboardingStatus === 'done') return
    if (!prevStepsRef.current._init) { prevStepsRef.current._init = true; Object.assign(prevStepsRef.current, steps); return }
    for (const k of stepKeys) {
      if (steps[k] && !prevStepsRef.current[k]) { showStepSuccess(k); break }
    }
    Object.assign(prevStepsRef.current, steps)
  }, [steps, onboardingStatus])

  function handleGetStarted() {
    startOnboarding()
    setCycleModal('new') // navigate to set cycle first
  }

  function navigateTo(tab) { setActiveTab(tab) }

  if (authLoading) return (
    <div className="auth-loading">
      <div className="spinner" />
    </div>
  )
  if (!session) return <Login />

  // Block rendering until AuthContext has determined new vs existing user.
  // This is what prevents any race condition — the welcome/dashboard decision
  // is never made before the DB check completes.
  if (isNewUser === undefined) return (
    <div className="auth-loading">
      <div className="spinner" />
      <p className="auth-loading-label">Loading your account…</p>
    </div>
  )

  const TABS = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS

  async function handleAddCategory(name, type, list) {
    setCatError('')
    const ok = await addCategory(name, type, list)
    if (!ok) setCatError("Couldn't add that category.")
    return ok
  }

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <header className="app-header">
          <div className="header-brand">
            <div className="header-logo">₹</div>
            <div>
              <span className="header-eyebrow">Personal finance</span>
              <span className="header-title">FinanceFlow</span>
            </div>
          </div>
          <div className="header-actions">
            <button type="button" className="icon-btn" onClick={toggleTheme}>{theme === 'light' ? '🌙' : '☀️'}</button>
            <div className="user-identity" title={session.user.email}>
              <Avatar url={profile?.avatar_url} name={profile?.full_name || session.user.email} size={30} />
              <span className="user-display-name">{(profile?.full_name || session.user.email || '').split(' ')[0]}</span>
            </div>
            <button type="button" className="icon-btn signout-btn" onClick={signOut} title="Sign out">↪</button>
          </div>
        </header>

        {/* Step success bar — above nav, non-intrusive */}
        {stepMessage && (
          <StepSuccessBar message={stepMessage} onDismiss={dismissStepMessage} onNavigate={navigateTo} />
        )}

        <nav className="app-nav">
          {TABS.map(tab => (
            <button key={tab.id} type="button"
              className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >{tab.label}</button>
          ))}
        </nav>

        <main className="app-main">
          {activeTab === 'dashboard' && (
            <Dashboard
              transactions={transactions} loading={txnLoading} budgets={budgets}
              payCycle={payCycle} expenseCategories={expenseCategories}
              saveBudgets={saveBudgets} savePayCycle={savePayCycle} editPayCycle={editPayCycle}
              onAddTransaction={addTransaction} bills={bills} goals={goals}
              creditCards={creditCards}
              onboardingStatus={onboardingStatus} steps={steps} progressPct={progressPct}
              onNavigate={navigateTo} cycleModal={cycleModal} setCycleModal={setCycleModal}
            />
          )}
          {activeTab === 'add' && (
            <AddEntry
              incomeCategories={incomeCategories} expenseCategories={expenseCategories}
              onAdd={addTransaction} isAdmin={isAdmin} onManageCategories={() => setShowCatModal(true)}
              goals={goals} onAllocateToGoal={allocateToGoal}
              creditCards={creditCards} onRecordPurchase={recordPurchase} onRecordRepayment={recordRepayment}
            />
          )}
          {activeTab === 'goals'     && <Goals goals={goals} expenseCategories={expenseCategories} transactions={transactions} onAdd={addGoal} onDelete={deleteGoal} onContribute={addContribution} onUpdateKeywords={updateKeywords} />}
          {activeTab === 'bills'     && <Bills bills={bills} expenseCategories={expenseCategories} onAdd={addBill} onDelete={deleteBill} />}
          {activeTab === 'cards'     && <CreditCards creditCards={creditCards} loading={false} onAdd={addCreditCard} onUpdate={updateCreditCard} onDelete={deleteCreditCard} />}
          {activeTab === 'history'   && <History transactions={transactions} loading={txnLoading} categories={categories} incomeCategories={incomeCategories} expenseCategories={expenseCategories} budgets={budgets} cycleHistory={cycleHistory} goals={goals} creditCards={creditCards} onDelete={deleteTransaction} onUpdate={updateTransaction} onReverseAllocation={reverseAllocation} onAllocateToGoal={allocateToGoal} onReverseCardEffect={reverseCardEffect} onRecordPurchase={recordPurchase} onRecordRepayment={recordRepayment} />}
          {activeTab === 'recurring' && <Recurring transactions={transactions} onDelete={deleteTransaction} />}
          {activeTab === 'admin' && isAdmin && <Admin userProfiles={userProfiles} allTransactions={allTransactions} />}
        </main>

        {/* Cycle modal — controlled from App so Dashboard and onboarding can both trigger it */}
        {cycleModal && (
          <CycleModal
            payCycle={payCycle} transactions={transactions} mode={cycleModal}
            onSave={cycleModal === 'edit' ? editPayCycle : savePayCycle}
            onAddRecurring={async (items, newStart) => {
              for (const t of items) await addTransaction({ type: t.type, amount: Number(t.amount), category: t.category, note: t.note || '', date: newStart, is_recurring: true })
            }}
            onClose={() => setCycleModal(null)}
          />
        )}

        {showCatModal && isAdmin && (
          <CategoryModal
            incomeCategories={incomeCategories} expenseCategories={expenseCategories}
            onAdd={handleAddCategory} onDelete={deleteCategory} onReorder={reorderCategories}
            onClose={() => { setShowCatModal(false); setCatError('') }} error={catError}
          />
        )}

        {/* Welcome modal — new users only, shown once */}
        {showWelcome && (
          <WelcomeModal onGetStarted={handleGetStarted} onSkip={skipOnboarding} />
        )}
      </div>
    </ErrorBoundary>
  )
}
