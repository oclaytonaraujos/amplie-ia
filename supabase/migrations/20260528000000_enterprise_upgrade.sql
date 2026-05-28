-- ══════════════════════════════════════════════
-- Amplie IA — Migração V2: Arquitetura Corporativa
-- ══════════════════════════════════════════════

-- 1. Tabela de Empresas (Tenants)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  accent_color TEXT DEFAULT 'pink',
  custom_system_prompt TEXT,
  whatsapp_api_token TEXT,
  google_oauth_token JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on tenants" ON tenants FOR ALL USING (true) WITH CHECK (true);

-- 2. Atualizar tabela de conversas com relação ao tenant
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- 3. Clientes do CRM
CREATE TABLE IF NOT EXISTS crm_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  company TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'cliente_ativo', 'suspenso', 'churn')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para crm_contacts
ALTER TABLE crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on crm_contacts" ON crm_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_tenant ON crm_contacts(tenant_id);

-- 4. Modelos de Documentos (Templates)
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT,
  raw_content TEXT NOT NULL, -- Conteúdo com as chaves {{CHAVE}}
  variables JSONB, -- Lista de tags esperadas no formato JSON array, ex: ["NOME", "VALOR"]
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para document_templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on document_templates" ON document_templates FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_document_templates_tenant ON document_templates(tenant_id);

-- Documentos Preenchidos
CREATE TABLE IF NOT EXISTS filled_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  filled_content TEXT NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para filled_documents
ALTER TABLE filled_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on filled_documents" ON filled_documents FOR ALL USING (true) WITH CHECK (true);

-- 5. Compromissos e Eventos (Agenda integrada)
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  google_event_id TEXT,
  whatsapp_reminder_sent BOOLEAN DEFAULT false,
  whatsapp_reminder_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para appointments
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on appointments" ON appointments FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON appointments(whatsapp_reminder_time) WHERE whatsapp_reminder_sent = false;

-- 6. Transações Financeiras (Gestão Financeira)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  category TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at DATE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS para financial_transactions
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on financial_transactions" ON financial_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_tenant ON financial_transactions(tenant_id);

-- 7. Relação de Usuários e Empresas (Mapeamento Tenant)
CREATE TABLE IF NOT EXISTS tenant_users (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'support')),
  PRIMARY KEY (tenant_id, user_id)
);

-- Habilitar RLS para tenant_users
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on tenant_users" ON tenant_users FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user ON tenant_users(user_id);
