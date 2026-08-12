"""Generate static Encounter Lookup data matching PokeFinder 4.3.2.

PokeFinder and EncounterTableGenerator are distributed under GPL-3.0-or-later.
"""

import argparse
import json
import struct
from collections import defaultdict
from pathlib import Path


GAMES = (
    "ruby",
    "sapphire",
    "fire-red",
    "leaf-green",
    "emerald",
    "diamond",
    "pearl",
    "platinum",
    "heart-gold",
    "soul-silver",
    "black",
    "white",
    "black-2",
    "white-2",
    "brilliant-diamond",
    "shining-pearl",
)

LOCATION_GROUPS = {
    "ruby": "rs",
    "sapphire": "rs",
    "fire-red": "frlg",
    "leaf-green": "frlg",
    "emerald": "e",
    "diamond": "dppt",
    "pearl": "dppt",
    "platinum": "dppt",
    "heart-gold": "hgss",
    "soul-silver": "hgss",
    "black": "bw",
    "white": "bw",
    "black-2": "bw2",
    "white-2": "bw2",
    "brilliant-diamond": "bdsp",
    "shining-pearl": "bdsp",
}

MAX_SPECIES = {
    **{game: 386 for game in GAMES[:5]},
    **{game: 493 for game in GAMES[5:10]},
    **{game: 649 for game in GAMES[10:14]},
    **{game: 493 for game in GAMES[14:]},
}

GAME_NAME_INDEXES = {
    "ruby": 0,
    "sapphire": 1,
    "emerald": 2,
    "fire-red": 3,
    "leaf-green": 4,
    "diamond": 7,
    "pearl": 8,
    "platinum": 9,
    "heart-gold": 10,
    "soul-silver": 11,
    "black": 12,
    "white": 13,
    "black-2": 14,
    "white-2": 15,
    "brilliant-diamond": 26,
    "shining-pearl": 27,
}

GRASS = 0
SURFING = 1
OLD_ROD = 2
GOOD_ROD = 3
SUPER_ROD = 4
ROCK_SMASH = 5
HEADBUTT = 6
BUG_CONTEST = 7


