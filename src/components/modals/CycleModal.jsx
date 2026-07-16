import {useState} from 'react'
import {Modal} from '../ui/Modal.jsx'
import {formatDate} from '../../utils/format.js'
import {daysBetweenInclusive,TODAY} from '../../utils/calculations.js'
export function CycleModal({payCycle,onSave,onClose}){
  const[start,setStart]=useState(payCycle?.start_date||new Date().toISOString().slice(0,10))
  const[end,setEnd]=useState(payCycle?.end_date||new Date().toISOString().slice(0,10))
  const[saving,setSaving]=useState(false);const[err,setErr]=useState('')
  async function handleSave(){
    if(!start||!end){setErr('Pick both dates.');return}
    if(new Date(end)<new Date(start)){setErr('End must be after start.');return}
    setSaving(true);setErr('')
    const ok=await onSave(start,end);setSaving(false)
    if(ok)onClose();else setErr("Couldn't save.")
  }
  const days=start&&end?daysBetweenInclusive(start,end):null
  return(
    <Modal title="Set Pay Cycle" onClose={onClose} footer={
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save Cycle'}</button>
      </div>
    }>
      <p className="muted" style={{marginTop:0,marginBottom:16}}>All dashboard figures will be scoped to this date range.</p>
      <div className="field-row">
        <label>Start date<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
        <label>End date<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
      </div>
      {days&&<div className="cycle-preview">{formatDate(start)} → {formatDate(end)}<span className="cycle-days">{days} days</span></div>}
      {err&&<p className="form-error">{err}</p>}
    </Modal>
  )
}
