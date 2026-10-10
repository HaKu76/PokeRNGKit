import type { Br4Lang } from "./br4";
import type { LocalizedText, OriginChoice } from "./domain";
export interface Gl5Catalog {
  canEdit: boolean;
  sourceHash: string;
  scalars: {
    id: string;
    name: LocalizedText;
    value: number;
    minimum: number;
    maximum: number;
  }[];
  flags: { id: string; name: LocalizedText; value: boolean; raw: number }[];
  date: {
    empty: boolean;
    valid: boolean;
    value: string | null;
    rawHex: string;
  };
  items: {
    index: number;
    id: number;
    count: number;
    name: LocalizedText;
    sprite: string;
  }[];
  choices: OriginChoice[];
  furniture: { index: number; value: number; name: string; rawHex: string }[];
  rawHex: string;
}
export interface Gl5Edit {
  action: "patch" | "resave";
  sourceHash: string;
  targetHash?: string;
  scalars?: { id: string; value: number }[];
  flags?: { id: string; value: boolean }[];
  dateSet?: boolean;
  date?: string;
  items?: { index: number; id?: number; count?: number }[];
  furniture?: { index: number; value?: number; name?: string }[];
}
export interface Gl5Preview {
  request: Gl5Edit;
  result: Gl5Catalog;
  changedOffsets: number[];
}
export const supportsGlobalLink5 = (f: string) =>
  ["SAV5BW", "SAV5B2W2"].includes(f);
export function gl5Number(text: string, min: number, max: number): number {
  if (!/^[+-]?\d+$/.test(text.trim()))
    throw Error("Invalid GlobalLink5 number.");
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max)
    throw Error("Invalid GlobalLink5 number.");
  return n;
}
export function gl5Patch(
  c: Gl5Catalog,
  fields: Omit<Gl5Edit, "action" | "sourceHash" | "targetHash">,
): Gl5Edit {
  if (!c.canEdit || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid GlobalLink5 catalog.");
  if (
    !fields.scalars?.length &&
    !fields.flags?.length &&
    fields.dateSet === undefined &&
    !fields.items?.length &&
    !fields.furniture?.length
  )
    throw Error("Empty GlobalLink5 patch.");
  for (const v of fields.scalars ?? []) {
    const s = c.scalars.find((s) => s.id === v.id);
    if (
      !s ||
      !Number.isInteger(v.value) ||
      v.value < s.minimum ||
      v.value > s.maximum
    )
      throw Error("Invalid GlobalLink5 scalar fields.");
  }
  for (const v of fields.flags ?? [])
    if (!c.flags.some((f) => f.id === v.id) || typeof v.value !== "boolean")
      throw Error("Invalid GlobalLink5 flag fields.");
  for (const v of fields.items ?? [])
    if (
      !c.items.some((i) => i.index === v.index) ||
      (v.id === undefined && v.count === undefined) ||
      (v.id !== undefined &&
        (!Number.isInteger(v.id) || !c.choices.some((i) => i.id === v.id))) ||
      (v.count !== undefined &&
        (!Number.isInteger(v.count) || v.count < 0 || v.count > 255))
    )
      throw Error("Invalid GlobalLink5 item fields.");
  for (const v of fields.furniture ?? [])
    if (
      !c.furniture.some((f) => f.index === v.index) ||
      (v.value === undefined && v.name === undefined) ||
      (v.value !== undefined &&
        (!Number.isInteger(v.value) || v.value < 0 || v.value > 65535)) ||
      (v.name !== undefined && v.name.length > 32767)
    )
      throw Error("Invalid GlobalLink5 furniture fields.");
  for (const rows of [fields.scalars, fields.flags])
    if (rows && new Set(rows.map((r) => r.id)).size !== rows.length)
      throw Error("Duplicate GlobalLink5 field.");
  for (const rows of [fields.items, fields.furniture])
    if (rows && new Set(rows.map((r) => r.index)).size !== rows.length)
      throw Error("Duplicate GlobalLink5 slot.");
  if (fields.dateSet === true) {
    if (!/^20\d{2}-\d{2}-\d{2}$/.test(fields.date ?? ""))
      throw Error("Invalid GlobalLink5 date.");
    const [y, m, d] = fields.date!.split("-").map(Number),
      check = new Date(Date.UTC(y, m - 1, d));
    if (
      check.getUTCFullYear() !== y ||
      check.getUTCMonth() !== m - 1 ||
      check.getUTCDate() !== d
    )
      throw Error("Invalid GlobalLink5 date.");
  } else if (fields.date !== undefined)
    throw Error("Invalid GlobalLink5 date fields.");
  return { action: "patch", sourceHash: c.sourceHash, ...fields };
}
export function gl5Resave(c: Gl5Catalog): Gl5Edit {
  if (!c.canEdit || !/^[A-F0-9]{64}$/.test(c.sourceHash))
    throw Error("Invalid GlobalLink5 catalog.");
  return { action: "resave", sourceHash: c.sourceHash };
}
export function gl5Frozen(c: Gl5Catalog, p: Gl5Preview): Gl5Edit {
  if (
    !c.canEdit ||
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit
  )
    throw Error("GlobalLink5 preview is stale.");
  return p.request;
}
export const gl5Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    group: string;
    general: string;
    items: string;
    furniture: string;
    slot: string;
    current: string;
    value: string;
    keep: string;
    item: string;
    quantity: string;
    name: string;
    date: string;
    dateSet: string;
    clearDate: string;
    invalidDate: string;
    preview: string;
    apply: string;
    cancel: string;
    discard: string;
    resave: string;
    note: string;
    nameNote: string;
    selectedNote: string;
    resaveNote: string;
    changed: string;
    raw: string;
    invalid: string;
    stale: string;
    storedName: string;
    changes: string;
    noChanges: string;
  }
