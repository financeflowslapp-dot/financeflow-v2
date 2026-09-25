export const SAVINGS_CATEGORIES = ['Savings', 'savings', 'SAVINGS']
export const PALETTE = ['#159A75','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#0EA5E9','#35B779','#7C3AED','#0284C7','#F97316']
// Returns today's date in YYYY-MM-DD using LOCAL time — not UTC — so
// users in UTC+5:30 (Sri Lanka) always get the correct local date.
export const TODAY = () => {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
// EMPTY_FORM is a factory function — NOT a static object — so the date is
// always today's date when the form is opened, even if the app has been
// running since the previous day.
export const EMPTY_FORM = () => ({ type:'income',amount:'',category:'',note:'',date:TODAY(),isRecurring:false })
export const DEFAULT_CATEGORIES = [
  {name:'Salary',type:'income',position:1},{name:'Freelance',type:'income',position:2},
  {name:'Part-time',type:'income',position:3},{name:'Investment',type:'income',position:4},
  {name:'PickMe',type:'income',position:5},{name:'Uber',type:'income',position:6},
  {name:'Other Ride Hailing',type:'income',position:7},{name:'Other Income',type:'income',position:8},
  {name:'Savings',type:'expense',position:1},{name:'Food',type:'expense',position:2},
  {name:'Transport',type:'expense',position:3},{name:'Rent',type:'expense',position:4},
  {name:'Utilities',type:'expense',position:5},{name:'Entertainment',type:'expense',position:6},
  {name:'Health',type:'expense',position:7},{name:'Shopping',type:'expense',position:8},
  {name:'Fuel',type:'expense',position:9},{name:'BNPL (Koko/MintPay)',type:'expense',position:10},
  {name:'Loan Repayment',type:'expense',position:11},{name:'Loan',type:'expense',position:12},
  {name:'Other',type:'expense',position:13},
]
export const BASE_TABS = [
  {id:'dashboard',label:'Dashboard'},{id:'add',label:'+ Add'},
  {id:'history',label:'History'},{id:'recurring',label:'Recurring'},
]
export const ADMIN_TAB = {id:'admin',label:'👥 Users'}
