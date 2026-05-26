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
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

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
  'Você é a Amplie IA, uma assistente pessoal inteligente desenvolvida oficialmente pela Amplie Marketing (https://www.amplie-marketing.com/). ' +
  'Se o usuário perguntar quem você é, o que você é, ou quem te desenvolveu, forneça sempre uma resposta de tamanho médio, bem descritiva, completa e profissional. ' +
  'Explique que você foi criada pela Amplie Marketing com o objetivo de otimizar processos, gerar insights, criar conteúdo e auxiliar nas tarefas do dia a dia com excelência. ' +
  'Você DEVE obrigatoriamente incluir no texto o link clicável da desenvolvedora em formato Markdown: [Amplie Marketing](https://www.amplie-marketing.com/). ' +
  'Certifique-se de que qualquer link enviado por você esteja formatado como Markdown correto: [Nome do Link](URL) para que seja renderizado como link clicável no chat. ' +
  'Responda sempre em português brasileiro de forma clara. ' +
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

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title: title || 'Nova conversa',
        user_id: req.userId,
      })
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

    /* ── Verificar se é pedido de geração de imagem ── */
    const userText = typeof lastUserMessage.content === 'string' ? lastUserMessage.content : ''
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

      // Criar sessão de chat com o novo SDK @google/genai
      const chat = ai.chats.create({
        model: GEMINI_MODEL,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
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
    console.error('=== ERRO no Chat/Imagem ===')
    console.error('Mensagem:', err.message)
    console.error('Status HTTP:', err.status)
    console.error('Código:', err.code)
    if (err.errorDetails) console.error('Detalhes:', JSON.stringify(err.errorDetails))

    if (err.status === 401 || err.message?.includes('API key') || err.message?.includes('API_KEY')) {
      return res.status(401).json({ error: 'Chave da API inválida.' })
    }
    const is429 =
      err.status === 429 ||
      err.message?.includes('quota') ||
      err.message?.includes('Resource has been exhausted') ||
      err.message?.includes('RESOURCE_EXHAUSTED') ||
      err.message?.includes('429')
    if (is429) {
      return res.status(429).json({ error: 'Limite de uso da IA atingido. Aguarde alguns segundos e tente novamente.' })
    }

    return res.status(500).json({ error: 'Erro interno do servidor.' })
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
    console.error('Erro na transcrição:', err.message)
    if (req.file?.path) {
      try { fs.unlinkSync(req.file.path) } catch {}
      try { fs.unlinkSync(req.file.path + '.' + (req.file.originalname?.split('.').pop() || 'webm')) } catch {}
    }
    return res.status(500).json({ error: 'Erro ao transcrever áudio.' })
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
})
