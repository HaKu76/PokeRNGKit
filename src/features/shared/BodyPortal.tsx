import type { ReactNode } from "react";
import { createPortal } from "react-dom";

interface BodyPortalProps {
  children: ReactNode;
}

/** Mounts overlays outside transformed or clipped feature containers. */
export function BodyPortal({ children }: BodyPortalProps) {
  if (typeof document === "undefined" || !document.body) {
    return <>{children}</>;
  }
  return createPortal(children, document.body);
}
