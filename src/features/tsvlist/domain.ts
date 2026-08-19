import { useSyncExternalStore } from "react";

export const TSV_LIST_STORAGE_KEY = "pokerngkit-tsv-list-v1";
export const TSV_LIST_CHANGE_EVENT = "pokerngkit-tsv-list-change";
export const TSV_LIST_MIN = 0;
export const TSV_LIST_MAX = 4095;
export const TSV_LIST_MAX_ENTRIES = 4096;

const EMPTY_SNAPSHOT = "";

export function parseTsvListText(value: string): number[] {
  if (typeof value !== "string") return [];
  return [
    ...new Set(
      value
        .split(/[\s,;]+/)
        .filter(Boolean)
        .map(Number),
    ),
  ]
    .filter(
      (entry) =>
        Number.isInteger(entry) &&
        entry >= TSV_LIST_MIN &&
        entry <= TSV_LIST_MAX,
    )
    .slice(0, TSV_LIST_MAX_ENTRIES);
}

export function formatTsvListText(values: readonly number[]) {
  return [
    ...new Set(
      values.filter(
        (entry) =>
          Number.isInteger(entry) &&
          entry >= TSV_LIST_MIN &&
          entry <= TSV_LIST_MAX,
      ),
    ),
  ]
    .slice(0, TSV_LIST_MAX_ENTRIES)
    .join("\n");
}

export function readTsvList(storage: Storage | undefined = getStorage()) {
  try {
    return parseTsvListText(storage?.getItem(TSV_LIST_STORAGE_KEY) ?? "");
  } catch {
    return [];
  }
}

export function saveTsvList(
  values: readonly number[],
  storage: Storage | undefined = getStorage(),
) {
  const text = formatTsvListText(values);
  storage?.setItem(TSV_LIST_STORAGE_KEY, text);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TSV_LIST_CHANGE_EVENT));
  }
}

export function useTsvListText() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);
}

function getStorage() {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

function getSnapshot() {
  return formatTsvListText(readTsvList());
}

function subscribe(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === TSV_LIST_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(TSV_LIST_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(TSV_LIST_CHANGE_EVENT, onStoreChange);
  };
}
