import { useState } from 'react'
import { Modal } from '../ui/Modal.jsx'
import { formatAmountInput, sanitizeAmountInput } from '../../utils/format.js'
import { findMatchingGoals } from '../../utils/goalMatching.js'

const CC_PAYMENT_CAT = 'Credit Card Payments'

export function EditModal({
  transaction, incomeCategories, expenseCategories,
  goals = [], creditCards = [],
  onSave, onReverseAllocation, onAllocateToGoal,
  onReverseCardEffect, onRecordPurchase, onRecordRepayment,
  onClose,
}) {
  const [form, setForm] = useState({
    date:     transaction.date,
    category: transaction.category,
    amount:   String(transaction.amount),
    note:     transaction.note || '',
  })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  function handleAmt(e) {
    const c = sanitizeAmountInput(e.target.value)
    if (c !== null) setForm(p => ({ ...p, amount: c }))
  }

  async function handleSave() {
    if (!form.amount || !form.category) { setErr('Amount and category required.'); return }
    setSaving(true); setErr('')

    const newAmount   = parseFloat(form.amount)
    const newCategory = form.category
    const newNote     = form.note.trim()
    const txnId       = transaction.id

    // ── Step 1: Reverse ALL previous effects ──────────────────────────────────
    // Pass the full transaction as fallback for pre-migration records that have
    // no audit entry — the reversal functions use it to derive what to undo.
    if (onReverseCardEffect) await onReverseCardEffect(txnId, transaction)
    if (onReverseAllocation) await onReverseAllocation(txnId, transaction)

    // ── Step 2: Save updated transaction ──────────────────────────────────────
    const ok = await onSave(txnId, {
      date:     form.date,
      category: newCategory,
      amount:   newAmount,
      note:     newNote,
    })
    setSaving(false)
    if (!ok) { setErr("Couldn't save."); return }

    // ── Step 3: Re-apply CC effect based on updated values ────────────────────
    if (transaction.type === 'expense') {
      const isCCPurchase  = transaction.payment_method === 'credit_card' && transaction.credit_card_id
      const isCCRepayment = newCategory === CC_PAYMENT_CAT && transaction.credit_card_id
      if (isCCPurchase && onRecordPurchase) {
        await onRecordPurchase(Number(transaction.credit_card_id), newAmount, txnId)
      } else if (isCCRepayment && onRecordRepayment) {
        await onRecordRepayment(Number(transaction.credit_card_id), newAmount, txnId)
      }
    }

    // ── Step 4: Re-match goals with updated category + note ───────────────────
    if (transaction.type === 'expense' && onAllocateToGoal) {
      const matched = findMatchingGoals(goals, newCategory, newNote)
      if (matched.length === 1) {
        await onAllocateToGoal(matched[0], newAmount, newCategory, newNote, txnId)
      }
      // Multiple matches on edit → skip auto-pick; manual contribute available
    }

    onClose()
  }

  const cats = transaction.type === 'income' ? incomeCategories : expenseCategories
  return (
    <Modal title="Edit Entry" onClose={onClose} footer={
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    }>
      <div className="entry-form">
        <div className="field-row">
          <label>Date<input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></label>
          <label>Category
            <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {cats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <label>Amount (Rs.)<input type="text" inputMode="decimal" value={formatAmountInput(form.amount)} onChange={handleAmt} /></label>
        <label>Note<input type="text" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} /></label>
        {err && <p className="form-error">{err}</p>}
      </div>
    </Modal>
  )
}
