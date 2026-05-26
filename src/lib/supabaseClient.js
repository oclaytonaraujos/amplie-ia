import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '❌ VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórias. ' +
    'Crie um arquivo .env na raiz do projeto com essas variáveis.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste a sessão no localStorage automaticamente
    persistSession: true,
    // Detecta a sessão do OAuth callback na URL (hash/query)
    detectSessionInUrl: true,
    // Atualiza o token automaticamente antes de expirar
    autoRefreshToken: true,
  },
})
