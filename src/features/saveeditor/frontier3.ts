export interface Frontier3Stat {
  id: number;
  value: number;
}
export interface Frontier3Record {
  mode: number;
  record: number;
  continue: boolean;
  stats: Frontier3Stat[];
}
export interface Frontier3Facility {
  id: number;
  modeCount: number;
  records: Frontier3Record[];
}
export interface Frontier3Catalog {
  canEdit: boolean;
  pass: boolean;
  bp: number;
  earned: number;
  symbols: { facility: number; silver: boolean; gold: boolean }[];
  facilities: Frontier3Facility[];
}
export interface Frontier3Edit {
  action: "record" | "global";
  facility?: number;
  mode?: number;
  record?: number;
  stats?: Frontier3Stat[];
  continue?: boolean;
  pass?: boolean;
  bp?: number;
  earned?: number;
  symbols?: { facility: number; level: number }[];
}
export const supportsFrontier3 = (format: string) => format === "SAV3E";
export const frontier3RecordDraft = (r: Frontier3Record) => ({
  stats: r.stats.map((s) => String(s.value)),
  continue: r.continue,
});
export const frontier3GlobalDraft = (c: Frontier3Catalog) => ({
  pass: c.pass,
  bp: String(c.bp),
  earned: String(c.earned),
  symbols: c.symbols.map(() => "keep"),
});
function number(value: string, max: number, width: number) {
  if (!new RegExp(`^\\d{1,${width}}$`).test(value) || Number(value) > max)
    throw new Error("Invalid Gen3 Battle Frontier value.");
  return Number(value);
}
export function frontier3RecordEdit(
  c: Frontier3Catalog,
  facility: number,
  mode: number,
  record: number,
  d: ReturnType<typeof frontier3RecordDraft>,
): Frontier3Edit {
  const f = c.facilities.find((f) => f.id === facility),
    r = f?.records.find((r) => r.mode === mode && r.record === record);
  if (
    !c.canEdit ||
    !Number.isInteger(facility) ||
    !Number.isInteger(mode) ||
    !Number.isInteger(record) ||
    !r ||
    d.stats.length !== r.stats.length
  )
    throw new Error("Invalid Gen3 Battle Frontier record.");
  const edit: Frontier3Edit = { action: "record", facility, mode, record };
  const stats = r.stats.flatMap((s, i) =>
    d.stats[i] === String(s.value)
      ? []
      : [{ id: s.id, value: number(d.stats[i], 9999, 4) }],
  );
  if (stats.length) edit.stats = stats;
  if (d.continue !== r.continue) edit.continue = d.continue;
  if (!edit.stats && edit.continue === undefined)
    throw new Error("No Gen3 Battle Frontier changes.");
  return edit;
}
export function frontier3GlobalEdit(
  c: Frontier3Catalog,
  d: ReturnType<typeof frontier3GlobalDraft>,
): Frontier3Edit {
  if (!c.canEdit || d.symbols.length !== c.symbols.length)
    throw new Error("Invalid Gen3 Battle Frontier global fields.");
  const edit: Frontier3Edit = { action: "global" };
  if (d.pass !== c.pass) edit.pass = d.pass;
  if (d.bp !== String(c.bp)) edit.bp = number(d.bp, 9999, 4);
  if (d.earned !== String(c.earned)) edit.earned = number(d.earned, 65535, 5);
  const symbols = d.symbols.flatMap((v, i) => {
    if (v === "keep") return [];
    if (!/^[0-2]$/.test(v))
      throw new Error("Invalid Gen3 Battle Frontier symbol.");
    return [{ facility: c.symbols[i].facility, level: Number(v) }];
  });
  if (symbols.length) edit.symbols = symbols;
  if (Object.keys(edit).length === 1)
    throw new Error("No Gen3 Battle Frontier changes.");
  return edit;
}
export const frontier3Words = {
  zh: {
    title: "对战开拓区",
    read: "读取开拓区",
    facility: "设施",
    mode: "对战模式",
    record: "等级组别",
    facilities: [
      "对战塔",
      "对战巨蛋",
      "对战宫殿",
      "对战竞技场",
      "对战工厂",
      "对战水管",
      "对战金字塔",
    ],
    modes: ["单打", "双打", "多人", "联机"],
    records: ["50 级", "开放等级"],
    stats: [
      "冠军次数",
      "当前连胜",
      "当前租借更换次数",
      "最高通关数",
      "最高连胜",
      "最高租借更换次数",
    ],
    continue: "继续挑战",
    global: "通行证、标志与点数",
    pass: "启用开拓区通行证",
    bp: "当前对战点数",
    earned: "累计获得对战点数",
    keep: "保留原始标志",
    levels: ["无标志", "银标志", "金标志"],
    goldOnly: "仅金标志（银未开启）",
    applyRecord: "应用成绩修改",
    applyGlobal: "应用开拓区设置",
    discard: "放弃草稿",
    draft: "先应用或放弃草稿，再切换设施、模式或编辑另一组设置。",
    old: "原始值超出输入范围，未修改时保留。",
    invalid:
      "请检查设施和模式组合；新成绩与当前点数为 0–9999，累计点数为 0–65535。",
    note: "修改可撤销，原存档保持不变。标志只有明确选择新状态时才改写。",
  },
  en: {
    title: "Battle Frontier",
    read: "Read Battle Frontier",
    facility: "Facility",
    mode: "Battle mode",
    record: "Level group",
    facilities: [
      "Tower",
      "Dome",
      "Palace",
      "Arena",
      "Factory",
      "Pike",
      "Pyramid",
    ],
    modes: ["Singles", "Doubles", "Multi", "Linked"],
    records: ["Lv. 50", "Open"],
    stats: [
      "Championships",
      "Current streak",
      "Current rentals swapped",
      "Record cleared",
      "Record streak",
      "Record rentals swapped",
    ],
    continue: "Continue challenge",
    global: "Pass, symbols and points",
    pass: "Activate Frontier Pass",
    bp: "Current battle points",
    earned: "Battle points earned",
    keep: "Keep original symbol",
    levels: ["No symbol", "Silver symbol", "Gold symbol"],
    goldOnly: "Gold only (silver inactive)",
    applyRecord: "Apply record changes",
    applyGlobal: "Apply Frontier settings",
    discard: "Discard draft",
    draft:
      "Apply or discard the draft before changing facility or mode, or editing another settings group.",
    old: "The original value exceeds the input range. It is preserved unless changed.",
    invalid:
      "Check the facility and mode. New stats and current BP must be 0–9999; earned BP must be 0–65535.",
    note: "Changes can be undone and the original save is preserved. Symbols are rewritten only when you explicitly choose a new state.",
  },
  ja: {
    title: "バトルフロンティア",
    read: "フロンティアを読み込む",
    facility: "施設",
    mode: "対戦形式",
    record: "レベル区分",
    facilities: [
      "バトルタワー",
      "バトルドーム",
      "バトルパレス",
      "バトルアリーナ",
      "バトルファクトリー",
      "バトルチューブ",
      "バトルピラミッド",
    ],
    modes: ["シングル", "ダブル", "マルチ", "通信"],
    records: ["レベル 50", "オープン"],
    stats: [
      "優勝回数",
      "現在の連勝",
      "現在のレンタル交換数",
      "最高クリア数",
      "最高連勝",
      "最高レンタル交換数",
    ],
    continue: "挑戦を続ける",
    global: "パス・シンボル・ポイント",
    pass: "フロンティアパスを有効にする",
    bp: "現在のバトルポイント",
    earned: "累計獲得バトルポイント",
    keep: "元のシンボルを保持",
    levels: ["シンボルなし", "銀シンボル", "金シンボル"],
    goldOnly: "金のみ（銀は無効）",
    applyRecord: "成績の変更を適用",
    applyGlobal: "フロンティア設定を適用",
    discard: "下書きを破棄",
    draft:
      "施設や形式の変更、別の設定の編集の前に下書きを適用または破棄してください。",
    old: "元の値が入力範囲を超えています。変更しなければ保持します。",
    invalid:
      "施設と対戦形式を確認してください。新しい成績と現在 BP は 0–9999、累計 BP は 0–65535 です。",
    note: "変更は元に戻せ、元のセーブは保持されます。シンボルは新しい状態を選択した場合のみ書き換えます。",
  },
};
