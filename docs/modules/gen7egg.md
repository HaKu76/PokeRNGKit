# Gen 7 Egg

## Scope

`gen7egg` implements the Gen VII Egg RNG workspace from 3DSRNGTool. It provides the three upstream workflows:

- Frame Range: generate eggs from every TinyMT state in a closed frame range.
- Egg Number: follow consecutive accepted eggs and report how many eggs to accept and reject for a target frame.
- Shortest Path: calculate a minimum-action Accept / Reject path to a target frame.

Production RNG runs only in the dedicated `gen7egg` Worker and its Wasm module. The UI preview engine produces deterministic layout fixtures and is not algorithm evidence.

Upstream revision: `359bdd7a9ff7c145fec12302cf43da932923fa62`.

Primary upstream files:

- `3DSRNGTool/MainForm_Egg.cs`
- `3DSRNGTool/MainForm_Core.cs`, especially `Search7_Egg()`, `Search7_EggList()` and `Search7_EggShortestPath()`
- `3DSRNGTool/MainForm.Designer.cs`
- `3DSRNGTool/Core/EggRNG.cs`
- `3DSRNGTool/Gen7/Egg7.cs`
- `3DSRNGTool/Util/Gen7EggPath.cs`
- `3DSRNGTool/RNG/TinyMT.cs`
- `3DSRNGTool/Controls/StringItem.cs`
- `3DSRNGTool/Resources/text/lang_en.txt`
- `3DSRNGTool/Resources/text/lang_ja.txt`
- `3DSRNGTool/Resources/text/lang_zh.txt`
- `3DSRNGTool/Resources/text/text_Genderratio_*.txt`
- `3DSRNGTool/Resources/text/text_Items_*.txt`

## Verified Inputs

The following limits were verified from the upstream WinForms setup and Core parameter types. Numeric controls do not accept an empty value; browser text inputs normalize an empty value to their documented default before validation.

| Input                 | Upstream source                                                         | Range / behavior                                                                                                  |
| --------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| TinyMT status         | `HexMaskedTextBox` controls in `MainForm.Designer.cs`; `TinyMT(uint[])` | four unsigned 32-bit words, each shown as exactly eight hexadecimal digits                                        |
| TSV                   | `MainForm.Designer.cs::TSV.Maximum`                                     | decimal `0..4095`                                                                                                 |
| TRV                   | `MainForm.Designer.cs::TRV.Mask = "A"`                                  | one hexadecimal digit, `0..F`                                                                                     |
| Initial / Max Frame   | `MainForm.cs`, `FuncUtil.MAXFRAME`                                      | decimal `0..1,000,000,000`; Initial must not exceed Max                                                           |
| Target Frame          | `MainForm.cs`, `FuncUtil.MAXFRAME`                                      | decimal `0..1,000,000,000`                                                                                        |
| Shortest Path target  | browser execution boundary                                              | upstream accepts `0..1,000,000,000`; browser execution is capped at `5,000,000` to bound path memory              |
| Minimum / Maximum Egg | `MainForm.Designer.cs::Egg_min/Egg_max`                                 | decimal `1..10,000`; Minimum must not exceed Maximum                                                              |
| Parent IV             | `MainForm.Designer.cs::M_IV*/F_IV*`                                     | decimal `0..31`                                                                                                   |
| Parent ability        | `EggRNG.cs`, parent ability selectors                                   | normal ability 1, normal ability 2, or hidden ability                                                             |
| Parent item           | `text_Items_*.txt`, `Egg7.cs`                                           | None, Everstone, Destiny Knot, or one of the six Power items                                                      |
| Perfect IV value      | `MainForm.Designer.cs::Perfect_IV_Value`                                | decimal `0..31`                                                                                                   |
| Perfect IV count      | `MainForm.Designer.cs::PerfectIVs`                                      | decimal `0..6`                                                                                                    |
| IV filter             | shared `RNGFilters` controls                                            | six closed ranges, each `0..31`, minimum not above maximum                                                        |
| Result limit          | `MainForm.cs::MAX_RESULTS_NUM`                                          | `1..100,000`                                                                                                      |
| Other TSV list        | TSV List workflow                                                       | decimal values `0..4095`; invalid or out-of-range tokens are ignored and duplicates collapse into a 4096-bit mask |

The request validator also preserves the upstream cross-field behavior:

