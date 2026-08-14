export type ResearcherLocale = "en" | "zh" | "ja";

const english = {
  researcher: "Researcher",
  parameters: "Parameters",
  customs: "Customs",
  initialAdvances: "Initial Advances",
  maxAdvances: "Max Advances",
  generate: "Generate",
  search: "Search",
  next: "Next",
  advances: "Advances",
  seed: "Seed",
  valueHex: "Value (Hex)",
  hex: "Hex",
  results: "Results",
  cancel: "Cancel",
  clear: "Clear",
  ready: "Ready",
  calculating: "Calculating",
  completed: "Completed",
  cancelled: "Cancelled",
  failed: "Failed",
  processed: "Processed",
  elapsed: "Elapsed",
  workers: "Workers",
  noResults: "No result",
  unableToFind: "Unable to find a result",
  invalidInput: "Invalid Researcher input.",
  webLimit: "Max Advances exceeds the web limit of 250000.",
  emptyResults: "No generated states",
  searchValue: "Search value",
  searchColumn: "Search column",
  rightValue: "Value",
  rightOperand: "Operand",
  rng: "RNG",
} as const;

type ResearcherLabels = { [Key in keyof typeof english]: string };

const chinese: ResearcherLabels = {
  ...english,
  researcher: "研究工具",
  parameters: "参数",
  customs: "自定义",
  initialAdvances: "初始帧",
  maxAdvances: "最大帧数",
  generate: "生成",
  search: "检索",
  next: "下一个",
  advances: "帧数",
  seed: "Seed",
  hex: "16进制",
  results: "计算结果",
  cancel: "取消",
  clear: "清空",
  noResults: "无结果",
  unableToFind: "找不到结果",
};

const labels: Record<ResearcherLocale, ResearcherLabels> = {
  en: english,
  zh: chinese,
  // PokeFinder 4.3.2 marks the Researcher Japanese strings unfinished.
  ja: english,
};

export function researcherLocale(language: string): ResearcherLocale {
  if (language.toLowerCase().startsWith("zh")) return "zh";
  if (language.toLowerCase().startsWith("ja")) return "ja";
  return "en";
}

export function researcherLabels(language: string) {
  return labels[researcherLocale(language)];
}
