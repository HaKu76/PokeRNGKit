import { useEffect, useState, type RefObject } from "react";

export type MenuPlacement = "bottom" | "top";

/** Keep shared option menus inside the viewport when their anchor is near an edge. */
export function useMenuPlacement(
  anchorRef: RefObject<HTMLElement | null>,
  open: boolean,
  estimatedHeight: number,
): MenuPlacement {
  const [placement, setPlacement] = useState<MenuPlacement>("bottom");

  useEffect(() => {
    if (!open) return;

    const updatePlacement = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const availableBelow = window.innerHeight - rect.bottom - 12;
      const availableAbove = rect.top - 12;
      const requiredHeight = Math.min(estimatedHeight, 360);
      setPlacement(
        availableBelow < requiredHeight && availableAbove > availableBelow
          ? "top"
          : "bottom",
      );
    };

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [anchorRef, estimatedHeight, open]);

  return open ? placement : "bottom";
}