- Both parents cannot be Ditto.
- Genderless and male-only species force the female parent to Ditto; female-only species disable female Ditto.
- Nido Type is available only for the 1:1 gender ratio and disables homogeneity.
- Homogeneity is unavailable with either Ditto parent, Nido Type, or female-only species.
- Other TSV shiny checks require Shiny Charm or Masuda Method and force the shiny filter.
- Shiny Reminder is available only in Frame Range when PID rerolls are active.
- With an Everstone, the ordinary nature list is replaced by the upstream parent-nature inheritance filter; without an Everstone, that parent filter is unavailable.

## RNG Behavior

The C++ module ports TinyMT state transitions and the Gen VII `Egg7` generation order: gender, nature, inherited ability, Power item selection, Destiny Knot inheritance count, six IV rolls, EC, PID rerolls, ball parent, two trailing advances and Hidden Power. Shiny Charm adds two PID rerolls and Masuda Method adds six. Other TSV checking uses a complete 4096-bit mask.

Frame Range advances the initial TinyMT status by one state per displayed frame. Egg Number advances by each generated egg's `FramesUsed` value and keeps the upstream target summary. Shortest Path assigns equal weight to Accept and Reject, performs forward relaxation over Reject `+1` and Accept `+FramesUsed` edges, then reconstructs the upstream action path. The implementation computes this graph incrementally instead of retaining every full egg result.

## Wasm Contract

Module id is `gen7egg`, API version `1`, contract version `1`.

```text
gen7egg_begin(const Gen7EggPackedRequest *request)
gen7egg_step(uint32_t maximum_states)
gen7egg_result_ptr()
gen7egg_result_count()
gen7egg_step_processed()
gen7egg_total_processed()
gen7egg_total_results()
gen7egg_done()
gen7egg_limit_reached()
gen7egg_target_found()
gen7egg_summary_accepts()
gen7egg_summary_rejects()
gen7egg_last_error()
```

The request contains 187 `uint32_t` words. This includes the mode, four-word TinyMT state, range, target, identity values, both parents, breeding settings, the 128-word Other TSV mask and all filters. Each result contains 20 `uint32_t` words for Frame, Egg Number, current and after-egg TinyMT states, Random Number, EC, PID, IVs, metadata, Frames Used, inheritance masks, PSV and PRV.

One Dedicated Worker owns one continuous Wasm session. `step()` bounds each batch to at most 65,536 states; cancellation terminates and recreates the Worker. The module does not require `SharedArrayBuffer`, pthreads or cross-origin isolation.

## UI

`Gen7EggPanel` uses Frame Range / Egg Number / Shortest Path segmented modes, compact current-state and parent controls, filter disclosure, virtualized results, sorting, CSV export, cancellation, clear/reset actions and explicit progress, empty, error and result-limit states. Result rows can set either the row's TinyMT state or its post-egg state as the new current status while reducing the target frame with the upstream semantics.

Below `900px`, the virtualized `.gen7egg-table-shell` keeps a fixed `520px` height and does not flex with its contents. This preserves a bounded TanStack Virtual viewport while the surrounding single-column results panel uses automatic page height.

## Verification Status

The following local checks passed on 2026-08-15:

- Egg TypeScript tests: 3 files, 10 tests.
- TypeScript project build.
- ESLint with zero errors; six TanStack Virtual / React Compiler warnings remain non-blocking.
- Native `gen7egg` C++ session fixture: 1/1, including the fixed first frame, Egg Number `1 / 17` summary, Shortest Path `0..10 -> 50`, invalid parents and the browser path limit.
- Full Vitest suite: 103 files, 404 tests.
- Full Prettier check and `git diff --check`.

The production Web build transformed 2102 modules, then the restricted Windows environment returned `EPERM` while Vite copied the existing `public/wasm/gen3egg.mjs` into `dist/wasm`. A requested non-restricted rerun did not start because the approval service returned `502 Bad Gateway`. This is recorded as an environment limitation, not a successful build. The `gen7egg` Emscripten artifact, external-browser interaction and production-page algorithm regression remain unverified.

On 2026-08-18, the Gen 8 Static freeze audit identified and fixed the same responsive auto-height risk in this module. External Chrome at `900x900` confirmed a `520px`, `flex: 0 0 auto`, `overflow: auto` virtualized table; the console had no warning or error.
