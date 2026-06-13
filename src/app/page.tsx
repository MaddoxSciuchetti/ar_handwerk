import { Suspense } from "react";
import { AppShell } from "@/components/app-shell";

export default function Home() {
  return (
    <div className="h-dvh min-h-0 overflow-hidden">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-[13px] text-zinc-500">Loading…</div>}>
        <AppShell />
      </Suspense>
    </div>
  );
}
