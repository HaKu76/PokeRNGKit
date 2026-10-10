import type { Br4Lang } from "./br4";
type Words = {
  title: string;
  read: string;
  main: string;
  items: string;
  pokemon: string;
  origin: string;
  enabled: string;
  yes: string;
  no: string;
  bp: string;
  miles: string;
  flags: string;
  checksum: string;
  valid: string;
  invalidChecksum: string;
  quantity: string;
  slot: string;
  preview: string;
  apply: string;
  cancel: string;
  discard: string;
  resave: string;
  import: string;
  export: string;
  changes: string;
  changed: string;
  raw: string;
  noChanges: string;
  note: string;
  resaveNote: string;
  importNote: string;
  excessiveBP: string;
  invalid: string;
  stale: string;
};
export const link6Words: Record<Br4Lang, Words> = {
  zh: {
    title: "宝可梦连接",
    read: "读取宝可梦连接",
    main: "主界面",
    items: "道具",
    pokemon: "宝可梦",
    origin: "来源",
    enabled: "宝可梦连接开启",
    yes: "是",
    no: "否",
    bp: "对战点数",
    miles: "宝可里程",
    flags: "原始标记",
    checksum: "连接数据校验",
    valid: "通过",
    invalidChecksum: "未通过",
    quantity: "数量",
    slot: "格位",
    preview: "预览修改",
    apply: "确认应用",
    cancel: "取消预览",
    discard: "放弃修改",
    resave: "按窗口规则重新保存",
    import: "导入 pl6",
    export: "导出 pl6",
    changes: "实际变化",
    changed: "存档变化字节",
    raw: "原始数据变化",
    noChanges: "没有数据变化",
    note: "来源、启用标记、道具与宝可梦按上游只读显示。已启用记录可修改对战点数与宝可里程；所有修改先预览，原件保留，可撤销。",
    resaveNote:
      "重新保存会重写来源文字，将启用标记重写为 0 或 128，道具数量只保留低八位，未知道具可能变成 65535，并更新内部校验。",
    importNote:
      "pl6 必须为 2631 字节。导入保留文件内部校验，按窗口规则重新保存才刷新它。导出当前原始数据，不包含未确认修改。",
    excessiveBP:
      "旧对战点数超过窗口上限 9999，重新保存前请先修正；未修改时保留旧值。",
    invalid: "宝可梦连接字段或文件无效，请核对输入与文件大小。",
    stale: "存档或预览已变化，请重新读取并预览。",
  },
  en: {
    title: "Pokémon Link",
    read: "Read Pokémon Link",
    main: "Main",
    items: "Items",
    pokemon: "Pokémon",
    origin: "Origin",
    enabled: "Pokémon Link Available",
    yes: "Yes",
    no: "No",
    bp: "Battle Points",
    miles: "Pokémiles",
    flags: "Raw flags",
    checksum: "Link data checksum",
    valid: "Valid",
    invalidChecksum: "Invalid",
    quantity: "Quantity",
    slot: "Slot",
    preview: "Preview changes",
    apply: "Apply preview",
    cancel: "Cancel preview",
    discard: "Discard changes",
    resave: "Resave using window rules",
    import: "Import pl6",
    export: "Export pl6",
    changes: "Actual changes",
    changed: "Changed save bytes",
    raw: "Raw data changes",
    noChanges: "No data changes",
    note: "Origin, availability, items and Pokémon follow the upstream read-only controls. Enabled records allow Battle Points and Pokémiles edits. Preview every change; the original stays intact and changes can be undone.",
    resaveNote:
      "Resaving rewrites origin text, sets flags to 0 or 128, keeps only the low eight quantity bits, may set unknown items to 65535 and refreshes the internal checksum.",
    importNote:
      "pl6 files must contain 2631 bytes. Import preserves the file's internal checksum until a window-rule resave. Export writes current raw data without unconfirmed edits.",
    excessiveBP:
      "Stored Battle Points exceed the window limit of 9999. Repair them before resaving; untouched values stay intact.",
    invalid:
      "Invalid Pokémon Link fields or file. Check the input and file size.",
    stale: "The save or preview changed. Read and preview it again.",
  },
  ja: {
    title: "ポケモンリンク",
    read: "ポケモンリンクを読み込む",
    main: "メイン",
    items: "アイテム",
    pokemon: "ポケモン",
    origin: "出所",
    enabled: "ポケモンリンク 有効",
    yes: "はい",
    no: "いいえ",
    bp: "バトルポイント",
    miles: "ポケマイル",
    flags: "元のフラグ",
    checksum: "リンクデータのチェックサム",
    valid: "正常",
    invalidChecksum: "不正",
    quantity: "個数",
    slot: "スロット",
    preview: "変更を確認",
    apply: "変更を適用",
    cancel: "プレビューを閉じる",
    discard: "変更を破棄",
    resave: "元の編集ルールで再保存",
    import: "pl6をインポート",
    export: "pl6をエクスポート",
    changes: "実際の変更",
    changed: "セーブの変更バイト数",
    raw: "元のデータの変更",
    noChanges: "データの変更なし",
    note: "出所、有効フラグ、アイテム、ポケモンは元の読み取り専用項目に従います。有効な記録のバトルポイントとポケマイルを編集できます。適用前に確認してください。元ファイルは維持され、元に戻せます。",
    resaveNote:
      "再保存は出所を書き直し、フラグを0または128にし、個数の下位8ビットだけを保存します。不明なアイテムは65535になる場合があり、内部チェックサムも更新します。",
    importNote:
      "pl6は2631バイトです。インポートは内部チェックサムを維持し、再保存で更新します。エクスポートは未確認の変更を含めず現在のデータを書き出します。",
    excessiveBP:
      "保存されたバトルポイントが上限9999を超えています。再保存前に修正してください。変更しない値は維持します。",
    invalid:
      "ポケモンリンクの項目またはファイルが無効です。入力とサイズを確認してください。",
    stale:
      "セーブまたはプレビューが変わりました。再読み込みして確認してください。",
  },
};
