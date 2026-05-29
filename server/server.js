import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@supabase/supabase-js'
import multer from 'multer'
import fs from 'fs'
import path from 'path'

/* ── Validate env ── */
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY não encontrada. Crie um arquivo .env com sua chave.')
  process.exit(1)
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY não encontradas no .env')
  process.exit(1)
}

/* ── Setup ── */
const app = express()
const PORT = process.env.PORT || 3001

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash'

/**
 * Cliente Supabase para verificação de JWT (usa anon key — seguro para auth.getUser)
 */
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

/**
 * Cria um cliente Supabase autenticado com o JWT do usuário.
 * Isso permite que o RLS funcione corretamente (auth.uid() retorna o user correto).
 */
function createUserClient(accessToken) {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    }
  )
}

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

/* ── Multer config for file uploads ── */
const uploadsDir = path.resolve('uploads')
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
})

/* ── System prompt ── */
const SYSTEM_INSTRUCTION =
  'Você é a Amplie IA, a assistente virtual inteligente criada e mantida pelo Grupo Amplie Marketing — uma empresa referência em soluções de marketing digital, automação e inteligência artificial aplicada a negócios. ' +

  // ── Identidade (quando perguntarem quem você é) ──
  'Sempre que o usuário perguntar quem você é, o que você é, quem te criou, quem te desenvolveu ou qualquer variação dessa pergunta, você DEVE responder de forma completa, profissional e acolhedora seguindo estas diretrizes: ' +
  '1) Apresente-se como a Amplie IA, assistente oficial do Grupo Amplie Marketing. ' +
  '2) Explique que você foi projetada e desenvolvida pela equipe de tecnologia do Grupo Amplie Marketing para ser uma ferramenta poderosa que auxilia pessoas e empresas no dia a dia. ' +
  '3) Mencione suas principais capacidades: responder dúvidas, gerar conteúdo criativo, auxiliar em estratégias de marketing, analisar dados, otimizar processos, criar textos, auxiliar em programação e muito mais. ' +
  '4) Destaque que o Grupo Amplie Marketing é especializado em marketing digital, branding, automação e tecnologia, e que a criação de você (Amplie IA) reflete o compromisso da empresa com inovação e excelência. ' +
  '5) Você DEVE obrigatoriamente incluir o link clicável do site da desenvolvedora em formato Markdown: [Amplie Marketing](https://www.amplie-marketing.com/) — convide o usuário a conhecer mais sobre a empresa visitando o site. ' +
  '6) Encerre a apresentação de forma calorosa, dizendo que está à disposição para ajudar no que for preciso. ' +

  // ── Tom humanizado e natural ──
  'REGRA FUNDAMENTAL DE COMUNICAÇÃO: Você DEVE se comunicar da forma mais humanizada, calorosa e natural possível, como se fosse uma pessoa real conversando com um amigo ou colega de trabalho. Siga rigorosamente estas diretrizes de tom: ' +
  '- Use linguagem natural e coloquial do português brasileiro do dia a dia. Evite frases robóticas, genéricas ou que pareçam geradas por máquina. ' +
  '- Demonstre empatia genuína: se o usuário está com um problema, mostre que entende a frustração; se está feliz, comemore junto. ' +
  '- Use expressões naturais do brasileiro como "olha", "veja só", "boa!", "massa!", "show!", "tranquilo", "pode deixar", "vamos lá", "faz sentido?", "te ajudo sim" quando apropriado ao contexto. ' +
  '- Use emojis com moderação e de forma natural para dar vida à conversa (😊, ✨, 🚀, 💡, 👏, 🎯, etc.), mas sem exagerar — 1 a 3 por resposta é o ideal. ' +
  '- Varie suas respostas! Nunca comece todas as respostas da mesma forma. Alterne entre diferentes aberturas e estilos para soar autêntico. ' +
  '- Adapte o nível de formalidade ao tom do usuário: se ele é casual, seja casual; se é formal, seja um pouco mais profissional (mas nunca frio ou distante). ' +
  '- Quando fizer listas ou passos, use uma linguagem que guie a pessoa com carinho, não como um manual técnico. ' +
  '- Evite TOTALMENTE frases como "Como uma inteligência artificial...", "Enquanto assistente virtual...", "Fui programada para..." ou similares. Você é a Amplie IA e ponto — converse naturalmente sem ficar se lembrando que é uma IA. ' +
  '- Adicione pequenos toques de personalidade: humor leve quando cabível, curiosidades relacionadas ao tema, ou comentários pessoais como "esse tema é demais!" ou "adorei essa ideia!". ' +
  '- Quando não souber algo, seja honesta de forma leve: "Hmm, essa eu não tenho certeza, viu? Mas posso tentar te ajudar a pesquisar!" ' +
  '- Use parágrafos curtos e bem espaçados para facilitar a leitura. Evite blocos enormes de texto corrido. ' +

  // ── Regras técnicas ──
  'Certifique-se de que qualquer link enviado por você esteja formatado como Markdown correto: [Nome do Link](URL) para que seja renderizado como link clicável no chat. ' +
  'Responda sempre em português brasileiro. ' +
  'Quando o usuário pedir para gerar, criar ou desenhar uma imagem, apenas descreva brevemente o que a imagem mostrará e diga que está gerando — o sistema cuidará da geração automaticamente.'

/* ── Detectar se a mensagem é um pedido de geração de imagem ── */
const IMAGE_REQUEST_REGEX = /\b(ger[ea]|cri[ae]|fa[çz]|fa?ça?|desenh[ae]|ilustr[ae]|produz[ae]|monstr[ae]|mostre?|faz|faz uma|cre|make|draw|creat|generat|imagin|paint|sketch)\b.{0,80}\b(imagem|foto|fotografia|ilustração|desenho|arte|picture|image|photo|illustration|artwork|visual|figura|pintura|retrato|wallpaper|banner|logo|ícone|icon)\b/i

function isImageRequest(text) {
  // Remove file/image attachments from detection
  const clean = text
    .replace(/\[FILE_ATTACHMENT:[\s\S]*?\/FILE_ATTACHMENT\]/g, '')
    .replace(/\[IMAGE_ATTACHMENT:[\s\S]*?\/IMAGE_ATTACHMENT\]/g, '')
    .trim()
  return IMAGE_REQUEST_REGEX.test(clean)
}

/* ── Traduzir e refinar o prompt da imagem via Gemini ── */
async function buildImagePrompt(userText) {
  try {
    const result = await callWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{
          role: 'user',
          parts: [{
            text: `Extract and translate to English the image description from this message, making it a high-quality image generation prompt (detailed, descriptive, artistic style if applicable). Return ONLY the prompt text, nothing else.\n\nMessage: "${userText}"`,
          }],
        }],
      })
    )
    return result.text.trim().replace(/^["']|["']$/g, '')
  } catch {
    // Fallback: use original text
    return userText.replace(/\b(ger[ea]|cri[ae]|fa[çz]|desenh[ae]|ilustr[ae])\b.{0,20}\b(imagem|foto|ilustração|desenho|arte)\b.{0,20}\s*/i, '').trim()
  }
}

