"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { formatPioneerExtractionJson, type Task } from "@/lib/tasks";

type PioneerExtractionModalProps = {
  open: boolean;
  task: Task;
  onClose: () => void;
};

export function PioneerExtractionModal({ open, task, onClose }: PioneerExtractionModalProps) {
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
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        aria-label="Close Pioneer extraction"
        className="pointer-events-auto absolute inset-0 bg-zinc-950/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Pioneer extraction for ${task.title}`}
        className="pointer-events-auto relative z-10 flex max-h-[min(85vh,40rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-[0_16px_48px_rgba(0,0,0,0.16)]"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/[0.06] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Pioneer extraction
            </p>
            <p className="truncate text-[13px] font-semibold text-zinc-900">{task.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-800"
            aria-label="Close Pioneer extraction"
          >
            <X size={16} strokeWidth={1.75} aria-hidden />
          </button>
        </div>
        <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-zinc-700">
          {formatPioneerExtractionJson(task)}
        </pre>
      </div>
    </div>,
    document.body,
  );
}
