"use client";

interface ToggleProps {
  on: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}

export function Toggle({ on, onChange, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onChange?.(!on)}
      className={[
        "relative w-8 h-[18px] rounded-full transition-colors shrink-0",
        "disabled:opacity-50 disabled:pointer-events-none",
        on ? "bg-brand-700" : "bg-ink-200",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-all",
          on ? "left-[16px]" : "left-[2px]",
        ].join(" ")}
      />
    </button>
  );
}
