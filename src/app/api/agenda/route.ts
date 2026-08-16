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
    servico: string;
    inicio: string;
    status: string;
    preco_centavos: number;
  }>(`
    SELECT
      a.id::text,
      a.telefone,
      a.nome,
      u.nome AS unidade,
      s.nome AS servico,
      a.inicio::text,
      a.status,
      a.preco_centavos
    FROM agendamentos_donna a
    JOIN unidades_donna u ON u.id = a.unidade_id
    JOIN servicos_donna s ON s.codigo = a.servico_codigo
    WHERE a.status = 'marcado' AND a.inicio >= NOW() - INTERVAL '1 day'
    ORDER BY a.inicio ASC
    LIMIT 80
  `);

  return NextResponse.json({ agendamentos: rows });
}
