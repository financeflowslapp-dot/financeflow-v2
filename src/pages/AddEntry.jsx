import {useState} from 'react'
import {EMPTY_FORM} from '../constants/index.js'
import {formatAmountInput,sanitizeAmountInput} from '../utils/format.js'
export function AddEntry({incomeCategories,expenseCategories,onAdd,isAdmin,onManageCategories}){
  const[form,setForm]=useState(EMPTY_FORM)
  const[saving,setSaving]=useState(false)
  const[err,setErr]=useState('')
  const up=(f,v)=>setForm(p=>({...p,[f]:v}))
  const selType=t=>setForm(p=>({...p,type:t,category:''}))
  function handleAmt(e){const c=sanitizeAmountInput(e.target.value);if(c!==null)up('amount',c)}
  async function handleSubmit(e){
    e.preventDefault()
    if(!form.amount||!form.category){setErr('Add an amount and pick a category.');return}
    setErr('');setSaving(true)
    const ok=await onAdd({type:form.type,amount:parseFloat(form.amount),category:form.category,note:form.note.trim(),date:form.date,is_recurring:form.isRecurring})
    setSaving(false)
    if(ok)setForm({...EMPTY_FORM,date:form.date})
    else setErr("Couldn't save. Try again.")
  }
  const cats=form.type==='income'?incomeCategories:expenseCategories
  return(
    <div className="page-content">
      <section className="card">
        <div className="card-header-row">
          <h2 className="card-title">Add an entry</h2>
          {isAdmin&&<button type="button" className="btn btn-ghost btn-sm" onClick={onManageCategories}>⚙ Categories</button>}
        </div>
        <form className="entry-form" onSubmit={handleSubmit}>
          <div className="type-toggle">
            <button type="button" className={form.type==='income'?'active income':''} onClick={()=>selType('income')}>↑ Income</button>
            <button type="button" className={form.type==='expense'?'active expense':''} onClick={()=>selType('expense')}>↓ Expense</button>
          </div>
          <div className="amount-input-wrap">
            <span className="amount-prefix">Rs.</span>
            <input className="amount-large" type="text" inputMode="decimal" placeholder="0.00" value={formatAmountInput(form.amount)} onChange={handleAmt}/>
          </div>
          <div className="field-row">
            <label>Date<input type="date" value={form.date} onChange={e=>up('date',e.target.value)}/></label>
            <label>Category
              <select value={form.category} onChange={e=>up('category',e.target.value)}>
                <option value="" disabled>Select…</option>
                {cats.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <label>Note <span style={{fontWeight:400,color:'var(--ink-faint)'}}>(optional)</span><input type="text" placeholder="What's this for?" value={form.note} onChange={e=>up('note',e.target.value)}/></label>
          <label className="checkbox-row">
            <input type="checkbox" checked={form.isRecurring} onChange={e=>up('isRecurring',e.target.checked)}/>
            <span><strong>Save as recurring</strong> <span style={{color:'var(--ink-muted)',fontWeight:400,fontSize:13}}>— appears in Recurring tab</span></span>
          </label>
          {err&&<p className="form-error">{err}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={saving}>{saving?'Saving…':`Save ${form.type==='income'?'income':'expense'}`}</button>
        </form>
      </section>
    </div>
  )
}
