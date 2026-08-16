-- Agenda do demo (fonte da verdade dos horários da Pati)

CREATE TABLE IF NOT EXISTS unidades_donna (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL
);

INSERT INTO unidades_donna (id, nome, endereco) VALUES
  ('centro', 'Donna Centro', 'Rua São Domingos, 412 — Centro, Catanduva/SP'),
  ('higienopolis', 'Donna Higienópolis', 'Avenida São Paulo, 1850 — Higienópolis, Catanduva/SP')
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, endereco = EXCLUDED.endereco;

CREATE TABLE IF NOT EXISTS servicos_donna (
  codigo TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  duracao_min INTEGER NOT NULL,
  preco_centavos INTEGER NOT NULL,
  unidades TEXT[] NOT NULL
);

INSERT INTO servicos_donna (codigo, nome, duracao_min, preco_centavos, unidades) VALUES
  ('CORTE', 'Corte feminino + finalização', 60, 9000, ARRAY['centro','higienopolis']),
  ('HIDRA', 'Hidratação + escova', 75, 14000, ARRAY['centro','higienopolis']),
  ('COLOR', 'Coloração (tom sobre tom)', 120, 22000, ARRAY['centro','higienopolis']),
  ('LUZES', 'Mechas / luzes', 180, 38000, ARRAY['centro']),
  ('DESIGN', 'Design de sobrancelha', 30, 4500, ARRAY['centro','higienopolis']),
  ('MANIC', 'Manicure', 45, 4000, ARRAY['centro','higienopolis']),
  ('PEDIC', 'Pedicure', 50, 4800, ARRAY['centro','higienopolis']),
  ('SPAU', 'Spa das mãos', 40, 7000, ARRAY['higienopolis'])
ON CONFLICT (codigo) DO UPDATE SET
  nome = EXCLUDED.nome,
  duracao_min = EXCLUDED.duracao_min,
  preco_centavos = EXCLUDED.preco_centavos,
  unidades = EXCLUDED.unidades;

CREATE TABLE IF NOT EXISTS agendamentos_donna (
  id BIGSERIAL PRIMARY KEY,
  telefone TEXT NOT NULL,
  nome TEXT,
  unidade_id TEXT NOT NULL REFERENCES unidades_donna(id),
  servico_codigo TEXT NOT NULL REFERENCES servicos_donna(codigo),
  inicio TIMESTAMPTZ NOT NULL,
  duracao_min INTEGER NOT NULL,
  preco_centavos INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'marcado' CHECK (status IN ('marcado', 'cancelado', 'feito')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamentos_inicio
  ON agendamentos_donna (inicio);

CREATE INDEX IF NOT EXISTS idx_agendamentos_telefone
  ON agendamentos_donna (telefone, inicio DESC);
