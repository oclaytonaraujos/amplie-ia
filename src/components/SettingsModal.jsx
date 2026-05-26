/* ──────────────────── SettingsModal.jsx ──────────────────── */
import { useState } from 'react'

function Toggle({ checked, onChange }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full
        border-2 border-transparent transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-blue-500' : 'bg-white/15'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow
          transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0.5'}
        `}
      />
    </button>
  )
}

function SettingRow({ label, description, children, danger }) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-white/5 last:border-0">
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-gray-100'}`}>{label}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center">{children}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <p className="text-base font-semibold text-white mt-6 mb-1 first:mt-0">{children}</p>
  )
}

function Divider() {
  return <div className="h-px bg-white/8 my-1" />
}

export default function SettingsModal({ onClose, onClearConversations }) {
  const [markdown, setMarkdown] = useState(() => localStorage.getItem('amplie_markdown') !== 'false')
  const [autoScroll, setAutoScroll] = useState(() => localStorage.getItem('amplie_autoscroll') !== 'false')
  const [sound, setSound]         = useState(() => localStorage.getItem('amplie_sound') === 'true')
  const [customInstructions, setCustomInstructions] = useState(() => localStorage.getItem('amplie_instructions') || '')
  const [confirmClear, setConfirmClear] = useState(false)

  function save(key, value, setter) {
    setter(value)
    localStorage.setItem(key, value.toString())
  }

  function saveInstructions(val) {
    setCustomInstructions(val)
    localStorage.setItem('amplie_instructions', val)
  }

  function handleClear() {
    if (confirmClear) {
      onClearConversations?.()
      setConfirmClear(false)
      onClose()
    } else {
      setConfirmClear(true)
      setTimeout(() => setConfirmClear(false), 4000)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e1e] rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-white/8 shrink-0">
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold text-white">Configurações</h2>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* ── Geral ── */}
          <SectionTitle>Geral</SectionTitle>
          <Divider />

          <SettingRow
            label="Rolagem automática"
            description="Rolar para o final automaticamente enquanto a IA responde."
          >
            <Toggle checked={autoScroll} onChange={(v) => save('amplie_autoscroll', v, setAutoScroll)} />
          </SettingRow>

          <SettingRow
            label="Som ao receber resposta"
            description="Reproduzir um som quando a IA terminar de responder."
          >
            <Toggle checked={sound} onChange={(v) => save('amplie_sound', v, setSound)} />
          </SettingRow>

          {/* ── Respostas ── */}
          <SectionTitle>Respostas</SectionTitle>
          <Divider />

          <SettingRow
            label="Formatar em Markdown"
            description="Exibir negrito, listas, blocos de código e outros elementos nas respostas."
          >
            <Toggle checked={markdown} onChange={(v) => save('amplie_markdown', v, setMarkdown)} />
          </SettingRow>

          {/* ── Instruções personalizadas ── */}
          <SectionTitle>Instruções personalizadas</SectionTitle>
          <Divider />

          <div className="py-4 border-b border-white/5">
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Essas instruções são enviadas junto com cada mensagem para personalizar como a IA responde a você.
            </p>
            <textarea
              value={customInstructions}
              onChange={(e) => saveInstructions(e.target.value)}
              rows={3}
              placeholder="Ex: responda sempre de forma direta e objetiva."
              className="w-full bg-[#2a2a2a] border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-white/20 resize-none transition-colors"
            />
          </div>

          {/* ── Dados ── */}
          <SectionTitle>Dados</SectionTitle>
          <Divider />

          <SettingRow
            label="Limpar histórico de conversas"
            description="Remove permanentemente todas as conversas. Esta ação não pode ser desfeita."
            danger
          >
            <button
              onClick={handleClear}
              className={`
                px-4 py-1.5 rounded-lg text-sm font-medium border transition-all whitespace-nowrap
                ${confirmClear
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : 'bg-transparent border-white/15 text-gray-400 hover:border-red-500/30 hover:text-red-400'
                }
              `}
            >
              {confirmClear ? 'Confirmar?' : 'Limpar'}
            </button>
          </SettingRow>

          {/* Version */}
          <p className="text-xs text-gray-700 text-center mt-6 pb-2">Amplie IA v1.0.0</p>
        </div>
      </div>
    </div>
  )
}
