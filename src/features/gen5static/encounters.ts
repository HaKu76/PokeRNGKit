import type { Gen5GameVersion } from "../gen5profiles/domain";

export type Gen5StaticCategory =
  | "starters"
  | "fossils"
  | "gifts"
  | "stationary"
  | "legends"
  | "events"
  | "roamers"
  | "curtis"
  | "yancy";

export type Gen5StaticTemplateVersion = "gen5" | "bw" | "bw2" | Gen5GameVersion;

export type Gen5StaticTemplateShiny = "random" | "never" | "always";

export interface Gen5StaticPersonal {
  gender: number;
  abilities: readonly [number, number, number];
}

export interface Gen5StaticTemplate {
  id: string;
  category: Gen5StaticCategory;
  sourceDescription: string;
  versions: Gen5StaticTemplateVersion;
  species: number;
  form: number;
  level: number;
  shiny: Gen5StaticTemplateShiny;
  ability: number;
  gender: number;
  wild: boolean;
  egg: boolean;
  roamer: boolean;
  curtis: boolean;
  yancy: boolean;
  personal: Gen5StaticPersonal;
}

const PERSONAL: Readonly<Record<number, Gen5StaticPersonal>> = {
  52: { gender: 127, abilities: [53, 101, 127] },
  56: { gender: 127, abilities: [72, 83, 128] },
  111: { gender: 127, abilities: [31, 69, 120] },
  129: { gender: 127, abilities: [33, 33, 155] },
  133: { gender: 31, abilities: [50, 91, 107] },
  138: { gender: 31, abilities: [33, 75, 133] },
  140: { gender: 31, abilities: [33, 4, 133] },
  142: { gender: 31, abilities: [69, 46, 127] },
  143: { gender: 31, abilities: [17, 47, 82] },
  147: { gender: 127, abilities: [61, 61, 63] },
  175: { gender: 31, abilities: [55, 32, 105] },
  202: { gender: 127, abilities: [23, 23, 140] },
  216: { gender: 127, abilities: [53, 95, 118] },
  231: { gender: 127, abilities: [53, 53, 8] },
  280: { gender: 127, abilities: [28, 36, 140] },
  302: { gender: 127, abilities: [51, 100, 158] },
  303: { gender: 127, abilities: [52, 22, 125] },
  327: { gender: 127, abilities: [20, 77, 126] },
  345: { gender: 31, abilities: [21, 21, 114] },
  347: { gender: 31, abilities: [4, 4, 33] },
  377: { gender: 255, abilities: [29, 29, 5] },
  378: { gender: 255, abilities: [29, 29, 115] },
  379: { gender: 255, abilities: [29, 29, 135] },
  380: { gender: 254, abilities: [26, 26, 26] },
  381: { gender: 0, abilities: [26, 26, 26] },
  408: { gender: 31, abilities: [104, 104, 125] },
  410: { gender: 31, abilities: [5, 5, 43] },
  422: { gender: 127, abilities: [60, 114, 159] },
  440: { gender: 254, abilities: [30, 32, 132] },
  442: { gender: 127, abilities: [46, 46, 151] },
  443: { gender: 127, abilities: [8, 8, 24] },
  480: { gender: 255, abilities: [26, 26, 26] },
  481: { gender: 255, abilities: [26, 26, 26] },
  482: { gender: 255, abilities: [26, 26, 26] },
  485: { gender: 127, abilities: [18, 18, 49] },
  486: { gender: 255, abilities: [112, 112, 112] },
  488: { gender: 254, abilities: [26, 26, 26] },
  494: { gender: 255, abilities: [162, 162, 162] },
  495: { gender: 31, abilities: [65, 65, 126] },
  498: { gender: 31, abilities: [66, 66, 47] },
  501: { gender: 31, abilities: [67, 67, 75] },
  511: { gender: 31, abilities: [82, 82, 65] },
  513: { gender: 31, abilities: [82, 82, 66] },
  515: { gender: 31, abilities: [82, 82, 67] },
  518: { gender: 127, abilities: [108, 28, 140] },
  555: { gender: 127, abilities: [125, 125, 161] },
  558: { gender: 127, abilities: [5, 75, 133] },
  564: { gender: 31, abilities: [116, 5, 33] },
  566: { gender: 31, abilities: [129, 129, 129] },
  570: { gender: 31, abilities: [149, 149, 149] },
  571: { gender: 31, abilities: [149, 149, 149] },
  585: { gender: 127, abilities: [34, 157, 32] },
  590: { gender: 127, abilities: [27, 27, 144] },
  591: { gender: 127, abilities: [27, 27, 144] },
  593: { gender: 127, abilities: [11, 130, 6] },
  612: { gender: 127, abilities: [79, 104, 127] },
  628: { gender: 0, abilities: [51, 125, 128] },
  630: { gender: 254, abilities: [145, 142, 133] },
  636: { gender: 127, abilities: [49, 49, 68] },
  637: { gender: 127, abilities: [49, 49, 68] },
  638: { gender: 255, abilities: [154, 154, 154] },
  639: { gender: 255, abilities: [154, 154, 154] },
  640: { gender: 255, abilities: [154, 154, 154] },
  641: { gender: 0, abilities: [158, 158, 128] },
  642: { gender: 0, abilities: [158, 158, 128] },
  643: { gender: 255, abilities: [163, 163, 163] },
  644: { gender: 255, abilities: [164, 164, 164] },
  645: { gender: 0, abilities: [159, 159, 125] },
  646: { gender: 255, abilities: [46, 46, 46] },
};

