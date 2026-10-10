export interface Berry6XYPlot {
  index: number;
  values: number[];
  rawHex: string;
}
export interface Berry6XYCatalog {
  editable: false;
  sourceHash: string;
  count: number;
  plots: Berry6XYPlot[];
  rawHex: string;
}
export const supportsBerryField6XY = (format: string) => format === "SAV6XY";
export function berry6xyPlot(c: Berry6XYCatalog, index: number) {
  if (
    c.editable !== false ||
    c.count !== 32 ||
    c.plots.length !== 32 ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash) ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= 32
  )
    throw Error("Invalid BerryField6XY catalog or slot.");
  const plot = c.plots[index];
  if (
    plot.index !== index ||
    plot.values.length !== 8 ||
    plot.values.some((v) => !Number.isInteger(v) || v < 0 || v > 65535) ||
    !/^[A-F0-9]{32}$/.test(plot.rawHex)
  )
    throw Error("Invalid BerryField6XY plot.");
  return plot;
}
export const berry6xyWords = {
  zh: {
    title: "树果园查看器",
    read: "读取树果园",
    field: "园:",
    berry: "树果:",
    unfinished: "未完成: 需要更多研究",
    note: "上游此窗口仅提供读取。32 个格位中的未知字段保留为原始数值。",
    unknown: "未知字段",
    raw: "原始数据",
    invalid: "无法读取 X／Y 树果园，请核对存档格式。",
  },
  en: {
    title: "Berry Field Viewer",
    read: "Read Berry Field",
    field: "Field:",
    berry: "Berry:",
    unfinished: "Unfinished: Needs More Research",
    note: "This upstream window only reads data. Unknown fields in the 32 accessible plots remain raw numbers.",
    unknown: "Unknown field",
    raw: "Raw data",
    invalid: "Cannot read the X/Y Berry Field. Check the save format.",
  },
  ja: {
    title: "きのみ畑",
    read: "きのみ畑を読み込む",
    field: "畑",
    berry: "きのみ",
    unfinished: "未実装: 現在編集はできません",
    note: "元の画面は読み取りのみです。32区画の不明項目は元の数値で表示します。",
    unknown: "不明な項目",
    raw: "生データ",
    invalid: "X／Yのきのみ畑を読み込めません。セーブ形式を確認してください。",
  },
};
