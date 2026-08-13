import raw from "./encounters.json";
import type { Gen3GameVersion } from "../profiles/domain";
import { getGen3Personal } from "../shared/gen3Personal";
import type { GameCubeCategory, GameCubeTemplate } from "./domain";

interface RawTemplate {
  description: string;
  version: "Game::Gales" | "Game::Colosseum" | "Game::GC";
  specie: number;
  level: number;
  shiny?: "Shiny::Never" | "Shiny::Always" | "Shiny::Random";
  locks?: { nature: number; gender: number; genderRatio: number }[];
  type?:
    | "ShadowType::SingleLock"
    | "ShadowType::FirstShadow"
    | "ShadowType::Salamence"
    | "ShadowType::SecondShadow"
    | "ShadowType::EReader";
}

const rawData = raw as {
  nonShadow: RawTemplate[];
  shadow: RawTemplate[];
  channel: RawTemplate[];
};
const version = (value: RawTemplate["version"]): Gen3GameVersion =>
  value === "Game::Colosseum" ? "colosseum" : "xd";
const shiny = (value: RawTemplate["shiny"] | undefined) =>
  value === "Shiny::Always" ? 2 : value === "Shiny::Never" ? 1 : 0;
const shadowType = (value: RawTemplate["type"] | undefined) =>
  ({
    "ShadowType::SingleLock": 0,
    "ShadowType::FirstShadow": 1,
    "ShadowType::Salamence": 2,
    "ShadowType::SecondShadow": 3,
    "ShadowType::EReader": 4,
  })[value ?? "ShadowType::FirstShadow"] ?? 1;

function mapTemplate(
  entry: RawTemplate,
  category: GameCubeCategory,
  index: number,
): GameCubeTemplate {
  const personal = getGen3Personal(entry.specie);
  return {
    id: `${category}-${index}`,
    description: entry.description,
    version: version(entry.version),
    species: entry.specie,
    level: entry.level,
    shiny: shiny(entry.shiny),
    shadowType: category === "shadow" ? shadowType(entry.type) : 0,
    locks: (entry.locks ?? []).slice(0, 5),
    genderRatio: personal.genderRatio,
    abilitySlots: personal.abilities,
    personalStats: personal.stats,
  };
}

export const GAMECUBE_TEMPLATES: Record<GameCubeCategory, GameCubeTemplate[]> =
  {
    "non-shadow": rawData.nonShadow.map((entry, index) =>
      mapTemplate(entry, "non-shadow", index),
    ),
    channel: rawData.channel.map((entry, index) =>
      mapTemplate(entry, "channel", index),
    ),
    shadow: rawData.shadow.map((entry, index) =>
      mapTemplate(entry, "shadow", index),
    ),
  };

export function gameCubeTemplatesFor(
  category: GameCubeCategory,
  game: "xd" | "colosseum",
) {
  return GAMECUBE_TEMPLATES[category].filter(
    (template) => template.version === game || category === "channel",
  );
}