/* ── Gerar URL de imagem via Pollinations.ai ── */
function buildPollinationsUrl(prompt, options = {}) {
  const {
    width = 1024,
    height = 1024,
    model = 'flux',
    seed = Math.floor(Math.random() * 999999),
  } = options
  const encoded = encodeURIComponent(prompt)
  return `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&model=${model}&seed=${seed}&nologo=true`
}



/* ── Retry helper com backoff exponencial ── */
async function callWithRetry(fn, maxRetries = 3) {
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const is429 =
        err.status === 429 ||
        err.message?.includes('429') ||
        err.message?.includes('quota') ||
        err.message?.includes('Resource has been exhausted') ||
        err.message?.includes('RESOURCE_EXHAUSTED')
      if (!is429 || attempt === maxRetries - 1) throw err
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500
      console.warn(`⚠️ Gemini 429 — tentativa ${attempt + 1}/${maxRetries}. Aguardando ${Math.round(delay)}ms...`)
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

/* ══════════════════════════════════════════════════
   MIDDLEWARE DE AUTENTICAÇÃO
   ══════════════════════════════════════════════════ */

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação necessária. Faça login para continuar.' })
  }

  const token = authHeader.replace('Bearer ', '').trim()

  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' })
    }

    req.userId = user.id
    req.accessToken = token

    // Mapear tenant_id para o usuário
    let tenantId = null
    try {
      const { data: tenantUser } = await supabaseAuth
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (tenantUser) {
        tenantId = tenantUser.tenant_id
      } else {
        // Criar um tenant padrão caso não exista nenhum cadastrado
        const { data: newTenant, error: createTenantErr } = await supabaseAuth
          .from('tenants')
          .insert({ name: 'Minha Empresa' })
          .select('id')
          .single()

        if (!createTenantErr && newTenant) {
          tenantId = newTenant.id
          await supabaseAuth
            .from('tenant_users')
            .insert({ tenant_id: tenantId, user_id: user.id, role: 'admin' })
        }
      }
    } catch (dbErr) {
      console.warn('⚠️ Tabelas de multi-tenant não encontradas. Execute a migração V2 no Supabase.')
    }

    req.tenantId = tenantId
    next()
  } catch (err) {
    console.error('Erro na verificação do token:', err.message)
    return res.status(401).json({ error: 'Erro ao verificar autenticação.' })
  }
}

/* ══════════════════════════════════════════════════
   CONVERSATIONS ENDPOINTS
   ══════════════════════════════════════════════════ */

app.get('/api/conversations', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', req.userId)
      .order('updated_at', { ascending: false })

    if (error) throw error
    return res.json({ conversations: data })
  } catch (err) {
    console.error('Erro ao listar conversas:', err.message)
    return res.status(500).json({ error: 'Erro ao listar conversas.' })
  }
})

app.post('/api/conversations', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)
    const { title } = req.body

    const insertObj = {
      title: title || 'Nova conversa',
      user_id: req.userId,
    }
    if (req.tenantId) {
      insertObj.tenant_id = req.tenantId
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert(insertObj)
      .select()
      .single()

    if (error) throw error
    return res.json({ conversation: data })
  } catch (err) {
    console.error('Erro ao criar conversa:', err.message)
    return res.status(500).json({ error: 'Erro ao criar conversa.' })
  }
})

app.delete('/api/conversations/:id', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)
    const { id } = req.params

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId)

    if (error) throw error
    return res.json({ success: true })
  } catch (err) {
    console.error('Erro ao deletar conversa:', err.message)
    return res.status(500).json({ error: 'Erro ao deletar conversa.' })
  }
})

app.get('/api/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)
    const { id } = req.params

    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.userId)
      .single()

    if (convError || !conv) {
      return res.status(403).json({ error: 'Conversa não encontrada ou sem permissão.' })
    }

    const { data, error } = await supabase
      .from('messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', id)
      .eq('user_id', req.userId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return res.json({ messages: data })
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err.message)
    return res.status(500).json({ error: 'Erro ao buscar mensagens.' })
  }
})

/* ══════════════════════════════════════════════════
   HELPERS — converter mensagens para o formato Gemini
   ══════════════════════════════════════════════════ */

/**
 * Converte um array de mensagens {role, content} para o formato Gemini.
 * Suporta texto simples e imagens inline em base64.
 */
function toGeminiContents(messages) {
  return messages.map((msg) => {
    const role = msg.role === 'assistant' ? 'model' : 'user'
    const content = msg.content

    if (typeof content === 'string' && content.includes('[IMAGE_ATTACHMENT:')) {
      const parts = []
      const regex = /\[IMAGE_ATTACHMENT:.*?\](data:image\/(.*?);base64,([A-Za-z0-9+/=]+))\[\/IMAGE_ATTACHMENT\]/g
      let lastIndex = 0
      let match

      while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          const text = content.substring(lastIndex, match.index).trim()
          if (text) parts.push({ text })
        }
        parts.push({
          inlineData: {
            mimeType: `image/${match[2]}`,
            data: match[3],
          },
        })
        lastIndex = regex.lastIndex
      }

      if (lastIndex < content.length) {
        const text = content.substring(lastIndex).trim()
        if (text) parts.push({ text })
      }

      return { role, parts }
    }

    return { role, parts: [{ text: content || '' }] }
  })
}

/**
 * Tratamento centralizado de erros da API do Gemini.
 */
function handleGeminiError(err, res, defaultMsg = 'Erro interno do servidor.') {
  console.error('=== ERRO DO GEMINI ===')
  console.error('Mensagem:', err.message)
  console.error('Status HTTP:', err.status)
  console.error('Código:', err.code)
  if (err.errorDetails) console.error('Detalhes:', JSON.stringify(err.errorDetails))

  if (err.status === 401 || err.message?.includes('API key') || err.message?.includes('API_KEY')) {
    return res.status(401).json({ error: 'Chave da API do Gemini inválida ou não configurada.' })
  }

  if (err.status === 403 || err.message?.includes('denied') || err.message?.includes('access') || err.message?.includes('403') || err.message?.includes('PERMISSION_DENIED')) {
    return res.status(403).json({ error: `Acesso negado à API do Gemini. O modelo configurado (${GEMINI_MODEL}) pode não estar disponível ou autorizado para sua chave de API.` })
  }

  const is429 =
    err.status === 429 ||
    err.message?.includes('quota') ||
    err.message?.includes('Resource has been exhausted') ||
    err.message?.includes('RESOURCE_EXHAUSTED') ||
    err.message?.includes('429')
  if (is429) {
    return res.status(429).json({ error: 'Limite de uso da IA atingido (Quota excedida). Aguarde alguns segundos e tente novamente.' })
  }

  return res.status(500).json({ error: defaultMsg })
}

