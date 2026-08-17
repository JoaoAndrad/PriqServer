import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { AVATARS_DIR, MAX_AVATAR_SIZE_BYTES, UPLOADS_DIR } from "@/lib/config";

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export class AvatarValidationError extends Error {}

export async function saveAvatar(userId: string, file: File): Promise<string> {
  const ext = ALLOWED_MIME_TO_EXT[file.type];
  if (!ext) {
    throw new AvatarValidationError(
      "Formato não suportado. Use PNG, JPEG ou WEBP.",
    );
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new AvatarValidationError(
      `Arquivo muito grande. Máximo de ${(MAX_AVATAR_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB.`,
    );
  }

  await mkdir(AVATARS_DIR, { recursive: true });

  const filename = `${userId}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(AVATARS_DIR, filename), buffer);

  return `avatars/${filename}`;
}

export async function deleteAvatarBestEffort(relativePath: string | null | undefined) {
  if (!relativePath) return;
  try {
    await unlink(path.join(UPLOADS_DIR, relativePath));
  } catch {
    // best-effort: ignora se o arquivo já não existe
  }
}
