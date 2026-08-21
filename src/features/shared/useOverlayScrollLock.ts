import { type RefObject, useEffect } from "react";

interface OverlayLock {
  readonly rootRef: RefObject<HTMLElement | null>;
}

const activeLocks: OverlayLock[] = [];
let documentListenersAttached = false;
let lastTouchY: number | undefined;

function currentLockRoot() {
  return activeLocks.at(-1)?.rootRef.current;
}

function isScrollable(element: HTMLElement) {
  const overflowY = window.getComputedStyle(element).overflowY;
  return (
    (overflowY === "auto" || overflowY === "scroll") &&
    element.scrollHeight > element.clientHeight
  );
}

function findScrollableAncestor(target: EventTarget | null, root: HTMLElement) {
  let element = target instanceof HTMLElement ? target : undefined;
  while (element) {
    if (isScrollable(element)) return element;
    if (element === root) return undefined;
    element = element.parentElement ?? undefined;
  }
  return undefined;
}

function canScroll(element: HTMLElement, deltaY: number) {
  if (deltaY < 0) return element.scrollTop > 0;
  if (deltaY > 0) {
    return element.scrollTop + element.clientHeight < element.scrollHeight;
  }
  return false;
}

function preventBackgroundWheel(event: WheelEvent) {
  const root = currentLockRoot();
  if (!root || !root.contains(event.target as Node)) {
    event.preventDefault();
    return;
  }
  const scrollable = findScrollableAncestor(event.target, root);
  if (!scrollable || !canScroll(scrollable, event.deltaY)) {
    event.preventDefault();
  }
}

function recordTouchPosition(event: TouchEvent) {
  lastTouchY = event.touches.item(0)?.clientY;
}

function clearTouchPosition() {
  lastTouchY = undefined;
}

function preventBackgroundTouchScroll(event: TouchEvent) {
  const touch = event.touches.item(0);
  const root = currentLockRoot();
  const touchY = touch?.clientY;
  const deltaY =
    lastTouchY === undefined || touchY === undefined ? 0 : lastTouchY - touchY;
  lastTouchY = touchY;
  if (!root || !root.contains(event.target as Node)) {
    event.preventDefault();
    return;
  }
  const scrollable = findScrollableAncestor(event.target, root);
  if (!scrollable || !canScroll(scrollable, deltaY)) {
    event.preventDefault();
  }
}

function isEditableTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.matches("input, textarea, select, [contenteditable='true']") ||
      target.isContentEditable)
  );
}

function lockPageKeys(event: KeyboardEvent) {
  if (
    !["PageDown", "PageUp", "Home", "End"].includes(event.key) ||
    isEditableTarget(event.target)
  ) {
    return;
  }
  const root = currentLockRoot();
  if (!root || !root.contains(event.target as Node)) {
    event.preventDefault();
    return;
  }
  const scrollable = findScrollableAncestor(event.target, root);
  if (!scrollable) {
    event.preventDefault();
    return;
  }
  event.preventDefault();
  if (event.key === "Home") {
    scrollable.scrollTo({ top: 0 });
    return;
  }
  if (event.key === "End") {
    scrollable.scrollTo({ top: scrollable.scrollHeight });
    return;
  }
  scrollable.scrollBy({
    top: (event.key === "PageDown" ? 1 : -1) * scrollable.clientHeight * 0.8,
  });
}

function addDocumentListeners() {
  if (documentListenersAttached) return;
  documentListenersAttached = true;
  document.addEventListener("wheel", preventBackgroundWheel, {
    passive: false,
  });
  document.addEventListener("touchstart", recordTouchPosition, {
    passive: true,
  });
  document.addEventListener("touchmove", preventBackgroundTouchScroll, {
    passive: false,
  });
  document.addEventListener("touchend", clearTouchPosition);
  document.addEventListener("touchcancel", clearTouchPosition);
  document.addEventListener("keydown", lockPageKeys);
}

function removeDocumentListeners() {
  if (!documentListenersAttached) return;
  documentListenersAttached = false;
  document.removeEventListener("wheel", preventBackgroundWheel);
  document.removeEventListener("touchstart", recordTouchPosition);
  document.removeEventListener("touchmove", preventBackgroundTouchScroll);
  document.removeEventListener("touchend", clearTouchPosition);
  document.removeEventListener("touchcancel", clearTouchPosition);
  document.removeEventListener("keydown", lockPageKeys);
  lastTouchY = undefined;
}

/**
 * Locks background scrolling while deliberately preserving the browser's stable
 * root scrollbar. It also prevents wheel/touch scroll chaining at a panel edge.
 */
export function useOverlayScrollLock(
  active: boolean,
  rootRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const lock: OverlayLock = { rootRef };
    activeLocks.push(lock);
    document.documentElement.dataset.overlayScrollLock = "true";
    addDocumentListeners();
    return () => {
      const index = activeLocks.indexOf(lock);
      if (index >= 0) activeLocks.splice(index, 1);
      if (activeLocks.length === 0) {
        delete document.documentElement.dataset.overlayScrollLock;
        removeDocumentListeners();
      }
    };
  }, [active, rootRef]);
}