type TemplateInput = Omit<
  Gen5StaticTemplate,
  | "id"
  | "category"
  | "form"
  | "shiny"
  | "ability"
  | "gender"
  | "wild"
  | "egg"
  | "roamer"
  | "curtis"
  | "yancy"
  | "personal"
> &
  Partial<
    Pick<
      Gen5StaticTemplate,
      "form" | "shiny" | "ability" | "gender" | "wild" | "curtis" | "yancy"
    >
  >;

function createTemplates(
  category: Gen5StaticCategory,
  entries: readonly TemplateInput[],
) {
  return entries.map((entry, index): Gen5StaticTemplate => {
    const personal = PERSONAL[entry.species];
    if (!personal)
      throw new Error(`Missing Gen 5 personal data for ${entry.species}.`);
    return {
      ...entry,
      id: `${category}-${index}`,
      category,
      form: entry.form ?? 0,
      shiny: entry.shiny ?? "random",
      ability: entry.ability ?? 255,
      gender: entry.gender ?? 255,
      wild: entry.wild ?? false,
      egg: entry.species === 636 || entry.species === 440,
      roamer: entry.species === 641 || entry.species === 642,
      curtis: entry.curtis ?? false,
      yancy: entry.yancy ?? false,
      personal,
    };
  });
}

const starters = createTemplates("starters", [
  {
    sourceDescription: "Snivy @ Nuvema Town / Aspertia City",
    versions: "gen5",
    species: 495,
    level: 5,
  },
  {
    sourceDescription: "Tepig @ Nuvema Town / Aspertia City",
    versions: "gen5",
    species: 498,
    level: 5,
  },
  {
    sourceDescription: "Oshawott @ Nuvema Town / Aspertia City",
    versions: "gen5",
    species: 501,
    level: 5,
  },
]);

const fossils = createTemplates("fossils", [
  {
    sourceDescription: "Omanyte @ Nacrene City",
    versions: "gen5",
    species: 138,
    level: 25,
  },
  {
    sourceDescription: "Kabuto @ Nacrene City",
    versions: "gen5",
    species: 140,
    level: 25,
  },
  {
    sourceDescription: "Aerodactyl @ Nacrene City",
    versions: "gen5",
    species: 142,
    level: 25,
  },
  {
    sourceDescription: "Lileep @ Nacrene City",
    versions: "gen5",
    species: 345,
    level: 25,
  },
  {
    sourceDescription: "Anorith @ Nacrene City",
    versions: "gen5",
    species: 347,
    level: 25,
  },
  {
    sourceDescription: "Cranidos @ Nacrene City",
    versions: "gen5",
    species: 408,
    level: 25,
  },
  {
    sourceDescription: "Shieldon @ Nacrene City",
    versions: "gen5",
    species: 410,
    level: 25,
  },
  {
    sourceDescription: "Tirtouga @ Nacrene City",
    versions: "gen5",
    species: 564,
    level: 25,
  },
  {
    sourceDescription: "Archen @ Nacrene City",
    versions: "gen5",
    species: 566,
    level: 25,
  },
]);

