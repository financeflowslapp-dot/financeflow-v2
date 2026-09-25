import { isSavings } from './calculations.js'

// Uses local date (not UTC) so Sri Lanka UTC+5:30 never gets the previous day.
function localDateStr(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export const TODAY_STR = () => localDateStr()

export function getMonthRange(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth()
  return {
    start: localDateStr(new Date(y, m, 1)),
    end:   localDateStr(new Date(y, m + 1, 0)),
  }
}

export function getPrevMonthRange(date = new Date()) {
  return getMonthRange(new Date(date.getFullYear(), date.getMonth() - 1, 1))
}

export function filterByRange(txns, start, end) {
  return txns.filter(t => t.date >= start && t.date <= end)
}

export function filterByCycle(txns, cycle) {
  if (!cycle) return txns
  return txns.filter(t => t.date >= cycle.start_date && t.date <= cycle.end_date)
}

export function sumIncome(txns)  { return txns.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0) }
export function sumExpense(txns) { return txns.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0) }
export function sumSavings(txns) { return txns.filter(t => t.type === 'expense' && isSavings(t.category)).reduce((s, t) => s + Number(t.amount), 0) }
export function sumNetExpense(txns) { return sumExpense(txns) - sumSavings(txns) }
// Cash balance excludes CC purchases (payment_method = 'credit_card') because
// those don't actually take money out of your account — only the repayment does.
export function sumCashExpense(txns) {
  return txns.filter(t => t.type === 'expense' && t.payment_method !== 'credit_card').reduce((s, t) => s + Number(t.amount), 0)
}

export function calcHealthScore(txns, budgets) {
  const income  = sumIncome(txns)
  const expense = sumNetExpense(txns)
  const savings = sumSavings(txns)
  if (income === 0) return { score: 0, label: 'No data', color: '#6B7772' }

  const savingsRate  = savings / income
  const spendingRate = expense / income
  const budgetOk     = budgets.length === 0 ? 1 : 1 - (budgets.filter(b => {
    const spent = txns.filter(t => t.category === b.category && t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
    return spent > b.monthly_limit
  }).length / budgets.length)

  const score = Math.min(100, Math.round(
    savingsRate  * 40 +
    (1 - Math.min(spendingRate, 1)) * 40 +
    budgetOk * 20
  ))

  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Needs attention'
  const color = score >= 80 ? '#159A75' : score >= 60 ? '#F59E0B' : score >= 40 ? '#F59E0B' : '#EF4444'
  return { score, label, color }
}

export function buildWeeklyTrend(txns) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = localDateStr(d)
    const dayTxns = txns.filter(t => t.date === ds)
    days.push({
      day: d.toLocaleDateString('en-LK', { weekday: 'short' }),
      income:  sumIncome(dayTxns),
      expense: sumNetExpense(dayTxns),
    })
  }
  return days
}

export function buildMonthlyTrend(txns) {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const { start, end } = getMonthRange(d)
    const mt = filterByRange(txns, start, end)
    months.push({
      month: d.toLocaleDateString('en-LK', { month: 'short' }),
      income:  sumIncome(mt),
      expense: sumNetExpense(mt),
      savings: sumSavings(mt),
    })
  }
  return months
}

export function buildCategoryBreakdown(txns) {
  const totals = {}
  txns.filter(t => t.type === 'expense' && !isSavings(t.category)).forEach(t => {
    totals[t.category] = (totals[t.category] || 0) + Number(t.amount)
  })
  return Object.entries(totals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6)
}

export function buildCashFlow(txns) {
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i)
    const { start, end } = getMonthRange(d)
    const mt = filterByRange(txns, start, end)
    const inc = sumIncome(mt), exp = sumNetExpense(mt)
    months.push({
      month:    d.toLocaleDateString('en-LK', { month: 'short' }),
      cashFlow: inc - exp,
    })
  }
  return months
}

export function buildBudgetUsage(budgets, txns) {
  return budgets.map(b => {
    const spent = txns.filter(t => t.type === 'expense' && t.category === b.category)
      .reduce((s, t) => s + Number(t.amount), 0)
    return { category: b.category, spent, limit: Number(b.monthly_limit), pct: b.monthly_limit > 0 ? (spent / b.monthly_limit) * 100 : 0 }
  }).sort((a, b) => b.pct - a.pct)
}

