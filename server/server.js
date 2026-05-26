import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'
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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash'

/**
 * Cliente Supabase para verificação de JWT (usa anon key — seguro para auth.getUser)
 * A verificação de token NÃO requer service_role
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
  'Você é a Amplie IA, uma assistente inteligente, prestativa e concisa. ' +
  'Responda sempre em português brasileiro, de forma clara e objetiva. ' +
  'Use formatação quando apropriado para melhorar a legibilidade.'

/* ── Retry helper com backoff exponencial ── */
async function callWithRetry(fn, maxRetries = 3) {
  let lastError
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      const is429 = err.status === 429 || err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('Resource has been exhausted')
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
   Verifica o JWT do usuário em cada requisição protegida.
   Injeta req.userId e req.accessToken para uso nas rotas.
   ══════════════════════════════════════════════════ */

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticação necessária. Faça login para continuar.' })
  }

  const token = authHeader.replace('Bearer ', '').trim()

  try {
    // Verificar e decodificar o JWT via Supabase
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' })
    }

    // Injetar dados do usuário na requisição
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

/* ── List conversations (apenas do usuário logado) ── */
app.get('/api/conversations', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)

    const { data, error } = await supabase
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('user_id', req.userId) // double-check além do RLS
      .order('updated_at', { ascending: false })

    if (error) throw error
    return res.json({ conversations: data })
  } catch (err) {
    console.error('Erro ao listar conversas:', err.message)
    return res.status(500).json({ error: 'Erro ao listar conversas.' })
  }
})

/* ── Create conversation ── */
app.post('/api/conversations', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)
    const { title } = req.body

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title: title || 'Nova conversa',
        user_id: req.userId, // sempre o usuário logado
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

/* ── Delete conversation (apenas a própria) ── */
app.delete('/api/conversations/:id', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)
    const { id } = req.params

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', req.userId) // garante que só deleta a própria

    if (error) throw error
    return res.json({ success: true })
  } catch (err) {
    console.error('Erro ao deletar conversa:', err.message)
    return res.status(500).json({ error: 'Erro ao deletar conversa.' })
  }
})

/* ── Get messages of a conversation (apenas do usuário logado) ── */
app.get('/api/conversations/:id/messages', authenticate, async (req, res) => {
  try {
    const supabase = createUserClient(req.accessToken)
    const { id } = req.params

    // Primeiro: verificar que a conversa pertence ao usuário
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
      .eq('user_id', req.userId) // double-check
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
 * Converte um array de mensagens no formato OpenAI ({role, content})
 * para o formato Gemini ({role: 'user'|'model', parts: [...]}).
 *
 * Suporta:
 *  - Texto simples
 *  - Imagens inline codificadas em base64 via [IMAGE_ATTACHMENT:...]data:image/...[/IMAGE_ATTACHMENT]
 *  - Anexos de arquivo como texto
 */
function toGeminiHistory(messages) {
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

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]

    // Se temos conversationId, verificar que pertence ao usuário antes de inserir
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

      // Salvar mensagem do usuário
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: req.userId,
        role: lastUserMessage.role,
        content: lastUserMessage.content,
      })
    }

    // Separar histórico (sem a última mensagem) e a mensagem atual
    const history = toGeminiHistory(messages.slice(0, -1))
    const lastMsgParts = toGeminiHistory([lastUserMessage])[0].parts

    // Iniciar o modelo com system instruction
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: SYSTEM_INSTRUCTION,
    })

    // Criar sessão de chat com histórico
    const chat = model.startChat({
      history,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    })

    // Enviar a mensagem atual (com retry automático em caso de 429)
    const result = await callWithRetry(() => chat.sendMessage(lastMsgParts))
    const responseText = result.response.text()

    // Salvar resposta do assistente e atualizar título/updated_at
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: req.userId,
        role: 'assistant',
        content: responseText,
      })

      // Atualizar título automaticamente se ainda é o padrão
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
        // Trigger updated_at via update fictício (o trigger de banco cuida do timestamp)
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
    // Log completo do erro para diagnóstico nos logs do servidor
    console.error('=== ERRO na API Gemini ===')
    console.error('Mensagem:', err.message)
    console.error('Status HTTP:', err.status)
    console.error('Código:', err.code)
    console.error('Stack:', err.stack)
    if (err.errorDetails) console.error('Detalhes:', JSON.stringify(err.errorDetails))

    if (err.status === 401 || err.message?.includes('API key') || err.message?.includes('INVALID_ARGUMENT')) {
      return res.status(401).json({ error: 'Chave da API inválida.' })
    }
    const is429 = err.status === 429 || err.message?.includes('quota') || err.message?.includes('Resource has been exhausted') || err.message?.includes('429')
    if (is429) {
      console.error('Gemini quota excedida após retries:', err.message)
      return res.status(429).json({ error: 'Limite de uso da IA atingido. Aguarde alguns segundos e tente novamente.' })
    }
    if (err.status === 404 || err.message?.includes('not found') || err.message?.includes('404')) {
      return res.status(500).json({ error: `Modelo "${GEMINI_MODEL}" não encontrado. Verifique a variável GEMINI_MODEL.` })
    }

    return res.status(500).json({ error: 'Erro interno do servidor.' })
  }
})

/* ══════════════════════════════════════════════════
   AUDIO TRANSCRIPTION (Gemini multimodal)
   Envia o áudio diretamente para o Gemini e pede a transcrição.
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

    // Ler o áudio como base64
    const audioBase64 = fs.readFileSync(newPath, 'base64')

    // Mapear extensão para mime type
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

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })

    const result = await callWithRetry(() =>
      model.generateContent([
        {
          inlineData: {
            mimeType,
            data: audioBase64,
          },
        },
        {
          text: 'Transcreva o áudio a seguir com precisão, mantendo o texto exatamente como foi falado, sem adicionar pontuação desnecessária ou interpretar o conteúdo. Responda apenas com a transcrição, sem explicações.',
        },
      ])
    )

    // Cleanup temp file
    try { fs.unlinkSync(newPath) } catch {}

    const text = result.response.text().trim()
    return res.json({ text })
  } catch (err) {
    console.error('Erro na transcrição:', err.message)
    // Cleanup on error
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

      // Cleanup
      try { fs.unlinkSync(file.path) } catch {}
    }

    return res.json({ files: results })
  } catch (err) {
    console.error('Erro no upload:', err.message)
    // Cleanup on error
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

/* ── Debug: testa a conexão com o Gemini (público — remova em produção após diagnóstico) ── */
app.get('/api/debug', async (req, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL })
    const result = await model.generateContent('Responda apenas: ok')
    const text = result.response.text()
    return res.json({ status: 'ok', model: GEMINI_MODEL, response: text })
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
  console.log(`🤖 Modelo Gemini: ${GEMINI_MODEL}`)
  console.log(`📦 Supabase conectado: ${process.env.SUPABASE_URL}`)
  console.log(`🔐 Autenticação JWT ativada em todas as rotas /api\n`)
})
