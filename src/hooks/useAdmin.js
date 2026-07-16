import {useCallback,useState} from 'react'
import {adminApi,profileApi,txnApi} from '../services/api.js'
export function useAdmin(){
  const[isAdmin,setIsAdmin]=useState(false)
  const[userProfiles,setUserProfiles]=useState([])
  const[allTransactions,setAllTransactions]=useState([])
  const checkAdmin=useCallback(async()=>{
    const{data,error}=await adminApi.check()
    const ok=!error&&Array.isArray(data)&&data.length>0
    setIsAdmin(ok);return ok
  },[])
  const fetchAdminData=useCallback(async()=>{
    const[pr,tr]=await Promise.all([profileApi.fetchAll(),txnApi.fetchAllAdmin()])
    if(pr.data)setUserProfiles(pr.data)
    if(tr.data)setAllTransactions(tr.data)
  },[])
  return{isAdmin,userProfiles,allTransactions,checkAdmin,fetchAdminData}
}
