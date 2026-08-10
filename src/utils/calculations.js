import {PALETTE,SAVINGS_CATEGORIES} from '../constants/index.js'
export const isSavings=cat=>SAVINGS_CATEGORIES.includes(cat)
export function daysBetweenInclusive(s,e){return Math.round((new Date(e)-new Date(s))/86400000)+1}
export function cycleStatusLabel(endStr){
  const t=new Date();t.setHours(0,0,0,0)
  const e=new Date(endStr);e.setHours(0,0,0,0)
  const d=Math.round((e-t)/86400000)
  if(d===0)return'Cycle ends today'
  if(d<0)return`Cycle ended ${Math.abs(d)} day${Math.abs(d)===1?'':'s'} ago`
  return`Cycle ends in ${d} day${d===1?'':'s'}`
}
export function groupByCategory(txns,type){
  const t={}
  txns.filter(x=>x.type===type).forEach(x=>{t[x.category]=(t[x.category]||0)+Number(x.amount)})
  return Object.entries(t).map(([category,total])=>({category,total})).sort((a,b)=>b.total-a.total)
}
export function withColor(list,total){
  return list.map((item,i)=>({...item,percent:total>0?(item.total/total)*100:0,color:PALETTE[i%PALETTE.length]}))
}
export function buildConic(segs){
  let c=0
  return`conic-gradient(${segs.map(s=>{const st=c;c+=s.percent;return`${s.color} ${st}% ${c}%`}).join(',')})`
}
export function budgetClass(spent,limit){
  if(!limit||isNaN(limit))return''
  const r=spent/limit;if(r>=1)return'over';if(r>=0.8)return'warning';return''
}
export function calcCycleTotals(txns){
  const income=txns.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0)
  const savings=txns.filter(t=>t.type==='expense'&&isSavings(t.category)).reduce((s,t)=>s+Number(t.amount),0)
  const expRaw=txns.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0)
  return{income,savings,expRaw,expense:expRaw-savings,balance:income-expRaw}
}
