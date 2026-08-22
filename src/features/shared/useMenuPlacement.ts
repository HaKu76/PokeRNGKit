import { useEffect, useState, type RefObject } from "react";

const VIEWPORT_GUTTER = 12;
const MENU_MAX_WIDTH = 360;

export type MenuVerticalPlacement = "bottom" | "top";
export type MenuHorizontalPlacement = "start" | "end";

export interface MenuPlacement {
  readonly horizontal: MenuHorizontalPlacement;
  readonly vertical: MenuVerticalPlacement;
}

/** Keep shared option menus inside the viewport when their anchor is near an edge. */
export function useMenuPlacement(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  estimatedHeight: number,
): MenuPlacement {
  const [placement, setPlacement] = useState<MenuPlacement>({
    horizontal: "start",
    vertical: "bottom",
  });

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const availableBelow = window.innerHeight - rect.bottom - 12;
      const availableAbove = rect.top - 12;
      const requiredHeight = Math.min(estimatedHeight, 360);
      const requiredWidth = Math.min(
        MENU_MAX_WIDTH,
        Math.max(0, window.innerWidth - VIEWPORT_GUTTER * 2),
      );
      const canAlignEnd = rect.right - requiredWidth >= VIEWPORT_GUTTER;
      const horizontal =
        rect.left + requiredWidth > window.innerWidth - VIEWPORT_GUTTER &&
        canAlignEnd
          ? "end"
          : "start";
      const vertical =
        availableBelow < requiredHeight && availableAbove > availableBelow
          ? "top"
          : "bottom";
      setPlacement({ horizontal, vertical });
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [anchorRef, estimatedHeight, open]);

  return open ? placement : { horizontal: "start", vertical: "bottom" };
}