const gifts = createTemplates("gifts", [
  {
    sourceDescription: "Pansage @ Dreamyard",
    versions: "bw",
    species: 511,
    level: 10,
  },
  {
    sourceDescription: "Pansear @ Dreamyard",
    versions: "bw",
    species: 513,
    level: 10,
  },
  {
    sourceDescription: "Panpour @ Dreamyard",
    versions: "bw",
    species: 515,
    level: 10,
  },
  {
    sourceDescription: "Larvesta Egg from Treasure Hunter",
    versions: "bw",
    species: 636,
    level: 1,
  },
  {
    sourceDescription: "Eevee @ Castelia City",
    versions: "bw2",
    species: 133,
    level: 10,
    ability: 2,
    gender: 0,
    shiny: "never",
  },
  {
    sourceDescription: "Deerling @ Route 6",
    versions: "bw2",
    species: 585,
    level: 30,
    ability: 2,
    shiny: "never",
  },
  {
    sourceDescription: "Shiny Gible @ Floccesy Town",
    versions: "black2",
    species: 443,
    level: 1,
    ability: 0,
    gender: 0,
    shiny: "always",
  },
  {
    sourceDescription: "Shiny Dratini @ Floccesy Town",
    versions: "white2",
    species: 147,
    level: 1,
    ability: 0,
    gender: 0,
    shiny: "always",
  },
  {
    sourceDescription: "Happiny Egg from PKMN Breeder",
    versions: "bw2",
    species: 440,
    level: 1,
  },
  {
    sourceDescription: "Magikarp @ Marvelous Bridge",
    versions: "gen5",
    species: 129,
    level: 5,
  },
  {
    sourceDescription: "Zorua @ Castelia City",
    versions: "bw",
    species: 570,
    level: 10,
    gender: 0,
    shiny: "never",
  },
]);

const stationary = createTemplates("stationary", [
  {
    sourceDescription: "Musharna @ Dreamyard Friday Only",
    versions: "bw",
    species: 518,
    level: 50,
    ability: 2,
    wild: true,
  },
  {
    sourceDescription: "Foongus @ Route 6",
    versions: "bw",
    species: 590,
    level: 20,
    wild: true,
  },
  {
    sourceDescription: "Foongus @ Route 6",
    versions: "bw",
    species: 590,
    level: 30,
    wild: true,
  },
  {
    sourceDescription: "Amoonguss @ Route 6",
    versions: "bw",
    species: 591,
    level: 40,
    wild: true,
  },
  {
    sourceDescription: "Darmanitan @ Desert Resort",
    versions: "bw",
    species: 555,
    level: 35,
    ability: 2,
    wild: true,
  },
  {
    sourceDescription: "Volcarona @ Relic Castle",
    versions: "bw",
    species: 637,
    level: 70,
    wild: true,
  },
  {
    sourceDescription: "Foongus @ Route 6",
    versions: "bw2",
    species: 590,
    level: 29,
    wild: true,
  },
  {
    sourceDescription: "Amoonguss @ Route 6",
    versions: "bw2",
    species: 591,
    level: 43,
    wild: true,
  },
  {
    sourceDescription: "Amoonguss @ Route 6",
    versions: "bw2",
    species: 591,
    level: 47,
    wild: true,
  },
  {
    sourceDescription: "Amoonguss @ Route 6",
    versions: "bw2",
    species: 591,
    level: 56,
    wild: true,
  },
  {
    sourceDescription: "Jellicent @ Undella Bay Mon Only",
    versions: "black2",
    species: 593,
    level: 40,
    ability: 2,
    gender: 0,
    wild: true,
  },
  {
    sourceDescription: "Jellicent @ Undella Bay Thurs Only",
    versions: "white2",
    species: 593,
    level: 40,
    ability: 2,
    gender: 1,
    wild: true,
  },
  {
    sourceDescription: "Braviary @ Route 4 Mon Only",
    versions: "white2",
    species: 628,
    level: 25,
    ability: 2,
    wild: true,
  },
  {
    sourceDescription: "Mandibuzz @ Route 4 Thurs Only",
    versions: "black2",
    species: 630,
    level: 25,
    ability: 2,
    wild: true,
  },
  {
    sourceDescription: "Volcarona @ Relic Castle",
    versions: "bw2",
    species: 637,
    level: 35,
    wild: true,
  },
  {
    sourceDescription: "Volcarona @ Relic Castle",
    versions: "bw2",
    species: 637,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Crustle @ Seaside Cave",
    versions: "bw2",
    species: 558,
    level: 42,
    wild: true,
  },
  {
    sourceDescription: "Haxorus @ Nature Preserve",
    versions: "bw2",
    species: 612,
    level: 60,
    shiny: "always",
    wild: true,
  },
]);

