"use client";

import { ReactNode } from "react";
import { CloseIcon } from "./icons";

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card"
        style={{ width: "min(480px, 90vw)", margin: 0 }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <button className="secondary" onClick={onClose} aria-label="Fechar" type="button">
            <CloseIcon width={14} height={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
