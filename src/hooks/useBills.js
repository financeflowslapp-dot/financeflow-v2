import { useCallback, useState } from 'react'
import { billsApi } from '../services/api.js'
import { useToast } from '../contexts/ToastContext.jsx'

export function useBills() {
  const [bills, setBills] = useState([])
  const toast = useToast()

  const fetchBills = useCallback(async () => {
    const { data } = await billsApi.fetchAll()
    if (data) setBills(data)
  }, [])

  const addBill = useCallback(async (payload) => {
    const { error } = await billsApi.insert(payload)
    if (error) { toast("Couldn't save bill.", 'error'); return false }
    toast('Bill added!', 'success')
    await fetchBills(); return true
  }, [fetchBills, toast])

  const deleteBill = useCallback(async (id) => {
    await billsApi.delete(id)
    setBills(p => p.filter(b => b.id !== id))
    toast('Bill removed.', 'info')
  }, [toast])

  return { bills, fetchBills, addBill, deleteBill }
}
