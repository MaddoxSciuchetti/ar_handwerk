"use client";

import type { ReactNode } from "react";
import type { ProposedAction } from "@/lib/actions/types";

const PEEK_PER_LAYER = 14;
const MAX_BEHIND = 3;
const SCALE_STEP = 0.022;

type ActionCardStackProps = {
  actions: ProposedAction[];
  step: number;
  children: ReactNode;
};

function BehindCardShell({
  depth,
  top,
  scale,
  zIndex,
}: {
  depth: number;
  top: number;
  scale: number;
  zIndex: number;
}) {
  return (
    <div
      aria-hidden
      className="action-card-layer pointer-events-none absolute inset-x-0 overflow-hidden rounded-xl border border-zinc-200/70 bg-white"
      style={{
        top,
        bottom: 0,
        transform: `scale(${scale})`,
        transformOrigin: "top center",
        zIndex,
        opacity: 0.42 + (MAX_BEHIND - depth) * 0.1,
        boxShadow:
          depth === 1
            ? "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)"
            : depth === 2
              ? "0 2px 8px rgba(0,0,0,0.05)"
              : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    />
  );
}

export function ActionCardStack({ actions, step, children }: ActionCardStackProps) {
  const behind = actions.slice(step + 1, step + 1 + MAX_BEHIND);
  const stackPeek = behind.length * PEEK_PER_LAYER;

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col"
      style={{ paddingTop: stackPeek > 0 ? stackPeek + 4 : 0 }}
    >
      {behind.map((action, index) => {
        const depth = index + 1;
        const top = (behind.length - depth) * PEEK_PER_LAYER;
        const scale = 1 - depth * SCALE_STEP;

        return (
          <BehindCardShell
            key={action.id}
            depth={depth}
            top={top}
            scale={scale}
            zIndex={depth}
          />
        );
      })}

      <div
        key={step}
        className="action-card-front relative z-20 flex h-full min-h-[20rem] flex-1 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.08),0_2px_6px_rgba(0,0,0,0.04)]"
      >
        {children}
      </div>
    </div>
  );
}
