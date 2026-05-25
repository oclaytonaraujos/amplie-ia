import { useState, useRef, useEffect, useCallback } from 'react'
import { MdOutlineEditNote } from "react-icons/md";
import { FiSidebar } from "react-icons/fi";
import { LuMessageCircle } from "react-icons/lu";

/* ─────────────────────────── SVG Icons ─────────────────────────── */

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 1 .7.8l-.35 5.25a.75.75 0 0 1-1.497-.1l.35-5.25a.75.75 0 0 1 .797-.7Zm3.64-.1a.75.75 0 0 1 .7.8l-.35 5.25a.75.75 0 1 1-1.497-.1l.35-5.25a.75.75 0 0 1 .797-.7Z" clipRule="evenodd" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

function SidebarToggleIcon({ collapsed }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}>
      <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
    </svg>
  )
}

function PaperclipIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.587 1.595l3.454-3.553a3 3 0 0 0 0-4.242Z" clipRule="evenodd" />
    </svg>
  )
}

function MicrophoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
      <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
    </svg>
  )
}

function StopCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M2 10a8 8 0 1 1 16 0 8 8 0 0 1-16 0Zm5-2.25A.75.75 0 0 1 7.75 7h4.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-.75.75h-4.5a.75.75 0 0 1-.75-.75v-4.5Z" clipRule="evenodd" />
    </svg>
  )
}

function XMarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
    </svg>
  )
}

function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
      <path d="M3.5 2A1.5 1.5 0 0 0 2 3.5v9A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 12.5 4H9.621a1.5 1.5 0 0 1-1.06-.44L7.439 2.44A1.5 1.5 0 0 0 6.379 2H3.5Z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  )
}

/* ────────────────────────── Avatar Component ───────────────────── */

function AvatarLogo({ size = 'sm' }) {
  const sizeClasses = size === 'lg' ? 'w-14 h-14' : 'w-8 h-8'
  const imgPadding = size === 'lg' ? 'p-2' : 'p-1'
  return (
    <div className={`${sizeClasses} rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center flex-shrink-0 ${imgPadding}`}>
      <img src="/logo.png" alt="Amplie IA" className="w-full h-full object-contain" />
    </div>
  )
}