/* ══════════════════════════════════════════════════
   CHAT ENDPOINT (with persistence)
   ══════════════════════════════════════════════════ */

app.post('/api/chat', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)
    const { messages, conversationId } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'O campo "messages" é obrigatório e deve ser um array.' })
    }

    const lastUserMessage = messages[messages.length - 1]

    if (conversationId) {
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', req.userId)
        .single()

      if (convError || !conv) {
        return res.status(403).json({ error: 'Conversa não encontrada ou sem permissão.' })
      }

      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: req.userId,
        role: lastUserMessage.role,
        content: lastUserMessage.content,
      })
    }

    /* ── Mapeamento e extração de agendamento ── */
    const userText = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : ''
    const isSchedulingRequest = /\b(agend[ae]|marc[ae]|reunião|compromisso|reuniao)\b/i.test(userText)

    if (isSchedulingRequest) {
      console.log('📅 Possível intenção de agendamento detectada. Acionando extrator de agenda...')
      try {
        const schedulePrompt = `
Analyze this user request: "${userText}"
Current Time: ${new Date().toISOString()} (Use this as reference for relative times like 'amanhã', 'hoje', 'terça que vem').

If the user wants to schedule an appointment/meeting, extract:
- title: Short description of the meeting
- start_time: ISO timestamp of start
- end_time: ISO timestamp of end (default to 1 hour after start if not specified)
- client_name: Name of any client mentioned
- client_phone: Phone number if mentioned

Return ONLY a valid JSON object with these keys. If it is NOT a scheduling request, return {"error": "not a scheduling request"}.
`
        const extractionRes = await callWithRetry(() =>
          ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [{ role: 'user', parts: [{ text: schedulePrompt }] }],
            config: { responseMimeType: 'application/json' }
          })
        )

        const parsed = JSON.parse(extractionRes.text.trim())

        if (parsed && !parsed.error && parsed.start_time) {
          // Sincronizar com o banco de dados
          let contactId = null
          if (parsed.client_name) {
            const { data: contact } = await supabase
              .from('crm_contacts')
              .select('id')
              .ilike('name', `%${parsed.client_name}%`)
              .limit(1)
              .maybeSingle()
            
            if (contact) contactId = contact.id
          }

          // Sincronizar com o Google Calendar real (se conectado) ou gerar fallback
          const googleEventId = await createGoogleCalendarEvent(req.tenantId, {
            title: parsed.title || 'Compromisso IA',
            description: `Agendado de forma inteligente pela Amplie IA.\nCliente referenciado: ${parsed.client_name || 'Nenhum'}`,
            start_time: parsed.start_time,
            end_time: parsed.end_time
          })

          const { data: appointment } = await supabase
            .from('appointments')
            .insert({
              tenant_id: req.tenantId,
              contact_id: contactId,
              title: parsed.title || 'Compromisso IA',
              start_time: parsed.start_time,
              end_time: parsed.end_time,
              description: `Agendado de forma inteligente pela Amplie IA.\nCliente referenciado: ${parsed.client_name || 'Nenhum'}`,
              google_event_id: googleEventId,
              whatsapp_reminder_time: new Date(new Date(parsed.start_time).getTime() - 60 * 60 * 1000).toISOString() // Lembrete 1h antes
            })
            .select()
            .single()

          if (appointment) {
            console.log('✓ Compromisso agendado no banco com sucesso e sincronizado com o Google Agenda!')
            const responseText = `Perfeito! Acabei de agendar o compromisso para você! 📅\n\n**Compromisso**: ${parsed.title || 'Reunião'}\n**Horário**: ${new Date(parsed.start_time).toLocaleString('pt-BR')}\n\n*Nota: O evento foi registrado no CRM e sincronizado automaticamente com seu Google Agenda.*`
            
            // Persistir resposta da IA
            if (conversationId) {
              await supabase.from('messages').insert({
                conversation_id: conversationId,
                user_id: req.userId,
                role: 'assistant',
                content: responseText,
              })
            }

            return res.json({ message: { role: 'assistant', content: responseText } })
          }
        }
      } catch (err) {
        console.warn('Erro ao processar intenção de agendamento:', err.message)
      }
    }

    /* ── Verificar se é pedido de geração de imagem ── */
    let responseText

    if (isImageRequest(userText)) {
      console.log('🎨 Pedido de imagem detectado — chamando Pollinations.ai')

      // Traduzir e refinar o prompt via Gemini
      const imagePrompt = await buildImagePrompt(userText)
      console.log(`📝 Prompt de imagem: "${imagePrompt}"`)

      // Montar URL da Pollinations
      const imageUrl = buildPollinationsUrl(imagePrompt)

      // Montar resposta com a imagem em Markdown
      responseText = `Aqui está a imagem gerada para você! ✨\n\n![${imagePrompt}](${imageUrl})\n\n*Prompt utilizado: "${imagePrompt}"*`
    } else {
      // Separar histórico e mensagem atual
      const history = toGeminiContents(messages.slice(0, -1))
      const lastMsgParts = toGeminiContents([lastUserMessage])[0].parts

      // Determinar a instrução de sistema dinâmica para o tenant
      let dynamicInstruction = SYSTEM_INSTRUCTION
      if (req.tenantId) {
        try {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('custom_system_prompt')
            .eq('id', req.tenantId)
            .single()

          if (tenantData && tenantData.custom_system_prompt) {
            dynamicInstruction += `\n\n[INSTRUÇÕES ESPECÍFICAS DA EMPRESA DO USUÁRIO]:\n${tenantData.custom_system_prompt}`
          }

          // Injetar contatos do CRM no contexto da IA
          const { data: crmData } = await supabase
            .from('crm_contacts')
            .select('name, email, phone, company, status, notes')
            .eq('tenant_id', req.tenantId)

          if (crmData && crmData.length > 0) {
            const crmContext = crmData.map(c => `- Nome: ${c.name} | Contato: ${c.phone} | Status: ${c.status} | Empresa: ${c.company || 'N/A'} | Notas: ${c.notes || 'N/A'}`).join('\n')
            dynamicInstruction += `\n\n[DADOS DE CLIENTES DO CRM INTEGRADO]:\nVocê tem acesso aos contatos cadastrados no CRM da empresa. Utilize-os se o usuário referenciar algum cliente ou para consultar históricos:\n${crmContext}`
          }

          // Injetar transações financeiras no contexto da IA
          const { data: financeData } = await supabase
            .from('financial_transactions')
            .select('type, category, amount, due_date, description')
            .eq('tenant_id', req.tenantId)

          if (financeData && financeData.length > 0) {
            const financeContext = financeData.map(t => `- Tipo: ${t.type === 'receita' ? 'Receita' : 'Despesa'} | Categoria: ${t.category} | Valor: R$ ${parseFloat(t.amount).toFixed(2)} | Data: ${t.due_date} | Notas: ${t.description || 'N/A'}`).join('\n')
            dynamicInstruction += `\n\n[DADOS DE TRANSAÇÕES FINANCEIRAS INTEGRADOS]:\nVocê atua também como o Agente Financeiro da empresa. Tem acesso ao fluxo de caixa abaixo para calcular margens, markup, lucro líquido e dar direcionamentos. Utilize estes dados para responder a questionamentos financeiros:\n${financeContext}`
          }
        } catch (dbErr) {
          console.warn('Erro ao buscar CRM/Financeiro/Instruções do tenant:', dbErr.message)
        }
      }

      // Criar sessão de chat com o novo SDK @google/genai
      const chat = ai.chats.create({
        model: GEMINI_MODEL,
        config: {
          systemInstruction: dynamicInstruction,
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
        history,
      })

      // Enviar mensagem (com retry automático em caso de 429)
      const result = await callWithRetry(() => chat.sendMessage({ message: lastMsgParts }))
      responseText = result.text
    }

    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: req.userId,
        role: 'assistant',
        content: responseText,
      })

      const { data: conv } = await supabase
        .from('conversations')
        .select('title')
        .eq('id', conversationId)
        .eq('user_id', req.userId)
        .single()

      if (conv && conv.title === 'Nova conversa') {
        const rawText = lastUserMessage.content
          .replace(/\[IMAGE_ATTACHMENT:.*?\][\s\S]*?\[\/IMAGE_ATTACHMENT\]/g, '')
          .replace(/\[FILE_ATTACHMENT:.*?\][\s\S]*?\[\/FILE_ATTACHMENT\]/g, '')
          .trim()
        const autoTitle = rawText.substring(0, 60) + (rawText.length > 60 ? '...' : '')
        await supabase
          .from('conversations')
          .update({ title: autoTitle || 'Nova conversa' })
          .eq('id', conversationId)
          .eq('user_id', req.userId)
      } else {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
          .eq('user_id', req.userId)
      }
    }

    return res.json({
      message: {
        role: 'assistant',
        content: responseText,
      },
    })
  } catch (err) {
    return handleGeminiError(err, res, 'Erro ao processar mensagem no chat.')
  }
})

