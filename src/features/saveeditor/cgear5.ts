import type { Br4Lang } from "./br4";

export const CGEAR5_WIDTH = 256;
export const CGEAR5_HEIGHT = 192;
export const CGEAR5_RAW_BYTES = 0x2600;
export const CGEAR5_PIXEL_BYTES = CGEAR5_WIDTH * CGEAR5_HEIGHT * 4;
export interface CGear5Catalog {
  canEdit: boolean;
  sourceHash: string;
  extension: "psk" | "cgb";
  uninitialized: boolean;
  hasSkin: boolean;
  checksum: number;
  downloadState: number;
  downloadCount: number;
  raw: string;
  pixels: string | null;
  renderable: boolean;
}
export interface CGear5Edit {
  action: "raw" | "image";
  sourceHash: string;
  data: string;
  targetHash?: string;
}
export interface CGear5Preview {
  request: CGear5Edit;
  result: CGear5Catalog;
  colors: number | null;
  tiles: number | null;
  pixelChanges: number | null;
  changedOffsets: number[];
}
export const supportsCGear5 = (format: string) =>
  format === "SAV5BW" || format === "SAV5B2W2";
export function cgear5Bytes(data: string, size: number): Uint8Array {
  if (data.length > Math.ceil(size / 3) * 4)
    throw Error("Invalid CGear5 data length.");
  const binary = atob(data);
  if (binary.length !== size) throw Error("Invalid CGear5 data length.");
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
export function cgear5Base64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function cgear5Import(
  c: CGear5Catalog,
  action: CGear5Edit["action"],
  data: string,
): CGear5Edit {
  if (
    !c.canEdit ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !["raw", "image"].includes(action)
  )
    throw Error("Invalid CGear5 import fields.");
  cgear5Bytes(data, action === "raw" ? CGEAR5_RAW_BYTES : CGEAR5_PIXEL_BYTES);
  return { action, sourceHash: c.sourceHash, data };
}
export function cgear5Frozen(c: CGear5Catalog, p: CGear5Preview): CGear5Edit {
  const edit = cgear5Import(c, p.request.action, p.request.data);
  if (
    p.request.sourceHash !== edit.sourceHash ||
    !/^[A-F0-9]{64}$/.test(p.request.targetHash ?? "") ||
    p.result.sourceHash !== p.request.targetHash ||
    p.result.extension !== c.extension ||
    !p.result.canEdit
  )
    throw Error("CGear5 preview is stale.");
  return { ...edit, targetHash: p.request.targetHash };
}
export const cgear5Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    current: string;
    result: string;
    empty: string;
    renderError: string;
    rawImport: string;
    imageImport: string;
    rawExport: string;
    imageExport: string;
    preview: string;
    confirm: string;
    cancel: string;
    note: string;
    imageNote: string;
    invalid: string;
    stale: string;
    imageError: string;
    colors: string;
    tiles: string;
    pixels: string;
    overflow: string;
    changed: string;
    offsets: string;
    present: string;
    absent: string;
    checksum: string;
    count: string;
    state: string;
  }
