"use client";

import type { CSSProperties } from "react";

type IntegrationToggleProps = {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
};

export function IntegrationToggle({
  checked,
  disabled,
  onChange,
  label,
}: IntegrationToggleProps) {
  const trackStyle: CSSProperties = {
    backgroundColor: checked ? "#18181b" : "#e4e4e7",
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={trackStyle}
      className={`integration-toggle focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-0 p-0.5 transition-[background-color] duration-200 ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <span
        aria-hidden
        className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}
