import type { Br4Lang } from "./br4";
import type { PokemonEntry } from "./domain";
import { cgear5Base64, cgear5Bytes } from "./cgear5";
export type Dlc5Kind =
  "video" | "memory" | "musical" | "dexSkin" | "battleTest" | "pwt" | "movie";
export interface Dlc5Slot {
  kind: Dlc5Kind;
  index: number;
  extension: string;
  size: number;
  importSizes: number[];
  uninitialized: boolean;
  canExport: boolean;
  name: string;
  description: string;
  about: string;
  valid: boolean | null;
  magic: number | null;
  flags: number | null;
  downloadState: number | null;
  downloadCount: number | null;
  teams: {
    index: number;
    name: string;
    storedCount: number;
    members: { slot: number; species: number; pokemon: PokemonEntry | null }[];
  }[];
}
export interface Dlc5Catalog {
  canEdit: boolean;
  sourceHash: string;
  slots: Dlc5Slot[];
}
export interface Dlc5Edit {
  kind: Dlc5Kind;
  index: number;
  sourceHash: string;
  data: string;
  fileName?: string;
  targetHash?: string;
}
export interface Dlc5Preview {
  request: Dlc5Edit;
  result: Dlc5Slot;
  inputSize: number;
  inputDecrypted: boolean | null;
  changedOffsets: number[];
}
export interface Dlc5Export {
  kind: Dlc5Kind;
  index: number;
  decrypted: boolean;
}
export const supportsDlc5 = (format: string) =>
  ["SAV5BW", "SAV5B2W2"].includes(format);
export function dlc5Import(
  c: Dlc5Catalog,
  s: Dlc5Slot,
  bytes: Uint8Array,
  fileName: string,
): Dlc5Edit {
  if (
    !c.canEdit ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !c.slots.some((v) => v.kind === s.kind && v.index === s.index) ||
    !s.importSizes.includes(bytes.length) ||
    (s.kind === "musical" &&
      (!fileName || fileName.length > 1024 || fileName.includes("\0")))
  )
    throw Error("Invalid Dlc5 import fields.");
  return {
    kind: s.kind,
    index: s.index,
    sourceHash: c.sourceHash,
    data: cgear5Base64(bytes),
    ...(s.kind === "musical" ? { fileName } : {}),
  };
}
export function dlc5Frozen(c: Dlc5Catalog, p: Dlc5Preview): Dlc5Edit {
  const s = c.slots.find(
    (v) => v.kind === p.request.kind && v.index === p.request.index,
  );
  if (
    !s ||
    !c.canEdit ||
    p.request.sourceHash !== c.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.kind !== s.kind ||
    p.result.index !== s.index ||
    p.result.size !== s.size ||
    !s.importSizes.includes(p.inputSize)
  )
    throw Error("Dlc5 preview is stale.");
  const bytes = cgear5Bytes(p.request.data, p.inputSize);
  return {
    ...dlc5Import(c, s, bytes, p.request.fileName ?? ""),
    targetHash: p.request.targetHash,
  };
}
export function dlc5Export(s: Dlc5Slot, decrypted: boolean): Dlc5Export {
  if (!s.canExport || (decrypted && s.kind !== "video"))
    throw Error("Invalid Dlc5 export mode.");
  return { kind: s.kind, index: s.index, decrypted };
}
export const dlc5Titles: Record<Dlc5Kind, Record<Br4Lang, string>> = {
  video: { zh: "对战视频", en: "Battle Videos", ja: "バトルビデオ" },
  memory: { zh: "记忆连接", en: "Memory Link", ja: "おもいでリンク" },
  musical: { zh: "宝可梦音乐剧", en: "Musical", ja: "ミュージカル" },
  dexSkin: { zh: "宝可梦图鉴皮肤", en: "PokéDex Skin", ja: "ずかんスキン" },
  battleTest: { zh: "对战测试", en: "Battle Test", ja: "バトルけんてい" },
  pwt: { zh: "宝可梦世界锦标赛", en: "PWT", ja: "PWT" },
  movie: { zh: "宝可梦好莱坞", en: "Pokéstar Studios", ja: "ポケウッド" },
};
export const dlc5Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    group: string;
    slot: string;
    import: string;
    export: string;
    exportDecrypted: string;
    empty: string;
    preview: string;
    confirm: string;
    cancel: string;
    size: string;
    name: string;
    description: string;
    about: string;
    valid: string;
    invalidChecksum: string;
    count: string;
    state: string;
    changed: string;
    offsets: string;
    input: string;
    encrypted: string;
    decrypted: string;
    team: string;
    members: string;
    unknown: string;
    trainer: string;
    level: string;
    note: string;
    videoNote: string;
    dexNote: string;
    testNote: string;
    musicalNote: string;
    adjusted: string;
    invalid: string;
    stale: string;
    cgear: string;
    signature: string;
    flags: string;
    pokemonDetails: string;
  }
