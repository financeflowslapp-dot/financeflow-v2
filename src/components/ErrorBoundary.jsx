import {Component} from 'react'
export class ErrorBoundary extends Component{
  constructor(props){super(props);this.state={hasError:false}}
  static getDerivedStateFromError(){return{hasError:true}}
  componentDidCatch(e,i){console.error('FinanceFlow error:',e,i)}
  render(){
    if(this.state.hasError)return(
      <div className="error-boundary">
        <div className="error-boundary-card">
          <span style={{fontSize:40}}>⚠</span>
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred. Please refresh the page.</p>
          <button className="btn btn-primary" onClick={()=>window.location.reload()}>Refresh page</button>
        </div>
      </div>
    )
    return this.props.children
  }
}
