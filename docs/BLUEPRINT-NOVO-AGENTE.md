# Blueprint — novo agente WhatsApp (padrão SofIA)

**Para o chat / agente novo:** leia este arquivo primeiro. Não altere Pazotti/SofIA em produção.

Este repositório (`pazotti-painel`) é o **painel genérico** e a memória do padrão. O cliente Pazotti (SofIA) é a **instância que já existe**. Um agente “parecido com a SofIA” é um **clone do padrão**, com projeto EasyPanel, Postgres, n8n, Evolution e `.env` próprios.

---

## Isolamento (obrigatório)

| Recurso | Pazotti (não tocar) | Cliente novo |
|---------|---------------------|--------------|
| EasyPanel projeto | `pazotti` | outro nome, minúsculo |
| Postgres | `pazotti_db` / DB `pazotti` | `{projeto}_db` / DB próprio |
| n8n | MCP `user-pazotti` (VPS antiga) e `user-novopazotti` (EasyPanel) | MCP **novo** apontando só para o n8n desse cliente |
| Evolution | `pazotti_evolution` + número SofIA | instância e número **desse** cliente |
| Workflows | `IA Pazotti`, Leads, Imóveis, Agenda | nomes do cliente; IDs novos |
| Painel | clone deste app com env Pazotti | **mesmo código**, outro app + outro `.env` |

Não reutilizar: credencial Postgres `Pazotti`, encryption key do n8n Pazotti, API key Evolution Pazotti, dump `pazotti.dump` em outro database “por economia”, webhook `/sofia`.

Se o usuário não citar Pazotti, **não** chamar `update_workflow` / `publish_workflow` nos IDs Pazotti.

IDs n8n EasyPanel Pazotti (referência, não editar neste chat novo):

- IA Pazotti `PFqluyZWkBVZzjAE`
- Leads `DhnDOzTIrpryLGld`
- Imoveis `VPliTWoLRyqDyIaP`
- Agenda `jrB9ANn2UM1WfMVQ` (não usada de fato)

---

## Como o chat novo deve começar

1. Abrir este arquivo: `docs/BLUEPRINT-NOVO-AGENTE.md`
2. Preencher a **Ficha do cliente** (seção no fim) com o que o usuário disser
3. Criar pasta própria (`Projetos/{cliente}`) — **não** desenvolver o outro cliente em cima do código de produção Pazotti, a menos que seja só ajuste genérico do painel
4. Confirmar MCP n8n do **cliente novo** (nome do server)
5. Seguir a ordem EasyPanel abaixo

Prompt sugerido para colar no chat novo:

```text
Leia C:\Users\anjo_\Projetos\pazotti-painel\docs\BLUEPRINT-NOVO-AGENTE.md
e o README.md do mesmo repo.

Este chat é SÓ o cliente: [NOME].
Não altere Pazotti/SofIA, MCP user-pazotti nem user-novopazotti.

Ficha preenchida:
- [colar a ficha]

Objetivo desta sessão: [ex.: subir stack EasyPanel / importar n8n / clonar painel]
```

---

## Arquitetura do padrão

```
WhatsApp  →  Evolution (domínio público, cliente não vê)
                ↓ webhook POST
             n8n  (1 app; DNS interno EasyPanel = {projeto}_{servico})
                ↓
             Postgres (fila, histórico, CRM, RAG opcional, tabelas do painel)
             Redis (Evolution)

Operador  →  Painel Next.js (clone deste repo) → lê Postgres + envia via Evolution
```

### EasyPanel (o que realmente importa)

- Hostname interno: `{PROJECT_NAME}_{SERVICE_NAME}`  
  Ex.: projeto `acme` + serviço `n8n` → `acme_n8n`
- Templates de 1 clique criam Postgres/Redis **separados** por app. Para este padrão, **serviços manuais** num único projeto é melhor.
- Nomes: minúsculo, hífen (`n8n`, `db`). Underscore tipo `n8n_webhook` (Portainer) **não** replica. Depois do import, trocar URLs `n8n_webhook:5678` → `{projeto}_n8n:5678`.
- Salvar env **não aplica** — precisa Deploy.
- Domínio automático + `$(PRIMARY_DOMAIN)` / `$(PROJECT_NAME)` nas envs.
- n8n 2.x: preferir `N8N_WEBHOOK_URL=https://$(PRIMARY_DOMAIN)/` em vez de só `WEBHOOK_URL`.

### Stack mínima por cliente

