import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie,
  Cell, Legend, ReferenceLine,
} from 'recharts'
import { BudgetModal } from '../components/modals/BudgetModal.jsx'
import { SkeletonCard } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { useCountUp } from '../hooks/useCountUp.js'
import { SetupProgressWidget } from '../components/Onboarding.jsx'
import { formatMoney, formatDate } from '../utils/format.js'
import { isSavings } from '../utils/calculations.js'
import {
  TODAY_STR, getMonthRange, getPrevMonthRange, filterByRange,
  filterByCycle, sumIncome, sumExpense, sumSavings, sumNetExpense, sumCashExpense,
  calcHealthScore, buildWeeklyTrend, buildMonthlyTrend,
  buildCategoryBreakdown, buildCashFlow, buildBudgetUsage,
  buildUpcomingBills, buildInsights,
} from '../utils/dashboardCalcs.js'

const PIE_COLORS = ['#6366f1','#059669','#e07a5f','#d97706','#0ea5e9','#9d4edd']

const SCOPE_CYCLE = 'cycle'
const SCOPE_MONTH = 'month'

function fmt(v) { return 'Rs. ' + formatMoney(v) }
function pct(v) { return v.toFixed(1) + '%' }

function KpiCard({ label, value, raw, formatFn, sub, color, trend, icon, variant }) {
  const animated = useCountUp(typeof raw === 'number' ? raw : 0)
  const shownValue = typeof raw === 'number' ? formatFn(animated) : value
  return (
    <div className={`kpi-card${variant ? ' kpi-card-' + variant : ''}`}>
      <div className="kpi-header">
        <span className="kpi-icon">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value" style={{ color: color || 'var(--ink)' }}>{shownValue}</div>
      {sub  && <div className="kpi-sub">{sub}</div>}
      {trend !== undefined && trend !== null && (
        <div className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  )
}

function HealthGauge({ score, label, color }) {
  const radius = 54
  const circ   = 2 * Math.PI * radius
  const offset = circ - (score / 100) * circ
  return (
    <div className="health-gauge">
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={radius} fill="none" stroke="var(--surface-alt)" strokeWidth={12}/>
        <circle cx={70} cy={70} r={radius} fill="none" stroke={color} strokeWidth={12}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease', transform: 'rotate(-90deg)', transformOrigin: '70px 70px' }}
        />
        <text x={70} y={65} textAnchor="middle" fontSize={28} fontWeight={700} fill={color} fontFamily="Fraunces,serif">{score}</text>
        <text x={70} y={84} textAnchor="middle" fontSize={11} fill="var(--ink-muted)" fontFamily="Inter,sans-serif">/100</text>
      </svg>
      <div className="health-label" style={{ color }}>{label}</div>
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{fmt(p.value)}</strong>
        </p>
      ))}
    </div>
  )
}

