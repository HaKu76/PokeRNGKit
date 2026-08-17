# PokeRNGKit Repository Instructions

## Product Scope

- PokeRNGKit is the confirmed English project name. Do not add a Chinese project name unless the owner makes a separate final decision.
- Implement every PokeFinder 4.3.2 product module. Generation III, Generation IV, and Generation V are complete; finish the remaining Generation VIII modules before moving to the 3DSRNGTool scope.
- Implement every 3DSRNGTool module in `docs/module-inventory.md` except `NTR Helper`. `NTR Helper` is explicitly excluded because raw NTR/TCP access is outside the static-browser architecture.
- Keep the application fully static and local-first. Do not add a backend, account system, telemetry, runtime CDN, or cloud profile storage.
- Use npm for dependency installation and scripts. Do not introduce pnpm, Yarn, or Bun metadata.

## Upstream And Naming

- Treat `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master` as a read-only PokeFinder 4.3.2 reference.
- Treat `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN` revision `359bdd7a9ff7c145fec12302cf43da932923fa62` as the read-only 3DSRNGTool reference.
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

## Frontend Composition

- On desktop, keep the primary form and actions within the available viewport whenever practical. The page shell should avoid vertical scrolling; prefer the results table as the main scroll region. Only allow page scrolling when the module's real control set cannot be reduced without hiding required behavior.
- Use tabs, segmented modes, compact field grids, and collapsible advanced settings to fit dense modules. Do not shrink text or touch targets below the established HakuStyle baseline to force a fit.
- Keep core Generator/Searcher workflows as independent module workspaces. Consolidate lightweight global tools, profile managers, lookup helpers, templates, and module-support utilities into the floating tool menu when this shortens navigation without obscuring ownership.

## Workflow

- Before changing product code, read `docs/ai-development.md` and the current module document under `docs/modules/`.
- Preserve user changes. Do not stage, commit, push, deploy, or publish unless the owner explicitly requests it.
- Update `docs/progress.md` after a material feature, decision, blocker, dependency, build, or deployment change.
- Use `.agents/skills/hakuhiro-project-style/SKILL.md` for README, progress, build, release, and commit-message writing.
- Use `.agents/skills/web-frontend-style/SKILL.md` for frontend layout, visual hierarchy, responsive behavior, interaction styling, accessibility, and motion decisions.
- Treat formatting as part of editing, not as a test or build. After every code or documentation edit batch, run `npm run format:files -- <files touched by the current task>`; when the worktree was clean at task start and all current changes belong to the task, `npm run format:changed` may be used instead. Then run `npm run format:check` and `git diff --check`. These cleanup steps do not require separate owner authorization.
- Never use `git diff --check` as a substitute for Prettier. Do not hand off or suggest a commit while task-owned files still fail `npm run format:check`.
- Do not run tests, builds, algorithm regressions, performance checks, browser checks, or acceptance work unless the owner explicitly authorizes the specific check or URL. This includes local UI preview and Wasm/Worker checks.
- For every authorized browser, Worker, console, deployed-site, or UI debugging task, use an external Google Chrome or Microsoft Edge browser connection. Do not use the in-app browser as a debugging fallback. If neither external browser is connected, report that condition and wait for the owner to connect one.
- Treat every automated result as engineering evidence only, never as project-owner acceptance. After an owner-authorized deployed UI check, report the result and complete UI acceptance together with the owner; do not declare it accepted independently.
- Algorithm-result acceptance has one required path: GitHub Actions must first finish the deployment, then the owner provides the exact deployed site URL and authorizes regression. Run the regression only against that production page. Local fixtures, native/Wasm builds, preview mode, and Actions status alone cannot accept algorithm results.
- Finish a module with one suggested GitHub Desktop commit title in the form `<type>: <Chinese action phrase>`.
