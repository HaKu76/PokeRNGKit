import { GEN7_STATIONARY_SPECIES } from "../gen7stationary/data";
import type { Gen7StationaryLanguage } from "../gen7stationary/domain";

export const KEYBV_API_VERSION = 1;
export const KEYBV_PARTY_SIZE = 0x104;
export const KEYBV_STORED_SIZE = 0xe8;
export const KEYBV_PARTY_COUNT = 6;
export const KEYBV_VIDEO_SIZES = [0x6e60, 0x6bc0] as const;

const PARTY_OFFSETS = [0x4e18, 0x4e41] as const;
const BLOCK_POSITION = [
  [0, 0, 0, 0, 0, 0, 1, 1, 2, 3, 2, 3, 1, 1, 2, 3, 2, 3, 1, 1, 2, 3, 2, 3],
  [1, 1, 2, 3, 2, 3, 0, 0, 0, 0, 0, 0, 2, 3, 1, 1, 3, 2, 2, 3, 1, 1, 3, 2],
  [2, 3, 1, 1, 3, 2, 2, 3, 1, 1, 3, 2, 0, 0, 0, 0, 0, 0, 3, 2, 3, 2, 1, 1],
  [3, 2, 3, 2, 1, 1, 3, 2, 3, 2, 1, 1, 3, 2, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0],
] as const;
const BLOCK_POSITION_INVERT = [
  0, 1, 2, 4, 3, 5, 6, 7, 12, 18, 13, 19, 8, 10, 14, 20, 16, 22, 9, 11, 15, 21,
  17, 23,
] as const;

export type KeyBvGeneration = 6 | 7;

export interface KeyBvVideoValidation {
  readonly valid: boolean;
  readonly generation?: KeyBvGeneration;
  readonly size?: number;
  readonly code: "missing" | "invalid-size" | "mismatched-size" | "ready";
}

export interface KeyBvPokemon {
  readonly slot: number;
  readonly species: number;
  readonly tsv: number;
  readonly trv: number;
}

export interface KeyBvResult {
  readonly generation: KeyBvGeneration;
  readonly videoSize: number;
  readonly pokemon: readonly KeyBvPokemon[];
}

export class KeyBvError extends Error {
  readonly code: "invalid-size" | "mismatched-size" | "dump-failed";

  constructor(
    code: "invalid-size" | "mismatched-size" | "dump-failed",
    message: string,
  ) {
    super(message);
    this.name = "KeyBvError";
    this.code = code;
  }
}

function generationForVideoSize(size: number): KeyBvGeneration | undefined {
  if (size === KEYBV_VIDEO_SIZES[0]) return 6;
  if (size === KEYBV_VIDEO_SIZES[1]) return 7;
  return undefined;
}

export function inspectKeyBvFiles(
  video1Length: number | undefined,
  video2Length: number | undefined,
): KeyBvVideoValidation {
  if (video1Length === undefined || video2Length === undefined)
    return { valid: false, code: "missing" };
  const generation = generationForVideoSize(video1Length);
  if (!generation) return { valid: false, code: "invalid-size" };
  if (video1Length !== video2Length)
    return { valid: false, code: "mismatched-size" };
  return {
    valid: true,
    code: "ready",
    generation,
    size: video1Length,
  };
}

