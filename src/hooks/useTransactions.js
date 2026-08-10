import {useCallback,useState} from 'react'
import {txnApi} from '../services/api.js'
import {useToast} from '../contexts/ToastContext.jsx'

// userId is required so every query is explicitly scoped to the signed-in
// user — this does NOT rely on RLS alone, because an admin account is also
// permitted by RLS to read every user's transactions (needed for the Admin
// panel's aggregate stats). Without this explicit filter here, an admin's
// own Dashboard/History would silently pull in every other user's entries too.
export function useTransactions(userId){
  const[transactions,setTransactions]=useState([])
  const[loading,setLoading]=useState(true)
  const toast=useToast()
  const fetchTransactions=useCallback(async()=>{
    if(!userId){setTransactions([]);setLoading(false);return}
    setLoading(true)
    const{data,error}=await txnApi.fetchAll(userId)
    if(error)toast("Couldn't load entries.",'error')
    else setTransactions(data)
    setLoading(false)
  },[toast,userId])
  const addTransaction=useCallback(async(payload)=>{
    const{data,error}=await txnApi.insert(payload)
    if(error){toast("Couldn't save entry.",'error');return null}
    toast('Entry saved!','success')
    await fetchTransactions()
    // Return the new transaction id so callers can link audit records (CC, goal) back to it
    return data?.[0]?.id ?? true
  },[fetchTransactions,toast])
  const updateTransaction=useCallback(async(id,payload)=>{
    const{error}=await txnApi.update(id,payload)
    if(error){toast("Couldn't update entry.",'error');return false}
    toast('Entry updated!','success')
    await fetchTransactions()
    return true
  },[fetchTransactions,toast])
  const deleteTransaction=useCallback(async(id)=>{
    await txnApi.delete(id)
    setTransactions(p=>p.filter(t=>t.id!==id))
    toast('Entry deleted.','info')
  },[toast])
  return{transactions,loading,fetchTransactions,addTransaction,updateTransaction,deleteTransaction}
}
