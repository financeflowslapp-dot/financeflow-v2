import {buildConic} from '../../utils/calculations.js'
import {formatMoney} from '../../utils/format.js'
export function Donut({segments}){
  const bg=segments.length>0?buildConic(segments):'var(--line)'
  return(
    <div className="donut-wrap">
      <div className="donut" style={{background:bg}}>
        <div className="donut-hole"/>
      </div>
    </div>
  )
}
export function BreakdownList({items,budgets=[]}){
  return(
    <ul className="breakdown-list">
      {items.map(c=>{
        const b=budgets.find(x=>x.category===c.category)
        const ratio=b?c.total/b.monthly_limit:0
        const cls=b?(ratio>=1?'over':ratio>=0.8?'warning':''):''
        return(
          <li key={c.category} className={`breakdown-item ${cls}`}>
            <div className="breakdown-row">
              <span className="breakdown-label">
                <span className="legend-dot" style={{background:c.color}}/>
                {c.category}
                {cls==='over'&&<span className="badge badge-danger">OVER</span>}
                {cls==='warning'&&<span className="badge badge-warning">80%+</span>}
              </span>
              <span style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontWeight:700,fontSize:14,fontVariantNumeric:'tabular-nums'}}>Rs. {formatMoney(c.total)}</span>
                <span style={{fontSize:12,color:'var(--ink-muted)'}}>{c.percent.toFixed(0)}%</span>
              </span>
            </div>
            <div className="breakdown-bar-track">
              <div className="breakdown-bar" style={{width:`${c.percent}%`,background:c.color}}/>
            </div>
            {b&&<span className="budget-note">Rs. {formatMoney(c.total)} of Rs. {formatMoney(b.monthly_limit)} limit</span>}
          </li>
        )
      })}
    </ul>
  )
}
