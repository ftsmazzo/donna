-- CRM mínimo do demo (não usar tabelas Pazotti)

CREATE TABLE IF NOT EXISTS contatos_donna (
  telefone_cliente TEXT PRIMARY KEY,
  nome_cliente TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_acoes_donna (
  id SERIAL PRIMARY KEY,
  telefone_cliente TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donna_historico (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL,
  message JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donna_hist_session ON donna_historico (session_id);
