import { useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { formatMoney } from '../utils/format.js'
import { Modal } from '../components/ui/Modal.jsx'

const GOAL_COLORS = ['#059669','#6366f1','#d97706','#be123c','#0ea5e9','#9d4edd']
const GOAL_EMOJIS = ['🎯','🏠','🚗','✈️','💍','📱','🎓','💻','🏖️','💰']

function GoalCard({ goal, onDelete, onContribute }) {
  const pct     = Math.min((Number(goal.saved) / Number(goal.target)) * 100, 100)
  const done    = pct >= 100
  const remaining = Math.max(0, Number(goal.target) - Number(goal.saved))

  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000)
    : null

  return (
    <div className="goal-card" style={{ borderColor: goal.color }}>
      <div className="goal-card-top">
        <span className="goal-emoji">{goal.emoji}</span>
        <div className="goal-info">
          <span className="goal-name">{goal.name}</span>
          {goal.deadline && (
            <span className={`goal-deadline ${daysLeft !== null && daysLeft < 30 ? 'urgent' : ''}`}>
              {done ? '✓ Completed!' : daysLeft !== null && daysLeft < 0 ? 'Overdue' : daysLeft !== null ? `${daysLeft} days left` : ''}
            </span>
          )}
        </div>
        <button className="icon-action delete-btn" onClick={() => onDelete(goal.id)}>×</button>
      </div>

      <div className="goal-progress-row">
        <span className="goal-saved" style={{ color: goal.color }}>Rs. {formatMoney(goal.saved)}</span>
        <span className="goal-target">of Rs. {formatMoney(goal.target)}</span>
        <span className="goal-pct" style={{ color: goal.color }}>{pct.toFixed(0)}%</span>
      </div>

      <div className="goal-track">
        <div
          className="goal-fill"
          style={{
            width: `${pct}%`,
            background: goal.color,
            transition: 'width 600ms cubic-bezier(.16,1,.3,1)',
          }}
        />
      </div>

      {!done && (
        <div className="goal-remaining">
          Rs. {formatMoney(remaining)} remaining
        </div>
      )}

      {!done && (
        <button
          className="btn btn-sm"
          style={{ background: goal.color, color: '#fff', border: 'none', marginTop: 10, width: '100%' }}
          onClick={() => onContribute(goal)}
        >
          + Add contribution
        </button>
      )}

      {done && (
        <div className="goal-done-banner">🎉 Goal reached!</div>
      )}
    </div>
  )
}

function AddGoalModal({ onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', target: '', saved: '0', deadline: '',
    color: GOAL_COLORS[0], emoji: GOAL_EMOJIS[0],
  })
  const [saving, setSaving] = useState(false)
  const up = (f, v) => setForm(p => ({ ...p, [f]: v }))

  async function handleSave() {
    if (!form.name.trim() || !form.target) return
    setSaving(true)
    await onSave({
      name:    form.name.trim(),
      target:  parseFloat(form.target),
      saved:   parseFloat(form.saved) || 0,
      deadline: form.deadline || null,
      color:   form.color,
      emoji:   form.emoji,
    })
    setSaving(false)
  }

  return (
    <Modal title="New Savings Goal" onClose={onClose} footer={
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !form.name || !form.target}>
          {saving ? 'Saving…' : 'Create Goal'}
        </button>
      </div>
    }>
      <div className="entry-form">
        {/* Emoji picker */}
        <div>
          <label style={{ marginBottom: 8, display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GOAL_EMOJIS.map(e => (
              <button key={e} type="button"
                style={{ width: 36, height: 36, fontSize: 20, border: `2px solid ${form.emoji === e ? form.color : 'var(--line)'}`, borderRadius: 8, background: 'var(--surface-alt)', cursor: 'pointer' }}
                onClick={() => up('emoji', e)}
              >{e}</button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div>
          <label style={{ marginBottom: 8, display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {GOAL_COLORS.map(c => (
              <button key={c} type="button"
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }}
                onClick={() => up('color', c)}
              />
            ))}
          </div>
        </div>

        <label>Goal name<input type="text" placeholder="e.g. Emergency Fund, New Car…" value={form.name} onChange={e => up('name', e.target.value)} /></label>
        <div className="field-row">
          <label>Target (Rs.)<input type="number" placeholder="0.00" value={form.target} onChange={e => up('target', e.target.value)} /></label>
          <label>Already saved (Rs.)<input type="number" placeholder="0.00" value={form.saved} onChange={e => up('saved', e.target.value)} /></label>
        </div>
        <label>Deadline <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span><input type="date" value={form.deadline} onChange={e => up('deadline', e.target.value)} /></label>
      </div>
    </Modal>
  )
}

function ContributeModal({ goal, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving]= useState(false)
  async function handleSave() {
    if (!amount) return
    setSaving(true); await onSave(goal, parseFloat(amount)); setSaving(false); onClose()
  }
  return (
    <Modal title={`Add to "${goal.name}"`} onClose={onClose} footer={
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || !amount}>{saving ? 'Saving…' : 'Add'}</button>
      </div>
    }>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>
        Amount (Rs.)
        <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </label>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: 8 }}>
        Current: Rs. {formatMoney(goal.saved)} / Rs. {formatMoney(goal.target)}
      </p>
    </Modal>
  )
}

export function Goals({ goals, onAdd, onDelete, onContribute }) {
  const [showAdd,        setShowAdd]        = useState(false)
  const [contributing,   setContributing]   = useState(null)

  const totalTarget = goals.reduce((s, g) => s + Number(g.target), 0)
  const totalSaved  = goals.reduce((s, g) => s + Number(g.saved),  0)
  const completed   = goals.filter(g => Number(g.saved) >= Number(g.target)).length

  async function handleAdd(payload) {
    const ok = await onAdd(payload)
    if (ok) setShowAdd(false)
  }

  return (
    <div className="page-content">
      {/* Summary */}
      {goals.length > 0 && (
        <div className="kpi-grid kpi-grid-3" style={{ marginBottom: 4 }}>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">🎯</span><span className="kpi-label">Goals</span></div>
            <div className="kpi-value">{goals.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">✅</span><span className="kpi-label">Completed</span></div>
            <div className="kpi-value" style={{ color: 'var(--emerald)' }}>{completed}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-header"><span className="kpi-icon">💰</span><span className="kpi-label">Total saved</span></div>
            <div className="kpi-value" style={{ color: 'var(--forest-soft)', fontSize: 15 }}>Rs. {formatMoney(totalSaved)}</div>
            <div className="kpi-sub">of Rs. {formatMoney(totalTarget)}</div>
          </div>
        </div>
      )}

      {/* Add button */}
      <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New savings goal</button>

      {/* Goals list */}
      {goals.length === 0
        ? <EmptyState title="No savings goals yet" description="Create a goal to start tracking your savings progress." />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {goals.map(g => (
              <GoalCard key={g.id} goal={g} onDelete={onDelete} onContribute={g => setContributing(g)} />
            ))}
          </div>
        )
      }

      {showAdd && <AddGoalModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {contributing && <ContributeModal goal={contributing} onSave={onContribute} onClose={() => setContributing(null)} />}
    </div>
  )
}
