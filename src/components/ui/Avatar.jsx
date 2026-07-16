export function Avatar({url,name,size=32}){
  const initials=(name||'?').split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)
  if(url)return <img src={url} alt={name||'User'} className="user-avatar" style={{width:size,height:size}} referrerPolicy="no-referrer"/>
  return <div className="user-avatar initials" style={{width:size,height:size,fontSize:size*0.38}}>{initials}</div>
}
