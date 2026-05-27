import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { MdOutlineEditNote } from "react-icons/md";
import { FiSidebar } from "react-icons/fi";
import { LuMessageCircle } from "react-icons/lu";
import { useAuth } from './context/AuthContext.jsx'
import LoginScreen from './components/LoginScreen.jsx'
import UpgradePlanModal from './components/UpgradePlanModal.jsx'
import PersonalizationModal, { loadAccentColor } from './components/PersonalizationModal.jsx'
import ProfileEditModal from './components/ProfileEditModal.jsx'
import SettingsModal from './components/SettingsModal.jsx'
import HelpModal from './components/HelpModal.jsx'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'

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

function StopCircleIcon({ className = "w-5 h-5" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
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

/* ─────────────────── Audio Speak Button ──────────────────── */

function SpeakButton({ text }) {
  const [speaking, setSpeaking] = useState(false)
  const utteranceRef = useRef(null)

  // Strip markdown for clean TTS
  function stripMarkdown(md) {
    return md
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]*)`/g, '$1')
      .replace(/#{1,6}\s+/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/~~(.*?)~~/g, '$1')
      .replace(/>\s+/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[-*+]\s+/g, '')
      .replace(/\d+\.\s+/g, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim()
  }

  function handleSpeak() {
    if (!window.speechSynthesis) return

    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }

    const clean = stripMarkdown(text)
    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = 'pt-BR'
    utterance.rate = 1.0
    utterance.pitch = 1.0

    // Try to pick a Portuguese voice
    const voices = window.speechSynthesis.getVoices()
    const ptVoice = voices.find(v => v.lang.startsWith('pt'))
    if (ptVoice) utterance.voice = ptVoice

    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)

    utteranceRef.current = utterance
    window.speechSynthesis.speak(utterance)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (utteranceRef.current) window.speechSynthesis.cancel()
    }
  }, [])

  return (
    <button
      onClick={handleSpeak}
      title={speaking ? 'Parar áudio' : 'Ouvir resposta'}
      aria-label={speaking ? 'Parar áudio' : 'Ouvir resposta'}
      className={`
        mt-1.5 flex items-center justify-center p-1 rounded-md transition-all duration-200 bg-transparent border-0 outline-none
        ${speaking
          ? 'text-pink-400 hover:text-pink-300 scale-110 animate-pulse'
          : 'text-gray-500 hover:text-gray-300 hover:scale-105'
        }
      `}
      style={{ minWidth: '24px', minHeight: '24px' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M7 4a3 3 0 0 1 6 0v6a3 3 0 1 1-6 0V4Z" />
        <path d="M5.5 9.643a.75.75 0 0 0-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 0 0 0 1.5h4.5a.75.75 0 0 0 0-1.5h-1.5v-1.546A6.001 6.001 0 0 0 16 10v-.357a.75.75 0 0 0-1.5 0V10a4.5 4.5 0 0 1-9 0v-.357Z" />
      </svg>
    </button>
  )
}

/* ─────────────────── Copy Response Button ─────────────────── */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copiado!' : 'Copiar resposta'}
      aria-label={copied ? 'Copiado!' : 'Copiar resposta'}
      className={`
        mt-1.5 flex items-center justify-center p-1 rounded-md transition-all duration-200 bg-transparent border-0 outline-none
        ${copied
          ? 'text-green-400 scale-110'
          : 'text-gray-500 hover:text-gray-300 hover:scale-105'
        }
      `}
      style={{ minWidth: '24px', minHeight: '24px' }}
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M7 2a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H7ZM6 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4Z" />
          <path d="M3.5 6A1.5 1.5 0 0 0 2 7.5v9A2.5 2.5 0 0 0 4.5 19h7a1.5 1.5 0 0 0 1.5-1.5.75.75 0 0 0-1.5 0 1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-9A1 1 0 0 1 3.5 7.5.75.75 0 0 0 3.5 6Z" />
        </svg>
      )}
    </button>
  )
}

/* ─────────────────── Markdown to HTML Helper ───────────────── */

function markdownToHtml(md) {
  if (!md) return ''
  
  // Clear any file attachments
  let html = md
    .replace(/\[FILE_ATTACHMENT:[\s\S]*?\/FILE_ATTACHMENT\]/g, '')
    .replace(/\[IMAGE_ATTACHMENT:[\s\S]*?\/IMAGE_ATTACHMENT\]/g, '')
    .trim()

  // Convert headings
  html = html.replace(/^### (.*?)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.*?)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.*?)$/gm, '<h1>$1</h1>')

  // Convert bold and italics
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Convert blockquotes
  html = html.replace(/^>\s+(.*?)$/gm, '<blockquote style="border-left:3px solid #db2777; padding-left:10px; color:#4b5563; font-style:italic;">$1</blockquote>')

  // Convert lists (simple parser)
  html = html.replace(/^[-*+]\s+(.*?)$/gm, '<li>$1</li>')
  
  // Line-by-line paragraph and list wrapping
  const lines = html.split('\n')
  let inList = false
  let finalLines = []
  
  for (let line of lines) {
    if (line.startsWith('<li>')) {
      if (!inList) {
        finalLines.push('<ul style="margin-bottom: 10px; padding-left: 20px;">')
        inList = true
      }
      finalLines.push(line)
    } else {
      if (inList) {
        finalLines.push('</ul>')
        inList = false
      }
      const trimmed = line.trim()
      if (trimmed) {
        if (!trimmed.startsWith('<h') && !trimmed.startsWith('<pre') && !trimmed.startsWith('<block') && !trimmed.startsWith('</') && !trimmed.startsWith('<ul') && !trimmed.startsWith('<li')) {
          finalLines.push(`<p style="margin-bottom: 12px; line-height: 1.6; font-size:14px; text-align:justify;">${trimmed}</p>`)
        } else {
          finalLines.push(trimmed)
        }
      }
    }
  }
  if (inList) {
    finalLines.push('</ul>')
  }

  return finalLines.join('\n')
}

/* ─────────────────── PDF Export Button ────────────────────── */

function PdfButton({ text }) {
  const [exporting, setExporting] = useState(false)

  async function handlePdfExport() {
    if (exporting) return
    setExporting(true)
    
    const htmlContent = markdownToHtml(text)
    
    // Create temporary styled A4 div
    const tempDiv = document.createElement('div')
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    tempDiv.style.width = '750px' // A4 proportion width
    tempDiv.style.padding = '48px'
    tempDiv.style.backgroundColor = '#ffffff'
    tempDiv.style.color = '#1f2937'
    tempDiv.style.fontFamily = 'Arial, sans-serif'
    
    tempDiv.innerHTML = `
      <div style="border-bottom: 2px solid #db2777; padding-bottom: 12px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between;">
        <div>
          <h1 style="color: #db2777; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: -0.5px;">AMPLIE - IA</h1>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #6b7280;">Sua assistente inteligente pessoal</p>
        </div>
        <div style="text-align: right;">
          <p style="margin: 0; font-size: 11px; color: #6b7280; font-weight: 500;">Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          <p style="margin: 2px 0 0 0; font-size: 9px; color: #9ca3af;">Exportado via Amplie Web</p>
        </div>
      </div>
      <div style="font-size: 14px; line-height: 1.6; color: #374151;">
        ${htmlContent}
      </div>
      <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 12px; text-align: center; font-size: 10px; color: #9ca3af;">
        © ${new Date().getFullYear()} Amplie IA. Todos os direitos reservados.
      </div>
    `
    document.body.appendChild(tempDiv)

    try {
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      document.body.removeChild(tempDiv)
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = canvas.width
      const imgHeight = canvas.height
      
      const ratio = pdfWidth / imgWidth
      const finalImgHeight = imgHeight * ratio
      
      let heightLeft = finalImgHeight
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalImgHeight, undefined, 'FAST')
      heightLeft -= pdfHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - finalImgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, finalImgHeight, undefined, 'FAST')
        heightLeft -= pdfHeight
      }
      
      pdf.save(`amplie-ia-documento-${Date.now()}.pdf`)
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      if (document.body.contains(tempDiv)) {
        document.body.removeChild(tempDiv)
      }
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handlePdfExport}
      disabled={exporting}
      title={exporting ? 'Exportando...' : 'Exportar para PDF'}
      aria-label={exporting ? 'Exportando...' : 'Exportar para PDF'}
      className={`
        mt-1.5 flex items-center justify-center p-1 rounded-md transition-all duration-200 bg-transparent border-0 outline-none
        ${exporting
          ? 'text-pink-400 animate-pulse'
          : 'text-gray-500 hover:text-red-400 hover:scale-105'
        }
      `}
      style={{ minWidth: '24px', minHeight: '24px' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.379 2H4.5Zm6 1.5v3a1 1 0 0 0 1 1h3l-4-4ZM5.25 10.75a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h8a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
      </svg>
    </button>
  )
}

/* ─────────────────── Word Export Button ───────────────────── */

function WordButton({ text }) {
  const [exporting, setExporting] = useState(false)

  function handleWordExport() {
    setExporting(true)
    try {
      const htmlContent = markdownToHtml(text)
      const header = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' 
              xmlns:w='urn:schemas-microsoft-com:office:word' 
              xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <title>Documento Amplie IA</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              font-size: 11pt; 
              line-height: 1.5; 
              color: #333333; 
              margin: 1in; 
            }
            h1 { color: #db2777; font-size: 20pt; margin-top: 18pt; margin-bottom: 6pt; font-weight: bold; }
            h2 { color: #db2777; font-size: 16pt; margin-top: 14pt; margin-bottom: 6pt; font-weight: bold; }
            h3 { color: #111827; font-size: 13pt; margin-top: 12pt; margin-bottom: 4pt; font-weight: bold; }
            p { margin-bottom: 8pt; text-align: justify; }
            ul { margin-bottom: 8pt; padding-left: 20pt; }
            li { margin-bottom: 4pt; }
            blockquote { 
              border-left: 3pt solid #db2777; 
              padding-left: 10pt; 
              color: #555555; 
              font-style: italic; 
              margin: 10pt 0; 
            }
            pre { 
              background-color: #f3f4f6; 
              padding: 8pt; 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 9.5pt; 
              border-radius: 4pt; 
              margin: 8pt 0;
            }
            code { 
              background-color: #f3f4f6; 
              font-family: 'Courier New', Courier, monospace; 
              font-size: 9.5pt; 
              padding: 1pt 3pt;
            }
          </style>
        </head>
        <body>
          <div style="text-align: center; margin-bottom: 24pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 12pt;">
            <h1 style="color: #db2777; font-size: 24pt; margin: 0; font-weight: bold;">AMPLIE - IA</h1>
            <p style="font-size: 9pt; color: #6b7280; margin: 4pt 0 0 0;">Documento gerado por inteligência artificial em ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <div>
            ${htmlContent}
          </div>
        </body>
        </html>
      `
      const blob = new Blob(['\ufeff' + header], { type: 'application/msword;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `amplie-ia-documento-${Date.now()}.doc`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao gerar documento Word:', error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      onClick={handleWordExport}
      disabled={exporting}
      title={exporting ? 'Exportando...' : 'Exportar para Word'}
      aria-label={exporting ? 'Exportando...' : 'Exportar para Word'}
      className={`
        mt-1.5 flex items-center justify-center p-1 rounded-md transition-all duration-200 bg-transparent border-0 outline-none
        ${exporting
          ? 'text-pink-400 animate-pulse'
          : 'text-gray-500 hover:text-blue-400 hover:scale-105'
        }
      `}
      style={{ minWidth: '24px', minHeight: '24px' }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M4.5 2a1.5 1.5 0 0 0-1.5 1.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.379 2H4.5Zm6 1.5v3a1 1 0 0 0 1 1h3l-4-4Zm-4 6.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5H7.25a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5H7.25a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
      </svg>
    </button>
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
      <div className="max-w-[80%] text-[15px] leading-relaxed pt-1 prose-chat">
        <ReactMarkdown
          components={{
            p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            strong: ({ children }) => <strong className="font-bold text-white" style={{ textShadow: '0 0 8px rgba(255,255,255,0.35)' }}>{children}</strong>,
            em: ({ children }) => <em className="italic text-gray-400">{children}</em>,
            ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-gray-200">{children}</li>,
            code: ({ inline, children }) =>
              inline
                ? <code className="bg-white/10 rounded px-1 py-0.5 text-sm font-mono text-pink-300">{children}</code>
                : <pre className="bg-white/5 rounded-lg p-3 my-2 overflow-x-auto text-sm font-mono text-gray-200"><code>{children}</code></pre>,
            h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-2 mt-3">{children}</h1>,
            h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-2 mt-3">{children}</h2>,
            h3: ({ children }) => <h3 className="text-base font-semibold text-white mb-1 mt-2">{children}</h3>,
            blockquote: ({ children }) => <blockquote className="border-l-2 border-pink-500 pl-3 my-2 text-gray-400 italic">{children}</blockquote>,
            img: ({ src, alt }) => <GeneratedImage src={src} alt={alt} />,
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold transition-all duration-200 text-pink-300 hover:text-white"
                style={{
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(219,39,119,0.08))',
                  border: '1px solid rgba(236,72,153,0.25)',
                  textDecoration: 'none',
                  boxShadow: '0 0 8px rgba(236,72,153,0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.3), rgba(219,39,119,0.18))'
                  e.currentTarget.style.borderColor = 'rgba(236,72,153,0.5)'
                  e.currentTarget.style.boxShadow = '0 0 16px rgba(236,72,153,0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.15), rgba(219,39,119,0.08))'
                  e.currentTarget.style.borderColor = 'rgba(236,72,153,0.25)'
                  e.currentTarget.style.boxShadow = '0 0 8px rgba(236,72,153,0.1)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 opacity-60 flex-shrink-0">
                  <path d="M8.914 2.793a2.5 2.5 0 1 1 3.535 3.535l-2.5 2.5a2.5 2.5 0 0 1-3.536 0 .75.75 0 0 1 1.061-1.06 1 1 0 0 0 1.414 0l2.5-2.5a1 1 0 0 0-1.414-1.414l-.793.793a.75.75 0 1 1-1.06-1.06l.793-.794Z" />
                  <path d="M6.854 7.854a2.5 2.5 0 0 1 3.536 0 .75.75 0 0 1-1.061 1.06 1 1 0 0 0-1.414 0l-2.5 2.5a1 1 0 1 0 1.414 1.414l.793-.793a.75.75 0 1 1 1.06 1.06l-.793.794a2.5 2.5 0 0 1-3.535-3.535l2.5-2.5Z" />
                </svg>
                {children}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5 opacity-40 flex-shrink-0">
                  <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                  <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25h2.5a.75.75 0 0 0 0-1.5h-2.5A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
                </svg>
              </a>
            ),
          }}
        >
          {content}
        </ReactMarkdown>
        <div className="flex items-center gap-1.5 mt-1">
          <SpeakButton text={content} />
          <CopyButton text={content} />
          <PdfButton text={content} />
          <WordButton text={content} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────── Generated Image Component ─────────────── */

function GeneratedImage({ src, alt }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const isAiGenerated = src?.includes('pollinations.ai') || src?.includes('image.pollinations')

  async function handleDownload() {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `amplie-ia-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: open in new tab
      window.open(src, '_blank')
    }
  }

  return (
    <div className="my-3 group">
      {/* Image container */}
      <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] max-w-[480px]"
        style={{ boxShadow: '0 0 40px rgba(236, 72, 153, 0.08)' }}>

        {/* Loading skeleton */}
        {!loaded && !error && (
          <div className="w-full aspect-square bg-white/[0.04] animate-pulse flex flex-col items-center justify-center gap-3">
            <div className="flex items-end gap-1">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-1 rounded-full bg-pink-500/40"
                  style={{ height: `${12 + i * 4}px`, animation: `speakWave 0.6s ease-in-out ${i*0.1}s infinite alternate` }} />
              ))}
            </div>
            <span className="text-xs text-gray-500">Gerando imagem...</span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="w-full aspect-square flex flex-col items-center justify-center gap-2 text-gray-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 opacity-40">
              <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">Não foi possível carregar a imagem</span>
            <a href={src} target="_blank" rel="noreferrer" className="text-xs text-pink-400 hover:underline">
              Abrir link diretamente →
            </a>
          </div>
        )}

        {/* The image */}
        <img
          src={src}
          alt={alt || 'Imagem gerada pela IA'}
          className={`w-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => { setError(true); setLoaded(false) }}
          crossOrigin="anonymous"
        />

        {/* AI Badge */}
        {isAiGenerated && loaded && (
          <div className="absolute top-2.5 left-2.5">
            <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-pink-300 border border-pink-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-2.5 h-2.5">
                <path fillRule="evenodd" d="M8 1.75a.75.75 0 0 1 .692.462l1.41 3.393 3.664.293a.75.75 0 0 1 .428 1.317l-2.791 2.39.853 3.575a.75.75 0 0 1-1.12.814L8 11.716l-3.136 1.278a.75.75 0 0 1-1.12-.814l.853-3.576-2.79-2.39a.75.75 0 0 1 .427-1.316l3.663-.293L7.308 2.21A.75.75 0 0 1 8 1.75Z" clipRule="evenodd" />
              </svg>
              IA Gerada
            </span>
          </div>
        )}

        {/* Hover overlay with download */}
        {loaded && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end p-3">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-medium hover:bg-white/25 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M8.75 2.75a.75.75 0 0 0-1.5 0v5.69L5.03 6.22a.75.75 0 0 0-1.06 1.06l3.5 3.5a.75.75 0 0 0 1.06 0l3.5-3.5a.75.75 0 0 0-1.06-1.06L8.75 8.44V2.75Z" />
                <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
              </svg>
              Baixar
            </button>
          </div>
        )}
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

function Sidebar({ conversations, activeId, onSelect, onNew, onDelete, isOpen, onClose, collapsed, onToggle, onOpenSearch, onSignOut, onOpenModal, user }) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const profileMenuRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target)) {
        setProfileMenuOpen(false)
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileMenuOpen])

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'
  const initial = user?.email ? user.email[0].toUpperCase() : '?'

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

        {/* Sidebar Footer — Profile Button + Dropdown */}
        <div className="shrink-0 border-t border-white/5 mt-auto overflow-hidden" ref={profileMenuRef}>

          {/* Dropdown menu — opens upward */}
          {profileMenuOpen && (
            <div className="mx-2 mb-1 bg-[#202020] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
              {/* User header inside dropdown */}
              <div className="flex items-center gap-3 px-3 py-3 border-b border-white/8">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{displayName}</p>
                  <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-500 shrink-0">
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button onClick={() => { setProfileMenuOpen(false); onOpenModal('personalization') }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                    <path fillRule="evenodd" d="M3 4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4Zm0 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2Zm0 6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2Z" clipRule="evenodd" />
                  </svg>
                  <span>Personalização</span>
                </button>

                <button onClick={() => { setProfileMenuOpen(false); onOpenModal('profile') }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                    <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                  </svg>
                  <span>Perfil</span>
                </button>

                <button onClick={() => { setProfileMenuOpen(false); onOpenModal('settings') }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                    <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652ZM10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                  </svg>
                  <span>Configurações</span>
                </button>
              </div>

              <div className="border-t border-white/8 py-1">
                <button onClick={() => { setProfileMenuOpen(false); onOpenModal('help') }} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                  </svg>
                  <span>Ajuda</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-600 ml-auto">
                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                <button
                  onClick={() => { setProfileMenuOpen(false); onSignOut(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-gray-400">
                    <path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" />
                  </svg>
                  <span>Sair</span>
                </button>
              </div>
            </div>
          )}

          {/* Profile trigger button */}
          <div className="px-[14px] py-2">
            <button
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className={`
                w-full flex items-center rounded-lg h-11
                transition-colors duration-200
                text-gray-300 hover:bg-white/5 hover:text-white
                ${profileMenuOpen ? 'bg-white/5' : ''}
              `}
              aria-label="Perfil do usuário"
              title="Perfil do usuário"
            >
              <div className="w-11 h-11 flex items-center justify-center shrink-0">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initial}
                </div>
              </div>
              <div
                className={`
                  flex items-center gap-2 whitespace-nowrap overflow-hidden transition-all ease-in-out flex-1 min-w-0
                  ${collapsed ? 'w-0 opacity-0 ml-0 duration-200 delay-0' : 'w-full opacity-100 duration-300 delay-100 ml-2'}
                `}
              >
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="text-sm font-medium truncate max-w-[140px] leading-tight">{displayName}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

/* ─────────────────────────── Main App ──────────────────────────── */

export default function App() {
  const { session, user, loading: authLoading, signOut } = useAuth()

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
  const [activeModal, setActiveModal] = useState(null) // 'upgrade'|'personalization'|'profile'|'settings'|'help'

  // Apply saved accent color on mount
  useEffect(() => { loadAccentColor() }, [])

  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  /* ── Helper: Authorization header para o backend ── */
  function authHeaders() {
    const token = session?.access_token
    return token
      ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      : { 'Content-Type': 'application/json' }
  }

  /* ── Load conversations quando a sessão estiver disponível ── */
  useEffect(() => {
    if (session) {
      fetchConversations()
    } else {
      // Limpar estado ao deslogar
      setConversations([])
      setMessages([])
      setActiveConversationId(null)
      setInput('')
      setAttachedFiles([])
    }
  }, [session])

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

  /* ── Logout: limpa todo estado do usuário anterior ── */
  async function handleSignOut() {
    // Parar gravação se estiver ativa
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    // Limpar todo estado local sensível
    setMessages([])
    setConversations([])
    setActiveConversationId(null)
    setInput('')
    setAttachedFiles([])
    setIsRecording(false)
    setRecordingTime(0)
    setIsTranscribing(false)
    setIsSearchModalOpen(false)
    setSearchQuery('')

    await signOut()
  }

  /* ── API Helpers ── */
  async function fetchConversations() {
    try {
      const res = await fetch('/api/conversations', { headers: authHeaders() })
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch (err) {
      console.error('Erro ao carregar conversas:', err)
    }
  }

  const loadMessages = useCallback(async (conversationId) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, { headers: authHeaders() })
      if (res.status === 403) {
        console.warn('Tentativa de acesso a conversa de outro usuário bloqueada.')
        return
      }
      const data = await res.json()
      setMessages((data.messages || []).map((m) => ({ role: m.role, content: m.content })))
      setActiveConversationId(conversationId)
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err)
    }
  }, [session])

  async function createConversation() {
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: authHeaders(),
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
      await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
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
      const token = session?.access_token
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
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

      const token = session?.access_token
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      })
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
        headers: authHeaders(),
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

  /* ── Auth Guards ── */
  if (authLoading) {
    return (
      <div className="flex h-screen bg-chat-bg items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center p-2">
            <img src="/logo.png" alt="Amplie IA" className="w-full h-full object-contain" />
          </div>
          <div className="w-8 h-8 border-2 border-white/20 border-t-pink-500 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  /* ── Render (usuário autenticado) ── */
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

      {/* ── Profile-menu modals ── */}
      {activeModal === 'upgrade' && (
        <UpgradePlanModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'personalization' && (
        <PersonalizationModal onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'profile' && (
        <ProfileEditModal
          user={user}
          onClose={() => setActiveModal(null)}
          onProfileUpdated={() => { /* Supabase refreshes session automatically */ }}
        />
      )}
      {activeModal === 'settings' && (
        <SettingsModal
          onClose={() => setActiveModal(null)}
          onClearConversations={async () => {
            try {
              await Promise.all(conversations.map(c =>
                fetch(`/api/conversations/${c.id}`, { method: 'DELETE', headers: authHeaders() })
              ))
              setConversations([])
              setMessages([])
              setActiveConversationId(null)
            } catch (err) {
              console.error('Erro ao limpar conversas:', err)
            }
          }}
        />
      )}
      {activeModal === 'help' && (
        <HelpModal onClose={() => setActiveModal(null)} />
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
        onSignOut={handleSignOut}
        onOpenModal={(modal) => setActiveModal(modal)}
        user={user}
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

            {/* Recording Indicator removed and integrated below */}

            {/* Transcribing Indicator */}
            {isTranscribing && (
              <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-pink-500/10 border border-pink-500/20 rounded-2xl">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span className="text-sm text-pink-400 ml-1">Transcrevendo áudio...</span>
              </div>
            )}

            <div className={`relative flex items-end bg-[#2A2A2A] rounded-3xl border transition-all shadow-lg min-h-[60px] ${isRecording ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-white/5 focus-within:border-white/15'}`}>
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

              {isRecording ? (
                <div className="flex-1 flex items-center py-4 px-2 pr-28">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-3 shrink-0" />
                  <span className="text-red-400 font-medium text-[15px] mr-3 whitespace-nowrap">Gravando áudio...</span>
                  <span className="text-red-400/70 font-mono text-[15px]">{formatTime(recordingTime)}</span>
                </div>
              ) : null}

              <textarea
                id="chat-input"
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Envie uma mensagem..."
                rows={1}
                disabled={isRecording}
                className={`flex-1 bg-transparent text-chat-text text-[15px] placeholder-gray-500 py-4 px-2 pr-24 outline-none max-h-[200px] overflow-y-auto leading-relaxed resize-none disabled:opacity-40 ${isRecording ? 'hidden' : 'block'}`}
              />

              {/* Mic + Send buttons */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                {isRecording ? (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-1.5 h-9 px-3 mr-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-full transition-colors font-medium text-[13px]"
                    aria-label="Parar gravação"
                    title="Parar gravação"
                  >
                    <StopCircleIcon className="w-4 h-4" />
                    <span>Parar</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={startRecording}
                      disabled={isLoading || isTranscribing}
                      className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-pink-400 hover:bg-white/5 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Gravar áudio"
                      title="Gravar áudio"
                    >
                      <MicrophoneIcon />
                    </button>

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
                  </>
                )}
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
