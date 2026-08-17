import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DiceIcon, HeartSwipeIcon, BriefcaseIcon } from "@/components/ui/icons";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [interested, favorite, owned, openRecruitments] = await Promise.all([
    prisma.userGame.count({ where: { userId: user.id, interested: true } }),
    prisma.userGame.count({ where: { userId: user.id, favorite: true } }),
    prisma.userGame.count({ where: { userId: user.id, owned: true } }),
    prisma.recruitment.findMany({
      where: { status: "open" },
      orderBy: { scheduledAt: "asc" },
      take: 4,
      include: {
        game: true,
        createdBy: { select: { displayName: true } },
      },
    }),
  ]);

  return (
    <div>
      <h1>E aí, {user.name ?? user.username}!</h1>
      <p className="muted">Aqui está o que está rolando no grupo.</p>

      <div className="game-grid" style={{ marginTop: 20, marginBottom: 24 }}>
        <div className="card" style={{ margin: 0 }}>
          <span className="muted">Jogos com interesse</span>
          <h2 style={{ margin: "4px 0 0" }}>{interested}</h2>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <span className="muted">Meus Favoritos</span>
          <h2 style={{ margin: "4px 0 0" }}>{favorite}</h2>
        </div>
        <div className="card" style={{ margin: 0 }}>
          <span className="muted">Biblioteca</span>
          <h2 style={{ margin: "4px 0 0" }}>{owned}</h2>
        </div>
      </div>

      <div className="quick-actions">
        <Link href="/draw" className="btn">
          <DiceIcon width={16} height={16} />
          Sortear o jogo de hoje
        </Link>
        <Link href="/swipe" className="btn secondary">
          <HeartSwipeIcon width={16} height={16} />
          Abrir o Priquitinder
        </Link>
        <Link href="/prikedin" className="btn secondary">
          <BriefcaseIcon width={16} height={16} />
          Ver vagas do Prikedin
        </Link>
      </div>

      <div className="card">
        <h2>Vagas abertas no grupo</h2>
        {openRecruitments.length === 0 ? (
          <p className="muted">Nenhuma vaga aberta agora. Que tal criar uma no Prikedin?</p>
        ) : (
          <ul>
            {openRecruitments.map((r) => (
              <li key={r.id} style={{ marginBottom: 6 }}>
                <Link href={`/prikedin/${r.id}`}>
                  {r.game.name} — {new Date(r.scheduledAt).toLocaleString("pt-BR")}
                </Link>{" "}
                <span className="muted">(criado por {r.createdBy.displayName})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
