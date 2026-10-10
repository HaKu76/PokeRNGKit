// SPDX-License-Identifier: GPL-3.0-or-later
// Wallpaper selection follows PKHeX.Drawing.Misc/Util/WallpaperUtil.cs.
import manifest from "./art-manifest.json";
import type { PokemonEntry, SaveReport } from "./domain";

const assets: Readonly<Record<string, string>> = manifest;
const url = (key: string) =>
  `${import.meta.env.BASE_URL}save-art/26.08.26/${assets[key]}`;

export function itemImage(sprite: string) {
  if (!sprite) return undefined;
  return url(
    sprite.startsWith("bitem_") && assets[sprite] ? sprite : "bitem_unk",
  );
}

// PKHeX.Drawing.Misc PlayerSpriteUtil uses tr_00 when the stored resource is absent.
export function trainerImage(sprite: string) {
  return url(sprite.startsWith("tr_") && assets[sprite] ? sprite : "tr_00");
}

// PKHeX.Drawing.Misc RibbonSpriteUtil and RibbonEditor numeric sprite rules.
export function ribbonImage(
  key: string,
  max: number,
  value: number,
  generation: number,
) {
  let resource: string;
  if (max === 1) resource = key.replace("CountG3", "G3").toLowerCase();
  else if (max === 4) {
    resource = key.replace("Count", "").toLowerCase();
    resource +=
      value === 2
        ? "super"
        : value === 3
          ? "hyper"
          : value === 4
            ? "master"
            : "";
  } else {
    const threshold =
      key === "RibbonCountMemoryBattle" && generation >= 9 ? 7 : max;
    resource = key.toLowerCase() + (value >= threshold ? "2" : "");
  }
  return assets[resource] ? url(resource) : undefined;
}

export function speciesImage(species: number) {
  return url(assets[`b_${species}`] ? `b_${species}` : "b_unknown");
}

export function pokemonImage(
  pokemon: Pick<PokemonEntry, "species" | "sprite">,
) {
  const key = assets[pokemon.sprite]
    ? pokemon.sprite
    : assets[`b_${pokemon.species}`]
      ? `b_${pokemon.species}`
      : "b_unknown";
  return url(key);
}

export function boxWallpaper(report: SaveReport, box: number) {
  const entry = report.boxes.find((entry) => entry.index === box);
  const index = (entry?.wallpaper ?? -1) + 1;
  let key = "box_wp16xy";
  if (report.format === "SAV8LA") key = "box_wp01bdsp";
  else if (report.format === "SAV9ZA") key = "box_wp02bdsp";
  else if (index > 0) {
    const suffix =
      report.format === "SAV3E"
        ? "e"
        : report.format === "SAV3FRLG" && index > 12
          ? "frlg"
          : report.generation === 3
            ? "rs"
            : report.format === "SAV4Pt" && index > 16
              ? "pt"
              : report.format === "SAV4HGSS" && index > 16
                ? "hgss"
                : report.generation === 4
                  ? "dp"
                  : report.format === "SAV5B2W2" && index > 16
                    ? "b2w2"
                    : report.generation === 5
                      ? "bw"
                      : report.format === "SAV6AO" && index > 16
                        ? "ao"
                        : report.generation === 6 || report.generation === 7
                          ? "xy"
                          : report.format === "SAV8BS"
                            ? "bdsp"
                            : report.format === "SAV8SWSH"
                              ? "swsh"
                              : report.format === "SAV9SV"
                                ? "sv"
                                : "";
    const variant =
      report.format === "SAV9SV" && index === 20
        ? report.version === "SL"
          ? "_n"
          : "_u"
        : "";
    const candidate = `box_wp${String(index).padStart(2, "0")}${suffix}${variant}`;
    if (assets[candidate]) key = candidate;
  }
  return url(key);
}
