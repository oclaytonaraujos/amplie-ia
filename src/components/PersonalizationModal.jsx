/* ──────────────────── PersonalizationModal.jsx ──────────────────── */
import { useState } from 'react'

const accentColors = [
  { id: 'pink',    label: 'Rosa (padrão)', from: '#ec4899', to: '#f43f5e',  css: '236 72 153' },
  { id: 'violet',  label: 'Violeta',       from: '#8b5cf6', to: '#7c3aed',  css: '139 92 246' },
  { id: 'blue',    label: 'Azul',          from: '#3b82f6', to: '#2563eb',  css: '59 130 246' },
  { id: 'emerald', label: 'Verde',         from: '#10b981', to: '#059669',  css: '16 185 129' },
  { id: 'amber',   label: 'Âmbar',         from: '#f59e0b', to: '#d97706',  css: '245 158 11' },
  { id: 'orange',  label: 'Laranja',       from: '#f97316', to: '#ea580c',  css: '249 115 22' },
]

function applyAccentColor(color) {
  const root = document.documentElement
  root.style.setProperty('--accent-from', color.from)
  root.style.setProperty('--accent-to',   color.to)
  root.style.setProperty('--accent-rgb',  color.css)
}

export function loadAccentColor() {
  const saved = localStorage.getItem('amplie_accent_color')
  if (saved) {
    const color = accentColors.find((c) => c.id === saved)
    if (color) applyAccentColor(color)
  }
}

function Divider() {
  return <div className="h-px bg-white/8 my-1" />
}

function SectionTitle({ children }) {
  return <p className="text-base font-semibold text-white mt-6 mb-1 first:mt-0">{children}</p>
}

export default function PersonalizationModal({ onClose }) {
  const [selectedColor, setSelectedColor] = useState(
    () => localStorage.getItem('amplie_accent_color') || 'pink'
  )
  const [saved, setSaved] = useState(false)

  function handleSelect(colorId) {
    setSelectedColor(colorId)
    const color = accentColors.find((c) => c.id === colorId)
    if (color) applyAccentColor(color)
    setSaved(false)
  }

  function handleSave() {
    localStorage.setItem('amplie_accent_color', selectedColor)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const active = accentColors.find((c) => c.id === selectedColor) || accentColors[0]

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
          <h2 className="text-lg font-semibold text-white">Personalização</h2>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* Cor de ênfase */}
          <SectionTitle>Cor de ênfase</SectionTitle>
          <Divider />

          <div className="py-4 border-b border-white/5">
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Define a cor usada em botões, links e elementos interativos do app. A alteração é aplicada em tempo real.
            </p>

            {/* Color options */}
            <div className="space-y-1">
              {accentColors.map((color) => (
                <button
                  key={color.id}
                  onClick={() => handleSelect(color.id)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left
                    ${selectedColor === color.id
                      ? 'bg-white/8 border border-white/12'
                      : 'border border-transparent hover:bg-white/4'
                    }
                  `}
                >
                  {/* Color swatch */}
                  <div
                    className="w-5 h-5 rounded-full shrink-0 shadow"
                    style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                  />
                  <span className="text-sm text-gray-200 flex-1">{color.label}</span>
                  {/* Checkmark */}
                  {selectedColor === color.id && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-300 shrink-0">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <SectionTitle>Pré-visualização</SectionTitle>
          <Divider />

          <div className="py-4">
            <div className="flex items-center gap-3 bg-[#2a2a2a] rounded-xl px-4 py-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ background: `linear-gradient(135deg, ${active.from}, ${active.to})` }}
              >
                A
              </div>
              <div className="flex-1 h-2 rounded-full bg-white/10" />
              <button
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${active.from}, ${active.to})` }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-white/8 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className={`
              px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all
              ${saved
                ? 'bg-emerald-500'
                : 'bg-[#3a3a3a] hover:bg-[#444]'
              }
            `}
          >
            {saved ? '✓ Salvo' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
