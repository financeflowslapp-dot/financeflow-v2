import { useCallback, useState } from 'react'
import { creditCardApi, ccTxnApi } from '../services/api.js'
import { useToast } from '../contexts/ToastContext.jsx'

export function useCreditCards() {
  const [creditCards, setCreditCards] = useState([])
  const [loading, setLoading]         = useState(true)
  const toast = useToast()

  const fetchCreditCards = useCallback(async () => {
    setLoading(true)
    const { data } = await creditCardApi.fetchAll()
    setCreditCards(data ?? [])
    setLoading(false)
  }, [])

  const addCreditCard = useCallback(async (payload) => {
    const { error } = await creditCardApi.insert(payload)
    if (error) { toast("Couldn't save card.", 'error'); return false }
    toast('Credit card added!', 'success')
    await fetchCreditCards(); return true
  }, [fetchCreditCards, toast])

  const updateCreditCard = useCallback(async (id, payload) => {
    const { error } = await creditCardApi.update(id, payload)
    if (error) { toast("Couldn't update card.", 'error'); return false }
    await fetchCreditCards(); return true
  }, [fetchCreditCards, toast])

  const deleteCreditCard = useCallback(async (id) => {
    await creditCardApi.delete(id)
    setCreditCards(p => p.filter(c => c.id !== id))
    toast('Card removed.', 'info')
  }, [toast])

  // ── Internal: apply a delta to a card's outstanding balance ─────────────────
  // Always fetches the card fresh from DB before applying — avoids stale-closure
  // bugs when reverse + reapply fire sequentially in the same edit operation.
  const _applyBalanceDelta = useCallback(async (cardId, delta) => {
    const { data: fresh } = await creditCardApi.fetchAll()
    const card = (fresh ?? []).find(c => Number(c.id) === Number(cardId))
    if (!card) return
    const newBalance = Math.max(0, Number(card.outstanding_balance) + delta)
    await creditCardApi.update(cardId, { outstanding_balance: newBalance })
    setCreditCards(p => p.map(c =>
      Number(c.id) === Number(cardId) ? { ...c, outstanding_balance: newBalance } : c
    ))
  }, [])

  // ── Purchase: CC expense — increases outstanding, does NOT touch cash ───────
  const recordPurchase = useCallback(async (cardId, amount, transactionId = null) => {
    await _applyBalanceDelta(cardId, +Number(amount))
    if (transactionId) {
      await ccTxnApi.insert({
        transaction_id: transactionId,
        credit_card_id: cardId,
        amount:         Number(amount),
        effect_type:    'purchase',
      })
    }
  }, [_applyBalanceDelta])

  // ── Repayment: CC payment — decreases outstanding, cash DOES leave account ──
  const recordRepayment = useCallback(async (cardId, amount, transactionId = null) => {
    await _applyBalanceDelta(cardId, -Number(amount))
    if (transactionId) {
      await ccTxnApi.insert({
        transaction_id: transactionId,
        credit_card_id: cardId,
        amount:         Number(amount),
        effect_type:    'repayment',
      })
    }
  }, [_applyBalanceDelta])

  // ── Reverse: undo whatever CC effect a transaction previously had ────────────
  // Primary path: looks up the audit log (credit_card_transactions) by transactionId.
  // Fallback path: if no audit record exists (pre-schema_update_14 transactions),
  //   derives the effect from the transaction's own payment_method + credit_card_id.
  const reverseCardEffect = useCallback(async (transactionId, transactionFallback = null) => {
    if (!transactionId) return

    // Try audit log first
    const { data: audits } = await ccTxnApi.fetchByTransaction(transactionId)
    if (audits && audits.length > 0) {
      for (const audit of audits) {
        const delta = audit.effect_type === 'purchase'
          ? -Number(audit.amount)
          : +Number(audit.amount)
        await _applyBalanceDelta(audit.credit_card_id, delta)
      }
      await ccTxnApi.deleteByTransaction(transactionId)
      return
    }

    // Fallback: derive from the transaction record itself
    if (!transactionFallback || !transactionFallback.credit_card_id) return
    const t = transactionFallback
    const isCCPurchase  = t.payment_method === 'credit_card' && t.credit_card_id
    const isCCRepayment = t.category === 'Credit Card Payments' && t.credit_card_id

    if (isCCPurchase) {
      await _applyBalanceDelta(Number(t.credit_card_id), -Number(t.amount))
    } else if (isCCRepayment) {
      await _applyBalanceDelta(Number(t.credit_card_id), +Number(t.amount))
    }
  }, [_applyBalanceDelta])

  return {
    creditCards, loading,
    fetchCreditCards, addCreditCard, updateCreditCard, deleteCreditCard,
    recordPurchase, recordRepayment, reverseCardEffect,
  }
}