const legends = createTemplates("legends", [
  {
    sourceDescription: "Cobalion @ Guidance Chamber",
    versions: "bw",
    species: 638,
    level: 42,
    wild: true,
  },
  {
    sourceDescription: "Terrakion @ Trial Chamber",
    versions: "bw",
    species: 639,
    level: 42,
    wild: true,
  },
  {
    sourceDescription: "Virizion @ Rumination Field",
    versions: "bw",
    species: 640,
    level: 42,
    wild: true,
  },
  {
    sourceDescription: "Reshiram @ N's Castle / Dragonspiral Tower",
    versions: "black",
    species: 643,
    level: 50,
    shiny: "never",
    wild: true,
  },
  {
    sourceDescription: "Zekrom @ N's Castle / Dragonspiral Tower",
    versions: "white",
    species: 644,
    level: 50,
    shiny: "never",
    wild: true,
  },
  {
    sourceDescription: "Landorus @ Abundant Shrine",
    versions: "bw",
    species: 645,
    level: 70,
    wild: true,
  },
  {
    sourceDescription: "Kyurem @ Giant Chasm",
    versions: "bw",
    species: 646,
    level: 75,
    wild: true,
  },
  {
    sourceDescription: "Regirock @ Rock Peak Chamber",
    versions: "bw2",
    species: 377,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Regice @ Iceberg Chamber",
    versions: "bw2",
    species: 378,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Registeel @ Iron Chamber",
    versions: "bw2",
    species: 379,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Latias @ Dreamyard",
    versions: "white2",
    species: 380,
    level: 68,
    wild: true,
  },
  {
    sourceDescription: "Latios @ Dreamyard",
    versions: "black2",
    species: 381,
    level: 68,
    wild: true,
  },
  {
    sourceDescription: "Uxie @ Nacrene City",
    versions: "bw2",
    species: 480,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Mesprit @ Celestial Tower",
    versions: "bw2",
    species: 481,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Azelf @ Route 23",
    versions: "bw2",
    species: 482,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Heatran @ Reversal Mountain",
    versions: "bw2",
    species: 485,
    level: 68,
    wild: true,
  },
  {
    sourceDescription: "Regigigas @ Twist Mountain",
    versions: "bw2",
    species: 486,
    level: 68,
    wild: true,
  },
  {
    sourceDescription: "Cresselia @ Marvelous Bridge",
    versions: "bw2",
    species: 488,
    level: 68,
    wild: true,
  },
  {
    sourceDescription: "Cobalion @ Route 13",
    versions: "bw2",
    species: 638,
    level: 45,
    wild: true,
  },
  {
    sourceDescription: "Cobalion @ Route 13",
    versions: "bw2",
    species: 638,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Terrakion @ Route 22",
    versions: "bw2",
    species: 639,
    level: 45,
    wild: true,
  },
  {
    sourceDescription: "Terrakion @ Route 22",
    versions: "bw2",
    species: 639,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Virizion @ Route 11",
    versions: "bw2",
    species: 640,
    level: 45,
    wild: true,
  },
  {
    sourceDescription: "Virizion @ Route 11",
    versions: "bw2",
    species: 640,
    level: 65,
    wild: true,
  },
  {
    sourceDescription: "Reshiram @ Dragonspiral Tower",
    versions: "white2",
    species: 643,
    level: 70,
    shiny: "never",
    wild: true,
  },
  {
    sourceDescription: "Zekrom @ Dragonspiral Tower",
    versions: "black2",
    species: 644,
    level: 70,
    shiny: "never",
    wild: true,
  },
  {
    sourceDescription: "Kyurem @ Giant Chasm",
    versions: "bw2",
    species: 646,
    level: 70,
    wild: true,
  },
]);

