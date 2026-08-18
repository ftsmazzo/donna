import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { notifyStaff } from "@/lib/push";
import { tables } from "@/lib/schema";

function authorized(request: Request) {
  const secret = process.env.DONNA_INTERNO_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization") ?? "";
  const header = request.headers.get("x-donna-interno") ?? "";
  const token = bearer.toLowerCase().startsWith("bearer ") ? bearer.slice(7).trim() : header.trim();
  return token === secret;
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { telefone?: string; nome?: string };
  const telefone = String(body.telefone ?? "").replace(/\D/g, "");
  if (telefone.length < 10) {
    return NextResponse.json({ error: "Telefone ausente" }, { status: 400 });
  }

  await query(
    `INSERT INTO ${tables.attendances} (telefone, modo, updated_at)
     VALUES ($1, 'humano', NOW())
     ON CONFLICT (telefone) DO UPDATE SET
       modo = 'humano',
       updated_at = NOW()`,
    [telefone],
  );

  const [contato] = await query<{ nome: string | null }>(
    `SELECT ${tables.contactName} AS nome
       FROM ${tables.contacts}
      WHERE ${tables.contactPhone} = $1
      LIMIT 1`,
    [telefone],
  );
  const nome = String(body.nome ?? "").trim() || contato?.nome?.trim() || "Uma cliente";

  const result = await notifyStaff({
    title: "Donna",
    body: `${nome} pediu atendimento humano`,
    url: `/atendimento?tel=${encodeURIComponent(telefone)}`,
  });

  return NextResponse.json({ ok: true, nome, ...result });
}
