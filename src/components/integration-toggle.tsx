"use client";

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
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`focus-ring relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      } ${checked ? "bg-emerald-500" : "bg-zinc-200"}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-4" : "translate-x-0"
        }`}
      />
    </button>
  );
}
