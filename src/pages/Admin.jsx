import {useMemo} from 'react'
import {Avatar} from '../components/ui/Avatar.jsx'
import {formatDate,formatDateTime,formatMoney} from '../utils/format.js'
export function Admin({userProfiles,allTransactions}){
  const today=new Date().toDateString()
  const stats=useMemo(()=>({
    total:userProfiles.length,
    active:userProfiles.filter(u=>u.last_seen&&new Date(u.last_seen).toDateString()===today).length,
    txns:allTransactions.length,
  }),[userProfiles,allTransactions])
  const rows=useMemo(()=>userProfiles.map(u=>{
    const t=allTransactions.filter(x=>x.user_id===u.user_id)
    return{...u,txnCount:t.length,income:t.filter(x=>x.type==='income').reduce((s,x)=>s+Number(x.amount),0),expense:t.filter(x=>x.type==='expense').reduce((s,x)=>s+Number(x.amount),0)}
  }).sort((a,b)=>new Date(b.last_seen)-new Date(a.last_seen)),[userProfiles,allTransactions])
  return(
    <div className="page-content">
      <div className="admin-stats">
        {[{label:'Total users',value:stats.total},{label:'Active today',value:stats.active},{label:'Total entries',value:stats.txns}].map(s=>(
          <div key={s.label} className="admin-stat-card"><span className="admin-stat-value">{s.value}</span><span className="admin-stat-label">{s.label}</span></div>
        ))}
      </div>
      <section className="card">
        <h2 className="card-title">All users</h2>
        {rows.length===0?<p className="muted">No users yet.</p>:(
          <ul className="user-list">
            {rows.map(u=>(
              <li key={u.user_id} className="user-row">
                <Avatar url={u.avatar_url} name={u.full_name} size={42}/>
                <div className="user-info">
                  <span className="user-name">{u.full_name||'Unknown'}</span>
                  <span className="user-email">{u.email}</span>
                  <span className="user-meta">Joined {formatDate(u.first_seen)} · Last seen {formatDateTime(u.last_seen)}</span>
                </div>
                <div className="user-counts">
                  <span className="user-txn-count">{u.txnCount} entries</span>
                  <span style={{fontSize:11,whiteSpace:'nowrap'}}>
                    <span style={{color:'var(--forest-soft)'}}>+{formatMoney(u.income)}</span>
                    {' / '}
                    <span style={{color:'var(--brick)'}}>−{formatMoney(u.expense)}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
