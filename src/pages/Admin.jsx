import {useMemo} from 'react'
import {Avatar} from '../components/ui/Avatar.jsx'
import {formatDate,formatDateTime} from '../utils/format.js'

// Note: allTransactions here only ever contains {id, user_id, date} — see
// txnApi.fetchAllAdmin in services/api.js. Admin oversight is limited to
// activity counts on purpose; actual amounts/categories/notes are never
// fetched for anyone but the signed-in user themself.
export function Admin({userProfiles,allTransactions}){
  const today=new Date().toDateString()
  const stats=useMemo(()=>({
    total:userProfiles.length,
    active:userProfiles.filter(u=>u.last_seen&&new Date(u.last_seen).toDateString()===today).length,
    txns:allTransactions.length,
  }),[userProfiles,allTransactions])
  const rows=useMemo(()=>userProfiles.map(u=>{
    const txnCount=allTransactions.filter(x=>x.user_id===u.user_id).length
    return{...u,txnCount}
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
        <p className="muted" style={{marginTop:-8,marginBottom:14,fontSize:12}}>For privacy, individual amounts and categories are never shown here — only activity.</p>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
