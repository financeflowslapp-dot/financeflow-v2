import { isSavings } from './calculations.js'

export const TODAY_STR = () => new Date().toISOString().slice(0, 10)

export function getMonthRange(date = new Date()) {
  const y = date.getFullYear(), m = date.getMonth()
  return {
    start: new Date(y, m, 1).toISOString().slice(0, 10),
    end:   new Date(y, m + 1, 0).toISOString().slice(0, 10),
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

export function calcHealthScore(txns, budgets) {
  const income  = sumIncome(txns)
  const expense = sumNetExpense(txns)
  const savings = sumSavings(txns)
  if (income === 0) return { score: 0, label: 'No data', color: '#737370' }

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
  const color = score >= 80 ? '#059669' : score >= 60 ? '#d97706' : score >= 40 ? '#f59e0b' : '#be123c'
  return { score, label, color }
}

export function buildWeeklyTrend(txns) {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const ds = d.toISOString().slice(0, 10)
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
