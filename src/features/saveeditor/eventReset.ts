export interface EventResetCatalog {
  entries: { id: string; name: string; hidden: boolean }[];
  canEdit: boolean;
}
export interface EventResetEdit {
  ids: string[];
}
export const supportsEventReset = (format: string) => format === "SAV1";
export function validateEventReset(
  catalog: EventResetCatalog,
  ids: readonly string[],
): EventResetEdit {
  if (
    !catalog.canEdit ||
    !ids.length ||
    ids.length > catalog.entries.length ||
    new Set(ids).size !== ids.length ||
    ids.some(
      (id) => !catalog.entries.some((entry) => entry.id === id && entry.hidden),
    )
  )
    throw new Error("Invalid event reset selection.");
  return { ids: [...ids] };
}
export const eventResetWords = {
  zh: {
    title: "定点与赠送事件重置",
    read: "读取事件状态",
    search: "搜索宝可梦",
    pending: "可重置",
    clear: "关联标记已清除",
    apply: "重置所选事件",
    discard: "取消选择",
    selected: "已选择",
    empty: "没有匹配的事件。",
    invalid: "请选择尚未重置的有效事件。",
    note: "清除所选事件的剧情与隐藏标记，不新增宝可梦。修改应用于工作副本，可撤销；游戏内仍需满足其他剧情条件。",
  },
  en: {
    title: "Static and gift event resets",
    read: "Read event status",
    search: "Search Pokémon",
    pending: "Can reset",
    clear: "Linked flags cleared",
    apply: "Reset selected events",
    discard: "Clear selection",
    selected: "Selected",
    empty: "No matching events.",
    invalid: "Select valid events that have not been reset.",
    note: "Clears the selected events’ story and hide flags without adding Pokémon. Changes affect the working copy and can be undone; other in-game story conditions still apply.",
  },
  ja: {
    title: "固定・贈り物イベントのリセット",
    read: "イベント状態を読み込む",
    search: "ポケモンを検索",
    pending: "リセット可能",
    clear: "関連フラグは解除済み",
    apply: "選択したイベントをリセット",
    discard: "選択を解除",
    selected: "選択済み",
    empty: "一致するイベントがありません。",
    invalid: "未リセットの有効なイベントを選択してください。",
    note: "選択したイベントの進行・非表示フラグを解除します。ポケモンは追加しません。変更は作業コピーに適用され、元に戻せます。ゲーム内では他の進行条件も必要です。",
  },
};
