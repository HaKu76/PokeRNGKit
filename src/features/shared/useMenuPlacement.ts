import { useLayoutEffect, useState, type RefObject } from "react";

const VIEWPORT_GUTTER = 12;

export type MenuVerticalPlacement = "bottom" | "top";
export type MenuHorizontalPlacement = "start" | "end";

export interface MenuPlacement {
  readonly horizontal: MenuHorizontalPlacement;
  readonly left: number;
  readonly maxHeight: number;
  readonly top: number;
  readonly vertical: MenuVerticalPlacement;
  readonly width: number;
}

/** Keep shared option menus inside the viewport when their anchor is near an edge. */
export function useMenuPlacement(
  anchorRef: RefObject<HTMLElement | null>,
  menuRef: RefObject<HTMLElement | null>,
  open: boolean,
  estimatedHeight: number,
): MenuPlacement {
  const [placement, setPlacement] = useState<MenuPlacement>({
    horizontal: "start",
    left: -10000,
    maxHeight: 360,
    top: -10000,
    vertical: "bottom",
    width: 220,
  });

  useLayoutEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const availableBelow = window.innerHeight - rect.bottom - 12;
      const availableAbove = rect.top - 12;
      const renderedHeight = menuRef.current?.getBoundingClientRect().height;
      const maxWidth = Math.max(0, window.innerWidth - VIEWPORT_GUTTER * 2);
      const width = Math.min(maxWidth, Math.max(rect.width, 1));
      const requiredHeight = Math.min(
        renderedHeight && renderedHeight > 0 ? renderedHeight : estimatedHeight,
        360,
      );
      const canAlignEnd = rect.right - width >= VIEWPORT_GUTTER;
      const horizontal =
        rect.left + width > window.innerWidth - VIEWPORT_GUTTER && canAlignEnd
          ? "end"
          : "start";
      const vertical =
        availableBelow < requiredHeight && availableAbove > availableBelow
          ? "top"
          : "bottom";
      const availableHeight =
        vertical === "bottom" ? availableBelow : availableAbove;
      const maxHeight = Math.max(44, Math.min(360, availableHeight));
      const candidateLeft =
        horizontal === "end" ? rect.right - width : rect.left;
      const maxLeft = Math.max(
        VIEWPORT_GUTTER,
        window.innerWidth - width - VIEWPORT_GUTTER,
      );
      const left = Math.min(Math.max(candidateLeft, VIEWPORT_GUTTER), maxLeft);
      const maxTop = Math.max(
        VIEWPORT_GUTTER,
        window.innerHeight - maxHeight - VIEWPORT_GUTTER,
      );
      const menuHeight = Math.min(requiredHeight, maxHeight);
      const top =
        vertical === "top"
          ? Math.max(
              VIEWPORT_GUTTER,
              Math.min(rect.top - menuHeight - 6, maxTop),
            )
          : Math.min(rect.bottom + 6, maxTop);
      setPlacement({ horizontal, left, maxHeight, top, vertical, width });
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [anchorRef, estimatedHeight, menuRef, open]);

  return open
    ? placement
    : {
        horizontal: "start",
        left: -10000,
        maxHeight: 360,
        top: -10000,
        vertical: "bottom",
        width: 220,
      };
}
