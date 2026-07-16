import { useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie,
  Cell, Legend, ReferenceLine,
} from 'recharts'
import { CycleModal } from '../components/modals/CycleModal.jsx'
import { BudgetModal } from '../components/modals/BudgetModal.jsx'
import { SkeletonCard } from '../components/ui/Skeleton.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { formatMoney, formatDate } from '../utils/format.js'
import { isSavings } from '../utils/calculations.js'
import {
  TODAY_STR, getMonthRange, getPrevMonthRange, filterByRange,
  filterByCycle, sumIncome, sumExpense, sumSavings, sumNetExpense,
  calcHealthScore, buildWeeklyTrend, buildMonthlyTrend,
  buildCategoryBreakdown, buildCashFlow,
} from '../utils/dashboardCalcs.js'

const PIE_COLORS = ['#6366f1','#059669','#e07a5f','#d97706','#0ea5e9','#9d4edd']

const SCOPE_CYCLE = 'cycle'
const SCOPE_MONTH = 'month'

function fmt(v) { return 'Rs. ' + formatMoney(v) }
function pct(v) { return v.toFixed(1) + '%' }

function KpiCard({ label, value, sub, color, trend, icon }) {
  return (
    <div className="kpi-card">
      <div className="kpi-header">
        <span className="kpi-icon">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <div className="kpi-value" style={{ color: color || 'var(--ink)' }}>{value}</div>
      {sub  && <div className="kpi-sub">{sub}</div>}
      {trend !== undefined && (
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

export function Dashboard({ transactions, loading, budgets, payCycle, expenseCategories, saveBudgets, savePayCycle }) {
  const [scope,      setScope]      = useState(SCOPE_CYCLE)
  const [showCycle,  setShowCycle]  = useState(false)
  const [showBudget, setShowBudget] = useState(false)

  const today     = TODAY_STR()
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
  const balance  = income - sumExpense(scopedTxns)
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
  const prevComp      = useMemo(() => [
    { name: 'Income',  current: income,  previous: prevIncome  },
    { name: 'Expense', current: expense, previous: prevExpense },
    { name: 'Savings', current: savings, previous: sumSavings(prevTxns) },
  ], [income, expense, savings, prevIncome, prevExpense, prevTxns])

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

      {/* ── Scope toggle ── */}
      <div className="dash-scope-row">
        <div className="dash-scope-pills">
          <button className={scope === SCOPE_CYCLE ? 'active' : ''} onClick={() => setScope(SCOPE_CYCLE)}>Pay Cycle</button>
          <button className={scope === SCOPE_MONTH ? 'active' : ''} onClick={() => setScope(SCOPE_MONTH)}>This Month</button>
        </div>
        <div className="dash-scope-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => setShowCycle(true)}>
            {payCycle ? 'Edit cycle' : 'Set cycle'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowBudget(true)}>⚙ Budgets</button>
        </div>
      </div>
      <p className="dash-scope-label">{scopeLabel}</p>

      {/* ── Health Score + Balance ── */}
      <div className="dash-hero">
        <div className="dash-hero-balance">
          <span className="dash-hero-label">Balance</span>
          <span className={`dash-hero-amount ${balance >= 0 ? 'positive' : 'negative'}`}>
            Rs. {formatMoney(balance)}
          </span>
          <div className="dash-hero-splits">
            <span className="dash-split income">↑ Rs. {formatMoney(income)}</span>
            <span className="dash-split expense">↓ Rs. {formatMoney(expense)}</span>
          </div>
        </div>
        <HealthGauge score={health.score} label={health.label} color={health.color} />
      </div>

      {/* ── Today cards ── */}
      <div className="dash-section-label">Today</div>
      <div className="kpi-grid kpi-grid-2">
        <KpiCard icon="☀️" label="Today's Income"  value={fmt(todayIncome)}  color="var(--emerald)" />
        <KpiCard icon="💸" label="Today's Expense" value={fmt(todayExpense)} color="var(--brick)"   />
      </div>

      {/* ── KPI cards ── */}
      <div className="dash-section-label">Period overview</div>
      <div className="kpi-grid kpi-grid-3">
        <KpiCard icon="📈" label="Income"       value={fmt(income)}   color="var(--emerald)" trend={incomeTrend}  />
        <KpiCard icon="📉" label="Expenses"     value={fmt(expense)}  color="var(--brick)"   trend={expenseTrend} />
        <KpiCard icon="🏦" label="Savings"      value={fmt(savings)}  color="var(--gold)"    sub={`${pct(savRate)} of income`} />
        <KpiCard icon="💰" label="Savings Rate" value={pct(savRate)}  color={savRate >= 20 ? 'var(--emerald)' : savRate >= 10 ? 'var(--amber)' : 'var(--brick)'} />
        <KpiCard icon="📊" label="Spending Rate" value={pct(spendRate)} color={spendRate <= 70 ? 'var(--emerald)' : spendRate <= 90 ? 'var(--amber)' : 'var(--brick)'} />
        <KpiCard icon="📅" label="Avg Daily Spend" value={fmt(avgDaily)} color="var(--ink)" />
        {budgetRemaining !== null && <KpiCard icon="🎯" label="Budget Remaining" value={fmt(budgetRemaining)} color="var(--forest-soft)" />}
        {largestInc && <KpiCard icon="⬆️" label="Largest Income"  value={fmt(largestInc.amount)} sub={largestInc.category} color="var(--emerald)" />}
        {largestExp && <KpiCard icon="⬇️" label="Largest Expense" value={fmt(largestExp.amount)} sub={largestExp.category} color="var(--brick)"   />}
      </div>

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

      {/* ── Recent Activity ── */}
      <div className="dash-card">
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

      {showCycle  && <CycleModal  payCycle={payCycle} onSave={savePayCycle} onClose={() => setShowCycle(false)} />}
      {showBudget && <BudgetModal expenseCategories={expenseCategories} budgets={budgets} expBreakdownAll={expBreakdownAll} onSave={saveBudgets} onClose={() => setShowBudget(false)} />}
    </div>
  )
}
