import type { ReactNode } from "react";

type CenteredPageContentProps = {
  children: ReactNode;
  className?: string;
};

export function CenteredPageContent({ children, className = "" }: CenteredPageContentProps) {
  return (
    <div
      className={`flex h-full min-h-[calc(100dvh-5rem)] w-full items-center justify-center ${className}`}
    >
      <div className="flex w-full max-w-3xl flex-col gap-3">{children}</div>
    </div>
  );
}
