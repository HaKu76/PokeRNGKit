export const GEN4_SWARM_API_VERSION = 1;
export const GEN4_SWARM_MAX_ADVANCE_RANGE = 100_000;

export type Gen4SwarmGame = "dp" | "pt" | "hg" | "ss";

export interface Gen4SwarmEncounter {
  readonly route: string;
  readonly pokemon: string;
}

export const gen4SwarmEncounters: Record<
  Gen4SwarmGame,
  readonly Gen4SwarmEncounter[]
> = {
  dp: [
    ["Route 201", "Doduo"],
    ["Route 202", "Zigzagoon"],
    ["Route 203", "Cubone"],
    ["Route 206", "Nosepass"],
    ["Route 207", "Phanpy"],
    ["Route 208", "Dunsparce"],
    ["Route 209", "Snubbull"],
    ["Route 213", "Absol"],
    ["Route 214", "Spoink"],
    ["Route 215", "Drowzee"],
    ["Route 216", "Delibird"],
    ["Route 217", "Swinub"],
    ["Route 218", "Voltorb"],
    ["Route 221", "Farfetch'd"],
    ["Route 222", "Skitty"],
    ["Route 224", "Natu"],
    ["Route 225", "Makuhita"],
    ["Route 226", "Krabby"],
    ["Route 227", "Spinda"],
    ["Route 228", "Beldum"],
    ["Route 229", "Pidgey"],
    ["Route 230", "Corsola"],
    ["Lake Verity", "Surskit"],
    ["Lake Valor", "Lickitung"],
    ["Lake Acuity", "Smoochum"],
    ["Valley Windworks", "Electrike"],
    ["Eterna Forest", "Slakoth"],
    ["Fuego Ironworks", "Magnemite"],
  ].map(([route, pokemon]) => ({ route, pokemon })),
  pt: [
    ["Route 201", "Doduo"],
    ["Route 202", "Zigzagoon"],
    ["Route 203", "Cubone"],
    ["Route 206", "Larvitar"],
    ["Route 207", "Phanpy"],
    ["Route 208", "Dunsparce"],
    ["Route 209", "Snubbull"],
    ["Route 214", "Spoink"],
    ["Route 215", "Drowzee"],
    ["Route 217", "Delibird"],
    ["Route 218", "Voltorb"],
    ["Route 221", "Farfetch'd"],
    ["Route 222", "Skitty"],
    ["Route 224", "Natu"],
    ["Route 225", "Makuhita"],
    ["Route 226", "Krabby"],
    ["Route 227", "Spinda"],
    ["Route 228", "Beldum"],
    ["Route 229", "Pinsir"],
    ["Route 230", "Corsola"],
    ["Valley Windworks", "Electrike"],
    ["Eterna Forest", "Slakoth"],
  ].map(([route, pokemon]) => ({ route, pokemon })),
  hg: [
    ["Route 1", "Poochyena"],
    ["Route 3", "Baltoy"],
    ["Route 9", "Sableye"],
    ["Route 12 (Fishing)", "Relicanth"],
    ["Route 13", "Chansey"],
    ["Route 19", "Clamperl"],
    ["Route 32", "Qwilfish"],
    ["Route 25", "Buneary"],
    ["Route 27", "Luvdisc"],
    ["Route 34", "Ralts"],
    ["Route 35", "Yanma"],
    ["Route 38", "Snubbull"],
    ["Route 44", "Remoraid"],
    ["Route 45", "Swablu"],
    ["Route 47", "Ditto"],
    ["Mt. Mortar", "Marill"],
    ["Dark Cave", "Dunsparce"],
    ["Viridian Forest", "Kricketot"],
    ["Vermilion City", "Wingull"],
    ["Violet City", "Whiscash"],
  ].map(([route, pokemon]) => ({ route, pokemon })),
  ss: [
    ["Route 1", "Poochyena"],
    ["Route 3", "Gulpin"],
    ["Route 9", "Mawile"],
    ["Route 12 (Fishing)", "Relicanth"],
    ["Route 13", "Chansey"],
    ["Route 19", "Clamperl"],
    ["Route 32", "Qwilfish"],
    ["Route 25", "Buneary"],
    ["Route 27", "Luvdisc"],
    ["Route 34", "Ralts"],
    ["Route 35", "Yanma"],
    ["Route 38", "Snubbull"],
    ["Route 44", "Remoraid"],
    ["Route 45", "Swablu"],
    ["Route 47", "Ditto"],
    ["Mt. Mortar", "Marill"],
    ["Dark Cave", "Dunsparce"],
    ["Viridian Forest", "Kricketot"],
    ["Vermilion City", "Wingull"],
    ["Violet City", "Whiscash"],
  ].map(([route, pokemon]) => ({ route, pokemon })),
};

