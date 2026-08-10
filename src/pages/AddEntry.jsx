import { useEffect, useMemo, useState } from 'react'
import { EMPTY_FORM } from '../constants/index.js'
import { formatAmountInput, sanitizeAmountInput, formatMoney } from '../utils/format.js'
import { Modal } from '../components/ui/Modal.jsx'
import { findMatchingGoals } from '../utils/goalMatching.js'

// ── Smart Goal Picker Dialog ──────────────────────────────────────────────────
// ONE dialog even when multiple goals share the same category.
// User picks exactly one goal to allocate to — or clicks Skip.
function GoalPickerDialog({ linkedGoals, amount, category, onAllocate, onSkip }) {
  const [selectedId, setSelectedId] = useState(null)
  const [saving, setSaving]         = useState(false)

  const selected    = linkedGoals.find(g => g.id === selectedId) ?? null
  const afterAmount = selected
    ? Math.min(Number(selected.saved) + amount, Number(selected.target))
    : null

  async function handleAllocate() {
    if (!selected) return
    setSaving(true); await onAllocate(selected); setSaving(false)
  }

  return (
    <Modal
      title="Allocate to a goal?"
      onClose={onSkip}
      footer={
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onSkip} disabled={saving}>
            Skip — just save expense
          </button>
          <button className="btn btn-primary" onClick={handleAllocate} disabled={saving || !selected}>
            {saving ? 'Saving…' : 'Allocate'}
          </button>
        </div>
      }
    >
      <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--ink)' }}>{category}</strong> is linked to{' '}
        {linkedGoals.length === 1 ? 'a goal' : `${linkedGoals.length} goals`}. Pick one to receive{' '}
        <strong style={{ color: 'var(--forest-soft)' }}>Rs. {formatMoney(amount)}</strong> — or skip.
      </p>

      {/* Selectable goal cards */}
      <div className="goal-picker-list">
        {linkedGoals.map(g => {
          const pct        = Math.min((Number(g.saved) / Number(g.target)) * 100, 100)
          const isSelected = g.id === selectedId
          return (
            <button
              key={g.id}
              type="button"
              className={`goal-picker-card${isSelected ? ' selected' : ''}`}
              style={{ borderColor: isSelected ? g.color : 'var(--line)' }}
              onClick={() => setSelectedId(isSelected ? null : g.id)}
            >
              <div className="goal-picker-top">
                <span style={{ fontSize: 20 }}>{g.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div className="goal-picker-name">{g.name}</div>
                  <div className="goal-picker-saved">Rs. {formatMoney(g.saved)} / Rs. {formatMoney(g.target)}</div>
                </div>
                <span className="goal-picker-pct" style={{ color: g.color }}>{pct.toFixed(0)}%</span>
              </div>
              <div className="goal-track" style={{ marginTop: 8 }}>
                <div className="goal-fill" style={{ width: `${pct}%`, background: g.color }} />
              </div>
            </button>
          )
        })}
      </div>

      {/* Live preview of what the allocation will do */}
      {selected && (
        <div className="goal-alloc-progress" style={{ marginTop: 14 }}>
          <div className="goal-alloc-row">
            <span>Current progress</span>
            <span style={{ color: selected.color }}>Rs. {formatMoney(selected.saved)}</span>
          </div>
          <div className="goal-alloc-row">
            <span>After allocation</span>
            <span style={{ color: 'var(--emerald)', fontWeight: 600 }}>Rs. {formatMoney(afterAmount)}</span>
          </div>
          <div className="goal-alloc-row">
            <span>Target</span>
            <span>Rs. {formatMoney(selected.target)}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}

// ── Main AddEntry Form ────────────────────────────────────────────────────────
export function AddEntry({ incomeCategories, expenseCategories, onAdd, isAdmin, onManageCategories, goals = [], onAllocateToGoal, creditCards = [], onRecordPurchase, onRecordRepayment }) {
  const [form,         setForm]         = useState(() => EMPTY_FORM())
  const [saving,       setSaving]       = useState(false)
  const [err,          setErr]          = useState('')
  const [pendingAlloc, setPendingAlloc] = useState(null)

  useEffect(() => { setForm(EMPTY_FORM()) }, [])

  const up      = (f, v) => setForm(p => ({ ...p, [f]: v }))
  const selType = t      => setForm(p => ({ ...p, type: t, category: '', paymentMethod: 'cash', creditCardId: '' }))

  function handleAmt(e) {
    const c = sanitizeAmountInput(e.target.value)
    if (c !== null) up('amount', c)
  }

  // Use shared matching logic. Only runs for expense type.
  const linkedGoals = useMemo(() => {
    if (form.type !== 'expense') return []
    return findMatchingGoals(goals, form.category, form.note)
  }, [goals, form.type, form.category, form.note])

  const isCCPayment = form.type === 'expense' && form.category === 'Credit Card Payments'
  const isCCExpense = form.type === 'expense' && form.paymentMethod === 'credit_card'
  const selectedCard = creditCards.find(c => String(c.id) === String(form.creditCardId)) ?? null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.amount || !form.category) { setErr('Add an amount and pick a category.'); return }
    if (isCCExpense && !form.creditCardId) { setErr('Select a credit card for this expense.'); return }
    if (isCCPayment && !form.creditCardId) { setErr('Select which credit card you are paying.'); return }
    setErr(''); setSaving(true)

    const result = await onAdd({
      type:           form.type,
      amount:         parseFloat(form.amount),
      category:       form.category,
      note:           form.note.trim(),
      date:           form.date,
      is_recurring:   form.isRecurring,
      payment_method: form.paymentMethod || 'cash',
      credit_card_id: form.creditCardId  || null,
    })
    setSaving(false)

    // onAdd returns the new transaction id (or true as fallback) — null means failure
    if (result) {
      const newTxnId    = typeof result === 'number' ? result : null
      const savedAmount   = parseFloat(form.amount)
      const savedNote     = form.note.trim()
      const savedCategory = form.category
      const savedGoals    = linkedGoals
      const savedCardId   = form.creditCardId
      const savedType     = form.type  // capture BEFORE setForm resets it

      setForm({ ...EMPTY_FORM(), type: form.type })

      // Credit card balance updates — pass transactionId so the effect is audited
      // and can be reversed if the transaction is later edited or deleted.
      if (isCCExpense && savedCardId && onRecordPurchase) {
        await onRecordPurchase(Number(savedCardId), savedAmount, newTxnId)
      } else if (isCCPayment && savedCardId && onRecordRepayment) {
        await onRecordRepayment(Number(savedCardId), savedAmount, newTxnId)
      }

      // Goal allocation: 1 match → auto, multiple → picker, 0 → nothing
      if (savedType === 'expense' && savedGoals.length === 1) {
        await onAllocateToGoal(savedGoals[0], savedAmount, savedCategory, savedNote, newTxnId)
      } else if (savedType === 'expense' && savedGoals.length > 1) {
        setPendingAlloc({ linkedGoals: savedGoals, amount: savedAmount, category: savedCategory, note: savedNote, txnId: newTxnId })
      }
    } else {
      setErr("Couldn't save. Try again.")
    }
  }

  async function handleAllocate(goal) {
    if (!pendingAlloc) return
    await onAllocateToGoal(goal, pendingAlloc.amount, pendingAlloc.category, pendingAlloc.note || '', pendingAlloc.txnId || null)
    setPendingAlloc(null)
  }

  const cats = form.type === 'income' ? incomeCategories : expenseCategories

  return (
    <div className="page-content">
      <section className="card">
        <div className="card-header-row">
          <h2 className="card-title">Add an entry</h2>
          {isAdmin && <button type="button" className="btn btn-ghost btn-sm" onClick={onManageCategories}>⚙ Categories</button>}
        </div>
        <form className="entry-form" onSubmit={handleSubmit}>
          <div className="type-toggle">
            <button type="button" className={form.type === 'income'  ? 'active income'  : ''} onClick={() => selType('income')}>↑ Income</button>
            <button type="button" className={form.type === 'expense' ? 'active expense' : ''} onClick={() => selType('expense')}>↓ Expense</button>
          </div>
          <div className="amount-input-wrap">
            <span className="amount-prefix">Rs.</span>
            <input className="amount-large" type="text" inputMode="decimal" placeholder="0.00"
              value={formatAmountInput(form.amount)} onChange={handleAmt} />
          </div>
          <div className="field-row">
            <label>Date<input type="date" value={form.date} onChange={e => up('date', e.target.value)} /></label>
            <label>Category
              <select value={form.category} onChange={e => up('category', e.target.value)}>
                <option value="" disabled>Select…</option>
                {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          </div>

          {/* Payment method — only shown for expenses */}
          {form.type === 'expense' && (
            <div className="payment-method-row">
              <label style={{ marginBottom: 0 }}>Payment method</label>
              <div className="payment-method-pills">
                {['cash','bank','credit_card'].map(m => (
                  <button key={m} type="button"
                    className={`payment-pill${(form.paymentMethod || 'cash') === m ? ' active' : ''}`}
                    onClick={() => setForm(p => ({ ...p, paymentMethod: m, creditCardId: '' }))}>
                    {m === 'cash' ? '💵 Cash' : m === 'bank' ? '🏦 Bank' : '💳 Credit Card'}
                  </button>
                ))}
              </div>
              {/* Credit card selector */}
              {form.paymentMethod === 'credit_card' && (
                <div className="cc-select-wrap">
                  {creditCards.length === 0 ? (
                    <p className="muted" style={{ fontSize: 13, margin: 0 }}>No credit cards saved. Add one in the 💳 Cards tab first.</p>
                  ) : (
                    <select value={form.creditCardId} onChange={e => up('creditCardId', e.target.value)}>
                      <option value="" disabled>Select card…</option>
                      {creditCards.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.bank_name} — {c.nickname} (Available: Rs. {Math.max(0, Number(c.credit_limit) - Number(c.outstanding_balance)).toLocaleString('en-LK')})
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedCard && (
                    <div className="cc-selected-info">
                      <span>Outstanding: <strong style={{ color: 'var(--brick)' }}>Rs. {Number(selectedCard.outstanding_balance).toLocaleString('en-LK')}</strong></span>
                      <span>Limit: Rs. {Number(selectedCard.credit_limit).toLocaleString('en-LK')}</span>
                    </div>
                  )}
                  {isCCExpense && (
                    <p className="cc-note">💡 Credit card expenses don't reduce your cash balance — only repayments do.</p>
                  )}
                </div>
              )}
              {/* CC repayment card selector */}
              {isCCPayment && form.paymentMethod !== 'credit_card' && creditCards.length > 0 && (
                <div className="cc-select-wrap">
                  <label style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 4 }}>Which card are you paying off?</label>
                  <select value={form.creditCardId} onChange={e => up('creditCardId', e.target.value)}>
                    <option value="" disabled>Select card…</option>
                    {creditCards.map(c => (
                      <option key={c.id} value={c.id}>{c.bank_name} — {c.nickname} (Outstanding: Rs. {Number(c.outstanding_balance).toLocaleString('en-LK')})</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {linkedGoals.length > 0 && (
            <div className="goal-link-hint">
              🎯 Matches <strong>{linkedGoals.map(g => g.name).join(' & ')}</strong>
              {linkedGoals.length === 1
                ? ' — will be automatically allocated after saving.'
                : ' — you\'ll pick which goal to allocate to after saving.'}
            </div>
          )}

          <label>Note <span style={{ fontWeight: 400, color: 'var(--ink-faint)' }}>(optional)</span>
            <input type="text" placeholder="What's this for?" value={form.note} onChange={e => up('note', e.target.value)} />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isRecurring} onChange={e => up('isRecurring', e.target.checked)} />
            <span><strong>Save as recurring</strong> <span style={{ color: 'var(--ink-muted)', fontWeight: 400, fontSize: 13 }}>— appears in Recurring tab</span></span>
          </label>
          {err && <p className="form-error">{err}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={saving}>
            {saving ? 'Saving…' : `Save ${form.type === 'income' ? 'income' : 'expense'}`}
          </button>
        </form>
      </section>

      {pendingAlloc && (
        <GoalPickerDialog
          linkedGoals={pendingAlloc.linkedGoals}
          amount={pendingAlloc.amount}
          category={pendingAlloc.category}
          onAllocate={handleAllocate}
          onSkip={() => setPendingAlloc(null)}
        />
      )}
    </div>
  )
}
