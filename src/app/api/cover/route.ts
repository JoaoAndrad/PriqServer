import { NextRequest, NextResponse } from "next/server";

// Mesmo allowlist do coverProxy — só repetimos aqui pra não confiar em input
// externo pra decidir quem o servidor tem permissão de buscar (evita virar
// um proxy aberto pra qualquer URL).
const ALLOWED_HOSTS = new Set(["cdn.thegamesdb.net"]);

/**
 * Busca a capa do jogo no servidor e repassa pro navegador. Existe porque o
 * CDN da TheGamesDB bloqueia hotlinking/tem rate limit por IP do cliente —
 * pedindo a partir do nosso servidor (e cacheando a resposta), a imagem some
 * de ficar quebrada em produção.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("u");
  if (!url) return NextResponse.json({ error: "Parâmetro 'u' obrigatório" }, { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: "Host não permitido" }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PriquitoBot/1.0)" },
    });
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Falha ao buscar imagem" }, { status: 502 });
    }

    const contentType = upstream.headers.get("Content-Type") ?? "image/jpeg";
    const buffer = await upstream.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        // Capas não mudam depois de publicadas — pode cachear pesado.
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Falha ao buscar imagem" }, { status: 502 });
  }
}
