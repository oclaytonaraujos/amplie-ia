import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import multer from 'multer'
import fs from 'fs'
import path from 'path'

/* ── Validate env ── */
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY não encontrada. Crie um arquivo .env com sua chave.')
  process.exit(1)
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ SUPABASE_URL ou SUPABASE_ANON_KEY não encontradas no .env')
  process.exit(1)
}

/* ── Setup ── */
const app = express()
const PORT = process.env.PORT || 3001

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

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
const SYSTEM_MESSAGE = {
  role: 'system',
  content:
    'Você é a Amplie IA, uma assistente inteligente, prestativa e concisa. ' +
    'Responda sempre em português brasileiro, de forma clara e objetiva. ' +
    'Use formatação quando apropriado para melhorar a legibilidade.',
}

/* ═══════════════════════════════════════════════
   CONVERSATIONS ENDPOINTS
   ═══════════════════════════════════════════════ */

/* ── List conversations ── */
app.get('/api/conversations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false })

    if (error) throw error
    return res.json({ conversations: data })
  } catch (err) {
    console.error('Erro ao listar conversas:', err.message)
    return res.status(500).json({ error: 'Erro ao listar conversas.' })
  }
})

/* ── Create conversation ── */
app.post('/api/conversations', async (req, res) => {
  try {
    const { title } = req.body
    const { data, error } = await supabase
      .from('conversations')
      .insert({ title: title || 'Nova conversa' })
      .select()
      .single()

    if (error) throw error
    return res.json({ conversation: data })
  } catch (err) {
    console.error('Erro ao criar conversa:', err.message)
    return res.status(500).json({ error: 'Erro ao criar conversa.' })
  }
})

/* ── Delete conversation ── */
app.delete('/api/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)

    if (error) throw error
    return res.json({ success: true })
  } catch (err) {
    console.error('Erro ao deletar conversa:', err.message)
    return res.status(500).json({ error: 'Erro ao deletar conversa.' })
  }
})

/* ── Get messages of a conversation ── */
app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return res.json({ messages: data })
  } catch (err) {
    console.error('Erro ao buscar mensagens:', err.message)
    return res.status(500).json({ error: 'Erro ao buscar mensagens.' })
  }
})

/* ═══════════════════════════════════════════════
   CHAT ENDPOINT (with persistence)
   ═══════════════════════════════════════════════ */

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, conversationId } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'O campo "messages" é obrigatório e deve ser um array.' })
    }

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1]

    // If we have a conversationId, save the user message to DB
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: lastUserMessage.role,
        content: lastUserMessage.content,
      })
    }

    // Prepend system message and call OpenAI
    const fullMessages = [SYSTEM_MESSAGE, ...messages].map((msg) => {
      if (typeof msg.content === 'string' && msg.content.includes('[IMAGE_ATTACHMENT:')) {
        const parts = []
        const regex = /\[IMAGE_ATTACHMENT:.*?\](data:image\/.*?;base64,[A-Za-z0-9+/=]+)\[\/IMAGE_ATTACHMENT\]/g
        let lastIndex = 0
        let match

        while ((match = regex.exec(msg.content)) !== null) {
          if (match.index > lastIndex) {
            parts.push({ type: 'text', text: msg.content.substring(lastIndex, match.index) })
          }
          parts.push({ type: 'image_url', image_url: { url: match[1] } })
          lastIndex = regex.lastIndex
        }
        if (lastIndex < msg.content.length) {
          parts.push({ type: 'text', text: msg.content.substring(lastIndex) })
        }
        return { ...msg, content: parts }
      }
      return msg
    })

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 2048,
    })

    const assistantMessage = completion.choices[0].message

    // Save assistant response to DB
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: assistantMessage.role,
        content: assistantMessage.content,
      })

      // Update conversation title if it's the first message (title is still default)
      const { data: conv } = await supabase
        .from('conversations')
        .select('title')
        .eq('id', conversationId)
        .single()

      if (conv && conv.title === 'Nova conversa') {
        const autoTitle = lastUserMessage.content.substring(0, 60) + (lastUserMessage.content.length > 60 ? '...' : '')
        await supabase
          .from('conversations')
          .update({ title: autoTitle, updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      } else {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
      }
    }

    return res.json({
      message: {
        role: assistantMessage.role,
        content: assistantMessage.content,
      },
    })
  } catch (err) {
    console.error('Erro na API OpenAI:', err.message)

    if (err.status === 401) {
      return res.status(401).json({ error: 'Chave da API inválida.' })
    }
    if (err.status === 429) {
      return res.status(429).json({ error: 'Limite de requisições excedido. Tente novamente em breve.' })
    }

    return res.status(500).json({ error: 'Erro interno do servidor.' })
  }
})

/* ═══════════════════════════════════════════════
   AUDIO TRANSCRIPTION (Whisper)
   ═══════════════════════════════════════════════ */

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo de áudio enviado.' })
    }

    const filePath = req.file.path
    const ext = req.file.originalname?.split('.').pop() || 'webm'
    const newPath = `${filePath}.${ext}`
    fs.renameSync(filePath, newPath)

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(newPath),
      model: 'whisper-1',
      language: 'pt',
    })

    // Cleanup temp file
    fs.unlinkSync(newPath)

    return res.json({ text: transcription.text })
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

/* ═══════════════════════════════════════════════
   FILE UPLOAD (extract text content)
   ═══════════════════════════════════════════════ */

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'json', 'csv', 'js', 'jsx', 'ts', 'tsx',
  'py', 'java', 'c', 'cpp', 'h', 'cs', 'rb', 'go', 'rs',
  'html', 'css', 'xml', 'yaml', 'yml', 'toml', 'ini',
  'sh', 'bash', 'sql', 'env', 'log', 'cfg', 'conf',
])

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])

app.post('/api/upload', upload.array('files', 5), async (req, res) => {
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

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

/* ── Static Files (Frontend) ── */
// Em produção (Docker), servimos a pasta 'dist' que contém o build do React/Vite
const distPath = path.resolve('dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  // Qualquer rota que não comece com /api retorna o index.html do frontend (para suportar o React Router)
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(distPath, 'index.html'))
    }
  })
}

/* ── Start ── */
app.listen(PORT, () => {
  console.log(`\n🚀 Amplie IA Backend rodando em http://localhost:${PORT}`)
  console.log(`📦 Supabase conectado: ${process.env.SUPABASE_URL}\n`)
})
