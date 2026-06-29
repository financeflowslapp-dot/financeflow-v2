import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabaseClient'

const TODAY = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  category: '',
  note: '',
  date: TODAY(),
  isRecurring: false,
}

const EMPTY_BUDGET_FORM = {
  category: '',
  monthlyLimit: '',
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'categories', label: 'Categories' },
  { id: 'budgets', label: 'Budgets' },
  { id: 'recurring', label: 'Recurring' },
]

function formatMoney(value) {
  const n = Number(value || 0)
  return n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isSameMonth(dateStr, ref) {
  const d = new Date(dateStr)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

function groupTotalsByCategory(transactions, type) {
  const totals = {}
  transactions
    .filter((t) => t.type === type)
    .forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + Number(t.amount)
    })
  return Object.entries(totals)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
}

function LoginScreen({ onSignIn }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <span className="eyebrow">Personal finance, kept honest</span>
        <h1>FinanceFlow</h1>
        <p>Sign in to track your income and expenses, privately.</p>
        <button className="google-btn" onClick={onSignIn}>
          <span className="google-icon">G</span>
          Continue with Google
        </button>
      </div>
    </div>
  )
}

function TransactionRow({ t, onDelete }) {
  return (
    <li className="transaction-row">
      <span className={`type-dot ${t.type}`} />
      <div className="transaction-main">
        <span className="transaction-category">{t.category}</span>
        {t.note && <span className="transaction-note">{t.note}</span>}
      </div>
      <span className="transaction-date">{formatDate(t.date)}</span>
      <span className={`transaction-amount ${t.type}`}>
        {t.type === 'income' ? '+' : '\u2212'} Rs. {formatMoney(t.amount)}
      </span>
      <button
        type="button"
        className="delete-btn no-print"
        onClick={() => onDelete(t.id)}
        aria-label="Delete entry"
      >
        ×
      </button>
    </li>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [budgets, setBudgets] = useState([])
  const [budgetForm, setBudgetForm] = useState(EMPTY_BUDGET_FORM)
  const [budgetError, setBudgetError] = useState('')
  const [savingBudget, setSavingBudget] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session) {
      fetchTransactions()
      fetchBudgets()
    }
  }, [session])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setTransactions([])
    setBudgets([])
  }

  async function fetchTransactions() {
    setLoading(true)
    setErrorMsg('')
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })
      .order('id', { ascending: false })

    if (error) {
      setErrorMsg("Couldn't load transactions. Check the Supabase setup and try again.")
    } else {
      setTransactions(data)
    }
    setLoading(false)
  }

  async function fetchBudgets() {
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('category', { ascending: true })

    if (!error) setBudgets(data)
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || !form.category.trim()) {
      setErrorMsg('Add an amount and a category before saving.')
      return
    }

    setSaving(true)
    setErrorMsg('')

    const { error } = await supabase.from('transactions').insert([
      {
        type: form.type,
        amount: parseFloat(form.amount),
        category: form.category.trim(),
        note: form.note.trim(),
        date: form.date,
        is_recurring: form.isRecurring,
      },
    ])

    if (error) {
      setErrorMsg("Couldn't save that entry. Try again in a moment.")
    } else {
      setForm({ ...EMPTY_FORM, date: form.date })
      fetchTransactions()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    await supabase.from('transactions').delete().eq('id', id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  function updateBudgetField(field, value) {
    setBudgetForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleBudgetSubmit(e) {
    e.preventDefault()
    if (!budgetForm.category.trim() || !budgetForm.monthlyLimit) {
      setBudgetError('Add a category and a monthly limit.')
      return
    }

    setSavingBudget(true)
    setBudgetError('')

    const { error } = await supabase.from('budgets').upsert(
      [
        {
          category: budgetForm.category.trim(),
          monthly_limit: parseFloat(budgetForm.monthlyLimit),
        },
      ],
      { onConflict: 'user_id,category' }
    )

    if (error) {
      setBudgetError("Couldn't save that budget. Try again.")
    } else {
      setBudgetForm(EMPTY_BUDGET_FORM)
      fetchBudgets()
    }
    setSavingBudget(false)
  }

  async function handleDeleteBudget(id) {
    await supabase.from('budgets').delete().eq('id', id)
    setBudgets((prev) => prev.filter((b) => b.id !== id))
  }

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpense
  const isPositive = balance >= 0

  const incomeByCategory = useMemo(() => groupTotalsByCategory(transactions, 'income'), [transactions])
  const expenseByCategory = useMemo(() => groupTotalsByCategory(transactions, 'expense'), [transactions])

  const monthSpendByCategory = useMemo(() => {
    const now = new Date()
    const totals = {}
    transactions
      .filter((t) => t.type === 'expense' && isSameMonth(t.date, now))
      .forEach((t) => {
        totals[t.category] = (totals[t.category] || 0) + Number(t.amount)
      })
    return totals
  }, [transactions])

  const recurringIncome = transactions.filter((t) => t.is_recurring && t.type === 'income')
  const recurringExpense = transactions.filter((t) => t.is_recurring && t.type === 'expense')

  if (authLoading) {
    return <div className="auth-loading">Loading…</div>
  }

  if (!session) {
    return <LoginScreen onSignIn={signInWithGoogle} />
  }

  const maxIncome = Math.max(1, ...incomeByCategory.map((c) => c.total))
  const maxExpense = Math.max(1, ...expenseByCategory.map((c) => c.total))

  return (
    <div className="page">
      <header className="page-header no-print">
        <div>
          <span className="eyebrow">Personal finance, kept honest</span>
          <h1>FinanceFlow</h1>
        </div>
        <div className="user-pill">
          <span>{session.user.email}</span>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs no-print">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'dashboard' && (
        <>
          <section className={`balance-card ${isPositive ? 'is-positive' : 'is-negative'}`}>
            <div className="balance-figure">
              <span className="balance-label">Current balance</span>
              <span className="balance-amount">
                <span className="currency">Rs.</span>
                {formatMoney(balance)}
              </span>
            </div>
            <div className="balance-split">
              <div className="split-item">
                <span className="split-dot income" />
                <span className="split-label">Income</span>
                <span className="split-value">Rs. {formatMoney(totalIncome)}</span>
              </div>
              <div className="split-item">
                <span className="split-dot expense" />
                <span className="split-label">Expenses</span>
                <span className="split-value">Rs. {formatMoney(totalExpense)}</span>
              </div>
            </div>
          </section>

          <section className="card no-print">
            <h2>Add an entry</h2>
            <form className="entry-form" onSubmit={handleSubmit}>
              <div className="type-toggle">
                <button
                  type="button"
                  className={form.type === 'expense' ? 'active expense' : ''}
                  onClick={() => updateField('type', 'expense')}
                >
                  Expense
                </button>
                <button
                  type="button"
                  className={form.type === 'income' ? 'active income' : ''}
                  onClick={() => updateField('type', 'income')}
                >
                  Income
                </button>
              </div>

              <div className="field-row">
                <label>
                  Amount (Rs.)
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(e) => updateField('amount', e.target.value)}
                  />
                </label>
                <label>
                  Date
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => updateField('date', e.target.value)}
                  />
                </label>
              </div>

              <label>
                Category
                <input
                  type="text"
                  placeholder="e.g. Groceries, Salary, Transport"
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                />
              </label>

              <label>
                Note (optional)
                <input
                  type="text"
                  placeholder="Anything worth remembering about this entry"
                  value={form.note}
                  onChange={(e) => updateField('note', e.target.value)}
                />
              </label>

              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => updateField('isRecurring', e.target.checked)}
                />
                Save as recurring
              </label>

              {errorMsg && <p className="form-error">{errorMsg}</p>}

              <button type="submit" className="submit-btn" disabled={saving}>
                {saving ? 'Saving\u2026' : 'Save entry'}
              </button>
            </form>
          </section>

          <section className="card">
            <div className="card-header-row">
              <h2>Recent activity</h2>
              <button type="button" className="print-btn no-print" onClick={() => window.print()}>
                Export PDF
              </button>
            </div>
            {loading ? (
              <p className="muted">Loading your entries…</p>
            ) : transactions.length === 0 ? (
              <p className="muted">No entries yet. Add your first one above.</p>
            ) : (
              <ul className="transaction-list">
                {transactions.map((t) => (
                  <TransactionRow key={t.id} t={t} onDelete={handleDelete} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === 'categories' && (
        <>
          <section className="card">
            <h2>Income by category</h2>
            {incomeByCategory.length === 0 ? (
              <p className="muted">No income entries yet.</p>
            ) : (
              <ul className="breakdown-list">
                {incomeByCategory.map((c) => (
                  <li key={c.category}>
                    <div className="breakdown-row">
                      <span>{c.category}</span>
                      <span>Rs. {formatMoney(c.total)}</span>
                    </div>
                    <div className="breakdown-bar-track">
                      <div
                        className="breakdown-bar income"
                        style={{ width: `${(c.total / maxIncome) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>Expenses by category</h2>
            {expenseByCategory.length === 0 ? (
              <p className="muted">No expense entries yet.</p>
            ) : (
              <ul className="breakdown-list">
                {expenseByCategory.map((c) => (
                  <li key={c.category}>
                    <div className="breakdown-row">
                      <span>{c.category}</span>
                      <span>Rs. {formatMoney(c.total)}</span>
                    </div>
                    <div className="breakdown-bar-track">
                      <div
                        className="breakdown-bar expense"
                        style={{ width: `${(c.total / maxExpense) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === 'budgets' && (
        <>
          <section className="card">
            <h2>Set a monthly budget</h2>
            <form className="entry-form" onSubmit={handleBudgetSubmit}>
              <div className="field-row">
                <label>
                  Category
                  <input
                    type="text"
                    placeholder="e.g. Groceries"
                    value={budgetForm.category}
                    onChange={(e) => updateBudgetField('category', e.target.value)}
                  />
                </label>
                <label>
                  Monthly limit (Rs.)
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={budgetForm.monthlyLimit}
                    onChange={(e) => updateBudgetField('monthlyLimit', e.target.value)}
                  />
                </label>
              </div>
              {budgetError && <p className="form-error">{budgetError}</p>}
              <button type="submit" className="submit-btn" disabled={savingBudget}>
                {savingBudget ? 'Saving\u2026' : 'Save budget'}
              </button>
            </form>
          </section>

          <section className="card">
            <h2>This month</h2>
            {budgets.length === 0 ? (
              <p className="muted">No budgets set yet. Add one above.</p>
            ) : (
              <ul className="budget-list">
                {budgets.map((b) => {
                  const spent = monthSpendByCategory[b.category] || 0
                  const percent = Math.min((spent / b.monthly_limit) * 100, 100)
                  const isOver = spent > b.monthly_limit
                  return (
                    <li key={b.id} className="budget-row">
                      <div className="budget-row-top">
                        <span className="budget-category">{b.category}</span>
                        {isOver && <span className="over-badge">OVER BUDGET</span>}
                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => handleDeleteBudget(b.id)}
                          aria-label="Delete budget"
                        >
                          ×
                        </button>
                      </div>
                      <div className="budget-track">
                        <div
                          className={`budget-fill ${isOver ? 'over' : ''}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <div className="budget-figures">
                        <span>Rs. {formatMoney(spent)} spent</span>
                        <span>of Rs. {formatMoney(b.monthly_limit)}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === 'recurring' && (
        <>
          <section className="card">
            <h2>↑ Recurring income</h2>
            {recurringIncome.length === 0 ? (
              <p className="muted">No recurring income entries yet.</p>
            ) : (
              <ul className="transaction-list">
                {recurringIncome.map((t) => (
                  <TransactionRow key={t.id} t={t} onDelete={handleDelete} />
                ))}
              </ul>
            )}
          </section>

          <section className="card">
            <h2>↓ Recurring expenses</h2>
            {recurringExpense.length === 0 ? (
              <p className="muted">No recurring expense entries yet.</p>
            ) : (
              <ul className="transaction-list">
                {recurringExpense.map((t) => (
                  <TransactionRow key={t.id} t={t} onDelete={handleDelete} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
