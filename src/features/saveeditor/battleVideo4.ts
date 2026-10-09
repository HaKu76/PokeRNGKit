import type { PokemonEntry } from "./domain";
import type { Br4Lang } from "./br4";
export interface Video4Info {
  index: number;
  available: boolean;
  valid: boolean;
  key: number;
  magic: number;
  revision: number;
  blockID: number;
  teams: {
    index: number;
    name: string;
    storedCount: number;
    members: { slot: number; species: number; pokemon: PokemonEntry | null }[];
  }[];
}
export interface Video4Catalog {
  canEdit: boolean;
  sourceHash: string;
  index: number;
  slots: Video4Info[];
}
export interface Video4Import {
  index: number;
  sourceHash: string;
  data: string;
}
export interface Video4Preview {
  sourceHash: string;
  index: number;
  inputDecrypted: boolean;
  video: Video4Info;
}
export const supportsBattleVideo4 = (format: string) =>
  format === "SAV4Pt" || format === "SAV4HGSS";
export function video4Import(c: Video4Catalog, data: string): Video4Import {
  if (
    !c.canEdit ||
    !Number.isInteger(c.index) ||
    c.index < 0 ||
    c.index >= 4 ||
    !c.slots.find((v) => v.index === c.index)?.available ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    atob(data).length !== 7520
  )
    throw Error("Invalid battle video4 import.");
  return { index: c.index, sourceHash: c.sourceHash, data };
}
export function video4Confirmation(
  c: Video4Catalog,
  edit: Video4Import,
  preview: Video4Preview,
): Video4Import {
  if (
    edit.index !== c.index ||
    edit.sourceHash !== c.sourceHash ||
    preview.index !== c.index ||
    preview.sourceHash !== c.sourceHash ||
    !preview.video.available ||
    !preview.video.valid ||
    preview.video.index !== c.index ||
    preview.video.key !== c.slots[c.index].key ||
    preview.video.blockID !== c.slots[c.index].blockID
  )
    throw Error("Battle video4 preview is stale or invalid.");
  return video4Import(c, edit.data);
}
export const video4Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    slot: string;
    own: string;
    other: string;
    uninitialized: string;
    valid: string;
    invalidVideo: string;
    player: string;
    empty: string;
    unknown: string;
    import: string;
    export: string;
    decrypted: string;
    encrypted: string;
    preview: string;
    confirm: string;
    cancel: string;
    partial: string;
    note: string;
    replacing: string;
    fileError: string;
    invalid: string;
    stale: string;
    count: string;
    nickname: string;
    level: string;
  }
> = {
  zh: {
    title: "对战录像",
    read: "读取录像",
    slot: "录像格位",
    own: "我的录像",
    other: "其他录像",
    uninitialized: "未初始化",
    valid: "校验有效",
    invalidVideo: "校验异常",
    player: "训练家",
    empty: "空队伍",
    unknown: "未知宝可梦",
    import: "导入录像",
    export: "导出录像",
    decrypted: "解密文件",
    encrypted: "加密文件",
    preview: "导入预览",
    confirm: "确认替换此格",
    cancel: "关闭预览",
    partial:
      "录像只保留部分宝可梦字段，版本与捕获来源等信息无法恢复。此处展示录像中的队伍，不作为原宝可梦完整记录。",
    note: "只替换选定录像格位，保留目的格标识、其他录像和存档数据。原件保持，可在存档工具中撤销并导出工作副本。",
    replacing:
      "预览中的四支队伍将替换此格录像。目的格关联标识保持；导入后按加密格式保存。",
    fileError: "请选择完整的 7520 字节 bv4 文件。",
    invalid: "无法处理此录像，请核对格位、文件长度、加密状态和校验。",
    stale: "录像或当前存档已变化，请重新读取并预览。",
    count: "原始队伍数量",
    nickname: "昵称",
    level: "等级",
  },
  en: {
    title: "Battle videos",
    read: "Read videos",
    slot: "Video slot",
    own: "My video",
    other: "Other video",
    uninitialized: "Uninitialized",
    valid: "Checksums valid",
    invalidVideo: "Checksum issue",
    player: "Trainer",
    empty: "Empty team",
    unknown: "Unknown Pokémon",
    import: "Import video",
    export: "Export video",
    decrypted: "Decrypted file",
    encrypted: "Encrypted file",
    preview: "Import preview",
    confirm: "Replace this slot",
    cancel: "Close preview",
    partial:
      "Videos retain only part of each Pokémon's data. Version and encounter details cannot be recovered. These teams are video records, not complete original Pokémon files.",
    note: "Replace only the selected video slot, keeping destination identifiers, other videos and save data. The original stays intact; undo or export the working copy in the save tools.",
    replacing:
      "The four previewed teams replace this video slot. Destination ownership identifiers stay intact; imported videos are stored encrypted.",
    fileError: "Choose a complete 7520-byte bv4 file.",
    invalid:
      "Cannot process this video. Check the slot, file length, encryption state and checksums.",
    stale: "The video or save changed. Read and preview it again.",
    count: "Stored team count",
    nickname: "Nickname",
    level: "Level",
  },
  ja: {
    title: "バトルビデオ",
    read: "ビデオを読む",
    slot: "ビデオ枠",
    own: "自分のビデオ",
    other: "他のビデオ",
    uninitialized: "未初期化",
    valid: "チェックサム有効",
    invalidVideo: "チェックサム異常",
    player: "トレーナー",
    empty: "空のチーム",
    unknown: "不明なポケモン",
    import: "ビデオを読み込む",
    export: "ビデオを書き出す",
    decrypted: "復号済みファイル",
    encrypted: "暗号化ファイル",
    preview: "読込プレビュー",
    confirm: "この枠を置き換える",
    cancel: "プレビューを閉じる",
    partial:
      "ビデオはポケモンの一部の情報だけを保存します。バージョンや捕獲情報は復元できません。表示するチームはビデオ記録で、元のポケモンの完全な記録ではありません。",
    note: "選択したビデオ枠だけを置き換え、枠の識別情報、他のビデオとセーブ情報は保持します。元ファイルは保持し、セーブ機能で元に戻すか作業コピーを書き出せます。",
    replacing:
      "四つのチームでこのビデオ枠を置き換えます。枠の識別情報は保持し、暗号化して保存します。",
    fileError: "完全な7520バイトのbv4ファイルを選択してください。",
    invalid:
      "ビデオを処理できません。枠、ファイルサイズ、暗号化状態とチェックサムを確認してください。",
    stale: "ビデオまたはセーブが変わりました。読み直して再確認してください。",
    count: "保存されたチーム数",
    nickname: "ニックネーム",
    level: "レベル",
  },
};
