import type { GameDTO } from "@/types";

interface FallbackEntry {
  gameId: string;
  interestedCount: number;
  favoriteCount: number;
  game: GameDTO | null;
}

export default function DrawResult({
  picked,
  fallbackUsed,
}: {
  picked: GameDTO | null;
  fallbackUsed: boolean;
  fallback: FallbackEntry[];
}) {
  if (!picked) {
    return (
      <div className="card">
        <p className="muted">Ninguém do grupo selecionado marcou nenhum jogo ainda.</p>
      </div>
    );
  }

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="muted">O jogo de hoje é...</p>
      {picked.coverUrl && (
        <img
          src={picked.coverUrl}
          alt=""
          style={{ maxWidth: 240, borderRadius: 8, margin: "0 auto 12px" }}
        />
      )}
      <h2>{picked.name}</h2>
      {fallbackUsed && (
        <p className="muted">
          Ninguém tinha um jogo em comum entre todos — sorteado entre os jogos com mais gente
          interessada (ou favoritos) no grupo.
        </p>
      )}
    </div>
  );
}