> = {
  zh: {
    title: "第五世代 DLC 文件",
    read: "读取 DLC",
    group: "功能分组",
    slot: "格位",
    import: "导入文件",
    export: "导出原始文件",
    exportDecrypted: "导出解密录像",
    empty: "未初始化",
    preview: "导入预览",
    confirm: "确认替换此格",
    cancel: "取消预览",
    size: "支持文件长度（字节）",
    name: "名称",
    description: "描述",
    about: "说明",
    valid: "校验有效",
    invalidChecksum: "校验异常",
    count: "下载计数",
    state: "下载标识",
    changed: "存档变化字节",
    offsets: "变化位置（十六进制）",
    input: "输入文件",
    encrypted: "加密",
    decrypted: "解密",
    team: "队伍",
    members: "原始成员数量",
    unknown: "未知宝可梦",
    trainer: "训练家姓名",
    level: "等级",
    note: "导入只替换选定文件格位，并按来源规则更新关联标记与校验。先查看预览再确认，原件保持，可撤销。",
    videoNote:
      "录像只保留部分宝可梦数据，版本与相遇来源等信息无法恢复。此处展示可还原队伍，不作为原宝可梦完整记录，也不提供录像播放。",
    dexNote: "来源只实现图鉴皮肤文件导入导出，前景／背景图片编辑尚未实现。",
    testNote:
      "来源标注此功能仍待研究。可以导入导出文件，不宣称实机对战测试可用。",
    musicalNote:
      "音乐剧名称按来源从文件名移除编号／大写语言后缀，保留最多 20 字符；预览显示实际保存名称。",
    adjusted: "文件长度将按目标游戏调整，补零或截去来源支持的额外尾部。",
    invalid: "DLC 文件、格位或导出模式无效，请核对目标游戏与文件长度。",
    stale: "存档或预览已变化，请重新读取并预览。",
    cgear: "打开 C-Gear 背景",
    signature: "文件标识",
    flags: "原始标记",
    pokemonDetails: "可还原的宝可梦信息",
  },
  en: {
    title: "Generation 5 DLC files",
    read: "Read DLC",
    group: "Group",
    slot: "Slot",
    import: "Import file",
    export: "Export stored file",
    exportDecrypted: "Export decrypted video",
    empty: "Uninitialized",
    preview: "Import preview",
    confirm: "Replace this slot",
    cancel: "Cancel preview",
    size: "Accepted file sizes (bytes)",
    name: "Name",
    description: "Description",
    about: "About",
    valid: "Checksums valid",
    invalidChecksum: "Checksum issue",
    count: "Download count",
    state: "Download identifier",
    changed: "Changed save bytes",
    offsets: "Changed offsets (hex)",
    input: "Input file",
    encrypted: "Encrypted",
    decrypted: "Decrypted",
    team: "Team",
    members: "Stored member count",
    unknown: "Unknown Pokémon",
    trainer: "Trainer name",
    level: "Level",
    note: "Imports replace the selected file slot and update related flags and checksums using source rules. Inspect the preview before applying. The original stays intact; changes can be undone.",
    videoNote:
      "Videos only retain partial Pokémon data. Version and encounter details cannot be recovered. These are reconstructed teams, not complete original Pokémon records. Video playback is unavailable.",
    dexNote:
      "The source implements skin file import/export only. Foreground/background image editing is not implemented.",
    testNote:
      "The source marks this feature as needing research. File import/export is available; in-game Battle Test operation is not confirmed.",
    musicalNote:
      "The source derives the musical name from the filename, removes numbering/uppercase language suffixes, and keeps at most 20 characters. The preview shows the stored name.",
    adjusted:
      "The file length is adjusted for the target game by zero-padding or removing the supported extra tail.",
    invalid:
      "Invalid DLC file, slot or export mode. Check the target game and file size.",
    stale: "The save or preview changed. Read and preview it again.",
    cgear: "Open C-Gear background",
    signature: "File identifier",
    flags: "Stored flags",
    pokemonDetails: "Recoverable Pokémon details",
  },
  ja: {
    title: "第五世代DLCファイル",
    read: "DLCを読み込む",
    group: "グループ",
    slot: "スロット",
    import: "ファイルを読み込む",
    export: "保存ファイルを書き出す",
    exportDecrypted: "復号したビデオを書き出す",
    empty: "未初期化",
    preview: "読み込みプレビュー",
    confirm: "このスロットを置き換える",
    cancel: "プレビューを閉じる",
    size: "対応ファイル長（バイト）",
    name: "名前",
    description: "説明",
    about: "詳細",
    valid: "チェックサム正常",
    invalidChecksum: "チェックサム異常",
    count: "ダウンロード回数",
    state: "ダウンロード識別値",
    changed: "セーブの変更バイト数",
    offsets: "変更位置（16進数）",
    input: "入力ファイル",
    encrypted: "暗号化",
    decrypted: "復号済み",
    team: "チーム",
    members: "保存されたメンバー数",
    unknown: "不明なポケモン",
    trainer: "トレーナー名",
    level: "レベル",
    note: "選択したファイルのスロットを置き換え、元と同じルールで関連フラグとチェックサムを更新します。適用前に確認してください。元ファイルは維持され、元に戻せます。",
    videoNote:
      "ビデオにはポケモンの一部の情報しか残りません。バージョンや出会いの情報は復元できません。完全な元の記録ではなく復元チームとして表示します。ビデオ再生には対応しません。",
    dexNote:
      "元の実装はスキンファイルの読み込みと書き出しのみです。前景と背景の画像編集は未実装です。",
    testNote:
      "元の実装では研究が必要とされています。ファイルの読み込みと書き出しは可能ですが、実機のバトルけんてい動作は未確認です。",
    musicalNote:
      "ファイル名から番号と大文字の言語サフィックスを除去し、20文字以内のミュージカル名を保存します。保存結果をプレビューで確認してください。",
    adjusted:
      "対象ゲームに合わせ、ゼロで補充するか対応する末尾を削除して長さを調整します。",
    invalid:
      "DLCファイル、スロットまたは書き出し方式が無効です。対象ゲームと長さを確認してください。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
    cgear: "Cギア背景を開く",
    signature: "ファイル識別値",
    flags: "保存フラグ",
    pokemonDetails: "復元できるポケモン情報",
  },
};