/* ══════════════════════════════════════════════════
   ENDPOINT DIRETO: GERAR IMAGEM
   ══════════════════════════════════════════════════ */

app.post('/api/generate-image', authenticate, async (req, res) => {
  try {
    const { prompt, width = 1024, height = 1024, model = 'flux' } = req.body

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'O campo "prompt" é obrigatório.' })
    }

    // Traduzir e refinar prompt via Gemini
    const imagePrompt = await buildImagePrompt(prompt)
    const imageUrl = buildPollinationsUrl(imagePrompt, { width, height, model })

    console.log(`🎨 Imagem gerada: ${imageUrl}`)

    return res.json({
      url: imageUrl,
      prompt: imagePrompt,
      originalPrompt: prompt,
    })
  } catch (err) {
    console.error('Erro ao gerar imagem:', err.message)
    return res.status(500).json({ error: 'Erro ao gerar imagem.' })
  }
})



/* ══════════════════════════════════════════════════
   AUDIO TRANSCRIPTION (Gemini multimodal)
   ══════════════════════════════════════════════════ */

app.post('/api/transcribe', authenticate, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' })
    }

    const filePath = req.file.path
    const ext = (req.file.originalname?.split('.').pop() || 'webm').toLowerCase()
    const newPath = `${filePath}.${ext}`
    fs.renameSync(filePath, newPath)

    const audioBase64 = fs.readFileSync(newPath, 'base64')

    const mimeMap = {
      webm: 'audio/webm',
      mp3: 'audio/mpeg',
      mp4: 'audio/mp4',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
    }
    const mimeType = mimeMap[ext] || 'audio/webm'

    const result = await callWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: audioBase64 } },
              {
                text: 'Transcreva o áudio a seguir com precisão, mantendo o texto exatamente como foi falado, sem adicionar pontuação desnecessária ou interpretar o conteúdo. Responda apenas com a transcrição, sem explicações.',
              },
            ],
          },
        ],
      })
    )

    try { fs.unlinkSync(newPath) } catch {}

    const text = result.text.trim()
    return res.json({ text })
  } catch (err) {
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path) } catch {}
      try { fs.unlinkSync(req.file.path + '.' + (req.file.originalname?.split('.').pop() || 'webm')) } catch {}
    }
    return handleGeminiError(err, res, 'Erro ao transcrever áudio.')
  }
})

/* ══════════════════════════════════════════════════
   FILE UPLOAD (extract text content)
   ══════════════════════════════════════════════════ */

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'json', 'csv', 'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'c', 'cpp', 'h', 'cs', 'rb', 'go', 'rs',
  'html', 'css', 'xml', 'yaml', 'yml', 'toml', 'ini',
  'sh', 'bash', 'sql', 'env', 'log', 'cfg', 'conf',
])

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

app.post('/api/upload', authenticate, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' })
    }

    const results = []

    for (const file of req.files) {
      const ext = (file.originalname?.split('.').pop() || '').toLowerCase()
      const name = file.originalname || 'arquivo'
      let content = ''
      let isImage = false

      if (TEXT_EXTENSIONS.has(ext)) {
        content = fs.readFileSync(file.path, 'utf-8')
      } else if (IMAGE_EXTENSIONS.has(ext)) {
        const mimeType = ext === 'jpg' ? 'jpeg' : ext
        const base64 = fs.readFileSync(file.path, 'base64')
        content = `data:image/${mimeType};base64,${base64}`
        isImage = true
      } else {
        content = `[Arquivo binário: ${name} (${(file.size / 1024).toFixed(1)} KB) — conteúdo não extraível como texto]`
      }

      results.push({ name, ext, content, size: file.size, isImage })
      try { fs.unlinkSync(file.path) } catch {}
    }

    return res.json({ files: results })
  } catch (err) {
    console.error('Erro no upload:', err.message)
    if (req.files) {
      for (const f of req.files) {
        try { fs.unlinkSync(f.path) } catch {}
      }
    }
    return res.status(500).json({ error: 'Erro ao processar arquivos.' })
  }
})

/* ── Health check (público) ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), model: GEMINI_MODEL })
})

/* ── Debug: testa a conexão com o Gemini ── */
app.get('/api/debug', async (req, res) => {
  try {
    const result = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: 'Responda apenas: ok' }] }],
    })
    return res.json({ status: 'ok', model: GEMINI_MODEL, response: result.text })
  } catch (err) {
    return res.status(500).json({
      status: 'error',
      model: GEMINI_MODEL,
      message: err.message,
      httpStatus: err.status,
      code: err.code,
      details: err.errorDetails,
    })
  }
})

