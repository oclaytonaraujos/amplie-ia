/* ──────────────────── HelpModal.jsx ──────────────────── */
import { useState } from 'react'

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

const faqs = [
  {
    q: 'O que é o Amplie IA?',
    a: 'Amplie IA é um assistente pessoal inteligente desenvolvido para ajudar profissionais e empreendedores a criar conteúdo, planejar campanhas, analisar dados e muito mais, tudo em português e com foco no mercado brasileiro.',
  },
  {
    q: 'Como iniciar uma nova conversa?',
    a: 'Clique no botão "Nova conversa" no menu lateral esquerdo ou pressione o ícone de lápis no topo da sidebar. Cada conversa é salva automaticamente com um título gerado pela IA.',
  },
  {
    q: 'Posso enviar arquivos e imagens?',
    a: 'Sim! Clique no ícone de clipe (📎) na barra de entrada para anexar arquivos como PDFs, TXTs e imagens. O Amplie IA irá analisar o conteúdo e responder com base nele.',
  },
  {
    q: 'Como funciona o reconhecimento de voz?',
    a: 'Clique no ícone de microfone (🎤) na barra de entrada para iniciar a gravação. Quando terminar, clique em "Parar". O áudio será transcrito automaticamente e inserido no campo de texto.',
  },
  {
    q: 'Minhas conversas ficam salvas?',
    a: 'Sim, todas as conversas são salvas automaticamente na nuvem e vinculadas à sua conta. Você pode acessá-las a qualquer momento pelo menu lateral. Para apagar uma conversa, passe o mouse sobre ela e clique no ícone de lixeira.',
  },
  {
    q: 'Como buscar uma conversa antiga?',
    a: 'Clique em "Buscar conversas" no menu lateral para abrir o buscador. Digite qualquer parte do título da conversa para encontrá-la rapidamente.',
  },
  {
    q: 'O Amplie IA pode cometer erros?',
    a: 'Sim. Como qualquer sistema de IA, o Amplie IA pode gerar informações imprecisas. Sempre revise informações importantes antes de utilizá-las em decisões profissionais ou comerciais.',
  },
]

function AccordionItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="border-b border-white/5 last:border-0">
      <button
        onClick={onToggle}
        className="w-full flex items-start justify-between gap-3 py-4 text-left"
      >
        <span className="text-sm font-medium text-gray-200">{question}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-gray-500 shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <div className="pb-4 pr-8">
          <p className="text-sm text-gray-400 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}

export default function HelpModal({ onClose }) {
  const [openIndex, setOpenIndex] = useState(0)

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#171717] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Central de Ajuda</h2>
            <p className="text-sm text-gray-400 mt-0.5">Perguntas frequentes e suporte</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {/* FAQ Accordion */}
          <div className="px-6 py-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-4 pb-1">
              Perguntas Frequentes
            </p>
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                question={faq.q}
                answer={faq.a}
                isOpen={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
              />
            ))}
          </div>

          {/* Support links */}
          <div className="px-6 pb-6 pt-2">
            <div className="bg-gradient-to-br from-pink-500/10 to-rose-600/5 border border-pink-500/20 rounded-xl p-4">
              <p className="text-sm font-semibold text-white mb-1">Precisa de mais ajuda?</p>
              <p className="text-xs text-gray-400 mb-4">
                Nossa equipe está disponível para ajudar você com qualquer dúvida.
              </p>
              <div className="flex flex-col gap-2">
                <a
                  href="mailto:suporte@amplie.ai"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/8 hover:border-white/15 transition-all text-sm text-gray-300 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-pink-400 shrink-0">
                    <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                    <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                  </svg>
                  suporte@amplie.ai
                </a>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-gray-600">
              <span>Amplie IA — Assistente inteligente</span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
