export type Br4Lang = "zh" | "en" | "ja";
export interface Br4Profiles {
  active: number;
  canEdit: boolean;
  choices: { id: number; name: string }[];
}
export interface Br4GearCatalog {
  canEdit: boolean;
  profile: number;
  sourceHash: string;
  gear: {
    id: number;
    model: number;
    category: number;
    shared: boolean;
    unlocked: boolean;
    name: Record<Br4Lang, string>;
  }[];
  outfits: boolean[];
  plans: {
    action: "all" | "defaults";
    unlocked: number;
    changed: number[];
    targetHex: string;
  }[];
}
export type Br4GearEdit =
  | {
      action: "gear" | "outfits";
      profile: number;
      flags: { id: number; enabled: boolean }[];
    }
  | { action: "all" | "defaults"; profile: number; sourceHash: string };
export const supportsBr4Gear = (format: string) => format === "SAV4BR";
export function br4Profile(value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 3)
    throw Error("Invalid Battle Revolution player.");
  return value;
}
export function br4Flag(
  c: Br4GearCatalog,
  action: "gear" | "outfits",
  id: number,
  enabled: boolean,
): Br4GearEdit {
  if (
    !c.canEdit ||
    !Number.isInteger(id) ||
    (action === "gear" ? !c.gear.some((v) => v.id === id) : id < 0 || id >= 6)
  )
    throw Error("Invalid Battle Revolution gear flag.");
  return { action, profile: br4Profile(c.profile), flags: [{ id, enabled }] };
}
export function br4Batch(
  c: Br4GearCatalog,
  action: "all" | "defaults",
): Br4GearEdit {
  if (
    !c.canEdit ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash) ||
    !c.plans.some(
      (v) => v.action === action && /^[0-9A-F]{384}$/.test(v.targetHex),
    )
  )
    throw Error("Invalid Battle Revolution preview.");
  return { action, profile: br4Profile(c.profile), sourceHash: c.sourceHash };
}
export const br4GearWords = {
  zh: {
    title: "装备解锁",
    player: "玩家记录",
    empty: "空记录",
    profileNote:
      "所选玩家用于存档信息、箱子和专用编辑工具。选择玩家不会修改文件。",
    scoped: "此存档通过专用工具编辑，常规训练家和箱子编辑暂只读。",
    view: "编辑分组",
    gear: "常规装备",
    outfits: "特殊套装",
    batch: "批量操作",
    model: "角色类型",
    category: "装备类别",
    item: "装备",
    allModels: "所有角色",
    unlocked: "已解锁",
    locked: "未解锁",
    apply: "应用改动",
    discard: "放弃草稿",
    preview: "预览操作",
    confirm: "应用预览",
    cancel: "关闭预览",
    all: "全部解锁",
    defaults: "恢复默认",
    before: "当前解锁数量",
    after: "应用后解锁数量",
    changed: "改变的标记数量",
    rawChanged: "全部改变位置",
    batchNote:
      "批量操作重写整个装备标记块，包含未使用位；六种特殊套装和其他存档数据保持原样。恢复默认将各角色默认装备设为已解锁。",
    note: "只修改选定玩家的明确装备标记。可在存档工具中撤销并导出工作副本，原存档保持不变。",
    sourceNote:
      "上游没有中文装备名称，名称沿用英文资源回退；操作和类别按当前语言显示。",
    draft: "处理当前草稿或预览后再切换分组。",
    invalid: "请核对玩家、装备位置和当前预览。",
    read: "读取装备",
    names: [
      "固拉多套装",
      "路卡利欧套装",
      "电击魔兽套装",
      "盖欧卡套装",
      "罗丝雷朵套装",
      "帕奇利兹套装",
    ],
  },
  en: {
    title: "Gear unlocks",
    player: "Player record",
    empty: "Empty record",
    profileNote:
      "The selected player is used for save information, boxes and dedicated editors. Selecting a player does not change the file.",
    scoped:
      "Dedicated tools edit this save. General trainer and box editing remain read-only for now.",
    view: "Edit section",
    gear: "Regular gear",
    outfits: "Special outfits",
    batch: "Batch operation",
    model: "Character style",
    category: "Gear category",
    item: "Gear",
    allModels: "All characters",
    unlocked: "Unlocked",
    locked: "Locked",
    apply: "Apply changes",
    discard: "Discard draft",
    preview: "Preview operation",
    confirm: "Apply preview",
    cancel: "Close preview",
    all: "Unlock all",
    defaults: "Restore defaults",
    before: "Currently unlocked",
    after: "Unlocked after applying",
    changed: "Changed flags",
    rawChanged: "All changed positions",
    batchNote:
      "Batch operations replace the entire gear flag block, including unused bits. The six special outfits and other save data stay intact. Restore defaults unlocks each character's default gear.",
    note: "Only explicit gear flags in the selected player change. Undo and export the working copy in the save tools; the original stays intact.",
    sourceNote: "Gear names follow the upstream language resources.",
    draft: "Finish the current draft or preview before switching sections.",
    invalid: "Check the player, gear position and current preview.",
    read: "Read gear",
    names: [
      "Groudon outfit",
      "Lucario outfit",
      "Electivire outfit",
      "Kyogre outfit",
      "Roserade outfit",
      "Pachirisu outfit",
    ],
  },
  ja: {
    title: "装備の解放",
    player: "プレイヤー記録",
    empty: "空の記録",
    profileNote:
      "選択したプレイヤーのセーブ情報、ボックスと専用編集機能を表示します。プレイヤーの選択はファイルを変更しません。",
    scoped:
      "専用機能で編集できるセーブです。通常のトレーナーとボックス編集は現在読み取り専用です。",
    view: "編集グループ",
    gear: "通常装備",
    outfits: "特別衣装",
    batch: "一括操作",
    model: "キャラクタースタイル",
    category: "装備カテゴリ",
    item: "装備",
    allModels: "全キャラクター",
    unlocked: "解放済み",
    locked: "未解放",
    apply: "変更を適用",
    discard: "下書きを破棄",
    preview: "操作を確認",
    confirm: "プレビューを適用",
    cancel: "プレビューを閉じる",
    all: "すべて解放",
    defaults: "初期状態に戻す",
    before: "現在の解放数",
    after: "適用後の解放数",
    changed: "変更フラグ数",
    rawChanged: "変更する全位置",
    batchNote:
      "一括操作は未使用ビットを含む装備フラグ全体を置き換えます。六つの特別衣装と他のデータは保持します。初期状態に戻す操作は各キャラクターの初期装備を解放します。",
    note: "選択したプレイヤーの明示した装備フラグだけを変更します。セーブ機能で元に戻すか作業コピーを書き出せます。元ファイルは保持します。",
    sourceNote: "装備名は上流の言語リソースを使用します。",
    draft:
      "現在の下書きやプレビューを処理してからグループを切り替えてください。",
    invalid: "プレイヤー、装備位置と現在のプレビューを確認してください。",
    read: "装備を読む",
    names: [
      "グラードン衣装",
      "ルカリオ衣装",
      "エレキブル衣装",
      "カイオーガ衣装",
      "ロズレイド衣装",
      "パチリス衣装",
    ],
  },
};
