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

export default function App() {
  const { session, loading: authLoading, profile, isNewUser, onboardingComplete, setOnboardingComplete, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeTab,    setActiveTab]    = useState('dashboard')
  const [showCatModal, setShowCatModal] = useState(false)
  const [catError,     setCatError]     = useState('')
  const [cycleModal,   setCycleModal]   = useState(null) // null | 'edit' | 'new'

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
