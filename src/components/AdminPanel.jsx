import { useState, useEffect, useMemo } from 'react'

// --- MOCK INITIAL DATA ---
const INITIAL_USERS = [
  { id: 'usr-1', name: 'Clayton Araújo', email: 'clayton@amplie.com', role: 'Admin', plan: 'Ilimitado', status: 'Ativo', created_at: '2026-05-10' },
  { id: 'usr-2', name: 'Ana Souza', email: 'ana.souza@gmail.com', role: 'Usuário', plan: 'Pro', status: 'Ativo', created_at: '2026-05-18' },
  { id: 'usr-3', name: 'Bruno Mendes', email: 'bruno.m@hotmail.com', role: 'Usuário', plan: 'Gratuito', status: 'Suspenso', created_at: '2026-05-20' },
  { id: 'usr-4', name: 'Carla Dias', email: 'carla.dias@amplie-marketing.com', role: 'Suporte', plan: 'Premium', status: 'Ativo', created_at: '2026-05-22' },
  { id: 'usr-5', name: 'Daniel Silva', email: 'daniel.silva@outlook.com', role: 'Usuário', plan: 'Gratuito', status: 'Ativo', created_at: '2026-05-25' }
]

const PLAN_PRICES = {
  'Gratuito': 0,
  'Pro': 99,
  'Premium': 199,
  'Ilimitado': 499
}

const INITIAL_SETTINGS = {
  allowImageGen: true,
  allowAudioTranscribe: true,
  allowFileUpload: true,
  creativeMode: false,
  freeDailyLimit: 20,
  maxUploadSize: 25,
  aiModel: 'gemini-2.5-flash',
  systemPrompt: 'Você é a Amplie IA, a assistente virtual inteligente criada e mantida pelo Grupo Amplie Marketing — uma empresa referência em soluções de marketing digital, automação e inteligência artificial aplicada a negócios.'
}

