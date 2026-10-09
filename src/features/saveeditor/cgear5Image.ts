import {
  CGEAR5_WIDTH,
  CGEAR5_HEIGHT,
  CGEAR5_PIXEL_BYTES,
  cgear5Bytes,
} from "./cgear5";

export function cgear5PngDimensions(bytes: Uint8Array): void {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (
    bytes.length < 33 ||
    signature.some((v, i) => bytes[i] !== v) ||
    String.fromCharCode(...bytes.subarray(12, 16)) !== "IHDR"
  )
    throw Error("Invalid CGear5 PNG.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(8) !== 13 ||
    view.getUint32(16) !== CGEAR5_WIDTH ||
    view.getUint32(20) !== CGEAR5_HEIGHT
  )
    throw Error("Invalid CGear5 PNG dimensions.");
}
export async function decodeCGear5Png(file: File): Promise<Uint8Array> {
  // Header dimensions are checked before allocating a decoded bitmap; compressed data has a local transport cap.
  if (file.size > 4 * 1024 * 1024) throw Error("Invalid CGear5 PNG size.");
  cgear5PngDimensions(new Uint8Array(await file.slice(0, 33).arrayBuffer()));
  const image = await createImageBitmap(file, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
  try {
    if (image.width !== CGEAR5_WIDTH || image.height !== CGEAR5_HEIGHT)
      throw Error("Invalid CGear5 PNG dimensions.");
    const canvas = document.createElement("canvas");
    canvas.width = CGEAR5_WIDTH;
    canvas.height = CGEAR5_HEIGHT;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw Error("Invalid CGear5 canvas.");
    ctx.drawImage(image, 0, 0);
    return new Uint8Array(
      ctx.getImageData(0, 0, CGEAR5_WIDTH, CGEAR5_HEIGHT).data,
    );
  } finally {
    image.close();
  }
}
export function drawCGear5(canvas: HTMLCanvasElement, pixels: string): void {
  const bytes = cgear5Bytes(pixels, CGEAR5_PIXEL_BYTES);
  canvas.width = CGEAR5_WIDTH;
  canvas.height = CGEAR5_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Invalid CGear5 canvas.");
  ctx.putImageData(
    new ImageData(new Uint8ClampedArray(bytes), CGEAR5_WIDTH, CGEAR5_HEIGHT),
    0,
    0,
  );
}
export async function cgear5PngBlob(pixels: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  drawCGear5(canvas, pixels);
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(Error("Invalid CGear5 PNG export.")),
      "image/png",
    ),
  );
}
