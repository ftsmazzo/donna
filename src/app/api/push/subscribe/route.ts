import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isResponse, requireUser } from "@/lib/api";

type Body = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

export async function POST(request: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;

  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = String(body.endpoint ?? "").trim();
  const p256dh = String(body.keys?.p256dh ?? "").trim();
  const auth = String(body.keys?.auth ?? "").trim();
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Inscrição inválida" }, { status: 400 });
  }

  await query(
    `INSERT INTO push_subscriptions_painel (usuario_id, endpoint, p256dh, auth, user_agent, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (endpoint) DO UPDATE SET
       usuario_id = EXCLUDED.usuario_id,
       p256dh = EXCLUDED.p256dh,
       auth = EXCLUDED.auth,
       user_agent = EXCLUDED.user_agent,
       updated_at = NOW()`,
    [user.id, endpoint, p256dh, auth, request.headers.get("user-agent") ?? ""],
  );

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (isResponse(user)) return user;

  const body = (await request.json().catch(() => ({}))) as Body;
  const endpoint = String(body.endpoint ?? "").trim();
  if (endpoint) {
    await query(
      `DELETE FROM push_subscriptions_painel WHERE usuario_id = $1 AND endpoint = $2`,
      [user.id, endpoint],
    );
  } else {
    await query(`DELETE FROM push_subscriptions_painel WHERE usuario_id = $1`, [user.id]);
  }
  return NextResponse.json({ ok: true });
}
