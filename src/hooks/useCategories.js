import {useCallback,useState} from 'react'
import {catApi} from '../services/api.js'
import {DEFAULT_CATEGORIES} from '../constants/index.js'
import {useToast} from '../contexts/ToastContext.jsx'
export function useCategories(){
  const[categories,setCategories]=useState([])
  const toast=useToast()
  const fetchCategories=useCallback(async()=>{
    const{data,error}=await catApi.fetchAll()
    if(error)return
    if(data.length===0){
      await catApi.insert(DEFAULT_CATEGORIES)
      const{data:s}=await catApi.fetchAll()
      setCategories(s||[])
    }else setCategories(data)
  },[])
  const addCategory=useCallback(async(name,type,list)=>{
    if(!name.trim())return false
    const maxPos=list.length>0?Math.max(...list.map(c=>c.position||0)):0
    const{error}=await catApi.insert({name:name.trim(),type,position:maxPos+1})
    if(error){toast(error.code==='23505'?'Already exists.':"Couldn't add.",'error');return false}
    await fetchCategories();return true
  },[fetchCategories,toast])
  const deleteCategory=useCallback(async(id)=>{
    await catApi.delete(id)
    setCategories(p=>p.filter(c=>c.id!==id))
    toast('Category removed.','info')
  },[toast])
  const reorderCategories=useCallback(async(type,oldIdx,newIdx)=>{
    const list=[...categories.filter(c=>c.type===type)].sort((a,b)=>(a.position||0)-(b.position||0))
    const reordered=[...list]
    const[moved]=reordered.splice(oldIdx,1)
    reordered.splice(newIdx,0,moved)
    setCategories(prev=>{
      const others=prev.filter(c=>c.type!==type)
      return[...others,...reordered.map((c,i)=>({...c,position:i+1}))]
    })
    await Promise.all(reordered.map((c,i)=>catApi.updatePos(c.id,i+1)))
  },[categories])
  const incomeCategories=categories.filter(c=>c.type==='income')
  const expenseCategories=categories.filter(c=>c.type==='expense')
  return{categories,incomeCategories,expenseCategories,fetchCategories,addCategory,deleteCategory,reorderCategories}
}
