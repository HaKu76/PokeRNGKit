import type { Gen3NgcSeedMode } from "./domain";

export type Gen3NgcPrecalcMode = Exclude<Gen3NgcSeedMode, "channel">;

export interface Gen3NgcPrecalcFile {
  file: File;
  mode: Gen3NgcPrecalcMode;
  counts: Uint32Array;
}

interface ReadOptions {
  signal?: AbortSignal;
  onProgress?(processed: number, total: number): void;
}

const checksumByMode: Record<Gen3NgcPrecalcMode, number> = {
  gales: 0xd75b,
  colo: 0x097b,
};

const partitionCountByMode: Record<Gen3NgcPrecalcMode, number> = {
  gales: 25,
  colo: 24,
};

const crcTable = new Uint16Array([
  0x0000, 0x1081, 0x2102, 0x3183, 0x4204, 0x5285, 0x6306, 0x7387, 0x8408,
  0x9489, 0xa50a, 0xb58b, 0xc60c, 0xd68d, 0xe70e, 0xf78f,
]);

function updateQtChecksum(crc: number, bytes: Uint8Array) {
  for (const byte of bytes) {
    crc = ((crc >>> 4) & 0x0fff) ^ crcTable[(crc ^ byte) & 0x0f];
    crc = ((crc >>> 4) & 0x0fff) ^ crcTable[(crc ^ (byte >>> 4)) & 0x0f];
  }
  return crc;
}

export function qtChecksumIso3309(bytes: Uint8Array) {
  return ~updateQtChecksum(0xffff, bytes) & 0xffff;
}

async function checksumFile(file: File, options: ReadOptions) {
  const reader = file.stream().getReader();
  let crc = 0xffff;
  let processed = 0;
  try {
    while (true) {
      if (options.signal?.aborted)
        throw new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      crc = updateQtChecksum(crc, value);
      processed += value.byteLength;
      options.onProgress?.(processed, file.size);
    }
  } finally {
    reader.releaseLock();
  }
  return ~crc & 0xffff;
}

function readCounts(buffer: ArrayBuffer, count: number) {
  const view = new DataView(buffer);
  return Uint32Array.from({ length: count }, (_, index) =>
    view.getUint32(index * 4, true),
  );
}

function readSeeds(buffer: ArrayBuffer, count: number) {
  const view = new DataView(buffer);
  return Uint32Array.from({ length: count }, (_, index) =>
    view.getUint32(index * 4, true),
  );
}

export async function inspectGen3NgcPrecalcFile(
  file: File,
  mode: Gen3NgcPrecalcMode,
  options: ReadOptions = {},
): Promise<Gen3NgcPrecalcFile> {
  const partitionCount = partitionCountByMode[mode];
  const headerBytes = partitionCount * 4;
  if (file.size < headerBytes) throw new RangeError("Invalid Precalc File");
  const counts = readCounts(
    await file.slice(0, headerBytes).arrayBuffer(),
    partitionCount,
  );
  const seedCount = counts.reduce((sum, count) => sum + count, 0);
  if (headerBytes + seedCount * 4 !== file.size)
    throw new RangeError("Invalid Precalc File");
  if ((await checksumFile(file, options)) !== checksumByMode[mode])
    throw new RangeError("Invalid Precalc File");
  return { file, mode, counts };
}

export async function* readGen3NgcPrecalcSeedChunks(
  source: Gen3NgcPrecalcFile,
  partitionIndex: number,
  chunkSeedCount = 200_000,
  options: ReadOptions = {},
) {
  if (!Number.isInteger(chunkSeedCount) || chunkSeedCount < 1)
    throw new RangeError("Invalid Precalc File");
  if (
    !Number.isInteger(partitionIndex) ||
    partitionIndex < 0 ||
    partitionIndex >= source.counts.length
  )
    throw new RangeError("Invalid Precalc File");
  const headerBytes = source.counts.length * 4;
  let seedOffset = 0;
  for (let index = 0; index < partitionIndex; index++)
    seedOffset += source.counts[index];
  const totalSeeds = source.counts[partitionIndex];
  const partitionStart = headerBytes + seedOffset * 4;
  let processedSeeds = 0;
  while (processedSeeds < totalSeeds) {
    if (options.signal?.aborted)
      throw new DOMException("Aborted", "AbortError");
    const count = Math.min(chunkSeedCount, totalSeeds - processedSeeds);
    const start = partitionStart + processedSeeds * 4;
    const buffer = await source.file
      .slice(start, start + count * 4)
      .arrayBuffer();
    if (buffer.byteLength !== count * 4)
      throw new RangeError("Invalid Precalc File");
    processedSeeds += count;
    options.onProgress?.(processedSeeds, totalSeeds);
    yield readSeeds(buffer, count);
  }
}
