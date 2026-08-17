import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const users = await prisma.user.findMany({
    select: { id: true, username: true, displayName: true, avatarPath: true },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json({ users });
}