export function buildUpcomingBills(bills) {
  const today = new Date().getDate()
  const active = (bills || []).filter(b => b.is_active !== false)
  const overdue  = active.filter(b => b.due_day < today)
  const upcoming = active.filter(b => b.due_day >= today && b.due_day <= today + 7)
  const total = upcoming.reduce((s, b) => s + Number(b.amount), 0)
  return { count: upcoming.length, total, overdueCount: overdue.length, items: upcoming }
}

export function buildInsights({ scopedTxns, catBreakdown, expenseTrend, incomeTrend, savRate, budgetUsage, goals, upcomingBills }) {
  const insights = []

  if (expenseTrend !== null && Math.abs(expenseTrend) >= 1) {
    insights.push({
      icon: expenseTrend < 0 ? '📉' : '📈',
      tone: expenseTrend < 0 ? 'good' : 'warn',
      text: `You spent ${Math.abs(expenseTrend).toFixed(0)}% ${expenseTrend < 0 ? 'less' : 'more'} than last month.`,
    })
  }

  if (catBreakdown.length > 0) {
    insights.push({ icon: '🏷️', tone: 'neutral', text: `Your highest spending category is ${catBreakdown[0].name} (Rs. ${Math.round(catBreakdown[0].value).toLocaleString('en-LK')}).` })
  }

  const overBudget = (budgetUsage || []).filter(b => b.pct >= 100)
  if (overBudget.length > 0) {
    insights.push({ icon: '⚠️', tone: 'warn', text: `You've gone over budget on ${overBudget.map(b => b.category).join(', ')}.` })
  } else {
    const nearBudget = (budgetUsage || []).find(b => b.pct >= 80)
    if (nearBudget) insights.push({ icon: '🎯', tone: 'warn', text: `${nearBudget.category} is at ${nearBudget.pct.toFixed(0)}% of its budget.` })
  }

  if (savRate >= 20) {
    insights.push({ icon: '💪', tone: 'good', text: `Great job — you're saving ${savRate.toFixed(0)}% of your income this period.` })
  } else if (savRate < 5 && scopedTxns.length > 0) {
    insights.push({ icon: '💡', tone: 'warn', text: `You're saving under 5% of your income this period — worth a look.` })
  }

  if (goals && goals.length > 0) {
    const g = goals.filter(g => Number(g.saved) < Number(g.target)).sort((a, b) => (Number(b.saved) / Number(b.target)) - (Number(a.saved) / Number(a.target)))[0]
    if (g) {
      const progress = Number(g.target) > 0 ? (Number(g.saved) / Number(g.target)) * 100 : 0
      if (g.deadline && g.created_at) {
        const totalDays = Math.max(1, daysBetweenDates(g.created_at, g.deadline))
        const remaining = daysBetweenDates(TODAY_STR(), g.deadline)
        const elapsedPct = totalDays > 0 ? Math.min(100, ((totalDays - remaining) / totalDays) * 100) : 0
        const onTrack = progress >= elapsedPct - 5
        insights.push({
          icon: onTrack ? '✅' : '⏳',
          tone: onTrack ? 'good' : 'warn',
          text: onTrack
            ? `You're on track to reach your "${g.name}" savings goal.`
            : `You're a bit behind pace on your "${g.name}" savings goal (${progress.toFixed(0)}% saved).`,
        })
      } else {
        insights.push({ icon: '🎯', tone: 'neutral', text: `You're ${progress.toFixed(0)}% of the way to your "${g.name}" goal.` })
      }
    }
  }

  if (upcomingBills && upcomingBills.overdueCount > 0) {
    insights.push({ icon: '🔴', tone: 'warn', text: `You have ${upcomingBills.overdueCount} overdue bill${upcomingBills.overdueCount === 1 ? '' : 's'}.` })
  } else if (upcomingBills && upcomingBills.count > 0) {
    insights.push({ icon: '📄', tone: 'neutral', text: `${upcomingBills.count} bill${upcomingBills.count === 1 ? '' : 's'} due in the next 7 days.` })
  }

  return insights.slice(0, 6)
}

function daysBetweenDates(a, b) {
  if (!a || !b) return 0
  return Math.round((new Date(b) - new Date(a)) / 86400000)
}
