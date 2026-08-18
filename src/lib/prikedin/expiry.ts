import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;
export const RECRUITMENT_TTL_MS = 3 * HOUR_MS; // 3 horas de janela após o "fim" do evento
const DAY_MS = 24 * HOUR_MS;

/**
 * Vagas com horário definido expiram 3h depois do horário marcado.
 * Vagas sem horário (scheduledAt fica salvo como 00:00 daquele dia) valem o dia
 * inteiro: a janela de 3h só começa a contar depois da meia-noite seguinte,
 * senão expirariam de madrugada no mesmo dia em que foram criadas.
 */
export function expiresAt(scheduledAt: Date, hasTime: boolean): Date {
  const base = hasTime ? scheduledAt.getTime() : scheduledAt.getTime() + DAY_MS;
  return new Date(base + RECRUITMENT_TTL_MS);
}

export function isPastExpiry(scheduledAt: Date, hasTime: boolean, now: Date = new Date()): boolean {
  return now.getTime() >= expiresAt(scheduledAt, hasTime).getTime();
}

/**
 * Marca como "expired" (lazy, no read) qualquer vaga "open" cujo prazo já tenha passado.
 * Não há job/cron no projeto, então a expiração é verificada sob demanda nas rotas de leitura.
 */
export async function expireStaleRecruitments(where?: { id?: string }) {
  const now = new Date();

  await prisma.recruitment.updateMany({
    where: {
      status: "open",
      hasTime: true,
      scheduledAt: { lte: new Date(now.getTime() - RECRUITMENT_TTL_MS) },
      ...(where?.id ? { id: where.id } : {}),
    },
    data: { status: "expired" },
  });

  await prisma.recruitment.updateMany({
    where: {
      status: "open",
      hasTime: false,
      scheduledAt: { lte: new Date(now.getTime() - DAY_MS - RECRUITMENT_TTL_MS) },
      ...(where?.id ? { id: where.id } : {}),
    },
    data: { status: "expired" },
  });
}
