import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

/**
 * Provê autenticação para toda a aplicação.
 * Expõe: { session, user, loading, signOut, needsPasswordReset, clearPasswordReset }
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false)

  useEffect(() => {
    // 1. Verificar sessão existente ao montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Escutar mudanças de autenticação (login, logout, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session)
        setLoading(false)

        // Quando o usuário clica no link de redefinição de senha no e-mail,
        // o Supabase emite o evento PASSWORD_RECOVERY. Marcamos o flag para
        // exibir a tela de nova senha em vez de entrar direto no chat.
        if (event === 'PASSWORD_RECOVERY') {
          setNeedsPasswordReset(true)
        }
      }
    )

    // Cleanup do listener ao desmontar
    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setNeedsPasswordReset(false)
    // O onAuthStateChange vai setar session = null automaticamente
  }

  function clearPasswordReset() {
    setNeedsPasswordReset(false)
  }

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signOut,
    needsPasswordReset,
    clearPasswordReset,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook para acessar o contexto de autenticação.
 * Uso: const { session, user, loading, signOut } = useAuth()
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  }
  return context
}
