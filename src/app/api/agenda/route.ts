import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isResponse, requireUser } from "@/lib/api";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;

  const rows = await query<{
    id: string;
    telefone: string;
    nome: string | null;
    unidade: string;
    unidade_id: string;
    servico: string;
    servico_codigo: string;
    inicio: string;
    status: string;
    duracao_min: number;
    preco_centavos: number;
  }>(`
    SELECT
      a.id::text,
      a.telefone,
      a.nome,
      u.nome AS unidade,
      a.unidade_id,
      s.nome AS servico,
      s.codigo AS servico_codigo,
      a.inicio::text,
      a.status,
      a.duracao_min,
      a.preco_centavos
    FROM agendamentos_donna a
    JOIN unidades_donna u ON u.id = a.unidade_id
    JOIN servicos_donna s ON s.codigo = a.servico_codigo
    WHERE a.status = 'marcado' AND a.inicio >= NOW() - INTERVAL '1 day'
    ORDER BY a.inicio ASC
    LIMIT 80
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
      e.inicio::text,
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

  return NextResponse.json({ agendamentos: rows, espera, servicos, unidades });
}
