import {createContext,useContext,useEffect,useState} from 'react'
const Ctx=createContext(null)
export function ThemeProvider({children}){
  const[theme,setTheme]=useState(()=>localStorage.getItem('ff-theme')||'light')
  useEffect(()=>{document.documentElement.setAttribute('data-theme',theme);localStorage.setItem('ff-theme',theme)},[theme])
  const toggleTheme=()=>setTheme(t=>t==='light'?'dark':'light')
  return <Ctx.Provider value={{theme,toggleTheme}}>{children}</Ctx.Provider>
}
export const useTheme=()=>useContext(Ctx)
