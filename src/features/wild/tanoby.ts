import { getGen3SpeciesName } from "../shared/gen3Species";

export const GEN3_WILD_TANOBY_FORMS = {
  "Seven Island Tanoby Ruins Monean Chamber": [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 27,
  ],
  "Seven Island Tanoby Ruins Liptoo Chamber": [
    2, 2, 2, 3, 3, 3, 7, 7, 7, 20, 20, 14,
  ],
  "Seven Island Tanoby Ruins Weepth Chamber": [
    13, 13, 13, 13, 18, 18, 18, 18, 8, 8, 4, 4,
  ],
  "Seven Island Tanoby Ruins Dilford Chamber": [
    15, 15, 11, 11, 9, 9, 17, 17, 17, 16, 16, 16,
  ],
  "Seven Island Tanoby Ruins Scufib Chamber": [
    24, 24, 19, 19, 6, 6, 6, 5, 5, 5, 10, 10,
  ],
  "Seven Island Tanoby Ruins Rixy Chamber": [
    21, 21, 21, 22, 22, 22, 23, 23, 12, 12, 1, 1,
  ],
  "Seven Island Tanoby Ruins Viapois Chamber": [
    25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 26,
  ],
} as const;

const UNOWN_FORMS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ!?";

export function isGen3WildTanobyChamber(locationName: string) {
  return Object.prototype.hasOwnProperty.call(
    GEN3_WILD_TANOBY_FORMS,
    locationName,
  );
}

export function getGen3WildSlotForm(locationName: string, slotIndex: number) {
  const forms =
    GEN3_WILD_TANOBY_FORMS[locationName as keyof typeof GEN3_WILD_TANOBY_FORMS];
  return forms?.[slotIndex] ?? 0;
}

export function getGen3WildSpeciesName(
  language: string,
  species: number,
  form = 0,
) {
  const name = getGen3SpeciesName(language, species);
  if (species !== 201) return getGen3SpeciesName(language, species, form);
  return `${name} (${UNOWN_FORMS[form] ?? form})`;
}
