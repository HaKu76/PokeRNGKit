export const MAX_SAVE_BYTES = 32 * 1024 * 1024;

export interface SaveSummary {
  game: Record<"zh" | "en" | "ja", string>;
  trainer: string;
  tid: number;
  sid: number;
  displayTid: string | null;
  playTime: string;
  checksumsValid: boolean;
}

export interface SaveInfoRequest {
  base: string;
  file: File;
}

export type SaveInfoResponse =
  | { status: "ready"; summary: SaveSummary }
  | { status: "size" | "unsupported" | "runtime" };
