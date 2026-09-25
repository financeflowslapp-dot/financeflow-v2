import { useMemo } from 'react'
import { Avatar } from '../components/ui/Avatar.jsx'
import { formatDate } from '../utils/format.js'

// Email masking: keeps first 2 chars + last 2 chars of local part, masks the middle.
// Example: nevinda.rushantha94@gmail.com → ne****94@gmail.com
// Retains enough characters to distinguish users with similar names.
function maskEmail(email) {
  if (!email) return '—'
  const [local, domain] = email.split('@')
  if (!domain || local.length <= 4) return `${local[0] ?? ''}****@${domain ?? ''}`
  const prefix = local.slice(0, 2)
  const suffix = local.slice(-2)
  return `${prefix}****${suffix}@${domain}`
}

// Human-readable relative activity status — no exact timestamp shown.
function activityLabel(lastSeen) {
  if (!lastSeen) return 'Never active'
  const now      = new Date()
  const seen     = new Date(lastSeen)
  const diffMs   = now - seen
  const diffMins = Math.floor(diffMs / 60000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 5)   return '● Active now'
  if (diffDays === 0) return 'Active today'
  if (diffDays === 1) return 'Active yesterday'
  if (diffDays <= 6)  return `Active ${diffDays} days ago`
  if (diffDays <= 30) return `Last active ${diffDays} days ago`
  return `Last active ${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`
}

// Note: allTransactions only contains {id, user_id, date} — no amounts, categories,
// or financial details. See txnApi.fetchAllAdmin in services/api.js.
export function Admin({ userProfiles, allTransactions }) {
  const today = new Date().toDateString()

  const stats = useMemo(() => ({
    total:  userProfiles.length,
    active: userProfiles.filter(u => u.last_seen && new Date(u.last_seen).toDateString() === today).length,
    txns:   allTransactions.length,
  }), [userProfiles, allTransactions])

  const rows = useMemo(() => userProfiles
    .map(u => ({ ...u, txnCount: allTransactions.filter(x => x.user_id === u.user_id).length }))
    .sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen)),
  [userProfiles, allTransactions])

  return (
    <div className="page-content">

      {/* ── KPI cards ── */}
      <div className="admin-stats">
        {[
          { label: 'Total users',        value: stats.total  },
          { label: 'Active today',        value: stats.active },
          { label: 'Total transactions',  value: stats.txns   },
        ].map(s => (
          <div key={s.label} className="admin-stat-card">
            <span className="admin-stat-value">{s.value}</span>
            <span className="admin-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── User list ── */}
      <section className="card">
        <h2 className="card-title">All users</h2>

        {/* Privacy notice */}
        <div className="admin-privacy-notice">
          <span className="admin-privacy-icon">🔒</span>
          <div>
            <strong>Privacy protected</strong>
            <p>Individual transaction amounts, categories and financial details are never displayed here — only account activity.</p>
          </div>
        </div>

        {rows.length === 0
          ? <p className="muted">No users yet.</p>
          : (
            <ul className="user-list">
              {rows.map(u => {
                const label    = activityLabel(u.last_seen)
                const isNow    = label.startsWith('●')
                const isToday  = label === 'Active today'
                return (
                  <li key={u.user_id} className="user-row">
                    <Avatar url={u.avatar_url} name={u.full_name} size={40} />
                    <div className="user-info">
                      <span className="user-name">{u.full_name || 'Unknown'}</span>
                      <span className="user-email">{maskEmail(u.email)}</span>
                      <span className={`user-activity${isNow ? ' active-now' : ''}`}>
                        {label}
                      </span>
                      {u.first_seen && (
                        <span className="user-meta">Joined {formatDate(u.first_seen)}</span>
                      )}
                    </div>
                    <div className="user-counts">
                      <span className="user-txn-count">{u.txnCount}</span>
                      <span className="user-txn-label">transactions</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        }
      </section>
    </div>
  )
}
