import {createContext,useContext,useEffect,useState} from 'react'
import {supabase} from '../services/supabase.js'
import {profileApi} from '../services/api.js'
const Ctx=createContext(null)
export function AuthProvider({children}){
  const[session,setSession]=useState(null)
  const[loading,setLoading]=useState(true)
  const[profile,setProfile]=useState(null)
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{setSession(session);setLoading(false)})
    const{data:l}=supabase.auth.onAuthStateChange((_,s)=>setSession(s))
    return()=>l.subscription.unsubscribe()
  },[])
  useEffect(()=>{
    if(!session){setProfile(null);return}
    const m=session.user.user_metadata||{}
    const p={user_id:session.user.id,email:session.user.email,full_name:m.full_name||m.name||null,avatar_url:m.avatar_url||m.picture||null,last_seen:new Date().toISOString()}
    setProfile(p);profileApi.upsert(p)
  },[session])
  async function signInWithGoogle(){await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin}})}
  async function signOut(){await supabase.auth.signOut();setProfile(null)}
  return <Ctx.Provider value={{session,loading,profile,signInWithGoogle,signOut}}>{children}</Ctx.Provider>
}
export const useAuth=()=>useContext(Ctx)
