export function normalizeHexInput(value: string, maxDigits: number) {
  const withoutPrefix = value.replace(/^0x/i, "");
  const filtered = withoutPrefix.replace(/[^0-9a-f]/gi, "").toUpperCase();
  const limited = filtered.slice(0, maxDigits);
  return limited.replace(/^0+(?=.)/, "");
}

export function normalizeDecimalInput(
  value: string,
  maximum: number,
  maxDigits = String(maximum).length,
) {
  const filtered = value.replace(/\D/g, "").slice(0, maxDigits);
  if (filtered === "") return "";
  const normalized = filtered.replace(/^0+(?=.)/, "");
  return String(Math.min(Number(normalized), maximum));
}
