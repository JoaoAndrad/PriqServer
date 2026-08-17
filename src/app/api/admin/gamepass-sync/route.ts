import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { syncGamePassCatalog } from "@/lib/gamepass/sync";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const result = await syncGamePassCatalog();
  return NextResponse.json(result);
}