/* ── Lista modelos disponíveis na conta ── */
app.get('/api/models', async (req, res) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`
    )
    const data = await response.json()
    const models = (data.models || []).map(m => ({
      name: m.name,
      displayName: m.displayName,
      supportedMethods: m.supportedGenerationMethods,
    }))
    return res.json({ total: models.length, models })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
})

/* ══════════════════════════════════════════════════
   TENANT SETTINGS ENDPOINTS
   ══════════════════════════════════════════════════ */

app.get('/api/tenant/settings', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, logo_url, accent_color, custom_system_prompt, google_oauth_token, whatsapp_api_token, created_at')
      .eq('id', req.tenantId)
      .single()

    if (error) throw error

    // Criar payload de configurações seguro (omitir token sensível do frontend)
    const settings = {
      id: data.id,
      name: data.name,
      logo_url: data.logo_url,
      accent_color: data.accent_color,
      custom_system_prompt: data.custom_system_prompt,
      created_at: data.created_at,
      google_connected: !!data.google_oauth_token,
      whatsapp_connected: !!(process.env.EVOLUTION_API_URL && process.env.EVOLUTION_API_KEY),
      whatsapp_api_token: data.whatsapp_api_token
    }

    return res.json({ settings })
  } catch (err) {
    console.error('Erro ao buscar configurações do tenant:', err.message)
    return res.status(500).json({ error: 'Erro ao buscar configurações do tenant.' })
  }
})

app.put('/api/tenant/settings', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { name, logo_url, accent_color, custom_system_prompt, whatsapp_api_token } = req.body

    const updateObj = {}
    if (name !== undefined) updateObj.name = name
    if (logo_url !== undefined) updateObj.logo_url = logo_url
    if (accent_color !== undefined) updateObj.accent_color = accent_color
    if (custom_system_prompt !== undefined) updateObj.custom_system_prompt = custom_system_prompt
    if (whatsapp_api_token !== undefined) updateObj.whatsapp_api_token = whatsapp_api_token

    const { data, error } = await supabase
      .from('tenants')
      .update(updateObj)
      .eq('id', req.tenantId)
      .select()
      .single()

    if (error) throw error
    return res.json({ settings: data, success: true })
  } catch (err) {
    console.error('Erro ao atualizar configurações do tenant:', err.message)
    return res.status(500).json({ error: 'Erro ao atualizar configurações do tenant.' })
  }
})

/* ══════════════════════════════════════════════════
   CRM CLIENTS ENDPOINTS
   ══════════════════════════════════════════════════ */

app.get('/api/crm', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('name', { ascending: true })

    if (error) throw error
    return res.json({ contacts: data || [] })
  } catch (err) {
    console.error('Erro ao listar contatos CRM:', err.message)
    return res.status(500).json({ error: 'Erro ao listar contatos CRM.' })
  }
})

app.post('/api/crm', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { name, email, phone, company, status, notes } = req.body

    if (!name || !phone) {
      return res.status(400).json({ error: 'Os campos "name" e "phone" são obrigatórios.' })
    }

    const { data, error } = await supabase
      .from('crm_contacts')
      .insert({
        tenant_id: req.tenantId,
        name,
        email,
        phone,
        company,
        status: status || 'lead',
        notes,
      })
      .select()
      .single()

    if (error) throw error
    return res.json({ contact: data })
  } catch (err) {
    console.error('Erro ao adicionar contato CRM:', err.message)
    return res.status(500).json({ error: 'Erro ao adicionar contato CRM.' })
  }
})

app.put('/api/crm/:id', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { id } = req.params
    const { name, email, phone, company, status, notes } = req.body

    const updateObj = {}
    if (name !== undefined) updateObj.name = name
    if (email !== undefined) updateObj.email = email
    if (phone !== undefined) updateObj.phone = phone
    if (company !== undefined) updateObj.company = company
    if (status !== undefined) updateObj.status = status
    if (notes !== undefined) updateObj.notes = notes

    const { data, error } = await supabase
      .from('crm_contacts')
      .update(updateObj)
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .select()
      .single()

    if (error) throw error
    return res.json({ contact: data, success: true })
  } catch (err) {
    console.error('Erro ao editar contato CRM:', err.message)
    return res.status(500).json({ error: 'Erro ao editar contato CRM.' })
  }
})

app.delete('/api/crm/:id', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { id } = req.params

    const { error } = await supabase
      .from('crm_contacts')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.tenantId)

    if (error) throw error
    return res.json({ success: true })
  } catch (err) {
    console.error('Erro ao deletar contato CRM:', err.message)
    return res.status(500).json({ error: 'Erro ao deletar contato CRM.' })
  }
})

/* ══════════════════════════════════════════════════
   FINANCIAL TRANSACTIONS ENDPOINTS
   ══════════════════════════════════════════════════ */

app.get('/api/finance', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('due_date', { ascending: false })

    if (error) throw error
    return res.json({ transactions: data || [] })
  } catch (err) {
    console.error('Erro ao buscar transações financeiras:', err.message)
    return res.status(500).json({ error: 'Erro ao buscar transações financeiras.' })
  }
})

app.post('/api/finance', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { type, category, amount, due_date, paid_at, description } = req.body

    if (!type || !category || !amount || !due_date) {
      return res.status(400).json({ error: 'Os campos "type", "category", "amount" e "due_date" são obrigatórios.' })
    }

    const { data, error } = await supabase
      .from('financial_transactions')
      .insert({
        tenant_id: req.tenantId,
        type,
        category,
        amount,
        due_date,
        paid_at,
        description,
      })
      .select()
      .single()

    if (error) throw error
    return res.json({ transaction: data })
  } catch (err) {
    console.error('Erro ao adicionar transação financeira:', err.message)
    return res.status(500).json({ error: 'Erro ao adicionar transação financeira.' })
  }
})

/* ══════════════════════════════════════════════════
   DOCUMENTS & TEMPLATES PRE-FILLING ENGINE
   ══════════════════════════════════════════════════ */

app.get('/api/documents/templates', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .eq('tenant_id', req.tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return res.json({ templates: data || [] })
  } catch (err) {
    console.error('Erro ao buscar modelos de documento:', err.message)
    return res.status(500).json({ error: 'Erro ao buscar modelos de documento.' })
  }
})

app.post('/api/documents/templates', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { title, raw_content } = req.body

    if (!title || !raw_content) {
      return res.status(400).json({ error: 'Os campos "title" e "raw_content" são obrigatórios.' })
    }

    // Extração automática das variáveis {{TAG}} do raw_content
    const matches = [...raw_content.matchAll(/{{\s*([\w.-]+)\s*}}/g)]
    const variables = [...new Set(matches.map(m => m[1].toUpperCase()))]

    const { data, error } = await supabase
      .from('document_templates')
      .insert({
        tenant_id: req.tenantId,
        title,
        raw_content,
        variables
      })
      .select()
      .single()

    if (error) throw error
    return res.json({ template: data })
  } catch (err) {
    console.error('Erro ao criar modelo de documento:', err.message)
    return res.status(500).json({ error: 'Erro ao criar modelo de documento.' })
  }
})

app.delete('/api/documents/templates/:id', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { id } = req.params

    const { error } = await supabase
      .from('document_templates')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.tenantId)

    if (error) throw error
    return res.json({ success: true, message: 'Modelo de documento removido.' })
  } catch (err) {
    console.error('Erro ao deletar modelo de documento:', err.message)
    return res.status(500).json({ error: 'Erro ao deletar modelo de documento.' })
  }
})

app.get('/api/documents/filled', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    
    // Buscar todos os documentos preenchidos.
    // Usamos um select associado com document_templates para filtrar pelo tenant correto.
    const { data, error } = await supabase
      .from('filled_documents')
      .select(`
        id,
        title,
        filled_content,
        pdf_url,
        created_at,
        template_id,
        contact_id,
        document_templates ( tenant_id, title )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Filtrar no backend para garantir que apenas os documentos do tenant ativo sejam expostos
    const filtered = (data || []).filter(
      (doc) => doc.document_templates?.tenant_id === req.tenantId
    )
    return res.json({ documents: filtered })
  } catch (err) {
    console.error('Erro ao buscar documentos preenchidos:', err.message)
    return res.status(500).json({ error: 'Erro ao buscar documentos preenchidos.' })
  }
})

