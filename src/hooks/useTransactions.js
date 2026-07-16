import {useCallback,useState} from 'react'
import {txnApi} from '../services/api.js'
import {useToast} from '../contexts/ToastContext.jsx'
export function useTransactions(){
  const[transactions,setTransactions]=useState([])
  const[loading,setLoading]=useState(true)
  const toast=useToast()
  const fetchTransactions=useCallback(async()=>{
    setLoading(true)
    const{data,error}=await txnApi.fetchAll()
    if(error)toast("Couldn't load entries.",'error')
    else setTransactions(data)
    setLoading(false)
  },[toast])
  const addTransaction=useCallback(async(payload)=>{
    const{error}=await txnApi.insert(payload)
    if(error){toast("Couldn't save entry.",'error');return false}
    toast('Entry saved!','success')
    await fetchTransactions()
    return true
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
