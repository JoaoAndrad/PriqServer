import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SCRIPT_KEY } from "@/lib/config";
import { ADMIN_SCRIPTS, type AdminScriptName } from "@/lib/adminScripts";

/**
 * Roda scripts de manutenção do banco em produção sob demanda (ex.:
 * `curl -X POST https://priquito.squareweb.app/api/admin/run-script \
 *    -H "x-admin-key: $ADMIN_SCRIPT_KEY" -H "content-type: application/json" \
 *    -d '{"script":"seed-swipe-pool"}'`).
 *
 * Só executa scripts cadastrados em ADMIN_SCRIPTS (nunca código vindo da
 * request) e exige ADMIN_SCRIPT_KEY configurada — sem a env var, recusa tudo.
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
  const scriptName = body?.script as string | undefined;
  if (!scriptName || !(scriptName in ADMIN_SCRIPTS)) {
    return NextResponse.json(
      { error: `script inválido. Disponíveis: ${Object.keys(ADMIN_SCRIPTS).join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const args = body?.args as Record<string, unknown> | undefined;
    const result = await ADMIN_SCRIPTS[scriptName as AdminScriptName](args);
    return NextResponse.json({ ok: true, script: scriptName, result });
  } catch (err) {
    console.error(`[admin/run-script] "${scriptName}" falhou:`, err);
    return NextResponse.json({ error: "Script falhou — veja os logs do servidor" }, { status: 500 });
  }
}
