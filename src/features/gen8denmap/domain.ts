import { GEN8_DEN_INFO, type Gen8DenInfo } from "../gen8raids/data";

export type Gen8DenMapRegionId = "wildArea" | "isleOfArmor" | "crownTundra";

export interface Gen8DenMapRegion {
  id: Gen8DenMapRegionId;
  labelKey:
    "gen8DenMapWildArea" | "gen8DenMapIsleOfArmor" | "gen8DenMapCrownTundra";
  start: number;
  end: number;
  width: number;
  height: number;
  image: string;
}

export interface Gen8DenMapEntry {
  info: Gen8DenInfo;
  localIndex: number;
  locationName: string;
}

export const GEN8_DEN_MAP_REGIONS: readonly Gen8DenMapRegion[] = [
  {
    id: "wildArea",
    labelKey: "gen8DenMapWildArea",
    start: 0,
    end: 100,
    width: 458,
    height: 1064,
    image: "map.png",
  },
  {
    id: "isleOfArmor",
    labelKey: "gen8DenMapIsleOfArmor",
    start: 100,
    end: 190,
    width: 1183,
    height: 1183,
    image: "map_ioa.png",
  },
  {
    id: "crownTundra",
    labelKey: "gen8DenMapCrownTundra",
    start: 190,
    end: 276,
    width: 1920,
    height: 2060,
    image: "map_ct.png",
  },
] as const;

const LOCATION_NAMES = {
  en: [
    "Axew's Eye",
    "Bridge Field",
    "Dappled Grove",
    "Dusty Bowl",
    "East Lake Axewell",
    "Giant's Cap",
    "Giant's Mirror",
    "Giant's Seat",
    "Hammerlocke Hills",
    "Lake of Outrage",
    "Motostoke Riverbank",
    "North Lake Miloch",
    "Rolling Fields",
    "South Lake Miloch",
    "Stony Wilderness",
    "Watchtower Ruins",
    "West Lake Axewell",
    "Fields of Honor",
    "Soothing Wetlands",
    "Forest of Focus",
    "Challenge Beach",
    "Brawlers' Cave",
    "Challenge Road",
    "Courageous Cavern",
    "Loop Lagoon",
    "Training Lowlands",
    "Potbottom Desert",
    "Workout Sea",
    "Stepping-Stone Sea",
    "Insular Sea",
    "Honeycalm Sea",
    "Honeycalm Island",
    "Slippery Slope",
    "Frostpoint Field",
    "Giant's Bed",
    "Old Cemetery",
    "Snowslide Slope",
    "Path to the Peak",
    "Crown Shrine",
    "Giant's Foot",
    "Frigid Sea",
    "Three-Point Pass",
    "Ballimere Lake",
    "Dyna Tree Hill",
  ],
  zh: [
    "牙牙湖之眼",
    "桥间空地",
    "沐光森林",
    "沙尘洼地",
    "牙牙湖东岸",
    "巨人帽岩",
    "巨人镜池",
    "巨人凳岩",
    "拳关丘陵",
    "逆鳞湖",
    "机擎河岸",
    "美纳斯湖北岸",
    "煦丽草原",
    "美纳斯湖南岸",
    "巨石原野",
    "瞭望塔旧址",
    "牙牙湖西岸",
    "揖礼原野",
    "清凉湿原",
    "专注森林",
    "挑战海滩",
    "战斗洞窟",
    "挑战之路",
    "斗志洞窟",
    "圆环海湾",
    "锻炼平原",
    "锅底沙漠",
    "健身之海",
    "列岛海域",
    "离岛海域",
    "蜂巢海",
    "蜂巢岛",
    "起橇雪原",
    "冰点雪原",
    "巨人睡榻",
    "远古墓地",
    "雪中溪谷",
    "通顶雪道",
    "王冠神殿",
    "巨人鞋底",
    "冻海",
    "三岔平原",
    "球湖湖畔",
    "巨树丘陵",
  ],
} as const;

export function getGen8DenMapRegion(id: Gen8DenMapRegionId): Gen8DenMapRegion {
  const region = GEN8_DEN_MAP_REGIONS.find((entry) => entry.id === id);
  if (!region) throw new RangeError("Invalid Gen 8 den map region.");
  return region;
}

export function getGen8DenMapEntries(
  regionId: Gen8DenMapRegionId,
  language: string,
): Gen8DenMapEntry[] {
  const region = getGen8DenMapRegion(regionId);
  const names = language.startsWith("zh")
    ? LOCATION_NAMES.zh
    : LOCATION_NAMES.en;
  return GEN8_DEN_INFO.slice(region.start, region.end).map(
    (info, localIndex) => ({
      info,
      localIndex,
      locationName: names[info.location] ?? `Location ${info.location}`,
    }),
  );
}

export function getGen8DenMapEntry(
  regionId: Gen8DenMapRegionId,
  localIndex: number,
  language: string,
): Gen8DenMapEntry {
  const entry = getGen8DenMapEntries(regionId, language)[localIndex];
  if (!entry) throw new RangeError("Invalid Gen 8 den map index.");
  return entry;
}
