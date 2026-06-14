"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Check, X } from "lucide-react";

export type SwipeableCardHandle = {
  animateOut: (direction: "left" | "right", onComplete?: () => void) => void;
  isAnimating: () => boolean;
};

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
const EXIT_DISTANCE = 820;
const EXIT_DURATION_MS = 340;

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

export const SwipeableCard = forwardRef<SwipeableCardHandle, SwipeableCardProps>(
  function SwipeableCard(
    {
      children,
      onSwipeLeft,
      onSwipeRight,
      canSwipeLeft = true,
      canSwipeRight = true,
      resetKey,
    },
    ref,
  ) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [animatingOut, setAnimatingOut] = useState(false);
    const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);
    const startRef = useRef<{ x: number; y: number } | null>(null);
    const completeRef = useRef<(() => void) | undefined>(undefined);

    const rotation = Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, offset.x / 12));
    const exitScale = animatingOut ? 0.9 : 1;
    const exitOpacity = animatingOut ? 0.35 : 1;

    const acceptOpacity =
      exitDirection === "right"
        ? 1
        : Math.min(1, Math.max(0, offset.x / SWIPE_THRESHOLD));
    const rejectOpacity =
      exitDirection === "left"
        ? 1
        : Math.min(1, Math.max(0, -offset.x / SWIPE_THRESHOLD));

    function resetPosition() {
      setOffset({ x: 0, y: 0 });
      setAnimatingOut(false);
      setExitDirection(null);
      startRef.current = null;
      setDragging(false);
      completeRef.current = undefined;
    }

    function runExitAnimation(direction: "left" | "right", onComplete?: () => void) {
      if (animatingOut) return;

      completeRef.current = onComplete;
      setExitDirection(direction);
      setAnimatingOut(true);
      setDragging(false);
      setOffset({
        x: direction === "right" ? EXIT_DISTANCE : -EXIT_DISTANCE,
        y: direction === "right" ? -48 : -48,
      });

      window.setTimeout(() => {
        const done = completeRef.current;
        resetPosition();
        done?.();
      }, EXIT_DURATION_MS);
    }

    useImperativeHandle(ref, () => ({
      animateOut: runExitAnimation,
      isAnimating: () => animatingOut,
    }));

    useEffect(() => {
      resetPosition();
    }, [resetKey]);

    function finishSwipe(direction: "left" | "right") {
      runExitAnimation(direction, () => {
        if (direction === "right") onSwipeRight?.();
        else onSwipeLeft?.();
      });
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
      <div className="relative flex min-h-0 flex-1 flex-col rounded-xl p-1">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 z-0 rounded-xl transition-opacity duration-300 ${
            exitDirection === "right" || acceptOpacity > 0.15
              ? "bg-emerald-500/10"
              : exitDirection === "left" || rejectOpacity > 0.15
                ? "bg-red-500/10"
                : "bg-transparent"
          }`}
          style={{
            opacity:
              exitDirection === "right"
                ? 1
                : exitDirection === "left"
                  ? 1
                  : Math.max(acceptOpacity, rejectOpacity) * 0.85,
          }}
        />

        <div className="relative z-10 flex min-h-0 flex-1 items-stretch gap-2">
          <div
            aria-hidden
            className="flex w-5 shrink-0 items-center justify-center self-stretch transition-opacity duration-150"
            style={{ opacity: acceptOpacity }}
          >
            <Check size={20} strokeWidth={2.25} className="text-emerald-600" />
          </div>

          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${rotation}deg) scale(${exitScale})`,
              opacity: exitOpacity,
              transition: dragging
                ? "none"
                : `transform ${EXIT_DURATION_MS}ms cubic-bezier(0.32, 0.72, 0, 1), opacity ${EXIT_DURATION_MS}ms ease-out`,
            }}
            className={`relative min-h-0 min-w-0 flex-1 touch-none select-none flex-col pt-2 ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            {children}
          </div>

          <div
            aria-hidden
            className="flex w-5 shrink-0 items-center justify-center self-stretch transition-opacity duration-150"
            style={{ opacity: rejectOpacity }}
          >
            <X size={20} strokeWidth={2.25} className="text-red-600" />
          </div>
        </div>
      </div>
    );
  },
);
