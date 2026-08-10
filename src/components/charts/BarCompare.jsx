export function BarCompare({income,expense}){
  const max=Math.max(income,expense,1)
  return(
    <div className="bar-compare">
      <div className="bar-compare-col">
        <div className="bar-compare-track">
          <div className="bar-compare-bar income" style={{height:`${(income/max)*100}%`}}/>
        </div>
        <span className="bar-compare-label">Income</span>
      </div>
      <div className="bar-compare-col">
        <div className="bar-compare-track">
          <div className="bar-compare-bar expense" style={{height:`${(expense/max)*100}%`}}/>
        </div>
        <span className="bar-compare-label">Expense</span>
      </div>
    </div>
  )
}
