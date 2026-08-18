import { coverSrc } from "@/lib/games/coverProxy";
import type { GameDTO } from "@/types";

interface NameLists {
  interestedBy: string[];
  favoritedBy: string[];
  ownedBy: string[];
}

interface FallbackEntry extends NameLists {
  gameId: string;
  interestedCount: number;
  favoriteCount: number;
  game: GameDTO | null;
}

function parseGenres(genres: string | null | undefined): string[] {
  if (!genres) return [];
  try {
    const parsed = JSON.parse(genres);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function DrawResult({
  picked,
  pickedNames,
}: {
  picked: GameDTO | null;
  pickedNames: NameLists | null;
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

  const genres = parseGenres(picked.genres);

  return (
    <div className="card" style={{ textAlign: "center" }}>
      <p className="muted">O jogo de hoje é...</p>
      {picked.coverUrl && (
        <img
          src={coverSrc(picked.coverUrl)!}
          alt=""
          style={{ maxWidth: 240, borderRadius: 8, margin: "0 auto 12px" }}
        />
      )}
      <h2>{picked.name}</h2>

      {genres.length > 0 && (
        <div className="swipe-genres">
          {genres.map((g) => (
            <span key={g} className="badge">{g}</span>
          ))}
        </div>
      )}

      {picked.description && (
        <p className="swipe-description" style={{ textAlign: "center" }}>
          {picked.description}
        </p>
      )}

      {pickedNames && (
        <div style={{ marginTop: 12, textAlign: "left" }}>
          {pickedNames.ownedBy.length > 0 && (
            <p className="muted" style={{ margin: "4px 0" }}>
              Na biblioteca de: {pickedNames.ownedBy.join(", ")}
            </p>
          )}
          {pickedNames.favoritedBy.length > 0 && (
            <p className="muted" style={{ margin: "4px 0" }}>
              Favoritado por: {pickedNames.favoritedBy.join(", ")}
            </p>
          )}
          {pickedNames.interestedBy.length > 0 && (
            <p className="muted" style={{ margin: "4px 0" }}>
              Demonstrou interesse: {pickedNames.interestedBy.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
