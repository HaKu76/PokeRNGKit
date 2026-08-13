"""Generate static Generation IV wild encounter data.

The encounter binary layout is the packed format produced by the pinned
EncounterTableGenerator reference. Personal data is embedded as base64 so
workers receive complete slots without a runtime fetch.
"""

from __future__ import annotations

import argparse
import base64
import json
import struct
from pathlib import Path


ENCOUNTERS = {
    "grass": 0,
    "surfing": 4,
    "rock-smash": 3,
    "old-rod": 6,
    "good-rod": 7,
    "super-rod": 8,
    "honey-tree": 11,
    "bug-catching-contest": 12,
    "headbutt": 13,
}


def u16(data: bytes, offset: int) -> int:
    return struct.unpack_from("<H", data, offset)[0]


def personal_gender(personal: bytes, species: int) -> int:
    if species <= 0:
        return 255
    record = species * 0x2C
    return personal[record + 0x10] if record + 0x10 < len(personal) else 255


def personal_info(personal: bytes, species: int):
    record = species * 0x2C
    if record + 0x1A >= len(personal):
        return {
            "stats": [1, 1, 1, 1, 1, 1],
            "types": [0, 0],
            "items": [0, 0, 0],
            "abilities": [0, 0, 0],
        }
    return {
        "stats": list(personal[record : record + 6]),
        "types": list(personal[record + 6 : record + 8]),
        "items": [
            u16(personal, record + 0x0C),
            u16(personal, record + 0x0E),
            0,
        ],
        "abilities": [personal[record + 0x16], personal[record + 0x17] or personal[record + 0x16], 0],
    }


def static_slots(data: bytes, offset: int, count: int, personal: bytes):
    return [
        {
            "species": u16(data, offset + index * 4) & 0x7FF,
            "form": u16(data, offset + index * 4) >> 11,
            "minLevel": data[offset + index * 4 + 2],
            "maxLevel": data[offset + index * 4 + 2],
            "genderRatio": personal_gender(personal, u16(data, offset + index * 4) & 0x7FF),
            **personal_info(personal, u16(data, offset + index * 4) & 0x7FF),
        }
        for index in range(count)
    ]


def dynamic_slots(data: bytes, offset: int, count: int, personal: bytes):
    return [
        {
            "species": u16(data, offset + index * 4) & 0x7FF,
            "form": u16(data, offset + index * 4) >> 11,
            "minLevel": data[offset + index * 4 + 3],
            "maxLevel": data[offset + index * 4 + 2],
            "genderRatio": personal_gender(personal, u16(data, offset + index * 4) & 0x7FF),
            **personal_info(personal, u16(data, offset + index * 4) & 0x7FF),
        }
        for index in range(count)
    ]


def area(game: str, location: int, encounter: str, rate: int, slots, name: str, variants=None, suffix=""):
    value = {
        "id": f"{game}-{location}-{encounter}{suffix}",
        "game": game,
        "location": location,
        "name": name,
        "encounter": encounter,
        "rate": rate,
        "slots": slots,
    }
    if variants:
        value["variants"] = variants
    return value


def species_pair(data: bytes, offset: int):
    return [u16(data, offset), u16(data, offset + 2)]


def replace_slot(slot, species: int, personal: bytes):
    return {
        **slot,
        "species": species,
        "form": 0,
        "genderRatio": personal_gender(personal, species),
        **personal_info(personal, species),
    }


def replacements(slots, indexes, species, personal: bytes):
    return [
        {"index": index, "species": specie}
        for index, specie in zip(indexes, species)
    ]


def hgss_grass_slots(data: bytes, offset: int, personal: bytes):
    result = []
    for index in range(12):
        species = u16(data, offset + index * 2)
        result.append({
            "species": species,
            "form": 0,
            "minLevel": data[80 + index],
            "maxLevel": data[80 + index],
            "genderRatio": personal_gender(personal, species),
            **personal_info(personal, species),
        })
    return result


