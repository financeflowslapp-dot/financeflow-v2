export function formatMoney(v){return Number(v||0).toLocaleString('en-LK',{minimumFractionDigits:2,maximumFractionDigits:2})}
export function formatDate(s){return new Date(s).toLocaleDateString('en-LK',{day:'2-digit',month:'short',year:'numeric'})}
export function formatDateTime(s){if(!s)return'—';return new Date(s).toLocaleString('en-LK',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
export function formatAmountInput(raw){
  if(raw===undefined||raw===null||raw==='')return''
  const[i,d]=String(raw).split('.')
  const fi=i.replace(/\B(?=(\d{3})+(?!\d))/g,',')
  return d!==undefined?fi+'.'+d:fi
}
export function sanitizeAmountInput(v){const c=v.replace(/,/g,'');return /^\d*\.?\d*$/.test(c)?c:null}
