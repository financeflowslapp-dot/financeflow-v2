import {useState} from 'react'
import {Modal} from '../ui/Modal.jsx'
import {formatAmountInput,sanitizeAmountInput} from '../../utils/format.js'
export function EditModal({transaction,incomeCategories,expenseCategories,onSave,onClose}){
  const[form,setForm]=useState({date:transaction.date,category:transaction.category,amount:String(transaction.amount),note:transaction.note||''})
  const[saving,setSaving]=useState(false)
  const[err,setErr]=useState('')
  function handleAmt(e){const c=sanitizeAmountInput(e.target.value);if(c!==null)setForm(p=>({...p,amount:c}))}
  async function handleSave(){
    if(!form.amount||!form.category){setErr('Amount and category required.');return}
    setSaving(true);setErr('')
    const ok=await onSave(transaction.id,{date:form.date,category:form.category,amount:parseFloat(form.amount),note:form.note.trim()})
    setSaving(false);if(ok)onClose();else setErr("Couldn't save.")
  }
  const cats=transaction.type==='income'?incomeCategories:expenseCategories
  return(
    <Modal title="Edit Entry" onClose={onClose} footer={
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save changes'}</button>
      </div>
    }>
      <div className="entry-form">
        <div className="field-row">
          <label>Date<input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/></label>
          <label>Category<select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))}>
            {cats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
          </select></label>
        </div>
        <label>Amount (Rs.)<input type="text" inputMode="decimal" value={formatAmountInput(form.amount)} onChange={handleAmt}/></label>
        <label>Note<input type="text" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))}/></label>
        {err&&<p className="form-error">{err}</p>}
      </div>
    </Modal>
  )
}
