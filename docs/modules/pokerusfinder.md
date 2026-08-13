# Pokerus Finder

`pokerusfinder` ports the frame search behavior of DevonStudios' Pokerus Finder (revision `262262fdb259c44a6a366b5c0dbf1bb319e39ff4`, downloaded 2026-08-13). The upstream project is GPL-3.0 and credits `zep715` for assembly research. This module keeps the upstream product name and English source labels because the upstream project does not provide a Simplified Chinese control translation.

## Supported modes

- `Gen III`: Ruby, Sapphire, Emerald, FireRed and LeafGreen. Search up to `9,999,999` frames.
- `Gen IV DP`: Diamond and Pearl. Search up to `99,999` frames with the same seed/frame/delay input shape.
- `Gen IV PtHGSS`: Platinum, HeartGold and SoulSilver. Search the upstream date/time and delay window, then inspect up to 100 frames.

## Verified inputs

| Control                  | Radix and range                | Width/default                           | Empty behavior                      | Upstream source                                  |
| ------------------------ | ------------------------------ | --------------------------------------- | ----------------------------------- | ------------------------------------------------ |
| `Initial Seed` (Gen III) | hexadecimal `0..0xFFFF`        | 4 mask characters                       | rejected by the upstream form       | `PokerusFinder.Designer.cs`, `_MaskedTextBox.cs` |
| `Initial Seed` (DP)      | hexadecimal `0..0xFFFFFFFF`    | 8 mask characters                       | rejected by the upstream form       | `PokerusFinder.Designer.cs`, `_MaskedTextBox.cs` |
| `Frame` (Gen III)        | decimal `0..9,999,999`         | 7 mask characters, default `1`          | rejected                            | `PokerusFinder.Designer.cs`, `PokerusFinder.cs`  |
| `Frame` (DP)             | fixed decimal `1`              | disabled upstream control, default `1`  | fixed at `1`                        | `PokerusFinder.Designer.cs`                      |
| `Delay` (Gen III / DP)   | decimal `0..999`               | 3 mask characters, default `300`        | rejected                            | `PokerusFinder.Designer.cs`, `PokerusFinder.cs`  |
| `Date` (PtHGSS)          | date `2000-01-01..2099-12-31`  | system short date, default current date | date picker always supplies a value | `PokerusFinder.Designer.cs`                      |
| `Hour` (PtHGSS)          | decimal `00..23`               | 2 digits, default `00`                  | rejected                            | `PokerusFinder.Designer.cs`, `PokerusFinder.cs`  |
| `Minute` (PtHGSS)        | decimal `00..59`               | 2 digits, default `00`                  | rejected                            | `PokerusFinder.Designer.cs`, `PokerusFinder.cs`  |
| `Delay` (PtHGSS)         | internal search `-1400..-1000` | output is `delay + 2001`                | not user-entered in this mode       | `PokerusFinder.cs`                               |

The core advances the 32-bit LCG `0x41c64e6d * seed + 0x6073`. A Pokérus frame is reported when the next high 16 bits are exactly `0x4000`, `0x8000`, or `0xC000`. Gen III and DP start from the user seed and report the upstream C# `long` comparison `i - delay >= frame`, so frames before Delay do not match; DP uses a 99,999-frame cap and a fixed Frame value of `1`. Pt/HGSS reconstructs the initial seed from date, time, second and delay, then applies the same predicate for frames `24..100`.

## UI and Worker boundary

The React panel reproduces the upstream three-tab interaction and result columns (`Frame`, `Seed`, `Delay`, `Second`). The LCG loops and Pt/HGSS date reconstruction run only in a dedicated Worker backed by `wasm/modules/pokerusfinder`; TypeScript performs input normalization and result decoding.

## License and attribution

The upstream source is distributed under GPL-3.0. The bridge keeps the upstream attribution and marks PokeRNGKit modifications. The source snapshot and SHA-256 record are maintained in `third_party/pokerusfinder/UPSTREAM.md`; the application legal footer links the GPL text and source record.
