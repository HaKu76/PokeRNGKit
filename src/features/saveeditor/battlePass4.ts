import type { OriginChoice, PokemonEntry, LocalizedText } from "./domain";
import type { Br4Lang } from "./br4";
export interface BattlePass4Catalog {
  canEdit: boolean;
  profile: number;
  index: number;
  sourceHash: string;
  passes: {
    index: number;
    type: number;
    name: string;
    available: boolean;
    issued: boolean;
  }[];
  numbers: {
    id: number;
    source: string;
    value: number;
    minimum: number;
    maximum: number;
    choices: OriginChoice[] | null;
  }[];
  text: {
    id: number;
    source: string;
    value: string;
    hex: string;
    maximum: number;
    bytes: number;
    multiline: boolean;
  }[];
  flags: boolean[];
  members: {
    slot: number;
    present: boolean;
    box: number;
    position: number;
    flags: number;
    pokemon: PokemonEntry | null;
  }[];
  regions: { country: number; choices: OriginChoice[] }[];
}
export interface BattlePass4Edit {
  action:
    | "numbers"
    | "flags"
    | "text"
    | "rawText"
    | "links"
    | "delete"
    | "swap"
    | "unlockCustom"
    | "unlockRental"
    | "import"
    | "deletePokemon"
    | "setPokemon";
  profile: number;
  index: number;
  values?: { id: number; value: string }[];
  other?: number;
  slot?: number;
  box?: number;
  position?: number;
  flags?: number;
  data?: string;
  fileName?: string;
  encrypted?: boolean;
  sourceHash?: string;
  confirmIncompatible?: boolean;
}
export interface BattlePass4PokemonPreview {
  pokemon: PokemonEntry;
  warnings: LocalizedText[];
  target: number;
  box: number;
  position: number;
}
export function battlePassNumber(
  c: BattlePass4Catalog,
  id: number,
  value: string,
): BattlePass4Edit {
  if ((id === 1 || id === 2) && value.trim() === "") value = "0";
  const field = c.numbers.find((v) => v.id === id);
  if (
    !c.canEdit ||
    !field ||
    !/^-?\d+$/.test(value) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < field.minimum ||
    Number(value) > field.maximum ||
    (field.choices && !field.choices.some((v) => v.id === Number(value)))
  )
    throw Error("Invalid Battle Pass number.");
  return {
    action: "numbers",
    profile: c.profile,
    index: c.index,
    values: [{ id, value }],
  };
}
export function battlePassText(
  c: BattlePass4Catalog,
  id: number,
  value: string,
  raw = false,
): BattlePass4Edit {
  const field = c.text.find((v) => v.id === id);
  if (!c.canEdit || !field) throw Error("Invalid Battle Pass text field.");
  if (raw) {
    if (value.length !== field.bytes * 2 || !/^[0-9a-f]+$/i.test(value))
      throw Error("Invalid Battle Pass raw text bytes.");
  } else {
    const normalized = value.replace(/\r\n?|\n/g, "⏎");
    if (
      value.length > field.maximum ||
      (!field.multiline && /[\r\n]/.test(value)) ||
      normalized
        .split("")
        .reduce((sum, char) => sum + ("⏎￼Ⓟ".includes(char) ? 2 : 1), 0) >
        Math.min(
          field.maximum,
          id < 11
            ? field.bytes / 2 -
                1 -
                (id === 10 && c.numbers.find((v) => v.id === 25)?.value !== 0
                  ? 2
                  : 0)
            : field.maximum,
        ) ||
      (id === 11 && value.split("").some((char) => char.charCodeAt(0) > 127)) ||
      (id === 12 && !/^[\da-f]{0,16}$/i.test(value))
    )
      throw Error("Invalid Battle Pass text or encoded length.");
  }
  return {
    action: raw ? "rawText" : "text",
    profile: c.profile,
    index: c.index,
    values: [{ id, value }],
  };
}
export function battlePassOperation(
  c: BattlePass4Catalog,
  action: BattlePass4Edit["action"],
  extra: Partial<BattlePass4Edit> = {},
): BattlePass4Edit {
  if (
    !c.canEdit ||
    !Number.isInteger(c.index) ||
    c.index < 0 ||
    c.index >= 187 ||
    !/^[0-9A-F]{64}$/.test(c.sourceHash)
  )
    throw Error("Invalid Battle Pass preview.");
  if (
    action === "swap" &&
    (!Number.isInteger(extra.other) ||
      extra.other! < 0 ||
      extra.other! >= 187 ||
      Math.abs(extra.other! - c.index) !== 1)
  )
    throw Error("Invalid Battle Pass adjacent position.");
  if (action === "delete" && c.passes[c.index].type === 1)
    throw Error("Rental Battle Pass cannot be deleted.");
  if (action === "import" && (!extra.data || atob(extra.data).length !== 1772))
    throw Error("Battle Pass binary must contain exactly 0x6EC bytes.");
  if (
    (action === "deletePokemon" || action === "setPokemon") &&
    (!Number.isInteger(extra.slot) || extra.slot! < 0 || extra.slot! >= 6)
  )
    throw Error("Invalid Battle Pass Pokemon position.");
  return {
    ...extra,
    action,
    profile: c.profile,
    index: c.index,
    sourceHash: c.sourceHash,
  };
}
export const battlePass4Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    apply: string;
    discard: string;
    field: string;
    raw: string;
    operations: string;
    delete: string;
    up: string;
    down: string;
    confirm: string;
    cancel: string;
    import: string;
    export: string;
    empty: string;
    team: string;
    links: string;
    present: string;
    notPresent: string;
    importPokemon: string;
    exportPokemon: string;
    deletePokemon: string;
    encrypted: string;
    file: string;
    invalid: string;
    note: string;
    variables: string;
    replaceNote: string;
    pokemonNote: string;
    unknown: string;
  }
