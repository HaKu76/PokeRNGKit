/*
 * Derived from PokeFinder 4.3.2 EggSettings.cpp and Gen4 personal data.
 * PokeFinder is licensed under GPL-3.0-or-later.
 */

import type { Gen4EggGame } from "./domain";

export const GEN4_EGG_SPECIES = [
  1, 4, 7, 10, 13, 16, 19, 21, 23, 27, 29, 32, 37, 41, 43, 46, 48, 50, 52, 54,
  56, 58, 60, 63, 66, 69, 72, 74, 77, 79, 81, 83, 84, 86, 88, 90, 92, 95, 96,
  98, 100, 102, 104, 108, 109, 111, 113, 114, 115, 116, 118, 120, 122, 123, 127,
  128, 129, 131, 133, 137, 138, 140, 142, 143, 147, 152, 155, 158, 161, 163,
  165, 167, 170, 172, 173, 174, 175, 177, 179, 183, 185, 187, 190, 191, 193,
  194, 198, 200, 202, 203, 204, 206, 207, 209, 211, 213, 214, 215, 216, 218,
  220, 222, 223, 225, 226, 227, 228, 231, 234, 235, 236, 238, 239, 240, 241,
  246, 252, 255, 258, 261, 263, 265, 270, 273, 276, 278, 280, 283, 285, 287,
  290, 292, 293, 296, 298, 299, 300, 302, 303, 304, 307, 309, 311, 312, 313,
  314, 315, 316, 318, 320, 322, 324, 325, 327, 328, 331, 333, 335, 336, 337,
  338, 339, 341, 343, 345, 347, 349, 351, 352, 353, 355, 357, 358, 359, 360,
  361, 363, 366, 369, 370, 371, 374, 387, 390, 393, 396, 399, 401, 403, 406,
  408, 410, 412, 415, 417, 418, 420, 422, 425, 427, 431, 433, 434, 436, 438,
  439, 440, 441, 442, 443, 446, 447, 449, 451, 453, 455, 456, 458, 459, 479,
  489,
] as const;

// Species records 0..493, one gender byte per record. D/P/Pt and HG/SS agree.
const encodedGenderRatios =
  "AB8fHx8fHx8fH39/f39/f39/f39/f39/f39/f3/+/v4AAAC/v7+/v79/f39/f39/f39/f39/f39/fz8/f39/Pz8/Pz8/f39/f39/f39/f39///9/f39/f39/f39/f39/f39/f///f39/fwAAf39/f3/+f/5/f39///9/f/4/P38Af39//x8fHx//Hx8fHx8f////f39///8fHx8fHx8fHx9/f39/f39/f39/f3+/vx8ff39/f39/f39/f39/f39/f39/fx8ff39//39/f39/f3+/v39/f39/f39/f39/v39/f39/f39/f3//f38AAP4/P/7+////f39/////Hx8fHx8fHx8ff39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f/9/f38/P79/v79/f39/f39/f39/fwD+f39/f39/f39/f39/f39/f39/f39/f///f39/f///Hx8fH39/f39/f39/f39/f39/f39/f39/H79/f3/////////+AP//////Hx8fHx8fHx8ff39/f39/f39/f39/Hx8fH3/+AB/+f39/f39/f39/f39/f3+/v39/f///f3/+f39/f38fHx9/f39/f39/f39/f39//39/fz8/H38fH39//wB/f/7///////9////+//////8=";

const encodedGenderRatiosByGame: Record<Gen4EggGame, string> = {
  dppt: encodedGenderRatios,
  hgss: encodedGenderRatios,
};
const decodedGenderRatios: Partial<Record<Gen4EggGame, Uint8Array>> = {};

function ratios(game: Gen4EggGame) {
  return (decodedGenderRatios[game] ??= Uint8Array.from(
    atob(encodedGenderRatiosByGame[game]),
    (character) => character.charCodeAt(0),
  ));
}

export function getGen4EggAlternateSpecies(species: number) {
  if (species === 29) return 32;
  if (species === 314) return 313;
  return undefined;
}

export function getGen4EggGenderRatio(game: Gen4EggGame, species: number) {
  if (!Number.isInteger(species) || species < 1 || species > 493)
    throw new RangeError("Gen4 egg species must be between 1 and 493.");
  return ratios(game)[species];
}

export function getGen4EggGenderRatios(game: Gen4EggGame, species: number) {
  const alternateSpecies = getGen4EggAlternateSpecies(species);
  return {
    genderRatio: getGen4EggGenderRatio(game, species),
    alternateGenderRatio: getGen4EggGenderRatio(
      game,
      alternateSpecies ?? species,
    ),
  };
}
