import {
  getGen4Abilities,
  getGen4AbilityName,
  getGen4Species,
} from "../gen4ivcalculator/gen4IvData";

const encodedDiamondGenderRatios =
  "Hx8fHx8fHx8ff39/f39/f39/f39/f39/f39/f/7+/gAAAL+/v7+/v39/f39/f39/f39/f39/f39/Pz9/f38/Pz8/Pz9/f39/f39/f39/f3///39/f39/f39/f39/f39/f39///9/f39/AAB/f39/f/5//n9/f3///39//j8/fwB/f3//Hx8fH/8fHx8fHx////9/f3///x8fHx8fHx8fH39/f39/f39/f39/f7+/Hx9/f39/f39/f39/f39/f39/f39/Hx9/f3//f39/f39/f7+/f39/f39/f39/f3+/f39/f39/f39/f/9/fwAA/j8//v7///9/f3////8fHx8fHx8fHx9/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39//39/fz8/v3+/v39/f39/f39/f39/AP5/f39/f39/f39/f39/f39/f39/f39///9/f39///8fHx8ff39/f39/f39/f39/f39/f39/f38fv39/f/////////4A//////8fHx8fHx8fHx9/f39/f39/f39/f38fHx8ff/4AH/5/f39/f39/f39/f39/f7+/f39///9/f/5/f39/fx8fH39/f39/f39/f39/f3//f39/Pz8ffx8ff3//AH9//v///////3////7//////w==";

let genderRatios: Uint8Array | undefined;

function ratios() {
  return (genderRatios ??= Uint8Array.from(
    atob(encodedDiamondGenderRatios),
    (character) => character.charCodeAt(0),
  ));
}

export function getGen4ChainedSidSpecies(language: string) {
  return getGen4Species(language).filter((entry) => entry.id <= 492);
}

export function getGen4ChainedSidGenderRatio(species: number) {
  if (!Number.isInteger(species) || species < 1 || species > 492)
    throw new RangeError("Chained SID species must be between 1 and 492.");
  return ratios()[species - 1];
}

export function getGen4ChainedSidAbilities(language: string, species: number) {
  const [first, second] = getGen4Abilities("diamond", species);
  const ids = first === second ? [first] : [first, second];
  return ids.map((id) => ({ id, name: getGen4AbilityName(language, id) }));
}

export function getGen4ChainedSidAbilityIds(species: number) {
  return getGen4Abilities("diamond", species);
}

export function getGen4ChainedSidGenders(ratio: number) {
  if (ratio === 255) return [2];
  if (ratio === 254) return [1];
  if (ratio === 0) return [0];
  return [0, 1];
}