/* ────────────────────────── Sub-Components ─────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 message-appear">
      <AvatarLogo />
      <div className="flex items-center gap-1.5 pt-2.5">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}

function MessageBubble({ role, content }) {
  if (role === 'user') {
    // Parse normal files
    const fileRegex = /\[FILE_ATTACHMENT:(.*?)\]\n([\s\S]*?)\n\[\/FILE_ATTACHMENT\]/g
    const files = []
    let match

    while ((match = fileRegex.exec(content)) !== null) {
      files.push({ name: match[1], content: match[2] })
    }

    // Parse images
    const imageRegex = /\[IMAGE_ATTACHMENT:(.*?)\](data:image\/.*?;base64,[A-Za-z0-9+/=]+)\[\/IMAGE_ATTACHMENT\]/g
    const images = []
    let imgMatch

    while ((imgMatch = imageRegex.exec(content)) !== null) {
      images.push({ name: imgMatch[1], base64: imgMatch[2] })
    }

    let cleanText = content.replace(fileRegex, '').replace(imageRegex, '').trim()

    return (
      <div className="flex justify-end message-appear">
        <div className="max-w-[75%] bg-chat-user px-4 py-3 rounded-2xl rounded-br-sm text-[15px] leading-relaxed flex flex-col gap-2">
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {images.map((img, i) => (
                <div key={`img-${i}`} className="relative rounded-lg overflow-hidden border border-white/10 group max-w-[200px] max-h-[200px]">
                  <img src={img.base64} alt={img.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <span className="text-xs text-white truncate">{img.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {files.map((f, i) => (
                <div key={`file-${i}`} className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-lg border border-white/5">
                  <FileIcon />
                  <span className="text-sm font-medium text-gray-200 truncate max-w-[180px]">{f.name}</span>
                </div>
              ))}
            </div>
          )}
          {cleanText && <div className="whitespace-pre-wrap">{cleanText}</div>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3 message-appear">
      <AvatarLogo />
      <div className="max-w-[75%] text-[15px] leading-relaxed pt-1 whitespace-pre-wrap">
        {content}
      </div>
    </div>
  )
}

function WelcomeScreen({ onSuggestion }) {
  const suggestions = [
    {
      label: "Criar uma legenda para Instagram",
      prompt: "Crie uma legenda para Instagram sobre: ",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/35 group-hover:text-white/50 transition-colors">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
        </svg>
      )
    },
    {
      label: "Montar um roteiro para vídeo",
      prompt: "Monte um roteiro curto para vídeo sobre: ",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/35 group-hover:text-white/50 transition-colors">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L8.029 20.621c-1.25.687-2.779-.217-2.779-1.643V5.653z" />
        </svg>
      )
    },
    {
      label: "Gerar uma campanha de tráfego pago",
      prompt: "Crie uma campanha de tráfego pago para: ",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/35 group-hover:text-white/50 transition-colors">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      )
    },
    {
      label: "Analisar uma imagem ou arquivo",
      prompt: "Analise esta imagem ou arquivo e me diga: ",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/35 group-hover:text-white/50 transition-colors">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      )
    },
    {
      label: "Criar uma proposta comercial",
      prompt: "Crie uma proposta comercial para: ",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/35 group-hover:text-white/50 transition-colors">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      )
    },
    {
      label: "Melhorar um texto ou ideia",
      prompt: "Melhore este texto ou ideia: ",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4 text-white/35 group-hover:text-white/50 transition-colors">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      )
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-4 message-appear">
      <div className="flex flex-col items-center w-full max-w-2xl -translate-y-6">
        <div className="flex flex-col items-center mb-3 opacity-70">
          <AvatarLogo size="sm" />
          <span className="text-sm font-medium text-white/50 mt-1.5 tracking-wide">Amplie IA</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-chat-text mb-8 text-center tracking-tight">
          Como posso ajudar você hoje?
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full mt-4">
          {suggestions.map((item, i) => (
            <button
              key={i}
              type="button"
            onClick={() => onSuggestion?.(item.prompt || item.label)}
            className="flex items-center text-left p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition-colors text-sm text-gray-300 group shadow-sm"
          >
            <div className="mr-3 flex-shrink-0">
              {item.icon}
            </div>
            <span className="flex-1 truncate pr-2">{item.label}</span>
            <div className="w-6 h-6 rounded bg-[#171717] border border-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
    </div>
  )
}

/* ────────────────────────── Sidebar Item ─────────────────────────── */

