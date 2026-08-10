import {useCallback,useState} from 'react'
import {budgetApi} from '../services/api.js'
import {useToast} from '../contexts/ToastContext.jsx'
export function useBudgets(){
  const[budgets,setBudgets]=useState([])
  const toast=useToast()
  const fetchBudgets=useCallback(async()=>{
    const{data}=await budgetApi.fetchAll()
    if(data)setBudgets(data)
  },[])
  const saveBudgets=useCallback(async(expCats,inputs)=>{
    const upserts=[];const deletions=[]
    expCats.forEach(c=>{
      const raw=inputs[c.name];const ex=budgets.find(b=>b.category===c.name)
      if(raw&&raw.trim()!==''&&!isNaN(parseFloat(raw)))upserts.push({category:c.name,monthly_limit:parseFloat(raw)})
      else if(ex)deletions.push(ex.id)
    })
    if(upserts.length>0){const{error}=await budgetApi.upsert(upserts);if(error){toast("Couldn't save.",'error');return false}}
    await Promise.all(deletions.map(id=>budgetApi.delete(id)))
    await fetchBudgets();toast('Budget limits saved!','success');return true
  },[budgets,fetchBudgets,toast])
  return{budgets,fetchBudgets,saveBudgets}
}
