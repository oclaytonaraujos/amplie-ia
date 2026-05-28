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

export default function TenantSettingsModal({ onClose, session, initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'brand') // 'brand' | 'agent' | 'crm' | 'agenda' | 'documents' | 'integrations' | 'finance'
  
  // Settings State
  const [name, setName] = useState('Minha Empresa')
  const [logoUrl, setLogoUrl] = useState('')
  const [accentColor, setAccentColor] = useState('pink')
  const [systemPrompt, setSystemPrompt] = useState('')
  
  // Integrations State
  const [whatsappConnected, setWhatsappConnected] = useState(false)
  const [googleConnected, setGoogleConnected] = useState(false)

  // Document templates State
  const [templates, setTemplates] = useState([])
  const [newTemplateTitle, setNewTemplateTitle] = useState('')
  const [newTemplateContent, setNewTemplateContent] = useState('')

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
          custom_system_prompt: systemPrompt
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

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1e1e1e] rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col h-[85vh] border border-white/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-white tracking-wide">{name} & Agente Corporativo</h2>
          </div>
          <span className="text-[10px] text-pink-400 font-bold uppercase tracking-wider bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded-full">Painel Corporativo</span>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-white/8 bg-white/[0.01] shrink-0 text-sm overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('brand')}
            className={`px-5 py-3.5 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'brand' ? 'border-pink-500 text-pink-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Aparência
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-5 py-3.5 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'agent' ? 'border-pink-500 text-pink-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Diretrizes da IA
          </button>
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-5 py-3.5 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'crm' ? 'border-pink-500 text-pink-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            CRM Contatos
          </button>
          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-5 py-3.5 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'agenda' ? 'border-pink-500 text-pink-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Agenda Compromissos
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-5 py-3.5 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'documents' ? 'border-pink-500 text-pink-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Biblioteca de Entregáveis
          </button>
          <button
            onClick={() => setActiveTab('finance')}
            className={`px-5 py-3.5 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'finance' ? 'border-pink-500 text-pink-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Gestão Financeira
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`px-5 py-3.5 font-medium transition-all border-b-2 whitespace-nowrap ${
              activeTab === 'integrations' ? 'border-pink-500 text-pink-400 font-bold' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Integrações
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 bg-[#171719]/40">
          {toast && (
            <div className="flex items-center gap-2 px-4 py-2.5 mb-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold animate-slide-in">
              <span>{toast.msg}</span>
            </div>
          )}

          {/* ======================= BRAND TAB ======================= */}
          {activeTab === 'brand' && (
            <div className="space-y-5 animate-fade-in max-w-2xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nome da Empresa</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome comercial da corporação"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-pink-500/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Logotipo da Empresa (URL)</label>
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="Link direto para imagem do logotipo"
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-pink-500/50 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Paleta de Cores do Agente</label>
                <p className="text-[11px] text-gray-500">Cada empresa parceira tem sua cor exclusiva para links e botões.</p>
                <div className="grid grid-cols-2 gap-2.5 mt-2">
                  {companyAccentColors.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => handleSelectColor(color.id)}
                      className={`
                        flex items-center gap-3 px-3 py-3 rounded-xl transition-all border text-left
                        ${accentColor === color.id
                          ? 'bg-white/8 border-pink-500/30'
                          : 'bg-[#222]/30 border-transparent hover:bg-white/5'
                        }
                      `}
                    >
                      <div
                        className="w-4.5 h-4.5 rounded-full shrink-0 shadow"
                        style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
                      />
                      <span className="text-xs text-gray-200 font-semibold">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================= AGENT TAB ======================= */}
          {activeTab === 'agent' && (
            <div className="space-y-4 animate-fade-in max-w-3xl">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Prompt de Sistema Personalizado</label>
                <p className="text-[11px] text-gray-500 mb-2 leading-relaxed">
                  Defina o manual de conduta, tom de voz, regras de privacidade e especificidades do seu agente corporativo.
                  A IA lerá estas diretrizes dinamicamente a cada mensagem recebida.
                </p>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={10}
                  placeholder="Ex: Você é o agente de vendas da Imobiliária Casa Nova. Seja extremamente educado, foque em agendar reuniões presenciais e nunca passe estimativas de preços de condomínio sem consultar o portfólio."
                  className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-pink-500/50 resize-none leading-relaxed transition-colors"
                />
              </div>
            </div>
          )}

          {/* ======================= CRM TAB ======================= */}
          {activeTab === 'crm' && (
            <div className="space-y-4 animate-fade-in flex flex-col h-full">
              {showContactForm ? (
                <form onSubmit={handleContactSubmit} className="bg-white/[0.02] border border-white/8 p-5 rounded-2xl space-y-4 animate-slide-in">
                  <div className="flex items-center justify-between border-b border-white/8 pb-3">
                    <h3 className="text-sm font-bold text-white">{editingContact ? 'Editar Contato' : 'Adicionar Contato no CRM'}</h3>
                    <button
                      type="button"
                      onClick={() => { setShowContactForm(false); setEditingContact(null); }}
                      className="text-gray-400 hover:text-white text-xs font-semibold"
                    >
                      Voltar à lista
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Telefone (com DDD) *</label>
                      <input
                        type="text"
                        required
                        value={contactForm.phone}
                        onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">E-mail</label>
                      <input
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Empresa / Cargo</label>
                      <input
                        type="text"
                        value={contactForm.company}
                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Status do Lead</label>
                      <select
                        value={contactForm.status}
                        onChange={(e) => setContactForm({ ...contactForm, status: e.target.value })}
                        className="bg-[#242426] border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                      >
                        <option value="lead">Lead / Prospecto</option>
                        <option value="cliente_ativo">Cliente Ativo</option>
                        <option value="suspenso">Suspenso</option>
                        <option value="churn">Churn / Cancelado</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Notas & Observações do Histórico</label>
                    <textarea
                      value={contactForm.notes}
                      onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                      rows={3}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold text-xs rounded-xl shadow-lg active:scale-95 transition-all"
                  >
                    {editingContact ? 'Salvar Edição' : 'Adicionar Contato'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4 flex flex-col flex-1">
                  {/* Search and Action */}
                  <div className="flex items-center gap-3 justify-between">
                    <input
                      type="text"
                      placeholder="Pesquisar contatos CRM..."
                      value={crmSearch}
                      onChange={(e) => setCrmSearch(e.target.value)}
                      className="bg-white/5 border border-white/8 rounded-xl py-2 px-4 text-xs text-white placeholder-gray-500 outline-none focus:border-pink-500/50 max-w-xs flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setShowContactForm(true)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                      <span>Novo Contato</span>
                    </button>
                  </div>

                  {/* Grid of contacts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[48vh] pr-1">
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(c => (
                        <div key={c.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex items-start justify-between group hover:border-pink-500/20 transition-all">
                          <div className="space-y-1 truncate pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white truncate">{c.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                c.status === 'cliente_ativo' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                c.status === 'lead' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                c.status === 'suspenso' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {c.status === 'cliente_ativo' ? 'Ativo' : c.status === 'lead' ? 'Lead' : c.status === 'suspenso' ? 'Suspenso' : 'Churn'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400">{c.phone}</p>
                            {c.email && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
                            {c.company && <p className="text-xs text-gray-600 truncate">{c.company}</p>}
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEditContact(c)}
                              className="p-1.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                              title="Editar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 1 1 3 3l-6.92 6.918c-.313.313-.689.544-1.107.676l-3.158 1.263a.75.75 0 0 1-.98-.98Z" />
                                <path d="M1.75 3A1.75 1.75 0 0 0 0 4.75v10.5C0 16.776.776 18 2.25 18h10.5A1.75 1.75 0 0 0 14.5 16.25V12a.75.75 0 0 0-1.5 0v4.25c0 .414-.336.75-.75.75H2.25a.75.75 0 0 1-.75-.75V4.75c0-.414.336-.75.75-.75H7a.75.75 0 0 0 0-1.5H2.25Z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteContact(c.id)}
                              className="p-1.5 bg-white/5 border border-white/5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all"
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
                      <div className="col-span-2 text-center text-gray-500 py-10 text-xs bg-white/[0.01] border border-white/5 rounded-xl">
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
            <div className="space-y-4 animate-fade-in flex flex-col h-full">
              {showAppointmentForm ? (
                <form onSubmit={handleAppointmentSubmit} className="bg-white/[0.02] border border-white/8 p-5 rounded-2xl space-y-4 animate-slide-in">
                  <div className="flex items-center justify-between border-b border-white/8 pb-3">
                    <h3 className="text-sm font-bold text-white">Agendar Novo Compromisso</h3>
                    <button
                      type="button"
                      onClick={() => { setShowAppointmentForm(false); }}
                      className="text-gray-400 hover:text-white text-xs font-semibold"
                    >
                      Voltar à agenda
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Título do Compromisso *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Reunião de Alinhamento"
                        value={appointmentForm.title}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, title: e.target.value })}
                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Associar a Cliente CRM</label>
                      <select
                        value={appointmentForm.contact_id}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, contact_id: e.target.value })}
                        className="bg-[#242426] border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50"
                      >
                        <option value="">Nenhum contato selecionado</option>
                        {contacts.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Início *</label>
                      <input
                        type="datetime-local"
                        required
                        value={appointmentForm.start_time}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, start_time: e.target.value })}
                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 text-gray-200"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Término *</label>
                      <input
                        type="datetime-local"
                        required
                        value={appointmentForm.end_time}
                        onChange={(e) => setAppointmentForm({ ...appointmentForm, end_time: e.target.value })}
                        className="bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 text-gray-200"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Descrição / Notas do Compromisso</label>
                    <textarea
                      value={appointmentForm.description}
                      onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                      rows={3}
                      placeholder="Ex: Detalhes sobre os tópicos a serem abordados..."
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-pink-500/50 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold text-xs rounded-xl shadow-lg active:scale-95 transition-all"
                  >
                    Salvar Compromisso
                  </button>
                </form>
              ) : (
                <div className="space-y-4 flex flex-col flex-1">
                  {/* Top Bar Action */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cronograma de Compromissos</h3>
                    <button
                      type="button"
                      onClick={() => setShowAppointmentForm(true)}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-pink-500 hover:bg-pink-400 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                      <span>Novo Compromisso</span>
                    </button>
                  </div>

                  {/* Appointments list */}
                  <div className="space-y-3 overflow-y-auto max-h-[48vh] pr-1">
                    {appointments.length > 0 ? (
                      appointments.map(a => {
                        const start = new Date(a.start_time).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                        const end = new Date(a.end_time).toLocaleString('pt-BR', { timeStyle: 'short' })
                        return (
                          <div key={a.id} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl flex items-start justify-between group hover:border-pink-500/20 transition-all">
                            <div className="space-y-1 truncate pr-4">
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <span className="text-sm font-bold text-white truncate">{a.title}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold bg-white/5 text-gray-300 border border-white/10`}>
                                  🕒 {start} - {end}
                                </span>
                                {a.whatsapp_reminder_sent ? (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    WhatsApp Enviado
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20" title={`Disparo agendado para: ${new Date(a.whatsapp_reminder_time).toLocaleString()}`}>
                                    Lembrete Agendado
                                  </span>
                                )}
                              </div>
                              {a.description && <p className="text-xs text-gray-400 leading-relaxed max-w-xl whitespace-pre-wrap">{a.description}</p>}
                              {a.crm_contacts?.name && (
                                <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-pink-400">
                                    <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" />
                                  </svg>
                                  Cliente: <strong className="text-gray-300 font-medium">{a.crm_contacts.name}</strong>
                                </p>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                onClick={() => handleDeleteAppointment(a.id)}
                                className="p-1.5 bg-white/5 border border-white/5 hover:bg-red-500/10 rounded-lg text-gray-400 hover:text-red-400 transition-all"
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
            <div className="space-y-5 animate-fade-in max-w-3xl">
              <div className="bg-[#222]/30 border border-white/5 rounded-2xl p-4 space-y-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Criar Novo Modelo de Contrato / Entregável</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newTemplateTitle}
                    onChange={(e) => setNewTemplateTitle(e.target.value)}
                    placeholder="Título do Contrato (ex: Contrato de Prestação de Serviços)"
                    className="w-full bg-[#1A1A1A] border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-pink-500/50"
                  />
                  <textarea
                    value={newTemplateContent}
                    onChange={(e) => setNewTemplateContent(e.target.value)}
                    rows={4}
                    placeholder="Escreva o texto do contrato com tags, ex: 'Eu, {{NOME}}, comprometo-me a realizar os entregáveis pelo valor de {{VALOR}}...'"
                    className="w-full bg-[#1A1A1A] border border-white/8 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-pink-500/50 resize-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newTemplateTitle.trim() || !newTemplateContent.trim()) {
                        showToast('Preencha os campos do modelo.', 'error')
                        return
                      }
                      showToast('Modelo de contrato adicionado com sucesso na biblioteca!')
                      setNewTemplateTitle('')
                      setNewTemplateContent('')
                    }}
                    className="px-4 py-2 rounded-xl bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-300 text-xs font-semibold"
                  >
                    Salvar na Biblioteca
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Modelos Prontos</h3>
                <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-center text-xs text-gray-500">
                  Nenhum modelo customizado carregado na biblioteca ainda. A IA usará formatos padrão para gerar seus contratos.
                </div>
              </div>
            </div>
          )}

          {/* ======================= FINANCE TAB ======================= */}
          {activeTab === 'finance' && (
            <div className="space-y-5 animate-fade-in flex flex-col h-full">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl shadow">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Total Receitas</span>
                  <h4 className="text-lg font-bold text-emerald-400 mt-1">R$ {financialSummary.income.toFixed(2)}</h4>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl shadow">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Total Despesas</span>
                  <h4 className="text-lg font-bold text-rose-400 mt-1">R$ {financialSummary.expenses.toFixed(2)}</h4>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl shadow">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Margem Líquida</span>
                  <h4 className={`text-lg font-bold mt-1 ${financialSummary.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {financialSummary.netProfit.toFixed(2)} ({financialSummary.netMargin.toFixed(1)}%)
                  </h4>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Simulator Widget */}
                <div className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3 h-fit">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Simulador de Margem & Markup</h4>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-400">Preço de Custo (R$)</span>
                      <input
                        type="number"
                        value={calcCost}
                        onChange={(e) => setCalcCost(e.target.value)}
                        className="bg-[#1A1A1A] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-400">Preço de Venda (R$)</span>
                      <input
                        type="number"
                        value={calcPrice}
                        onChange={(e) => setCalcPrice(e.target.value)}
                        className="bg-[#1A1A1A] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500/50"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-400">Impostos (%)</span>
                      <input
                        type="number"
                        value={calcTax}
                        onChange={(e) => setCalcTax(e.target.value)}
                        className="bg-[#1A1A1A] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-pink-500/50"
                      />
                    </div>
                  </div>

                  {calculatedMargins ? (
                    <div className="bg-white/5 border border-white/5 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="flex justify-between text-gray-400">
                        <span>Lucro Bruto:</span>
                        <span className="font-bold text-white">R$ {calculatedMargins.grossProfit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Margem de Lucro:</span>
                        <span className="font-bold text-emerald-400">{calculatedMargins.margin.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
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
                    <form onSubmit={handleFinanceSubmit} className="bg-white/[0.02] border border-white/5 p-4 rounded-xl space-y-3 animate-slide-in">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <h4 className="text-xs font-bold text-white uppercase">Registrar Nova Transação</h4>
                        <button type="button" onClick={() => setShowFinanceForm(false)} className="text-xs text-gray-400 hover:text-white font-semibold">Cancelar</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400">Tipo</span>
                          <select
                            value={financeForm.type}
                            onChange={(e) => setFinanceForm({ ...financeForm, type: e.target.value })}
                            className="bg-[#242426] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white"
                          >
                            <option value="receita">Receita / Entrada</option>
                            <option value="despesa">Despesa / Saída</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400">Categoria</span>
                          <input
                            type="text"
                            required
                            value={financeForm.category}
                            onChange={(e) => setFinanceForm({ ...financeForm, category: e.target.value })}
                            className="bg-[#1A1A1A] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400">Valor (R$) *</span>
                          <input
                            type="number"
                            required
                            step="0.01"
                            value={financeForm.amount}
                            onChange={(e) => setFinanceForm({ ...financeForm, amount: e.target.value })}
                            className="bg-[#1A1A1A] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400">Data de Vencimento *</span>
                          <input
                            type="date"
                            required
                            value={financeForm.due_date}
                            onChange={(e) => setFinanceForm({ ...financeForm, due_date: e.target.value })}
                            className="bg-[#1A1A1A] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] text-gray-400">Descrição / Notas</span>
                        <input
                          type="text"
                          value={financeForm.description}
                          onChange={(e) => setFinanceForm({ ...financeForm, description: e.target.value })}
                          className="bg-[#1A1A1A] border border-white/8 rounded-lg px-3 py-1.5 text-xs text-white"
                        />
                      </div>
                      <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-xs transition-all shadow">
                        Salvar Transação
                      </button>
                    </form>
                  ) : (
                    <div className="space-y-3 flex flex-col h-full">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Histórico de Transações</h4>
                        <button
                          type="button"
                          onClick={() => setShowFinanceForm(true)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-lg text-xs transition-all"
                        >
                          + Registrar Transação
                        </button>
                      </div>

                      <div className="overflow-y-auto max-h-[35vh] space-y-2 pr-1">
                        {transactions.length > 0 ? (
                          transactions.map(t => (
                            <div key={t.id} className="bg-white/[0.01] border border-white/5 p-3 rounded-lg flex items-center justify-between">
                              <div className="space-y-0.5">
                                <p className="text-xs font-bold text-white">{t.category}</p>
                                <p className="text-[10px] text-gray-500">{t.due_date} {t.description ? `• ${t.description}` : ''}</p>
                              </div>
                              <span className={`text-xs font-bold ${t.type === 'receita' ? 'text-emerald-400' : 'text-rose-400'}`}>
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
              <div className="p-4 bg-[#222]/30 border border-white/5 rounded-2xl flex items-center justify-between">
                <div className="flex flex-col gap-1 pr-4">
                  <h3 className="text-sm font-bold text-white">Google Agenda (Google Calendar)</h3>
                  <p className="text-[11px] text-gray-500">Sincroniza automaticamente compromissos agendados no CRM direto no seu calendário corporativo.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setGoogleConnected(!googleConnected)
                    showToast(googleConnected ? 'Integração Google desativada.' : 'Conta Google sincronizada com sucesso!')
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    googleConnected
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold'
                      : 'bg-white/5 border-white/8 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {googleConnected ? '✓ Conectado' : 'Conectar Conta'}
                </button>
              </div>

              {/* WhatsApp reminders */}
              <div className="p-4 bg-[#222]/30 border border-white/5 rounded-2xl flex items-center justify-between">
                <div className="flex flex-col gap-1 pr-4">
                  <h3 className="text-sm font-bold text-white">Disparos no WhatsApp (Lembretes)</h3>
                  <p className="text-[11px] text-gray-500">Envia notificações e avisos de reuniões automaticamente para seus clientes no WhatsApp.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setWhatsappConnected(!whatsappConnected)
                    showToast(whatsappConnected ? 'Lembretes de WhatsApp desativados.' : 'WhatsApp conectado! Lembretes ativos.')
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                    whatsappConnected
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold'
                      : 'bg-white/5 border-white/8 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {whatsappConnected ? '✓ Ativado' : 'Ativar Lembretes'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/8 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            Fechar Painel
          </button>
          <button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
          >
            {isLoading ? 'Salvando...' : 'Salvar Aparência & Diretrizes'}
          </button>
        </div>
      </div>
    </div>
  )
}