export function Dashboard({ transactions, loading, budgets, payCycle, expenseCategories, saveBudgets, savePayCycle, editPayCycle, onAddTransaction, bills = [], goals = [], creditCards = [], onboardingStatus, steps, progressPct, onNavigate, cycleModal, setCycleModal }) {
  const [scope,      setScope]      = useState(SCOPE_CYCLE)
  const [showBudget, setShowBudget] = useState(false)

  // TODAY_STR() is called directly (not memoized) so every render picks up
  // the correct local date — handles midnight crossover without a page refresh.
  const today = TODAY_STR()
  const monthRange = useMemo(() => getMonthRange(), [])
  const prevRange  = useMemo(() => getPrevMonthRange(), [])

  /* ── Scoped transactions ── */
  const scopedTxns = useMemo(() => (
    scope === SCOPE_CYCLE ? filterByCycle(transactions, payCycle) : filterByRange(transactions, monthRange.start, monthRange.end)
  ), [transactions, scope, payCycle, monthRange])

  /* ── Today ── */
  const todayTxns    = useMemo(() => transactions.filter(t => t.date === today), [transactions, today])
  const todayIncome  = useMemo(() => sumIncome(todayTxns), [todayTxns])
  const todayExpense = useMemo(() => sumNetExpense(todayTxns), [todayTxns])

  /* ── Scoped totals ── */
  const income   = useMemo(() => sumIncome(scopedTxns),   [scopedTxns])
  const savings  = useMemo(() => sumSavings(scopedTxns),  [scopedTxns])
  const expense  = useMemo(() => sumNetExpense(scopedTxns),[scopedTxns])
  const balance  = sumIncome(scopedTxns) - sumCashExpense(scopedTxns)
  const savRate  = income > 0 ? (savings / income) * 100 : 0
  const spendRate= income > 0 ? (expense / income) * 100 : 0

  /* ── Budget remaining ── */
  const budgetRemaining = useMemo(() => {
    if (!budgets.length) return null
    const spent = budgets.reduce((s, b) => {
      const cat = scopedTxns.filter(t => t.category === b.category && t.type === 'expense').reduce((x, t) => x + Number(t.amount), 0)
      return s + Math.max(0, b.monthly_limit - cat)
    }, 0)
    return spent
  }, [budgets, scopedTxns])

  /* ── Prev month comparison ── */
  const prevTxns      = useMemo(() => filterByRange(transactions, prevRange.start, prevRange.end), [transactions, prevRange])
  const prevIncome    = useMemo(() => sumIncome(prevTxns), [prevTxns])
  const prevExpense   = useMemo(() => sumNetExpense(prevTxns), [prevTxns])
  const incomeTrend   = prevIncome  > 0 ? ((income  - prevIncome)  / prevIncome)  * 100 : null
  const expenseTrend  = prevExpense > 0 ? ((expense - prevExpense) / prevExpense) * 100 : null

  /* ── Largest ── */
  const largestExp = useMemo(() => [...scopedTxns].filter(t => t.type === 'expense' && !isSavings(t.category)).sort((a, b) => b.amount - a.amount)[0], [scopedTxns])
  const largestInc = useMemo(() => [...scopedTxns].filter(t => t.type === 'income').sort((a, b) => b.amount - a.amount)[0], [scopedTxns])

  /* ── Avg daily spending ── */
  const daysInScope = useMemo(() => {
    if (scope === SCOPE_CYCLE && payCycle) {
      const s = new Date(payCycle.start_date), e = new Date(payCycle.end_date)
      return Math.max(1, Math.round((e - s) / 86400000) + 1)
    }
    return new Date().getDate()
  }, [scope, payCycle])
  const avgDaily = expense / daysInScope

  /* ── Health score ── */
  const health = useMemo(() => calcHealthScore(scopedTxns, budgets), [scopedTxns, budgets])

  /* ── Charts ── */
  const weeklyTrend   = useMemo(() => buildWeeklyTrend(transactions),   [transactions])
  const monthlyTrend  = useMemo(() => buildMonthlyTrend(transactions),  [transactions])
  const catBreakdown  = useMemo(() => buildCategoryBreakdown(scopedTxns), [scopedTxns])
  const cashFlow      = useMemo(() => buildCashFlow(transactions),       [transactions])
  const savingsTrend  = useMemo(() => monthlyTrend.map(m => ({ month: m.month, savings: m.savings })), [monthlyTrend])
  const prevComp      = useMemo(() => [
    { name: 'Income',  current: income,  previous: prevIncome  },
    { name: 'Expense', current: expense, previous: prevExpense },
    { name: 'Savings', current: savings, previous: sumSavings(prevTxns) },
  ], [income, expense, savings, prevIncome, prevExpense, prevTxns])

  /* ── Cash flow (net, this period) + Upcoming bills ── */
  const cashFlowKpi   = income - expense
  const budgetUsage   = useMemo(() => buildBudgetUsage(budgets, scopedTxns), [budgets, scopedTxns])
  const upcomingBills = useMemo(() => buildUpcomingBills(bills), [bills])

  /* ── Smart insights ── */
  const insights = useMemo(() => buildInsights({
    scopedTxns, catBreakdown, expenseTrend, incomeTrend, savRate, budgetUsage, goals, upcomingBills,
  }), [scopedTxns, catBreakdown, expenseTrend, incomeTrend, savRate, budgetUsage, goals, upcomingBills])

  /* ── Recent activity ── */
  const recentActivity = useMemo(() => [...scopedTxns].slice(0, 5), [scopedTxns])

  const expBreakdownAll = useMemo(() => {
    const t = {}
    scopedTxns.filter(x => x.type === 'expense').forEach(x => { t[x.category] = (t[x.category] || 0) + Number(x.amount) })
    return Object.entries(t).map(([category, total]) => ({ category, total }))
  }, [scopedTxns])

  if (loading) return (
    <div className="page-content">
      <SkeletonCard /><SkeletonCard lines={2} /><SkeletonCard lines={4} />
    </div>
  )

  const scopeLabel = scope === SCOPE_CYCLE
    ? payCycle ? `${formatDate(payCycle.start_date)} → ${formatDate(payCycle.end_date)}` : 'No cycle set'
    : new Date().toLocaleDateString('en-LK', { month: 'long', year: 'numeric' })

  return (
    <div className="page-content dash-content">

      {/* ── Onboarding setup progress widget ── */}
      {onboardingStatus === 'incomplete' && steps && !Object.values(steps).every(Boolean) && (
        <SetupProgressWidget steps={steps} progressPct={progressPct} onNavigate={onNavigate} />
      )}

      {/* ── Context: scope toggle (compact) ── */}
      <div className="dash-context">
        <div className="dash-scope-row">
          <div className="dash-scope-pills">
            <button className={scope === SCOPE_CYCLE ? 'active' : ''} onClick={() => setScope(SCOPE_CYCLE)}>Pay Cycle</button>
            <button className={scope === SCOPE_MONTH ? 'active' : ''} onClick={() => setScope(SCOPE_MONTH)}>This Month</button>
          </div>
          <div className="dash-scope-actions">
            {payCycle && (
              <button className="btn btn-ghost btn-sm" onClick={() => setCycleModal('edit')}>Edit cycle</button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={() => setCycleModal('new')}>
              {payCycle ? 'Start new cycle' : 'Set cycle'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowBudget(true)}>⚙ Budgets</button>
          </div>
        </div>
        <p className="dash-scope-label">{scopeLabel}</p>
      </div>

      {/* ── MAIN FINANCIAL POSITION: Balance (dominant) + Health Score (supporting) ── */}
      <div className="dash-hero">
        <div className="dash-hero-balance">
          <span className="dash-hero-label">Balance</span>
          <span className={`dash-hero-amount ${balance >= 0 ? 'positive' : 'negative'}`}>
            Rs. {formatMoney(balance)}
          </span>
          <div className="dash-hero-splits">
            <span className="dash-split income">↑ Income <strong>Rs. {formatMoney(income)}</strong></span>
            {savings > 0 && <span className="dash-split savings">🏦 Savings <strong>Rs. {formatMoney(savings)}</strong></span>}
            <span className="dash-split expense">↓ Expenses <strong>Rs. {formatMoney(expense)}</strong></span>
          </div>
          {savings > 0 && (
            <p className="dash-balance-formula">
              Balance = Income − Cash Expenses (CC purchases excluded — only repayments reduce balance)
            </p>
          )}
        </div>
        <HealthGauge score={health.score} label={health.label} color={health.color} />
      </div>

      {/* ── KEY FINANCIAL METRICS ── */}
      <div className="dash-metrics">
        <div className="dash-section-label">Key financial metrics</div>
        <div className="kpi-grid kpi-grid-3 kpi-grid-primary">
          <KpiCard variant="lg" icon="📈" label="Income"       raw={income}   formatFn={fmt}   color="var(--emerald)" trend={incomeTrend}  />
          <KpiCard variant="lg" icon="📉" label="Expenses"     raw={expense}  formatFn={fmt}   color="var(--brick)"   trend={expenseTrend} />
          <KpiCard variant="lg" icon="🏦" label="Savings"      raw={savings}  formatFn={fmt}   color="var(--gold)"    sub={`${pct(savRate)} of income`} />
        </div>

        <div className="dash-section-label dash-section-label-sub">More metrics</div>
        <div className="kpi-grid kpi-grid-3 kpi-grid-secondary">
          <KpiCard icon="💰" label="Savings Rate" raw={savRate}  formatFn={pct}   color={savRate >= 20 ? 'var(--emerald)' : savRate >= 10 ? 'var(--amber)' : 'var(--brick)'} />
          <KpiCard icon="📊" label="Spending Rate" raw={spendRate} formatFn={pct} color={spendRate <= 70 ? 'var(--emerald)' : spendRate <= 90 ? 'var(--amber)' : 'var(--brick)'} />
          <KpiCard icon="📅" label="Avg Daily Spend" raw={avgDaily} formatFn={fmt} color="var(--ink)" />
          <KpiCard icon="🔀" label="Cash Flow" raw={cashFlowKpi} formatFn={fmt} color={cashFlowKpi >= 0 ? 'var(--emerald)' : 'var(--brick)'} sub={cashFlowKpi >= 0 ? 'Net positive' : 'Net negative'} />
          {upcomingBills.count > 0 && <KpiCard icon="📄" label="Upcoming Bills" raw={upcomingBills.total} formatFn={fmt} color="var(--amber)" sub={`${upcomingBills.count} due in 7 days`} />}
          {budgetRemaining !== null && <KpiCard icon="🎯" label="Budget Remaining" raw={budgetRemaining} formatFn={fmt} color="var(--forest-soft)" />}
          {largestInc && <KpiCard icon="⬆️" label="Largest Income"  raw={largestInc.amount} formatFn={fmt} sub={largestInc.category} color="var(--emerald)" />}
          {largestExp && <KpiCard icon="⬇️" label="Largest Expense" raw={largestExp.amount} formatFn={fmt} sub={largestExp.category} color="var(--brick)"   />}
        </div>

        <div className="dash-section-label dash-section-label-sub">Today</div>
        <div className="kpi-grid kpi-grid-2 kpi-grid-compact">
          <KpiCard variant="compact" icon="☀️" label="Today's Income"  raw={todayIncome}  formatFn={fmt} color="var(--emerald)" />
          <KpiCard variant="compact" icon="💸" label="Today's Expense" raw={todayExpense} formatFn={fmt} color="var(--brick)"   />
        </div>
      </div>

      {/* ── GOALS + CREDIT CARDS: secondary financial areas ── */}
      {(creditCards.length > 0 || goals.filter(g => Number(g.saved) < Number(g.target)).length > 0) && (
        <div className="dash-section-label">Goals &amp; Credit Cards</div>
      )}
      <div className="dash-secondary-grid">

      {/* ── Credit Card Summary ── */}
      {creditCards.length > 0 && (() => {
        const totalLimit       = creditCards.reduce((s, c) => s + Number(c.credit_limit),       0)
        const totalOutstanding = creditCards.reduce((s, c) => s + Number(c.outstanding_balance), 0)
        const totalAvailable   = Math.max(0, totalLimit - totalOutstanding)
        const overallUtil      = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : 0
        const utilInfo = overallUtil <= 30 ? { label: 'Excellent', color: 'var(--emerald)' }
          : overallUtil <= 60 ? { label: 'Moderate', color: 'var(--amber, #d97706)' }
          : overallUtil <= 80 ? { label: 'High',     color: '#f59e0b' }
          :                     { label: 'Critical',  color: 'var(--brick)' }
        return (
          <div className="dash-card">
            <h3 className="dash-card-title">💳 Credit Cards</h3>
            <div className="cc-dash-summary">
              <div className="cc-dash-kpi"><span className="cc-dash-kpi-label">Total Outstanding</span><span className="cc-dash-kpi-val" style={{ color: 'var(--brick)' }}>Rs. {formatMoney(totalOutstanding)}</span></div>
              <div className="cc-dash-kpi"><span className="cc-dash-kpi-label">Available Credit</span><span className="cc-dash-kpi-val" style={{ color: 'var(--emerald)' }}>Rs. {formatMoney(totalAvailable)}</span></div>
              <div className="cc-dash-kpi"><span className="cc-dash-kpi-label">Utilization</span><span className="cc-dash-kpi-val" style={{ color: utilInfo.color }}>{overallUtil.toFixed(1)}% — {utilInfo.label}</span></div>
            </div>
            <div className="cc-dash-cards">
              {creditCards.map(c => {
                const outstanding = Number(c.outstanding_balance)
                const limit       = Number(c.credit_limit)
                const available   = Math.max(0, limit - outstanding)
                const pct         = limit > 0 ? (outstanding / limit) * 100 : 0
                const info = pct <= 30 ? { label: 'Excellent', color: 'var(--emerald)' }
                  : pct <= 60 ? { label: 'Moderate', color: '#d97706' }
                  : pct <= 80 ? { label: 'High',     color: '#f59e0b' }
                  :             { label: 'Critical',  color: 'var(--brick)' }
                return (
                  <div key={c.id} className="cc-dash-card" style={{ borderLeftColor: c.color }}>
                    <div className="cc-dash-card-header">
                      <div>
                        <div className="cc-dash-bank">{c.bank_name}</div>
                        <div className="cc-dash-nick" style={{ color: c.color }}>{c.nickname}</div>
                      </div>
                      <span className="cc-dash-util" style={{ color: info.color }}>{pct.toFixed(0)}%<br/><small>{info.label}</small></span>
                    </div>
                    <div className="cc-util-bar" style={{ margin: '6px 0 4px' }}>
                      <div className="cc-util-fill" style={{ width: `${Math.min(pct, 100)}%`, background: c.color }} />
                    </div>
                    <div className="cc-dash-card-stats">
                      <span>Outstanding: <strong style={{ color: 'var(--brick)' }}>Rs. {formatMoney(outstanding)}</strong></span>
                      <span>Available: <strong style={{ color: 'var(--emerald)' }}>Rs. {formatMoney(available)}</strong></span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* ── Goals Widget ── */}
      {goals.filter(g => Number(g.saved) < Number(g.target)).length > 0 && (
        <div className="dash-card">
          <h3 className="dash-card-title">🎯 Active Goals</h3>
          <div className="dash-goals-list">
            {goals.filter(g => Number(g.saved) < Number(g.target)).map(g => {
              const pct = Math.min((Number(g.saved) / Number(g.target)) * 100, 100)
              const remaining = Math.max(0, Number(g.target) - Number(g.saved))
              const daysLeft = g.deadline ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000) : null
              return (
                <div key={g.id} className="dash-goal-row">
                  <div className="dash-goal-header">
                    <span className="dash-goal-emoji">{g.emoji}</span>
                    <span className="dash-goal-name">{g.name}</span>
                    <span className="dash-goal-pct" style={{ color: g.color }}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="goal-track" style={{ margin: '6px 0 4px' }}>
                    <div className="goal-fill" style={{ width: `${pct}%`, background: g.color, transition: 'width 600ms cubic-bezier(.16,1,.3,1)' }} />
                  </div>
                  <div className="dash-goal-meta">
                    <span>Saved Rs. {formatMoney(g.saved)}</span>
                    <span>·</span>
                    <span>Rs. {formatMoney(remaining)} left</span>
                    {daysLeft !== null && <><span>·</span><span className={daysLeft < 30 ? 'urgent-text' : ''}>{daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}</span></>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      </div>

      {/* ── Smart Insights / Financial Health (secondary to main position) ── */}
      {insights.length > 0 && (
        <div className="dash-card dash-insights-card">
          <h3 className="dash-card-title">Smart Insights</h3>
          <ul className="insights-list">
            {insights.map((ins, i) => (
              <li key={i} className={`insight-row insight-${ins.tone}`}>
                <span className="insight-icon">{ins.icon}</span>
                <span className="insight-text">{ins.text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── CHARTS / ANALYTICS ── */}
      <div className="dash-section-label">Analytics</div>
      <div className="dash-charts-grid">

      {/* ── Income vs Expense Bar ── */}
      <div className="dash-card">
        <h3 className="dash-card-title">Income vs Expenses</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[{ name: scopeLabel, Income: income, Expenses: expense, Savings: savings }]} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickFormatter={v => 'Rs.' + (v >= 1000 ? (v/1000).toFixed(0)+'k' : v)} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="Income"   fill="#059669" radius={[6,6,0,0]} />
            <Bar dataKey="Expenses" fill="#be123c" radius={[6,6,0,0]} />
            <Bar dataKey="Savings"  fill="#d97706" radius={[6,6,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Weekly Trend ── */}
      <div className="dash-card">
        <h3 className="dash-card-title">Weekly Trend (last 7 days)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyTrend} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="income"  name="Income"  fill="#059669" radius={[4,4,0,0]} />
            <Bar dataKey="expense" name="Expense" fill="#be123c" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Monthly Trend ── */}
      <div className="dash-card">
        <h3 className="dash-card-title">Monthly Trend (last 6 months)</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyTrend} barCategoryGap="20%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="income"  name="Income"  fill="#059669" radius={[4,4,0,0]} />
            <Bar dataKey="expense" name="Expense" fill="#be123c" radius={[4,4,0,0]} />
            <Bar dataKey="savings" name="Savings" fill="#d97706" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Cash Flow Trend ── */}
      <div className="dash-card">
        <h3 className="dash-card-title">Cash Flow Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={cashFlow}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={0} stroke="var(--ink-muted)" strokeDasharray="4 4" />
            <Line dataKey="cashFlow" name="Cash Flow" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Savings Trend ── */}
      <div className="dash-card">
        <h3 className="dash-card-title">Savings Trend (last 6 months)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={savingsTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
            <Tooltip content={<ChartTooltip />} />
            <Line dataKey="savings" name="Savings" stroke="#d97706" strokeWidth={2.5} dot={{ r: 4, fill: '#d97706' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Category Breakdown Pie ── */}
      {catBreakdown.length > 0 && (
        <div className="dash-card">
          <h3 className="dash-card-title">Top Categories</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={catBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3}>
                {catBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} />
              <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Budget Usage ── */}
      {budgetUsage.length > 0 && (
        <div className="dash-card">
          <h3 className="dash-card-title">Budget Usage</h3>
          <ResponsiveContainer width="100%" height={Math.max(160, budgetUsage.length * 42)}>
            <BarChart data={budgetUsage} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
              <YAxis type="category" dataKey="category" width={90} tick={{ fontSize: 11, fill: 'var(--ink-muted)' }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="spent" name="Spent" radius={[0,6,6,0]}>
                {budgetUsage.map((b, i) => <Cell key={i} fill={b.pct >= 100 ? '#be123c' : b.pct >= 80 ? '#d97706' : '#059669'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Previous Month Comparison ── */}
      <div className="dash-card">
        <h3 className="dash-card-title">vs Previous Month</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={prevComp} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--ink-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--ink-muted)' }} tickFormatter={v => v >= 1000 ? (v/1000).toFixed(0)+'k' : v} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="current"  name="This period" fill="#6366f1" radius={[4,4,0,0]} />
            <Bar dataKey="previous" name="Last month"  fill="var(--line)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      </div>

      {/* ── RECENT ACTIVITY (lowest visual priority) ── */}
      <div className="dash-card dash-card-muted">
        <h3 className="dash-card-title">Recent Activity</h3>
        {recentActivity.length === 0
          ? <EmptyState title="No entries yet" />
          : (
            <ul className="recent-list">
              {recentActivity.map(t => {
                const sv = isSavings(t.category)
                return (
                  <li key={t.id} className="recent-row">
                    <span className={`recent-dot ${sv ? 'savings' : t.type}`} />
                    <div className="recent-main">
                      <span className="recent-cat">{t.category}</span>
                      {t.note && <span className="recent-note">{t.note}</span>}
                    </div>
                    <span className="recent-date">{formatDate(t.date)}</span>
                    <span className={`recent-amt ${sv ? 'savings' : t.type}`}>
                      {t.type === 'income' ? '+' : sv ? '🏦' : '−'} Rs. {formatMoney(t.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )
        }
      </div>

      {showBudget && <BudgetModal expenseCategories={expenseCategories} budgets={budgets} expBreakdownAll={expBreakdownAll} onSave={saveBudgets} onClose={() => setShowBudget(false)} />}
    </div>
  )
}
