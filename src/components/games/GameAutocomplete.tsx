"use client";

import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch(`/api/games/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (ignore) return;
      setResults(data.games ?? []);
      setOpen(true);
      setLoading(false);
    }, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

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
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        autoFocus
      />
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
                  <img src={game.coverUrl} alt="" />
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
