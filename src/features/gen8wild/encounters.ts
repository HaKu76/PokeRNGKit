import {
  GEN8_WILD_DATA,
  GEN8_WILD_GREAT_MARSH,
  GEN8_WILD_GREAT_MARSH_NATIONAL_DEX,
  GEN8_WILD_TROPHY_GARDEN,
  type Gen8WildArea,
  type Gen8WildEncounter,
  type Gen8WildSlot,
  type Gen8WildVersion,
} from "./data";

export interface Gen8WildEncounterSettings {
  version: Gen8WildVersion;
  tid: number;
  sid: number;
  nationalDex: boolean;
  encounter: Gen8WildEncounter;
  location: number;
  time: 0 | 1 | 2;
  radar: boolean;
  swarm: boolean;
  replacement: readonly [number, number];
  feebasTile: boolean;
}

const encounterKeys = {
  grass: "grass",
  surfing: "surfing",
  oldRod: "oldRod",
  goodRod: "goodRod",
  superRod: "superRod",
} as const;

function areaFor(version: Gen8WildVersion, location: number) {
  return GEN8_WILD_DATA[version].areas.find(
    (area) => area.location === location,
  );
}

export function getGen8WildLocations(
  version: Gen8WildVersion,
  encounter: Gen8WildEncounter,
): number[] {
  if (encounter === "rockSmash") return [];
  if (encounter === "honeyTree") {
    return GEN8_WILD_DATA[version].honey.map((area) => area.location);
  }
  const key = encounterKeys[encounter];
  return GEN8_WILD_DATA[version].areas
    .filter((area) => area.rates[key] > 0)
    .map((area) => area.location);
}

function replaceSpecies(slot: Gen8WildSlot, species: number): Gen8WildSlot {
  return species === 0 ? slot : { ...slot, species };
}

function grassSlots(area: Gen8WildArea, settings: Gen8WildEncounterSettings) {
  const slots: Gen8WildSlot[] = area.grass.map((slot) => ({ ...slot }));
  if (settings.swarm) {
    slots[0] = replaceSpecies(slots[0], area.swarm[0]);
    slots[1] = replaceSpecies(slots[1], area.swarm[1]);
  }
  if (settings.time === 1) {
    slots[2] = replaceSpecies(slots[2], area.day[0]);
    slots[3] = replaceSpecies(slots[3], area.day[1]);
  } else if (settings.time === 2) {
    slots[2] = replaceSpecies(slots[2], area.night[0]);
    slots[3] = replaceSpecies(slots[3], area.night[1]);
  }
  if (settings.radar) {
    slots[4] = replaceSpecies(slots[4], area.radar[0]);
    slots[5] = replaceSpecies(slots[5], area.radar[1]);
    slots[10] = replaceSpecies(slots[10], area.radar[2]);
    slots[11] = replaceSpecies(slots[11], area.radar[3]);
  }
  if (
    area.location >= 23 &&
    area.location <= 28 &&
    settings.replacement[0] !== 0
  ) {
    slots[6] = replaceSpecies(slots[6], settings.replacement[0]);
    slots[7] = replaceSpecies(slots[7], settings.replacement[0]);
  }
  if (
    area.location === 117 &&
    settings.replacement[0] !== 0 &&
    settings.replacement[1] !== 0
  ) {
    slots[6] = replaceSpecies(slots[6], settings.replacement[0]);
    slots[7] = replaceSpecies(slots[7], settings.replacement[1]);
  }
  return slots;
}

function munchlaxTreeIds(tid: number, sid: number) {
  const values = [
    (sid >>> 8) % 21,
    (sid & 0xff) % 21,
    (tid >>> 8) % 21,
    (tid & 0xff) % 21,
  ];
  for (let index = 1; index < values.length; index += 1) {
    for (let previous = 0; previous < index; previous += 1) {
      if (values[index] === values[previous]) {
        values[index] = (values[index] + 1) % 21;
      }
    }
  }
  return values;
}

function honeySlots(settings: Gen8WildEncounterSettings) {
  const versionData = GEN8_WILD_DATA[settings.version];
  const area = versionData.honey.find(
    (entry) => entry.location === settings.location,
  );
  if (!area) return [];
  const treeId = versionData.honey.findIndex(
    (entry) => entry.location === settings.location,
  );
  const groupCount = munchlaxTreeIds(settings.tid, settings.sid).includes(
    treeId,
  )
    ? 3
    : 2;
  const unique = new Map<number, Gen8WildSlot>();
  area.groups.slice(0, groupCount).forEach((group) => {
    group.forEach((slot) => {
      if (!unique.has(slot.species)) unique.set(slot.species, { ...slot });
    });
  });
  return [...unique.values()];
}

export function getGen8WildSlots(settings: Gen8WildEncounterSettings) {
  if (settings.encounter === "rockSmash") return [];
  if (settings.encounter === "honeyTree") return honeySlots(settings);
  const area = areaFor(settings.version, settings.location);
  if (!area) return [];
  if (settings.encounter === "grass") return grassSlots(area, settings);
  const key = encounterKeys[settings.encounter];
  const slots: Gen8WildSlot[] = area[key].map((slot) => ({ ...slot }));
  if (
    settings.location === 22 &&
    settings.feebasTile &&
    (settings.encounter === "oldRod" ||
      settings.encounter === "goodRod" ||
      settings.encounter === "superRod")
  ) {
    slots.push({ species: 349, minLevel: 10, maxLevel: 20 });
  }
  return slots;
}

export function getGen8WildReplacementOptions(
  nationalDex: boolean,
  location: number,
) {
  if (location >= 23 && location <= 28) {
    return nationalDex
      ? GEN8_WILD_GREAT_MARSH_NATIONAL_DEX
      : GEN8_WILD_GREAT_MARSH;
  }
  return location === 117 ? GEN8_WILD_TROPHY_GARDEN : [];
}
