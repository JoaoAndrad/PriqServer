// Hosts que bloqueiam hotlinking (403 direto no navegador) ou que já vimos
// dando rate limit pro cliente — essas capas passam pelo nosso proxy
// (/api/cover), que busca a imagem no servidor e serve com cache. URLs de
// outros hosts (ex.: Steam CDN) seguem direto, sem passar pelo proxy.
const PROXIED_HOSTS = new Set(["cdn.thegamesdb.net"]);

/** Resolve a URL de capa a usar num <img src>, roteando pelo proxy quando o host exige. */
export function coverSrc(url: string | null | undefined): string | null {
  if (!url) return null;

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return url;
  }

  if (!PROXIED_HOSTS.has(hostname)) return url;

  return `/api/cover?u=${encodeURIComponent(url)}`;
}
