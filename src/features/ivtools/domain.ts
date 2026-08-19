import { useSyncExternalStore } from "react";

export const IV_TOOLS_STORAGE_KEY = "pokerngkit-iv-tools-v1";
export const IV_TOOLS_CHANGE_EVENT = "pokerngkit-iv-tools-change";

export const IV_STATS = ["HP", "Atk", "Def", "SpA", "SpD", "Spe"] as const;
export type IvStat = (typeof IV_STATS)[number];
export type IvTuple = readonly [number, number, number, number, number, number];
export type IvParent = "male" | "female";

export interface IvTemplate {
  readonly name: string;
  readonly values: IvTuple;
}

export interface IvRangeSelection {
  readonly stat: IvStat;
  readonly value: number;
}

export interface IvRangeBounds {
  readonly min: IvTuple;
  readonly max: IvTuple;
}

export type IvToolsChange =
  | { readonly type: "range"; readonly bounds: IvRangeBounds }
  | {
      readonly type: "template";
      readonly parent: IvParent;
      readonly values: IvTuple;
    };

const DEFAULT_TEMPLATES: readonly IvTemplate[] = [
  { name: "Perfect", values: [31, 31, 31, 31, 31, 31] },
  { name: "6Zero", values: [0, 0, 0, 0, 0, 0] },
  { name: "HPIce", values: [31, 0, 30, 31, 31, 31] },
  { name: "HPFire", values: [31, 0, 31, 30, 31, 30] },
];

export const IV_JUDGE_VALUES = [
  "-",
  "perfect",
  "fantastic",
  "veryGood",
  "prettyGood",
  "decent",
  "noGood",
] as const;
export type IvJudgeValue = (typeof IV_JUDGE_VALUES)[number];

export function getIvRangeBounds(
  value: IvJudgeValue,
): readonly [number, number] {
  switch (value) {
    case "perfect":
      return [31, 31];
    case "fantastic":
      return [30, 30];
    case "veryGood":
      return [26, 29];
    case "prettyGood":
      return [16, 25];
    case "decent":
      return [1, 15];
    case "noGood":
      return [0, 0];
    default:
      return [0, 31];
  }
}

export function createRangeBounds(
  values: readonly IvJudgeValue[],
): IvRangeBounds {
  const min = values.map(
    (value) => getIvRangeBounds(value)[0],
  ) as unknown as IvTuple;
  const max = values.map(
    (value) => getIvRangeBounds(value)[1],
  ) as unknown as IvTuple;
  return { min, max };
}

export function parseIvTemplate(value: string): IvTemplate | undefined {
  if (typeof value !== "string") return undefined;
  const match = /^(.+?)\s*=\s*(-?\d+(?:\s*,\s*-?\d+){5})$/.exec(value.trim());
  if (!match || !match[1].trim()) return undefined;
  const values = match[2].split(",").map((entry) => Number(entry.trim()));
  if (
    values.some((entry) => !Number.isInteger(entry) || entry < 0 || entry > 31)
  )
    return undefined;
  return { name: match[1].trim(), values: values as unknown as IvTuple };
}

export function formatIvTemplate(template: IvTemplate): string {
  return `${template.name} = ${template.values.join(",")}`;
}

export function parseIvTemplates(value: string): IvTemplate[] {
  return value
    .split(/[\r\n;]+/)
    .map(parseIvTemplate)
    .filter((template): template is IvTemplate => Boolean(template));
}

export function readIvTemplates(
  storage: Storage | undefined = getStorage(),
): IvTemplate[] {
  try {
    const stored = storage?.getItem(IV_TOOLS_STORAGE_KEY);
    if (!stored) return [...DEFAULT_TEMPLATES];
    const parsed = parseIvTemplates(stored);
    return parsed.length ? parsed : [...DEFAULT_TEMPLATES];
  } catch {
    return [...DEFAULT_TEMPLATES];
  }
}

export function saveIvTemplates(
  templates: readonly IvTemplate[],
  storage: Storage | undefined = getStorage(),
) {
  const text = templates.map(formatIvTemplate).join(";");
  storage?.setItem(IV_TOOLS_STORAGE_KEY, text);
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(IV_TOOLS_CHANGE_EVENT));
}

export function emitIvToolsChange(change: IvToolsChange) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent<IvToolsChange>(IV_TOOLS_CHANGE_EVENT, { detail: change }),
    );
}

export function subscribeIvToolsChanges(
  onChange: (change: IvToolsChange) => void,
) {
  if (typeof window === "undefined") return () => undefined;
  const handleChange = (event: Event) => {
    const change = (event as CustomEvent<IvToolsChange>).detail;
    if (change?.type === "range" || change?.type === "template")
      onChange(change);
  };
  window.addEventListener(IV_TOOLS_CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(IV_TOOLS_CHANGE_EVENT, handleChange);
}

export function useIvTemplates() {
  return useSyncExternalStore(subscribe, getSnapshot, () => "");
}

function getSnapshot() {
  return readIvTemplates().map(formatIvTemplate).join(";");
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === IV_TOOLS_STORAGE_KEY) onChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(IV_TOOLS_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(IV_TOOLS_CHANGE_EVENT, onChange);
  };
}

function getStorage() {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

export function defaultIvTemplates() {
  return [...DEFAULT_TEMPLATES];
}

export function defaultIvRangeSelections(): IvJudgeValue[] {
  return IV_STATS.map(() => "-");
}

export function rangeBoundsFromSelection(values: readonly IvJudgeValue[]) {
  return createRangeBounds(values);
}

export function getStoredIvTemplatesSnapshot(value: string) {
  return parseIvTemplates(value);
}
