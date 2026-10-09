import type { OriginChoice } from "./domain";
import type { Br4Lang } from "./br4";
export interface BrTrainer4Catalog {
  canEdit: boolean;
  profile: number;
  sourceHash: string;
  japanese: boolean;
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
  time: {
    hours: number | null;
    minutes: number | null;
    seconds: number | null;
    hex: string;
  };
  regions: { country: number; choices: OriginChoice[] }[];
}
export interface BrTrainer4Edit {
  action: "numbers" | "flags" | "text" | "rawText" | "time";
  profile: number;
  sourceHash: string;
  values?: { id: number; value: string }[];
  hours?: number;
  minutes?: number;
  seconds?: number;
}
function base(c: BrTrainer4Catalog) {
  if (
    !c.canEdit ||
    !Number.isInteger(c.profile) ||
    c.profile < 0 ||
    c.profile > 3 ||
    !/^[A-F0-9]{64}$/.test(c.sourceHash)
  )
    throw Error("Invalid BR trainer preview.");
  return { profile: c.profile, sourceHash: c.sourceHash };
}
export function brTrainerNumber(
  c: BrTrainer4Catalog,
  id: number,
  value: string,
): BrTrainer4Edit {
  const f = c.numbers.find((v) => v.id === id);
  if (
    (id === 0 && value.length > 6) ||
    ((id === 1 || id === 2) && value.length > 5)
  )
    throw Error("BR trainer number exceeds the control width.");
  if ((id === 1 || id === 2) && /^\d{1,5}$/.test(value))
    value = String(Math.min(65535, Number(value)));
  if (id <= 2 && value.trim() === "") value = "0";
  if (
    !f ||
    !/^\d+$/.test(value) ||
    Number(value) < f.minimum ||
    Number(value) > f.maximum ||
    (f.choices && !f.choices.some((v) => v.id === Number(value)))
  )
    throw Error("Invalid BR trainer number.");
  return { ...base(c), action: "numbers", values: [{ id, value }] };
}
export function brTrainerText(
  c: BrTrainer4Catalog,
  id: number,
  value: string,
  raw = false,
): BrTrainer4Edit {
  const f = c.text.find((v) => v.id === id);
  if (id === 4 && !raw) {
    if (value.length > 16) throw Error("Invalid BR trainer player ID.");
    const hex = value.replace(/[^a-f0-9]/gi, "");
    value = (hex ? BigInt(`0x${hex}`) : 0n)
      .toString(16)
      .toUpperCase()
      .padStart(16, "0");
  }
  if (!f) throw Error("Invalid BR trainer text field.");
  if (raw) {
    if (value.length !== f.bytes * 2 || !/^[a-f0-9]+$/i.test(value))
      throw Error("Invalid BR trainer raw text bytes.");
  } else {
    const normalized = value.replace(/\r\n?|\n/g, "⏎"),
      weight = normalized
        .split("")
        .reduce((sum, char) => sum + ("⏎￼Ⓟ".includes(char) ? 2 : 1), 0);
    if (
      value.length > f.maximum ||
      (!f.multiline && /\p{Cc}/u.test(value)) ||
      (id !== 4 &&
        weight >
          Math.min(
            f.maximum,
            f.bytes / 2 - 1 - (id === 3 && !c.japanese ? 2 : 0),
          )) ||
      (id === 4 && !/^[a-f0-9]{0,16}$/i.test(value))
    )
      throw Error("BR trainer text cannot fit its encoding.");
  }
  return {
    ...base(c),
    action: raw ? "rawText" : "text",
    values: [{ id, value }],
  };
}
export function brTrainerTime(
  c: BrTrainer4Catalog,
  hours: string,
  minutes: string,
  seconds: string,
): BrTrainer4Edit {
  const values = [hours, minutes, seconds];
  if (
    values.some((v) => !/^\d+$/.test(v)) ||
    hours.length > 5 ||
    minutes.length > 2 ||
    seconds.length > 2 ||
    Number(hours) > 65535 ||
    Number(minutes) > 99 ||
    Number(seconds) > 99
  )
    throw Error("Invalid BR trainer time values.");
  return {
    ...base(c),
    action: "time",
    hours: Number(hours),
    minutes: Number(minutes),
    seconds: Number(seconds),
  };
}
export function brTrainerFlag(
  c: BrTrainer4Catalog,
  id: number,
  enabled: boolean,
): BrTrainer4Edit {
  if (!Number.isInteger(id) || id < 0 || id >= 11)
    throw Error("Invalid BR trainer flag.");
  return {
    ...base(c),
    action: "flags",
    values: [{ id, value: enabled ? "1" : "0" }],
  };
}
export const brTrainer4Words: Record<
  Br4Lang,
  {
    title: string;
    read: string;
    apply: string;
    discard: string;
    field: string;
    raw: string;
    time: string;
    before: string;
    after: string;
    maximum: string;
    invalid: string;
    note: string;
    languageNote: string;
    textNote: string;
    unknown: string;
  }
