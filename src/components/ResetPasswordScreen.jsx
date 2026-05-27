/* ────────────────── ResetPasswordScreen.jsx ────────────────── */
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

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

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
      <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-10 h-10 text-emerald-400">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  )
}

export default function ResetPasswordScreen({ onComplete }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    if (!password || !confirmPassword) return

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
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      // Após 2 segundos, redireciona para o chat
      setTimeout(() => {
        onComplete?.()
      }, 2500)
    } catch (err) {
      if (err.message?.includes('same_password')) {
        setError('A nova senha não pode ser igual à senha atual.')
      } else if (err.message?.includes('weak_password')) {
        setError('Senha muito fraca. Use pelo menos 6 caracteres.')
      } else {
        setError(err.message || 'Erro ao atualizar a senha. Tente novamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const passwordsMatch = password && confirmPassword && password === confirmPassword
  const canSubmit = password.trim() && confirmPassword.trim() && !isLoading

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
        </div>

        {/* Card */}
        <div className="bg-[#1c1c1c] border border-white/8 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6">
            {success ? (
              /* ── Success State ── */
              <div className="flex flex-col items-center gap-4 py-6 animate-in fade-in duration-500">
                <CheckCircleIcon />
                <div className="text-center">
                  <h2 className="text-lg font-semibold text-white mb-1">Senha alterada!</h2>
                  <p className="text-sm text-gray-400">
                    Sua senha foi atualizada com sucesso. Redirecionando...
                  </p>
                </div>
                <div className="w-6 h-6 border-2 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mt-2" />
              </div>
            ) : (
              /* ── Reset Form ── */
              <>
                {/* Header icon + title */}
                <div className="flex flex-col items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <LockIcon />
                  </div>
                  <div className="text-center">
                    <h2 className="text-lg font-semibold text-white">Redefinir senha</h2>
                    <p className="text-sm text-gray-400 mt-1">
                      Digite sua nova senha abaixo
                    </p>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-5">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm text-red-300 leading-snug">{error}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                  {/* New password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="new-password-input" className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="new-password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null) }}
                        placeholder="Mínimo 6 caracteres"
                        autoComplete="new-password"
                        required
                        disabled={isLoading}
                        autoFocus
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

                  {/* Confirm new password */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="confirm-new-password-input" className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="confirm-new-password-input"
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setError(null) }}
                        placeholder="Repita a nova senha"
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
                      <p className={`text-xs mt-0.5 ${passwordsMatch ? 'text-emerald-400' : 'text-red-400'}`}>
                        {passwordsMatch ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
                      </p>
                    )}
                  </div>

                  {/* Submit button */}
                  <button
                    id="reset-password-btn"
                    type="submit"
                    disabled={!canSubmit}
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
                        <span>Atualizando...</span>
                      </>
                    ) : (
                      <span>Salvar nova senha</span>
                    )}
                  </button>
                </form>

                {/* Password requirements */}
                <div className="mt-4 px-1">
                  <p className="text-xs text-gray-500">
                    Requisitos da senha:
                  </p>
                  <ul className="mt-1 space-y-0.5">
                    <li className={`text-xs flex items-center gap-1.5 ${password.length >= 6 ? 'text-emerald-400' : 'text-gray-600'}`}>
                      <span>{password.length >= 6 ? '✓' : '○'}</span>
                      Pelo menos 6 caracteres
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Seus dados são privados e isolados por conta.
        </p>
      </div>
    </div>
  )
}
