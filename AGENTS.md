# PokeRNGKit Repository Instructions

## Product Scope

- PokeRNGKit is the confirmed English project name. Do not add a Chinese project name unless the owner makes a separate final decision.
- Implement Generation III only until the owner explicitly expands the scope.
- Keep the application fully static and local-first. Do not add a backend, account system, telemetry, runtime CDN, or cloud profile storage.
- Use npm for dependency installation and scripts. Do not introduce pnpm, Yarn, or Bun metadata.

## Upstream And Naming

- Treat `C:\Users\Hakuhiro\Desktop\PokeFinder-master` as a read-only PokeFinder 4.3.2 reference.
- Name product modules after their corresponding PokeFinder modules.
- For every control label, use the exact Simplified Chinese translation from `Form/i18n/PokeFinder_zh.ts` when it exists.
- If PokeFinder has no Simplified Chinese translation for a control, keep the exact English source label. Do not create an independent Chinese translation.
- Before implementing or changing a module, inspect its Qt input setup and Core parameter types. Match upstream radix, empty-value behavior, minimum, maximum, width, and cross-field range constraints in both HTML controls and domain validation.
- Record the verified input limits and their upstream source files in `docs/modules/<module>.md`. Do not infer limits from placeholders or old documentation.
- Preserve PokeFinder copyright notices, GPL-3.0-or-later headers, upstream attribution, source-distribution obligations, and trademark disclaimers.

## Architecture

- Use React and TypeScript for the product layer.
- Keep RNG algorithms in modular C++/Emscripten WebAssembly modules and run them only inside Web Workers.
- Use independent Worker instances for CPU parallelism. Do not require `SharedArrayBuffer`, Wasm pthreads, COOP/COEP, or cross-origin isolation.
- Store profiles in IndexedDB and maintain a localStorage mirror/fallback. Store lightweight settings such as language and theme in localStorage.
- Keep each feature under `src/features/<module>` and each Wasm target under `wasm/modules/<module>`.
- Add or update `docs/modules/<module>.md` whenever a functional RNG module changes.

## Workflow

- Before changing product code, read `docs/ai-development.md` and the current module document under `docs/modules/`.
- Preserve user changes. Do not stage, commit, push, deploy, or publish unless the owner explicitly requests it.
- Update `docs/progress.md` after a material feature, decision, blocker, dependency, build, or deployment change.
- Use `.agents/skills/hakuhiro-project-style/SKILL.md` for README, progress, build, release, and commit-message writing.
- Report automated verification separately from project-owner functional acceptance.
- Finish a module with one suggested GitHub Desktop commit title in the form `<type>: <Chinese action phrase>`.
