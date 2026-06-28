import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const TODAY = () => new Date().toISOString().slice(0, 10)

const EMPTY_FORM = {
  type: 'expense',
  amount: '',
  category: '',
  note: '',
  date: TODAY(),
}

function formatMoney(value) {
  const n = Number(value || 0)
  return n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function App() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTransactions()
  }, [])

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

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const balance = totalIncome - totalExpense
  const isPositive = balance >= 0

  return (
    <div className="page">
      <header className="page-header">
        <span className="eyebrow">Personal finance, kept honest</span>
        <h1>FinanceFlow</h1>
      </header>

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

      <section className="card">
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

          {errorMsg && <p className="form-error">{errorMsg}</p>}

          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? 'Saving…' : 'Save entry'}
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Recent activity</h2>
        {loading ? (
          <p className="muted">Loading your entries…</p>
        ) : transactions.length === 0 ? (
          <p className="muted">No entries yet. Add your first one above.</p>
        ) : (
          <ul className="transaction-list">
            {transactions.map((t) => (
              <li key={t.id} className="transaction-row">
                <span className={`type-dot ${t.type}`} />
                <div className="transaction-main">
                  <span className="transaction-category">{t.category}</span>
                  {t.note && <span className="transaction-note">{t.note}</span>}
                </div>
                <span className="transaction-date">{formatDate(t.date)}</span>
                <span className={`transaction-amount ${t.type}`}>
                  {t.type === 'income' ? '+' : '−'} Rs. {formatMoney(t.amount)}
                </span>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDelete(t.id)}
                  aria-label="Delete entry"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
