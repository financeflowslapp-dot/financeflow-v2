import {useCallback,useState} from 'react'
import {cycleApi} from '../services/api.js'
import {useToast} from '../contexts/ToastContext.jsx'
export function usePayCycle(){
  const[payCycle,setPayCycle]=useState(null)
  const toast=useToast()
  const fetchPayCycle=useCallback(async()=>{
    const{data}=await cycleApi.fetch()
    setPayCycle(data?.[0]??null)
  },[])
  const savePayCycle=useCallback(async(start,end)=>{
    const{error}=await cycleApi.upsert({start_date:start,end_date:end})
    if(error){toast("Couldn't save cycle.",'error');return false}
    setPayCycle({start_date:start,end_date:end})
    toast('Pay cycle saved!','success');return true
  },[toast])
  return{payCycle,fetchPayCycle,savePayCycle}
}
