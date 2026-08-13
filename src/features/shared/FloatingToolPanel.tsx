import { type PropsWithChildren, useCallback, useEffect, useRef } from "react";

interface FloatingToolPanelProps extends PropsWithChildren {
  readonly className?: string;
  readonly closeLabel: string;
  readonly expanded: boolean;
  readonly id: string;
  readonly label: string;
  readonly onExpandedChange: (expanded: boolean) => void;
  readonly subtitle?: string;
  readonly tone: "amber" | "brand" | "teal";
  readonly triggerId: string;
}

export function FloatingToolPanel({
  children,
  className,
  closeLabel,
  expanded,
  id,
  label,
  onExpandedChange,
  subtitle,
  tone,
  triggerId,
}: FloatingToolPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const wasExpanded = useRef(expanded);
  const headingId = `${id}-heading`;

  const restoreTriggerFocus = useCallback(() => {
    requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  }, [triggerId]);

  useEffect(() => {
    if (expanded && !wasExpanded.current) panelRef.current?.focus();
    wasExpanded.current = expanded;
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      onExpandedChange(false);
      restoreTriggerFocus();
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        document.getElementById(triggerId)?.contains(target)
      ) {
        return;
      }
      onExpandedChange(false);
      restoreTriggerFocus();
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [expanded, onExpandedChange, restoreTriggerFocus, triggerId]);

  if (!expanded) return null;

  return (
    <section
      aria-labelledby={headingId}
      className={`floating-tool-panel${className ? ` ${className}` : ""}`}
      data-tone={tone}
      id={id}
      ref={panelRef}
      role="dialog"
      tabIndex={-1}
    >
      <header className="floating-tool-panel-heading">
        <div className="floating-tool-panel-title">
          <strong id={headingId}>{label}</strong>
          {subtitle && <span title={subtitle}>{subtitle}</span>}
        </div>
        <button
          aria-label={closeLabel}
          className="floating-tool-panel-close"
          onClick={() => {
            onExpandedChange(false);
            restoreTriggerFocus();
          }}
          title={closeLabel}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      {children}
    </section>
  );
}
