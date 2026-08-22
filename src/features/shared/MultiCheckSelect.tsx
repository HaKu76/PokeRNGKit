import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useMenuPlacement } from "./useMenuPlacement";

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
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuPlacement = useMenuPlacement(
    rootRef,
    open && !disabled,
    options.length * 44 + 8,
  );
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
      if (
        !rootRef.current?.contains(event.target as Node) &&
        !menuRef.current?.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  return (
    <div
      className="field multi-check-field"
      data-open={open && !disabled ? "true" : undefined}
      ref={rootRef}
    >
      <span>{label}</span>
      <div className="multi-check-control">
        <button
          aria-controls={menuId}
          aria-expanded={open}
          aria-haspopup="true"
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
          <ChevronDown
            aria-hidden="true"
            className={open ? "rotated" : undefined}
            size={17}
          />
        </button>
        {open &&
          createPortal(
            <div
              aria-label={label}
              className="multi-check-menu"
              data-align={menuPlacement.horizontal}
              data-menu-portal="true"
              data-placement={menuPlacement.vertical}
              id={menuId}
              ref={menuRef}
              style={{
                left: `${menuPlacement.left}px`,
                maxHeight: `${menuPlacement.maxHeight}px`,
                top: `${menuPlacement.top}px`,
                width: `${menuPlacement.width}px`,
              }}
            >
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
            </div>,
            document.body,
          )}
      </div>
    </div>
  );
}
