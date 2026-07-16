import { useEffect, useState } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { Avatar } from './components/ui/Avatar.jsx'
import { CategoryModal } from './components/modals/CategoryModal.jsx'
import { useAuth } from './contexts/AuthContext.jsx'
import { useTheme } from './contexts/ThemeContext.jsx'
import { useTransactions } from './hooks/useTransactions.js'
import { useCategories } from './hooks/useCategories.js'
import { useBudgets } from './hooks/useBudgets.js'
import { usePayCycle } from './hooks/usePayCycle.js'
import { useAdmin } from './hooks/useAdmin.js'
import { useGoals } from './hooks/useGoals.js'
import { useBills } from './hooks/useBills.js'
import { Login } from './pages/Login.jsx'
import { Dashboard } from './pages/Dashboard.jsx'
import { AddEntry } from './pages/AddEntry.jsx'
import { History } from './pages/History.jsx'
import { Recurring } from './pages/Recurring.jsx'
import { Goals } from './pages/Goals.jsx'
import { Bills } from './pages/Bills.jsx'
import { Admin } from './pages/Admin.jsx'

const BASE_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'add',       label: '+ Add'     },
  { id: 'goals',     label: '🎯 Goals'  },
  { id: 'bills',     label: '📄 Bills'  },
  { id: 'history',   label: 'History'   },
  { id: 'recurring', label: 'Recurring' },
]
const ADMIN_TAB = { id: 'admin', label: '👥 Users' }

export default function App() {
  const { session, loading: authLoading, profile, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [activeTab,     setActiveTab]     = useState('dashboard')
  const [showCatModal,  setShowCatModal]  = useState(false)
  const [catError,      setCatError]      = useState('')

  const { transactions, loading: txnLoading, fetchTransactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions()
  const { categories, incomeCategories, expenseCategories, fetchCategories, addCategory, deleteCategory, reorderCategories } = useCategories()
  const { budgets, fetchBudgets, saveBudgets }   = useBudgets()
  const { payCycle, fetchPayCycle, savePayCycle } = usePayCycle()
  const { isAdmin, userProfiles, allTransactions, checkAdmin, fetchAdminData } = useAdmin()
  const { goals, fetchGoals, addGoal, deleteGoal, addContribution } = useGoals()
  const { bills, fetchBills, addBill, deleteBill } = useBills()

  useEffect(() => {
    if (!session) return
    fetchTransactions(); fetchCategories(); fetchBudgets()
    fetchPayCycle(); fetchGoals(); fetchBills()
    checkAdmin().then(ok => { if (ok) fetchAdminData() })
  }, [session])

  if (authLoading) return <div className="auth-loading"><div className="spinner" /></div>
  if (!session)    return <Login />

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

        <nav className="app-nav">
          {TABS.map(tab => (
            <button key={tab.id} type="button"
              className={`nav-tab${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >{tab.label}</button>
          ))}
        </nav>

        <main className="app-main">
          {activeTab === 'dashboard' && <Dashboard transactions={transactions} loading={txnLoading} budgets={budgets} payCycle={payCycle} expenseCategories={expenseCategories} saveBudgets={saveBudgets} savePayCycle={savePayCycle} />}
          {activeTab === 'add'       && <AddEntry incomeCategories={incomeCategories} expenseCategories={expenseCategories} onAdd={addTransaction} isAdmin={isAdmin} onManageCategories={() => setShowCatModal(true)} />}
          {activeTab === 'goals'     && <Goals goals={goals} onAdd={addGoal} onDelete={deleteGoal} onContribute={addContribution} />}
          {activeTab === 'bills'     && <Bills bills={bills} expenseCategories={expenseCategories} onAdd={addBill} onDelete={deleteBill} />}
          {activeTab === 'history'   && <History transactions={transactions} loading={txnLoading} categories={categories} incomeCategories={incomeCategories} expenseCategories={expenseCategories} budgets={budgets} payCycle={payCycle} onDelete={deleteTransaction} onUpdate={updateTransaction} />}
          {activeTab === 'recurring' && <Recurring transactions={transactions} onDelete={deleteTransaction} />}
          {activeTab === 'admin' && isAdmin && <Admin userProfiles={userProfiles} allTransactions={allTransactions} />}
        </main>

        {showCatModal && isAdmin && (
          <CategoryModal
            incomeCategories={incomeCategories} expenseCategories={expenseCategories}
            onAdd={handleAddCategory} onDelete={deleteCategory} onReorder={reorderCategories}
            onClose={() => { setShowCatModal(false); setCatError('') }} error={catError}
          />
        )}
      </div>
    </ErrorBoundary>
  )
}
