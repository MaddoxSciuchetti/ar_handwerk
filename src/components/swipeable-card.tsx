"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type SwipeableCardProps = {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
  resetKey?: string | number;
};

const SWIPE_THRESHOLD = 96;
const MAX_ROTATION = 14;

function isSwipeBlockedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    tag === "BUTTON" ||
    target.isContentEditable
  );
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft = true,
  canSwipeRight = true,
  resetKey,
}: SwipeableCardProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [animatingOut, setAnimatingOut] = useState(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, offset.x / 12));

  function resetPosition() {
    setOffset({ x: 0, y: 0 });
    setAnimatingOut(false);
    startRef.current = null;
    setDragging(false);
  }

  useEffect(() => {
    resetPosition();
  }, [resetKey]);

  function finishSwipe(direction: "left" | "right") {
    setAnimatingOut(true);
    setOffset({ x: direction === "right" ? 720 : -720, y: offset.y });
    window.setTimeout(() => {
      if (direction === "right") onSwipeRight?.();
      else onSwipeLeft?.();
      resetPosition();
    }, 220);
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (animatingOut || isSwipeBlockedTarget(event.target)) return;

    startRef.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || !startRef.current || animatingOut) return;

    const dx = event.clientX - startRef.current.x;
    const dy = (event.clientY - startRef.current.y) * 0.15;
    const clampedX =
      dx > 0 && !canSwipeRight ? Math.min(dx, 24) : dx < 0 && !canSwipeLeft ? Math.max(dx, -24) : dx;

    setOffset({ x: clampedX, y: dy });
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragging || animatingOut) return;

    event.currentTarget.releasePointerCapture(event.pointerId);

    if (offset.x >= SWIPE_THRESHOLD && canSwipeRight) {
      finishSwipe("right");
      return;
    }

    if (offset.x <= -SWIPE_THRESHOLD && canSwipeLeft) {
      finishSwipe("left");
      return;
    }

    resetPosition();
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={cardRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${rotation}deg)`,
          transition: dragging ? "none" : "transform 220ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        className={`flex min-h-0 flex-1 touch-none select-none flex-col ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
