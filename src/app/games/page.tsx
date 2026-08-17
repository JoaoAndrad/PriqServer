"use client";

import { useEffect, useState, useCallback } from "react";
import type { GameDTO, UserGameDTO } from "@/types";
import type { GameFlags } from "@/components/games/GameCategoryToggle";
import GameCard from "@/components/games/GameCard";
import GameAutocomplete from "@/components/games/GameAutocomplete";

const EMPTY_FLAGS: GameFlags = {
  interested: false,
  favorite: false,
  owned: false,
  blacklisted: false,
};

export default function GamesPage() {
  const [myGames, setMyGames] = useState<UserGameDTO[]>([]);
  const [searchResults, setSearchResults] = useState<GameDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMyGames = useCallback(async () => {
    const res = await fetch("/api/games");
    const data = await res.json();
    setMyGames(data.userGames ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMyGames();
  }, [loadMyGames]);

  function flagsFor(gameId: string): GameFlags {
    const existing = myGames.find((ug) => ug.gameId === gameId);
    return existing
      ? {
          interested: existing.interested,
          favorite: existing.favorite,
          owned: existing.owned,
          blacklisted: existing.blacklisted,
        }
      : EMPTY_FLAGS;
  }

  async function toggleFlag(
    game: GameDTO,
    key: keyof GameFlags,
    value: boolean,
  ) {
    const current = flagsFor(game.id);
    const nextFlags = { ...current, [key]: value };

    // otimista
    setMyGames((prev) => {
      const idx = prev.findIndex((ug) => ug.gameId === game.id);
      if (idx === -1) {
        if (!Object.values(nextFlags).some(Boolean)) return prev;
        return [
          ...prev,
          {
            id: `temp-${game.id}`,
            userId: "",
            gameId: game.id,
            source: "manual",
            game,
            ...nextFlags,
          },
        ];
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...nextFlags };
      return copy;
    });

    await fetch("/api/user-games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: game.id, ...nextFlags }),
    });
    loadMyGames();
  }

  const categorized = {
    interested: myGames.filter((ug) => ug.interested),
    favorite: myGames.filter((ug) => ug.favorite),
    owned: myGames.filter((ug) => ug.owned),
    blacklisted: myGames.filter((ug) => ug.blacklisted),
  };

  return (
    <div>
      <h1>Meus jogos</h1>
      <p className="muted">
        Busque um jogo e marque as categorias: interesse, favorito, possui ou blacklist.
      </p>

      <GameAutocomplete
        onSelect={(game) =>
          setSearchResults((prev) => (prev.some((g) => g.id === game.id) ? prev : [game, ...prev]))
        }
      />

      {searchResults.length > 0 && (
        <div className="card">
          <h2>Resultados da busca</h2>
          <div className="game-grid">
            {searchResults.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                flags={flagsFor(game.id)}
                onToggle={(key, value) => toggleFlag(game, key, value)}
              />
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted">Carregando seus jogos...</p>
      ) : (
        <>
          <GameSection title="Com interesse" items={categorized.interested} onToggle={toggleFlag} flagsFor={flagsFor} accordion />
          <GameSection title="Favoritos" items={categorized.favorite} onToggle={toggleFlag} flagsFor={flagsFor} />
          <GameSection title="Na biblioteca" items={categorized.owned} onToggle={toggleFlag} flagsFor={flagsFor} accordion />
          <GameSection title="Blacklist" items={categorized.blacklisted} onToggle={toggleFlag} flagsFor={flagsFor} />
        </>
      )}
    </div>
  );
}

function GameSection({
  title,
  items,
  onToggle,
  flagsFor,
  accordion,
}: {
  title: string;
  items: UserGameDTO[];
  onToggle: (game: GameDTO, key: keyof GameFlags, value: boolean) => void;
  flagsFor: (gameId: string) => GameFlags;
  accordion?: boolean;
}) {
  if (items.length === 0) return null;

  const grid = (
    <div className="game-grid">
      {items.map((ug) => (
        <GameCard
          key={ug.gameId}
          game={ug.game}
          flags={flagsFor(ug.gameId)}
          onToggle={(key, value) => onToggle(ug.game, key, value)}
        />
      ))}
    </div>
  );

  if (accordion) {
    return (
      <details className="card">
        <summary>
          {title} ({items.length})
        </summary>
        {grid}
      </details>
    );
  }

  return (
    <div className="card">
      <h2>{title}</h2>
      {grid}
    </div>
  );
}
