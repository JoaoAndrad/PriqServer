import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SCRIPT_KEY } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { saveAvatar, deleteAvatarBestEffort, AvatarValidationError } from "@/lib/upload/avatar";

export const runtime = "nodejs";

/**
 * Troca a foto de perfil de qualquer usuário sob demanda, sem precisar estar
 * logado como ele (ex.: `curl -X POST https://priquito.squareweb.app/api/admin/avatar \
 *   -H "x-admin-key: $ADMIN_SCRIPT_KEY" -F "username=fulano" -F "file=@foto.png"`).
 * Mesma validação/armazenamento de /api/profile/avatar — só troca quem
 * autoriza a troca (aqui é a admin key, lá é a sessão do próprio usuário).
 */
export async function POST(req: NextRequest) {
  if (!ADMIN_SCRIPT_KEY) {
    return NextResponse.json(
      { error: "ADMIN_SCRIPT_KEY não configurada no servidor" },
      { status: 503 },
    );
  }

  if (req.headers.get("x-admin-key") !== ADMIN_SCRIPT_KEY) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const formData = await req.formData();
  const username = formData.get("username");
  const userId = formData.get("userId");
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  }
  if (typeof username !== "string" && typeof userId !== "string") {
    return NextResponse.json({ error: "informe username ou userId" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: typeof userId === "string" ? { id: userId } : { username: username as string },
    select: { id: true, username: true, avatarPath: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
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

  await prisma.user.update({ where: { id: user.id }, data: { avatarPath: newPath } });
  await deleteAvatarBestEffort(user.avatarPath);

  return NextResponse.json({ ok: true, username: user.username, avatarPath: newPath });
}
