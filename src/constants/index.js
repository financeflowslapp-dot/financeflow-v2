export const SAVINGS_CATEGORIES = ['Savings', 'savings', 'SAVINGS']
export const PALETTE = ['#6c63ff','#059669','#e07a5f','#d97706','#0ea5e9','#9d4edd','#f43f5e','#0891b2','#84cc16','#06d6a0']
export const TODAY = () => new Date().toISOString().slice(0,10)
export const EMPTY_FORM = { type:'income',amount:'',category:'',note:'',date:new Date().toISOString().slice(0,10),isRecurring:false }
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
