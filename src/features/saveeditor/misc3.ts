export interface Misc3Icon {
  slot: number;
  species: number;
  raw: number;
  sprite: string;
}
export interface Misc3Catalog {
  canEdit: boolean;
  coins: number;
  rival: { name: string; hex: string; maxLength: number } | null;
  icons: Misc3Icon[] | null;
  speciesChoices: {
    id: number;
    name: { zh: string; en: string; ja: string };
  }[];
  mirage: {
    current: number;
    pid: string;
    target: number;
    partyCount: number;
  } | null;
}
export type Misc3Edit =
  | { action: "coins"; coins: number }
  | { action: "rival"; name: string }
  | { action: "rival"; nameHex: string }
  | { action: "icons"; icons: { slot: number; species: number }[] }
  | { action: "mirage"; pid: string };
export const supportsMisc3 = (format: string) =>
  ["SAV3RS", "SAV3E", "SAV3FRLG"].includes(format);
export function misc3CoinEdit(c: Misc3Catalog, value: string): Misc3Edit {
  if (!c.canEdit || !/^\d{1,4}$/.test(value) || Number(value) > 9999)
    throw new Error("Invalid Gen3 coin value.");
  return { action: "coins", coins: Number(value) };
}
export function misc3RivalEdit(
  c: Misc3Catalog,
  mode: "text" | "hex",
  value: string,
): Misc3Edit {
  if (!c.canEdit || !c.rival) throw new Error("Rival name is unavailable.");
  if (mode === "text") {
    if (value.length > c.rival.maxLength)
      throw new Error("Rival name is too long.");
    return { action: "rival", name: value };
  }
  if (!/^[0-9A-Fa-f]{16}$/.test(value))
    throw new Error("Invalid rival raw name.");
  return { action: "rival", nameHex: value.toUpperCase() };
}
export function misc3IconEdit(c: Misc3Catalog, draft: string[]): Misc3Edit {
  if (!c.canEdit || !c.icons || draft.length !== c.icons.length)
    throw new Error("Trainer card icons are unavailable.");
  const icons = c.icons.flatMap((i, pos) => {
    const v = draft[pos];
    if (v === "keep") return [];
    if (
      !/^\d{1,3}$/.test(v) ||
      Number(v) > 386 ||
      !c.speciesChoices.some((c) => c.id === Number(v))
    )
      throw new Error("Invalid trainer card species.");
    return [{ slot: i.slot, species: Number(v) }];
  });
  if (!icons.length) throw new Error("No trainer card icon changes.");
  return { action: "icons", icons };
}
export function misc3MirageEdit(c: Misc3Catalog): Misc3Edit {
  if (!c.canEdit || !c.mirage || !/^[0-9A-F]{8}$/.test(c.mirage.pid))
    throw new Error("Mirage Island source is unavailable.");
  return { action: "mirage", pid: c.mirage.pid };
}
export const misc3Words = {
  zh: {
    title: "杂项主设置",
    read: "读取主设置",
    coins: "代币",
    coinApply: "应用代币修改",
    oldCoins: "原始代币超出 0–9999，未修改时保留。",
    rival: "劲敌姓名",
    mode: "姓名编辑方式",
    text: "文字",
    hex: "原始字节",
    rivalApply: "应用姓名修改",
    icons: "训练家卡片宝可梦图标",
    slot: "格位",
    keep: "保留原始图标",
    none: "空",
    unknown: "未识别的原始图标",
    iconApply: "应用图标修改",
    raw: "原始内部编号",
    iconNote: "只有选择新种类时才改写该图标，其他原始编号保留。",
    mirage: "幻影岛",
    pid: "队伍首槽原始个性值",
    count: "队伍数量",
    current: "当前匹配值",
    target: "将写入的匹配值",
    match: "匹配队伍首槽",
    matched: "已与首槽原始个性值匹配。",
    empty: "队伍计数为 0；此操作仍按首槽残留的原始数据匹配，与上游操作一致。",
    discard: "放弃草稿",
    draft: "先应用或放弃当前草稿，再编辑其他设置。",
    invalid:
      "请检查范围、姓名字符或原始字节。代币为 0–9999，姓名最多 7 字符，原始姓名为 16 位十六进制。",
    note: "修改可撤销，原存档保持不变。",
  },
  en: {
    title: "Main miscellaneous settings",
    read: "Read main settings",
    coins: "Coins",
    coinApply: "Apply coin changes",
    oldCoins:
      "The original coin value exceeds 0–9999 and is preserved unless edited.",
    rival: "Rival name",
    mode: "Name editing mode",
    text: "Text",
    hex: "Raw bytes",
    rivalApply: "Apply name changes",
    icons: "Trainer Card Pokémon Icons",
    slot: "Slot",
    keep: "Keep original icon",
    none: "Empty",
    unknown: "Unrecognized original icon",
    iconApply: "Apply icon changes",
    raw: "Original internal IDs",
    iconNote:
      "Only explicitly selected species replace their icons. Other original IDs are preserved.",
    mirage: "Mirage Island",
    pid: "First raw party slot PID",
    count: "Party count",
    current: "Current comparison value",
    target: "Comparison value to write",
    match: "Match first raw party slot",
    matched: "Already matches the first raw party PID.",
    empty:
      "Party count is 0. This action still uses the raw data remaining in the first slot, matching the upstream operation.",
    discard: "Discard draft",
    draft: "Apply or discard the current draft before editing other settings.",
    invalid:
      "Check the ranges, name characters or raw bytes. Coins are 0–9999; the name accepts 7 characters; the raw name requires 16 hex digits.",
    note: "Changes can be undone and the original save is preserved.",
  },
  ja: {
    title: "その他の基本設定",
    read: "基本設定を読み込む",
    coins: "コイン",
    coinApply: "コインの変更を適用",
    oldCoins: "元のコインが 0–9999 の範囲外です。変更しなければ保持します。",
    rival: "ライバル名",
    mode: "名前の編集方法",
    text: "文字",
    hex: "元のバイト列",
    rivalApply: "名前の変更を適用",
    icons: "トレーナーカードのポケモンアイコン",
    slot: "スロット",
    keep: "元のアイコンを保持",
    none: "空き",
    unknown: "未認識の元のアイコン",
    iconApply: "アイコンの変更を適用",
    raw: "元の内部番号",
    iconNote:
      "新しい種類を選択したアイコンだけを書き換えます。その他の内部番号は保持します。",
    mirage: "マボロシじま",
    pid: "手持ち先頭スロットの元の性格値",
    count: "手持ち数",
    current: "現在の比較値",
    target: "書き込む比較値",
    match: "先頭スロットに合わせる",
    matched: "先頭スロットの元の性格値と一致しています。",
    empty:
      "手持ち数は 0 です。上流と同じく、先頭スロットに残っている元のデータを使用します。",
    discard: "下書きを破棄",
    draft: "他の設定を編集する前に、現在の下書きを適用または破棄してください。",
    invalid:
      "範囲、名前の文字、元のバイト列を確認してください。コインは 0–9999、名前は7文字まで、バイト列は16桁の16進数です。",
    note: "変更は元に戻せ、元のセーブは保持されます。",
  },
};