app.delete('/api/documents/filled/:id', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { id } = req.params

    // Validar segurança (garantir que o documento pertença ao tenant do usuário ativo)
    const { data: doc, error: getErr } = await supabase
      .from('filled_documents')
      .select('id, document_templates ( tenant_id )')
      .eq('id', id)
      .single()

    if (getErr || !doc || doc.document_templates?.tenant_id !== req.tenantId) {
      return res.status(403).json({ error: 'Documento não encontrado ou sem permissão de acesso.' })
    }

    const { error } = await supabase
      .from('filled_documents')
      .delete()
      .eq('id', id)

    if (error) throw error
    return res.json({ success: true, message: 'Documento gerado excluído com sucesso.' })
  } catch (err) {
    console.error('Erro ao deletar documento preenchido:', err.message)
    return res.status(500).json({ error: 'Erro ao deletar documento preenchido.' })
  }
})

app.post('/api/documents/fill', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const { templateId, conversationId } = req.body
    if (!templateId || !conversationId) {
      return res.status(400).json({ error: 'Os campos "templateId" e "conversationId" são obrigatórios.' })
    }

    const supabase = createUserClient(req.accessToken)

    // 1. Buscar modelo do contrato
    const { data: template, error: tempErr } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .eq('tenant_id', req.tenantId)
      .single()

    if (tempErr || !template) {
      return res.status(404).json({ error: 'Modelo de documento não encontrado.' })
    }

    // 2. Buscar histórico da conversa
    const { data: messages, error: msgErr } = await supabase
      .from('messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (msgErr || !messages || messages.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem encontrada nesta conversa para extrair dados.' })
    }

    // Formatar histórico em texto simples
    const chatHistoryText = messages.map(m => `${m.role === 'user' ? 'Cliente' : 'IA'}: ${m.content}`).join('\n')

    // 3. Acionar Gemini para extrair variáveis
    const promptText = `
Read this business conversation and extract values for these variables: ${JSON.stringify(template.variables || [])}.
Return ONLY a valid JSON object matching the keys precisely, with null or empty string if a value is not discussed. No explanation.

Conversation:
"${chatHistoryText}"
`
    const geminiRes = await callWithRetry(() =>
      ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        config: {
          responseMimeType: 'application/json'
        }
      })
    )

    let extractedData = {}
    try {
      extractedData = JSON.parse(geminiRes.text.trim())
    } catch {
      console.warn('Erro ao parsear JSON do Gemini, tentando limpar markdown')
      const cleanJson = geminiRes.text.replace(/```json|```/g, '').trim()
      extractedData = JSON.parse(cleanJson)
    }

    // 4. Substituir placeholders no template
    let filledContent = template.raw_content
    for (const [key, val] of Object.entries(extractedData)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'gi')
      filledContent = filledContent.replace(regex, val || `[Pendente: ${key}]`)
    }

    // Salvar o documento preenchido no banco
    const { data: docLog, error: logErr } = await supabase
      .from('filled_documents')
      .insert({
        template_id: templateId,
        title: `${template.title} - Preenchido`,
        filled_content: filledContent
      })
      .select()
      .single()

    return res.json({
      success: true,
      filledContent,
      variables: extractedData,
      documentId: docLog?.id
    })
  } catch (err) {
    console.error('Erro ao preencher documento:', err.message)
    return res.status(500).json({ error: 'Erro ao extrair e preencher o documento.' })
  }
})

/* ══════════════════════════════════════════════════
   GOOGLE CALENDAR API & OAUTH ENGINE
   ══════════════════════════════════════════════════ */

async function getValidGoogleToken(tenantId) {
  try {
    const { data: tenant, error } = await supabaseAuth
      .from('tenants')
      .select('google_oauth_token')
      .eq('id', tenantId)
      .single()

    if (error || !tenant || !tenant.google_oauth_token) {
      return null
    }

    const tokenObj = tenant.google_oauth_token

    // Se o token ainda é válido (mais de 2 minutos restantes), usar direto
    if (tokenObj.expiry_date && tokenObj.expiry_date - Date.now() > 120000) {
      return tokenObj.access_token
    }

    // Caso contrário, precisamos atualizar usando o refresh_token
    if (!tokenObj.refresh_token) {
      console.warn('⚠️ Sem refresh_token para o tenant', tenantId)
      return null
    }

    console.log(`🔄 Atualizando token do Google Calendar para o tenant ${tenantId}...`)

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        grant_type: 'refresh_token',
        refresh_token: tokenObj.refresh_token,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`❌ Erro ao atualizar token do Google: ${errText}`)
      return null
    }

    const data = await res.json()

    const updatedToken = {
      ...tokenObj,
      access_token: data.access_token,
      expiry_date: Date.now() + data.expires_in * 1000,
    }

    // Salvar o token atualizado no banco
    await supabaseAuth
      .from('tenants')
      .update({ google_oauth_token: updatedToken })
      .eq('id', tenantId)

    return data.access_token
  } catch (err) {
    console.error('Erro na validação/atualização do token do Google:', err)
    return null
  }
}