> = {
  zh: {
    title: "对战通行证",
    read: "读取通行证",
    apply: "应用改动",
    discard: "放弃草稿",
    field: "编辑字段",
    raw: "编辑原始字节",
    operations: "通行证操作",
    delete: "删除通行证",
    up: "向前交换",
    down: "向后交换",
    confirm: "确认应用",
    cancel: "关闭预览",
    import: "导入通行证",
    export: "导出通行证",
    empty: "空记录",
    team: "队伍",
    links: "链接位置与标记",
    present: "已存在",
    notPresent: "未存在",
    importPokemon: "导入宝可梦",
    exportPokemon: "导出宝可梦",
    deletePokemon: "删除成员",
    encrypted: "宝可梦文件已加密",
    file: "选择文件",
    invalid: "请核对字段、编码长度、链接位置和当前预览。",
    note: "只修改所选玩家的工作副本，可撤销并导出完整存档。中文专名缺失时沿用上游英文资源。",
    variables:
      "换行和宝可梦名称变量 Ⓟ 各占两个编码字符。原始字节编辑会完整替换此字段，包含未显示的数据。",
    replaceNote:
      "此操作会替换或移动记录。删除按上游规则压缩同类通行证；解锁仅改变对应可用标记。确认后可在存档工具中撤销。",
    pokemonNote:
      "导出为解密 BK4，可在独立宝可梦编辑器中编辑后重新导入。导入将转换为 BK4，并按上游规则向前填补空队伍格位；删除会压缩后续成员。",
    unknown: "未知原值",
  },
  en: {
    title: "Battle Passes",
    read: "Read passes",
    apply: "Apply changes",
    discard: "Discard draft",
    field: "Edit field",
    raw: "Edit raw bytes",
    operations: "Pass operations",
    delete: "Delete pass",
    up: "Swap backward",
    down: "Swap forward",
    confirm: "Confirm changes",
    cancel: "Close preview",
    import: "Import pass",
    export: "Export pass",
    empty: "Empty record",
    team: "Team",
    links: "Linked position and flags",
    present: "Present",
    notPresent: "Absent",
    importPokemon: "Import Pokémon",
    exportPokemon: "Export Pokémon",
    deletePokemon: "Delete member",
    encrypted: "Pokémon file is encrypted",
    file: "Choose file",
    invalid:
      "Check the field, encoded length, linked position and current preview.",
    note: "Only the selected player's working copy changes. Undo or export the complete save. Names follow upstream language resources.",
    variables:
      "Line breaks and the Pokémon name variable Ⓟ each use two encoded characters. Raw-byte editing replaces the entire field, including hidden data.",
    replaceNote:
      "This operation replaces or moves records. Deletion compacts passes according to upstream rules; unlocking changes the relevant availability flags. Undo is available in the save tools.",
    pokemonNote:
      "Export decrypted BK4, edit it in the standalone Pokémon editor and import it again. Import converts to BK4 and fills preceding empty team slots; deletion compacts later members.",
    unknown: "Unknown original value",
  },
  ja: {
    title: "バトルパス",
    read: "パスを読む",
    apply: "変更を適用",
    discard: "下書きを破棄",
    field: "編集項目",
    raw: "元バイトを編集",
    operations: "パス操作",
    delete: "パスを削除",
    up: "前と入れ替え",
    down: "次と入れ替え",
    confirm: "変更を確定",
    cancel: "プレビューを閉じる",
    import: "パスを読み込む",
    export: "パスを書き出す",
    empty: "空の記録",
    team: "チーム",
    links: "リンク先とフラグ",
    present: "存在する",
    notPresent: "存在しない",
    importPokemon: "ポケモンを読み込む",
    exportPokemon: "ポケモンを書き出す",
    deletePokemon: "メンバーを削除",
    encrypted: "暗号化されたポケモンファイル",
    file: "ファイルを選択",
    invalid: "項目、文字数、リンク先と現在のプレビューを確認してください。",
    note: "選択したプレイヤーの作業コピーだけを編集します。元に戻すかセーブ全体を書き出せます。固有名詞は上流リソースに従います。",
    variables:
      "改行とポケモン名の変数 Ⓟ はそれぞれ二文字分を使います。元バイト編集は非表示データも含め項目全体を置き換えます。",
    replaceNote:
      "記録の置換や移動を行います。削除は上流のルールに従ってパスを詰め、解放は該当する利用フラグを変更します。セーブ機能で元に戻せます。",
    pokemonNote:
      "復号済み BK4 を書き出し、単体ポケモン編集機能で編集して再読込できます。読込時は BK4 に変換し、前の空き枠に詰めます。削除は後のメンバーを詰めます。",
    unknown: "不明な元の値",
  },
};
