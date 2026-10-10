import type { LocalizedText } from "./domain";
import type { OriginChoice } from "./domain";
export interface Avenue5Field {
  id: string;
  group: string;
  name: LocalizedText;
  kind: "number" | "boolean" | "text" | "list" | "date" | "shop";
  value: string;
  maximum: number;
  textMaximum: number;
  choices: OriginChoice[] | null;
}
export interface Avenue5Object {
  group: string;
  index: number;
  name: string;
  extension: string | null;
  rawHex: string;
  fields: Avenue5Field[];
}
export interface Avenue5Catalog {
  canEdit: boolean;
  sourceHash: string;
  objects: Avenue5Object[];
  rawHex: string;
}
export interface Avenue5Edit {
  action: "patch" | "resave" | "import" | "export";
  sourceHash: string;
  group: string;
  index: number;
  fields?: { id: string; value: string }[];
  dataBase64?: string;
  targetHash?: string;
}
export interface Avenue5Preview {
  request: Avenue5Edit;
  result: Avenue5Catalog;
  changedOffsets: number[];
}
export const supportsAvenue5 = (format: string) => format === "SAV5B2W2";
function target(c: Avenue5Catalog, o: Avenue5Object, write = true) {
  if (
    (write && !c.canEdit) ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !c.objects.some((x) => x.group === o.group && x.index === o.index)
  )
    throw Error("Invalid Avenue5 target.");
  return { sourceHash: c.sourceHash, group: o.group, index: o.index };
}
export function avenue5Valid(f: Avenue5Field, v: string) {
  if (
    v.length >
    (f.kind === "number" || f.kind === "boolean" ? 20 : f.textMaximum)
  )
    return false;
  if (f.kind === "number" || f.kind === "boolean") {
    const n = Number(v);
    return (
      /^\d+$/.test(v) &&
      Number.isSafeInteger(n) &&
      n >= 0 &&
      n <= f.maximum &&
      (!f.choices || f.choices.some((c) => c.id === n))
    );
  }
  if (f.kind === "shop") {
    const p = v.split(",").map((x) => x.trim());
    return (
      p.length === 3 &&
      /^-?\d+$/.test(p[0]) &&
      p.slice(1).every((x) => /^\d+$/.test(x)) &&
      Number(p[0]) >= -1 &&
      Number(p[0]) <= 7 &&
      Number(p[1]) <= 9 &&
      Number(p[2]) <= 3
    );
  }
  return true;
}
export function avenue5Patch(
  c: Avenue5Catalog,
  o: Avenue5Object,
  fields: { id: string; value: string }[],
): Avenue5Edit {
  const base = target(c, o);
  if (
    !fields.length ||
    fields.length > o.fields.length ||
    new Set(fields.map((x) => x.id)).size !== fields.length ||
    fields.some((x) => {
      const f = o.fields.find((f) => f.id === x.id);
      return !f || !avenue5Valid(f, x.value);
    })
  )
    throw Error("Invalid Avenue5 fields.");
  return { ...base, action: "patch", fields };
}
export function avenue5Action(
  c: Avenue5Catalog,
  o: Avenue5Object,
  action: "resave" | "export",
): Avenue5Edit {
  const base = target(c, o, action !== "export");
  if (action === "export" && !o.extension)
    throw Error("Invalid Avenue5 export target.");
  return { ...base, action };
}
export function avenue5Import(
  c: Avenue5Catalog,
  o: Avenue5Object,
  bytes: Uint8Array,
): Avenue5Edit {
  const base = target(c, o);
  if (!o.extension || ![88, 96, 196].includes(bytes.length))
    throw Error("Invalid Avenue5 entity size.");
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return { ...base, action: "import", dataBase64: btoa(binary) };
}
export function avenue5Frozen(
  c: Avenue5Catalog,
  p: Avenue5Preview,
): Avenue5Edit {
  if (
    !c.canEdit ||
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    !p.result.canEdit
  )
    throw Error("Avenue5 preview is stale.");
  return p.request;
}
export const avenue5Words = {
  zh: {
    title: "汇合大道编辑器",
    read: "读取汇合大道",
    groups: {
      avenue: "大道",
      settings: "设置",
      visitors: "访客",
      fans: "粉丝",
      occupants: "店铺成员",
      assistants: "助手",
      self: "自身资料",
    },
    object: "格位",
    field: "字段",
    kind: "分组",
    general: "常规",
    specific: "角色资料",
    database: "访问者记录",
    settings: "大道设置",
    avenue: "大道",
    resave: "按窗口规则重新保存",
    resaveNote:
      "重新保存当前对象会沿用窗口的截顶、编码和标记规范化；请查看预览中的实际变化。",
    import: "导入角色文件",
    export: "导出角色文件",
    raw: "原始数据",
    listHelp:
      "可用逗号、分号、竖线或换行分隔；缺少项补零，无效项取零，超出项忽略。支持0x十六进制。",
    dateHelp:
      "支持日期、十进制原值或0x十六进制；空白或无效文本清零，实际存储值以预览为准。",
    shopRank: "店铺等级编号",
    shopVersion: "店铺版本编号",
    invalid: "汇合大道字段、文件或操作无效，请核对输入。",
    stale: "存档或预览已变化，请重新读取并预览。",
  },
  en: {
    title: "Join Avenue Editor",
    read: "Read Join Avenue",
    groups: {
      avenue: "Avenue",
      settings: "Settings",
      visitors: "Visitors",
      fans: "Fans",
      occupants: "Occupants",
      assistants: "Assistants",
      self: "Self",
    },
    object: "Slot",
    field: "Field",
    kind: "Section",
    general: "General",
    specific: "Entity details",
    database: "Visiting player database",
    settings: "Avenue settings",
    avenue: "Avenue",
    resave: "Resave using window rules",
    resaveNote:
      "Resaving the selected object follows the window's clamping, encoding and flag normalization. Inspect the actual preview changes.",
    import: "Import entity file",
    export: "Export entity file",
    raw: "Raw data",
    listHelp:
      "Separate values with commas, semicolons, pipes or newlines. Missing and invalid values become zero; extra entries are ignored. 0x hexadecimal is supported.",
    dateHelp:
      "Enter a date, decimal raw value or 0x hexadecimal. Empty or invalid text clears the value; inspect the stored preview result.",
    shopRank: "Shop rank index",
    shopVersion: "Shop version index",
    invalid: "Invalid Join Avenue field, file or operation. Check the input.",
    stale: "The save or preview changed. Read and preview it again.",
  },
  ja: {
    title: "ジョインアベニュー",
    read: "ジョインアベニューを読み込む",
    groups: {
      avenue: "アベニュー",
      settings: "設定",
      visitors: "訪問者",
      fans: "ファン",
      occupants: "店員",
      assistants: "助手",
      self: "自分",
    },
    object: "スロット",
    field: "項目",
    kind: "グループ",
    general: "基本情報",
    specific: "人物情報",
    database: "訪問者記録",
    settings: "アベニュー設定",
    avenue: "アベニュー",
    resave: "元の編集ルールで再保存",
    resaveNote:
      "選択中の人物・設定を再保存すると、元の上限、符号化とフラグ正規化を適用します。実際の変化を確認してください。",
    import: "人物ファイルを読み込む",
    export: "人物ファイルを書き出す",
    raw: "生データ",
    listHelp:
      "カンマ、セミコロン、縦線、改行で区切れます。不足・無効な項目は0、余分な項目は無視します。0xの16進数にも対応します。",
    dateHelp:
      "日付、10進数の生値、0xの16進数に対応します。空欄・無効な入力は0になります。保存値を確認してください。",
    shopRank: "店のランク番号",
    shopVersion: "店のバージョン番号",
    invalid: "項目、ファイルまたは操作が無効です。入力を確認してください。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
  },
};