const events = createTemplates("events", [
  {
    sourceDescription: "Victini @ Liberty Garden",
    versions: "bw",
    species: 494,
    level: 15,
    shiny: "never",
    wild: true,
  },
  {
    sourceDescription: "Zoroark @ Lostlorn Forest",
    versions: "bw",
    species: 571,
    level: 25,
    gender: 1,
    shiny: "never",
    wild: true,
  },
]);

const roamers = createTemplates("roamers", [
  { sourceDescription: "Tornadus", versions: "black", species: 641, level: 40 },
  {
    sourceDescription: "Thundurus",
    versions: "white",
    species: 642,
    level: 40,
  },
]);

const curtis = createTemplates(
  "curtis",
  [
    ["Mankey", 56],
    ["Wobbuffet", 202],
    ["Ralts", 280],
    ["Cranidos", 408],
    ["Rhyhorn", 111],
    ["Shellos", 422],
    ["Sableye", 302],
    ["Spiritomb", 442],
    ["Snorlax", 143],
    ["Phanpy", 231],
    ["Spinda", 327],
    ["Togepi", 175],
  ].map(([sourceDescription, species]) => ({
    sourceDescription: String(sourceDescription),
    versions: "bw2" as const,
    species: Number(species),
    form: species === 422 ? 1 : 0,
    level: 50,
    ability: 2,
    shiny: "never" as const,
    curtis: true,
  })),
);

const yancy = createTemplates(
  "yancy",
  [
    ["Meowth", 52],
    ["Wobbuffet", 202],
    ["Ralts", 280],
    ["Shieldon", 410],
    ["Rhyhorn", 111],
    ["Shellos", 422],
    ["Mawile", 303],
    ["Spiritomb", 442],
    ["Snorlax", 143],
    ["Teddiursa", 216],
    ["Spinda", 327],
    ["Togepi", 175],
  ].map(([sourceDescription, species]) => ({
    sourceDescription: String(sourceDescription),
    versions: "bw2" as const,
    species: Number(species),
    form: species === 422 ? 1 : 0,
    level: 50,
    ability: 2,
    shiny: "never" as const,
    yancy: true,
  })),
);

export const GEN5_STATIC_CATEGORIES = [
  "starters",
  "fossils",
  "gifts",
  "stationary",
  "legends",
  "events",
  "roamers",
  "curtis",
  "yancy",
] as const satisfies readonly Gen5StaticCategory[];

export const GEN5_STATIC_TEMPLATES = {
  starters,
  fossils,
  gifts,
  stationary,
  legends,
  events,
  roamers,
  curtis,
  yancy,
} as const satisfies Record<Gen5StaticCategory, readonly Gen5StaticTemplate[]>;

export function gen5StaticTemplateSupportsVersion(
  template: Gen5StaticTemplate,
  version: Gen5GameVersion,
) {
  return (
    template.versions === "gen5" ||
    template.versions === version ||
    (template.versions === "bw" &&
      (version === "black" || version === "white")) ||
    (template.versions === "bw2" &&
      (version === "black2" || version === "white2"))
  );
}

export function gen5StaticCategoriesForVersion(version: Gen5GameVersion) {
  return GEN5_STATIC_CATEGORIES.filter((category) =>
    GEN5_STATIC_TEMPLATES[category].some((template) =>
      gen5StaticTemplateSupportsVersion(template, version),
    ),
  );
}

export function gen5StaticTemplatesForVersion(
  category: Gen5StaticCategory,
  version: Gen5GameVersion,
) {
  return GEN5_STATIC_TEMPLATES[category].filter((template) =>
    gen5StaticTemplateSupportsVersion(template, version),
  );
}
