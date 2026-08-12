export const SPINDA_CANVAS_WIDTH = 512;
export const SPINDA_CANVAS_HEIGHT = 512;
export const SPINDA_GRID_SIZE = 8;

export interface SpindaSpotPosition {
  x: number;
  y: number;
}

export type SpindaSpotPositions = [
  SpindaSpotPosition,
  SpindaSpotPosition,
  SpindaSpotPosition,
  SpindaSpotPosition,
];

// PokeFinder Form/Gen3/Tools/SpindaPainter.cpp.
const offsets: readonly SpindaSpotPosition[] = [
  { x: 0, y: 0 },
  { x: 24, y: 1 },
  { x: 6, y: 18 },
  { x: 18, y: 19 },
];
const origin = { x: 8, y: 6 };

export const SPINDA_SPOT_BOUNDS: readonly {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}[] = [
  { minX: 64, minY: 48, maxX: 184, maxY: 168 },
  { minX: 256, minY: 56, maxX: 376, maxY: 176 },
  { minX: 112, minY: 192, maxX: 232, maxY: 312 },
  { minX: 208, minY: 200, maxX: 328, maxY: 320 },
];

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeSpindaPid(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.trunc(value) >>> 0;
}

export function spindaSpotPositionsFromPid(pid: number): SpindaSpotPositions {
  const normalizedPid = normalizeSpindaPid(pid);
  return offsets.map((offset, index) => {
    const xNibble = (normalizedPid >>> (index * 8)) & 0xf;
    const yNibble = (normalizedPid >>> (index * 8 + 4)) & 0xf;
    return {
      x: (xNibble + offset.x + origin.x) * SPINDA_GRID_SIZE,
      y: (yNibble + offset.y + origin.y) * SPINDA_GRID_SIZE,
    };
  }) as SpindaSpotPositions;
}

export function clampSpindaSpotPosition(
  index: number,
  position: SpindaSpotPosition,
): SpindaSpotPosition {
  const bounds = SPINDA_SPOT_BOUNDS[index];
  if (!bounds) throw new RangeError("Spinda spot index must be between 0 and 3.");
  return {
    x: clamp(position.x, bounds.minX, bounds.maxX),
    y: clamp(position.y, bounds.minY, bounds.maxY),
  };
}

export function spindaPidFromSpotPositions(
  positions: readonly SpindaSpotPosition[],
) {
  if (positions.length !== 4) {
    throw new RangeError("Exactly four Spinda spot positions are required.");
  }
  return positions.reduce((pid, position, index) => {
    const clamped = clampSpindaSpotPosition(index, position);
    const x =
      Math.trunc(clamped.x / SPINDA_GRID_SIZE) - offsets[index].x - origin.x;
    const y =
      Math.trunc(clamped.y / SPINDA_GRID_SIZE) - offsets[index].y - origin.y;
    return pid | (x << (index * 8)) | (y << (index * 8 + 4));
  }, 0) >>> 0;
}
