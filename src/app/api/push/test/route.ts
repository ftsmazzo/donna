import { NextResponse } from "next/server";
import { isResponse, requireUser } from "@/lib/api";
import { notifyStaff } from "@/lib/push";

export async function POST() {
  const user = await requireUser();
  if (isResponse(user)) return user;
  const result = await notifyStaff({
    title: "Donna",
    body: "Aviso de teste. Se isto chegou, o humano também chega.",
    url: "/atendimento",
  });
  return NextResponse.json(result);
}
