import type { TgdbGameResult } from "./client";
import type { Prisma } from "@prisma/client";

function slugify(title: string, id: number): string {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `tgdb-${base || "game"}-${id}`;
}

export function mapTgdbToGameData(tgdb: TgdbGameResult): Prisma.GameUpsertArgs["create"] {
  return {
    tgdbId: tgdb.id,
    name: tgdb.title,
    slug: slugify(tgdb.title, tgdb.id),
    coverUrl: tgdb.coverUrl,
    released: tgdb.released,
    tgdbUpdatedAt: new Date(),
    refreshedAt: new Date(),
  };
}
