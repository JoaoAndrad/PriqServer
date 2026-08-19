import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { removeInvite } from "@/lib/prikedin/removeInvite";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { id } = await params;

  const invite = await removeInvite(id, user.id);
  if (!invite) {
    return NextResponse.json({ error: "Você não está nessa vaga" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
