"use client";

import { useEffect, useRef } from "react";

export default function TransitionOverlay({ show }: { show: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (show) {
      const audio = new Audio("/sounds/batman-transition.mp3");
      audio.volume = 0.6;
      audioRef.current = audio;
      // navegadores podem bloquear autoplay sem interação prévia — ignora silenciosamente.
      audio.play().catch(() => {});
    }

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="pow-overlay" role="status" aria-label="Carregando">
      <div className="pow-rays" />
      <img src="/favicon.ico" alt="" className="pow-favicon" />
    </div>
  );
}
