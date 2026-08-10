import {useAuth} from '../contexts/AuthContext.jsx'
import {useTheme} from '../contexts/ThemeContext.jsx'
export function Login(){
  const{signInWithGoogle}=useAuth()
  const{theme,toggleTheme}=useTheme()
  return(
    <div className="login-screen">
      <button type="button" className="icon-btn" style={{position:'fixed',top:20,right:20}} onClick={toggleTheme}>
        {theme==='light'?'🌙':'☀️'}
      </button>
      <div className="login-card">
        <div className="login-logo">₹</div>
        <span className="eyebrow">Personal finance, kept honest</span>
        <h1 className="login-title">FinanceFlow</h1>
        <p className="login-subtitle">Track your income, expenses and savings — privately and securely.</p>
        <button className="google-btn" onClick={signInWithGoogle}>
          <span className="google-icon">G</span>
          Continue with Google
        </button>
        <p style={{fontSize:12,color:'var(--ink-faint)',marginTop:4}}>Your data is private. Only you can see it.</p>
      </div>
    </div>
  )
}
