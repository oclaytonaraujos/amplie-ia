/* ──────────────────── UpgradePlanModal.jsx ──────────────────── */
import { useState } from 'react'

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
    </svg>
  )
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 'R$ 0',
    period: '/mês',
    description: 'Para começar a explorar',
    current: true,
    cta: 'Plano atual',
    features: [
      '50 mensagens por dia',
      'Acesso ao modelo padrão',
      'Upload de arquivos (5MB)',
      'Suporte por e-mail',
    ],
    highlight: false,
  },
  {
    id: 'plus',
    name: 'Plus',
    price: 'R$ 49',
    period: '/mês',
    description: 'Para uso profissional',
    current: false,
    cta: 'Em breve',
    features: [
      'Mensagens ilimitadas',
      'Acesso ao modelo avançado',
      'Upload de arquivos (50MB)',
      'Respostas prioritárias',
      'Histórico ilimitado',
      'Suporte prioritário',
    ],
    highlight: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'R$ 99',
    period: '/mês',
    description: 'Para times e empresas',
    current: false,
    cta: 'Em breve',
    features: [
      'Tudo do Plus',
      'Múltiplos usuários',
      'API de integração',
      'Relatórios de uso',
      'Personalização de marca',
      'SLA garantido',
      'Suporte 24/7',
    ],
    highlight: false,
  },
]

export default function UpgradePlanModal({ onClose }) {
  const [hoveredPlan, setHoveredPlan] = useState(null)

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#171717] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-white/8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Planos e preços</h2>
              <p className="text-sm text-gray-400 mt-0.5">Escolha o plano ideal para você</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Plans grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onMouseEnter={() => setHoveredPlan(plan.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              className={`
                relative rounded-xl border p-5 flex flex-col transition-all duration-200
                ${plan.highlight
                  ? 'border-pink-500/50 bg-gradient-to-b from-pink-500/[0.08] to-transparent'
                  : 'border-white/8 bg-white/[0.02]'
                }
                ${hoveredPlan === plan.id && !plan.highlight ? 'border-white/15 bg-white/[0.04]' : ''}
              `}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    ✦ Recomendado
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className={`text-lg font-bold ${plan.highlight ? 'text-pink-400' : 'text-white'}`}>
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-gray-500">{plan.period}</span>
                </div>
              </div>

              <ul className="flex-1 space-y-2 mb-5">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                      className={`w-4 h-4 shrink-0 mt-0.5 ${plan.highlight ? 'text-pink-400' : 'text-gray-500'}`}>
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.current || plan.cta === 'Em breve'}
                className={`
                  w-full py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${plan.current
                    ? 'bg-white/5 text-gray-500 cursor-default border border-white/10'
                    : plan.highlight
                      ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white opacity-50 cursor-not-allowed'
                      : 'bg-white/5 text-gray-400 opacity-50 cursor-not-allowed border border-white/8'
                  }
                `}
              >
                {plan.current ? '✓ Plano atual' : plan.cta === 'Em breve' ? '🕐 Em breve' : plan.cta}
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-gray-600">Os novos planos estarão disponíveis em breve. Acompanhe as novidades!</p>
        </div>
      </div>
    </div>
  )
}
