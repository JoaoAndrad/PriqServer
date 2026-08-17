"use client";

import type { GameDTO } from "@/types";
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
  return (
    <div className="game-card">
      {game.coverUrl && <img src={game.coverUrl} alt="" />}
      <div className="body">
        <strong>{game.name}</strong>
        {game.onGamePass && <div><span className="badge gamepass">Game Pass</span></div>}
        <GameCategoryToggle flags={flags} onToggle={onToggle} />
      </div>
    </div>
  );
}
