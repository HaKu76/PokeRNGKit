# Gen III Target Painting Timer

## Scope

`gen3painting` is the Emerald emulator-only helper from the
PokemonRNGGuides workflow. It intentionally does not implement the real
hardware Painting Reseeding flow, Battle Video creation, or calibration of a
physical console.

The helper accepts a four-digit hexadecimal Painting Seed and calculates the
emulator timer target:

```text
targetPaintingTimer = paintingSeed - calibration
```

The default calibration is decimal `30`, matching the upstream
`PaintingSeedToEmuTimer` tool. Values at or below the calibration value are
invalid because the timer would underflow.

## UI workflow

- Open `Target Painting Timer` from the global floating tool rail.
- Enter the four-digit hexadecimal Painting Seed.
- Keep `Calibration + Offset` at decimal `30` unless the emulator setup has a
  measured local calibration.
- Copy the resulting four-digit hexadecimal timer target.
- A valid Painting Seed can be sent back to the Gen III Static Generator as a
  four-digit initial Seed for verification.

The global `Tips` panel documents the complete Emerald 6V shiny stationary
workflow. The Static Searcher PID cell also has a visible button and a right
click menu to open the compatible Gen III ID Generator search.

## Upstream references

- `PokemonRNGGuides-main/src/rngToolsUi/gen3/paintingReseeding/paintingSeedToEmuTimer.tsx`
- `PokemonRNGGuides-main/src/rngToolsUi/gen3/paintingReseeding/seedToAdvances.tsx`

No RNG algorithm is added by this helper; it is a local arithmetic conversion
for the emulator timer input.
