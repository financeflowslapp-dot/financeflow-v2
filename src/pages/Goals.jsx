import { useCallback, useEffect, useMemo, useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { formatDate, formatMoney } from '../utils/format.js'
import { Modal } from '../components/ui/Modal.jsx'
import { DraftBanner } from '../components/ui/DraftBanner.jsx'
import { goalAllocationsApi } from '../services/api.js'
import { useDraftPersistence } from '../hooks/useDraftPersistence.js'

const GOAL_COLORS = ['#8B5CF6','#159A75','#35B779','#7C3AED','#A78BFA','#0B5D4B']
const GOAL_EMOJIS = ['🎯','🏠','🚗','✈️','💍','📱','🎓','💻','🏖️','💰']

// Parse a raw keyword string into a clean array.
// "DFCC, dfcc card, credit" → ['dfcc', 'dfcc card', 'credit']
function parseKeywords(raw) {
  return raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean)
}
function keywordsToString(arr) {
  return Array.isArray(arr) ? arr.join(', ') : ''
}

// ── Allocation History Modal ──────────────────────────────────────────────────
function AllocationHistoryModal({ goal, onClose }) {
  const [allocations, setAllocations] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await goalAllocationsApi.fetchByGoal(goal.id)
    setAllocations(data ?? [])
    setLoading(false)
  }, [goal.id])

  useMemo(() => { load() }, [load])

  const pct       = Math.min((Number(goal.saved) / Number(goal.target)) * 100, 100)
  const remaining = Math.max(0, Number(goal.target) - Number(goal.saved))

  return (
    <Modal title={`${goal.emoji} ${goal.name}`} onClose={onClose}>
      <div className="goal-hist-overview">
        <div className="goal-hist-stats">
          <div><span className="goal-hist-stat-label">Saved</span><span className="goal-hist-stat-val" style={{ color: goal.color }}>Rs. {formatMoney(goal.saved)}</span></div>
          <div><span className="goal-hist-stat-label">Remaining</span><span className="goal-hist-stat-val">Rs. {formatMoney(remaining)}</span></div>
          <div><span className="goal-hist-stat-label">Progress</span><span className="goal-hist-stat-val" style={{ color: goal.color }}>{pct.toFixed(0)}%</span></div>
        </div>
        <div className="goal-track" style={{ margin: '10px 0 0' }}>
          <div className="goal-fill" style={{ width: `${pct}%`, background: goal.color, transition: 'width 600ms cubic-bezier(.16,1,.3,1)' }} />
        </div>
      </div>

      <h4 style={{ margin: '16px 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Allocation history
      </h4>
      {loading ? (
        <p className="muted" style={{ textAlign: 'center', padding: 16 }}>Loading…</p>
      ) : allocations.length === 0 ? (
        <p className="muted" style={{ fontSize: 13 }}>No allocations yet. When you save an expense whose note matches a keyword, you'll be asked to allocate it here.</p>
      ) : (
        <ul className="alloc-history-list">
          {allocations.map(a => (
            <li key={a.id} className="alloc-history-row">
              <div className="alloc-history-amount" style={{ color: goal.color }}>+ Rs. {formatMoney(a.amount)}</div>
              <div className="alloc-history-meta">
                {a.category && <span className="alloc-history-cat">{a.category}</span>}
                {a.note     && <span className="alloc-history-note">{a.note}</span>}
                <span className="alloc-history-date">{formatDate(a.allocated_at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}

// ── Smart keyword suggestions ──────────────────────────────────────────────────
function buildNameSuggestions(goalName) {
  const name  = goalName.trim().toLowerCase()
  const words = name.split(/\s+/).filter(w => w.length > 1)
  const combos = new Set([name, ...words])
  if (words.length >= 2) combos.add(words.slice(0, 2).join(' '))
  return [...combos].slice(0, 6)
}

// Only pull notes from expenses that match the selected category —
// so suggestions are always relevant to what the user picked.
function buildNoteSuggestions(transactions, category) {
  if (!category) return []
  const seen = new Set()
  const notes = []
  for (const t of transactions) {
    if (t.type === 'expense' && t.category === category && t.note && t.note.trim()) {
      const n = t.note.trim().toLowerCase()
      if (!seen.has(n)) { seen.add(n); notes.push(n) }
    }
  }
  return notes.slice(0, 12)
}

// ── Goal Trigger Setup Modal ───────────────────────────────────────────────────
// Step 1: pick the expense category
// Step 2: optionally set keywords to filter within that category
// No keywords = any expense in the category triggers the goal.
function GoalTriggerModal({ goal, expenseCategories, transactions = [], onSave, onClose }) {
  const existingCat  = Array.isArray(goal.linked_categories) && goal.linked_categories.length > 0
    ? goal.linked_categories[0] : ''
  const existingKws  = keywordsToString(goal.trigger_keywords)

  const [selectedCat, setSelectedCat] = useState(existingCat)
  const [raw,         setRaw]         = useState(existingKws)
  const [saving,      setSaving]      = useState(false)

  const current         = useMemo(() => parseKeywords(raw), [raw])
  const nameSuggestions = useMemo(() => buildNameSuggestions(goal.name), [goal.name])
  const noteSuggestions = useMemo(() => buildNoteSuggestions(transactions, selectedCat), [transactions, selectedCat])

  // When category changes, clear keywords — they were for the old category
  function handleCatChange(cat) {
    setSelectedCat(cat)
    setRaw('')
  }

  function toggleSuggestion(kw) {
    const list = parseKeywords(raw)
    const idx  = list.indexOf(kw)
    const next = idx === -1 ? [...list, kw] : list.filter((_, i) => i !== idx)
    setRaw(next.join(', '))
  }

  async function handleSave() {
    setSaving(true)
    await onSave(goal, selectedCat ? [selectedCat] : [], current)
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      title={`⚙️ Goal trigger — ${goal.name}`}
      onClose={onClose}
      footer={
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !selectedCat}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      {/* How it works */}
      <div className="keyword-explainer">
        <p>★ <strong>Step 1</strong> — pick the expense <strong>category</strong> that should trigger this goal.</p>
        <p>★ <strong>Step 2</strong> — optionally add <strong>keywords</strong> to filter within that category (e.g. to separate DFCC from UB Bank, both under "Credit Card Payments").</p>
        <p style={{ margin: 0 }}>No keywords = <em>any</em> expense in the selected category triggers this goal.</p>
      </div>

      {/* ── Step 1: Category ── */}
      <div className="trigger-step">
        <div className="trigger-step-header">
          <span className="trigger-step-num">1</span>
          <span className="trigger-step-title">Expense category <span style={{ color: 'var(--brick)', fontSize: 11 }}>required</span></span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {expenseCategories.map(c => (
            <button
              key={c.id} type="button"
              className={`cat-chip${selectedCat === c.name ? ' selected' : ''}`}
              onClick={() => handleCatChange(c.name)}
            >
              {c.name}
            </button>
          ))}
        </div>
        {selectedCat && (
          <p style={{ fontSize: 12, color: 'var(--emerald)', margin: '8px 0 0' }}>
            ✓ Selected: <strong>{selectedCat}</strong>
          </p>
        )}
      </div>

      {/* ── Step 2: Keywords (only shown after category selected) ── */}
      {selectedCat && (
        <div className="trigger-step">
          <div className="trigger-step-header">
            <span className="trigger-step-num">2</span>
            <span className="trigger-step-title">
              Keywords <span style={{ fontWeight: 400, color: 'var(--ink-muted)' }}>(optional — filters within {selectedCat})</span>
            </span>
          </div>

          {/* Name-based suggestions */}
          <p className="suggestion-group-label" style={{ marginTop: 10 }}>Suggested from goal name</p>
          <div className="suggestion-chips">
            {nameSuggestions.map(k => (
              <button key={k} type="button"
                className={`suggestion-chip${current.includes(k) ? ' active' : ''}`}
                onClick={() => toggleSuggestion(k)}
              >
                {current.includes(k) ? '✓ ' : '+ '}{k}
              </button>
            ))}
          </div>

          {/* Category note suggestions */}
          {noteSuggestions.length > 0 && (
            <>
              <p className="suggestion-group-label">From your past "{selectedCat}" notes</p>
              <div className="suggestion-chips">
                {noteSuggestions.map(k => (
                  <button key={k} type="button"
                    className={`suggestion-chip${current.includes(k) ? ' active' : ''}`}
                    onClick={() => toggleSuggestion(k)}
                  >
                    {current.includes(k) ? '✓ ' : '+ '}{k}
                  </button>
                ))}
              </div>
            </>
          )}

          {noteSuggestions.length === 0 && (
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: '6px 0' }}>
              No past notes found for "{selectedCat}" — type keywords manually below.
            </p>
          )}

          {/* Manual input */}
          <label className="keyword-manual-label" style={{ marginTop: 10 }}>
            Or type manually <span style={{ fontWeight: 400 }}>(comma-separated, case-insensitive)</span>
          </label>
          <input
            type="text"
            placeholder={`e.g. DFCC, dfcc card`}
            value={raw}
            onChange={e => setRaw(e.target.value)}
            style={{ width: '100%', marginBottom: 8 }}
          />

          {/* Live preview */}
          {current.length > 0 ? (
            <div>
              <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 5 }}>✅ Will trigger when note contains:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {current.map((k, i) => <span key={i} className="keyword-chip">{k}</span>)}
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--ink-muted)', margin: 0 }}>
              ⚡ No keywords set — <em>any</em> expense in "{selectedCat}" will trigger this goal.
            </p>
          )}
        </div>
      )}
    </Modal>
  )
}

// ── Goal Card ─────────────────────────────────────────────────────────────────
function GoalCard({ goal, onDelete, onContribute, onEditTrigger, onViewHistory }) {
  const pct       = Math.min((Number(goal.saved) / Number(goal.target)) * 100, 100)
  const done      = pct >= 100
  const remaining = Math.max(0, Number(goal.target) - Number(goal.saved))
  const daysLeft  = goal.deadline ? Math.ceil((new Date(goal.deadline) - new Date()) / 86400000) : null
  const keywords  = Array.isArray(goal.trigger_keywords) ? goal.trigger_keywords.filter(Boolean) : []
  const linkedCat = Array.isArray(goal.linked_categories) && goal.linked_categories.length > 0
    ? goal.linked_categories[0] : null

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
        <div className="goal-fill" style={{ width: `${pct}%`, background: goal.color, transition: 'width 600ms cubic-bezier(.16,1,.3,1)' }} />
      </div>

      {!done && <div className="goal-remaining">Rs. {formatMoney(remaining)} remaining</div>}

      {/* Trigger summary — category + keywords */}
      {linkedCat && (
        <div className="goal-trigger-summary">
          <span className="trigger-cat-badge">📂 {linkedCat}</span>
          {keywords.length > 0 ? (
            <>
              <span style={{ fontSize: 11, color: 'var(--ink-muted)', margin: '0 2px' }}>+</span>
              {keywords.map(k => <span key={k} className="keyword-chip">{k}</span>)}
            </>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--ink-muted)', marginLeft: 4 }}>any note</span>
          )}
        </div>
      )}

      <div className="goal-card-actions">
        <button className="btn btn-sm btn-ghost" onClick={() => onViewHistory(goal)}>📋 History</button>
        <button className="btn btn-sm btn-ghost" onClick={() => onEditTrigger(goal)}>
          ⚙️ {linkedCat ? 'Edit trigger' : 'Set trigger'}
        </button>
        {!done && (
          <button className="btn btn-sm" style={{ background: goal.color, color: '#fff', border: 'none' }} onClick={() => onContribute(goal)}>
            + Contribute
          </button>
        )}
      </div>

      {done && <div className="goal-done-banner">🎉 Goal reached!</div>}
    </div>
  )
}

// ── Add Goal Modal ─────────────────────────────────────────────────────────────
function AddGoalModal({ onSave, onClose }) {
  const baseline = useMemo(() => ({ name: '', target: '', saved: '0', deadline: '', color: GOAL_COLORS[0], emoji: GOAL_EMOJIS[0] }), [])
  const [form, setForm] = useState(baseline)
  const [saving, setSaving] = useState(false)
  const up = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const draft = useDraftPersistence('goal', baseline)
  useEffect(() => { draft.saveDraft(form) }, [form]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleContinueDraft() {
    const data = draft.acceptPendingDraft()
    if (data) setForm(prev => ({ ...prev, ...data }))
  }

  async function handleSave() {
    if (!form.name.trim() || !form.target) return
    setSaving(true)
    const ok = await onSave({
      name: form.name.trim(), target: parseFloat(form.target),
      saved: parseFloat(form.saved) || 0, deadline: form.deadline || null,
      color: form.color, emoji: form.emoji,
      linked_categories: [], trigger_keywords: [],
    })
    setSaving(false)
    if (ok) draft.clearDraft() // only clear once the Supabase save actually succeeded
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
      {draft.pendingDraft && (
        <DraftBanner onContinue={handleContinueDraft} onDiscard={draft.discardPendingDraft} />
      )}
      <div className="entry-form">
        <div>
          <label style={{ marginBottom: 8, display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {GOAL_EMOJIS.map(e => (
              <button key={e} type="button"
                style={{ width: 36, height: 36, fontSize: 20, border: `2px solid ${form.emoji === e ? form.color : 'var(--line)'}`, borderRadius: 8, background: 'var(--surface-alt)', cursor: 'pointer' }}
                onClick={() => up('emoji', e)}>{e}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{ marginBottom: 8, display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--ink-muted)' }}>Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {GOAL_COLORS.map(c => (
              <button key={c} type="button"
                style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: form.color === c ? '3px solid var(--ink)' : '2px solid transparent', cursor: 'pointer' }}
                onClick={() => up('color', c)} />
            ))}
          </div>
        </div>
        <label>Goal name<input type="text" placeholder="e.g. DFCC Credit Card, Emergency Fund…" value={form.name} onChange={e => up('name', e.target.value)} /></label>
        <div className="field-row">
          <label>Target (Rs.)<input type="number" placeholder="0.00" value={form.target} onChange={e => up('target', e.target.value)} /></label>
          <label>Already saved (Rs.)<input type="number" placeholder="0.00" value={form.saved} onChange={e => up('saved', e.target.value)} /></label>
        </div>
        <label>Deadline <span style={{ color: 'var(--ink-faint)', fontWeight: 400 }}>(optional)</span>
          <input type="date" value={form.deadline} onChange={e => up('deadline', e.target.value)} />
        </label>
        <div className="keyword-explainer" style={{ marginTop: 4 }}>
          💡 After creating, use <strong>"🔑 Set keywords"</strong> on the goal card to set note keywords that trigger automatic allocation.
        </div>
      </div>
    </Modal>
  )
}

// ── Contribute Modal ───────────────────────────────────────────────────────────
function ContributeModal({ goal, onSave, onClose }) {
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)
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

// ── Main Goals Page ────────────────────────────────────────────────────────────
export function Goals({ goals, expenseCategories = [], transactions = [], onAdd, onDelete, onContribute, onUpdateKeywords }) {
  const [showAdd,      setShowAdd]      = useState(false)
  const [contributing, setContributing] = useState(null)
  const [triggerGoal,  setTriggerGoal]  = useState(null)
  const [historyGoal,  setHistoryGoal]  = useState(null)

  const totalTarget = goals.reduce((s, g) => s + Number(g.target), 0)
  const totalSaved  = goals.reduce((s, g) => s + Number(g.saved),  0)
  const completed   = goals.filter(g => Number(g.saved) >= Number(g.target)).length

  async function handleAdd(payload) {
    const ok = await onAdd(payload)
    if (ok) setShowAdd(false)
    return ok
  }

  return (
    <div className="page-content">
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

      <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ New savings goal</button>

      {goals.length === 0
        ? <EmptyState title="No savings goals yet" description="Create a goal to start tracking your savings progress." />
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {goals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onDelete={onDelete}
                onContribute={g => setContributing(g)}
                onEditTrigger={g => setTriggerGoal(g)}
                onViewHistory={g => setHistoryGoal(g)}
              />
            ))}
          </div>
        )
      }

      {showAdd      && <AddGoalModal onSave={handleAdd} onClose={() => setShowAdd(false)} />}
      {contributing && <ContributeModal goal={contributing} onSave={onContribute} onClose={() => setContributing(null)} />}
      {triggerGoal  && <GoalTriggerModal goal={triggerGoal} expenseCategories={expenseCategories} transactions={transactions} onSave={onUpdateKeywords} onClose={() => setTriggerGoal(null)} />}
      {historyGoal  && <AllocationHistoryModal goal={historyGoal} onClose={() => setHistoryGoal(null)} />}
    </div>
  )
}