def parse_dppt(generated: Path, game: str, names: dict[str, str], personal: bytes):
    result = []
    data = (generated / f"{game}.bin").read_bytes()
    for offset in range(0, len(data), 174):
        entry = data[offset : offset + 174]
        location = entry[0]
        name = names.get(str(location), f"Location {location}")
        rates = entry[1:6]
        if rates[0]:
            slots = static_slots(entry, 6, 12, personal)
            variants = {
                "swarm": replacements(slots, [0, 1], species_pair(entry, 54), personal),
                "day": replacements(slots, [2, 3], species_pair(entry, 58), personal),
                "night": replacements(slots, [2, 3], species_pair(entry, 62), personal),
                "radar": replacements(slots, [4, 5, 10, 11], [u16(entry, 66), u16(entry, 68), u16(entry, 70), u16(entry, 72)], personal),
                "dual": {
                    "ruby": replacements(slots, [8, 9], species_pair(entry, 74), personal),
                    "sapphire": replacements(slots, [8, 9], species_pair(entry, 78), personal),
                    "emerald": replacements(slots, [8, 9], species_pair(entry, 82), personal),
                    "firered": replacements(slots, [8, 9], species_pair(entry, 86), personal),
                    "leafgreen": replacements(slots, [8, 9], species_pair(entry, 90), personal),
                },
            }
            result.append(area(game, location, "grass", rates[0], slots, name, variants))
        for encounter, rate, slot_offset in (
            ("surfing", rates[1], 94),
            ("old-rod", rates[2], 114),
            ("good-rod", rates[3], 134),
            ("super-rod", rates[4], 154),
        ):
            if rate:
                slots = dynamic_slots(entry, slot_offset, 5, personal)
                variants = (
                    {"feebas": {"species": 349, "minLevel": 10, "maxLevel": 20}}
                    if location == 22
                    else None
                )
                result.append(area(game, location, encounter, rate, slots, name, variants))
    return result


def parse_hgss(generated: Path, game: str, names: dict[str, str], personal: bytes):
    result = []
    data = (generated / f"{game}.bin").read_bytes()
    for offset in range(0, len(data), 196):
        entry = data[offset : offset + 196]
        location = entry[0]
        name = names.get(str(location), f"Location {location}")
        rates = entry[1:7]
        if rates[0]:
            time_slots = [
                hgss_grass_slots(entry, 8, personal),
                hgss_grass_slots(entry, 32, personal),
                hgss_grass_slots(entry, 56, personal),
            ]
            slots = time_slots[0]
            variants = {
                "timeSlots": time_slots,
                "hoenn": replacements(slots, [2, 3, 4, 5], [u16(entry, 92), u16(entry, 92), u16(entry, 94), u16(entry, 94)], personal),
                "sinnoh": replacements(slots, [2, 3, 4, 5], [u16(entry, 96), u16(entry, 96), u16(entry, 98), u16(entry, 98)], personal),
                "swarm": replacements(slots, [0, 1], [u16(entry, 188), u16(entry, 188)], personal),
            }
            result.append(area(game, location, "grass", rates[0], slots, name, variants))
        for encounter, rate, slot_offset, count in (
            ("surfing", rates[1], 100, 5),
            ("rock-smash", rates[2], 120, 2),
            ("old-rod", rates[3], 128, 5),
            ("good-rod", rates[4], 148, 5),
            ("super-rod", rates[5], 168, 5),
        ):
            if rate:
                slots = dynamic_slots(entry, slot_offset, count, personal)
                variants = {}
                if encounter == "surfing":
                    variants["swarm"] = replacements(slots, [0], [u16(entry, 190)], personal)
                elif encounter == "old-rod":
                    variants["swarm"] = replacements(slots, [2], [u16(entry, 194)], personal)
                elif encounter == "good-rod":
                    variants["swarm"] = replacements(slots, [0, 2, 3], [u16(entry, 194)] * 3, personal)
                    variants["night"] = replacements(slots, [3], [u16(entry, 192)], personal)
                elif encounter == "super-rod":
                    variants["swarm"] = replacements(slots, list(range(5)), [u16(entry, 194)] * 5, personal)
                    variants["night"] = replacements(slots, [1], [u16(entry, 192)], personal)
                result.append(area(game, location, encounter, rate, slots, name, variants))
    return result


def parse_honey(generated: Path, game: str, names: dict[str, str], filename: str, personal: bytes):
    result = []
    data = (generated / filename).read_bytes()
    for offset in range(0, len(data), 74):
        entry = data[offset : offset + 74]
        location = entry[0]
        slots = dynamic_slots(entry, 2, 18, personal)
        result.append(area(game, location, "honey-tree", 100, slots, names.get(str(location), f"Location {location}"),
                           {"honeyTree": True}))
    return result


