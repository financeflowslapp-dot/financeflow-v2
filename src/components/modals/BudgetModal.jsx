import {useState} from 'react'
import {Modal} from '../ui/Modal.jsx'
import {budgetClass} from '../../utils/calculations.js'
export function BudgetModal({expenseCategories,budgets,expBreakdownAll,onSave,onClose}){
  const[inputs,setInputs]=useState(()=>{
    const m={}
    expenseCategories.forEach(c=>{const ex=budgets.find(b=>b.category===c.name);m[c.name]=ex?String(ex.monthly_limit):''})
    return m
  })
  const[saving,setSaving]=useState(false)
  const[err,setErr]=useState('')
  async function handleSave(){setSaving(true);setErr('');const ok=await onSave(expenseCategories,inputs);setSaving(false);if(ok)onClose();else setErr("Couldn't save.")}
  return(
    <Modal title="⚙ Budget Limits" onClose={onClose} footer={
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving?'Saving…':'Save limits'}</button>
      </div>
    }>
      <p className="muted" style={{marginTop:0,marginBottom:16}}>Yellow = 80%+, Red = exceeded.</p>
      {expenseCategories.map(c=>{
        const spent=expBreakdownAll.find(b=>b.category===c.name)?.total||0
        const cls=budgetClass(spent,parseFloat(inputs[c.name]))
        return(
          <div key={c.id} className="budget-input-row">
            <span className="budget-input-label">{c.name}</span>
            <div className={`budget-input-field ${cls}`}>
              <span className="budget-input-prefix">Rs.</span>
              <input type="number" className="budget-input" placeholder="No limit" value={inputs[c.name]||''} onChange={e=>setInputs(p=>({...p,[c.name]:e.target.value}))}/>
            </div>
          </div>
        )
      })}
      {err&&<p className="form-error">{err}</p>}
    </Modal>
  )
}
