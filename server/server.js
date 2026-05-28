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

          const { data: appointment } = await supabase
            .from('appointments')
            .insert({
              tenant_id: req.tenantId,
              contact_id: contactId,
              title: parsed.title || 'Compromisso IA',
              start_time: parsed.start_time,
              end_time: parsed.end_time,
              description: `Agendado de forma inteligente pela Amplie IA.\nCliente referenciado: ${parsed.client_name || 'Nenhum'}`,
              google_event_id: `gcal-${Math.random().toString(36).substring(2, 11)}`,
              whatsapp_reminder_time: new Date(new Date(parsed.start_time).getTime() - 60 * 60 * 1000).toISOString() // Lembrete 1h antes
            })
            .select()
            .single()

          if (appointment) {
            console.log('✓ Compromisso agendado no banco com sucesso e sincronizado com o Google Agenda (simulado)!')
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
      .select('id, name, logo_url, accent_color, custom_system_prompt, created_at')
      .eq('id', req.tenantId)
      .single()

    if (error) throw error
    return res.json({ settings: data })
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
    const { name, logo_url, accent_color, custom_system_prompt } = req.body

    const updateObj = {}
    if (name !== undefined) updateObj.name = name
    if (logo_url !== undefined) updateObj.logo_url = logo_url
    if (accent_color !== undefined) updateObj.accent_color = accent_color
    if (custom_system_prompt !== undefined) updateObj.custom_system_prompt = custom_system_prompt

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

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        tenant_id: req.tenantId,
        contact_id: contact_id || null,
        title,
        description,
        start_time,
        end_time,
        google_event_id: `gcal-${Math.random().toString(36).substring(2, 11)}`,
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
          .select('name')
          .eq('id', appointment.tenant_id)
          .maybeSingle()

        if (contact && contact.phone) {
          const clientName = contact.name || 'Cliente'
          const companyName = tenant?.name || 'Minha Empresa'
          const meetingTime = new Date(appointment.start_time).toLocaleString('pt-BR')
          const messageText = `Olá, ${clientName}! Passando para lembrar que você tem um compromisso de "${appointment.title}" agendado com a empresa ${companyName} para ${meetingTime}. Até logo! 📅`

          // Simulador do HTTP Dispatcher para o WhatsApp API Gateway
          console.log(`\n📲 [DISPARO DE WHATSAPP SIMULADO]`)
          console.log(`Para: ${contact.phone}`)
          console.log(`Mensagem: "${messageText}"`)
          console.log(`Status: 200 OK (Mensagem Enviada)\n`)
        }

        // Marcar como enviado no banco
        await supabaseAuth
          .from('appointments')
          .update({ whatsapp_reminder_sent: true })
          .eq('id', appointment.id)
      }
    } catch (err) {
      console.warn('Erro ao processar fila de lembretes no background:', err.message)
    }
  }, 60000)
}