> = {
  zh: {
    title: "C-Gear 背景",
    read: "读取 C-Gear",
    current: "当前背景",
    result: "转换后的背景",
    empty: "未初始化",
    renderError: "图片布局异常，仍可导出原始皮肤或导入替换。",
    rawImport: "导入皮肤文件",
    imageImport: "导入 PNG",
    rawExport: "导出皮肤文件",
    imageExport: "导出 PNG",
    preview: "导入预览",
    confirm: "确认替换背景",
    cancel: "取消预览",
    note: "支持黑／白和黑2／白2皮肤，导入时自动转换排列格式，并更新存档的皮肤校验与下载记录。原件保持，可撤销。",
    imageNote:
      "PNG 必须为 256×192，在本地转换为游戏背景。透明度不保留，颜色与贴图受游戏容量限制，请检查转换结果。",
    invalid: "无法处理 C-Gear 文件，请核对长度、图片尺寸和排列格式。",
    stale: "存档或预览已变化，请重新读取并预览。",
    imageError: "请选择可在浏览器解码、256×192 且不超过 4 MiB 的 PNG 图片。",
    colors: "转换色数",
    tiles: "转换贴图计数",
    pixels: "发生变化的像素",
    overflow:
      "来源容量检查提示：色数超过 16 或贴图数超过 255。仍可沿用来源结果，请确认预览。",
    changed: "存档变化字节",
    offsets: "变化位置",
    present: "已有皮肤标记",
    absent: "无皮肤标记",
    checksum: "皮肤校验",
    count: "下载计数",
    state: "下载标识",
  },
  en: {
    title: "C-Gear background",
    read: "Read C-Gear",
    current: "Current background",
    result: "Converted background",
    empty: "Uninitialized",
    renderError:
      "The stored layout cannot be rendered. Export the raw skin or import a replacement.",
    rawImport: "Import skin file",
    imageImport: "Import PNG",
    rawExport: "Export skin file",
    imageExport: "Export PNG",
    preview: "Import preview",
    confirm: "Replace background",
    cancel: "Cancel preview",
    note: "Supports Black/White and Black 2/White 2 skins. Imports convert the layout and update skin checksums and download records. The original stays intact; changes can be undone.",
    imageNote:
      "Use a 256×192 PNG. It is converted locally to a game background. Transparency is discarded and game palette/tile limits apply. Inspect the converted image.",
    invalid:
      "Cannot process this C-Gear file. Check its length, image dimensions and tile layout.",
    stale: "The save or preview changed. Read and preview it again.",
    imageError: "Choose a browser-decodable 256×192 PNG no larger than 4 MiB.",
    colors: "Conversion color count",
    tiles: "Conversion tile counter",
    pixels: "Changed pixels",
    overflow:
      "Source capacity warning: more than 16 colors or 255 tiles. You can still use the source conversion result; inspect it before applying.",
    changed: "Changed save bytes",
    offsets: "Changed offsets",
    present: "Skin flag set",
    absent: "Skin flag unset",
    checksum: "Skin checksum",
    count: "Download count",
    state: "Download identifier",
  },
  ja: {
    title: "Cギア背景",
    read: "Cギアを読み込む",
    current: "現在の背景",
    result: "変換後の背景",
    empty: "未初期化",
    renderError:
      "画像の配置を表示できません。元のスキンの出力または置き換えが可能です。",
    rawImport: "スキンを読み込む",
    imageImport: "PNGを読み込む",
    rawExport: "スキンを書き出す",
    imageExport: "PNGを書き出す",
    preview: "読み込みプレビュー",
    confirm: "背景を置き換える",
    cancel: "プレビューを閉じる",
    note: "ブラック／ホワイトとブラック2／ホワイト2に対応。配置を変換し、スキンのチェックサムとダウンロード記録を更新します。元ファイルは維持され、元に戻せます。",
    imageNote:
      "256×192のPNGを使用してください。端末内でゲームの背景に変換します。透明度は保持されず、色数とタイル数にはゲームの制限があります。変換結果を確認してください。",
    invalid:
      "Cギアファイルを処理できません。長さ、画像サイズ、タイル配置を確認してください。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
    imageError:
      "ブラウザーで読み込める256×192、4 MiB以下のPNGを選択してください。",
    colors: "変換後の色数",
    tiles: "変換タイルカウンター",
    pixels: "変化したピクセル",
    overflow:
      "元の容量確認：16色または255タイルを超えています。元の変換結果を適用できますが、先に表示を確認してください。",
    changed: "セーブの変更バイト数",
    offsets: "変更位置",
    present: "スキンフラグあり",
    absent: "スキンフラグなし",
    checksum: "スキンチェックサム",
    count: "ダウンロード回数",
    state: "ダウンロード識別値",
  },
};