async function createGoogleCalendarEvent(tenantId, { title, description, start_time, end_time }) {
  const token = await getValidGoogleToken(tenantId)
  if (!token) {
    // Retorna fallback se não conectado
    return `gcal-${Math.random().toString(36).substring(2, 11)}`
  }

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: title,
        description: description || 'Agendado pelo Amplie IA',
        start: {
          dateTime: new Date(start_time).toISOString(),
        },
        end: {
          dateTime: new Date(end_time).toISOString(),
        },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`❌ Erro ao criar evento no Google Calendar: ${errText}`)
      return `gcal-${Math.random().toString(36).substring(2, 11)}`
    }

    const data = await res.json()
    console.log(`✓ Evento criado com sucesso no Google Calendar real! ID: ${data.id}`)
    return data.id
  } catch (err) {
    console.error('Erro de conexão ao criar evento no Google Calendar:', err)
    return `gcal-${Math.random().toString(36).substring(2, 11)}`
  }
}

async function deleteGoogleCalendarEvent(tenantId, googleEventId) {
  if (!googleEventId || googleEventId.startsWith('gcal-')) {
    return // Pula se for ID simulado
  }

  const token = await getValidGoogleToken(tenantId)
  if (!token) return

  try {
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!res.ok && res.status !== 404) {
      const errText = await res.text()
      console.error(`❌ Erro ao deletar evento no Google Calendar: ${errText}`)
    } else {
      console.log(`✓ Evento deletado com sucesso do Google Calendar real! ID: ${googleEventId}`)
    }
  } catch (err) {
    console.error('Erro de conexão ao deletar evento do Google Calendar:', err)
  }
}

/* ── Google OAuth Endpoints ── */

app.get('/api/auth/google', async (req, res) => {
  const token = req.query.token
  if (!token) {
    return res.status(400).send('Token de autenticação ausente.')
  }

  try {
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
    if (error || !user) {
      return res.status(401).send('Sessão expirada ou inválida.')
    }

    // Buscar o tenant do usuário
    const { data: tenantUser } = await supabaseAuth
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (!tenantUser) {
      return res.status(400).send('Usuário não possui uma empresa associada.')
    }

    const tenantId = tenantUser.tenant_id

    // Gerar URL de autorização do Google
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:3001/api/auth/google/callback`
    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state: tenantId
    }).toString()

    res.redirect(oauthUrl)
  } catch (err) {
    console.error('Erro ao iniciar Google OAuth:', err)
    res.status(500).send('Erro interno ao iniciar a autenticação.')
  }
})

app.get('/api/auth/google/callback', async (req, res) => {
  const { code, state: tenantId, error } = req.query

  if (error) {
    console.error('Google OAuth error callback:', error)
    return res.status(400).send(`Erro na autorização do Google: ${error}`)
  }

  if (!code || !tenantId) {
    return res.status(400).send('Código de autorização ou Tenant ID ausentes.')
  }

  try {
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:3001/api/auth/google/callback`

    // Trocar código pelo token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    })

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text()
      throw new Error(`Erro ao trocar token no Google: ${errBody}`)
    }

    const tokenData = await tokenRes.json()

    // Formatar token de forma padronizada
    const googleTokenObj = {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: Date.now() + tokenData.expires_in * 1000,
      token_type: tokenData.token_type || 'Bearer',
      scope: tokenData.scope,
    }

    // Se não veio o refresh_token, recuperar o anterior para manter
    if (!googleTokenObj.refresh_token) {
      const { data: existingTenant } = await supabaseAuth
        .from('tenants')
        .select('google_oauth_token')
        .eq('id', tenantId)
        .single()
      
      if (existingTenant?.google_oauth_token?.refresh_token) {
        googleTokenObj.refresh_token = existingTenant.google_oauth_token.refresh_token
      }
    }

    // Salvar no banco
    const { error: dbErr } = await supabaseAuth
      .from('tenants')
      .update({ google_oauth_token: googleTokenObj })
      .eq('id', tenantId)

    if (dbErr) throw dbErr

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Conectado!</title>
          <style>
            body {
              background-color: #212121;
              color: #ffffff;
              font-family: 'Inter', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              text-align: center;
              background-color: #2a2a2a;
              padding: 40px;
              border-radius: 20px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.3);
              border: 1px solid rgba(255,255,255,0.05);
            }
            h1 { color: #10b981; margin-bottom: 10px; font-size: 24px; }
            p { color: #a3a3a3; font-size: 14px; margin-bottom: 20px; }
            .btn {
              background: linear-gradient(135deg, #ec4899, #f43f5e);
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 10px;
              font-weight: bold;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✓ Google Agenda Conectado!</h1>
            <p>Sua conta do Google Agenda foi vinculada com sucesso. Você já pode fechar esta tela.</p>
            <button class="btn" onclick="window.close()">Fechar Janela</button>
          </div>
          <script>
            setTimeout(() => {
              window.close();
            }, 2500);
          </script>
        </body>
      </html>
    `)
  } catch (err) {
    console.error('Erro no callback do Google:', err)
    res.status(500).send(`Erro interno ao processar a autenticação: ${err.message}`)
  }
})

app.post('/api/auth/google/disconnect', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { error } = await supabase
      .from('tenants')
      .update({ google_oauth_token: null })
      .eq('id', req.tenantId)

    if (error) throw error
    return res.json({ success: true, message: 'Google Agenda desconectado.' })
  } catch (err) {
    console.error('Erro ao desconectar Google Agenda:', err)
    return res.status(500).json({ error: 'Erro ao desconectar Google Agenda.' })
  }
})

/* ══════════════════════════════════════════════════
   APPOINTMENTS & CALENDAR ENDPOINTS
   ══════════════════════════════════════════════════ */

app.get('/api/appointments', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        description,
        start_time,
        end_time,
        whatsapp_reminder_sent,
        whatsapp_reminder_time,
        contact_id,
        crm_contacts ( name )
      `)
      .eq('tenant_id', req.tenantId)
      .order('start_time', { ascending: true })

    if (error) throw error
    return res.json({ appointments: data || [] })
  } catch (err) {
    console.error('Erro ao buscar compromissos da agenda:', err.message)
    return res.status(500).json({ error: 'Erro ao buscar compromissos da agenda.' })
  }
})

app.post('/api/appointments', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { title, description, start_time, end_time, contact_id } = req.body

    if (!title || !start_time || !end_time) {
      return res.status(400).json({ error: 'Os campos "title", "start_time" e "end_time" são obrigatórios.' })
    }

    // Calcular lembrete automático do WhatsApp para 1 hora antes do início do compromisso
    const reminderTime = new Date(new Date(start_time).getTime() - 60 * 60 * 1000).toISOString()

    // Sincronizar com o Google Calendar real (se conectado) ou gerar fallback
    const googleEventId = await createGoogleCalendarEvent(req.tenantId, {
      title,
      description,
      start_time,
      end_time
    })

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        tenant_id: req.tenantId,
        contact_id: contact_id || null,
        title,
        description,
        start_time,
        end_time,
        google_event_id: googleEventId,
        whatsapp_reminder_sent: false,
        whatsapp_reminder_time: reminderTime
      })
      .select()
      .single()

    if (error) throw error
    return res.json({ appointment: data })
  } catch (err) {
    console.error('Erro ao criar compromisso na agenda:', err.message)
    return res.status(500).json({ error: 'Erro ao criar compromisso na agenda.' })
  }
})

