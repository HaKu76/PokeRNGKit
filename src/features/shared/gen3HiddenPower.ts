const hiddenPowerIvOrder = [0, 1, 2, 5, 3, 4] as const;

export function gen3HiddenPower(ivs: readonly number[]) {
  let typeBits = 0;
  let powerBits = 0;
  hiddenPowerIvOrder.forEach((ivIndex, bit) => {
    typeBits |= (ivs[ivIndex] & 1) << bit;
    powerBits |= ((ivs[ivIndex] >> 1) & 1) << bit;
  });
  return {
    type: Math.floor((typeBits * 15) / 63),
    power: 30 + Math.floor((powerBits * 40) / 63),
  };
}
