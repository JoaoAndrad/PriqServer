import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { saveAvatar, deleteAvatarBestEffort, AvatarValidationError } from "@/lib/upload/avatar";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }

  let newPath: string;
  try {
    newPath = await saveAvatar(user.id, file);
  } catch (err) {
    if (err instanceof AvatarValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const previous = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarPath: true },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarPath: newPath },
  });

  await deleteAvatarBestEffort(previous?.avatarPath);

  return NextResponse.json({ avatarPath: newPath });
}