export default function AdminPanel({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'users' | 'subscriptions' | 'resources'
  
  // States persistent in localStorage
  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('amplie_admin_users')
    return saved ? JSON.parse(saved) : INITIAL_USERS
  })

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('amplie_admin_settings')
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS
  })

  // Toasts
  const [toast, setToast] = useState(null) // { type: 'success'|'error', message: '' }

  // Modal States
  const [isUserModalOpen, setIsUserModalOpen] = useState(false)
  const [userModalMode, setUserModalMode] = useState('add') // 'add' | 'edit'
  const [editingUserId, setEditingUserId] = useState(null)
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'Usuário',
    plan: 'Gratuito',
    status: 'Ativo'
  })

  const [isSubModalOpen, setIsSubModalOpen] = useState(false)
  const [selectedSubUser, setSelectedSubUser] = useState(null)
  const [subForm, setSubForm] = useState({
    plan: 'Gratuito',
    status: 'Ativa',
    billing: 'Mensal',
    price: 0
  })

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [statusFilter, setStatusFilter] = useState('todos')

  // Save state helpers
  useEffect(() => {
    localStorage.setItem('amplie_admin_users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem('amplie_admin_settings', JSON.stringify(settings))
  }, [settings])

  // Trigger brief Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // --- STATS CALCULATIONS ---
  const stats = useMemo(() => {
    const totalUsers = users.length
    const activeSubs = users.filter(u => u.plan !== 'Gratuito' && u.status === 'Ativo').length
    const suspendedUsers = users.filter(u => u.status === 'Suspenso').length
    
    // Monthly Recurring Revenue calculation
    let mrr = 0
    users.forEach(u => {
      if (u.status === 'Ativo') {
        mrr += PLAN_PRICES[u.plan] || 0
      }
    })

    return {
      totalUsers,
      activeSubs,
      suspendedUsers,
      mrr,
      arr: mrr * 12
    }
  }, [users])

  // --- USER HANDLERS ---
  const handleOpenAddUser = () => {
    setUserForm({
      name: '',
      email: '',
      role: 'Usuário',
      plan: 'Gratuito',
      status: 'Ativo'
    })
    setUserModalMode('add')
    setIsUserModalOpen(true)
  }

  const handleOpenEditUser = (user) => {
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      plan: user.plan,
      status: user.status
    })
    setEditingUserId(user.id)
    setUserModalMode('edit')
    setIsUserModalOpen(true)
  }

  const handleSaveUser = (e) => {
    e.preventDefault()
    if (!userForm.name.trim() || !userForm.email.trim()) {
      showToast('Preencha os campos obrigatórios!', 'error')
      return
    }

    if (userModalMode === 'add') {
      const newUser = {
        id: `usr-${Date.now()}`,
        ...userForm,
        created_at: new Date().toISOString().split('T')[0]
      }
      setUsers(prev => [newUser, ...prev])
      showToast('Usuário adicionado com sucesso!')
    } else {
      setUsers(prev => prev.map(u => u.id === editingUserId ? { ...u, ...userForm } : u))
      showToast('Usuário atualizado com sucesso!')
    }
    setIsUserModalOpen(false)
  }

  const handleDeleteUser = (id) => {
    if (window.confirm('Tem certeza de que deseja excluir este usuário do sistema?')) {
      setUsers(prev => prev.filter(u => u.id !== id))
      showToast('Usuário excluído permanentemente.')
    }
  }

  const handleToggleStatus = (user) => {
    const newStatus = user.status === 'Ativo' ? 'Suspenso' : 'Ativo'
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
    showToast(`Usuário ${user.name} está agora ${newStatus.toLowerCase()}.`)
  }

  // --- SUBSCRIPTION HANDLERS ---
  const handleOpenEditSub = (user) => {
    setSelectedSubUser(user)
    setSubForm({
      plan: user.plan,
      status: user.status === 'Ativo' && user.plan !== 'Gratuito' ? 'Ativa' : 'Expirada',
      billing: 'Mensal',
      price: PLAN_PRICES[user.plan] || 0
    })
    setIsSubModalOpen(true)
  }

  const handleSaveSub = (e) => {
    e.preventDefault()
    if (!selectedSubUser) return

    setUsers(prev => prev.map(u => {
      if (u.id === selectedSubUser.id) {
        return {
          ...u,
          plan: subForm.plan,
          status: subForm.status === 'Ativa' || subForm.plan === 'Gratuito' ? 'Ativo' : 'Suspenso'
        }
      }
      return u
    }))

    showToast(`Assinatura de ${selectedSubUser.name} atualizada com sucesso!`)
    setIsSubModalOpen(false)
  }

  // Auto-adjust price inside subscription form
  useEffect(() => {
    setSubForm(prev => ({
      ...prev,
      price: PLAN_PRICES[prev.plan] || 0
    }))
  }, [subForm.plan])

  // --- SETTINGS SAVING ---
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const handleSaveSettings = () => {
    setIsSavingSettings(true)
    setTimeout(() => {
      setIsSavingSettings(false)
      showToast('Configurações de recursos e limites salvas!')
    }, 600)
  }

  // --- FILTERED USERS ---
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.email.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesRole = roleFilter === 'todos' || u.role === roleFilter
      const matchesStatus = statusFilter === 'todos' || u.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, searchQuery, roleFilter, statusFilter])

  return (
    <div className="min-h-screen bg-[#0F0F11] text-gray-100 font-sans flex overflow-hidden relative">
      {/* Ambient backgrounds */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-pink-600/5 blur-[120px] -translate-y-1/3 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-rose-500/5 blur-[100px] translate-y-1/3 -translate-x-1/3" />
      </div>

      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] flex items-center gap-3 px-4 py-3 bg-[#17171C] border border-emerald-500/20 rounded-xl shadow-2xl animate-slide-in">
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm font-medium text-white">{toast.message}</span>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 shrink-0 bg-white/[0.01] border-r border-white/5 flex flex-col z-10">
        {/* Brand header */}
        <div className="h-20 flex items-center gap-3 px-6 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center p-2 shadow-lg shadow-pink-500/20">
            <img src="/logo.png" alt="Amplie IA" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Painel Admin</h1>
            <p className="text-[10px] text-pink-400 font-semibold uppercase tracking-wider">Amplie Marketing</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 text-pink-400 shadow-md shadow-pink-500/[0.02]'
                : 'border border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M12 9a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0V9Zm-2 5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm-4.833 3h13.666A1.167 1.167 0 0 0 20 15.833V4.167A1.167 1.167 0 0 0 18.833 3H5.167A1.167 1.167 0 0 0 4 4.167v11.666A1.167 1.167 0 0 0 5.167 17Z" />
              <path fillRule="evenodd" d="M18 5H6v10h12V5Zm-13 1H2v10h12v-1H3V6Z" clipRule="evenodd" />
            </svg>
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'users'
                ? 'bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 text-pink-400 shadow-md shadow-pink-500/[0.02]'
                : 'border border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" />
            </svg>
            <span>Usuários</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 text-pink-400 shadow-md shadow-pink-500/[0.02]'
                : 'border border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0 1.5c5.247 0 9.5-4.253 9.5-9.5S15.247.5 10 .5.5 4.753.5 10s4.253 9.5 9.5 9.5Z" clipRule="evenodd" />
            </svg>
            <span>Assinaturas</span>
          </button>

          <button
            onClick={() => setActiveTab('resources')}
            className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'resources'
                ? 'bg-gradient-to-r from-pink-500/10 to-rose-500/10 border border-pink-500/20 text-pink-400 shadow-md shadow-pink-500/[0.02]'
                : 'border border-transparent text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M8.242 11.233a3.5 3.5 0 1 1 3.516 0 7.973 7.973 0 0 0 3.738 2.385.75.75 0 0 1-.418 1.441 9.473 9.473 0 0 1-9.61 0 .75.75 0 0 1-.418-1.441 7.973 7.973 0 0 0 3.738-2.385ZM10 6a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0 1.5c5.247 0 9.5-4.253 9.5-9.5S15.247.5 10 .5.5 4.753.5 10s4.253 9.5 9.5 9.5Z" clipRule="evenodd" />
            </svg>
            <span>Recursos e Limites</span>
          </button>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5 px-3 py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <span className="text-[11px] text-emerald-400 font-medium">Sistema Online • v1.1</span>
          </div>

          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 h-10 text-xs font-semibold bg-white/5 border border-white/5 hover:bg-white/10 hover:text-white rounded-xl text-gray-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            <span>Voltar ao Login</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 overflow-y-auto z-10 flex flex-col h-screen">
        {/* Navbar */}
        <header className="h-20 shrink-0 border-b border-white/5 flex items-center justify-between px-8 bg-white/[0.005]">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {activeTab === 'dashboard' && 'Visão Geral do Sistema'}
              {activeTab === 'users' && 'Gerenciamento de Usuários'}
              {activeTab === 'subscriptions' && 'Controle de Assinaturas'}
              {activeTab === 'resources' && 'Recursos & Limites Globais'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {activeTab === 'dashboard' && 'Estatísticas, tráfego de uso da API e monetização em tempo real.'}
              {activeTab === 'users' && 'Visualize, adicione, edite e suspenda usuários e seus privilégios.'}
              {activeTab === 'subscriptions' && 'Monitore a receita recorrente e ajuste os planos dos assinantes.'}
              {activeTab === 'resources' && 'Ative/desative recursos da IA e configure os parâmetros globais da API.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-gray-300 flex items-center gap-2">
              <span className="text-gray-500 font-medium">Modelo IA:</span>
              <span className="font-semibold text-pink-400 uppercase">{settings.aiModel.replace('gemini-', '')}</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 p-8 overflow-y-auto">

          {/* ================================================================= */}
          {/* TAB 1: DASHBOARD */}
          {/* ================================================================= */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Total Users */}
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 relative overflow-hidden group shadow-lg">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-pink-500/5 blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-pink-500/10 transition-colors" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Usuários Registrados</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2.5 tracking-tight">{stats.totalUsers}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 9a7 7 0 1 1 14 0H3Z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                      +12.4%
                    </span>
                    <span className="text-[11px] text-gray-600 font-medium">este mês</span>
                  </div>
                </div>

                {/* Active Subscriptions */}
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 relative overflow-hidden group shadow-lg">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-violet-500/5 blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-violet-500/10 transition-colors" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assinaturas Ativas</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2.5 tracking-tight">{stats.activeSubs}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm1-11a1 1 0 1 0-2 0v2H7a1 1 0 1 0 0 2h2v2a1 1 0 1 0 2 0v-2h2a1 1 0 1 0 0-2h-2V7Z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                      +8.2%
                    </span>
                    <span className="text-[11px] text-gray-600 font-medium">este mês</span>
                  </div>
                </div>

                {/* Monthly Recurring Revenue */}
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 relative overflow-hidden group shadow-lg">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-amber-500/5 blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Faturamento (MRR)</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2.5 tracking-tight">R$ {stats.mrr}</h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v1.618c-.314.015-.626.044-.934.086a3.75 3.75 0 0 0-3.037 4.025 3.75 3.75 0 0 0 3.037 4.026c.308.041.62.07.934.085v1.618a.75.75 0 0 0 1.5 0v-1.618c.314-.015.626-.044.934-.086a3.75 3.75 0 0 0 3.037-4.025 3.75 3.75 0 0 0-3.037-4.026a7.126 7.126 0 0 0-.934-.085V2.75Zm-1.5 3.125v4.25a2.25 2.25 0 0 1-1.619-2.125A2.25 2.25 0 0 1 9.25 5.875Zm1.5 8.25v-4.25a2.25 2.25 0 0 1 1.619 2.125A2.25 2.25 0 0 1 10.75 14.125Z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">
                      +15.7%
                    </span>
                    <span className="text-[11px] text-gray-600 font-medium">vs. mês anterior</span>
                  </div>
                </div>

                {/* API Token Limit */}
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 relative overflow-hidden group shadow-lg">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-emerald-500/5 blur-xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors" />
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Consumo da API (Tokens)</p>
                      <h3 className="text-3xl font-extrabold text-white mt-2.5 tracking-tight">4.8M <span className="text-xs font-medium text-gray-500">/ 10M</span></h3>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M12 9a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0V9Zm-2 5a1 1 0 1 1 2 0 1 1 0 0 1-2 0Zm-4.833 3h13.666A1.167 1.167 0 0 0 20 15.833V4.167A1.167 1.167 0 0 0 18.833 3H5.167A1.167 1.167 0 0 0 4 4.167v11.666A1.167 1.167 0 0 0 5.167 17Z" />
                      </svg>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-white/5 h-2 rounded-full mt-5 overflow-hidden">
                    <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-full rounded-full w-[48%]" />
                  </div>
                </div>
              </div>

              {/* Graphical Analysis Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. Area Chart (Usage Graph) */}
                <div className="lg:col-span-2 bg-[#141416] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h4 className="text-sm font-bold text-white tracking-wide">Tráfego de Mensagens & Tokens</h4>
                      <p className="text-xs text-gray-500">Média de consumo diário nas últimas 24 horas.</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-lg p-1 text-[11px] text-gray-400">
                      <span className="px-2 py-0.5 rounded-md bg-[#222] text-white font-medium">Tokens</span>
                      <span className="px-2 py-0.5 rounded-md">Mensagens</span>
                    </div>
                  </div>
                  
                  {/* Glowing SVG Area Chart */}
                  <div className="flex-1 min-h-[220px] flex items-end relative w-full select-none">
                    <svg viewBox="0 0 700 200" className="w-full h-full">
                      <defs>
                        <linearGradient id="glowGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ec4899" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="50" x2="700" y2="50" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                      <line x1="0" y1="100" x2="700" y2="100" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                      <line x1="0" y1="150" x2="700" y2="150" stroke="rgba(255,255,255,0.03)" strokeDasharray="3" />
                      
                      {/* Area under the line */}
                      <path d="M 0 170 Q 100 120 200 150 T 400 80 T 600 60 L 700 40 L 700 190 L 0 190 Z" fill="url(#glowGrad)" />
                      {/* Main Stroke line */}
                      <path d="M 0 170 Q 100 120 200 150 T 400 80 T 600 60 L 700 40" fill="none" stroke="#ec4899" strokeWidth="3" />
                      
                      {/* Glowing markers */}
                      <circle cx="200" cy="150" r="4.5" fill="#141416" stroke="#ec4899" strokeWidth="3" />
                      <circle cx="400" cy="80" r="4.5" fill="#141416" stroke="#ec4899" strokeWidth="3" />
                      <circle cx="600" cy="60" r="4.5" fill="#141416" stroke="#ec4899" strokeWidth="3" />
                    </svg>

                    {/* Chart bottom labels */}
                    <div className="absolute bottom-0 inset-x-0 flex justify-between text-[10px] font-bold text-gray-600 px-1 pt-2">
                      <span>00:00</span>
                      <span>04:00</span>
                      <span>08:00</span>
                      <span>12:00</span>
                      <span>16:00</span>
                      <span>20:00</span>
                      <span>Agora</span>
                    </div>
                  </div>
                </div>

                {/* 2. Bar Chart (New Users weekly) */}
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
                  <div>
                    <h4 className="text-sm font-bold text-white tracking-wide">Cadastros de Usuários</h4>
                    <p className="text-xs text-gray-500">Novos usuários registrados por dia.</p>
                  </div>
                  
                  {/* Visual Bar Chart */}
                  <div className="flex-1 flex items-end justify-between gap-3.5 mt-8 min-h-[160px] pb-4 border-b border-white/5 relative">
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="bg-gradient-to-t from-pink-500 to-rose-400 w-full rounded-t-lg transition-all duration-500 hover:brightness-110" style={{ height: '35px' }} />
                      <span className="text-[10px] text-gray-500 font-bold">S</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="bg-gradient-to-t from-pink-500 to-rose-400 w-full rounded-t-lg transition-all duration-500 hover:brightness-110" style={{ height: '55px' }} />
                      <span className="text-[10px] text-gray-500 font-bold">T</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="bg-gradient-to-t from-pink-500 to-rose-400 w-full rounded-t-lg transition-all duration-500 hover:brightness-110" style={{ height: '80px' }} />
                      <span className="text-[10px] text-gray-500 font-bold">Q</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="bg-gradient-to-t from-pink-500 to-rose-400 w-full rounded-t-lg transition-all duration-500 hover:brightness-110" style={{ height: '60px' }} />
                      <span className="text-[10px] text-gray-500 font-bold">Q</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="bg-gradient-to-t from-pink-500 to-rose-400 w-full rounded-t-lg transition-all duration-500 hover:brightness-110" style={{ height: '110px' }} />
                      <span className="text-[10px] text-gray-500 font-bold">S</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="bg-gradient-to-t from-pink-500 to-rose-400 w-full rounded-t-lg transition-all duration-500 hover:brightness-110" style={{ height: '135px' }} />
                      <span className="text-[10px] text-gray-500 font-bold">S</span>
                    </div>
                    <div className="flex flex-col items-center gap-2 w-full">
                      <div className="bg-gradient-to-t from-pink-500 to-rose-400 w-full rounded-t-lg transition-all duration-500 hover:brightness-110" style={{ height: '150px' }} />
                      <span className="text-[10px] text-pink-400 font-extrabold">D</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-600 mt-4 px-1">
                    <span>Média semanal: <b>38 reg/dia</b></span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: USERS */}
          {/* ================================================================= */}
          {activeTab === 'users' && (
            <div className="space-y-6 animate-fade-in">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-center gap-4 justify-between bg-[#141416] border border-white/5 rounded-2xl p-5 shadow-lg">
                <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                  {/* Search Input */}
                  <div className="relative w-full sm:w-64">
                    <input
                      type="text"
                      placeholder="Pesquisar por nome ou e-mail..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>

                  {/* Filter by Role */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Função:</span>
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-[#1C1C1E] border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-pink-500/50"
                    >
                      <option value="todos">Todos</option>
                      <option value="Admin">Admin</option>
                      <option value="Usuário">Usuário</option>
                      <option value="Suporte">Suporte</option>
                    </select>
                  </div>

                  {/* Filter by Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium">Status:</span>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-[#1C1C1E] border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-pink-500/50"
                    >
                      <option value="todos">Todos</option>
                      <option value="Ativo">Ativo</option>
                      <option value="Suspenso">Suspenso</option>
                    </select>
                  </div>
                </div>

                {/* Add User Button */}
                <button
                  onClick={handleOpenAddUser}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold rounded-xl text-xs shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                  </svg>
                  <span>Adicionar Usuário</span>
                </button>
              </div>

              {/* Table */}
              <div className="bg-[#141416] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.005]">
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Função</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data de Cadastro</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                            {/* User details */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-600/20 border border-pink-500/20 flex items-center justify-center text-pink-400 font-bold text-xs">
                                  {u.name.charAt(0)}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-sm font-semibold text-white truncate max-w-[180px]">{u.name}</span>
                                  <span className="text-xs text-gray-500 truncate max-w-[180px]">{u.email}</span>
                                </div>
                              </div>
                            </td>
                            {/* Role */}
                            <td className="px-6 py-4 text-sm font-medium">
                              <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                                u.role === 'Admin' 
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                                  : u.role === 'Suporte'
                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/15'
                                    : 'bg-gray-500/10 text-gray-400'
                              }`}>
                                {u.role}
                              </span>
                            </td>
                            {/* Subscription plan */}
                            <td className="px-6 py-4 text-sm font-semibold text-gray-300">
                              {u.plan}
                            </td>
                            {/* Status badge */}
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                                u.status === 'Ativo'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/15'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'Ativo' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                                {u.status}
                              </span>
                            </td>
                            {/* Signup date */}
                            <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                              {u.created_at}
                            </td>
                            {/* Action buttons */}
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  className={`p-1.5 rounded-lg border text-xs font-semibold transition-all ${
                                    u.status === 'Ativo'
                                      ? 'border-red-500/10 hover:bg-red-500/10 text-red-400'
                                      : 'border-emerald-500/10 hover:bg-emerald-500/10 text-emerald-400'
                                  }`}
                                  title={u.status === 'Ativo' ? 'Suspender Usuário' : 'Reativar Usuário'}
                                >
                                  {u.status === 'Ativo' ? 'Suspender' : 'Reativar'}
                                </button>
                                <button
                                  onClick={() => handleOpenEditUser(u)}
                                  className="p-1.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-all"
                                  title="Editar Usuário"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 1 1 3 3l-6.92 6.918c-.313.313-.689.544-1.107.676l-3.158 1.263a.75.75 0 0 1-.98-.98Z" />
                                    <path d="M1.75 3A1.75 1.75 0 0 0 0 4.75v10.5C0 16.776.776 18 2.25 18h10.5A1.75 1.75 0 0 0 14.5 16.25V12a.75.75 0 0 0-1.5 0v4.25c0 .414-.336.75-.75.75H2.25a.75.75 0 0 1-.75-.75V4.75c0-.414.336-.75.75-.75H7a.75.75 0 0 0 0-1.5H2.25Z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.id)}
                                  className="p-1.5 bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-all"
                                  title="Excluir Usuário"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                    <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75V4H3a.75.75 0 0 0 0 1.5h14a.75.75 0 0 0 0-1.5h-3v-.25A2.75 2.75 0 0 0 11.25 1h-2.5ZM7.5 4h5v-.25a1.25 1.25 0 0 0-1.25-1.25h-2.5A1.25 1.25 0 0 0 7.5 3.75V4ZM5 6.75A.75.75 0 0 1 5.75 6h8.5a.75.75 0 0 1 .75.75v9.5A2.75 2.75 0 0 1 12.25 19h-4.5A2.75 2.75 0 0 1 5 16.25v-9.5Zm2.75 1.5a.75.75 0 0 0-1.5 0v6.5a.75.75 0 0 0 1.5 0v-6.5Zm5 .75a.75.75 0 0 1 .75-.75h.01a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75H13.5a.75.75 0 0 1-.75-.75v-6.5Z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-10 text-gray-500 text-sm">
                            Nenhum usuário correspondente aos filtros.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: SUBSCRIPTIONS */}
          {/* ================================================================= */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-8 animate-fade-in">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 shadow-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Faturamento Anual (ARR)</p>
                  <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">R$ {stats.arr}</h3>
                  <p className="text-[11px] text-gray-500 mt-2">Estimativa projetada sobre o MRR ativo.</p>
                </div>
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 shadow-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ticket Médio (ARPU)</p>
                  <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">
                    R$ {stats.activeSubs > 0 ? Math.round(stats.mrr / stats.activeSubs) : 0}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-2">Média paga por assinante ativo mensalmente.</p>
                </div>
                <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 shadow-lg">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversão de Assinantes</p>
                  <h3 className="text-3xl font-extrabold text-white mt-2 tracking-tight">
                    {stats.totalUsers > 0 ? Math.round((stats.activeSubs / stats.totalUsers) * 100) : 0}%
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-2">Proporção de usuários pagantes no sistema.</p>
                </div>
              </div>

              {/* Monitored Subscriptions Table */}
              <div className="bg-[#141416] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                <div className="px-6 py-5 border-b border-white/5 bg-white/[0.005] flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white tracking-wide">Plano de Assinatura por Cliente</h4>
                  <span className="text-xs text-gray-500">Total de {users.filter(u => u.plan !== 'Gratuito').length} assinantes pagantes</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assinante</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Plano Atual</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor Recorrente</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status Financeiro</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Renovação / Próx. Cobrança</th>
                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-white/[0.01] transition-colors">
                          {/* Profile */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-7 h-7 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 font-bold text-[11px]">
                                {u.name.charAt(0)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-bold text-white truncate max-w-[150px]">{u.name}</span>
                                <span className="text-[10px] text-gray-500 truncate max-w-[150px]">{u.email}</span>
                              </div>
                            </div>
                          </td>
                          {/* Plan */}
                          <td className="px-6 py-4 text-sm font-semibold text-white">
                            {u.plan}
                          </td>
                          {/* Value */}
                          <td className="px-6 py-4 text-sm text-gray-300 font-mono">
                            R$ {PLAN_PRICES[u.plan]}/mês
                          </td>
                          {/* Billing Status */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                              u.plan === 'Gratuito'
                                ? 'bg-gray-500/10 text-gray-400'
                                : u.status === 'Ativo'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                                  : 'bg-red-500/10 text-red-400 border border-red-500/15'
                            }`}>
                              {u.plan === 'Gratuito' ? 'N/A' : u.status === 'Ativo' ? 'Em dia' : 'Vencida'}
                            </span>
                          </td>
                          {/* Renewal date */}
                          <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                            {u.plan === 'Gratuito' ? 'Sem expiração' : '05/06/2026'}
                          </td>
                          {/* Option button */}
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleOpenEditSub(u)}
                              className="px-3 py-1.5 bg-white/5 border border-white/5 hover:bg-white/10 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition-all"
                            >
                              Alterar Plano
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: RESOURCES */}
          {/* ================================================================= */}
          {activeTab === 'resources' && (
            <div className="max-w-3xl space-y-8 animate-fade-in">
              {/* Feature Toggles */}
              <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <h4 className="text-sm font-bold text-white tracking-wide border-b border-white/5 pb-3">Ativação de Funcionalidades</h4>
                
                <div className="space-y-4">
                  {/* Image Generation */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-semibold text-white">Geração de Imagens (Flux via Pollinations)</h5>
                      <p className="text-xs text-gray-500">Permite que a IA detecte pedidos e gere imagens automaticamente via markdown.</p>
                    </div>
                    {/* Custom Toggle Switch */}
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, allowImageGen: !prev.allowImageGen }))}
                      className={`w-11 h-6 rounded-full relative transition-all duration-300 focus:outline-none ${
                        settings.allowImageGen ? 'bg-pink-500' : 'bg-white/10'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-all duration-300 ${
                        settings.allowImageGen ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Audio Transcription */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-semibold text-white">Transcrição de Áudio Multimodal</h5>
                      <p className="text-xs text-gray-500">Permite o envio e transcrição de gravações de voz do usuário no chat.</p>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, allowAudioTranscribe: !prev.allowAudioTranscribe }))}
                      className={`w-11 h-6 rounded-full relative transition-all duration-300 focus:outline-none ${
                        settings.allowAudioTranscribe ? 'bg-pink-500' : 'bg-white/10'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-all duration-300 ${
                        settings.allowAudioTranscribe ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Code Upload */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-semibold text-white">Upload de Arquivos de Código / Texto</h5>
                      <p className="text-xs text-gray-500">Autoriza o anexo e a leitura de conteúdos de arquivos de programação e dados no prompt.</p>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, allowFileUpload: !prev.allowFileUpload }))}
                      className={`w-11 h-6 rounded-full relative transition-all duration-300 focus:outline-none ${
                        settings.allowFileUpload ? 'bg-pink-500' : 'bg-white/10'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-all duration-300 ${
                        settings.allowFileUpload ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Creative Mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-semibold text-white">Modo Alta Criatividade (Temp. 0.9)</h5>
                      <p className="text-xs text-gray-500">Eleva a temperatura das respostas da IA para torná-la mais expressiva e brainstorm-friendly.</p>
                    </div>
                    <button
                      onClick={() => setSettings(prev => ({ ...prev, creativeMode: !prev.creativeMode }))}
                      className={`w-11 h-6 rounded-full relative transition-all duration-300 focus:outline-none ${
                        settings.creativeMode ? 'bg-pink-500' : 'bg-white/10'
                      }`}
                    >
                      <span className={`w-4 h-4 bg-white rounded-full absolute top-1 left-1 transition-all duration-300 ${
                        settings.creativeMode ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Limits and Models */}
              <div className="bg-[#141416] border border-white/5 rounded-2xl p-6 shadow-xl space-y-6">
                <h4 className="text-sm font-bold text-white tracking-wide border-b border-white/5 pb-3">Limites e Configurações de API</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Daily message limits for free users */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Limite Diário de Mensagens (Grátis)</label>
                    <input
                      type="number"
                      value={settings.freeDailyLimit}
                      onChange={(e) => setSettings(prev => ({ ...prev, freeDailyLimit: parseInt(e.target.value) || 0 }))}
                      className="bg-[#1C1C1E] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50"
                    />
                  </div>

                  {/* Max file size */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tamanho Máx. de Upload (MB)</label>
                    <input
                      type="number"
                      value={settings.maxUploadSize}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxUploadSize: parseInt(e.target.value) || 0 }))}
                      className="bg-[#1C1C1E] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50"
                    />
                  </div>

                  {/* Chosen Gemini Model */}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Modelo Ativo do Gemini</label>
                    <select
                      value={settings.aiModel}
                      onChange={(e) => setSettings(prev => ({ ...prev, aiModel: e.target.value }))}
                      className="bg-[#1C1C1E] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50"
                    >
                      <option value="gemini-2.5-flash">Gemini 2.5 Flash (Super rápido e padrão)</option>
                      <option value="gemini-2.5-pro">Gemini 2.5 Pro (Raciocínio complexo avançado)</option>
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legado de alta capacidade)</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash (Versão leve legada)</option>
                    </select>
                  </div>

                  {/* System Prompt Customizer */}
                  <div className="flex flex-col gap-2 md:col-span-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Instrução de Sistema Principal (System Prompt)</label>
                    <textarea
                      rows={5}
                      value={settings.systemPrompt}
                      onChange={(e) => setSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
                      className="bg-[#1C1C1E] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500/50 leading-relaxed resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex justify-end">
                  <button
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold rounded-xl text-sm transition-all"
                  >
                    {isSavingSettings ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Salvar Configurações</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ================================================================= */}
      {/* MODAL 1: ADD/EDIT USER */}
      {/* ================================================================= */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-white/8 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white tracking-wide">
                {userModalMode === 'add' ? 'Adicionar Novo Usuário' : 'Editar Usuário do Sistema'}
              </h4>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do usuário"
                  value={userForm.name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-[#1C1C1E] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">E-mail *</label>
                <input
                  type="email"
                  required
                  placeholder="email@dominio.com"
                  value={userForm.email}
                  onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                  className="bg-[#1C1C1E] border border-white/5 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Função</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                    className="bg-[#1C1C1E] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                  >
                    <option value="Usuário">Usuário</option>
                    <option value="Admin">Admin</option>
                    <option value="Suporte">Suporte</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Plano de Assinatura</label>
                  <select
                    value={userForm.plan}
                    onChange={(e) => setUserForm(prev => ({ ...prev, plan: e.target.value }))}
                    className="bg-[#1C1C1E] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                  >
                    <option value="Gratuito">Gratuito</option>
                    <option value="Pro">Pro (R$99/m)</option>
                    <option value="Premium">Premium (R$199/m)</option>
                    <option value="Ilimitado">Ilimitado (R$499/m)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status do Usuário</label>
                <select
                  value={userForm.status}
                  onChange={(e) => setUserForm(prev => ({ ...prev, status: e.target.value }))}
                  className="bg-[#1C1C1E] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                >
                  <option value="Ativo">Ativo (Livre)</option>
                  <option value="Suspenso">Suspenso (Bloqueado)</option>
                </select>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold rounded-xl text-xs transition-all"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL 2: CHANGE SUBSCRIPTION */}
      {/* ================================================================= */}
      {isSubModalOpen && selectedSubUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#141416] border border-white/8 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white tracking-wide">Ajustar Assinatura Recorrente</h4>
              <button
                onClick={() => setIsSubModalOpen(false)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Modal content */}
            <form onSubmit={handleSaveSub} className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400 font-bold text-xs">
                  {selectedSubUser.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <h5 className="text-xs font-bold text-white truncate">{selectedSubUser.name}</h5>
                  <p className="text-[10px] text-gray-500 truncate">{selectedSubUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Plano</label>
                  <select
                    value={subForm.plan}
                    onChange={(e) => setSubForm(prev => ({ ...prev, plan: e.target.value }))}
                    className="bg-[#1C1C1E] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="Gratuito">Gratuito</option>
                    <option value="Pro">Pro</option>
                    <option value="Premium">Premium</option>
                    <option value="Ilimitado">Ilimitado</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Status Financeiro</label>
                  <select
                    value={subForm.status}
                    onChange={(e) => setSubForm(prev => ({ ...prev, status: e.target.value }))}
                    className="bg-[#1C1C1E] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="Ativa">Ativa (Em dia)</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Cancelada">Cancelada</option>
                    <option value="Expirada">Expirada (Vencida)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Frequência</label>
                  <select
                    value={subForm.billing}
                    onChange={(e) => setSubForm(prev => ({ ...prev, billing: e.target.value }))}
                    className="bg-[#1C1C1E] border border-white/5 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none"
                  >
                    <option value="Mensal">Mensal</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Preço Customizado</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-bold">R$</span>
                    <input
                      type="number"
                      value={subForm.price}
                      onChange={(e) => setSubForm(prev => ({ ...prev, price: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-[#1C1C1E] border border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white font-mono focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubModalOpen(false)}
                  className="px-4 py-2 bg-white/5 border border-white/5 hover:bg-white/10 text-gray-300 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-semibold rounded-xl text-xs transition-all"
                >
                  Confirmar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
