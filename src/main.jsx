import React from 'react'
import ReactDOM from 'react-dom/client'
import {AuthProvider} from './contexts/AuthContext.jsx'
import {ThemeProvider} from './contexts/ThemeContext.jsx'
import {ToastProvider} from './contexts/ToastContext.jsx'
import App from './App.jsx'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <App/>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
