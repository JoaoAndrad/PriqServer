import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { searchGames } from "@/lib/games/search";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const games = await searchGames(q);
  return NextResponse.json({ games });
}
