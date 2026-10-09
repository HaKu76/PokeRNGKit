export interface Ferry3Flag {
  index: number;
  value: boolean;
}
export interface Ferry3Ticket {
  id: number;
  name: { zh: string; en: string; ja: string };
  present: boolean;
}
export interface Ferry3Plan {
  includeOldSeaMap: boolean;
  status: "ready" | "complete" | "space" | "occupied";
  have: number[];
  missing: number[];
  additions: { id: number; slot: number }[];
}
export interface Ferry3Catalog {
  canEdit: boolean;
  japanese: boolean;
  sourceHash: string;
  flags: Ferry3Flag[];
  tickets: Ferry3Ticket[];
  plans: Ferry3Plan[];
}
export type Ferry3Edit =
  | { action: "flags"; flags: Ferry3Flag[] }
  | { action: "tickets"; includeOldSeaMap: boolean; sourceHash: string };
export const supportsFerry3 = (format: string) => format === "SAV3E";
export function ferry3FlagEdit(
  c: Ferry3Catalog,
  values: boolean[],
): Ferry3Edit {
  if (
    !c.canEdit ||
    values.length !== c.flags.length ||
    values.some((v) => typeof v !== "boolean")
  )
    throw new Error("Invalid ferry flags.");
  const flags = c.flags.flatMap((f, i) =>
    values[i] === f.value ? [] : [{ index: f.index, value: values[i] }],
  );
  if (!flags.length) throw new Error("No ferry flag changes.");
  return { action: "flags", flags };
}
export const ferry3Plan = (c: Ferry3Catalog, include: boolean) =>
  c.plans[include ? 1 : 0];
export function ferry3TicketEdit(
  c: Ferry3Catalog,
  include: boolean,
): Ferry3Edit {
  const plan = ferry3Plan(c, include);
  if (
    !c.canEdit ||
    typeof include !== "boolean" ||
    plan?.status !== "ready" ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash)
  )
    throw new Error("Ferry tickets cannot be added.");
  return {
    action: "tickets",
    includeOldSeaMap: plan.includeOldSeaMap,
    sourceHash: c.sourceHash,
  };
}
export const ferry3Words = {
  zh: {
    title: "船运与船票",
    read: "读取船运设置",
    flags: "船运标志",
    applyFlags: "应用标志修改",
    discard: "放弃草稿",
    labels: [
      "可以乘船",
      "可到达南方孤岛",
      "可到达诞生之岛",
      "可到达遥远孤岛",
      "可到达肚脐岩",
      "可到达对战开拓区",
      "南方孤岛初始事件",
      "诞生之岛初始事件",
      "遥远孤岛初始事件",
      "肚脐岩初始事件",
    ],
    tickets: "船票",
    include: "添加古航海图",
    unreleased: "古航海图未在非日文版发行；勾选后才会添加。",
    preview: "预览船票添加",
    applyTickets: "添加预览中的船票",
    cancel: "关闭预览",
    have: "已有",
    missing: "缺少",
    destinations: "将要写入的格位",
    slot: "格",
    none: "无",
    present: "已有",
    absent: "缺少",
    statuses: {
      ready: "可以添加缺少的船票。",
      complete: "已持有所有选定船票。",
      space: "重要物品袋空间不足，请先在背包编辑中整理。",
      occupied: "连续目标格位有其他物品，请先在背包编辑中整理空格。",
    },
    draft: "先应用或放弃船运标志草稿，再预览船票。",
    invalid: "无法应用修改，请重新读取并检查预览。",
    note: "船票添加与船运标志分别应用，修改可撤销，原存档保持不变。",
  },
  en: {
    title: "Ferry and tickets",
    read: "Read ferry settings",
    flags: "Ferry flags",
    applyFlags: "Apply flag changes",
    discard: "Discard draft",
    labels: [
      "Can get ride",
      "Southern Island reachable",
      "Birth Island reachable",
      "Faraway Island reachable",
      "Navel Rock reachable",
      "Battle Frontier reachable",
      "Southern Island initial event",
      "Birth Island initial event",
      "Faraway Island initial event",
      "Navel Rock initial event",
    ],
    tickets: "Tickets",
    include: "Add Old Sea Map",
    unreleased:
      "The Old Sea Map was unreleased outside Japan. Select it explicitly to add it.",
    preview: "Preview ticket additions",
    applyTickets: "Add previewed tickets",
    cancel: "Close preview",
    have: "Already have",
    missing: "Missing",
    destinations: "Destination slots",
    slot: "Slot",
    none: "None",
    present: "Present",
    absent: "Missing",
    statuses: {
      ready: "Missing tickets can be added.",
      complete: "All selected tickets are already present.",
      space:
        "Not enough space in Key Items. Organize the pouch in the inventory editor first.",
      occupied:
        "The destination range contains other items. Organize the empty slots in the inventory editor first.",
    },
    draft: "Apply or discard ferry flag changes before previewing tickets.",
    invalid: "Changes cannot be applied. Read again and check the preview.",
    note: "Tickets and ferry flags are applied separately. Changes can be undone and the original save is preserved.",
  },
  ja: {
    title: "船の設定・チケット",
    read: "船の設定を読み込む",
    flags: "船のフラグ",
    applyFlags: "フラグの変更を適用",
    discard: "下書きを破棄",
    labels: [
      "船に乗れる",
      "みなみのことうに行ける",
      "たんじょうのしまに行ける",
      "さいはてのことうに行ける",
      "へそのいわに行ける",
      "バトルフロンティアに行ける",
      "みなみのことう初回イベント",
      "たんじょうのしま初回イベント",
      "さいはてのことう初回イベント",
      "へそのいわ初回イベント",
    ],
    tickets: "チケット",
    include: "ふるびたかいずを追加",
    unreleased:
      "ふるびたかいずは日本語版以外では未配信です。選択した場合のみ追加します。",
    preview: "チケット追加をプレビュー",
    applyTickets: "表示中のチケットを追加",
    cancel: "プレビューを閉じる",
    have: "所持済み",
    missing: "不足",
    destinations: "書き込むスロット",
    slot: "スロット",
    none: "なし",
    present: "所持済み",
    absent: "不足",
    statuses: {
      ready: "不足しているチケットを追加できます。",
      complete: "選択したチケットはすべて所持済みです。",
      space:
        "たいせつなものポケットの空きが足りません。バッグ編集で整理してください。",
      occupied:
        "連続した追加先に他の道具があります。バッグ編集で空きスロットを整理してください。",
    },
    draft:
      "チケットのプレビュー前にフラグの下書きを適用または破棄してください。",
    invalid:
      "変更を適用できません。再読み込みしてプレビューを確認してください。",
    note: "チケットと船のフラグは個別に適用します。変更は元に戻せ、元のセーブは保持されます。",
  },
};
