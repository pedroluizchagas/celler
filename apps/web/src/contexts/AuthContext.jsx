import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import supabase, { isSupabaseConfigured } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session || null)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      loading,
      loginWithMagicLink: async (email) => {
        if (!isSupabaseConfigured || !supabase) {
          throw new Error('Autenticação não configurada no ambiente local.')
        }
        const { error } = await supabase.auth.signInWithOtp({ email })
        if (error) throw error
        return true
      },
      signOut: async () => {
        if (!isSupabaseConfigured || !supabase) return
        await supabase.auth.signOut()
      },
    }),
    [session, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
