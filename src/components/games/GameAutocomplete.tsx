"use client";

import { useEffect, useRef, useState } from "react";
import { coverSrc } from "@/lib/games/coverProxy";
import type { GameDTO } from "@/types";

export default function GameAutocomplete({
  onSelect,
  placeholder = "Digite o nome do jogo...",
}: {
  onSelect: (game: GameDTO) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GameDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forcing, setForcing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  async function runSearch(trimmed: string, force: boolean) {
    const res = await fetch(
      `/api/games/search?q=${encodeURIComponent(trimmed)}${force ? "&force=true" : ""}`,
    );
    const data = await res.json();
    return data.games ?? [];
  }

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setOpen(false);
      return;
    }

    let ignore = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      const games = await runSearch(trimmed, false);
      if (ignore) return;
      setResults(games);
      setOpen(true);
      setLoading(false);
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function handleForceSearch() {
    const trimmed = query.trim();
    if (trimmed.length === 0) return;
    setForcing(true);
    const games = await runSearch(trimmed, true);
    setResults(games);
    setOpen(true);
    setForcing(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(game: GameDTO) {
    onSelect(game);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  return (
    <div className="autocomplete" ref={containerRef}>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          autoFocus
          style={{ flex: 1 }}
        />
        <button
          type="button"
          className="secondary"
          onClick={handleForceSearch}
          disabled={query.trim().length === 0 || forcing}
          title="Ignora o cache e busca de novo na Steam/TheGamesDB"
        >
          {forcing ? "Buscando..." : "Forçar nova busca"}
        </button>
      </div>
      {open && (
        <div className="autocomplete-dropdown">
          {loading && <div className="autocomplete-item muted">Buscando...</div>}
          {!loading && results.length === 0 && (
            <div className="autocomplete-item muted">Nenhum jogo encontrado.</div>
          )}
          {!loading &&
            results.map((game) => (
              <button
                key={game.id}
                type="button"
                className="autocomplete-item"
                onClick={() => handleSelect(game)}
              >
                {game.coverUrl ? (
                  <img src={coverSrc(game.coverUrl)!} alt="" />
                ) : (
                  <span className="autocomplete-item-icon-placeholder" />
                )}
                <span>{game.name}</span>
                {game.onGamePass && <span className="badge gamepass">Game Pass</span>}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