def parse_headbutt(generated: Path, game: str, names: dict[str, str], filename: str, personal: bytes):
    result = []
    data = (generated / filename).read_bytes()
    for offset in range(0, len(data), 74):
        entry = data[offset : offset + 74]
        location = entry[0]
        for tree, slot_offset in (("headbutt", 2), ("headbutt-alt", 26), ("headbutt-special", 50)):
            slots = dynamic_slots(entry, slot_offset, 6, personal)
            if any(slot["species"] for slot in slots):
                result.append(area(game, location, tree, 100, slots, names.get(str(location), f"Location {location}"),
                                   {"headbutt": True}))
    return result


def parse_bug(generated: Path, names: dict[str, str], personal: bytes):
    result = []
    data = (generated / "hgss_bug.bin").read_bytes()
    for record, offset in enumerate(range(0, len(data), 42)):
        entry = data[offset : offset + 42]
        location = entry[0]
        slots = dynamic_slots(entry, 2, 10, personal)
        variants = {"dexGroup": "pre" if record == 0 else "national"}
        suffix = f"-{record}"
        result.append(area("heartgold", location, "bug-catching-contest", 100, slots, names.get(str(location), f"Location {location}"), variants, suffix))
        result.append(area("soulsilver", location, "bug-catching-contest", 100, slots, names.get(str(location), f"Location {location}"), variants, suffix))
    return result


def parse_safari_sub(entry: bytes, offset: int, block_count: int):
    normal = [
        [[u16(entry, offset + time * 40 + index * 4), entry[offset + time * 40 + index * 4 + 2]] for index in range(10)]
        for time in range(3)
    ]
    block_offset = offset + 120
    block = [
        [[u16(entry, block_offset + time * block_count * 4 + index * 4), entry[block_offset + time * block_count * 4 + index * 4 + 2]] for index in range(block_count)]
        for time in range(3)
    ]
    requirements_offset = block_offset + 3 * block_count * 4
    requirements = [
        [entry[requirements_offset + index], entry[requirements_offset + block_count + index],
         entry[requirements_offset + block_count * 2 + index], entry[requirements_offset + block_count * 3 + index]]
        for index in range(block_count)
    ]
    return {"normal": normal, "block": block, "requirements": requirements}


def parse_safari(generated: Path, game: str, names: dict[str, str], personal: bytes):
    result = []
    data = (generated / "hgss_safari.bin").read_bytes()
    for offset in range(0, len(data), 906):
        entry = data[offset : offset + 906]
        location = entry[0]
        name = names.get(str(location), f"Location {location}")
        has_water = entry[1] != 0
        for encounter, sub_offset, block_count, rate in (
            ("grass", 2, 10, 0),
            ("surfing", 282, 3, 0),
            ("old-rod", 450, 2, 25),
            ("good-rod", 602, 2, 50),
            ("super-rod", 754, 2, 75),
        ):
            if encounter != "grass" and not has_water:
                continue
            safari = parse_safari_sub(entry, sub_offset, block_count)
            normal_slots = [
                replace_slot({"species": 0, "form": 0, "minLevel": level, "maxLevel": level,
                              "genderRatio": 255, "stats": [1] * 6, "types": [0, 0], "items": [0, 0, 0], "abilities": [0, 0, 0]},
                             species, personal)
                for species, level in safari["normal"][0]
            ]
            result.append(area(game, location, encounter, rate, normal_slots, name,
                               {"safari": safari}, "-safari"))
    return result


def read_names(path: Path):
    names = {}
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        if "," in line:
            key, value = line.split(",", 1)
            names[key] = value
    return names


def resource_file(root: Path, language: str, filename: str) -> Path:
    direct = root / filename
    if direct.exists():
        return direct
    return root / language / filename


