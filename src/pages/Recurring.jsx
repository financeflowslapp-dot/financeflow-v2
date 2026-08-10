import {TransactionRow} from '../components/TransactionRow.jsx'
import {EmptyState} from '../components/ui/EmptyState.jsx'
export function Recurring({transactions,onDelete}){
  const ri=transactions.filter(t=>t.is_recurring&&t.type==='income')
  const re=transactions.filter(t=>t.is_recurring&&t.type==='expense')
  if(!ri.length&&!re.length)return(
    <div className="page-content">
      <EmptyState title="No recurring entries" description='Save an entry with "Save as recurring" checked and it appears here.'/>
    </div>
  )
  return(
    <div className="page-content">
      {ri.length>0&&<section className="card"><h2 className="card-title">↑ Recurring income</h2><ul className="transaction-list">{ri.map(t=><TransactionRow key={t.id} t={t} onDelete={onDelete}/>)}</ul></section>}
      {re.length>0&&<section className="card"><h2 className="card-title">↓ Recurring expenses</h2><ul className="transaction-list">{re.map(t=><TransactionRow key={t.id} t={t} onDelete={onDelete}/>)}</ul></section>}
    </div>
  )
}