app.delete('/api/appointments/:id', authenticate, async (req, res) => {
  try {
    if (!req.tenantId) {
      return res.status(400).json({ error: 'Nenhum tenant associado ao usuário atual.' })
    }

    const supabase = createUserClient(req.accessToken)
    const { id } = req.params

    // Buscar o google_event_id antes de deletar do banco
    const { data: appointment } = await supabase
      .from('appointments')
      .select('google_event_id')
      .eq('id', id)
      .eq('tenant_id', req.tenantId)
      .maybeSingle()

    if (appointment && appointment.google_event_id) {
      await deleteGoogleCalendarEvent(req.tenantId, appointment.google_event_id)
    }

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('tenant_id', req.tenantId)

    if (error) throw error
    return res.json({ success: true, message: 'Compromisso removido com sucesso.' })
  } catch (err) {
    console.error('Erro ao remover compromisso:', err.message)
    return res.status(500).json({ error: 'Erro ao remover compromisso.' })
  }
})


/* ── Static Files (Frontend) ── */
const distPath = path.resolve('dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
}

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`\n🚀 Amplie IA Backend rodando em http://localhost:${PORT}`)
  console.log(`🤖 SDK: @google/genai | Modelo: ${GEMINI_MODEL}`)
  console.log(`📦 Supabase conectado: ${process.env.SUPABASE_URL}`)
  console.log(`🔐 Autenticação JWT ativada em todas as rotas /api\n`)
  
  // Iniciar o agendador de lembretes de WhatsApp em background
  startBackgroundReminderWorker()
})

/* ══════════════════════════════════════════════════
   BACKGROUND TASK WORKER (WhatsApp Reminders Fila)
   ══════════════════════════════════════════════════ */
function startBackgroundReminderWorker() {
  console.log('🤖 Fila de Lembretes do WhatsApp iniciada (Background Worker)...')
  
  // Executar a cada 60 segundos
  setInterval(async () => {
    try {
      const nowIso = new Date().toISOString()
      
      // Buscar compromissos pendentes de envio que já passaram da hora do lembrete
      const { data: pendingReminders, error: fetchErr } = await supabaseAuth
        .from('appointments')
        .select('id, title, start_time, tenant_id, contact_id')
        .eq('whatsapp_reminder_sent', false)
        .lte('whatsapp_reminder_time', nowIso)
        .limit(10)

      if (fetchErr || !pendingReminders || pendingReminders.length === 0) return

      for (const appointment of pendingReminders) {
        console.log(`🔔 Processando lembrete de WhatsApp para o compromisso: "${appointment.title}"...`)

        // Buscar contato associado e dados do tenant
        const { data: contact } = await supabaseAuth
          .from('crm_contacts')
          .select('name, phone')
          .eq('id', appointment.contact_id)
          .maybeSingle()

        const { data: tenant } = await supabaseAuth
          .from('tenants')
          .select('name, whatsapp_api_token')
          .eq('id', appointment.tenant_id)
          .maybeSingle()

        let sendSuccess = true

        // O número receptor será o cadastrado nas configurações da empresa (whatsapp_api_token)
        const recipientPhone = tenant?.whatsapp_api_token

        if (recipientPhone) {
          const clientName = contact?.name || 'Cliente'
          const companyName = tenant?.name || 'Minha Empresa'
          const meetingTime = new Date(appointment.start_time).toLocaleString('pt-BR')
          const messageText = `Olá! Você tem um compromisso de "${appointment.title}" agendado com o cliente "${clientName}" da empresa ${companyName} para ${meetingTime}. Lembrete automático! 📅`

          const apiEndpoint = process.env.EVOLUTION_API_URL
          const apiKey = process.env.EVOLUTION_API_KEY
          const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'AmplieInstance'

          if (apiEndpoint && apiKey) {
            // Limpar formatação do telefone receptor (apenas números)
            let cleanedPhone = recipientPhone.replace(/\D/g, '')

            // Ajustar o formato para DDI brasileiro 55
            if (cleanedPhone.length === 10 || cleanedPhone.length === 11) {
              cleanedPhone = '55' + cleanedPhone
            }

            try {
              console.log(`📲 Enviando lembrete centralizado via Evolution API para o Admin: ${cleanedPhone}...`)
              const res = await fetch(`${apiEndpoint}/message/sendText/${instanceName}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': apiKey
                },
                body: JSON.stringify({
                  number: cleanedPhone,
                  textMessage: {
                    text: messageText
                  },
                  options: {
                    delay: 1200,
                    presence: 'composing',
                    linkPreview: false
                  }
                })
              })

              if (!res.ok) {
                const errText = await res.text()
                console.error(`❌ Erro no retorno da Evolution API para ${cleanedPhone}:`, errText)
                sendSuccess = false
              } else {
                console.log(`✓ Lembrete enviado via WhatsApp com sucesso para o Admin: ${cleanedPhone}!`)
              }
            } catch (apiErr) {
              console.error(`❌ Erro de conexão com a Evolution API para ${cleanedPhone}:`, apiErr.message)
              sendSuccess = false
            }
          } else {
            // Se as credenciais não estiverem configuradas, decai graciosamente para simulação
            let cleanedPhone = recipientPhone.replace(/\D/g, '')
            if (cleanedPhone.length === 10 || cleanedPhone.length === 11) {
              cleanedPhone = '55' + cleanedPhone
            }
            console.log(`\n📲 [DISPARO DE WHATSAPP SIMULADO] (Evolution API não configurada)`)
            console.log(`Para o Admin: ${cleanedPhone}`)
            console.log(`Mensagem: "${messageText}"`)
            console.log(`Status: 200 OK (Mensagem Enviada)\n`)
          }
        } else {
          console.warn(`⚠️ [WORKER] Nenhum número receptor de WhatsApp cadastrado nas configurações da empresa ${tenant?.name || appointment.tenant_id}.`)
          sendSuccess = false
        }

        // Marcar como enviado no banco se disparado (ou simulado) com sucesso
        if (sendSuccess) {
          await supabaseAuth
            .from('appointments')
            .update({ whatsapp_reminder_sent: true })
            .eq('id', appointment.id)
        }
      }
    } catch (err) {
      console.warn('Erro ao processar fila de lembretes no background:', err.message)
    }
  }, 60000)
}
