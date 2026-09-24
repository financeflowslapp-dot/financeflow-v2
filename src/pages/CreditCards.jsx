import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../components/ui/Modal.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { DraftBanner } from '../components/ui/DraftBanner.jsx'
import { formatMoney } from '../utils/format.js'
import { useDraftPersistence } from '../hooks/useDraftPersistence.js'

const CARD_COLORS = ['#6366f1','#059669','#d97706','#be123c','#0ea5e9','#9d4edd','#f43f5e','#0891b2']

function utilizationLabel(pct) {
  if (pct <= 30) return { label: 'Excellent', cls: 'util-excellent' }
  if (pct <= 60) return { label: 'Moderate',  cls: 'util-moderate'  }
  if (pct <= 80) return { label: 'High',       cls: 'util-high'      }
  return                 { label: 'Critical',  cls: 'util-critical'  }
}

// ── Add / Edit Card Modal ─────────────────────────────────────────────────────
function CardModal({ card, onSave, onClose }) {
  const isEdit = !!card
  const baseline = useMemo(() => ({
    bank_name:           card?.bank_name           ?? '',
    nickname:            card?.nickname            ?? '',
    credit_limit:        card?.credit_limit        ?? '',
    outstanding_balance: card?.outstanding_balance ?? '',
    statement_date:      card?.statement_date      ?? '',
    payment_due_date:    card?.payment_due_date    ?? '',
    color:               card?.color               ?? CARD_COLORS[0],
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])
  const [form, setForm] = useState(baseline)
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')
  const up = (f, v) => setForm(p => ({ ...p, [f]: v }))

  // Edit forms get their own draft key (namespaced by the card's id) so an
  // in-progress edit of one card can never be confused with another card, or
  // with the blank "add a new card" draft.
  const draft = useDraftPersistence('credit_card', baseline, { recordId: card?.id ?? null })
  useEffect(() => { draft.saveDraft(form) }, [form]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinueDraft() {
    const data = draft.acceptPendingDraft()
    if (data) setForm(prev => ({ ...prev, ...data }))
  }

  async function handleSave() {
    if (!form.bank_name.trim() || !form.nickname.trim() || !form.credit_limit) {
      setErr('Bank name, nickname, and credit limit are required.'); return
    }
    setSaving(true); setErr('')
    const ok = await onSave({
      bank_name:           form.bank_name.trim(),
      nickname:            form.nickname.trim(),
      credit_limit:        parseFloat(form.credit_limit)        || 0,
      outstanding_balance: parseFloat(form.outstanding_balance) || 0,
      statement_date:      parseInt(form.statement_date)        || null,
      payment_due_date:    parseInt(form.payment_due_date)      || null,
      color:               form.color,
    })
    setSaving(false)
    if (ok) { draft.clearDraft(); onClose() } // only clear once the Supabase save actually succeeded
  }

  const avail = (parseFloat(form.credit_limit) || 0) - (parseFloat(form.outstanding_balance) || 0)
  const utilPct = form.credit_limit > 0 ? ((parseFloat(form.outstanding_balance) || 0) / parseFloat(form.credit_limit)) * 100 : 0

  return (
    <Modal title={isEdit ? `Edit — ${card.nickname}` : 'Add Credit Card'} onClose={onClose} footer={
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Card'}
        </button>
      </div>
    }>
      <div className="entry-form">
        {draft.pendingDraft && (
          <DraftBanner onContinue={handleContinueDraft} onDiscard={draft.discardPendingDraft} />
        )}
        {/* Privacy notice */}
        <div className="keyword-explainer">
          🔒 We never store card numbers, CVV, expiry dates, or PINs — only the information you see here.
        </div>

        {/* Color picker */}
        <div>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)', marginBottom: 8 }}>Card color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CARD_COLORS.map(c => (
              <button key={c} type="button"
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }}
                onClick={() => up('color', c)} />
            ))}
          </div>
        </div>

        <div className="field-row">
          <label>Bank name<input type="text" placeholder="e.g. DFCC, Commercial" value={form.bank_name} onChange={e => up('bank_name', e.target.value)} /></label>
          <label>Card nickname<input type="text" placeholder="e.g. Main Card, Travel Card" value={form.nickname} onChange={e => up('nickname', e.target.value)} /></label>
        </div>
        <div className="field-row">
          <label>Credit limit (Rs.)<input type="number" placeholder="0.00" value={form.credit_limit} onChange={e => up('credit_limit', e.target.value)} /></label>
          <label>Current outstanding (Rs.)<input type="number" placeholder="0.00" value={form.outstanding_balance} onChange={e => up('outstanding_balance', e.target.value)} /></label>
        </div>
        <div className="field-row">
          <label>Statement date <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(day of month)</span><input type="number" min="1" max="31" placeholder="e.g. 25" value={form.statement_date} onChange={e => up('statement_date', e.target.value)} /></label>
          <label>Payment due date <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(day of month)</span><input type="number" min="1" max="31" placeholder="e.g. 15" value={form.payment_due_date} onChange={e => up('payment_due_date', e.target.value)} /></label>
        </div>

        {/* Live preview */}
        {form.credit_limit > 0 && (
          <div className="cc-preview">
            <div className="cc-preview-row"><span>Available credit</span><span style={{ color: 'var(--emerald)', fontWeight: 700 }}>Rs. {formatMoney(Math.max(0, avail))}</span></div>
            <div className="cc-preview-row"><span>Utilization</span><span className={utilizationLabel(utilPct).cls} style={{ fontWeight: 700 }}>{utilPct.toFixed(1)}% — {utilizationLabel(utilPct).label}</span></div>
          </div>
        )}
        {err && <p className="form-error">{err}</p>}
      </div>
    </Modal>
  )
}