| Serviço | Tipo | Observação |
|---------|------|------------|
| `db` | Postgres | Imagem alinhada ao volume. Pazotti: nasceu PG17 → `pgvector/pgvector:pg17`. Criar DBs `n8n`, `{cliente}`, `evolution` + `CREATE EXTENSION vector` no DB do app |
| `redis` | Redis | Evolution |
| `n8n` | App imagem | Pin da **mesma versão** da origem. Volume `/home/node/.n8n`. Porta domínio **5678** |
| `evolution` | App imagem | Porta **8080**. Volume `/evolution/instances`. Pin da versão da origem |

Collation mismatch ao trocar imagem Postgres: `ALTER DATABASE template1 REFRESH COLLATION VERSION` ou recriar volume vazio na imagem certa.

Não criar tabela RAG “na mão” e depois `pg_restore` só de data — a tabela precisa nascer com `id, text, metadata, embedding`.

---

## Padrão do agente n8n (SofIA)

### Fluxos típicos

1. **IA** — webhook → parse Evolution → fila anti-encavalamento → agente LangChain → resposta Evolution
2. **Leads/CRM** — MCP trigger (`/mcp/leads`) + postgresTool
3. **Imóveis / base** — MCP (`/mcp/imoveis`) + Sheets ou Postgres
4. **Agenda / Drive / envio de arquivo** — só se o cliente usar de verdade (no Pazotti Calendar/Drive tiveram **0 execuções**)

### Entrada WhatsApp

Webhook path tipo `/sofia` (escolha outro path por cliente).

Payload Evolution → nó Set (`Info`): `telefone`, `instancia`, `mensagem`, `fromMe`, grupo, `id_mensagem`, `timestamp`.

Filtro típico: ignorar `fromMe` e grupos (`g.us`).

### Fila

Tabela `{prefixo}_fila`: insert da mensagem, wait, select por telefone, concatenar, delete. Evita duas execuções no mesmo chat.

### Memória

`memoryPostgresChat`, `sessionKey` = telefone, tabela `{prefixo}_historico`, janela ~12.

### Gate humano (painel)

Depois do parse do telefone:

1. SELECT `atendimentos_agente.modo` (default `ia` se não houver linha)
2. INSERT inbound em `mensagens_agente`
3. Se `modo = humano` → **stop** (não chama o LLM)
4. Se `ia` → agente → resposta Evolution → INSERT `outbound_ia`

### Tools que costumam ser do cliente (não copiar IDs)

- OpenAI (LLM + transcrição + embeddings)
- Evolution API (community node `n8n-nodes-evolution-api`)
- Postgres do **cliente**
- Sheets / Calendar / Drive só com OAuth do cliente e se houver uso real

Community nodes: o MCP `update_workflow` **falha** se o workflow ainda tem node type não instalado (Evolution, ElevenLabs). Instalar pacotes **antes** de editar via MCP. Workflow aberto no editor também bloqueia update.

MCP do n8n **não cria credenciais** (só lista e `setNodeCredential`). OAuth Google: consent Testing + test users + redirect do **n8n novo**.

### Cutover do número operacional

Sombra completa → testar com número de teste → desconectar número na Evolution antiga → conectar na nova → webhook = Production URL do n8n novo → smoke 15–30 min → só então desligar VPS.

Cliente só vê o Zap; domínios ficam no EasyPanel.

---

## Dados Postgres típicos

### Núcleo do agente

| Tabela (Pazotti) | Papel | Levar no dump |
|------------------|--------|----------------|
| `{prefixo}_fila` | fila | sim |
| `{prefixo}_historico` | memória | sim |
| `contatos_{prefixo}` | CRM | sim |
| `lead_acoes_{prefixo}` | ações | sim |
| `rag_{prefixo}` | PGVector | se o agente usar busca sem código |

### Painel (este repo)

Rodar no DB do **cliente** (não misturar com dump Pazotti):

- `sql/001_painel.sql` — usuários, atendimentos, mensagens  
- `sql/002_mensagens_reacao.sql` — coluna reação  

**Não** copiar o `INSERT` do Rodrigo Pazotti para outro cliente. Criar admin do cliente novo.

Tabelas Pazotti sem uso no fluxo IA (`pedidos_agenda`, `reservas_visita`, `wa_property_outreach`) podem ir no dump completo e ficar mortas.

Dump: backup **custom** do database inteiro no pgAdmin. Restore `--no-owner --no-acl`.

---

