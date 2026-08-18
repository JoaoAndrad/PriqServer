"use client";

import { useRef, useState } from "react";
import { CloseIcon, HeartSwipeIcon } from "@/components/ui/icons";
import { coverSrc } from "@/lib/games/coverProxy";
import type { GameDTO } from "@/types";

const VOTE_THRESHOLD = 100;
const EXIT_DISTANCE = 600;

function parseGenres(genres: string | null): string[] {
  if (!genres) return [];
  try {
    const parsed = JSON.parse(genres);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function SwipeCard({
  game,
  ownedByOthers,
  onVote,
}: {
  game: GameDTO;
  ownedByOthers?: boolean;
  onVote: (liked: boolean) => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"like" | "dislike" | null>(null);
  const startX = useRef(0);

  function handlePointerDown(e: React.PointerEvent) {
    if (exiting) return;
    setDragging(true);
    startX.current = e.clientX;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setOffsetX(e.clientX - startX.current);
  }

  function handlePointerUp() {
    if (!dragging) return;
    setDragging(false);

    if (Math.abs(offsetX) > VOTE_THRESHOLD) {
      vote(offsetX > 0);
    } else {
      setOffsetX(0);
    }
  }

  function vote(liked: boolean) {
    setExiting(liked ? "like" : "dislike");
    setOffsetX(liked ? EXIT_DISTANCE : -EXIT_DISTANCE);
    setTimeout(() => onVote(liked), 220);
  }

  const rotation = offsetX / 20;
  const opacity = exiting ? 0 : 1;
  const genres = parseGenres(game.genres);

  return (
    <div className="swipe-card-stage">
      <div
        className="swipe-card"
        style={{
          transform: `translateX(${offsetX}px) rotate(${rotation}deg)`,
          transition: dragging ? "none" : "transform 0.25s ease, opacity 0.25s ease",
          opacity,
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {offsetX > 30 && <span className="swipe-badge like">CURTI</span>}
        {offsetX < -30 && <span className="swipe-badge dislike">PASSO</span>}

        {game.coverUrl && <img src={coverSrc(game.coverUrl)!} alt="" draggable={false} />}
        <div className="body">
          {ownedByOthers && <span className="badge owned">Na biblioteca de alguém</span>}
          <h2 style={{ margin: 0 }}>{game.name}</h2>
          {genres.length > 0 && (
            <div className="swipe-genres">
              {genres.map((g) => (
                <span key={g} className="badge">{g}</span>
              ))}
            </div>
          )}
          {game.description && <p className="swipe-description">{game.description}</p>}
        </div>
      </div>

      <div className="swipe-buttons">
        <button className="danger" onClick={() => vote(false)} disabled={!!exiting}>
          <CloseIcon width={20} height={20} />
        </button>
        <button onClick={() => vote(true)} disabled={!!exiting}>
          <HeartSwipeIcon width={20} height={20} />
        </button>
      </div>
    </div>
  );
}
