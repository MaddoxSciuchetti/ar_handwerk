"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type ActionFocusModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function ActionFocusModal({ open, title, onClose, children }: ActionFocusModalProps) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        aria-label="Close focus mode"
        className="pointer-events-auto absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="pointer-events-auto relative z-10 flex h-[min(78vh,34rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_16px_48px_rgba(0,0,0,0.16),0_32px_80px_rgba(0,0,0,0.12)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="focus-ring absolute right-3 top-3 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/80 bg-white text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-800"
          aria-label="Close focus mode"
        >
          <X size={16} strokeWidth={1.75} aria-hidden />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
