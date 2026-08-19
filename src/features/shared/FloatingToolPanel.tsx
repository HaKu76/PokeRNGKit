import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

interface PanelPosition {
  readonly left: number;
  readonly top: number;
}

interface DragState extends PanelPosition {
  readonly pointerId: number;
  readonly pointerX: number;
  readonly pointerY: number;
}

const VIEWPORT_GUTTER = 12;
const KEYBOARD_DRAG_STEP = 16;
const KEYBOARD_DIRECTIONS: Readonly<Record<string, readonly [number, number]>> =
  {
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
  };

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
  const dragState = useRef<DragState | undefined>(undefined);
  const [position, setPosition] = useState<PanelPosition>();
  const [dragging, setDragging] = useState(false);
  const headingId = `${id}-heading`;

  const restoreTriggerFocus = useCallback(() => {
    requestAnimationFrame(() => document.getElementById(triggerId)?.focus());
  }, [triggerId]);

  useEffect(() => {
    if (expanded && !wasExpanded.current) {
      panelRef.current?.focus();
    }
    wasExpanded.current = expanded;
  }, [expanded]);

  const clampPosition = useCallback((left: number, top: number) => {
    const panel = panelRef.current;
    if (!panel) return { left, top };
    const maxLeft = Math.max(
      VIEWPORT_GUTTER,
      window.innerWidth - panel.offsetWidth - VIEWPORT_GUTTER,
    );
    const maxTop = Math.max(
      VIEWPORT_GUTTER,
      window.innerHeight - panel.offsetHeight - VIEWPORT_GUTTER,
    );
    return {
      left: Math.min(Math.max(left, VIEWPORT_GUTTER), maxLeft),
      top: Math.min(Math.max(top, VIEWPORT_GUTTER), maxTop),
    };
  }, []);

  useEffect(() => {
    if (!expanded) return;
    const keepPanelInViewport = () => {
      setPosition((current) =>
        current ? clampPosition(current.left, current.top) : current,
      );
    };
    const frame = requestAnimationFrame(keepPanelInViewport);
    window.addEventListener("resize", keepPanelInViewport);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", keepPanelInViewport);
    };
  }, [clampPosition, expanded]);

  useEffect(() => {
    if (!expanded) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (
        event.target instanceof Element &&
        event.target.closest(".modal-backdrop, .threedsprofiles-overlay")
      ) {
        return;
      }
      event.preventDefault();
      onExpandedChange(false);
      restoreTriggerFocus();
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        panelRef.current?.contains(target) ||
        document.getElementById(triggerId)?.contains(target) ||
        (target instanceof Element &&
          target.closest(
            ".floating-tool-rail, .legal-footer-action, .modal-backdrop, .threedsprofiles-overlay",
          ))
      ) {
        return;
      }
      onExpandedChange(false);
      restoreTriggerFocus();
    };

    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded, onExpandedChange, restoreTriggerFocus, triggerId]);

  useEffect(() => {
    if (!expanded) return;
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      if (
        document.activeElement instanceof Element &&
        document.activeElement.closest(
          ".modal-backdrop, .threedsprofiles-overlay",
        )
      ) {
        return;
      }
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (
        !panel.contains(document.activeElement) ||
        (event.shiftKey && document.activeElement === panel)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", containFocus);
    return () => document.removeEventListener("keydown", containFocus);
  }, [expanded]);

  const startDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (
      event.button !== 0 ||
      window.matchMedia("(max-width: 900px)").matches ||
      (event.target as Element).closest("button")
    ) {
      return;
    }
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      left: rect.left,
      top: rect.top,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
    };
    setPosition({ left: rect.left, top: rect.top });
    setDragging(true);
  };

  const dragPanel = (event: ReactPointerEvent<HTMLElement>) => {
    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setPosition(
      clampPosition(
        drag.left + event.clientX - drag.pointerX,
        drag.top + event.clientY - drag.pointerY,
      ),
    );
  };

  const stopDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (dragState.current?.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragState.current = undefined;
    setDragging(false);
  };

  const moveWithKeyboard = (event: ReactKeyboardEvent<HTMLElement>) => {
    const direction = KEYBOARD_DIRECTIONS[event.key];
    if (
      event.target !== event.currentTarget ||
      !direction ||
      window.matchMedia("(max-width: 900px)").matches
    ) {
      return;
    }
    event.preventDefault();
    const rect = panelRef.current?.getBoundingClientRect();
    if (!rect) return;
    const step = event.shiftKey ? KEYBOARD_DRAG_STEP * 3 : KEYBOARD_DRAG_STEP;
    setPosition(
      clampPosition(
        rect.left + direction[0] * step,
        rect.top + direction[1] * step,
      ),
    );
  };

  if (!expanded) return null;

  const panelStyle = position
    ? ({
        "--panel-left": `${position.left}px`,
        "--panel-top": `${position.top}px`,
      } as CSSProperties)
    : undefined;

  return (
    <>
      <div aria-hidden="true" className="floating-tool-scrim" />
      <section
        aria-labelledby={headingId}
        className={`floating-tool-panel${className ? ` ${className}` : ""}`}
        data-dragging={dragging || undefined}
        data-positioned={position ? true : undefined}
        data-tone={tone}
        id={id}
        ref={panelRef}
        aria-modal="true"
        role="dialog"
        style={panelStyle}
        tabIndex={-1}
      >
        <header
          aria-label={label}
          className="floating-tool-panel-heading"
          onKeyDown={moveWithKeyboard}
          onPointerCancel={stopDrag}
          onPointerDown={startDrag}
          onPointerMove={dragPanel}
          onPointerUp={stopDrag}
          tabIndex={0}
        >
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
    </>
  );
}
