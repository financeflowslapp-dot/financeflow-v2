import { Modal } from './ui/Modal.jsx'

const STEP_CONFIG = [
  { key: 'cycle',   icon: '📅', label: 'Create your Pay Cycle'   },
  { key: 'income',  icon: '📈', label: 'Add your first Income'    },
  { key: 'expense', icon: '📉', label: 'Record your first Expense' },
  { key: 'budget',  icon: '🎯', label: 'Create your Budget'       },
  { key: 'goal',    icon: '💰', label: 'Set your Savings Goal'    },
]

// ── Welcome Modal ─────────────────────────────────────────────────────────────
// Shown only once to brand-new users after first login.
export function WelcomeModal({ onGetStarted, onSkip }) {
  return (
    <Modal title="" onClose={onSkip} footer={
      <div className="modal-actions" style={{ flexDirection: 'column', gap: 8 }}>
        <button className="btn btn-primary btn-full" onClick={onGetStarted}>
          👋 Get Started
        </button>
        <button className="btn btn-ghost btn-full" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    }>
      <div className="onboarding-welcome">
        <div className="onboarding-hero">
          <span className="onboarding-logo">₹</span>
          <h2 className="onboarding-title">Welcome to FinanceFlow!</h2>
          <p className="onboarding-subtitle">Your personal finance journey starts here. Complete these quick steps to get set up.</p>
        </div>

        <ul className="onboarding-steps">
          {STEP_CONFIG.map((s, i) => (
            <li key={s.key} className="onboarding-step">
              <span className="onboarding-step-num">{i + 1}</span>
              <span className="onboarding-step-icon">{s.icon}</span>
              <span className="onboarding-step-label">{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </Modal>
  )
}

// ── Step Success Toast ─────────────────────────────────────────────────────────
// Lightweight non-intrusive message after each completed step.
export function StepSuccessBar({ message, onDismiss, onNavigate }) {
  if (!message) return null
  return (
    <div className="step-success-bar">
      <span className="step-success-text">✅ {message.text}</span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        {message.next && (
          <button className="btn btn-sm" style={{ background: 'var(--forest-soft)', color: '#fff', border: 'none' }}
            onClick={() => { onNavigate(message.next); onDismiss() }}>
            Next →
          </button>
        )}
        <button className="btn btn-sm btn-ghost" onClick={onDismiss}>✕</button>
      </div>
    </div>
  )
}

// ── Dashboard Setup Progress Widget ───────────────────────────────────────────
// Shown on Dashboard when onboarding is incomplete.
export function SetupProgressWidget({ steps, progressPct, onNavigate }) {
  const stepNav = { cycle: 'dashboard', income: 'add', expense: 'add', budget: 'dashboard', goal: 'goals' }

  return (
    <div className="setup-widget">
      <div className="setup-widget-header">
        <span className="setup-widget-title">Complete Your Setup</span>
        <span className="setup-widget-pct">{progressPct}%</span>
      </div>

      {/* Progress bar */}
      <div className="setup-progress-bar">
        <div className="setup-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <ul className="setup-steps">
        {STEP_CONFIG.map(s => (
          <li key={s.key}
            className={`setup-step ${steps[s.key] ? 'done' : 'pending'}`}
            onClick={() => !steps[s.key] && onNavigate(stepNav[s.key])}
            style={{ cursor: steps[s.key] ? 'default' : 'pointer' }}
          >
            <span className="setup-step-check">{steps[s.key] ? '✅' : '☐'}</span>
            <span className="setup-step-icon">{s.icon}</span>
            <span className="setup-step-label">{s.label}</span>
            {!steps[s.key] && <span className="setup-step-arrow">→</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
