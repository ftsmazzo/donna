-- Lista de espera + um horário marcado por unidade.

CREATE TABLE IF NOT EXISTS espera_donna (
  id BIGSERIAL PRIMARY KEY,
  telefone TEXT NOT NULL,
  nome TEXT,
  unidade_id TEXT NOT NULL REFERENCES unidades_donna(id),
  servico_codigo TEXT NOT NULL REFERENCES servicos_donna(codigo),
  inicio TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'esperando'
    CHECK (status IN ('esperando', 'avisada', 'confirmada', 'expirou', 'cancelada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  avisada_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_agendamentos_slot_marcado
  ON agendamentos_donna (unidade_id, inicio)
  WHERE status = 'marcado';

CREATE UNIQUE INDEX IF NOT EXISTS uq_espera_ativa_cliente
  ON espera_donna (telefone, unidade_id, inicio)
  WHERE status IN ('esperando', 'avisada');

CREATE INDEX IF NOT EXISTS idx_espera_slot
  ON espera_donna (unidade_id, inicio, created_at)
  WHERE status = 'esperando';
