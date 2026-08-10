import {useMemo,useState} from 'react'
import {TransactionRow} from '../components/TransactionRow.jsx'
import {EditModal} from '../components/modals/EditModal.jsx'
import {SkeletonList} from '../components/ui/Skeleton.jsx'
import {EmptyState} from '../components/ui/EmptyState.jsx'
import {formatDate,formatMoney} from '../utils/format.js'
import {calcCycleTotals,groupByCategory,isSavings,withColor} from '../utils/calculations.js'
import {filterByCycle} from '../utils/dashboardCalcs.js'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

function cycleMonthLabel(cycle){
  return new Date(cycle.start_date).toLocaleDateString('en-LK',{month:'long',year:'numeric'})
}

export function History({transactions,loading,categories,incomeCategories,expenseCategories,budgets,cycleHistory=[],goals=[],creditCards=[],onDelete,onUpdate,onReverseAllocation,onAllocateToGoal,onReverseCardEffect,onRecordPurchase,onRecordRepayment}){
  const[search,setSearch]=useState('')
  const[fType,setFType]=useState('all')
  const[fCat,setFCat]=useState('all')
  const[editing,setEditing]=useState(null)
  const[cycleSel,setCycleSel]=useState('current')

  // Delete: reverse CC balance effect AND goal allocation before deleting.
  // Pass the full transaction object as fallback — used by both reversal
  // functions when no audit record exists (pre-migration transactions).
  async function handleDelete(id) {
    const txn = transactions.find(t => t.id === id)
    if (onReverseCardEffect) await onReverseCardEffect(id, txn ?? null)
    if (onReverseAllocation) await onReverseAllocation(id, txn ?? null)
    onDelete(id)
  }

  const selectedCycle = useMemo(() => {
    if (cycleSel === 'all') return null
    if (cycleSel === 'current') return cycleHistory[0] ?? null
    return cycleHistory.find(c => String(c.id) === cycleSel) ?? null
  }, [cycleSel, cycleHistory])

  const cycleTxns = useMemo(() => (
    selectedCycle ? filterByCycle(transactions, selectedCycle) : transactions
  ), [transactions, selectedCycle])

  const filtered=useMemo(()=>cycleTxns.filter(t=>{
    if(fType!=='all'&&t.type!==fType)return false
    if(fCat!=='all'&&t.category!==fCat)return false
    if(search.trim()){const q=search.toLowerCase();if(!t.category.toLowerCase().includes(q)&&!(t.note&&t.note.toLowerCase().includes(q)))return false}
    return true
  }),[cycleTxns,fType,fCat,search])
  const income=filtered.filter(t=>t.type==='income')
  const expense=filtered.filter(t=>t.type==='expense')

  function localToday(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function exportPDF(){
    const doc=new jsPDF();const forest=[27,67,50];const brick=[168,68,50]
    const cycleT=cycleTxns
    const{income:inc,expense:exp,balance:bal}=calcCycleTotals(cycleT)
    const incB=withColor(groupByCategory(cycleT,'income'),inc)
    const expB=withColor(groupByCategory(cycleT,'expense').filter(c=>!isSavings(c.category)),exp)
    const lbl=selectedCycle?`${formatDate(selectedCycle.start_date)} - ${formatDate(selectedCycle.end_date)}`:'All cycles'
    doc.setFillColor(...forest);doc.rect(0,0,210,30,'F')
    doc.setTextColor(255,255,255);doc.setFontSize(22);doc.text('FinanceFlow',14,18)
    doc.setFontSize(9);doc.text(`Generated ${formatDate(localToday())}  ·  Cycle: ${lbl}`,14,26)
    doc.setTextColor(0,0,0);let y=42;doc.setFontSize(11)
    doc.text(`Income: Rs. ${formatMoney(inc)}`,14,y)
    doc.text(`Expenses: Rs. ${formatMoney(exp)}`,80,y)
    doc.setTextColor(...(bal>=0?forest:brick));doc.text(`Balance: Rs. ${formatMoney(bal)}`,152,y)
    doc.setTextColor(0,0,0);y+=10
    autoTable(doc,{startY:y,head:[['Income by category','Amount (Rs.)','%']],body:incB.map(c=>[c.category,formatMoney(c.total),`${c.percent.toFixed(0)}%`]),theme:'grid',headStyles:{fillColor:forest},styles:{fontSize:9}})
    y=doc.lastAutoTable.finalY+8
    autoTable(doc,{startY:y,head:[['Expense by category','Amount (Rs.)','%','Budget']],body:expB.map(c=>{const b=budgets.find(x=>x.category===c.category);return[c.category,formatMoney(c.total),`${c.percent.toFixed(0)}%`,b?(c.total>b.monthly_limit?'⚠ Over':'OK'):'—']}),theme:'grid',headStyles:{fillColor:brick},styles:{fontSize:9}})
    y=doc.lastAutoTable.finalY+8
    autoTable(doc,{startY:y,head:[['Date','Type','Category','Note','Amount (Rs.)']],body:cycleT.map(t=>[formatDate(t.date),t.type,t.category,t.note||'',`${t.type==='income'?'+':'−'} ${formatMoney(t.amount)}`]),theme:'striped',headStyles:{fillColor:forest},styles:{fontSize:8},didDrawPage:()=>{doc.setFontSize(8);doc.setTextColor(140);doc.text(`FinanceFlow — Page ${doc.internal.getNumberOfPages()}`,14,doc.internal.pageSize.height-10)}})
    doc.save(`financeflow-${localToday()}.pdf`)
  }
  if(loading)return <div className="page-content"><section className="card"><SkeletonList count={6}/></section></div>
  return(
    <div className="page-content">
      <section className="card">
        <div className="card-header-row">
          <h2 className="card-title">Entries</h2>
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportPDF}>↓ PDF</button>
        </div>

        {cycleHistory.length > 0 && (
          <div className="cycle-select-row">
            <select value={cycleSel} onChange={e=>setCycleSel(e.target.value)} className="cycle-select">
              {cycleHistory.map((c,i)=>(
                <option key={c.id} value={i===0?'current':String(c.id)}>
                  {i===0?'Current Cycle':`Previous Cycle ${i}`} — {cycleMonthLabel(c)}
                </option>
              ))}
              <option value="all">All Cycles</option>
            </select>
            {selectedCycle && <span className="cycle-select-range">{formatDate(selectedCycle.start_date)} → {formatDate(selectedCycle.end_date)}</span>}
          </div>
        )}

        <div className="history-filters">
          <input type="text" placeholder="Search by label or category…" value={search} onChange={e=>setSearch(e.target.value)}/>
          <div className="filter-row">
            <div className="type-pills">
              {['all','income','expense'].map(t=>(
                <button key={t} type="button" className={fType===t?'active':''} onClick={()=>setFType(t)}>
                  {t==='all'?'All':t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            <select value={fCat} onChange={e=>setFCat(e.target.value)}>
              <option value="all">All categories</option>
              {categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <span style={{fontSize:12,color:'var(--ink-muted)'}}>{filtered.length} of {cycleTxns.length} entries</span>
        </div>
        {filtered.length===0?<EmptyState title="No entries found" description="Try adjusting your search, filters, or selected cycle."/>:(
          <>
            {income.length>0&&<><h3 className="group-label income">↑ Income</h3><ul className="transaction-list">{income.map(t=><TransactionRow key={t.id} t={t} onDelete={handleDelete} onEdit={()=>setEditing(t)}/>)}</ul></>}
            {expense.length>0&&<><h3 className="group-label expense">↓ Expenses</h3><ul className="transaction-list">{expense.map(t=><TransactionRow key={t.id} t={t} onDelete={handleDelete} onEdit={()=>setEditing(t)}/>)}</ul></>}
          </>
        )}
      </section>
      {editing&&<EditModal transaction={editing} incomeCategories={incomeCategories} expenseCategories={expenseCategories} goals={goals} creditCards={creditCards} onSave={onUpdate} onReverseAllocation={onReverseAllocation} onAllocateToGoal={onAllocateToGoal} onReverseCardEffect={onReverseCardEffect} onRecordPurchase={onRecordPurchase} onRecordRepayment={onRecordRepayment} onClose={()=>setEditing(null)}/>}
    </div>
  )
}
