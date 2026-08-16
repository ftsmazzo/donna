# Donna — demo Pati

Agente WhatsApp do salão **Donna** (Catanduva) + painel de atendimento.

**Chat novo:** leia nesta ordem

1. `docs/DEMO-DONNA.md` — persona, catálogo, roteiro da reunião  
2. `docs/BLUEPRINT-NOVO-AGENTE.md` — stack e isolamento da Pazotti  

**Não** usar n8n/MCP/Postgres/Evolution da SofIA. Ver `docs/ISOLAMENTO.md`.

O agente (n8n) só entra no n8n **Luciano**. O painel e o SQL deste repo não encostam na Pazotti.

## Pastas

| Pasta / arquivo | Papel |
|-----------------|--------|
| `docs/` | Guias para o agente (único briefing necessário) |
| `sql/` | Painel + agenda demo |
| `src/` | Painel Next.js (clone genérico; env Donna) |
| `.env.example` | Variáveis do app |

## SQL (DB `donna`)

```bash
psql "$DATABASE_URL" -f sql/001_painel.sql
psql "$DATABASE_URL" -f sql/002_mensagens_reacao.sql
psql "$DATABASE_URL" -f sql/003_agendamentos_donna.sql
```

Crie o admin do painel neste projeto (não copie usuário Pazotti).

## Local

```bash
cp .env.example .env.local
npm install
npm run dev
```

App na porta `3000`. EasyPanel: projeto **`luciano`**, separado de `pazotti`.
