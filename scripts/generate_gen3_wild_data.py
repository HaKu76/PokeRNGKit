"""Generate the browser-safe Gen III wild encounter dataset from PokeFinder sources."""

import argparse
import json
import re
from pathlib import Path


TYPE_MAP = (0, 1, 2, 3, 4, 5, 6, 7, 8, -1, 9, 10, 11, 12, 13, 14, 15, 16)
KIND_MAP = {
    "land_mons": "land",
    "water_mons": "surf",
    "rock_smash_mons": "rock-smash",
}


def label(map_name: str) -> str:
    value = map_name.removeprefix("MAP_").replace("_", " ")
    value = re.sub(r"ROUTE(\d+)", r"Route \1", value)
    value = re.sub(r"(\d+)(F|R)$", r"\1\2", value)
    return value.title().replace("Pokemon", "Pokémon").replace("Mt ", "Mt. ")


def slots(encounter: dict) -> list[list[int]]:
    return [[entry["species"], entry["min_level"], entry["max_level"]] for entry in encounter["mons"]]


def collect(path: Path, marker: str | None) -> list[dict]:
    tables = json.loads(path.read_text(encoding="utf-8"))
    if marker:
        tables = [entry for entry in tables if marker in entry["base_label"]]
    result = []
    for entry in tables:
        kinds = [
            {"kind": kind, "rate": value["encounter_rate"], "slots": slots(value)}
            for key, kind in KIND_MAP.items()
            if (value := entry.get(key))
        ]
        if fish := entry.get("fishing_mons"):
            fish_slots = slots(fish)
            for kind, start, end in (("old-rod", 0, 2), ("good-rod", 2, 5), ("super-rod", 5, 10)):
                kinds.append({"kind": kind, "rate": fish["encounter_rate"], "slots": fish_slots[start:end]})
        if kinds:
            result.append({"name": label(entry["map"]), "encounters": kinds})
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tables", type=Path, required=True)
    parser.add_argument("--species", type=Path, required=True)
    parser.add_argument("--personal", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    species = [""] + args.species.read_text(encoding="utf-8-sig").splitlines()[:386]
    raw = args.personal.read_bytes()
    personal = []
    for offset in range(0, len(raw), 0x1C):
        personal.append([raw[offset + 0x10], TYPE_MAP[raw[offset + 0x6]], TYPE_MAP[raw[offset + 0x7]]])

    games = {
        "ruby": collect(args.tables / "rs" / "wild_encounters.json", "Ruby"),
        "sapphire": collect(args.tables / "rs" / "wild_encounters.json", "Sapphire"),
        "emerald": collect(args.tables / "emerald" / "wild_encounters.json", None),
        "fire-red": collect(args.tables / "frlg" / "wild_encounters.json", "FireRed"),
        "leaf-green": collect(args.tables / "frlg" / "wild_encounters.json", "LeafGreen"),
    }
    header = "/* Generated from PokeFinder EncounterTableGenerator and Gen III personal data. GPL-3.0-or-later. */\n"
    data = "export const GEN3_SPECIES_ZH = " + json.dumps(species, ensure_ascii=False, separators=(",", ":")) + " as const;\n"
    data += "export const GEN3_PERSONAL = " + json.dumps(personal, separators=(",", ":")) + " as const;\n"
    data += "export const GEN3_ENCOUNTERS = " + json.dumps(games, ensure_ascii=False, separators=(",", ":")) + " as const;\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(header + data, encoding="utf-8")


if __name__ == "__main__":
    main()
