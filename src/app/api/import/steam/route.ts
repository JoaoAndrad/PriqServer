import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { previewSteamLibrary, confirmSteamImport } from "@/lib/steam/import";
import { SteamImportError } from "@/lib/steam/client";
import { z } from "zod";

const previewSchema = z.object({ steamProfile: z.string().min(1) });
const confirmSchema = z.object({ gameIds: z.array(z.string().min(1)).min(1) });

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = previewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "steamProfile é obrigatório" }, { status: 400 });
  }

  try {
    const items = await previewSteamLibrary(parsed.data.steamProfile);
    return NextResponse.json({ items });
  } catch (err) {
    const message = err instanceof SteamImportError ? err.message : "Falha ao importar da Steam";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = confirmSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "gameIds é obrigatório" }, { status: 400 });
  }

  await confirmSteamImport(user.id, parsed.data.gameIds);
  return NextResponse.json({ ok: true });
}