> = {
  zh: {
    title: "对战革命训练家",
    read: "读取训练家",
    apply: "应用改动",
    discard: "放弃草稿",
    field: "编辑字段",
    raw: "编辑原始字节",
    time: "游戏时间",
    before: "当前值",
    after: "应用后",
    maximum: "最大宝可券数",
    invalid: "请核对训练家字段、编码长度、时间和当前玩家记录。",
    note: "只修改选定玩家的工作副本，可撤销并导出完整存档。未修改的姓名残留、其他玩家和对战通行证保持。",
    languageNote:
      "语言会改变此玩家的日文记录标记及通行证分类数量。未修改的自我介绍字节保持，重新编辑介绍时按当前语言编码。",
    textNote:
      "换行和变量 Ⓟ 各占两个编码字符。生日字段实际最多三个字符；原始字节编辑会替换整个字段。",
    unknown: "未知原值",
  },
  en: {
    title: "Battle Revolution trainer",
    read: "Read trainer",
    apply: "Apply changes",
    discard: "Discard draft",
    field: "Edit field",
    raw: "Edit raw bytes",
    time: "Play time",
    before: "Current value",
    after: "After applying",
    maximum: "Maximum Poké Coupons",
    invalid:
      "Check trainer fields, encoded length, time and the selected player record.",
    note: "Only the selected player's working copy changes. Undo and export the complete save. Unchanged name bytes, other players and Battle Passes stay intact.",
    languageNote:
      "Language changes this player's Japanese flag and pass category counts. Unchanged introduction bytes stay intact; editing the introduction encodes it for the current language.",
    textNote:
      "Line breaks and variable Ⓟ each use two encoded characters. Birthday fields fit at most three characters. Raw editing replaces the whole field.",
    unknown: "Unknown original value",
  },
  ja: {
    title: "バトルレボリューショントレーナー",
    read: "トレーナーを読む",
    apply: "変更を適用",
    discard: "下書きを破棄",
    field: "編集項目",
    raw: "元バイトを編集",
    time: "プレイ時間",
    before: "現在の値",
    after: "適用後",
    maximum: "ポケクーポン最大値",
    invalid:
      "トレーナー項目、文字数、時間と選択したプレイヤーを確認してください。",
    note: "選択したプレイヤーの作業コピーだけを変更します。元に戻すかセーブ全体を書き出せます。未変更の名前バイト、他のプレイヤーとバトルパスは保持します。",
    languageNote:
      "言語を変えると日本語記録のフラグとパス分類の件数が変わります。自己紹介の未変更バイトは保持し、自己紹介を編集すると現在の言語で書き込みます。",
    textNote:
      "改行と変数 Ⓟ は二文字分を使います。誕生日項目は最大三文字です。元バイト編集は項目全体を置き換えます。",
    unknown: "不明な元の値",
  },
};
