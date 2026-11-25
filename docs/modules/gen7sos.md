# Gen 7 SOS

## Scope

`gen7sos` implements the two Gen VII SOS workflows from 3DSRNGTool:

- Pokemon Generation: the Main Form SFMT64 stream plus the in-battle SFMT32 stream.
- Call Prediction: `SOSRNG.Generate()` and the SOS Path Finder workflow from `MiscRNGTool`.

The module is local-first. Production RNG runs only in the dedicated `gen7sos` Worker and its Wasm module. The UI preview engine is a layout fixture and is not algorithm evidence.

Upstream reference:

- `3DSRNGTool/Gen7/SOSRNG.cs`
- `3DSRNGTool/Gen7/Results/SOSResult.cs`
- `3DSRNGTool/Gen7/Gen7Encounter/SOSAllies.cs`
- `3DSRNGTool/Gen7/Wild7.cs`
- `3DSRNGTool/Subforms/MiscRNGTool.cs`
- `3DSRNGTool/Controls/Frame_Misc.cs`
- `3DSRNGTool/Data/SOSCall.md`

## Verified Inputs

The following limits match the upstream controls and Core parameter types. Empty numeric text is normalized to zero before validation.

| Input                        | Control             | Range / behavior                                                       |
| ---------------------------- | ------------------- | ---------------------------------------------------------------------- |
| Main Seed / SOS Seed         | hexadecimal text    | `0x00000000..0xFFFFFFFF`, eight hexadecimal digits                     |
| Version                      | select              | Sun, Moon, Ultra Sun, Ultra Moon                                       |
| Main Initial Frame           | decimal text        | SM starts at `418`; USUM starts at `478`; max `10,000,000`             |
| Calls Initial Frame          | decimal text        | `0..10,000,000`                                                        |
| Max Frame                    | decimal text        | at least Initial Frame, max `10,000,000`                               |
| TSV                          | decimal text        | `0..4095`, up to four digits, empty parses as `0`                      |
| TRV                          | hexadecimal text    | `0..F`, one digit                                                      |
| SOS Frame                    | decimal text        | `0..1,000,000`                                                         |
| Chain Length                 | decimal text        | `0..255`                                                               |
| NPC                          | decimal text        | `0..100`                                                               |
| Main Delay                   | decimal text        | `0..4000`, upstream two-frame increment; ABI stores `delay / 2 + 2`    |
| Calls Delay                  | decimal text        | `0..10000`                                                             |
| Level                        | decimal text        | `1..100`, minimum must not exceed maximum                              |
| Call Rate                    | select              | `0`, `3`, `6`, `9`, `15`                                               |
| HP Bar Color                 | select              | Green `1`, Yellow `3`, Red `5`                                         |
| Pokémon IV range             | decimal text        | Six ranges, each endpoint `0..31`, up to two digits, minimum ≤ maximum |
| Perfect IV threshold / count | decimal text        | `0..31` / `0..6`, up to two / one digits                               |
| Existing Perfect IVs         | six checkboxes      | bit mask for HP, Atk, Def, SpA, SpD, Spe                               |
| Weather                      | select / checkbox   | None, Rain, Hail, Sand; Calls uses the upstream boolean                |
| Filters                      | select / checkboxes | empty masks mean any; disabled filters preserve every result           |

The Pokémon Generation TSV uses `MainForm.Designer.cs` (`TSV.Maximum = 4095`). `MainForm.cs::getWildSetting()` reads that control into `Core/WildRNG.cs` (`int TSV`) before applying the SOS settings. Pokémon IV filters use `Subforms/IVRange.cs` and `Core/RNGFilters.cs`. The threshold and count follow `Perfect_IV_Value` and `PerfectIVs` in `MainForm.Designer.cs`.

`Rate 2` uses the upstream `.NET Math.Round` banker rounding. The source `MiscRNGTool` hides the `Super Effective` input and comments out its multiplier; this implementation exposes the recorded control and applies the `SOSCall.md` x2 multiplier. This source difference is intentionally documented here.