function viewOf(data: Uint8Array) {
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function readU16(data: Uint8Array, offset: number) {
  return viewOf(data).getUint16(offset, true);
}

function readU32(data: Uint8Array, offset: number) {
  return viewOf(data).getUint32(offset, true);
}

function writeU16(data: Uint8Array, offset: number, value: number) {
  viewOf(data).setUint16(offset, value & 0xffff, true);
}

function nextLcrng(seed: number) {
  return (Math.imul(seed, 0x41c64e6d) + 0x6073) >>> 0;
}

function shuffle(data: Uint8Array, shuffleValue: number) {
  const shuffled = new Uint8Array(data.length);
  shuffled.set(data.subarray(0, 8), 0);
  for (let block = 0; block < 4; block++) {
    const sourceBlock = BLOCK_POSITION[block][shuffleValue];
    shuffled.set(
      data.subarray(8 + 56 * sourceBlock, 8 + 56 * sourceBlock + 56),
      8 + 56 * block,
    );
  }
  if (data.length > KEYBV_STORED_SIZE)
    shuffled.set(data.subarray(KEYBV_STORED_SIZE), KEYBV_STORED_SIZE);
  return shuffled;
}

/** Encrypts a party-sized PKX using the PKHeX-compatible Gen VI/VII layout. */
export function encryptKeyBvPkx(data: Uint8Array) {
  if (data.length !== KEYBV_PARTY_SIZE)
    throw new RangeError(`PKX must be ${KEYBV_PARTY_SIZE} bytes.`);
  const personality = readU32(data, 0);
  const shuffleValue = ((personality >>> 13) & 0x1f) % 24;
  const encrypted = shuffle(data, BLOCK_POSITION_INVERT[shuffleValue]);
  let seed = personality;
  for (let offset = 8; offset < KEYBV_STORED_SIZE; offset += 2) {
    seed = nextLcrng(seed);
    writeU16(encrypted, offset, readU16(encrypted, offset) ^ (seed >>> 16));
  }
  seed = personality;
  for (let offset = KEYBV_STORED_SIZE; offset < KEYBV_PARTY_SIZE; offset += 2) {
    seed = nextLcrng(seed);
    writeU16(encrypted, offset, readU16(encrypted, offset) ^ (seed >>> 16));
  }
  return encrypted;
}

function decryptKeyBvPkx(data: Uint8Array) {
  const decrypted = new Uint8Array(data);
  const personality = readU32(decrypted, 0);
  const shuffleValue = ((personality >>> 13) & 0x1f) % 24;
  let seed = personality;
  for (let offset = 8; offset < KEYBV_STORED_SIZE; offset += 2) {
    seed = nextLcrng(seed);
    writeU16(decrypted, offset, readU16(decrypted, offset) ^ (seed >>> 16));
  }
  const unshuffled = shuffle(decrypted, shuffleValue);
  seed = personality;
  for (let offset = KEYBV_STORED_SIZE; offset < KEYBV_PARTY_SIZE; offset += 2) {
    seed = nextLcrng(seed);
    writeU16(unshuffled, offset, readU16(unshuffled, offset) ^ (seed >>> 16));
  }
  return unshuffled;
}

function isCorrupted(data: Uint8Array) {
  let checksum = 0;
  for (let offset = 8; offset < KEYBV_STORED_SIZE; offset += 2)
    checksum = (checksum + readU16(data, offset)) & 0xffff;
  return readU16(data, 6) !== checksum;
}

function xorInPlace(target: Uint8Array, source: Uint8Array) {
  for (let index = 0; index < target.length; index++)
    target[index] ^= source[index];
}

function encryptedZeroes() {
  return encryptKeyBvPkx(new Uint8Array(KEYBV_PARTY_SIZE));
}

function getParty(data: Uint8Array, offset: number, slot: number) {
  const start = offset + slot * KEYBV_PARTY_SIZE;
  return data.slice(start, start + KEYBV_PARTY_SIZE);
}

function parsePokemon(
  video: Uint8Array,
  stream: Uint8Array,
  partyOffset: number,
  slot: number,
  zeroes: Uint8Array,
) {
  const encrypted = getParty(video, partyOffset, slot);
  const streamOffset = slot * KEYBV_PARTY_SIZE;
  for (let index = 0; index < KEYBV_PARTY_SIZE; index++)
    encrypted[index] ^= stream[streamOffset + index];
  const data = decryptKeyBvPkx(encrypted);
  if (isCorrupted(data)) {
    xorInPlace(data, zeroes);
    if (isCorrupted(data)) return undefined;
    xorInPlace(
      stream.subarray(streamOffset, streamOffset + KEYBV_PARTY_SIZE),
      zeroes,
    );
  }
  const species = readU16(data, 8);
  if (species === 0) return undefined;
  const tid = readU16(data, 0x0c);
  const sid = readU16(data, 0x0e);
  const shinyValue = tid ^ sid;
  return {
    slot,
    species,
    tsv: shinyValue >>> 4,
    trv: shinyValue & 0xf,
  } satisfies KeyBvPokemon;
}

export function parseKeyBv(
  video1: Uint8Array,
  video2: Uint8Array,
): KeyBvResult {
  const validation = inspectKeyBvFiles(video1.length, video2.length);
  if (validation.code === "mismatched-size")
    throw new KeyBvError("mismatched-size", "Battle video sizes do not match.");
  if (!validation.valid || !validation.generation || !validation.size)
    throw new KeyBvError("invalid-size", "Battle video size is not supported.");

  const generationIndex = validation.generation === 6 ? 0 : 1;
  const partyOffset = PARTY_OFFSETS[generationIndex];
  const zeroes = encryptedZeroes();
  const completeStream = new Uint8Array(KEYBV_PARTY_SIZE * KEYBV_PARTY_COUNT);
  completeStream.set(
    video1.subarray(partyOffset, partyOffset + completeStream.length),
  );
  const xorStream = new Uint8Array(completeStream.length);
  for (let index = 0; index < xorStream.length; index++)
    xorStream[index] =
      video1[partyOffset + index] ^ video2[partyOffset + index];

  const firstEncrypted = xorStream.slice(
    KEYBV_PARTY_SIZE,
    KEYBV_PARTY_SIZE * 2,
  );
  xorInPlace(firstEncrypted, zeroes);
  xorInPlace(completeStream.subarray(0, KEYBV_PARTY_SIZE), firstEncrypted);
  for (let index = KEYBV_PARTY_SIZE; index < completeStream.length; index++)
    completeStream[index] ^= zeroes[index % KEYBV_PARTY_SIZE];

  const pokemon: KeyBvPokemon[] = [];
  for (let slot = 0; slot < KEYBV_PARTY_COUNT; slot++) {
    const result = parsePokemon(
      video2,
      completeStream,
      partyOffset,
      slot,
      zeroes,
    );
    if (!result) break;
    pokemon.push(result);
  }
  if (pokemon.length === 0)
    throw new KeyBvError("dump-failed", "No valid Pokemon were recovered.");
  return {
    generation: validation.generation,
    videoSize: validation.size,
    pokemon,
  };
}

export function keyBvSpeciesName(
  language: Gen7StationaryLanguage,
  species: number,
) {
  return GEN7_STATIONARY_SPECIES[language][species] ?? `#${species}`;
}

export function formatKeyBvTsv(tsv: number) {
  return String(tsv).padStart(4, "0");
}

export function formatKeyBvTrv(trv: number) {
  return trv.toString(16).toUpperCase();
}
