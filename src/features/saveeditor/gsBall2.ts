export interface GsBall2Catalog {
  available: boolean;
  enabled: boolean;
  canEdit: boolean;
}
export interface GsBall2Edit {
  action: "enableGsBall";
}
export const supportsGsBall2 = (format: string, version: string) =>
  format === "SAV2" && version === "C";
export const canEnableGsBall2 = (c: GsBall2Catalog) =>
  c.available && c.canEdit && !c.enabled;
export const gsBall2Words = {
  zh: {
    title: "GS 球事件",
    read: "读取事件状态",
    enable: "开启 GS 球事件",
    enabled: "事件已开启",
    pending: "事件尚未开启",
    unavailable: "存档缺少此事件的数据区域，无法开启。",
    readonly: "当前存档仅可读取，无法修改此事件。",
    note: "开启 GS 球事件，不重置其他剧情。游戏内仍需满足后续触发条件；修改应用于工作副本，可撤销，原存档保持不变。",
    error: "无法开启 GS 球事件。请确认存档完整、校验有效且事件尚未开启。",
  },
  en: {
    title: "GS Ball event",
    read: "Read event status",
    enable: "Enable GS Ball event",
    enabled: "Event enabled",
    pending: "Event not enabled",
    unavailable: "The save lacks the data region required for this event.",
    readonly: "This save is read-only; the event cannot be changed.",
    note: "Enables the GS Ball event without resetting other story progress. Further in-game conditions still apply. Changes affect the working copy, can be undone, and preserve the original save.",
    error:
      "Cannot enable the GS Ball event. The save must be complete, have valid checksums, and not already have this event enabled.",
  },
  ja: {
    title: "GS ボールイベント",
    read: "イベント状態を読み込む",
    enable: "GS ボールイベントを有効化",
    enabled: "イベントは有効です",
    pending: "イベントは未有効です",
    unavailable: "このイベントに必要なデータ領域がセーブにありません。",
    readonly: "このセーブは読み取り専用のため、イベントを変更できません。",
    note: "他の進行状況をリセットせず、GS ボールイベントを有効化します。ゲーム内の後続条件は別途必要です。変更は作業コピーに適用され、元に戻せます。元のセーブは保持されます。",
    error:
      "GS ボールイベントを有効化できません。完全でチェックサムが正しく、まだ有効化されていないセーブが必要です。",
  },
};
