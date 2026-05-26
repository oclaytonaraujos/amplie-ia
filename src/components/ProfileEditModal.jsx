/* ──────────────────── ProfileEditModal.jsx ──────────────────── */
import { useState, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ProfileEditModal({ user, onClose, onProfileUpdated }) {
  const email = user?.email || ''
  const savedName = user?.user_metadata?.full_name || email.split('@')[0] || ''
  const savedUsername = user?.user_metadata?.username || email.split('@')[0] || ''

  // Initials from display name
  function getInitials(name) {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const [displayName, setDisplayName] = useState(savedName)
  const [username, setUsername] = useState(savedUsername)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!displayName.trim()) {
      setError('O nome de exibição não pode estar vazio.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const { error: err } = await supabase.auth.updateUser({
        data: {
          full_name: displayName.trim(),
          username: username.trim(),
        },
      })
      if (err) throw err
      onProfileUpdated?.()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar perfil.')
      setSaving(false)
    }
  }

  const initials = getInitials(displayName || savedName)

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e1e] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-2">
          <h2 className="text-lg font-semibold text-white">Editar perfil</h2>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mt-5 mb-6">
          <div className="relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-teal-500 flex items-center justify-center text-white text-3xl font-bold select-none">
                {initials}
              </div>
            )}
            {/* Camera icon */}
            <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#2e2e2e] border-2 border-[#1e1e1e] flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-300">
                <path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
              </svg>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Form fields */}
        <div className="px-6 space-y-3 pb-4">
          {/* Display name */}
          <div className="bg-[#2a2a2a] rounded-xl px-4 pt-2.5 pb-3">
            <label className="block text-xs text-gray-400 mb-1">Nome de exibição</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => { setDisplayName(e.target.value); setError('') }}
              className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600"
              placeholder="Seu nome"
            />
          </div>

          {/* Username */}
          <div className="bg-[#2a2a2a] rounded-xl px-4 pt-2.5 pb-3">
            <label className="block text-xs text-gray-400 mb-1">Nome de usuário</label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError('') }}
              className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-600"
              placeholder="nome_de_usuario"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-400 px-1">{error}</p>
          )}

          {/* Helper text */}
          <p className="text-xs text-gray-500 px-1 pt-1">
            Seu perfil ajuda as pessoas a reconhecer você nas conversas em grupo.
          </p>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium text-gray-300 bg-white/5 hover:bg-white/10 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-[#3a3a3a] hover:bg-[#444] disabled:opacity-50 transition-colors"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
