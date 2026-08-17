"use client";

import type { GameDTO } from "@/types";
import { gameStoreUrl } from "@/lib/games/storeUrl";
import GameCategoryToggle, { type GameFlags } from "./GameCategoryToggle";

export default function GameCard({
  game,
  flags,
  onToggle,
}: {
  game: GameDTO;
  flags: GameFlags;
  onToggle: (key: keyof GameFlags, value: boolean) => void;
}) {
  const storeUrl = gameStoreUrl(game);

  return (
    <div className="game-card">
      {game.coverUrl &&
        (storeUrl ? (
          <a href={storeUrl} target="_blank" rel="noopener noreferrer">
            <img src={game.coverUrl} alt="" />
          </a>
        ) : (
          <img src={game.coverUrl} alt="" />
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
        <GameCategoryToggle flags={flags} onToggle={onToggle} />
      </div>
    </div>
  );
}
