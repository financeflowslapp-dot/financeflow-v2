import { useCallback, useState } from 'react'
import { goalsApi, goalAllocationsApi } from '../services/api.js'
import { useToast } from '../contexts/ToastContext.jsx'
import { TODAY } from '../constants/index.js'
import { findMatchingGoals } from '../utils/goalMatching.js'

export function useGoals() {
  const [goals, setGoals] = useState([])
  const toast = useToast()

  const fetchGoals = useCallback(async () => {
    const { data } = await goalsApi.fetchAll()
    if (data) setGoals(data)
  }, [])

  const addGoal = useCallback(async (payload) => {
    const { error } = await goalsApi.insert(payload)
    if (error) { toast("Couldn't save goal.", 'error'); return false }
    toast('Goal created!', 'success')
    await fetchGoals(); return true
  }, [fetchGoals, toast])

  const updateGoal = useCallback(async (id, payload) => {
    const { error } = await goalsApi.update(id, payload)
    if (error) { toast("Couldn't update goal.", 'error'); return false }
    toast('Goal updated!', 'success')
    await fetchGoals(); return true
  }, [fetchGoals, toast])

  const deleteGoal = useCallback(async (id) => {
    await goalsApi.delete(id)
    setGoals(p => p.filter(g => g.id !== id))
    toast('Goal removed.', 'info')
  }, [toast])

  const addContribution = useCallback(async (goal, amount) => {
    const newSaved = Math.min(Number(goal.saved) + Number(amount), Number(goal.target))
    return updateGoal(goal.id, { saved: newSaved })
  }, [updateGoal])

  // Allocate an amount to a goal — updates progress and records history.
  // transactionId links the allocation so it can be reversed on edit/delete.
  const allocateToGoal = useCallback(async (goal, amount, category, note = '', transactionId = null) => {
    const newSaved = Math.min(Number(goal.saved) + Number(amount), Number(goal.target))
    const { error: allocErr } = await goalAllocationsApi.insert({
      goal_id:        goal.id,
      amount:         Number(amount),
      note:           note || null,
      category:       category || null,
      allocated_at:   TODAY(),
      transaction_id: transactionId || null,
    })
    if (allocErr) { toast("Couldn't record allocation.", 'error'); return false }
    const { error } = await goalsApi.update(goal.id, { saved: newSaved })
    if (error) { toast("Couldn't update goal.", 'error'); return false }
    await fetchGoals()
    toast(`Rs. ${Math.round(amount).toLocaleString('en-LK')} allocated to "${goal.name}"!`, 'success')
    return true
  }, [fetchGoals, toast])

  // Reverse all allocations linked to a transaction, restoring goal.saved.
  // Primary path: looks up goal_allocations by transaction_id (audit log).
  // Fallback: if no audit record (pre-schema_update_13 allocations), re-fetches
  //   goal state fresh from DB so stale React state doesn't corrupt the reversal.
  const reverseAllocation = useCallback(async (transactionId, transactionFallback = null) => {
    if (!transactionId) return

    // Try audit log first
    const { data: allocs } = await goalAllocationsApi.fetchByTransaction(transactionId)
    if (allocs && allocs.length > 0) {
      // Always fetch goals fresh from DB — avoids stale-closure bugs when
      // reverse + reapply fire sequentially in the same edit operation.
      const { data: freshGoals } = await goalsApi.fetchAll()
      for (const alloc of allocs) {
        const goal = (freshGoals ?? []).find(g => g.id === alloc.goal_id)
        if (!goal) continue
        const newSaved = Math.max(0, Number(goal.saved) - Number(alloc.amount))
        await goalsApi.update(alloc.goal_id, { saved: newSaved })
      }
      await goalAllocationsApi.deleteByTransaction(transactionId)
      await fetchGoals()
      return
    }

    // Fallback: no audit record — try to find matching goal from transaction data
    // and reverse if the transaction amount is still reflected there.
    // This is best-effort for pre-migration data; can't be perfectly accurate
    // without an audit trail, but prevents double-counting on re-edits.
    if (!transactionFallback) return
    const { data: freshGoals } = await goalsApi.fetchAll()
    const matched = findMatchingGoals(
      freshGoals ?? [],
      transactionFallback.category,
      transactionFallback.note || ''
    )
    // Only reverse if exactly one goal matches — ambiguous cases are left alone
    if (matched.length === 1) {
      const goal = matched[0]
      const newSaved = Math.max(0, Number(goal.saved) - Number(transactionFallback.amount))
      await goalsApi.update(goal.id, { saved: newSaved })
      await fetchGoals()
    }
  }, [fetchGoals])

  const updateKeywords = useCallback(async (goal, linkedCategories, keywords) => {
    return updateGoal(goal.id, {
      linked_categories: linkedCategories,
      trigger_keywords:  keywords,
    })
  }, [updateGoal])

  return { goals, fetchGoals, addGoal, updateGoal, deleteGoal, addContribution, allocateToGoal, reverseAllocation, updateKeywords }
}
