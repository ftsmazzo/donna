import webpush from "web-push";
import { query } from "./db";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

export type PushResult = {
  sent: number;
  gone: number;
  errors: { status?: number; message: string }[];
};

type SubRow = {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
};

function env(name: string) {
  return process.env[name] || "";
}

function vapid() {
  const publicKey = env("VAPID_PUBLIC_KEY");
  const privateKey = env("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return null;
  const subject = env("VAPID_MAILTO") || "https://luciano-painel.kxryyk.easypanel.host";
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey };
}

export function getVapidPublicKey() {
  return vapid()?.publicKey ?? null;
}

async function sendOne(row: Pick<SubRow, "endpoint" | "p256dh" | "auth">, payload: PushPayload) {
  if (!vapid()) throw new Error("Push ainda não configurado");
  await webpush.sendNotification(
    {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    },
    JSON.stringify(payload),
    { TTL: 300, urgency: "high" },
  );
}

function errorInfo(error: unknown) {
  const err = error as { statusCode?: number; body?: string; message?: string };
  return {
    status: err.statusCode,
    message: String(err.body || err.message || error).slice(0, 400),
  };
}

export async function notifyStaff(payload: PushPayload): Promise<PushResult> {
  if (!vapid()) return { sent: 0, gone: 0, errors: [{ message: "VAPID ausente no painel" }] };
  const rows = await query<SubRow>(
    `SELECT id, endpoint, p256dh, auth
       FROM push_subscriptions_painel
      WHERE usuario_id IN (SELECT id FROM usuarios_painel WHERE ativo IS DISTINCT FROM FALSE)`,
  );

  let sent = 0;
  let gone = 0;
  const errors: PushResult["errors"] = [];
  if (!rows.length) {
    return { sent: 0, gone: 0, errors: [{ message: "Nenhum celular com aviso ligado" }] };
  }

  await Promise.all(
    rows.map(async (row) => {
      try {
        await sendOne(row, payload);
        sent += 1;
      } catch (error) {
        const info = errorInfo(error);
        if (info.status === 404 || info.status === 410) {
          gone += 1;
          await query(`DELETE FROM push_subscriptions_painel WHERE id = $1`, [row.id]);
        } else {
          errors.push(info);
        }
      }
    }),
  );
  return { sent, gone, errors };
}

export async function notifySubscription(row: Pick<SubRow, "endpoint" | "p256dh" | "auth">, payload: PushPayload) {
  try {
    await sendOne(row, payload);
    return { ok: true as const };
  } catch (error) {
    return { ok: false as const, ...errorInfo(error) };
  }
}
