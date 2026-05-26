-- ══════════════════════════════════════════════════════════════════════
-- Amplie IA — Migration: Multi-user Auth + RLS
-- Arquivo: 20260526002355_multi_user_auth_chats_rls.sql
-- 
-- ⚠️  ATENÇÃO: Esta migration APAGA dados existentes sem user_id.
--     Tabelas afetadas: conversations, messages
-- ══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- 1. Limpar dados antigos (sem user_id, não reatribuíveis)
-- ────────────────────────────────────────────────────────────────────
TRUNCATE TABLE messages RESTART IDENTITY CASCADE;
TRUNCATE TABLE conversations RESTART IDENTITY CASCADE;


-- ────────────────────────────────────────────────────────────────────
-- 2. Adicionar user_id na tabela conversations
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Tornar NOT NULL (seguro: tabela já está vazia após TRUNCATE)
ALTER TABLE conversations
  ALTER COLUMN user_id SET NOT NULL;


-- ────────────────────────────────────────────────────────────────────
-- 3. Adicionar user_id na tabela messages
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE messages
  ALTER COLUMN user_id SET NOT NULL;


-- ────────────────────────────────────────────────────────────────────
-- 4. Índices de performance
-- ────────────────────────────────────────────────────────────────────

-- Conversas por usuário (para sidebar)
CREATE INDEX IF NOT EXISTS idx_conversations_user_id
  ON conversations(user_id);

-- Conversas por usuário ordenadas por data (query principal da sidebar)
CREATE INDEX IF NOT EXISTS idx_conversations_user_updated
  ON conversations(user_id, updated_at DESC);

-- Mensagens por conversa (query principal ao abrir um chat)
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON messages(conversation_id);

-- Mensagens por usuário (para políticas RLS)
CREATE INDEX IF NOT EXISTS idx_messages_user_id
  ON messages(user_id);

-- Ordenação de conversas
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at
  ON conversations(updated_at DESC);


-- ────────────────────────────────────────────────────────────────────
-- 5. Trigger: atualizar updated_at automaticamente
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_conversations_updated_at ON conversations;
CREATE TRIGGER set_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ────────────────────────────────────────────────────────────────────
-- 6. Row Level Security (RLS)
-- ────────────────────────────────────────────────────────────────────

-- Garantir que RLS está habilitado
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Remover políticas permissivas antigas (abertas para todos)
DROP POLICY IF EXISTS "Allow all on conversations" ON conversations;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;


-- ──────────────────────────────────────
-- Políticas para: conversations
-- ──────────────────────────────────────

-- Visualizar: apenas conversas próprias
CREATE POLICY "Users can view own conversations"
  ON conversations
  FOR SELECT
  USING (user_id = auth.uid());

-- Inserir: apenas com user_id próprio
CREATE POLICY "Users can insert own conversations"
  ON conversations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Atualizar: apenas conversas próprias
CREATE POLICY "Users can update own conversations"
  ON conversations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Deletar: apenas conversas próprias
CREATE POLICY "Users can delete own conversations"
  ON conversations
  FOR DELETE
  USING (user_id = auth.uid());


-- ──────────────────────────────────────
-- Políticas para: messages
-- ──────────────────────────────────────

-- Visualizar: apenas mensagens próprias
CREATE POLICY "Users can view own messages"
  ON messages
  FOR SELECT
  USING (user_id = auth.uid());

-- Inserir: com dupla validação — user_id próprio E chat pertence ao usuário
CREATE POLICY "Users can insert own messages"
  ON messages
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM conversations
      WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
  );

-- Deletar: apenas mensagens próprias
CREATE POLICY "Users can delete own messages"
  ON messages
  FOR DELETE
  USING (user_id = auth.uid());
