import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isAdmin } from "@/lib/access";
import { isResponse, requireUser } from "@/lib/api";
import { sendWhatsAppText } from "@/lib/evolution";
import { tables } from "@/lib/schema";
import { GRADE_HORAS } from "@/lib/salon";

const SLOT_SQL = `
    SELECT
      a.id::text,
      a.telefone,
      a.nome,
      u.nome AS unidade,
      a.unidade_id,
      s.nome AS servico,
      s.codigo AS servico_codigo,
      to_char(a.inicio AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z' AS inicio,
      a.status,
      a.duracao_min,
      a.preco_centavos
    FROM agendamentos_donna a
    JOIN unidades_donna u ON u.id = a.unidade_id
    JOIN servicos_donna s ON s.codigo = a.servico_codigo
`;

function somenteDigitos(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

function pgCode(error: unknown) {
  return error && typeof error === "object" && "code" in error ? String((error as { code: string }).code) : "";
}

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;

  const rows = await query(`${SLOT_SQL}
    WHERE a.status = 'marcado' AND a.inicio >= NOW() - INTERVAL '1 day'
    ORDER BY a.inicio ASC
    LIMIT 80
  `);

  const historico = await query(`${SLOT_SQL}
    WHERE a.status = 'feito' AND a.inicio >= NOW() - INTERVAL '40 days'
    ORDER BY a.inicio DESC
    LIMIT 30
  `);

  const espera = await query<{
    id: string;
    telefone: string;
    nome: string | null;
    unidade: string;
    unidade_id: string;
    servico: string;
    servico_codigo: string;
    inicio: string;
    status: string;
  }>(`
    SELECT
      e.id::text,
      e.telefone,
      e.nome,
      u.nome AS unidade,
      e.unidade_id,
      s.nome AS servico,
      s.codigo AS servico_codigo,
      to_char(e.inicio AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS') || 'Z' AS inicio,
      e.status
    FROM espera_donna e
    JOIN unidades_donna u ON u.id = e.unidade_id
    JOIN servicos_donna s ON s.codigo = e.servico_codigo
    WHERE e.status IN ('esperando', 'avisada') AND e.inicio >= NOW() - INTERVAL '1 day'
    ORDER BY e.inicio ASC, e.created_at ASC
    LIMIT 40
  `);

  const servicos = await query<{
    codigo: string;
    nome: string;
    duracao_min: number;
    preco_centavos: number;
    unidades: string[] | string;
  }>(`
    SELECT codigo, nome, duracao_min, preco_centavos, unidades
    FROM servicos_donna
    ORDER BY preco_centavos ASC
  `);

  const unidades = await query<{ id: string; nome: string; endereco: string }>(`
    SELECT id, nome, endereco FROM unidades_donna ORDER BY nome
  `);

  return NextResponse.json({
    agendamentos: rows,
    historico,
    espera,
    servicos,
    unidades,
    admin: isAdmin(user),
  });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Só o admin marca pelo painel" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    telefone?: string;
    nome?: string;
    unidadeId?: string;
    servicoCodigo?: string;
    data?: string;
    hora?: string;
    status?: string;
  };

  const telefone = somenteDigitos(String(body.telefone ?? ""));
  const nome = String(body.nome ?? "").trim();
  const unidadeId = String(body.unidadeId ?? "").trim();
  const servicoCodigo = String(body.servicoCodigo ?? "").trim().toUpperCase();
  const data = String(body.data ?? "").trim();
  const hora = String(body.hora ?? "").trim();
  const status = body.status === "feito" ? "feito" : "marcado";

  if (telefone.length < 12) {
    return NextResponse.json({ error: "Telefone inválido" }, { status: 400 });
  }
  if (!unidadeId || !servicoCodigo || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: "Preencha casa, serviço e data" }, { status: 400 });
  }
  if (!(GRADE_HORAS as readonly string[]).includes(hora) && status === "marcado") {
    return NextResponse.json({ error: "Hora fora da grade" }, { status: 400 });
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    return NextResponse.json({ error: "Hora inválida" }, { status: 400 });
  }

  try {
    const [row] = await query<{ id: string }>(
      `INSERT INTO agendamentos_donna
         (telefone, nome, unidade_id, servico_codigo, inicio, duracao_min, preco_centavos, status)
       SELECT $1, NULLIF($2, ''), $3, s.codigo,
              ($4::timestamp AT TIME ZONE 'America/Sao_Paulo'),
              s.duracao_min, s.preco_centavos, $5
         FROM servicos_donna s
        WHERE s.codigo = $6
          AND $3 = ANY(s.unidades)
       RETURNING id::text`,
      [telefone, nome, unidadeId, `${data} ${hora}:00`, status, servicoCodigo],
    );
    if (!row) {
      return NextResponse.json({ error: "Serviço não existe nessa casa" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, id: row.id, status });
  } catch (error) {
    if (pgCode(error) === "23505") {
      return NextResponse.json({ error: "Esse horário já tem gente nessa casa" }, { status: 409 });
    }
    throw error;
  }
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "Só o admin cancela pelo painel" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { id?: string; acao?: string };
  if (body.acao !== "cancelar" || !body.id) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
  }

  const [cancelado] = await query<{ telefone: string; unidade_id: string; inicio: string }>(
    `UPDATE agendamentos_donna
        SET status = 'cancelado'
      WHERE id = $1 AND status = 'marcado'
      RETURNING telefone, unidade_id, inicio`,
    [body.id],
  );
  if (!cancelado) {
    return NextResponse.json({ error: "Horário não está marcado" }, { status: 404 });
  }

  const [espera] = await query<{ telefone: string; texto: string }>(
    `WITH picked AS (
       SELECT e.id
         FROM espera_donna e
        WHERE e.unidade_id = $1
          AND e.inicio = $2
          AND e.status = 'esperando'
          AND e.telefone <> $3
        ORDER BY e.created_at
        LIMIT 1
     ), u AS (
       UPDATE espera_donna e
          SET status = 'avisada', avisada_at = NOW()
         FROM picked
        WHERE e.id = picked.id
     RETURNING e.telefone, e.nome, e.unidade_id, e.inicio
     )
     SELECT u.telefone,
            ('Oi, ' || COALESCE(NULLIF(split_part(u.nome, ' ', 1), ''), 'linda')
              || '! Liberou um encaixe '
              || to_char(u.inicio AT TIME ZONE 'America/Sao_Paulo', 'DD/MM')
              || ' às '
              || to_char(u.inicio AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI')
              || ' no '
              || CASE u.unidade_id WHEN 'centro' THEN 'Centro' ELSE 'Higienópolis' END
              || '. Ainda quer que eu te passe pra esse horário? Responde SIM que eu te encaixo.') AS texto
       FROM u`,
    [cancelado.unidade_id, cancelado.inicio, cancelado.telefone],
  );

  if (!espera) {
    return NextResponse.json({ ok: true, cancelado: true, encaixe: false });
  }

  try {
    await sendWhatsAppText(espera.telefone, espera.texto);
    await query(
      `INSERT INTO ${tables.messages} (telefone, direcao, texto, instancia)
       VALUES ($1, 'outbound_ia', $2, 'Donna')`,
      [espera.telefone, espera.texto],
    );
  } catch (error) {
    return NextResponse.json({
      ok: true,
      cancelado: true,
      encaixe: true,
      aviso: error instanceof Error ? error.message : "Cancelou, mas o Zap do encaixe falhou",
    });
  }

  return NextResponse.json({ ok: true, cancelado: true, encaixe: true });
}