## Painel (este repositório)

Um código, N deploys:

```
DATABASE_URL=... DB do cliente
APP_BRAND=...
AGENT_NAME=...
CONTACTS_TABLE / ACTIONS_TABLE = tabelas CRM desse cliente
EVOLUTION_URL / KEY / INSTANCE = Evolution desse cliente
HISTORY_TABLE = tabela de memória
```

Dockerfile, porta `3000`. EasyPanel: App no **mesmo projeto** do cliente.

Pendências históricas Pazotti (não assumir feito no cliente novo):

- Gate no n8n + persistir mensagens (código do painel espera `atendimentos_agente` / `mensagens_agente`)
- Cutover: ver `CUTOVER-PRODUCAO.md` **só como roteiro**; não executar no Pazotti neste chat do outro cliente

---

## Ordem de implantação (cliente novo)

1. Projeto EasyPanel + `db` + DBs + `vector`
2. `redis`
3. `n8n` (versão pinada, owner, community nodes)
4. `evolution` (número de **teste**)
5. Dump CRM/histórico da origem → restore
6. Import workflows **sem** credenciais → recriar credenciais → trocar hosts internos
7. Ativar MCP (leads/imóveis) **antes** da IA
8. Teste Zap → só então número operacional
9. SQL do painel + app painel + gate n8n
10. RAG/vector por último, se existir

Não misturar “melhorar o agente” com o dia do cutover.

---

## Ficha — Donna / Dona (Catanduva)

Preenchida em 16/08/2026. Marca ainda sem brief oficial (nome Donna vs Dona indefinido).

```
Nome do projeto EasyPanel: luciano (hub do dono dos salões; confirmado 16/08/2026)
Nome do agente: esposa do dono na conta do Zap (nome a definir com o cliente)
Persona: mulher, gírias, fala natural; tom configurável no admin
Papel: primeiro contato da cliente do salão
MCP n8n: a criar (NÃO usar user-pazotti / user-novopazotti)
n8n origem: greenfield (não é migração SofIA)
Evolution: stack nova no EasyPanel; número de TESTE para demo
Número operacional: não existe / não conectar até go-live do salão
Unidades: DUAS (endereços a obter)
Serviços: catálogo a obter (preços, duração, profissionais)
Agenda: agente agenda em Postgres (tabela agendamentos) e aparece no painel; Google Agenda fora do demo
Unidades demo: 2 fictícias; agente pergunta a preferência e cita endereços
Especialista: cliente pede a qualquer momento → painel assume, IA para
Proximidade / CMS de tom: módulos pagos, não entram no demo
Admin painel: tom de voz configurável = fase 2 (não demo)
Painel neste repo? sim — novo app, novo .env, SQL sem usuário Pazotti
O que NÃO fazer: tocar SofIA, dumps Pazotti, número Pazotti, credenciais Pazotti
Objetivo reunião (17/08): demo testável, não slide
```

### Escopo de produto (o que dizer / não dizer)

Ver análise na conversa do chat de briefing. Resumo operacional para o chat executor:

- MVP: conversa + catálogo + agendar slot + “quero especialista” → gate humano no painel
- Unidade por CEP/bairro/maps, nunca localização em background
- Prompt/persona no admin é diferencial — não está pronto no painel Pazotti; se prometido, é item de build
- TTS tipo esposa falando áudio = fase 2 / custo (lição ElevenLabs Pazotti)

### Decisão de demo (16/08/2026) — o que mostrar ao consultor

Peça central (incluída):

- Persona fixa e visível no jeito de falar (esposa do dono; gírias; calor)
- 2 unidades **fictícias**; a agente **pergunta** qual unidade e informa os endereços (sem georref)
- Agenda **ela mesma**, em **banco** + lista no painel (não Google Agenda no demo)
- “Quero um especialista” → IA para; humano assume no painel (mesmo Zap)
- Catálogo fechado de serviços — não inventar preço, procedimento ou unidade
- Painel no mesmo padrão Pazotti (inbox + assumir/devolver)

Módulos à parte, **com custo**, só na conversa (não no demo):

- Configurar tom/serviços no admin do painel
- Indicar unidade por proximidade (CEP, pin, endereço)

Proibido no demo: alucinar serviço, responder assunto aleatório, GPS, TTS ElevenLabs.

Pacote fechado (persona Pati, catálogo, unidades, especialita, áudio/imagem/reações/digitando): **`docs/DEMO-DONNA.md`**.
