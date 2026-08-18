import webpush from "web-push";
import { query } from "./db";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

function vapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails(
    process.env.VAPID_MAILTO || "mailto:pati@donna.local",
    publicKey,
    privateKey,
  );
  return { publicKey };
}

export function getVapidPublicKey() {
  return vapid()?.publicKey ?? null;
}

export async function notifyStaff(payload: PushPayload) {
  if (!vapid()) return { sent: 0, gone: 0 };
  const rows = await query<{
    id: number;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>(
    `SELECT id, endpoint, p256dh, auth
       FROM push_subscriptions_painel
      WHERE usuario_id IN (SELECT id FROM usuarios_painel WHERE ativo = TRUE)`,
  );

  let sent = 0;
  let gone = 0;
  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          gone += 1;
          await query(`DELETE FROM push_subscriptions_painel WHERE id = $1`, [row.id]);
        }
      }
    }),
  );
  return { sent, gone };
}
