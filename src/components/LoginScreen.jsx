import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import AdminPanel from './AdminPanel'


/* ── Icons ── */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function EyeIcon({ open }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
      <path d="M10.748 13.93l2.523 2.524a10.065 10.065 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
    </svg>
  )
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
}

function AlertIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  )
}

/* ── Main Component ── */
export default function LoginScreen() {
  const [showAdmin, setShowAdmin] = useState(false)
  const [tab, setTab] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  if (showAdmin) {
    return <AdminPanel onBack={() => setShowAdmin(false)} />
  }


  /* ── Reset state when switching tabs ── */
  function switchTab(t) {
    setTab(t)
    setError(null)
    setSuccessMsg(null)
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirm(false)
  }

  /* ── Google OAuth ── */
  async function handleGoogleLogin() {
    try {
      setIsGoogleLoading(true)
      setError(null)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error) throw error
    } catch (err) {
      console.error('Erro no login com Google:', err)
      setError('Não foi possível iniciar o login com Google. Tente novamente.')
      setIsGoogleLoading(false)
    }
  }

  /* ── Email/Password Login ── */
  async function handleEmailLogin(e) {
    e.preventDefault()
    if (!email || !password) return

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      // AuthContext vai detectar a sessão automaticamente via onAuthStateChange
    } catch (err) {
      const msg = translateError(err.message)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Email/Password Sign Up ── */
  async function handleEmailSignup(e) {
    e.preventDefault()
    if (!email || !password || !confirmPassword) return

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Após confirmar o e-mail, redireciona para a app
          emailRedirectTo: window.location.origin,
        },
      })
      if (error) throw error

      setSuccessMsg(
        'Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.'
      )
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      const msg = translateError(err.message)
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Forgot Password ── */
  async function handleForgotPassword() {
    if (!email) {
      setError('Digite seu e-mail acima para redefinir a senha.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      })
      if (error) throw error
      setSuccessMsg('E-mail de redefinição de senha enviado! Verifique sua caixa de entrada.')
    } catch (err) {
      setError('Não foi possível enviar o e-mail. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  /* ── Error translation ── */
  function translateError(msg) {
    if (!msg) return 'Ocorreu um erro. Tente novamente.'
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
    if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.'
    if (msg.includes('User already registered')) return 'Este e-mail já possui uma conta. Faça login.'
    if (msg.includes('Password should be at least')) return 'A senha deve ter pelo menos 6 caracteres.'
    if (msg.includes('Unable to validate email address')) return 'E-mail inválido.'
    if (msg.includes('Email rate limit exceeded')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
    if (msg.includes('signup is disabled')) return 'Cadastro de novos usuários está desabilitado no momento.'
    return msg
  }

  const isLoginTab = tab === 'login'
  const canSubmitLogin = email.trim() && password.trim()
  const canSubmitSignup = email.trim() && password.trim() && confirmPassword.trim()

  return (
    <div className="min-h-screen bg-chat-bg flex flex-col items-center justify-center px-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-pink-600/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full bg-rose-500/5 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center p-3 shadow-2xl shadow-pink-500/20 mb-4">
            <img src="/logo.png" alt="Amplie IA" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Amplie IA</h1>
          <p className="text-sm text-gray-400 mt-1 text-center">Seu assistente pessoal inteligente!</p>
        </div>

        {/* Card */}
        <div className="bg-[#1c1c1c] border border-white/8 rounded-2xl shadow-2xl overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-white/8">
            <button
              id="tab-login"
              onClick={() => switchTab('login')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
                isLoginTab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Entrar
              {isLoginTab && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" />
              )}
            </button>
            <button
              id="tab-signup"
              onClick={() => switchTab('signup')}
              className={`flex-1 py-3.5 text-sm font-medium transition-colors relative ${
                !isLoginTab ? 'text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              Criar conta
              {!isLoginTab && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full" />
              )}
            </button>
          </div>

          <div className="p-6">
            {/* Feedback Messages */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                <AlertIcon />
                <span className="text-sm text-red-300 leading-snug">{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-5">
                <CheckIcon />
                <span className="text-sm text-emerald-300 leading-snug">{successMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={isLoginTab ? handleEmailLogin : handleEmailSignup} className="flex flex-col gap-3">
              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email-input" className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  E-mail
                </label>
                <input
                  id="email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  required
                  disabled={isLoading}
                  className="
                    w-full bg-white/5 border border-white/8 rounded-xl
                    px-4 py-3 text-sm text-white placeholder-gray-500
                    focus:outline-none focus:border-pink-500/50 focus:bg-white/8
                    transition-colors disabled:opacity-50
                  "
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password-input" className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Senha
                </label>
                <div className="relative">
                  <input
                    id="password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isLoginTab ? '••••••••' : 'Mínimo 6 caracteres'}
                    autoComplete={isLoginTab ? 'current-password' : 'new-password'}
                    required
                    disabled={isLoading}
                    className="
                      w-full bg-white/5 border border-white/8 rounded-xl
                      px-4 py-3 pr-11 text-sm text-white placeholder-gray-500
                      focus:outline-none focus:border-pink-500/50 focus:bg-white/8
                      transition-colors disabled:opacity-50
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
              </div>

              {/* Confirm Password (signup only) */}
              {!isLoginTab && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password-input" className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password-input"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                      required
                      disabled={isLoading}
                      className="
                        w-full bg-white/5 border border-white/8 rounded-xl
                        px-4 py-3 pr-11 text-sm text-white placeholder-gray-500
                        focus:outline-none focus:border-pink-500/50 focus:bg-white/8
                        transition-colors disabled:opacity-50
                      "
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                    >
                      <EyeIcon open={showConfirm} />
                    </button>
                  </div>
                  {/* Password match hint */}
                  {confirmPassword && (
                    <p className={`text-xs mt-0.5 ${password === confirmPassword ? 'text-emerald-400' : 'text-red-400'}`}>
                      {password === confirmPassword ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
                    </p>
                  )}
                </div>
              )}

              {/* Forgot password link (login only) */}
              {isLoginTab && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isLoading}
                    className="text-xs text-gray-500 hover:text-pink-400 transition-colors disabled:opacity-50"
                  >
                    Esqueci a senha
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                id={isLoginTab ? 'email-login-btn' : 'email-signup-btn'}
                type="submit"
                disabled={isLoading || isGoogleLoading || (isLoginTab ? !canSubmitLogin : !canSubmitSignup)}
                className="
                  w-full flex items-center justify-center gap-2
                  bg-gradient-to-r from-pink-500 to-rose-500
                  hover:from-pink-400 hover:to-rose-400
                  active:from-pink-600 active:to-rose-600
                  text-white font-medium text-sm
                  h-11 rounded-xl mt-1
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-pink-500/20
                "
              >
                {isLoading ? (
                  <>
                    <Spinner />
                    <span>{isLoginTab ? 'Entrando...' : 'Criando conta...'}</span>
                  </>
                ) : (
                  <span>{isLoginTab ? 'Entrar' : 'Criar conta'}</span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-gray-500 uppercase tracking-wider">ou</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            {/* Google Button */}
            <button
              id="google-login-btn"
              onClick={handleGoogleLogin}
              disabled={isLoading || isGoogleLoading}
              className="
                w-full flex items-center justify-center gap-3
                bg-white hover:bg-gray-50 active:bg-gray-100
                text-gray-900 font-medium text-sm
                h-11 rounded-xl
                transition-all duration-200
                disabled:opacity-60 disabled:cursor-not-allowed
                shadow-sm hover:shadow-md
              "
            >
              {isGoogleLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                  <span className="text-gray-500">Redirecionando...</span>
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span>Continuar com Google</span>
                </>
              )}
            </button>

            {/* Footer hint */}
            <p className="text-center text-xs text-gray-600 mt-5">
              {isLoginTab ? (
                <>Não tem conta?{' '}
                  <button onClick={() => switchTab('signup')} className="text-pink-400 hover:text-pink-300 transition-colors">
                    Crie uma aqui
                  </button>
                </>
              ) : (
                <>Já tem conta?{' '}
                  <button onClick={() => switchTab('login')} className="text-pink-400 hover:text-pink-300 transition-colors">
                    Faça login
                  </button>
                </>
              )}
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Seus dados são privados e isolados por conta.
        </p>
      </div>

      {/* Secret Admin Padlock in Bottom Right */}
      <button
        type="button"
        onClick={() => setShowAdmin(true)}
        className="fixed bottom-4 right-4 p-2.5 rounded-full bg-white/5 border border-white/5 hover:border-pink-500/30 hover:bg-white/10 hover:text-pink-400 text-gray-600 transition-all duration-300 shadow-lg hover:shadow-pink-500/5 group z-50 animate-pulse"
        aria-label="Painel Administrativo Secreto"
        title="Painel Administrativo Secreto"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 transition-transform group-hover:scale-110">
          <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  )
}
