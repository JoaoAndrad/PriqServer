import path from "node:path";

// path.join com process.cwd() mantém o acesso ao filesystem estaticamente
// escopado a uma subpasta, evitando que o bundler trace o projeto inteiro
// (diferente de path.resolve com um valor dinâmico de env var). Se DATA_DIR
// vier como caminho absoluto (ex.: um volume persistente na SquareCloud),
// usa ele diretamente.
const rawDataDir = process.env.DATA_DIR ?? "data";
// ignora o aviso de tracing do bundler: não usamos `output: "standalone"` —
// o deploy roda com o `.next` completo + node_modules via server.js, então
// esse tracing de build não é usado.
export const DATA_DIR = path.isAbsolute(rawDataDir)
  ? rawDataDir
  : path.join(/* turbopackIgnore: true */ process.cwd(), rawDataDir);
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const AVATARS_DIR = path.join(UPLOADS_DIR, "avatars");

export const MAX_AVATAR_SIZE_BYTES =
  Number(process.env.MAX_AVATAR_SIZE_MB ?? 3) * 1024 * 1024;

export const TGDB_CACHE_TTL_DAYS = Number(process.env.TGDB_CACHE_TTL_DAYS ?? 30);
export const GAMEPASS_SYNC_TTL_DAYS = Number(
  process.env.GAMEPASS_SYNC_TTL_DAYS ?? 1,
);

export const THEGAMESDB_API_KEY = process.env.THEGAMESDB_API_KEY ?? "";
export const STEAM_API_KEY = process.env.STEAM_API_KEY ?? "";
