import {createContext,useCallback,useContext,useRef,useState} from 'react'
const Ctx=createContext(null)
const ICONS={success:'✓',error:'✕',warning:'⚠',info:'ℹ'}
function ToastContainer({toasts,dismiss}){
  if(!toasts.length)return null
  return(
    <div className="toast-container">
      {toasts.map(t=>(
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{ICONS[t.type]||ICONS.info}</span>
          <span className="toast-message">{t.message}</span>
          <button type="button" className="toast-close" onClick={()=>dismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
export function ToastProvider({children}){
  const[toasts,setToasts]=useState([])
  const ref=useRef(0)
  const toast=useCallback((message,type='success',duration=3000)=>{
    const id=++ref.current
    setToasts(p=>[...p,{id,message,type}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),duration)
  },[])
  const dismiss=useCallback(id=>setToasts(p=>p.filter(t=>t.id!==id)),[])
  return(
    <Ctx.Provider value={{toast}}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss}/>
    </Ctx.Provider>
  )
}
export const useToast=()=>useContext(Ctx).toast