> = {
  zh: {
    title: "宝可梦全球连接编辑器",
    read: "读取全球连接",
    group: "设置分组",
    general: "常规",
    items: "道具",
    furniture: "家具",
    slot: "格位",
    current: "当前值",
    value: "修改值",
    keep: "保留旧值",
    item: "道具",
    quantity: "数量",
    name: "家具名称",
    date: "上传日期",
    dateSet: "设置日期",
    clearDate: "清除日期",
    invalidDate: "旧日期无效，未修改时保留原始数据",
    preview: "预览修改",
    apply: "确认应用",
    cancel: "取消预览",
    discard: "放弃修改",
    resave: "按窗口规则重新保存",
    note: "编辑本地存档中的同步标记、道具与家具。先预览再确认，原件保持，可撤销。",
    nameNote:
      "名称输入最多 32767 字符，实际保存截到十二字符并清理名称缓冲区；请检查预览中的保存名称。",
    selectedNote:
      "家具选择值可输入 0–255，存档只保存低七位，同步标记单独保持；预览显示实际值。",
    resaveNote:
      "重新保存会清除无效日期、将非零状态标记规范为 1，并重新写入所有家具名称。普通修改保留未指定的旧值。",
    changed: "存档变化字节",
    raw: "原始数据变化",
    invalid: "全球连接字段、数值或日期无效，请核对输入。",
    stale: "存档或预览已变化，请重新读取并预览。",
    storedName: "实际保存名称",
    changes: "实际变化",
    noChanges: "没有数据变化",
  },
  en: {
    title: "Pokémon Global Link Editor",
    read: "Read Global Link",
    group: "Settings group",
    general: "General",
    items: "Items",
    furniture: "Furniture",
    slot: "Slot",
    current: "Current",
    value: "New value",
    keep: "Keep stored value",
    item: "Item",
    quantity: "Count",
    name: "Furniture name",
    date: "Upload date",
    dateSet: "Set date",
    clearDate: "Clear date",
    invalidDate: "Stored date is invalid; unchanged raw data stays intact",
    preview: "Preview changes",
    apply: "Apply preview",
    cancel: "Cancel preview",
    discard: "Discard changes",
    resave: "Resave using window rules",
    note: "Edit local save synchronization flags, items and furniture. Preview before applying; the original stays intact and changes can be undone.",
    nameNote:
      "Names accept up to 32767 characters, but storage truncates to twelve characters and clears the name buffer. Inspect the stored name in the preview.",
    selectedNote:
      "Furniture selection accepts 0–255 but stores only the low seven bits. Synchronization stays separate; the preview shows the stored value.",
    resaveNote:
      "Resaving clears invalid dates, normalizes nonzero state flags to 1 and rewrites every furniture name. Ordinary edits preserve unspecified stored values.",
    changed: "Changed save bytes",
    raw: "Raw data changes",
    invalid: "Invalid Global Link fields, value or date. Check the input.",
    stale: "The save or preview changed. Read and preview it again.",
    storedName: "Stored name",
    changes: "Actual changes",
    noChanges: "No data changes",
  },
  ja: {
    title: "ポケモングローバルリンク",
    read: "グローバルリンクを読み込む",
    group: "設定グループ",
    general: "通常",
    items: "アイテム",
    furniture: "家具",
    slot: "スロット",
    current: "現在の値",
    value: "変更値",
    keep: "保存値を維持",
    item: "アイテム",
    quantity: "個数",
    name: "家具の名前",
    date: "アップロード日",
    dateSet: "日付を設定",
    clearDate: "日付を消去",
    invalidDate: "保存日付が無効です。変更しなければ元のデータを維持します",
    preview: "変更を確認",
    apply: "変更を適用",
    cancel: "プレビューを閉じる",
    discard: "変更を破棄",
    resave: "元の編集ルールで再保存",
    note: "端末内のセーブの同期フラグ、アイテム、家具を編集します。適用前に確認してください。元ファイルは維持され、元に戻せます。",
    nameNote:
      "32767文字まで入力できますが、保存時は十二文字に切り詰めて名前の領域を消去します。プレビューの保存名を確認してください。",
    selectedNote:
      "選択値は0–255ですが、保存するのは下位7ビットです。同期フラグは別に維持され、保存値をプレビューで確認できます。",
    resaveNote:
      "再保存は無効な日付を消去し、非ゼロの状態フラグを1に揃え、すべての家具名を書き直します。通常の編集は指定していない保存値を維持します。",
    changed: "セーブの変更バイト数",
    raw: "元のデータの変更",
    invalid:
      "グローバルリンクの項目、値または日付が無効です。入力を確認してください。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
    storedName: "保存される名前",
    changes: "実際の変更",
    noChanges: "データの変更なし",
  },
};