// ── Credit Card Card ──────────────────────────────────────────────────────────
function CreditCardItem({ card, onEdit, onDelete }) {
  const outstanding = Number(card.outstanding_balance)
  const limit       = Number(card.credit_limit)
  const available   = Math.max(0, limit - outstanding)
  const utilPct     = limit > 0 ? (outstanding / limit) * 100 : 0
  const util        = utilizationLabel(utilPct)
  const today       = new Date().getDate()
  const dueSoon     = card.payment_due_date && Math.abs(card.payment_due_date - today) <= 5

  return (
    <div className="cc-card" style={{ borderTopColor: card.color }}>
      <div className="cc-card-header">
        <div>
          <div className="cc-bank">{card.bank_name}</div>
          <div className="cc-nick" style={{ color: card.color }}>{card.nickname}</div>
        </div>
        <div className="cc-card-actions">
          <button className="btn btn-sm btn-ghost" onClick={() => onEdit(card)}>✏️</button>
          <button className="btn btn-sm btn-ghost" onClick={() => onDelete(card.id)}>×</button>
        </div>
      </div>

      <div className="cc-stats">
        <div className="cc-stat">
          <span className="cc-stat-label">Outstanding</span>
          <span className="cc-stat-val" style={{ color: 'var(--brick)' }}>Rs. {formatMoney(outstanding)}</span>
        </div>
        <div className="cc-stat">
          <span className="cc-stat-label">Available</span>
          <span className="cc-stat-val" style={{ color: 'var(--emerald)' }}>Rs. {formatMoney(available)}</span>
        </div>
        <div className="cc-stat">
          <span className="cc-stat-label">Limit</span>
          <span className="cc-stat-val">Rs. {formatMoney(limit)}</span>
        </div>
      </div>

      {/* Utilization bar */}
      <div className="cc-util-bar-wrap">
        <div className="cc-util-bar">
          <div className="cc-util-fill" style={{ width: `${Math.min(utilPct, 100)}%`, background: card.color }} />
        </div>
        <span className={`cc-util-label ${util.cls}`}>{utilPct.toFixed(1)}% — {util.label}</span>
      </div>

      {card.payment_due_date && (
        <div className={`cc-due ${dueSoon ? 'cc-due-urgent' : ''}`}>
          {dueSoon ? '⚠️' : '📅'} Payment due: {card.payment_due_date}{card.payment_due_date === 1 ? 'st' : card.payment_due_date === 2 ? 'nd' : card.payment_due_date === 3 ? 'rd' : 'th'} of month
        </div>
      )}
    </div>
  )
}

// ── Main Credit Cards Page ────────────────────────────────────────────────────
export function CreditCards({ creditCards, loading, onAdd, onUpdate, onDelete }) {
  const [showAdd,  setShowAdd]  = useState(false)
  const [editing,  setEditing]  = useState(null)

  const totalLimit       = creditCards.reduce((s, c) => s + Number(c.credit_limit),       0)
  const totalOutstanding = creditCards.reduce((s, c) => s + Number(c.outstanding_balance), 0)
  const totalAvailable   = Math.max(0, totalLimit - totalOutstanding)
  const overallUtil      = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0

  async function handleAdd(payload) {
    const ok = await onAdd(payload)
    if (ok) setShowAdd(false)
    return ok
  }
  async function handleUpdate(payload) {
    const ok = await onUpdate(editing.id, payload)
    if (ok) setEditing(null)
    return ok
  }

  if (loading) return <div className="page-content"><div className="card"><p className="muted">Loading cards…</p></div></div>

  return (
    <div className="page-content">
      {/* Summary KPIs */}
      {creditCards.length > 0 && (
        <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 4 }}>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">💳</span><span className="kpi-label">Total limit</span></div>
            <div className="kpi-value" style={{ fontSize: 15 }}>Rs. {formatMoney(totalLimit)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">🔴</span><span className="kpi-label">Outstanding</span></div>
            <div className="kpi-value" style={{ color: 'var(--brick)', fontSize: 15 }}>Rs. {formatMoney(totalOutstanding)}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">✅</span><span className="kpi-label">Available</span></div>
            <div className="kpi-value" style={{ color: 'var(--emerald)', fontSize: 15 }}>Rs. {formatMoney(totalAvailable)}</div>
            <div className={`kpi-sub ${utilizationLabel(overallUtil).cls}`}>
              {overallUtil.toFixed(1)}% utilization — {utilizationLabel(overallUtil).label}
            </div>
          </div>
        </div>
      )}

      <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Credit Card</button>

      {creditCards.length === 0
        ? <EmptyState title="No credit cards yet" description="Add your cards to track outstanding balances, available credit, and utilization." />
        : (
          <div className="cc-grid">
            {creditCards.map(c => (
              <CreditCardItem key={c.id} card={c} onEdit={setEditing} onDelete={onDelete} />
            ))}
          </div>
        )
      }

      {showAdd  && <CardModal onSave={handleAdd}   onClose={() => setShowAdd(false)} />}
      {editing  && <CardModal card={editing} onSave={handleUpdate} onClose={() => setEditing(null)} />}
    </div>
  )
}