def personal_blob(personal_root: Path):
    return {
        key: base64.b64encode((personal_root / filename).read_bytes()).decode("ascii")
        for key, filename in {
            "diamond": "personal_d.bin",
            "pearl": "personal_p.bin",
            "platinum": "personal_pt.bin",
            "heartgold": "personal_hgss.bin",
            "soulsilver": "personal_hgss.bin",
        }.items()
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--generated", type=Path, required=True)
    parser.add_argument("--resources", type=Path, required=True)
    parser.add_argument("--personal", type=Path, required=True)
    parser.add_argument("--i18n", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    areas = []
    personal_root = args.personal
    personal_by_game = {
        "diamond": (personal_root / "personal_d.bin").read_bytes(),
        "pearl": (personal_root / "personal_p.bin").read_bytes(),
        "platinum": (personal_root / "personal_pt.bin").read_bytes(),
        "heartgold": (personal_root / "personal_hgss.bin").read_bytes(),
        "soulsilver": (personal_root / "personal_hgss.bin").read_bytes(),
    }
    for game, honey_file in (
        ("diamond", "d_honey.bin"),
        ("pearl", "p_honey.bin"),
        ("platinum", "pt_honey.bin"),
    ):
        names = read_names(resource_file(args.resources, "en", "dppt_en.txt"))
        areas.extend(parse_dppt(args.generated, game, names, personal_by_game[game]))
        areas.extend(parse_honey(args.generated, game, names, honey_file, personal_by_game[game]))
    for game, headbutt_file in (("heartgold", "hg_headbutt.bin"), ("soulsilver", "ss_headbutt.bin")):
        names = read_names(resource_file(args.resources, "en", "hgss_en.txt"))
        areas.extend(parse_hgss(args.generated, game, names, personal_by_game[game]))
        areas.extend(parse_safari(args.generated, game, names, personal_by_game[game]))
        areas.extend(parse_headbutt(args.generated, game, names, headbutt_file, personal_by_game[game]))
    areas.extend(parse_bug(args.generated, read_names(resource_file(args.resources, "en", "hgss_en.txt")), personal_by_game["heartgold"]))

    names = {
        language: (args.i18n / language / f"species_{language}.txt").read_text(encoding="utf-8-sig").splitlines()
        for language in ("en", "ja", "zh")
    }
    items = {
        language: (args.i18n / language / f"items_{language}.txt").read_text(encoding="utf-8-sig").splitlines()
        for language in ("en", "ja", "zh")
    }
    location_names = {
        language: {
            "dppt": read_names(resource_file(args.i18n, language, f"dppt_{language}.txt")),
            "hgss": read_names(resource_file(args.i18n, language, f"hgss_{language}.txt")),
        }
        for language in ("en", "ja", "zh")
    }
    blobs = personal_blob(personal_root)
    output = "/*! Generated from PokeFinder 4.3.2 and EncounterTableGenerator. GPL-3.0-or-later. */\n"
    output += "export type Gen4WildGame = \"diamond\" | \"pearl\" | \"platinum\" | \"heartgold\" | \"soulsilver\";\n"
    output += "export interface Gen4WildSlot { readonly species: number; readonly form: number; readonly minLevel: number; readonly maxLevel: number; readonly genderRatio: number; readonly stats: readonly [number, number, number, number, number, number]; readonly types: readonly [number, number]; readonly items: readonly [number, number, number]; readonly abilities: readonly [number, number, number]; }\n"
    output += "export interface Gen4WildArea { readonly id: string; readonly game: Gen4WildGame; readonly location: number; readonly name: string; readonly encounter: string; readonly rate: number; readonly slots: readonly Gen4WildSlot[]; readonly variants?: Record<string, unknown>; }\n"
    output += f"export const GEN4_WILD_AREAS = {json.dumps(areas, ensure_ascii=False, separators=(',', ':'))} as const;\n"
    output += f"export const GEN4_WILD_SPECIES = {json.dumps(names, ensure_ascii=False, separators=(',', ':'))} as const;\n"
    output += f"export const GEN4_WILD_ITEMS = {json.dumps(items, ensure_ascii=False, separators=(',', ':'))} as const;\n"
    output += f"export const GEN4_WILD_LOCATION_NAMES = {json.dumps(location_names, ensure_ascii=False, separators=(',', ':'))} as const;\n"
    output += f"export const GEN4_WILD_PERSONAL_BASE64 = {json.dumps(blobs, separators=(',', ':'))} as const;\n"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")


if __name__ == "__main__":
    main()
