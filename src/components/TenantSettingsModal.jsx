/* ──────────────────── TenantSettingsModal.jsx ──────────────────── */
import { useState, useEffect, useMemo } from 'react'

const companyAccentColors = [
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

export default function TenantSettingsModal({ onClose, session, initialTab, inline = false }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'brand') // 'brand' | 'agent' | 'crm' | 'agenda' | 'documents' | 'integrations' | 'finance'
  
  // Settings State
  const [name, setName] = useState('Minha Empresa')
  const [logoUrl, setLogoUrl] = useState('')
  const [accentColor, setAccentColor] = useState('pink')
  const [systemPrompt, setSystemPrompt] = useState('')
  
  // Integrations State
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)
  const [whatsappNumber, setWhatsappNumber] = useState('')

  // Document templates State
  const [templates, setTemplates] = useState([])
  const [newTemplateTitle, setNewTemplateTitle] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')
  const [docSubTab, setDocSubTab] = useState('templates') // 'templates' | 'filled'
  const [filledDocs, setFilledDocs] = useState([])
  const [viewingDoc, setViewingDoc] = useState(null)
  const [copied, setCopied] = useState(false)

  // CRM Contacts State
  const [contacts, setContacts] = useState([])
  const [crmSearch, setCrmSearch] = useState('')
  const [showContactForm, setShowContactForm] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    status: 'lead',
    notes: ''
  })

  // Finance State
  const [transactions, setTransactions] = useState([])
  const [showFinanceForm, setShowFinanceForm] = useState(false)
  const [financeForm, setFinanceForm] = useState({
    type: 'receita',
    category: 'Vendas',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    description: ''
  })

  // Margin Calculator Widget State
  const [calcCost, setCalcCost] = useState('')
  const [calcPrice, setCalcPrice] = useState('')
  const [calcTax, setCalcTax] = useState('0')

  // Agenda / Appointments State
  const [appointments, setAppointments] = useState([])
  const [showAppointmentForm, setShowAppointmentForm] = useState(false)
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    contact_id: ''
  })

  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState(null)

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  // Load Tenant Settings, CRM, and Finance on mount
  useEffect(() => {
    if (!session?.access_token) return
    loadSettings()
    loadCRM()
    loadFinance()
    loadAppointments()
    loadTemplates()
    loadFilledDocs()
  }, [session])

  async function loadSettings() {
    try {
      const res = await fetch('/api/tenant/settings', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      if (data.settings) {
        setName(data.settings.name || 'Minha Empresa')
        setLogoUrl(data.settings.logo_url || '')
        setAccentColor(data.settings.accent_color || 'pink')
        setSystemPrompt(data.settings.custom_system_prompt || '')
        setGoogleConnected(!!data.settings.google_connected)
        setWhatsappConnected(!!data.settings.whatsapp_connected)
        setWhatsappNumber(data.settings.whatsapp_api_token || '')
        
        const colorObj = companyAccentColors.find(c => c.id === data.settings.accent_color)
        if (colorObj) applyAccentColor(colorObj)
      }
    } catch {
      showToast('Configurações locais carregadas.', 'info')
    }
  }

  async function handleSaveSettings() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/tenant/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          logo_url: logoUrl,
          accent_color: accentColor,
          custom_system_prompt: systemPrompt,
          whatsapp_api_token: whatsappNumber
        })
      })

      if (!res.ok) throw new Error()
      showToast('Configurações salvas e aplicadas!')
      localStorage.setItem('amplie_accent_color', accentColor)
    } catch {
      showToast('Erro ao salvar configurações.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSelectColor(colorId) {
    setAccentColor(colorId)
    const color = companyAccentColors.find((c) => c.id === colorId)
    if (color) applyAccentColor(color)
  }

  // ======================= CRM ACTIONS =======================
  async function loadCRM() {
    try {
      const res = await fetch('/api/crm', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch {
      console.warn('Erro ao carregar contatos CRM.')
    }
  }

  async function handleContactSubmit(e) {
    e.preventDefault()
    if (!contactForm.name.trim() || !contactForm.phone.trim()) {
      showToast('Nome e telefone são obrigatórios.', 'error')
      return
    }

    try {
      const method = editingContact ? 'PUT' : 'POST'
      const endpoint = editingContact ? `/api/crm/${editingContact.id}` : '/api/crm'
      
      const res = await fetch(endpoint, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactForm)
      })

      if (!res.ok) throw new Error()
      
      showToast(editingContact ? 'Contato editado!' : 'Contato adicionado ao CRM!')
      setShowContactForm(false)
      setEditingContact(null)
      setContactForm({ name: '', email: '', phone: '', company: '', status: 'lead', notes: '' })
      loadCRM()
    } catch {
      showToast('Erro ao salvar contato no CRM.', 'error')
    }
  }

  async function handleEditContact(c) {
    setEditingContact(c)
    setContactForm({
      name: c.name,
      email: c.email || '',
      phone: c.phone,
      company: c.company || '',
      status: c.status || 'lead',
      notes: c.notes || ''
    })
    setShowContactForm(true)
  }

  async function handleDeleteContact(id) {
    if (!window.confirm('Excluir este contato permanentemente?')) return
    try {
      const res = await fetch(`/api/crm/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      showToast('Contato removido.')
      loadCRM()
    } catch {
      showToast('Erro ao remover contato.', 'error')
    }
  }

  const filteredContacts = useMemo(() => {
    return contacts.filter(c =>
      c.name.toLowerCase().includes(crmSearch.toLowerCase()) ||
      c.phone.includes(crmSearch) ||
      (c.company && c.company.toLowerCase().includes(crmSearch.toLowerCase()))
    )
  }, [contacts, crmSearch])

  // ======================= FINANCE ACTIONS =======================
  async function loadFinance() {
    try {
      const res = await fetch('/api/finance', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch {
      console.warn('Erro ao carregar transações financeiras.')
    }
  }

  async function handleFinanceSubmit(e) {
    e.preventDefault()
    if (!financeForm.amount || !financeForm.due_date) {
      showToast('Valor e data são obrigatórios.', 'error')
      return
    }

    try {
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...financeForm,
          amount: parseFloat(financeForm.amount)
        })
      })

      if (!res.ok) throw new Error()
      showToast('Transação registrada no caixa!')
      setShowFinanceForm(false)
      setFinanceForm({
        type: 'receita',
        category: 'Vendas',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        description: ''
      })
      loadFinance()
    } catch {
      showToast('Erro ao registrar transação.', 'error')
    }
  }

  const financialSummary = useMemo(() => {
    let income = 0
    let expenses = 0
    transactions.forEach(t => {
      const amt = parseFloat(t.amount)
      if (t.type === 'receita') income += amt
      else expenses += amt
    })
    const netProfit = income - expenses
    const netMargin = income > 0 ? (netProfit / income) * 100 : 0

    return { income, expenses, netProfit, netMargin }
  }, [transactions])

  const calculatedMargins = useMemo(() => {
    const cost = parseFloat(calcCost)
    const price = parseFloat(calcPrice)
    const tax = parseFloat(calcTax) || 0

    if (!cost || !price || price <= 0) return null

    const taxAmount = (price * tax) / 100
    const grossProfit = price - cost - taxAmount
    const margin = (grossProfit / price) * 100
    const markup = ((price - cost) / cost) * 100

    return { grossProfit, margin, markup }
  }, [calcCost, calcPrice, calcTax])

  // ======================= APPOINTMENTS / AGENDA ACTIONS =======================
  async function loadAppointments() {
    try {
      const res = await fetch('/api/appointments', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAppointments(data.appointments || [])
    } catch {
      console.warn('Erro ao carregar compromissos da agenda.')
    }
  }

  async function handleAppointmentSubmit(e) {
    e.preventDefault()
    if (!appointmentForm.title.trim() || !appointmentForm.start_time || !appointmentForm.end_time) {
      showToast('Título, início e fim são obrigatórios.', 'error')
      return
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(appointmentForm)
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Erro ao agendar compromisso.')
      }

      showToast('Compromisso agendado com sucesso!')
      setShowAppointmentForm(false)
      setAppointmentForm({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        contact_id: ''
      })
      loadAppointments()
    } catch (err) {
      showToast(err.message || 'Erro ao agendar compromisso.', 'error')
    }
  }

  async function handleDeleteAppointment(id) {
    if (!window.confirm('Excluir este compromisso permanentemente?')) return
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      showToast('Compromisso cancelado.')
      loadAppointments()
    } catch {
      showToast('Erro ao cancelar compromisso.', 'error')
    }
  }

  // ======================= DOCUMENT TEMPLATES ACTIONS =======================
  async function loadTemplates() {
    try {
      const res = await fetch('/api/documents/templates', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      console.warn('Erro ao carregar templates.')
    }
  }

  async function handleCreateTemplate() {
    if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
      showToast('Preencha os campos do modelo.', 'error')
      return
    }

    try {
      const res = await fetch('/api/documents/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTemplateTitle,
          raw_content: newTemplateContent
        })
      })

      if (!res.ok) throw new Error()
      
      showToast('Modelo de contrato adicionado com sucesso!')
      setNewTemplateTitle('')
      setNewTemplateContent('')
      loadTemplates()
    } catch {
      showToast('Erro ao salvar modelo de contrato.', 'error')
    }
  }

  async function handleDeleteTemplate(id) {
    if (!window.confirm('Excluir este modelo permanentemente?')) return
    try {
      const res = await fetch(`/api/documents/templates/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      showToast('Modelo de contrato removido.')
      loadTemplates()
    } catch {
      showToast('Erro ao remover modelo de contrato.', 'error')
    }
  }

  // ======================= FILLED DOCUMENTS ACTIONS =======================
  async function loadFilledDocs() {
    try {
      const res = await fetch('/api/documents/filled', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setFilledDocs(data.documents || [])
    } catch {
      console.warn('Erro ao carregar documentos preenchidos.')
    }
  }

  async function handleDeleteFilledDoc(id) {
    if (!window.confirm('Excluir este documento gerado permanentemente?')) return
    try {
      const res = await fetch(`/api/documents/filled/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) throw new Error()
      showToast('Documento gerado removido.')
      loadFilledDocs()
    } catch {
      showToast('Erro ao remover documento.', 'error')
    }
  }

  function handleCopyFilledDoc(text) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    showToast('Conteúdo copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  const renderContainer = (children) => {
    if (inline) {
      return (
        <div className="bg-[#1e1e1e] flex flex-col h-full w-full relative overflow-hidden select-none">
          {children}
        </div>
      )
    }
    return (
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#1e1e1e] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh] border border-white/5"
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    )
  }

  const isSettingsTab = useMemo(() => {
    return ['brand', 'agent', 'integrations'].includes(activeTab)
  }, [activeTab])

  const headerInfo = useMemo(() => {
    switch (activeTab) {
      case 'crm':
        return {
          title: 'CRM Contatos',
          badgeText: 'CRM Contatos',
          badgeClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
        }
      case 'agenda':
        return {
          title: 'Agenda de Compromissos',
          badgeText: 'Agenda',
          badgeClass: 'text-violet-400 bg-violet-500/10 border-violet-500/20'
        }
      case 'documents':
        return {
          title: 'Biblioteca de Entregáveis',
          badgeText: 'Biblioteca',
          badgeClass: 'text-orange-400 bg-orange-500/10 border-orange-500/20'
        }
      case 'finance':
        return {
          title: 'Gestão Financeira',
          badgeText: 'Financeiro',
          badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
        }
      default:
        return {
          title: `${name} & Agente Corporativo`,
          badgeText: 'Painel Corporativo',
          badgeClass: 'text-pink-400 bg-pink-500/10 border-pink-500/20'
        }
    }
  }, [activeTab, name])

  return renderContainer(
    <>
      {/* Header */}
      {!inline && (
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-white/5 shrink-0 bg-[#171717]">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all duration-200"
              title="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
            <h2 className="text-base font-bold text-white tracking-wide">{headerInfo.title}</h2>
          </div>
        </div>
      )}

      {/* Tabs Bar - Only visible for Settings */}
      {isSettingsTab && (
        <div className="flex border-b border-white/5 bg-[#1c1c1e] shrink-0 text-xs overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('brand')}
            style={activeTab === 'brand' ? { borderBottomColor: 'var(--accent-from)', color: 'var(--accent-from)' } : {}}
            className={`px-6 py-4 font-bold tracking-wide uppercase transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'brand' ? '' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Aparência
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            style={activeTab === 'agent' ? { borderBottomColor: 'var(--accent-from)', color: 'var(--accent-from)' } : {}}
            className={`px-6 py-4 font-bold tracking-wide uppercase transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'agent' ? '' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Diretrizes da IA
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            style={activeTab === 'integrations' ? { borderBottomColor: 'var(--accent-from)', color: 'var(--accent-from)' } : {}}
            className={`px-6 py-4 font-bold tracking-wide uppercase transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'integrations' ? '' : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            Integrações
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 bg-[#212121]">
        {toast && (
          <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-xl text-xs font-bold animate-slide-in shadow-lg shadow-emerald-500/5">
            <span>{toast.msg}</span>
          </div>
        )}

        {/* ======================= BRAND TAB ======================= */}
        {activeTab === 'brand' && (
          <div className="space-y-6 animate-fade-in max-w-2xl">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Nome da Empresa</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome comercial da corporação"
                className="w-full bg-[#2A2A2A] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Logotipo da Empresa (URL)</label>
              <input
                type="text"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="Link direto para imagem do logotipo"
                className="w-full bg-[#2A2A2A] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Paleta de Cores do Agente</label>
              <p className="text-xs text-gray-500">Cada empresa parceira tem sua cor exclusiva para links e botões.</p>
              <div className="grid grid-cols-2 gap-3 mt-1">
                {companyAccentColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => handleSelectColor(color.id)}
                    style={accentColor === color.id ? { borderColor: 'var(--accent-from)' } : {}}
                    className={`
                      flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all border text-left
                      ${accentColor === color.id
                        ? 'bg-white/5 shadow-lg shadow-[var(--accent-from)]/[0.03]'
                        : 'bg-[#2A2A2A]/40 border-transparent hover:bg-white/5 hover:border-white/5'
                      }
                    `}
                  >
                    <div
                      className="w-4.5 h-4.5 rounded-full shrink-0 shadow-md"
                      style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                    />
                    <span className="text-xs text-gray-200 font-bold">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ======================= AGENT TAB ======================= */}
        {activeTab === 'agent' && (
          <div className="space-y-4 animate-fade-in max-w-3xl">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Prompt de Sistema Personalizado</label>
              <p className="text-xs text-gray-500 mb-2 leading-relaxed">
                Defina o manual de conduta, tom de voz, regras de privacidade e especificidades do seu agente corporativo.
                A IA lerá estas diretrizes dinamicamente a cada mensagem recebida.
              </p>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={11}
                placeholder="Ex: Você é o agente de vendas da Imobiliária Casa Nova. Seja extremamente educado, foque em agendar reuniões presenciais e nunca passe estimativas de preços de condomínio sem consultar o portfólio."
                className="w-full bg-[#2A2A2A] border border-white/5 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 resize-none leading-relaxed transition-all font-mono text-xs"
              />
            </div>
          </div>
        )}

        {/* ======================= CRM TAB ======================= */}
        {activeTab === 'crm' && (
          <div className="animate-fade-in flex flex-col h-full space-y-5">
            {showContactForm ? (
              <form onSubmit={handleContactSubmit} className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-6 rounded-2xl space-y-4 shadow-xl shadow-black/10 animate-slide-in">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white">{editingContact ? 'Editar Contato' : 'Adicionar Contato no CRM'}</h3>
                  <button
                    type="button"
                    onClick={() => { setShowContactForm(false); setEditingContact(null); }}
                    style={{ color: 'var(--accent-from)' }}
                    className="hover:opacity-80 text-xs font-bold transition-all"
                  >
                    ← Voltar à lista
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Nome Completo *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Telefone *</label>
                    <input
                      type="text"
                      required
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">E-mail</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Empresa / Cargo</label>
                    <input
                      type="text"
                      value={contactForm.company}
                      onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Status do Lead</label>
                    <select
                      value={contactForm.status}
                      onChange={(e) => setContactForm({ ...contactForm, status: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10"
                    >
                      <option value="lead">Lead / Prospecto</option>
                      <option value="cliente_ativo">Cliente Ativo</option>
                      <option value="suspenso">Suspenso</option>
                      <option value="churn">Churn / Cancelado</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Notas & Histórico do Cliente</label>
                  <textarea
                    value={contactForm.notes}
                    onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                    rows={3}
                    className="w-full bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 resize-none transition-all focus:ring-1 focus:ring-[var(--accent-from)]/20"
                  />
                </div>

                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                  className="px-5 py-3 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95 hover:brightness-110 hover:-translate-y-0.5 transition-all w-fit"
                >
                  {editingContact ? 'Salvar Edição' : 'Adicionar Contato'}
                </button>
              </form>
            ) : (
              <div className="space-y-4 flex flex-col flex-1">
                {/* Search and Action */}
                <div className="flex items-center gap-3 justify-between">
                  <div className="relative max-w-xs flex-1">
                    <input
                      type="text"
                      placeholder="Pesquisar contatos..."
                      value={crmSearch}
                      onChange={(e) => setCrmSearch(e.target.value)}
                      className="bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] focus:bg-white/[0.05] rounded-xl py-2.5 px-4 text-xs text-white placeholder-gray-500 outline-none focus:border-[var(--accent-from)]/40 w-full transition-all"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowContactForm(true)}
                    style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-white font-bold rounded-xl text-xs active:scale-95 hover:shadow-lg hover:shadow-[var(--accent-from)]/25 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    <span>Novo Contato</span>
                  </button>
                </div>

                {/* Grid of contacts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto max-h-[62vh] pr-1">
                  {filteredContacts.length > 0 ? (
                    filteredContacts.map(c => (
                      <div key={c.id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-[var(--accent-from)]/20 p-5 rounded-xl flex items-start justify-between group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_35px_rgba(0,0,0,0.3)]">
                        <div className="space-y-2 truncate pr-4">
                          <div className="flex items-center gap-2.5">
                            <span className="text-sm font-bold text-white truncate">{c.name}</span>
                            <span
                              style={c.status === 'lead' ? { backgroundColor: 'rgba(var(--accent-rgb, 236,72,153), 0.1)', color: 'var(--accent-from)', borderColor: 'rgba(var(--accent-rgb, 236,72,153), 0.2)' } : {}}
                              className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-widest border ${
                                c.status === 'cliente_ativo' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                c.status === 'lead' ? '' :
                                c.status === 'suspenso' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}
                            >
                              {c.status === 'cliente_ativo' ? 'Ativo' : c.status === 'lead' ? 'Lead' : c.status === 'suspenso' ? 'Suspenso' : 'Churn'}
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs text-gray-400 font-semibold">📞 {c.phone}</p>
                            {c.email && <p className="text-xs text-gray-500 truncate">✉ {c.email}</p>}
                            {c.company && <p className="text-xs text-gray-500/70 truncate font-medium">🏢 {c.company}</p>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditContact(c)}
                            className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-gray-400 hover:text-white transition-all"
                            title="Editar"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 1 1 3 3l-6.92 6.918c-.313.313-.689.544-1.107.676l-3.158 1.263a.75.75 0 0 1-.98-.98Z" />
                              <path d="M1.75 3A1.75 1.75 0 0 0 0 4.75v10.5C0 16.776.776 18 2.25 18h10.5A1.75 1.75 0 0 0 14.5 16.25V12a.75.75 0 0 0-1.5 0v4.25c0 .414-.336.75-.75.75H2.25a.75.75 0 0 1-.75-.75V4.75c0-.414.336-.75.75-.75H7a.75.75 0 0 0 0-1.5H2.25Z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteContact(c.id)}
                            className="p-2 bg-white/5 hover:bg-red-500/15 border border-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                            title="Excluir"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a.75.75 0 0 0 0 1.5h14a.75.75 0 0 0 0-1.5h-3v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 4h5v-.25a1.25 1.25 0 0 0-1.25-1.25h-2.5A1.25 1.25 0 0 0 7.5 3.75V4ZM5 6.75A.75.75 0 0 1 5.75 6h8.5a.75.75 0 0 1 .75.75v9.5A2.75 2.75 0 0 1 12.25 19h-4.5A2.75 2.75 0 0 1 5 16.25v-9.5Zm2.75 1.5a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5Zm5 .75a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75H13.5a.75.75 0 0 1-.75-.75v-6.5Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center text-gray-500 py-12 text-xs bg-white/[0.01] border border-white/5 rounded-xl">
                      Nenhum cliente cadastrado no CRM. Comece adicionando um contato!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= APPOINTMENTS / AGENDA TAB ======================= */}
        {activeTab === 'agenda' && (
          <div className="animate-fade-in flex flex-col h-full space-y-5">
            {showAppointmentForm ? (
              <form onSubmit={handleAppointmentSubmit} className="bg-white/[0.02] backdrop-blur-md border border-white/5 p-6 rounded-2xl space-y-4 shadow-xl shadow-black/10 animate-slide-in">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-bold text-white">Agendar Novo Compromisso</h3>
                  <button
                    type="button"
                    onClick={() => { setShowAppointmentForm(false); }}
                    style={{ color: 'var(--accent-from)' }}
                    className="hover:opacity-80 text-xs font-bold transition-all"
                  >
                    ← Voltar à agenda
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Título do Compromisso *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Reunião de Alinhamento"
                      value={appointmentForm.title}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Associar a Cliente CRM</label>
                    <select
                      value={appointmentForm.contact_id}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, contact_id: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10"
                    >
                      <option value="">Nenhum contato selecionado</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Início *</label>
                    <input
                      type="datetime-local"
                      required
                      value={appointmentForm.start_time}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all text-gray-200"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Término *</label>
                    <input
                      type="datetime-local"
                      required
                      value={appointmentForm.end_time}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, end_time: e.target.value })}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all text-gray-200"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Descrição / Notas do Compromisso</label>
                  <textarea
                    value={appointmentForm.description}
                    onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                    rows={3}
                    placeholder="Ex: Detalhes sobre os tópicos a serem abordados..."
                    className="w-full bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2.5 text-sm text-white outline-none focus:border-[var(--accent-from)]/40 resize-none focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                  className="px-5 py-3 text-white font-bold text-xs rounded-xl shadow-lg active:scale-95 hover:brightness-110 hover:-translate-y-0.5 transition-all w-fit"
                >
                  Salvar Compromisso
                </button>
              </form>
            ) : (
              <div className="space-y-4 flex flex-col flex-1">
                {/* Top Bar Action */}
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Compromissos Agendados</h3>
                  <button
                    type="button"
                    onClick={() => setShowAppointmentForm(true)}
                    style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-white font-bold rounded-xl text-xs active:scale-95 hover:shadow-lg hover:shadow-[var(--accent-from)]/25 hover:-translate-y-0.5 transition-all duration-300 animate-fade-in"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    <span>Novo Compromisso</span>
                  </button>
                </div>

                {/* Appointments list */}
                <div className="space-y-3.5 overflow-y-auto max-h-[62vh] pr-1">
                  {appointments.length > 0 ? (
                    appointments.map(a => {
                      const start = new Date(a.start_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                      const end = new Date(a.end_time).toLocaleString('pt-BR', { timeStyle: 'short' })
                      return (
                        <div key={a.id} className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-[var(--accent-from)]/20 p-5 rounded-xl flex items-start justify-between group transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_35px_rgba(0,0,0,0.3)]">
                          <div className="space-y-2 truncate pr-4">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span className="text-sm font-bold text-white truncate">{a.title}</span>
                              <span className="px-2.5 py-0.5 rounded text-[8px] font-extrabold bg-white/5 text-gray-300 border border-white/10 uppercase tracking-widest">
                                🕒 {start} - {end}
                              </span>
                              {a.whatsapp_reminder_sent ? (
                                <span className="px-2.5 py-0.5 rounded text-[8px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                                  WhatsApp Enviado
                                </span>
                              ) : (
                                <span className="px-2.5 py-0.5 rounded text-[8px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-widest" title={`Disparo agendado para: ${new Date(a.whatsapp_reminder_time).toLocaleString()}`}>
                                  Lembrete Agendado
                                </span>
                              )}
                            </div>
                            {a.description && <p className="text-xs text-gray-400 leading-relaxed max-w-xl whitespace-pre-wrap">{a.description}</p>}
                            {a.crm_contacts?.name && (
                              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1 font-semibold">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent-from)' }} className="w-3.5 h-3.5 shrink-0">
                                  <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" />
                                </svg>
                                Cliente: <strong className="text-gray-300 font-bold">{a.crm_contacts.name}</strong>
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => handleDeleteAppointment(a.id)}
                              className="p-2 bg-white/5 hover:bg-red-500/15 border border-white/5 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                              title="Cancelar Compromisso"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a.75.75 0 0 0 0 1.5h14a.75.75 0 0 0 0-1.5h-3v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 4h5v-.25a1.25 1.25 0 0 0-1.25-1.25h-2.5A1.25 1.25 0 0 0 7.5 3.75V4ZM5 6.75A.75.75 0 0 1 5.75 6h8.5a.75.75 0 0 1 .75.75v9.5A2.75 2.75 0 0 1 12.25 19h-4.5A2.75 2.75 0 0 1 5 16.25v-9.5Zm2.75 1.5a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5Zm5 .75a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75H13.5a.75.75 0 0 1-.75-.75v-6.5Z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="text-center text-gray-500 py-12 text-xs bg-white/[0.01] border border-white/5 rounded-xl">
                      Nenhum compromisso agendado. Adicione um novo compromisso ou deixe a IA agendar por você durante a conversa!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================= DOCUMENTS TAB ======================= */}
        {activeTab === 'documents' && (
          <div className="flex flex-col lg:flex-row gap-6 animate-fade-in h-full">
            {/* Left Column: Create and List Templates */}
            <div className="w-full lg:w-1/2 space-y-5 flex flex-col">
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 shadow-lg shrink-0">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Criar Novo Modelo de Contrato</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                    placeholder="Título do Contrato (ex: Contrato de Prestação de Serviços)"
                    className="w-full bg-[#2A2A2A] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                  />
                  <textarea
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    rows={4}
                    placeholder="Escreva o texto do contrato com tags, ex: 'Eu, {{NOME}}, comprometo-me a realizar os entregáveis pelo valor de {{VALOR}}...'"
                    className="w-full bg-[#2A2A2A] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 resize-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleCreateTemplate}
                    style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
                    className="px-4 py-2.5 rounded-xl text-white text-xs font-bold active:scale-95 hover:brightness-110 hover:-translate-y-0.5 transition-all shadow"
                  >
                    Salvar na Biblioteca
                  </button>
                </div>
              </div>

              <div className="space-y-3 flex flex-col flex-1">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Modelos na Biblioteca</h3>
                <div className="space-y-3 overflow-y-auto max-h-[35vh] pr-1">
                  {templates.length > 0 ? (
                    templates.map(t => (
                      <div key={t.id} className="bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm border border-white/5 hover:border-[var(--accent-from)]/20 p-4 rounded-xl flex items-start justify-between group transition-all duration-300">
                        <div className="space-y-1 truncate pr-4">
                          <span className="text-sm font-bold text-white truncate block">{t.title}</span>
                          <p className="text-xs text-gray-400 leading-relaxed truncate max-w-md">{t.raw_content}</p>
                          {t.variables && t.variables.length > 0 && (
                            <div className="flex gap-1.5 items-center flex-wrap mt-2">
                              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Tags Extraídas:</span>
                              {t.variables.map(v => (
                                <span
                                  key={v}
                                  style={{ backgroundColor: 'rgba(var(--accent-rgb), 0.08)', color: 'var(--accent-from)', borderColor: 'rgba(var(--accent-rgb), 0.2)' }}
                                  className="px-2 py-0.5 rounded text-[9px] font-bold border transition-colors"
                                >
                                  {v}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(t.id)}
                            className="p-1.5 bg-white/5 border border-white/5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                            title="Remover Modelo"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a.75.75 0 0 0 0 1.5h14a.75.75 0 0 0 0-1.5h-3v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 4h5v-.25a1.25 1.25 0 0 0-1.25-1.25h-2.5A1.25 1.25 0 0 0 7.5 3.75V4ZM5 6.75A.75.75 0 0 1 5.75 6h8.5a.75.75 0 0 1 .75.75v9.5A2.75 2.75 0 0 1 12.25 19h-4.5A2.75 2.75 0 0 1 5 16.25v-9.5Zm2.75 1.5a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5Zm5 .75a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75H13.5a.75.75 0 0 1-.75-.75v-6.5Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center text-xs text-gray-500">
                      Nenhum modelo customizado carregado na biblioteca ainda. A IA usará formatos padrão para gerar seus contratos.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Generated Documents Histórico */}
            <div className="w-full lg:w-1/2 space-y-3 flex flex-col">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Documentos Gerados (Histórico)</h3>
              <div className="space-y-3 overflow-y-auto max-h-[65vh] pr-1 flex-1">
                {filledDocs.length > 0 ? (
                  filledDocs.map(doc => {
                    const dateStr = new Date(doc.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                    return (
                      <div key={doc.id} className="bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-sm border border-white/5 hover:border-[var(--accent-from)]/20 p-4 rounded-xl flex items-center justify-between group transition-all duration-300">
                        <div className="space-y-1 truncate pr-4">
                          <span className="text-sm font-bold text-white truncate block">📄 {doc.title}</span>
                          <p className="text-[10px] text-gray-500 font-semibold font-mono">Gerado em: {dateStr}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setViewingDoc(doc)}
                            style={{ 
                              backgroundColor: 'rgba(var(--accent-rgb), 0.08)', 
                              borderColor: 'rgba(var(--accent-rgb), 0.2)', 
                              color: 'var(--accent-from)' 
                            }}
                            className="px-2.5 py-1.5 border rounded-lg hover:bg-[var(--accent-from)]/20 hover:text-white transition-all text-xs font-bold shadow-sm active:scale-95 duration-200"
                          >
                            Visualizar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteFilledDoc(doc.id)}
                            className="p-1.5 bg-white/5 border border-white/5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                            title="Excluir"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a.75.75 0 0 0 0 1.5h14a.75.75 0 0 0 0-1.5h-3v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 4h5v-.25a1.25 1.25 0 0 0-1.25-1.25h-2.5A1.25 1.25 0 0 0 7.5 3.75V4ZM5 6.75A.75.75 0 0 1 5.75 6h8.5a.75.75 0 0 1 .75.75v9.5A2.75 2.75 0 0 1 12.25 19h-4.5A2.75 2.75 0 0 1 5 16.25v-9.5Zm2.75 1.5a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5Zm5 .75a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75H13.5a.75.75 0 0 1-.75-.75v-6.5Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center text-xs text-gray-500">
                    Nenhum documento gerado no histórico ainda. Peça para o agente preencher um contrato!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= FINANCE TAB ======================= */}
        {activeTab === 'finance' && (
          <div className="space-y-5 animate-fade-in flex flex-col h-full">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/[0.02] border border-emerald-500/20 hover:border-emerald-500/40 p-5 rounded-2xl shadow transition-all duration-300 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] hover:-translate-y-0.5">
                <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider">Total Receitas</span>
                <h4 className="text-2xl font-bold text-emerald-400 mt-1">R$ {financialSummary.income.toFixed(2)}</h4>
              </div>
              <div className="bg-gradient-to-br from-rose-500/10 to-rose-600/[0.02] border border-rose-500/20 hover:border-rose-500/40 p-5 rounded-2xl shadow transition-all duration-300 hover:shadow-[0_8px_30px_rgba(244,63,94,0.1)] hover:-translate-y-0.5">
                <span className="text-[10px] font-bold text-rose-400/80 uppercase tracking-wider">Total Despesas</span>
                <h4 className="text-2xl font-bold text-rose-400 mt-1">R$ {financialSummary.expenses.toFixed(2)}</h4>
              </div>
              <div
                style={{ 
                  background: 'linear-gradient(135deg, rgba(var(--accent-rgb), 0.1), rgba(var(--accent-rgb), 0.02))', 
                  borderColor: 'rgba(var(--accent-rgb), 0.2)' 
                }}
                className="border p-5 rounded-2xl shadow transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(var(--accent-rgb),0.08)]"
              >
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ color: 'var(--accent-from)' }}>Margem Líquida</span>
                <h4 className={`text-2xl font-bold mt-1 ${financialSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  R$ {financialSummary.netProfit.toFixed(2)} ({financialSummary.netMargin.toFixed(1)}%)
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Simulator Widget */}
              <div className="bg-white/[0.02] border border-white/5 p-5 rounded-xl space-y-4 h-fit shadow-lg shadow-black/10">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Simulador de Margem & Markup</h4>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Preço de Custo (R$)</span>
                    <input
                      type="number"
                      value={calcCost}
                      onChange={(e) => setCalcCost(e.target.value)}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Preço de Venda (R$)</span>
                    <input
                      type="number"
                      value={calcPrice}
                      onChange={(e) => setCalcPrice(e.target.value)}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Impostos (%)</span>
                    <input
                      type="number"
                      value={calcTax}
                      onChange={(e) => setCalcTax(e.target.value)}
                      className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                    />
                  </div>
                </div>

                {calculatedMargins ? (
                  <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 text-xs space-y-2">
                    <div className="flex justify-between text-gray-400 font-semibold">
                      <span>Lucro Bruto:</span>
                      <span className="font-bold text-white">R$ {calculatedMargins.grossProfit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400 font-semibold">
                      <span>Margem de Lucro:</span>
                      <span className="font-bold text-emerald-400">{calculatedMargins.margin.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-gray-400 font-semibold">
                      <span>Markup Aplicado:</span>
                      <span className="font-bold text-blue-400">{calculatedMargins.markup.toFixed(1)}%</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-500 italic text-center py-2">Preencha custo e venda para ver a simulação.</p>
                )}
              </div>

              {/* Ledger Ledger */}
              <div className="lg:col-span-2 space-y-4">
                {showFinanceForm ? (
                  <form onSubmit={handleFinanceSubmit} className="bg-white/[0.02] border border-white/5 p-5 rounded-xl space-y-3 animate-slide-in shadow-xl shadow-black/10">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h4 className="text-xs font-bold text-white uppercase">Registrar Nova Transação</h4>
                      <button type="button" onClick={() => setShowFinanceForm(false)} style={{ color: 'var(--accent-from)' }} className="text-xs font-bold transition-all hover:opacity-80">Cancelar</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Tipo</span>
                        <select
                          value={financeForm.type}
                          onChange={(e) => setFinanceForm({ ...financeForm, type: e.target.value })}
                          className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3 py-2 text-xs text-white cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10"
                        >
                          <option value="receita">Receita / Entrada</option>
                          <option value="despesa">Despesa / Saída</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Categoria</span>
                        <input
                          type="text"
                          required
                          value={financeForm.category}
                          onChange={(e) => setFinanceForm({ ...financeForm, category: e.target.value })}
                          className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Valor (R$) *</span>
                        <input
                          type="number"
                          required
                          step="0.01"
                          value={financeForm.amount}
                          onChange={(e) => setFinanceForm({ ...financeForm, amount: e.target.value })}
                          className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Data *</span>
                        <input
                          type="date"
                          required
                          value={financeForm.due_date}
                          onChange={(e) => setFinanceForm({ ...financeForm, due_date: e.target.value })}
                          className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all text-gray-200"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Descrição / Notas</span>
                      <input
                        type="text"
                        value={financeForm.description}
                        onChange={(e) => setFinanceForm({ ...financeForm, description: e.target.value })}
                        className="bg-[#2A2A2A] border border-white/5 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[var(--accent-from)]/40 focus:ring-1 focus:ring-[var(--accent-from)]/20 transition-all"
                      />
                    </div>
                    <button type="submit" className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs hover:-translate-y-0.5 active:scale-95 transition-all shadow">
                      Salvar Transação
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3 flex flex-col h-full">
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-widest">Histórico Financeiro</h4>
                      <button
                        type="button"
                        onClick={() => setShowFinanceForm(true)}
                        className="px-3.5 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-xl text-xs active:scale-95 transition-all"
                      >
                        + Registrar Transação
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-[45vh] space-y-2.5 pr-1">
                      {transactions.length > 0 ? (
                        transactions.map(t => (
                          <div key={t.id} className="bg-white/[0.02] border border-white/5 hover:border-[var(--accent-from)]/20 p-3.5 rounded-xl flex items-center justify-between transition-all duration-200 hover:shadow-md">
                            <div className="space-y-0.5">
                              <p className="text-xs font-bold text-white">{t.category}</p>
                              <p className="text-[10px] text-gray-500 font-semibold font-mono">{t.due_date} {t.description ? `• ${t.description}` : ''}</p>
                            </div>
                            <span className={`text-xs font-extrabold ${t.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {t.type === 'receita' ? '+' : '-'} R$ {parseFloat(t.amount).toFixed(2)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-xs text-gray-500 py-8 bg-white/[0.005] border border-white/5 rounded-lg">Nenhuma transação financeira registrada.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================= INTEGRATIONS TAB ======================= */}
        {activeTab === 'integrations' && (
          <div className="space-y-5 animate-fade-in max-w-3xl">
            {/* Google Agenda */}
            <div className="p-5 bg-[#2A2A2A]/40 border border-white/5 hover:border-white/10 rounded-2xl flex items-center justify-between transition-all duration-300">
              <div className="flex flex-col gap-1 pr-4">
                <h3 className="text-sm font-bold text-white">Google Agenda (Google Calendar)</h3>
                <p className="text-xs text-gray-500 leading-relaxed">Sincroniza automaticamente compromissos agendados no CRM direto no seu calendário corporativo.</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (googleConnected) {
                    // Desconectar integração real
                    try {
                      const res = await fetch('/api/auth/google/disconnect', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${session.access_token}` }
                      })
                      if (res.ok) {
                        setGoogleConnected(false)
                        showToast('Integração com Google Agenda desativada.')
                      } else {
                        throw new Error()
                      }
                    } catch {
                      showToast('Erro ao desconectar Google Agenda.', 'error')
                    }
                  } else {
                    // Abrir popup de conexão real
                    const width = 600
                    const height = 650
                    const left = window.screenX + (window.outerWidth - width) / 2
                    const top = window.screenY + (window.outerHeight - height) / 2
                    
                    const popup = window.open(
                      `/api/auth/google?token=${session.access_token}`,
                      'Conectar Google Agenda',
                      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
                    )

                    // Monitorar o encerramento do popup para recarregar as configurações
                    const timer = setInterval(() => {
                      if (!popup || popup.closed) {
                        clearInterval(timer)
                        loadSettings() // Recarrega status real do banco
                      }
                    }, 1000)
                  }
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border active:scale-95 hover:-translate-y-0.5 duration-300 ${
                  googleConnected
                    ? 'bg-[#10b981]/10 border-[#10b981]/25 text-[#10b981]'
                    : 'bg-white/5 border-white/8 text-gray-300 hover:bg-white/10'
                }`}
              >
                {googleConnected ? '✓ Conectado' : 'Conectar Conta'}
              </button>
            </div>

            {/* WhatsApp reminders */}
            <div className="p-5 bg-[#2A2A2A]/40 border border-white/5 hover:border-white/10 rounded-2xl flex flex-col gap-4 transition-all duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-1 pr-4">
                  <h3 className="text-sm font-bold text-white">Disparos no WhatsApp (Lembretes)</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">Envia notificações e avisos de reuniões automaticamente para seus clientes no WhatsApp.</p>
                  {!whatsappConnected && (
                    <p className="text-[10px] text-amber-500/80 font-medium mt-1 leading-relaxed">
                      ⚠️ Para ativar, configure as variáveis <strong>EVOLUTION_API_URL</strong>, <strong>EVOLUTION_API_KEY</strong> e <strong>EVOLUTION_INSTANCE_NAME</strong> no arquivo <code>server/.env</code>.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (whatsappConnected) {
                      showToast('WhatsApp integrado via Evolution API com sucesso!', 'info')
                    } else {
                      showToast('Preencha as credenciais da Evolution API no seu .env para ativar.', 'warning')
                    }
                  }}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border active:scale-95 hover:-translate-y-0.5 duration-300 whitespace-nowrap ${
                    whatsappConnected
                      ? 'bg-[#10b981]/10 border-[#10b981]/25 text-[#10b981] cursor-default'
                      : 'bg-white/5 border-white/8 text-gray-400 hover:bg-white/10 cursor-pointer'
                  }`}
                >
                  {whatsappConnected ? '✓ Ativado' : 'Aguardando Configuração'}
                </button>
              </div>

              {whatsappConnected && (
                <div className="border-t border-white/5 pt-4 space-y-1.5 max-w-md animate-fade-in">
                  <label className="text-[10.5px] font-bold text-gray-400 block tracking-wide uppercase">Seu WhatsApp Receptor de Notificações (DDI+DDD+Número):</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Ex: 5562999999999"
                      className="w-full bg-[#2A2A2A] border border-white/5 focus:border-[var(--accent-from)]/40 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none transition-all duration-300"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 italic leading-relaxed">
                    *Todos os lembretes de compromissos da agenda serão disparados pelo robô diretamente para este número de WhatsApp cadastrado.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Only visible for settings tab */}
      {isSettingsTab && (
        <div className="flex items-center justify-end gap-3 px-6 py-4.5 border-t border-white/5 bg-[#1c1c1e] shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            Fechar Painel
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
            style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg active:scale-95 hover:brightness-110 hover:-translate-y-0.5 transition-all"
          >
            {isLoading ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      )}

      {/* Floating Pre-filled Document Viewer Modal */}
      {viewingDoc && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-2xl h-[75vh] flex flex-col overflow-hidden shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 shrink-0 bg-white/[0.01]">
              <div className="space-y-0.5 pr-4 truncate">
                <h3 className="text-sm font-bold text-white truncate">{viewingDoc.title}</h3>
                <p className="text-[10px] text-gray-500 font-semibold font-mono">📅 Gerado em {new Date(viewingDoc.created_at).toLocaleString()}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-300 whitespace-pre-wrap bg-black/10 select-text leading-relaxed font-mono">
              {viewingDoc.filled_content}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5 shrink-0 bg-white/[0.01]">
              <button
                type="button"
                onClick={() => handleCopyFilledDoc(viewingDoc.filled_content)}
                style={!copied ? { background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' } : {}}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  copied
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold'
                    : 'border-transparent text-white shadow'
                }`}
              >
                {copied ? '✓ Copiado!' : 'Copiar Texto'}
              </button>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/8 hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
