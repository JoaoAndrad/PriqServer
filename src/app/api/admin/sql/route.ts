import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SCRIPT_KEY } from "@/lib/config";
import { prisma } from "@/lib/prisma";

/** COUNT/SUM em SQLite via $queryRaw voltam BigInt, que NextResponse.json não
 * serializa — troca por Number (perde precisão só acima de 2^53, irrelevante
 * pros tamanhos desse banco) antes de montar a resposta. */
function jsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, jsonSafe(v)]));
  }
  return value;
}

/**
 * Roda SQL arbitrário no banco de prod sob demanda, sem precisar cadastrar
 * script nenhum (ex.: `curl -X POST https://priquito.squareweb.app/api/admin/sql \
 *   -H "x-admin-key: $ADMIN_SCRIPT_KEY" -H "content-type: application/json" \
 *   -d '{"sql":"SELECT id, username FROM User LIMIT 5"}'`).
 *
 * SELECT/PRAGMA voltam as linhas; qualquer outro statement (INSERT/UPDATE/
 * DELETE/...) volta a contagem de linhas afetadas. Sem transação automática —
 * um statement por vez. Isso executa contra o banco de produção de verdade:
 * não tem dry-run nem confirmação, então cuidado com WHERE ausente.
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

  const body = await req.json().catch(() => null);
  const sql = body?.sql as string | undefined;
  if (!sql || typeof sql !== "string" || !sql.trim()) {
    return NextResponse.json({ error: "sql (string) é obrigatório" }, { status: 400 });
  }

  const params = Array.isArray(body?.params) ? (body.params as unknown[]) : [];
  const isRead = /^\s*(select|pragma|explain)\b/i.test(sql);

  try {
    if (isRead) {
      const rows = await prisma.$queryRawUnsafe(sql, ...params);
      return NextResponse.json({ ok: true, rows: jsonSafe(rows) });
    }
    const count = await prisma.$executeRawUnsafe(sql, ...params);
    return NextResponse.json({ ok: true, rowsAffected: count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query falhou" },
      { status: 400 },
    );
  }
}
