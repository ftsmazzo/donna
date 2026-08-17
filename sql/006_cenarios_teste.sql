-- Cenarios manuais da demo. Nao rode no deploy automatico.
-- Peca no chat: "planta historico unha", "ocupa quinta 14h", "poe Fred na espera".

-- 1) Cliente com unha feita ha 3 semanas (telefone do Zap de teste)
-- INSERT INTO agendamentos_donna (telefone, nome, unidade_id, servico_codigo, inicio, duracao_min, preco_centavos, status)
-- SELECT '5516996480805', 'Fred', 'centro', 'MANIC', NOW() - INTERVAL '21 days', s.duracao_min, s.preco_centavos, 'feito'
-- FROM servicos_donna s WHERE s.codigo = 'MANIC';

-- 2) Travar um slot (troque o timestamptz)
-- INSERT INTO agendamentos_donna (telefone, nome, unidade_id, servico_codigo, inicio, duracao_min, preco_centavos, status)
-- SELECT '5516999990000', 'Cliente X', 'centro', 'HIDRA', '2026-08-20 14:00:00-03', s.duracao_min, s.preco_centavos, 'marcado'
-- FROM servicos_donna s WHERE s.codigo = 'HIDRA';

-- 3) Lista de espera nesse slot
-- INSERT INTO espera_donna (telefone, nome, unidade_id, servico_codigo, inicio)
-- VALUES ('5516996480805', 'Fred', 'centro', 'HIDRA', '2026-08-20 14:00:00-03');
