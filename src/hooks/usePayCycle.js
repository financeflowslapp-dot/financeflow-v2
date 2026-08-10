import {useCallback,useState} from 'react'
import {cycleApi} from '../services/api.js'
import {useToast} from '../contexts/ToastContext.jsx'

// payCycle      -> the current/active cycle (most recent row)
// cycleHistory  -> current cycle + up to a few previous ones, for the History dropdown
export function usePayCycle(){
  const[payCycle,setPayCycle]=useState(null)
  const[cycleHistory,setCycleHistory]=useState([])
  const toast=useToast()

  const fetchPayCycle=useCallback(async()=>{
    const{data}=await cycleApi.fetchHistory(4)
    setCycleHistory(data??[])
    setPayCycle(data?.[0]??null)
  },[])

  // Starts a brand new cycle — inserts a new history row and it becomes current.
  const savePayCycle=useCallback(async(start,end)=>{
    const{error}=await cycleApi.insert({start_date:start,end_date:end})
    if(error){toast("Couldn't save cycle.",'error');return false}
    await fetchPayCycle()
    toast('New cycle started!','success');return true
  },[toast,fetchPayCycle])

  // Edits the CURRENT cycle's dates in place — no new history row.
  const editPayCycle=useCallback(async(start,end)=>{
    if(!payCycle?.id){toast("No cycle to edit.",'error');return false}
    const{error}=await cycleApi.update(payCycle.id,{start_date:start,end_date:end})
    if(error){toast("Couldn't update cycle.",'error');return false}
    await fetchPayCycle()
    toast('Cycle updated!','success');return true
  },[toast,fetchPayCycle,payCycle])

  return{payCycle,cycleHistory,fetchPayCycle,savePayCycle,editPayCycle}
}
