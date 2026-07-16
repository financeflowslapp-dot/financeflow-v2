import { useState } from 'react'
import { Modal } from '../components/ui/Modal.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { formatMoney } from '../utils/format.js'

function getBillStatus(dueDay) {
  const today = new Date().getDate()
  const diff  = dueDay - today
  if (diff < 0)  return { label: 'Overdue',   cls: 'overdue'  }
  if (diff === 0) return { label: 'Due today', cls: 'today'    }
  if (diff <= 5)  return { label: `Due in ${diff}d`, cls: 'soon' }
  return { label: `Day ${dueDay}`, cls: 'ok' }
}

function BillCard({ bill, onDelete }) {
  const status = getBillStatus(bill.due_day)
  return (
    <div className={`bill-card ${status.cls}`}>
      <div className="bill-left">
        <span className="bill-icon">{bill.is_subscription ? '🔄' : '📄'}</span>
        <div className="bill-info">
          <span className="bill-name">{bill.name}</span>
          <span className="bill-meta">
            {bill.category && <span>{bill.category} · </span>}
            <span className={`bill-status-badge ${status.cls}`}>{status.label}</span>
          </span>
        </div>
      </div>
      <div className="bill-right">
        <span className="bill-amount">Rs. {formatMoney(bill.amount)}</span>
        <button className="icon-action delete-btn" onClick={() => onDelete(bill.id)}>×</button>
      </div>
    </div>
  )
}

function AddBillModal({ categories, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', amount: '', due_day: '', category: '',
    is_subscription: false, is_active: true,
  })
  const [saving, setSaving] = useState(false)
  const up = (f, v) => setForm(p => ({ ...p, [f]: v }))

  async function handleSave() {
    if (!form.name || !form.amount || !form.due_day) return
    setSaving(true)
    await onSave({
      name:            form.name.trim(),
      amount:          parseFloat(form.amount),
      due_day:         parseInt(form.due_day),
      category:        form.category || null,
      is_subscription: form.is_subscription,
      is_active:       true,
    })
    setSaving(false)
  }

  return (
    <Modal title="Add Bill / Subscription" onClose={onClose} footer={
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.amount || !form.due_day}>
          {saving ? 'Saving…' : 'Add'}
        </button>
      </div>
    }>
      <div className="entry-form">
        <div className="type-toggle">
          <button type="button" className={!form.is_subscription ? 'active income' : ''} onClick={() => up('is_subscription', false)}>📄 Bill</button>
          <button type="button" className={form.is_subscription  ? 'active expense' : ''} onClick={() => up('is_subscription', true)}>🔄 Subscription</button>
        </div>
        <label>Name<input type="text" placeholder="e.g. Dialog, Netflix, Rent…" value={form.name} onChange={e => up('name', e.target.value)} /></label>
        <div className="field-row">
          <label>Amount (Rs.)<input type="number" placeholder="0.00" value={form.amount} onChange={e => up('amount', e.target.value)} /></label>
          <label>Due day (1–31)<input type="number" min="1" max="31" placeholder="e.g. 25" value={form.due_day} onChange={e => up('due_day', e.target.value)} /></label>
        </div>
        <label>Category <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span>
          <select value={form.category} onChange={e => up('category', e.target.value)}>
            <option value="">Select…</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </label>
      </div>
    </Modal>
  )
}

export function Bills({ bills, expenseCategories, onAdd, onDelete }) {
  const [showAdd, setShowAdd] = useState(false)

  const today      = new Date().getDate()
  const overdue    = bills.filter(b => b.due_day < today)
  const upcoming   = bills.filter(b => b.due_day >= today && b.due_day <= today + 7)
  const rest       = bills.filter(b => b.due_day > today + 7)
  const totalMonthly = bills.reduce((s, b) => s + Number(b.amount), 0)
  const subscriptions = bills.filter(b => b.is_subscription)

  async function handleAdd(payload) {
    const ok = await onAdd(payload)
    if (ok) setShowAdd(false)
  }

  return (
    <div className="page-content">
      {bills.length > 0 && (
        <div className="kpi-grid kpi-grid-3">
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">📄</span><span className="kpi-label">Total bills</span></div>
            <div className="kpi-value">{bills.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">🔄</span><span className="kpi-label">Subscriptions</span></div>
            <div className="kpi-value" style={{ color: 'var(--forest-soft)' }}>{subscriptions.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">💸</span><span className="kpi-label">Monthly total</span></div>
            <div className="kpi-value" style={{ color: 'var(--brick)', fontSize: 15 }}>Rs. {formatMoney(totalMonthly)}</div>
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add bill / subscription</button>

      {bills.length === 0
        ? <EmptyState title="No bills tracked" description="Add your recurring bills and subscriptions to track them." />
        : (
          <>
            {overdue.length > 0 && (
              <div className="bills-section">
                <h3 className="bills-section-title overdue">⚠ Overdue</h3>
                {overdue.map(b => <BillCard key={b.id} bill={b} onDelete={onDelete} />)}
              </div>
            )}
            {upcoming.length > 0 && (
              <div className="bills-section">
                <h3 className="bills-section-title soon">🔔 Due this week</h3>
                {upcoming.map(b => <BillCard key={b.id} bill={b} onDelete={onDelete} />)}
              </div>
            )}
            {rest.length > 0 && (
              <div className="bills-section">
                <h3 className="bills-section-title ok">📅 Upcoming</h3>
                {rest.map(b => <BillCard key={b.id} bill={b} onDelete={onDelete} />)}
              </div>
            )}
          </>
        )
      }

      {showAdd && <AddBillModal categories={expenseCategories} onSave={handleAdd} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
