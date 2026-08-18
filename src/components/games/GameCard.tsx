"use client";

import type { GameDTO } from "@/types";
import { gameStoreUrl } from "@/lib/games/storeUrl";
import { coverSrc } from "@/lib/games/coverProxy";
import GameCategoryToggle, { type GameFlags } from "./GameCategoryToggle";

export interface GameSocialLists {
  ownedBy: string[];
  favoritedBy: string[];
  interestedBy: string[];
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

export default function GameCard({
  game,
  flags,
  social,
  onToggle,
}: {
  game: GameDTO;
  flags: GameFlags;
  social?: GameSocialLists;
  onToggle: (key: keyof GameFlags, value: boolean) => void;
}) {
  const storeUrl = gameStoreUrl(game);
  const cover = coverSrc(game.coverUrl);
  const genres = parseGenres(game.genres);

  return (
    <div className="game-card">
      {cover &&
        (storeUrl ? (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <img src={cover} alt="" />
          </a>
        ) : (
          <img src={cover} alt="" />
        ))}
      <div className="body">
        {storeUrl ? (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <strong>{game.name}</strong>
          </a>
        ) : (
          <strong>{game.name}</strong>
        )}
        {game.onGamePass && <div><span className="badge gamepass">Game Pass</span></div>}

        {genres.length > 0 && (
          <div className="swipe-genres" style={{ justifyContent: "flex-start" }}>
            {genres.map((g) => (
              <span key={g} className="badge">{g}</span>
            ))}
          </div>
        )}

        {game.description && <p className="swipe-description">{game.description}</p>}

        {social && (
          <div style={{ marginTop: 6 }}>
            {social.ownedBy.length > 0 && (
              <p className="muted" style={{ margin: "2px 0", fontSize: "0.8rem" }}>
                Na biblioteca de: {social.ownedBy.join(", ")}
              </p>
            )}
            {social.favoritedBy.length > 0 && (
              <p className="muted" style={{ margin: "2px 0", fontSize: "0.8rem" }}>
                Favoritado por: {social.favoritedBy.join(", ")}
              </p>
            )}
            {social.interestedBy.length > 0 && (
              <p className="muted" style={{ margin: "2px 0", fontSize: "0.8rem" }}>
                Demonstrou interesse: {social.interestedBy.join(", ")}
              </p>
            )}
          </div>
        )}

        <GameCategoryToggle flags={flags} onToggle={onToggle} />
      </div>
    </div>
  );
}
