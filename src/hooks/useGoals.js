import { useCallback, useState } from 'react'
import { goalsApi } from '../services/api.js'
import { useToast } from '../contexts/ToastContext.jsx'

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

  return { goals, fetchGoals, addGoal, updateGoal, deleteGoal, addContribution }
}
