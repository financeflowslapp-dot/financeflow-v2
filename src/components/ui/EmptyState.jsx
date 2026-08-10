export function EmptyState({title,description,action}){
  return(
    <div className="empty-state">
      <div className="empty-state-icon">○</div>
      <p className="empty-state-title">{title}</p>
      {description&&<p className="empty-state-desc">{description}</p>}
      {action&&<div style={{marginTop:8}}>{action}</div>}
    </div>
  )
}
