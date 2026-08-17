"use client";

import type { GameDTO } from "@/types";
import { gameStoreUrl } from "@/lib/games/storeUrl";
import { coverSrc } from "@/lib/games/coverProxy";
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
  const cover = coverSrc(game.coverUrl);

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
        <GameCategoryToggle flags={flags} onToggle={onToggle} />
      </div>
    </div>
  );
}
