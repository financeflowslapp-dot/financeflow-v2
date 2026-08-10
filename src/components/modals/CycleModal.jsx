import {useState} from 'react'
import {Modal} from '../ui/Modal.jsx'
import {formatDate,formatMoney} from '../../utils/format.js'
import {daysBetweenInclusive} from '../../utils/calculations.js'
import {TODAY} from '../../constants/index.js'

export function CycleModal({payCycle,transactions=[],mode='new',onSave,onAddRecurring,onClose}){
  const[step,setStep]=useState('form') // 'form' | 'confirm'
  const[start,setStart]=useState(payCycle?.start_date||TODAY())
  const[end,setEnd]=useState(payCycle?.end_date||TODAY())
  const[saving,setSaving]=useState(false);const[err,setErr]=useState('')
  const[recurring,setRecurring]=useState([])
  const[checked,setChecked]=useState({})
  const[adding,setAdding]=useState(false)

  async function handleSave(){
    if(!start||!end){setErr('Pick both dates.');return}
    if(new Date(end)<new Date(start)){setErr('End must be after start.');return}
    setSaving(true);setErr('')

    // Editing the current cycle in place never offers a carry-over —
    // it's the same cycle, nothing to carry anywhere.
    const carryCandidates = (mode === 'new' && payCycle)
      ? transactions.filter(t =>
          t.is_recurring &&
          t.date >= payCycle.start_date && t.date <= payCycle.end_date &&
          !(t.date >= start && t.date <= end)
        )
      : []

    const ok = await onSave(start,end)
    setSaving(false)
    if(!ok){setErr("Couldn't save.");return}

    if(carryCandidates.length > 0){
      setRecurring(carryCandidates)
      setChecked(Object.fromEntries(carryCandidates.map(t=>[t.id,true])))
      setStep('confirm')
    } else {
      onClose()
    }
  }

  async function handleAddRecurring(){
    const toAdd = recurring.filter(t=>checked[t.id])
    if(toAdd.length===0){onClose();return}
    setAdding(true)
    await onAddRecurring(toAdd, start)
    setAdding(false)
    onClose()
  }

  const days = start&&end ? daysBetweenInclusive(start,end) : null
  const selectedCount = recurring.filter(t=>checked[t.id]).length

  if(step==='confirm'){
    return(
      <Modal title="Carry over recurring payments?" onClose={onClose} footer={
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={adding}>Skip</button>
          <button type="button" className="btn btn-primary" onClick={handleAddRecurring} disabled={adding || selectedCount===0}>
            {adding ? 'Adding…' : `Add ${selectedCount} to new cycle`}
          </button>
        </div>
      }>
        <p className="muted" style={{marginTop:0,marginBottom:16}}>
          These recurring entries were in your last cycle. Add them to {formatDate(start)} → {formatDate(end)} too?
        </p>
        <ul className="transaction-list">
          {recurring.map(t=>(
            <li key={t.id} className="transaction-row">
              <label className="checkbox-row" style={{flex:1,marginBottom:0}}>
                <input type="checkbox" checked={!!checked[t.id]} onChange={e=>setChecked(p=>({...p,[t.id]:e.target.checked}))}/>
                <span className={`type-dot ${t.type}`}/>
                <span className="transaction-main">
                  <span className="transaction-category">{t.category}</span>
                  {t.note && <span className="transaction-meta"><span className="transaction-note">{t.note}</span></span>}
                </span>
              </label>
              <span className={`transaction-amount ${t.type}`}>{t.type==='income'?'+':'−'} Rs. {formatMoney(t.amount)}</span>
            </li>
          ))}
        </ul>
      </Modal>
    )
  }

  return(
    <Modal title={mode === 'edit' ? 'Edit Pay Cycle' : 'Start New Cycle'} onClose={onClose} footer={
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':(mode==='edit'?'Save Changes':'Start Cycle')}</button>
      </div>
    }>
      <p className="muted" style={{marginTop:0,marginBottom:16}}>
        {mode === 'edit' ? 'Adjust the current cycle\'s date range.' : 'All dashboard figures will be scoped to this date range.'}
      </p>
      <div className="field-row">
        <label>Start date<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label>
        <label>End date<input type="date" value={end} onChange={e=>setEnd(e.target.value)}/></label>
      </div>
      {days&&<div className="cycle-preview">{formatDate(start)} → {formatDate(end)}<span className="cycle-days">{days} days</span></div>}
      {err&&<p className="form-error">{err}</p>}
    </Modal>
  )
}
