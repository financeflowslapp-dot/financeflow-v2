import {useEffect} from 'react'
export function Modal({title,onClose,children,footer}){
  useEffect(()=>{
    const h=e=>{if(e.key==='Escape')onClose()}
    window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)
  },[onClose])
  return(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer&&<div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