function SidebarItem({ icon, text, onClick, collapsed, active, dangerAction }) {
  return (
    <div className="relative group px-[14px] mb-1">
      <button
        onClick={onClick}
        className={`
          w-full flex items-center rounded-lg h-11
          transition-colors duration-200
          ${active 
            ? 'bg-white/10 text-white' 
            : 'text-gray-300 hover:bg-white/5 hover:text-white'
          }
        `}
        aria-label={collapsed ? text : undefined}
        title={collapsed ? text : undefined}
      >
        {icon && (
          <div className="w-11 h-11 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        
        <div 
          className={`
            flex items-center justify-between whitespace-nowrap overflow-hidden transition-all ease-in-out
            ${collapsed ? 'w-0 opacity-0 ml-0 duration-200 delay-0' : `w-full opacity-100 duration-300 delay-100 ${icon ? 'ml-2' : 'ml-4'}`}
          `}
        >
          <span className="text-sm truncate pr-2">{text}</span>
        </div>
      </button>

      {!collapsed && dangerAction && (
        <button
          onClick={(e) => { e.stopPropagation(); dangerAction(); }}
          className="absolute right-5 top-1/2 -translate-y-1/2 p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-opacity"
          aria-label={`Deletar ${text}`}
          title="Deletar"
        >
          <TrashIcon />
        </button>
      )}
    </div>
  )
}

/* ────────────────────────── Sidebar ────────────────────────────── */

function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, isOpen, onClose, collapsed, onToggle, onOpenSearch }) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed md:relative z-40
          h-full flex-shrink-0
          bg-[#171717] border-r border-white/5
          flex flex-col overflow-hidden
          transition-[width] duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'w-[72px]' : 'w-[280px]'}
        `}
      >
        {/* Logo + Toggle Header */}
        <div className="flex items-center h-[60px] shrink-0 px-[14px] border-b border-white/5 overflow-hidden">
          {/* Logo container que desaparece ao retrair */}
          <div 
            className={`
              flex items-center whitespace-nowrap overflow-hidden transition-all ease-in-out
              ${collapsed ? 'w-0 opacity-0 duration-200 delay-0' : 'w-[208px] opacity-100 duration-300 delay-100'}
            `}
          >
            <div className="w-11 h-11 flex items-center justify-center shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center p-1 shrink-0">
                <img src="/logo.png" alt="Amplie IA" className="w-full h-full object-contain" />
              </div>
            </div>
            <span className="text-sm font-semibold text-chat-text tracking-wide ml-1 truncate">Amplie IA</span>
          </div>

          <div className="flex items-center justify-center shrink-0">
            <button
              onClick={onToggle}
              className={`
                group relative w-11 h-11 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors text-gray-500 hover:text-gray-300 hidden md:flex shrink-0
              `}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
              title={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center p-1 absolute inset-0 m-auto transition-opacity duration-200 opacity-100 group-hover:opacity-0">
                    <img src="/logo.png" alt="Amplie IA" className="w-full h-full object-contain" />
                  </div>
                  <div className="absolute inset-0 m-auto flex items-center justify-center transition-opacity duration-200 opacity-0 group-hover:opacity-100">
                    <FiSidebar className="w-5 h-5" />
                  </div>
                </>
              ) : (
                <FiSidebar className="w-5 h-5" />
              )}
            </button>
            
            <button
              onClick={onClose}
              className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors md:hidden shrink-0"
              aria-label="Fechar menu"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* New Chat + Search Row */}
        <div className="py-3 flex flex-col">
          <SidebarItem 
            icon={<MdOutlineEditNote className="w-6 h-6" />}
            text="Nova conversa"
            onClick={onNew}
            collapsed={collapsed}
          />
          <SidebarItem 
            icon={<SearchIcon className="w-5 h-5" />}
            text="Buscar conversas"
            onClick={onOpenSearch}
            collapsed={collapsed}
          />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
          {conversations.length > 0 && (
            <div 
              className={`
                flex flex-col transition-all ease-in-out
                ${collapsed ? 'opacity-0 h-0 overflow-hidden mb-0 duration-200 delay-0' : 'opacity-100 h-auto mb-2 duration-300 delay-100'}
              `}
            >
              <div className="px-[22px] text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap mb-2 truncate">
                Recentes
              </div>
              <ul className="space-y-0">
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <SidebarItem 
                      text={conv.title}
                      onClick={() => { onSelect(conv.id); onClose(); }}
                      collapsed={collapsed}
                      active={activeId === conv.id}
                      dangerAction={() => onDelete(conv.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="h-[48px] shrink-0 border-t border-white/5 flex items-center justify-center overflow-hidden mt-auto relative">
          <span 
            className={`
              absolute text-[10px] font-medium text-gray-500 transition-opacity ease-in-out
              ${collapsed ? 'opacity-0 pointer-events-none duration-200 delay-0' : 'opacity-0 pointer-events-none duration-200 delay-0'}
            `}
          >
            v1.0
          </span>
          <span 
            className={`
              absolute text-xs font-medium text-gray-500 transition-opacity ease-in-out
              ${collapsed ? 'opacity-0 pointer-events-none duration-200 delay-0' : 'opacity-100 duration-300 delay-100'}
            `}
          >
            Amplie IA v1.0
          </span>
        </div>
      </aside>
    </>
  )
}

/* ─────────────────────────── Main App ──────────────────────────── */

export default function App() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [conversations, setConversations] = useState([])
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  /* ── Load conversations on mount ── */
  useEffect(() => {
    fetchConversations()
  }, [])

  /* Auto-scroll on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }
  }, [input])

  /* ── API Helpers ── */
  async function fetchConversations() {
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch (err) {
      console.error('Erro ao carregar conversas:', err)
    }
  }

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      const data = await res.json()
      setMessages((data.messages || []).map((m) => ({ role: m.role, content: m.content })))
      setActiveConversationId(conversationId)
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    }
  }, [])

  async function createConversation() {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nova conversa' }),
      })
      const data = await res.json()
      await fetchConversations()
      return data.conversation
    } catch (err) {
      console.error('Erro ao criar conversa:', err)
      return null
    }
  }

  async function deleteConversation(id) {
    try {
      await fetch(`/api/conversations/${id}`, { method: 'DELETE' })
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
      }
      await fetchConversations()
    } catch (err) {
      console.error('Erro ao deletar conversa:', err)
    }
  }

  function handleNewChat() {
    setActiveConversationId(null)
    setMessages([])
    setInput('')
    setAttachedFiles([])
    textareaRef.current?.focus()
  }

  function handleSelectConversation(id) {
    if (id === activeConversationId) return
    setAttachedFiles([])
    loadMessages(id)
  }

  /* ── File Upload ── */
  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.files) {
        setAttachedFiles((prev) => [...prev, ...data.files])
      }
    } catch (err) {
      console.error('Erro no upload:', err)
    }

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeFile(index) {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  /* ── Audio Recording ── */
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await transcribeAudio(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Erro ao acessar microfone:', err)
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
  }

  async function transcribeAudio(blob) {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const res = await fetch('/api/transcribe', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.text) {
        setInput((prev) => (prev ? prev + ' ' + data.text : data.text))
        textareaRef.current?.focus()
      }
    } catch (err) {
      console.error('Erro na transcrição:', err)
    } finally {
      setIsTranscribing(false)
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  /* ── Send Message ── */
  async function handleSendMessage() {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMessage = { role: 'user', content: trimmed }
    const updatedMessages = [...messages, userMessage]

    // Build message with file context if any
    let messageContent = trimmed
    if (attachedFiles.length > 0) {
      const fileContext = attachedFiles.map((f) => {
        if (f.isImage) {
          return `[IMAGE_ATTACHMENT:${f.name}]${f.content}[/IMAGE_ATTACHMENT]`
        }
        return `[FILE_ATTACHMENT:${f.name}]\n${f.content}\n[/FILE_ATTACHMENT]`
      }).join('\n\n')
      messageContent = `${fileContext}\n\n${trimmed}`
    }

    const userMessageWithFiles = { role: 'user', content: messageContent }
    const updatedMessagesForApi = [...messages, userMessageWithFiles]

    setMessages(updatedMessagesForApi)
    setInput('')
    setAttachedFiles([])
    setIsLoading(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      // Create conversation if this is the first message
      let convId = activeConversationId
      if (!convId) {
        const conv = await createConversation()
        if (!conv) throw new Error('Falha ao criar conversa')
        convId = conv.id
        setActiveConversationId(convId)
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessagesForApi, conversationId: convId }),
      })

      if (!res.ok) {
        throw new Error(`Erro do servidor: ${res.status}`)
      }

      const data = await res.json()
      setMessages((prev) => [...prev, data.message])

      // Refresh sidebar to get updated title
      await fetchConversations()
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        },
      ])
    } finally {
      setIsLoading(false)
      textareaRef.current?.focus()
    }
  }

  /* ── Keyboard handler ── */
  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  function handleSuggestionClick(text) {
    setInput(text)
    textareaRef.current?.focus()
    
    requestAnimationFrame(() => {
      const length = text.length
      textareaRef.current?.setSelectionRange?.(length, length)
    })
  }

  const canSend = (input.trim().length > 0 || attachedFiles.length > 0) && !isLoading && !isRecording

  /* ── Render ── */
  return (
    <div className="flex h-screen bg-chat-bg overflow-hidden">
      {/* Search Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setIsSearchModalOpen(false)}>
          <div className="bg-[#171717] border border-white/10 rounded-2xl w-full max-w-md p-4 shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Buscar Conversas</h2>
              <button onClick={() => setIsSearchModalOpen(false)} className="text-gray-400 hover:text-white">
                <CloseIcon />
              </button>
            </div>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                <SearchIcon />
              </div>
              <input 
                type="text" 
                placeholder="Digite para buscar..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations
                .filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      handleSelectConversation(conv.id);
                      setIsSearchModalOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-colors mb-1 text-gray-300 hover:text-white"
                  >
                    {conv.title}
                  </button>
                ))}
              {searchQuery && conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="text-center text-gray-500 py-4 text-sm">Nenhuma conversa encontrada.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={deleteConversation}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((prev) => !prev)}
        onOpenSearch={() => setIsSearchModalOpen(true)}
      />

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile menu button only */}
        <div className="md:hidden flex items-center px-3 pt-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            aria-label="Abrir menu"
          >
            <MenuIcon />
          </button>
        </div>

        {/* Messages Area */}
        <main className="flex-1 overflow-y-auto">
          {messages.length === 0 && !isLoading ? (
            <WelcomeScreen onSuggestion={handleSuggestionClick} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg, i) => (
                <MessageBubble key={i} role={msg.role} content={msg.content} />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>

        {/* Input Area */}
        <footer className="flex-shrink-0 px-4 pb-4 pt-2">
          <div className="max-w-3xl mx-auto">
            {/* Attached Files Chips */}
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2 px-1">
                {attachedFiles.map((file, i) => {
                  if (file.isImage) {
                    return (
                      <div key={i} className="relative rounded-lg overflow-hidden border border-white/10 group w-16 h-16 flex-shrink-0 shadow-sm">
                        <img src={file.content} alt={file.name} className="w-full h-full object-cover" title={file.name} />
                        <button
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                          aria-label="Remover imagem"
                        >
                          <XMarkIcon />
                        </button>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-gray-300 group shadow-sm"
                    >
                      <FileIcon />
                      <span className="truncate max-w-[150px]" title={file.name}>{file.name}</span>
                      <button
                        onClick={() => removeFile(i)}
                        className="text-gray-500 hover:text-red-400 transition-colors"
                        aria-label="Remover arquivo"
                      >
                        <XMarkIcon />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Recording Indicator */}
            {isRecording && (
              <div className="flex items-center gap-3 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm text-red-400 font-medium">Gravando...</span>
                <span className="text-sm text-red-400/70 font-mono">{formatTime(recordingTime)}</span>
                <button
                  onClick={stopRecording}
                  className="ml-auto flex items-center gap-1.5 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-red-400 text-sm transition-colors"
                >
                  <StopCircleIcon />
                  <span>Parar</span>
                </button>
              </div>
            )}

            {/* Transcribing Indicator */}
            {isTranscribing && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-pink-500/10 border border-pink-500/20 rounded-2xl">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span className="text-sm text-pink-400 ml-1">Transcrevendo áudio...</span>
              </div>
            )}

            <div className="relative flex items-end bg-[#2A2A2A] rounded-3xl border border-white/5 focus-within:border-white/15 transition-all shadow-lg min-h-[60px]">
              {/* Paperclip button */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isRecording}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center mb-1.5 ml-1.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-full transition-all disabled:opacity-30"
                aria-label="Anexar arquivo"
                title="Anexar arquivo"
              >
                <PaperclipIcon />
              </button>

              <textarea
                id="chat-input"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isRecording ? 'Gravando áudio...' : 'Envie uma mensagem...'}
                rows={1}
                disabled={isRecording}
                className="flex-1 bg-transparent text-chat-text text-[15px] placeholder-gray-500 py-4 px-2 pr-24 outline-none max-h-[200px] overflow-y-auto leading-relaxed resize-none disabled:opacity-40"
              />

              {/* Mic + Send buttons */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                {/* Microphone button */}
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isLoading || isTranscribing}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-pink-400 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    aria-label="Gravar áudio"
                    title="Gravar áudio"
                  >
                    <MicrophoneIcon />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all animate-pulse"
                    aria-label="Parar gravação"
                    title="Parar gravação"
                  >
                    <StopCircleIcon />
                  </button>
                )}

                {/* Send button */}
                <button
                  id="send-button"
                  onClick={handleSendMessage}
                  disabled={!canSend}
                  aria-label="Enviar mensagem"
                  className={`
                    w-9 h-9 rounded-full
                    flex items-center justify-center
                    transition-all duration-200
                    ${canSend
                      ? 'bg-white text-gray-900 hover:bg-gray-200 cursor-pointer scale-100'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed scale-90 opacity-40'
                    }
                  `}
                >
                  <SendIcon />
                </button>
              </div>
            </div>
            <p className="text-center text-[11px] text-gray-500 opacity-60 mt-3 select-none tracking-wide">
              A Amplie IA pode cometer erros. Confira informações importantes antes de usar.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
