import {isSavings} from '../utils/calculations.js'
import {formatDate,formatMoney} from '../utils/format.js'
export function TransactionRow({t,onDelete,onEdit}){
  const sv=isSavings(t.category)
  return(
    <li className={`transaction-row${onEdit?' has-edit':''}`}>
      <span className={`type-dot ${sv?'savings':t.type}`}/>
      <div className="transaction-main">
        <span className="transaction-category">{t.category}</span>
        <span className="transaction-meta">
          {t.note&&<><span className="transaction-note">{t.note}</span><span className="meta-sep">·</span></>}
          <span className="transaction-date">{formatDate(t.date)}</span>
        </span>
      </div>
      <span className={`transaction-amount ${sv?'savings':t.type}`}>
        {t.type==='income'?'+':sv?'🏦':'−'} Rs. {formatMoney(t.amount)}
      </span>
      {onEdit&&<button type="button" className="icon-action edit-btn" onClick={()=>onEdit(t)}>✎</button>}
      <button type="button" className="icon-action delete-btn" onClick={()=>onDelete(t.id)}>×</button>
    </li>
  )
}