def read_u16(data: bytes, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def static_slots(data: bytes, offset: int, count: int) -> list[tuple[int, int, int, int]]:
    result = []
    for index in range(count):
        specie = read_u16(data, offset + index * 4)
        level = data[offset + index * 4 + 2]
        result.append((specie & 0x7FF, level, level, specie >> 11))
    return result


def dynamic_slots(data: bytes, offset: int, count: int) -> list[tuple[int, int, int, int]]:
    result = []
    for index in range(count):
        specie = read_u16(data, offset + index * 4)
        maximum = data[offset + index * 4 + 2]
        minimum = data[offset + index * 4 + 3]
        result.append((specie & 0x7FF, minimum, maximum, specie >> 11))
    return result


def hgss_grass_slots(entry: bytes, time: int) -> list[tuple[int, int, int, int]]:
    result = []
    for index in range(12):
        specie = read_u16(entry, 8 + time * 24 + index * 2)
        level = entry[80 + index]
        result.append((specie, level, level, 0))
    return result


def replace(slots: list[tuple[int, int, int, int]], index: int, specie: int) -> None:
    _, minimum, maximum, _ = slots[index]
    slots[index] = (specie & 0x7FF, minimum, maximum, specie >> 11)


def add_area(
    rows: set[tuple[int, int, int, int, int]],
    location: int,
    encounter: int,
    slots: list[tuple[int, int, int, int]],
) -> None:
    species = {slot[0] for slot in slots if slot[0] != 0}
    for specie in species:
        matches = [slot for slot in slots if slot[0] == specie]
        minimum = min(slot[1] for slot in matches)
        maximum = max(slot[2] for slot in matches)
        rows.add((specie, location, encounter, minimum, maximum))


def collect_gen3(generated: Path, output: dict[str, set[tuple[int, int, int, int, int]]]) -> None:
    for game in GAMES[:5]:
        data = (generated / f"{game.replace('-', '')}.bin").read_bytes()
        rows = output[game]
        for offset in range(0, len(data), 134):
            entry = data[offset : offset + 134]
            location = entry[0]
            rates = entry[1:5]
            if rates[0]:
                add_area(rows, location, GRASS, static_slots(entry, 6, 12))
            if rates[1]:
                add_area(rows, location, SURFING, dynamic_slots(entry, 54, 5))
            if rates[2]:
                add_area(rows, location, ROCK_SMASH, dynamic_slots(entry, 74, 5))
            if rates[3]:
                fishing = dynamic_slots(entry, 94, 10)
                feebas = (game == "emerald" and location == 33) or (
                    game in ("ruby", "sapphire") and location == 73
                )
                for encounter, slots in (
                    (OLD_ROD, fishing[:2]),
                    (GOOD_ROD, fishing[2:5]),
                    (SUPER_ROD, fishing[5:]),
                ):
                    if feebas:
                        slots = slots + [(349, 20, 25, 0)]
                    add_area(rows, location, encounter, slots)


def collect_dppt(generated: Path, output: dict[str, set[tuple[int, int, int, int, int]]]) -> None:
    dual_offsets = (None, 74, 78, 82, 86, 90)
    for game in ("diamond", "pearl", "platinum"):
        data = (generated / f"{game}.bin").read_bytes()
        rows = output[game]
        for offset in range(0, len(data), 174):
            entry = data[offset : offset + 174]
            location = entry[0]
            rates = entry[1:6]
            if rates[0]:
                base = static_slots(entry, 6, 12)
                for time in range(3):
                    for swarm in (False, True):
                        for dual_offset in dual_offsets:
                            for radar in (False, True):
                                slots = base.copy()
                                if swarm:
                                    replace(slots, 0, read_u16(entry, 54))
                                    replace(slots, 1, read_u16(entry, 56))
                                if time:
                                    source = 58 if time == 1 else 62
                                    replace(slots, 2, read_u16(entry, source))
                                    replace(slots, 3, read_u16(entry, source + 2))
                                if radar:
                                    for index, slot_index in enumerate((4, 5, 10, 11)):
                                        replace(slots, slot_index, read_u16(entry, 66 + index * 2))
                                if dual_offset is not None:
                                    replace(slots, 8, read_u16(entry, dual_offset))
                                    replace(slots, 9, read_u16(entry, dual_offset + 2))
                                add_area(rows, location, GRASS, slots)
            for encounter, rate, slot_offset in (
                (SURFING, rates[1], 94),
                (OLD_ROD, rates[2], 114),
                (GOOD_ROD, rates[3], 134),
                (SUPER_ROD, rates[4], 154),
            ):
                if rate:
                    slots = dynamic_slots(entry, slot_offset, 5)
                    if encounter != SURFING and location == 22:
                        slots.append((349, 10, 20, 0))
                    add_area(rows, location, encounter, slots)


def safari_slots(entry: bytes, encounter: int, time: int) -> list[tuple[int, int, int, int]]:
    layouts = {
        GRASS: (2, 10, 280),
        SURFING: (282, 3, 168),
        OLD_ROD: (450, 2, 152),
        GOOD_ROD: (602, 2, 152),
        SUPER_ROD: (754, 2, 152),
    }
    start, block_count, _ = layouts[encounter]
    if encounter != GRASS and not entry[1]:
        return []
    normal = static_slots(entry, start + time * 40, 10)
    block_start = start + 120 + time * block_count * 4
    blocks = static_slots(entry, block_start, block_count)
    quantity1 = start + 120 + block_count * 13
    quantity2 = start + 120 + block_count * 15
    block = 0
    result = []
    for slot in normal:
        selected = slot
        while block < block_count:
            # EncounterLookup leaves all five Safari block counts at zero.
            if entry[quantity1 + block] == 0 and entry[quantity2 + block] == 0:
                selected = blocks[block]
                block += 1
                break
            block += 1
        result.append(selected)
    return result


def collect_hgss(generated: Path, output: dict[str, set[tuple[int, int, int, int, int]]]) -> None:
    safari = (generated / "hgss_safari.bin").read_bytes()
    bug = (generated / "hgss_bug.bin").read_bytes()
    for game, filename, headbutt_name in (
        ("heart-gold", "heartgold.bin", "hg_headbutt.bin"),
        ("soul-silver", "soulsilver.bin", "ss_headbutt.bin"),
    ):
        rows = output[game]
        data = (generated / filename).read_bytes()
        for offset in range(0, len(data), 196):
            entry = data[offset : offset + 196]
            location = entry[0]
            rates = entry[1:7]
            for time in range(3):
                for swarm in (False, True):
                    for radio in range(3):
                        if rates[0]:
                            slots = hgss_grass_slots(entry, time)
                            if radio:
                                source = 92 if radio == 1 else 96
                                first = read_u16(entry, source)
                                second = read_u16(entry, source + 2)
                                for index in (2, 3):
                                    replace(slots, index, first)
                                for index in (4, 5):
                                    replace(slots, index, second)
                            if swarm:
                                for index in (0, 1):
                                    replace(slots, index, read_u16(entry, 188))
                            add_area(rows, location, GRASS, slots)
                        if rates[1]:
                            slots = dynamic_slots(entry, 100, 5)
                            if swarm:
                                replace(slots, 0, read_u16(entry, 190))
                            add_area(rows, location, SURFING, slots)
                        if rates[3]:
                            slots = dynamic_slots(entry, 128, 5)
                            if swarm:
                                replace(slots, 2, read_u16(entry, 194))
                            add_area(rows, location, OLD_ROD, slots)
                        if rates[4]:
                            slots = dynamic_slots(entry, 148, 5)
                            if time == 2:
                                replace(slots, 3, read_u16(entry, 192))
                            if swarm:
                                for index in (0, 2, 3):
                                    replace(slots, index, read_u16(entry, 194))
                            add_area(rows, location, GOOD_ROD, slots)
                        if rates[5]:
                            slots = dynamic_slots(entry, 168, 5)
                            if time == 2:
                                replace(slots, 1, read_u16(entry, 192))
                            if swarm:
                                for index in range(5):
                                    replace(slots, index, read_u16(entry, 194))
                            add_area(rows, location, SUPER_ROD, slots)

        for offset in range(0, len(safari), 906):
            entry = safari[offset : offset + 906]
            for time in range(3):
                for encounter in (GRASS, SURFING, OLD_ROD, GOOD_ROD, SUPER_ROD):
                    slots = safari_slots(entry, encounter, time)
                    if slots:
                        add_area(rows, entry[0], encounter, slots)

        # EncounterLookup creates a non-National-Dex profile, so only record zero is used.
        add_area(rows, bug[0], BUG_CONTEST, dynamic_slots(bug, 2, 10))

        headbutt = (generated / headbutt_name).read_bytes()
        for offset in range(0, len(headbutt), 74):
            entry = headbutt[offset : offset + 74]
            for tree in range(3):
                if tree < 2 or entry[1]:
                    add_area(rows, entry[0], HEADBUTT, dynamic_slots(entry, 2 + tree * 24, 6))

        for offset in range(0, len(data), 196):
            entry = data[offset : offset + 196]
            if entry[3]:
                add_area(rows, entry[0], ROCK_SMASH, dynamic_slots(entry, 120, 2))


def collect_gen5(generated: Path, output: dict[str, set[tuple[int, int, int, int, int]]]) -> None:
    files = {
        "black": "black.bin",
        "white": "white.bin",
        "black-2": "black2.bin",
        "white-2": "white2.bin",
    }
    layouts = (
        (GRASS, 0, 8, 12, True),
        (GRASS, 1, 56, 12, True),
        (GRASS, 2, 104, 12, True),
        (SUPER_ROD, 5, 192, 5, False),
        (SUPER_ROD, 6, 212, 5, False),
        (SURFING, 3, 152, 5, False),
        (SURFING, 4, 172, 5, False),
    )
    for game, filename in files.items():
        data = (generated / filename).read_bytes()
        rows = output[game]
        offset = 0
        while offset < len(data):
            location = data[offset]
            season_count = data[offset + 1]
            for season in range(4):
                selected = season if season < season_count else 0
                base = offset + 2 + selected * 232
                for encounter, rate_index, slot_offset, count, static in layouts:
                    if data[base + rate_index]:
                        reader = static_slots if static else dynamic_slots
                        add_area(rows, location, encounter, reader(data, base + slot_offset, count))
            offset += 2 + season_count * 232


def collect_bdsp(generated: Path, output: dict[str, set[tuple[int, int, int, int, int]]]) -> None:
    for game, filename in (
        ("brilliant-diamond", "bd.bin"),
        ("shining-pearl", "sp.bin"),
    ):
        data = (generated / filename).read_bytes()
        rows = output[game]
        for offset in range(0, len(data), 154):
            entry = data[offset : offset + 154]
            location = entry[0]
            rates = entry[1:6]
            if rates[0]:
                base = static_slots(entry, 6, 12)
                for time in range(3):
                    for swarm in (False, True):
                        for radar in (False, True):
                            slots = base.copy()
                            if swarm:
                                replace(slots, 0, read_u16(entry, 54))
                                replace(slots, 1, read_u16(entry, 56))
                            if time:
                                source = 58 if time == 1 else 62
                                replace(slots, 2, read_u16(entry, source))
                                replace(slots, 3, read_u16(entry, source + 2))
                            if radar:
                                for index, slot_index in enumerate((4, 5, 10, 11)):
                                    replace(slots, slot_index, read_u16(entry, 66 + index * 2))
                            add_area(rows, location, GRASS, slots)
            for encounter, rate, slot_offset in (
                (SURFING, rates[1], 74),
                (OLD_ROD, rates[2], 94),
                (GOOD_ROD, rates[3], 114),
                (SUPER_ROD, rates[4], 134),
            ):
                if rate:
                    add_area(rows, location, encounter, dynamic_slots(entry, slot_offset, 5))


def read_lines(path: Path, limit: int | None = None) -> list[str]:
    lines = path.read_text(encoding="utf-8-sig").splitlines()
    return lines[:limit] if limit else lines


def read_location_map(path: Path) -> dict[str, str]:
    result = {}
    for line in read_lines(path):
        if "," in line:
            key, value = line.split(",", 1)
            result[key] = value
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--generated", type=Path, required=True)
    parser.add_argument("--i18n", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    required_files = (
        "ruby.bin",
        "sapphire.bin",
        "firered.bin",
        "leafgreen.bin",
        "emerald.bin",
        "diamond.bin",
        "pearl.bin",
        "platinum.bin",
        "heartgold.bin",
        "soulsilver.bin",
        "hgss_safari.bin",
        "hgss_bug.bin",
        "hg_headbutt.bin",
        "ss_headbutt.bin",
        "black.bin",
        "white.bin",
        "black2.bin",
        "white2.bin",
        "bd.bin",
        "sp.bin",
    )
    missing = [name for name in required_files if not (args.generated / name).is_file()]
    if missing:
        parser.error(f"missing generated encounter files: {', '.join(missing)}")

    rows: dict[str, set[tuple[int, int, int, int, int]]] = defaultdict(set)
    collect_gen3(args.generated, rows)
    collect_dppt(args.generated, rows)
    collect_hgss(args.generated, rows)
    collect_gen5(args.generated, rows)
    collect_bdsp(args.generated, rows)

    species = {
        language: [""] + read_lines(args.i18n / language / f"species_{language}.txt", 649)
        for language in ("en", "ja", "zh")
    }
    game_names = {
        game: {
            language: read_lines(args.i18n / language / f"games_{language}.txt")[index]
            for language in ("en", "ja", "zh")
        }
        for game, index in GAME_NAME_INDEXES.items()
    }
    locations = {
        group: {
            language: read_location_map(args.i18n / language / f"{group}_{language}.txt")
            for language in ("en", "ja", "zh")
        }
        for group in sorted(set(LOCATION_GROUPS.values()))
    }
    data = {game: sorted(rows[game]) for game in GAMES}
    for game, game_rows in data.items():
        if not game_rows:
            parser.error(f"no encounter rows generated for {game}")
        for specie, _, _, minimum, maximum in game_rows:
            if specie < 1 or specie > MAX_SPECIES[game]:
                parser.error(f"invalid species {specie} generated for {game}")
            if minimum < 1 or minimum > maximum or maximum > 100:
                parser.error(
                    f"invalid level range {minimum}-{maximum} generated for {game}"
                )

    header = (
        "/*! Derived from PokeFinder 4.3.2, Copyright (C) 2017-2024 "
        "Admiral_Fish, bumba, and EzPzStreamz, and EncounterTableGenerator "
        "7769c1df80be93761fe6479d51cbf2fe7a7dc4f9. GPL-3.0-or-later. */\n"
    )
    content = header
    content += (
        'export type EncounterLookupLanguage = "en" | "ja" | "zh";\n'
        "export type EncounterLookupGame = "
        + " | ".join(json.dumps(game) for game in GAMES)
        + ";\n"
        "export type EncounterLookupDataRow = readonly [species: number, location: number, encounter: number, minLevel: number, maxLevel: number];\n"
    )
    content += "export const ENCOUNTER_LOOKUP_SPECIES: Record<EncounterLookupLanguage, readonly string[]> = " + json.dumps(
        species, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"
    content += "export const ENCOUNTER_LOOKUP_GAME_NAMES: Record<EncounterLookupGame, Record<EncounterLookupLanguage, string>> = " + json.dumps(
        game_names, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"
    content += "export const ENCOUNTER_LOOKUP_LOCATIONS: Record<string, Record<EncounterLookupLanguage, Readonly<Record<string, string>>>> = " + json.dumps(
        locations, ensure_ascii=False, separators=(",", ":")
    ) + ";\n"
    content += "export const ENCOUNTER_LOOKUP_DATA: Record<EncounterLookupGame, readonly EncounterLookupDataRow[]> = " + json.dumps(
        data, separators=(",", ":")
    ) + ";\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(content, encoding="utf-8")


if __name__ == "__main__":
    main()
