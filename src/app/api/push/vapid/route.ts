import { NextResponse } from "next/server";
import { isResponse, requireUser } from "@/lib/api";
import { getVapidPublicKey } from "@/lib/push";

export async function GET() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ error: "Push ainda não configurado" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
