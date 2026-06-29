import { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabaseClient'

const TODAY = () => new Date().toISOString().slice(0, 10)

const PALETTE = [
  '#6c63ff',
  '#2d6a4f',
  '#e07a5f',
  '#f2b134',
  '#3aafa9',
  '#9d4edd',
  '#f25f5c',
  '#118ab2',
  '#ef476f',
  '#06d6a0',
]

const DEFAULT_CATEGORIES = [
  { name: 'Salary', type: 'income' },
  { name: 'Freelance', type: 'income' },
  { name: 'Part-time', type: 'income' },
  { name: 'Investment', type: 'income' },
  { name: 'PickMe', type: 'income' },
  { name: 'Uber', type: 'income' },
  { name: 'Other Ride Hailing', type: 'income' },
  { name: 'Other Income', type: 'income' },
  { name: 'Savings', type: 'expense' },
  { name: 'Food', type: 'expense' },
  { name: 'Transport', type: 'expense' },
  { name: 'Rent', type: 'expense' },
  { name: 'Utilities', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Health', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Fuel', type: 'expense' },
  { name: 'BNPL (Koko/MintPay)', type: 'expense' },
  { name: 'Loan Repayment', type: 'expense' },
  { name: 'Loan', type: 'expense' },
  { name: 'Other', type: 'expense' },
]

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  category: '',
  note: '',
  date: TODAY(),
  isRecurring: false,
}

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'add', label: '+ Add' },
  { id: 'history', label: 'History' },
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

function formatAmountInput(raw) {
  if (raw === undefined || raw === null || raw === '') return ''
  const [intPart, decPart] = String(raw).split('.')
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt
}

function sanitizeAmountInput(value) {
  const cleaned = value.replace(/,/g, '')
  return /^\d*\.?\d*$/.test(cleaned) ? cleaned : null
}

function daysBetweenInclusive(startStr, endStr) {
  const start = new Date(startStr)
  const end = new Date(endStr)
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
}

function cycleStatusLabel(endStr) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(endStr)
  end.setHours(0, 0, 0, 0)
  const diff = Math.round((end - today) / (1000 * 60 * 60 * 24))
  if (diff === 0) return 'Cycle ends today'
  if (diff < 0) return `Cycle ended ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} ago`
  return `Cycle ends in ${diff} day${diff === 1 ? '' : 's'}`
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

function withPercentAndColor(list, total) {
  return list.map((item, i) => ({
    ...item,
    percent: total > 0 ? (item.total / total) * 100 : 0,
    color: PALETTE[i % PALETTE.length],
  }))
}

function buildConicGradient(segments) {
  let cumulative = 0
  const stops = segments.map((s) => {
    const start = cumulative
    cumulative += s.percent
    return `${s.color} ${start}% ${cumulative}%`
  })
  return `conic-gradient(${stops.join(', ')})`
}

function budgetRatioClass(spent, limit) {
  if (!limit || limit <= 0 || isNaN(limit)) return ''
  const ratio = spent / limit
  if (ratio >= 1) return 'over'
  if (ratio >= 0.8) return 'warning'
  return ''
}

function Donut({ segments }) {
  const gradient = segments.length > 0 ? buildConicGradient(segments) : null
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ background: gradient || 'var(--line)' }}>
        <div className="donut-hole" />
      </div>
    </div>
  )
}

function BarCompare({ income, expense }) {
  const max = Math.max(income, expense, 1)
  return (
    <div className="bar-compare">
      <div className="bar-compare-col">
        <div className="bar-compare-track">
          <div className="bar-compare-bar income" style={{ height: `${(income / max) * 100}%` }} />
        </div>
        <span className="bar-compare-label">Income</span>
      </div>
      <div className="bar-compare-col">
        <div className="bar-compare-track">
          <div className="bar-compare-bar expense" style={{ height: `${(expense / max) * 100}%` }} />
        </div>
        <span className="bar-compare-label">Expense</span>
      </div>
    </div>
  )
}