The frame, delay, level, chain length and NPC fields use the existing request bounds. The core inputs come from `MainForm.Designer.cs`, `MainForm.cs::getWildSetting()` and `Subforms/MiscRNGTool.Designer.cs`. The browser frame ceiling is 10,000,000. The TRV control follows `TRV.Mask = "A"` in `MainForm.Designer.cs`; the Core receives the resulting byte value.

## Encounter Data

`scripts/generate_gen7_sos_data.mjs` derives caller, ally, weather ally, form, gender, fixed-IV, Electric and Steel metadata from `SOSAllies.cs`, `Wild7.cs`, `PKMW7` and `PersonalInfo`. Form values are bounded by the source form count; no form is synthesized when the source has no form data.

## Wasm Contract

Module id is `gen7sos`, API version `1`, contract version `1`.

```text
gen7sos_begin(const uint32_t *request, uint32_t request_words)
gen7sos_step(uint32_t maximum_states)
gen7sos_result_ptr()
gen7sos_result_count()
gen7sos_step_processed()
gen7sos_total_processed()
gen7sos_total_results()
gen7sos_done()
gen7sos_limit_reached()
gen7sos_last_error()
```

The request contains 77 words. It encodes mode, version, seeds, frame range, TSV/TRV, lead, NPC and delay, SOS conditions, nine encounter slots, Pokemon filters and Call filters. Results use 14 words per record. A single continuous session is advanced by `step()`; no state is split across workers and no `SharedArrayBuffer` or pthreads are required.

The Worker validates the module envelope, API version, batch order, buffer size, monotonic counters and result filters. It uses one Dedicated Worker instance and terminates/recreates that instance on cancellation.

## Path Finder

The Calls result table supports row selection and `Find Path for index`. The implementation follows `MiscRNGTool.SOSPathFinder()` and evaluates the `Nothing`, `CallOnly` and `Both` variants. Since the upstream formula only reads the target frame, target minus two and the previous 25 frames, the browser recalculates a bounded target window (`target - 27..target`) instead of retaining an unbounded timeline.

## UI

Selecting a Sun, Moon, Ultra Sun or Ultra Moon 3DSRNGTool profile synchronizes GameVersion, TSV, TRV and Shiny Charm. The existing version effect updates the starting frame; unrelated renders do not replace later manual edits.

`Gen7SosPanel` uses a segmented Pokemon Generation / Call Prediction workspace, compact encounter and battle controls, filter disclosure, virtualized results, sorting, CSV export, cancellation, selected-call Path Finder output, and explicit empty/error/limit states. Controls occupy the full upper row and results occupy the full lower row at a bounded viewport-relative height; the long control surface scrolls inside its own panel.

Below `1120px`, the virtualized `.gen7sos-table` keeps a fixed `520px` height and does not flex with its contents. The surrounding results panel may grow in the single-column layout, but the TanStack Virtual scroll element must retain a bounded viewport for result sets up to 100,000 rows.

## Verification Status

The source and UI files are formatted and `git diff --check` is clean. Native, Wasm, TypeScript, browser and algorithm regression checks remain owner-authorized acceptance work and have not been run in this session.

On 2026-08-18, the Gen 8 Static freeze audit identified and fixed the same responsive auto-height risk in this module. External Chrome at `1120x900` confirmed a `620px` results panel and a `520px`, `flex: 0 0 auto`, `overflow: auto` virtualized table; the console had no warning or error.

## 2026-09-21 布局更新

本节替代此前固定表单高度与内部滚动的布局说明。设置区通过 `workspace-controls-grid`
按容器宽度排列分组，窄屏单列；结果保持下方独立区域，空状态收紧，生成数据后恢复滚动。
乱数信息卡按所在分组宽度重排，避免右侧字段裁切。输入范围、算法和 Worker 协议未改变。
本批四种视口复核与剩余交互检查见 [UI 检查记录](../ui-audit-2026-09-21.md)。

2026-09-21 UI 续查：手机参考控件或粘性操作区按共享规则调整，具体覆盖与未完成事项见 [UI 检查记录](../ui-audit-2026-09-21.md)。输入范围与算法未改动。

2026-09-21 表格续查：统一排序表头或可点击结果行尺寸，并同步虚拟位置；四种视口证据与文字修复见 [UI 检查记录](../ui-audit-2026-09-21.md)。输入与算法不变。
