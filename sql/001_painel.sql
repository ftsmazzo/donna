-- Painel Donna (sem dados Pazotti)
CREATE TABLE IF NOT EXISTS usuarios_painel (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'corretor' CHECK (papel IN ('admin', 'corretor')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS atendimentos_agente (
  telefone TEXT PRIMARY KEY,
  modo TEXT NOT NULL DEFAULT 'ia' CHECK (modo IN ('ia', 'humano')),
  operador_id INTEGER REFERENCES usuarios_painel(id) ON DELETE SET NULL,
  assumido_em TIMESTAMPTZ,
  devolvido_em TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mensagens_agente (
  id BIGSERIAL PRIMARY KEY,
  telefone TEXT NOT NULL,
  direcao TEXT NOT NULL CHECK (direcao IN ('inbound', 'outbound_ia', 'outbound_humano')),
  texto TEXT NOT NULL DEFAULT '',
  id_mensagem_wa TEXT UNIQUE,
  instancia TEXT,
  operador_id INTEGER REFERENCES usuarios_painel(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mensagens_telefone_created
  ON mensagens_agente (telefone, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mensagens_created
  ON mensagens_agente (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_atendimentos_modo
  ON atendimentos_agente (modo);

-- Admin demo: criar depois com hash bcrypt (não copiar usuário Pazotti)
-- Ex.: e-mail admin@donna.local