function LoginScreen({ onSignIn, theme, onToggleTheme }) {
  return (
    <div className="login-screen">
      <button type="button" className="icon-btn theme-toggle-floating" onClick={onToggleTheme} aria-label="Toggle theme">
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
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

function TransactionRow({ t, onDelete, onEdit }) {
  return (
    <li className="transaction-row">
      <span className={`type-dot ${t.type}`} />
      <div className="transaction-main">
        <span className="transaction-category">{t.category}</span>
        {t.note && <span className="transaction-note">{t.note}</span>}
      </div>
      <span className="transaction-date">{formatDate(t.date)}</span>
      <span className={`transaction-amount ${t.type}`}>
        {t.type === 'income' ? '+' : '−'} Rs. {formatMoney(t.amount)}
      </span>
      {onEdit && (
        <button type="button" className="edit-btn" onClick={() => onEdit(t)} aria-label="Edit entry">
          ✎
        </button>
      )}
      <button type="button" className="delete-btn" onClick={() => onDelete(t.id)} aria-label="Delete entry">
        ×
      </button>
    </li>
  )
}

function CategoryManager({ title, type, categories, value, onValueChange, onAdd, onDelete }) {
  return (
    <section className="category-section">
      <h2>{title}</h2>
      <form
        className="category-add-row"
        onSubmit={(e) => {
          e.preventDefault()
          onAdd(type)
        }}
      >
        <input
          type="text"
          placeholder="Add a new category"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
        <button type="submit">Add</button>
      </form>
      {categories.length === 0 ? (
        <p className="muted">No categories yet.</p>
      ) : (
        <div className="category-chip-list">
          {categories.map((c) => (
            <span key={c.id} className="category-chip">
              {c.name}
              <button type="button" onClick={() => onDelete(c.id)} aria-label={`Delete ${c.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </section>
  )
}

export default function App() {
  const [theme, setTheme] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem('financeflow-theme')) || 'light'
  )

  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [categories, setCategories] = useState([])
  const [newIncomeCategory, setNewIncomeCategory] = useState('')
  const [newExpenseCategory, setNewExpenseCategory] = useState('')
  const [categoryError, setCategoryError] = useState('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  const [budgets, setBudgets] = useState([])
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [budgetInputs, setBudgetInputs] = useState({})
  const [budgetModalError, setBudgetModalError] = useState('')
  const [savingBudgets, setSavingBudgets] = useState(false)

  const [payCycle, setPayCycle] = useState(null)
  const [showCycleEditor, setShowCycleEditor] = useState(false)
  const [cycleForm, setCycleForm] = useState({ start: '', end: '' })
  const [cycleError, setCycleError] = useState('')
  const [savingCycle, setSavingCycle] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const [editingTransaction, setEditingTransaction] = useState(null)
  const [editForm, setEditForm] = useState({ date: '', category: '', amount: '', note: '', type: 'expense' })
  const [editError, setEditError] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('financeflow-theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'))
  }

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
      fetchCategories()
      fetchBudgets()
      fetchPayCycle()
      fetchIsAdmin()
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
    setCategories([])
    setPayCycle(null)
    setIsAdmin(false)
  }

  async function fetchIsAdmin() {
    const { data, error } = await supabase.from('app_admins').select('user_id').limit(1)
    setIsAdmin(!error && Array.isArray(data) && data.length > 0)
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

  async function fetchCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('name', { ascending: true })
    if (error) return

    if (data.length === 0) {
      await supabase.from('categories').insert(DEFAULT_CATEGORIES)
      const { data: seeded } = await supabase.from('categories').select('*').order('name', { ascending: true })
      setCategories(seeded || [])
    } else {
      setCategories(data)
    }
  }

  async function handleAddCategory(type) {
    const value = type === 'income' ? newIncomeCategory : newExpenseCategory
    if (!value.trim()) return

    setCategoryError('')
    const { error } = await supabase.from('categories').insert([{ name: value.trim(), type }])

    if (error) {
      setCategoryError(error.code === '23505' ? 'That category already exists.' : "Couldn't add that category.")
    } else {
      if (type === 'income') setNewIncomeCategory('')
      else setNewExpenseCategory('')
      fetchCategories()
    }
  }

  async function handleDeleteCategory(id) {
    await supabase.from('categories').delete().eq('id', id)
    setCategories((prev) => prev.filter((c) => c.id !== id))
  }

  async function fetchBudgets() {
    const { data, error } = await supabase.from('budgets').select('*').order('category', { ascending: true })
    if (!error) setBudgets(data)
  }

  async function fetchPayCycle() {
    const { data, error } = await supabase.from('pay_cycle').select('*').limit(1)
    if (!error) setPayCycle(data && data[0] ? data[0] : null)
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function selectType(type) {
    setForm((prev) => ({ ...prev, type, category: '' }))
  }

  function handleAmountChange(e) {
    const cleaned = sanitizeAmountInput(e.target.value)
    if (cleaned !== null) updateField('amount', cleaned)
  }

  function handleEditAmountChange(e) {
    const cleaned = sanitizeAmountInput(e.target.value)
    if (cleaned !== null) setEditForm((prev) => ({ ...prev, amount: cleaned }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || !form.category) {
      setErrorMsg('Add an amount and pick a category before saving.')
      return
    }

    setSaving(true)
    setErrorMsg('')

    const { error } = await supabase.from('transactions').insert([
      {
        type: form.type,
        amount: parseFloat(form.amount),
        category: form.category,
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

  function openEditModal(t) {
    setEditingTransaction(t)
    setEditForm({ date: t.date, category: t.category, amount: String(t.amount), note: t.note || '', type: t.type })
    setEditError('')
  }

  async function handleSaveEdit() {
    if (!editForm.amount || !editForm.category) {
      setEditError('Add an amount and pick a category.')
      return
    }

    setSavingEdit(true)
    setEditError('')

    const { error } = await supabase
      .from('transactions')
      .update({
        date: editForm.date,
        category: editForm.category,
        amount: parseFloat(editForm.amount),
        note: editForm.note.trim(),
      })
      .eq('id', editingTransaction.id)

    if (error) {
      setEditError("Couldn't save changes. Try again.")
    } else {
      setEditingTransaction(null)
      fetchTransactions()
    }
    setSavingEdit(false)
  }

  function openBudgetModal() {
    const inputs = {}
    expenseCategories.forEach((c) => {
      const existing = budgets.find((b) => b.category === c.name)
      inputs[c.name] = existing ? String(existing.monthly_limit) : ''
    })
    setBudgetInputs(inputs)
    setBudgetModalError('')
    setShowBudgetModal(true)
  }

  function updateBudgetInput(name, value) {
    setBudgetInputs((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSaveBudgets() {
    setSavingBudgets(true)
    setBudgetModalError('')

    const upserts = []
    const deletions = []

    expenseCategories.forEach((c) => {
      const raw = budgetInputs[c.name]
      const existing = budgets.find((b) => b.category === c.name)
      if (raw && raw.trim() !== '' && !isNaN(parseFloat(raw))) {
        upserts.push({ category: c.name, monthly_limit: parseFloat(raw) })
      } else if (existing) {
        deletions.push(existing.id)
      }
    })

    if (upserts.length > 0) {
      const { error } = await supabase.from('budgets').upsert(upserts, { onConflict: 'user_id,category' })
      if (error) {
        setBudgetModalError("Couldn't save some limits. Try again.")
        setSavingBudgets(false)
        return
      }
    }

    for (const id of deletions) {
      await supabase.from('budgets').delete().eq('id', id)
    }

    await fetchBudgets()
    setSavingBudgets(false)
    setShowBudgetModal(false)
  }

  function openCycleEditor() {
    setCycleForm({
      start: payCycle ? payCycle.start_date : TODAY(),
      end: payCycle ? payCycle.end_date : TODAY(),
    })
    setCycleError('')
    setShowCycleEditor(true)
  }

  async function handleSaveCycle() {
    if (!cycleForm.start || !cycleForm.end) {
      setCycleError('Pick both a start and end date.')
      return
    }
    if (new Date(cycleForm.end) < new Date(cycleForm.start)) {
      setCycleError('End date must be on or after the start date.')
      return
    }

    setSavingCycle(true)
    setCycleError('')

    const { error } = await supabase
      .from('pay_cycle')
      .upsert([{ start_date: cycleForm.start, end_date: cycleForm.end }], { onConflict: 'user_id' })

    if (error) {
      setCycleError("Couldn't save the pay cycle. Try again.")
    } else {
      setPayCycle({ start_date: cycleForm.start, end_date: cycleForm.end })
      setShowCycleEditor(false)
    }
    setSavingCycle(false)
  }

  const incomeCategories = categories.filter((c) => c.type === 'income')
  const expenseCategories = categories.filter((c) => c.type === 'expense')

  const cycleTransactions = useMemo(() => {
    if (!payCycle) return transactions
    const start = new Date(payCycle.start_date)
    const end = new Date(payCycle.end_date)
    return transactions.filter((t) => {
      const d = new Date(t.date)
      return d >= start && d <= end
    })
  }, [transactions, payCycle])

  const cycleIncome = cycleTransactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const cycleExpense = cycleTransactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const cycleBalance = cycleIncome - cycleExpense
  const isPositive = cycleBalance >= 0

  const cycleIncomeCount = cycleTransactions.filter((t) => t.type === 'income').length
  const cycleExpenseCount = cycleTransactions.filter((t) => t.type === 'expense').length

  const spendingPercent = cycleIncome > 0 ? (cycleExpense / cycleIncome) * 100 : 0

  const incomeBreakdown = useMemo(
    () => withPercentAndColor(groupTotalsByCategory(cycleTransactions, 'income'), cycleIncome),
    [cycleTransactions, cycleIncome]
  )
  const expenseBreakdown = useMemo(
    () => withPercentAndColor(groupTotalsByCategory(cycleTransactions, 'expense'), cycleExpense),
    [cycleTransactions, cycleExpense]
  )

  const recurringIncome = transactions.filter((t) => t.is_recurring && t.type === 'income')
  const recurringExpense = transactions.filter((t) => t.is_recurring && t.type === 'expense')

  const historyFiltered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false
      if (filterCategory !== 'all' && t.category !== filterCategory) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const matchNote = t.note && t.note.toLowerCase().includes(q)
        const matchCategory = t.category.toLowerCase().includes(q)
        if (!matchNote && !matchCategory) return false
      }
      return true
    })
  }, [transactions, filterType, filterCategory, searchQuery])

  const historyIncome = historyFiltered.filter((t) => t.type === 'income')
  const historyExpense = historyFiltered.filter((t) => t.type === 'expense')

  function handleExportPDF() {
    const doc = new jsPDF()
    const forest = [27, 67, 50]
    const brick = [168, 68, 50]
    const cycleLabel = payCycle ? `${formatDate(payCycle.start_date)} - ${formatDate(payCycle.end_date)}` : 'All time'

    doc.setFillColor(...forest)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.text('FinanceFlow', 14, 16)
    doc.setFontSize(9)
    doc.text(`Generated ${formatDate(TODAY())}  |  Pay cycle: ${cycleLabel}`, 14, 23)

    doc.setTextColor(0, 0, 0)
    let y = 38
    doc.setFontSize(11)
    doc.text(`Income: Rs. ${formatMoney(cycleIncome)}`, 14, y)
    doc.text(`Expenses: Rs. ${formatMoney(cycleExpense)}`, 85, y)
    doc.setTextColor(...(cycleBalance >= 0 ? forest : brick))
    doc.text(`Balance: Rs. ${formatMoney(cycleBalance)}`, 150, y)
    doc.setTextColor(0, 0, 0)
    y += 8

    autoTable(doc, {
      startY: y,
      head: [['Income by category', 'Amount (Rs.)', '%']],
      body: incomeBreakdown.map((c) => [c.category, formatMoney(c.total), `${c.percent.toFixed(0)}%`]),
      theme: 'grid',
      headStyles: { fillColor: forest },
      styles: { fontSize: 9 },
    })

    y = doc.lastAutoTable.finalY + 8

    autoTable(doc, {
      startY: y,
      head: [['Expenses by category', 'Amount (Rs.)', '%', 'Budget']],
      body: expenseBreakdown.map((c) => {
        const budget = budgets.find((b) => b.category === c.category)
        const status = budget ? (c.total > budget.monthly_limit ? 'Over' : 'OK') : '-'
        return [c.category, formatMoney(c.total), `${c.percent.toFixed(0)}%`, status]
      }),
      theme: 'grid',
      headStyles: { fillColor: brick },
      styles: { fontSize: 9 },
    })

    y = doc.lastAutoTable.finalY + 8

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Type', 'Category', 'Note', 'Amount (Rs.)']],
      body: cycleTransactions.map((t) => [
        formatDate(t.date),
        t.type,
        t.category,
        t.note || '',
        `${t.type === 'income' ? '+' : '-'} ${formatMoney(t.amount)}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: forest },
      styles: { fontSize: 8 },
      didDrawPage: () => {
        doc.setFontSize(8)
        doc.setTextColor(120)
        doc.text(
          `Generated by FinanceFlow - Page ${doc.internal.getNumberOfPages()}`,
          14,
          doc.internal.pageSize.height - 10
        )
      },
    })

    doc.save(`financeflow-${TODAY()}.pdf`)
  }

  if (authLoading) {
    return <div className="auth-loading">Loading…</div>
  }

  if (!session) {
    return <LoginScreen onSignIn={signInWithGoogle} theme={theme} onToggleTheme={toggleTheme} />
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">Personal finance, kept honest</span>
          <h1>FinanceFlow</h1>
        </div>
        <div className="user-pill">
          <button type="button" className="icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button type="button" className="icon-btn" onClick={openBudgetModal} aria-label="Budget limits">
            ⚙
          </button>
          <span>{session.user.email}</span>
          <button type="button" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="tabs">
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
            <div className="balance-card-top">
              <span className="balance-label">
                {payCycle ? `Balance · ${formatDate(payCycle.start_date)} → ${formatDate(payCycle.end_date)}` : 'Current balance'}
              </span>
              <button type="button" className="cycle-edit-btn" onClick={openCycleEditor}>
                {payCycle ? 'Edit Cycle' : 'Set Pay Cycle'}
              </button>
            </div>
            <span className="balance-amount">
              <span className="currency">Rs.</span>
              {formatMoney(cycleBalance)}
            </span>
            {payCycle && <span className="cycle-status">{cycleStatusLabel(payCycle.end_date)}</span>}
          </section>

          {showCycleEditor && (
            <section className="card cycle-editor">
              <h2>Set Pay Cycle</h2>
              <p className="muted">Choose the exact start and end dates for your pay cycle.</p>
              <div className="field-row">
                <label>
                  Start date
                  <input
                    type="date"
                    value={cycleForm.start}
                    onChange={(e) => setCycleForm((prev) => ({ ...prev, start: e.target.value }))}
                  />
                </label>
                <label>
                  End date
                  <input
                    type="date"
                    value={cycleForm.end}
                    onChange={(e) => setCycleForm((prev) => ({ ...prev, end: e.target.value }))}
                  />
                </label>
              </div>
              {cycleForm.start && cycleForm.end && (
                <p className="cycle-preview">
                  Preview: {formatDate(cycleForm.start)} → {formatDate(cycleForm.end)} (
                  {daysBetweenInclusive(cycleForm.start, cycleForm.end)} days)
                </p>
              )}
              {cycleError && <p className="form-error">{cycleError}</p>}
              <div className="cycle-editor-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowCycleEditor(false)}>
                  Cancel
                </button>
                <button type="button" className="submit-btn" onClick={handleSaveCycle} disabled={savingCycle}>
                  {savingCycle ? 'Saving…' : 'Save Cycle'}
                </button>
              </div>
            </section>
          )}

          <div className="summary-cards">
            <div className="summary-card income">
              <span className="summary-label">Income</span>
              <span className="summary-value">Rs. {formatMoney(cycleIncome)}</span>
              <span className="summary-count">{cycleIncomeCount} entries</span>
            </div>
            <div className="summary-card expense">
              <span className="summary-label">Expenses</span>
              <span className="summary-value">Rs. {formatMoney(cycleExpense)}</span>
              <span className="summary-count">{cycleExpenseCount} entries</span>
            </div>
          </div>

          <section className="card">
            <div className="spending-bar-label">
              <span>Spending</span>
              <span>{spendingPercent.toFixed(0)}% of income</span>
            </div>
            <div className="spending-bar-track">
              <div
                className={`spending-bar-fill ${spendingPercent > 100 ? 'over' : ''}`}
                style={{ width: `${Math.min(spendingPercent, 100)}%` }}
              />
            </div>
          </section>

          <section className="card">
            <h2>Income vs Expenses</h2>
            <BarCompare income={cycleIncome} expense={cycleExpense} />
          </section>

          <section className="card">
            <h2>Income breakdown</h2>
            {incomeBreakdown.length === 0 ? (
              <p className="muted">No income entries in this period yet.</p>
            ) : (
              <>
                <Donut segments={incomeBreakdown} />
                <ul className="breakdown-list">
                  {incomeBreakdown.map((c) => (
                    <li key={c.category}>
                      <div className="breakdown-row">
                        <span className="breakdown-label">
                          <span className="legend-dot" style={{ background: c.color }} />
                          {c.category}
                        </span>
                        <span>
                          Rs. {formatMoney(c.total)} <span className="breakdown-percent">{c.percent.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div className="breakdown-bar-track">
                        <div className="breakdown-bar" style={{ width: `${c.percent}%`, background: c.color }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="card">
            <h2>Expense breakdown</h2>
            {expenseBreakdown.length === 0 ? (
              <p className="muted">No expense entries in this period yet.</p>
            ) : (
              <>
                <Donut segments={expenseBreakdown} />
                <ul className="breakdown-list">
                  {expenseBreakdown.map((c) => {
                    const budget = budgets.find((b) => b.category === c.category)
                    const statusCls = budget ? budgetRatioClass(c.total, budget.monthly_limit) : ''
                    return (
                      <li key={c.category} className={statusCls}>
                        <div className="breakdown-row">
                          <span className="breakdown-label">
                            <span className="legend-dot" style={{ background: c.color }} />
                            {c.category}
                            {statusCls === 'over' && <span className="over-badge">OVER</span>}
                            {statusCls === 'warning' && <span className="warn-badge">80%+</span>}
                          </span>
                          <span>
                            Rs. {formatMoney(c.total)} <span className="breakdown-percent">{c.percent.toFixed(0)}%</span>
                          </span>
                        </div>
                        <div className="breakdown-bar-track">
                          <div className="breakdown-bar" style={{ width: `${c.percent}%`, background: c.color }} />
                        </div>
                        {budget && (
                          <span className="budget-note">
                            Rs. {formatMoney(c.total)} of Rs. {formatMoney(budget.monthly_limit)} limit
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </section>
        </>
      )}

      {activeTab === 'add' && (
        <section className="card">
          <div className="card-header-row">
            <h2>Add an entry</h2>
            {isAdmin && (
              <button type="button" className="print-btn" onClick={() => setShowCategoryModal(true)}>
                Manage categories
              </button>
            )}
          </div>
          <form className="entry-form" onSubmit={handleSubmit}>
            <div className="type-toggle">
              <button type="button" className={form.type === 'expense' ? 'active expense' : ''} onClick={() => selectType('expense')}>
                Expense
              </button>
              <button type="button" className={form.type === 'income' ? 'active income' : ''} onClick={() => selectType('income')}>
                Income
              </button>
            </div>

            <div className="field-row">
              <label>
                Amount (Rs.)
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formatAmountInput(form.amount)}
                  onChange={handleAmountChange}
                />
              </label>
              <label>
                Date
                <input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} />
              </label>
            </div>

            <label>
              Category
              <select value={form.category} onChange={(e) => updateField('category', e.target.value)}>
                <option value="" disabled>
                  Select a category
                </option>
                {(form.type === 'income' ? incomeCategories : expenseCategories).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
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
              {saving ? 'Saving…' : `Save ${form.type === 'income' ? 'Income' : 'Expense'}`}
            </button>
          </form>
        </section>
      )}

      {activeTab === 'history' && (
        <section className="card">
          <div className="card-header-row">
            <h2>All entries</h2>
            <button type="button" className="print-btn" onClick={handleExportPDF}>
              Export PDF
            </button>
          </div>

          <div className="history-filters">
            <input
              type="text"
              placeholder="Search by label or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="filter-row">
              <div className="type-filter-pills">
                <button type="button" className={filterType === 'all' ? 'active' : ''} onClick={() => setFilterType('all')}>
                  All
                </button>
                <button type="button" className={filterType === 'income' ? 'active' : ''} onClick={() => setFilterType('income')}>
                  Income
                </button>
                <button type="button" className={filterType === 'expense' ? 'active' : ''} onClick={() => setFilterType('expense')}>
                  Expense
                </button>
              </div>
              <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="entry-count">
              {historyFiltered.length} of {transactions.length} entries
            </span>
          </div>

          {loading ? (
            <p className="muted">Loading your entries…</p>
          ) : historyFiltered.length === 0 ? (
            <p className="muted">No entries match this filter.</p>
          ) : (
            <>
              {historyIncome.length > 0 && (
                <>
                  <h3 className="history-group-label income">↑ Income</h3>
                  <ul className="transaction-list with-edit">
                    {historyIncome.map((t) => (
                      <TransactionRow key={t.id} t={t} onDelete={handleDelete} onEdit={openEditModal} />
                    ))}
                  </ul>
                </>
              )}
              {historyExpense.length > 0 && (
                <>
                  <h3 className="history-group-label expense">↓ Expenses</h3>
                  <ul className="transaction-list with-edit">
                    {historyExpense.map((t) => (
                      <TransactionRow key={t.id} t={t} onDelete={handleDelete} onEdit={openEditModal} />
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
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

      {editingTransaction && (
        <div className="modal-backdrop" onClick={() => setEditingTransaction(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✎ Edit Entry</h2>
              <button type="button" className="modal-close" onClick={() => setEditingTransaction(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="entry-form modal-form">
              <div className="field-row">
                <label>
                  Date
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                  />
                </label>
                <label>
                  Category
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                  >
                    {(editForm.type === 'income' ? incomeCategories : expenseCategories).map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Amount (Rs.)
                <input type="text" inputMode="decimal" value={formatAmountInput(editForm.amount)} onChange={handleEditAmountChange} />
              </label>
              <label>
                Note
                <input
                  type="text"
                  value={editForm.note}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, note: e.target.value }))}
                />
              </label>
              {editError && <p className="form-error">{editError}</p>}
            </div>
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setEditingTransaction(null)}>
                Cancel
              </button>
              <button type="button" className="submit-btn" onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCategoryModal && isAdmin && (
        <div className="modal-backdrop" onClick={() => setShowCategoryModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Manage Categories</h2>
              <button type="button" className="modal-close" onClick={() => setShowCategoryModal(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modal-body">
              {categoryError && <p className="form-error">{categoryError}</p>}
              <CategoryManager
                title="Income categories"
                type="income"
                categories={incomeCategories}
                value={newIncomeCategory}
                onValueChange={setNewIncomeCategory}
                onAdd={handleAddCategory}
                onDelete={handleDeleteCategory}
              />
              <CategoryManager
                title="Expense categories"
                type="expense"
                categories={expenseCategories}
                value={newExpenseCategory}
                onValueChange={setNewExpenseCategory}
                onAdd={handleAddCategory}
                onDelete={handleDeleteCategory}
              />
            </div>
          </div>
        </div>
      )}

      {showBudgetModal && (
        <div className="modal-backdrop" onClick={() => setShowBudgetModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚙ Budget Limits</h2>
              <button type="button" className="modal-close" onClick={() => setShowBudgetModal(false)} aria-label="Close">
                ×
              </button>
            </div>
            <p className="muted">Set spending limits per expense category for this cycle. Yellow = 80%+, Red = exceeded.</p>
            <div className="modal-body">
              {expenseCategories.map((c) => {
                const spent = expenseBreakdown.find((b) => b.category === c.name)?.total || 0
                const cls = budgetRatioClass(spent, parseFloat(budgetInputs[c.name]))
                return (
                  <div key={c.id} className="budget-input-row">
                    <span className="budget-input-label">{c.name}</span>
                    <div className="budget-input-field">
                      <span className="budget-input-prefix">Rs.</span>
                      <input
                        type="number"
                        className={`budget-input ${cls}`}
                        placeholder="No limit"
                        value={budgetInputs[c.name] || ''}
                        onChange={(e) => updateBudgetInput(c.name, e.target.value)}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            {budgetModalError && <p className="form-error">{budgetModalError}</p>}
            <div className="modal-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowBudgetModal(false)}>
                Cancel
              </button>
              <button type="button" className="submit-btn" onClick={handleSaveBudgets} disabled={savingBudgets}>
                {savingBudgets ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
