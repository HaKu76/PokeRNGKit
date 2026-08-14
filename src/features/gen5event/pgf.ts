import type { Gen5EventTemplate } from "./domain";

export const GEN5_EVENT_PGF_BYTES = 204;

export function parseGen5EventPgf(buffer: ArrayBuffer): Gen5EventTemplate {
  if (buffer.byteLength !== GEN5_EVENT_PGF_BYTES)
    throw new RangeError("Wondercard is not the correct size");
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const nature = bytes[0x34];
  const gender = bytes[0x35];
  const ability = bytes[0x36];
  const shiny = bytes[0x37];
  const ivOffsets = [0x43, 0x44, 0x45, 0x47, 0x48, 0x46] as const;
  const ivs = ivOffsets.map((offset) =>
    bytes[offset] === 255 ? null : bytes[offset],
  ) as Gen5EventTemplate["ivs"];
  const event: Gen5EventTemplate = {
    tid: view.getUint16(0x00, true),
    sid: view.getUint16(0x02, true),
    species: view.getUint16(0x1a, true),
    nature,
    gender: gender as Gen5EventTemplate["gender"],
    ability: ability as Gen5EventTemplate["ability"],
    shiny: shiny as Gen5EventTemplate["shiny"],
    level: bytes[0x5b],
    egg: bytes[0x5c] === 1,
    ivs,
  };
  if (
    event.species < 1 ||
    event.species > 649 ||
    (nature > 24 && nature !== 255) ||
    gender > 2 ||
    ability > 3 ||
    shiny > 2 ||
    event.level < 1 ||
    event.level > 100 ||
    ivs.some((value) => value !== null && value > 31)
  )
    throw new TypeError("Invalid format");
  return event;
}
