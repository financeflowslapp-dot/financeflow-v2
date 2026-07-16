export function Skeleton({width,height=16,radius=8,className=''}){
  return <div className={`skeleton ${className}`} style={{width:width||'100%',height,borderRadius:radius}}/>
}
export function SkeletonCard({lines=3}){
  return(
    <div className="card" style={{display:'flex',flexDirection:'column',gap:16}}>
      <Skeleton height={20} width="40%" radius={6}/>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {Array.from({length:lines}).map((_,i)=><Skeleton key={i} height={14} width={i===lines-1?'60%':'100%'}/>)}
      </div>
    </div>
  )
}
export function SkeletonList({count=4}){
  return(
    <div style={{display:'flex',flexDirection:'column',gap:14,padding:'4px 0'}}>
      {Array.from({length:count}).map((_,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:12}}>
          <Skeleton width={8} height={8} radius={999}/>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
            <Skeleton height={14} width="50%"/>
            <Skeleton height={11} width="30%"/>
          </div>
          <Skeleton height={14} width={80}/>
        </div>
      ))}
    </div>
  )
}
