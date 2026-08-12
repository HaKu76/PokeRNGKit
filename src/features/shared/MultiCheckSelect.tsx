import { useEffect, useRef, useState } from "react";

interface MultiCheckSelectProps {
  anyLabel: string;
  disabled?: boolean;
  label: string;
  mask: number;
  onChange(mask: number): void;
  options: readonly { label: string; value: number }[];
  resetHint?: string;
}

export function MultiCheckSelect({
  anyLabel,
  disabled,
  label,
  mask,
  onChange,
  options,
  resetHint,
}: MultiCheckSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const fullMask = options.reduce(
    (value, option) => value | (1 << option.value),
    0,
  );
  const selected = options.filter(
    (option) => (mask & (1 << option.value)) !== 0,
  );
  const summary =
    mask === 0 || mask === fullMask
      ? anyLabel
      : selected.map((option) => option.label).join(", ");

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div className="field multi-check-field" ref={rootRef}>
      <span>{label}</span>
      <button
        aria-expanded={open}
        className="multi-check-trigger"
        disabled={disabled}
        onClick={(event) => {
          if (event.ctrlKey) {
            onChange(0);
            setOpen(false);
            return;
          }
          setOpen((current) => !current);
        }}
        title={resetHint}
        type="button"
      >
        <span>{summary}</span>
        <span aria-hidden="true">v</span>
      </button>
      {open && (
        <div className="multi-check-menu">
          {options.map((option) => (
            <label key={option.value}>
              <input
                checked={(mask & (1 << option.value)) !== 0}
                onChange={(event) =>
                  onChange(
                    event.target.checked
                      ? mask | (1 << option.value)
                      : mask & ~(1 << option.value),
                  )
                }
                type="checkbox"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