export interface Gen4SwarmAdvanceRequest {
  readonly mode: "advances";
  readonly game: Gen4SwarmGame;
  readonly seed: number;
  readonly targetIndex: number;
  readonly minAdvance: number;
  readonly maxAdvance: number;
}

export interface Gen4SwarmSeedRequest {
  readonly mode: "seed";
  readonly game: Gen4SwarmGame;
  readonly targetIndex: number;
  readonly minDelay: number;
  readonly minHour: number;
  readonly mtAdvances: number;
}

export type Gen4SwarmRequest = Gen4SwarmAdvanceRequest | Gen4SwarmSeedRequest;

export interface Gen4SwarmAdvanceResult {
  readonly advance: number;
  readonly encounterIndex: number;
}

export interface Gen4SwarmSeedResult {
  readonly seed: number;
  readonly hour: number;
  readonly delay: number;
  readonly mtAdvances: number;
}

export interface Gen4SwarmChunk {
  readonly index: 0;
  readonly stateCount: 1;
}

export function gameToWasm(game: Gen4SwarmGame) {
  return game === "dp" ? 0 : game === "pt" ? 1 : game === "hg" ? 2 : 3;
}

function validU32(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 0xffff_ffff;
}

function validTarget(game: Gen4SwarmGame, targetIndex: number) {
  return (
    Number.isInteger(targetIndex) &&
    targetIndex >= 0 &&
    targetIndex < gen4SwarmEncounters[game].length
  );
}

export function validateGen4SwarmRequest(request: Gen4SwarmRequest) {
  const errors: string[] = [];
  if (!Object.hasOwn(gen4SwarmEncounters, request.game)) errors.push("game");
  if (!validTarget(request.game, request.targetIndex))
    errors.push("targetIndex");
  if (request.mode === "advances") {
    if (!validU32(request.seed)) errors.push("seed");
    if (!validU32(request.minAdvance) || !validU32(request.maxAdvance))
      errors.push("advances");
    else if (
      request.maxAdvance < request.minAdvance ||
      request.maxAdvance - request.minAdvance > GEN4_SWARM_MAX_ADVANCE_RANGE
    )
      errors.push("advanceRange");
  } else {
    if (
      !Number.isInteger(request.minDelay) ||
      request.minDelay < 600 ||
      request.minDelay > 9999
    )
      errors.push("minDelay");
    if (
      !Number.isInteger(request.minHour) ||
      request.minHour < 0 ||
      request.minHour > 23
    )
      errors.push("minHour");
    if (
      !Number.isInteger(request.mtAdvances) ||
      request.mtAdvances < 0 ||
      request.mtAdvances > 9999
    )
      errors.push("mtAdvances");
  }
  return errors;
}

export function decodeGen4SwarmAdvances(
  buffer: ArrayBuffer,
): Gen4SwarmAdvanceResult[] {
  const words = new Uint32Array(buffer);
  if (words.length % 2 !== 0)
    throw new RangeError("Invalid Gen IV Swarm result buffer.");
  return Array.from({ length: words.length / 2 }, (_, index) => ({
    advance: words[index * 2],
    encounterIndex: words[index * 2 + 1],
  }));
}

export function decodeGen4SwarmSeed(
  buffer: ArrayBuffer,
): Gen4SwarmSeedResult[] {
  const words = new Uint32Array(buffer);
  if (words.length !== 0 && words.length !== 4)
    throw new RangeError("Invalid Gen IV Swarm seed result buffer.");
  if (words.length === 0) return [];
  return [
    { seed: words[0], hour: words[1], delay: words[2], mtAdvances: words[3] },
  ];
}

export function gen4SwarmChunk(): Gen4SwarmChunk {
  return { index: 0, stateCount: 1 };
}
export function packGen4SwarmAdvanceRequest(request: Gen4SwarmAdvanceRequest) {
  return Uint32Array.from([
    gameToWasm(request.game),
    request.seed,
    request.targetIndex,
    request.minAdvance,
    request.maxAdvance,
  ]);
}

export function packGen4SwarmSeedRequest(request: Gen4SwarmSeedRequest) {
  return Uint32Array.from([
    gameToWasm(request.game),
    request.targetIndex,
    request.minDelay,
    request.minHour,
    request.mtAdvances,
  ]);
}
