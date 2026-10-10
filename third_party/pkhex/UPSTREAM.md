# PKHeX Core

- Source: https://github.com/kwsch/PKHeX
- Owner-provided archive: `PKHeX-master.zip`, read on 2026-09-22.
- Archive SHA-256: `e9b95e7680a0759b7be4649b67970f7bb36bee32cadec2bb13aaf52160de6473`.
- Declared version: `26.08.26` (`Directory.Build.props`); the archive has no Git metadata, so no commit revision is claimed.
- Authors/copyright: Kaphotics / Project Pokémon and PKHeX contributors.
- License: GPL-3.0-or-later, as declared by `PKHeX.Core.csproj`; original license in `LICENSE`.

`PKHeX.Core/` and `Directory.Build.props` are unmodified copies. Per-file SHA-256 values are recorded in
`source-manifest.json` and verified by the npm build/test entry point. The WinForms application is not included. PokeRNGKit's wrapper is in `wasm/pkhex/`; the React/Worker adapter is in
`src/features/saveeditor/`. Source remains distributed with the repository, alongside the build scripts.

The browser bundle uses Microsoft's .NET WebAssembly runtime under its respective MIT license and
third-party notices. `dotnet-notices/` preserves LICENSE.txt and ThirdPartyNotices.txt from Microsoft's
official .NET SDK 10.0.401 win-x64 archive; Vite includes these notices in the distribution's legal folder.
Do not remove runtime license files from the generated publish output.
PKHeX and PokeRNGKit are not affiliated with Nintendo, Game Freak, or The Pokémon Company.

The browser adapter supplies PKHeX's existing RuntimeCryptographyProvider hooks using
@noble/ciphers 2.4.0 (unpadded AES ECB/CBC) and @noble/hashes 2.4.0 (MD5).
These MIT-licensed npm dependencies are pinned in package-lock.json; Vite copies their licenses
into the distribution legal folder. This adaptation does not modify the upstream Core files.

## Drawing resources (2026-09-26)

`public/save-art/26.08.26/` contains unmodified PNGs from the same archive, selected using the upstream Resources.resx keys (normal Big Pokémon sprites and box wallpapers). Source paths and SHA-256 are in `art-manifest.json`; the frontend resource-key map is `src/features/saveeditor/art-manifest.json`.
`drawing/SpriteName.cs` is an unmodified source copy compiled into the adapter. `drawing/README.upstream.md` preserves the upstream credits. Wallpaper selection in the frontend is adapted from `PKHeX.Drawing.Misc/Util/WallpaperUtil.cs` under the upstream GPL terms. Pokémon artwork and characters remain the property of their respective rights holders; this project claims no ownership or endorsement. No shiny sprite collection is redistributed in this batch; shininess is shown as a status marker.

## Ribbon and mark resources (2026-09-27)

161 unmodified ribbon/mark PNGs from `PKHeX.Drawing.Misc/Resources/img/ribbons/` are now included in the same local artwork directory. Resource keys follow the upstream `Properties/Resources.resx`; source paths and SHA-256 values extend `art-manifest.json`. Selection follows `RibbonSpriteUtil.cs` and the generation-specific numeric threshold in `RibbonEditor.cs`, under the same upstream GPL terms and artwork attribution above.

## Item resources (2026-09-27)

606 unmodified classic item PNGs (303,893 bytes) from `PKHeX.Drawing.PokeSprite/Resources/img/Big Items/` are included locally. `scripts/import-pkhex-item-art.mjs` imports the `bitem_` file references from the same archive's `Properties/Resources.resx`, extending both artwork manifests with resource keys and SHA-256 values. The inventory adapter follows `SAV_Inventory.UpdateSprite` and `SpriteBuilder.GetItemSprite`, calling Core's `ItemConverter.GetItemDisplay` and `HeldItemLumpUtil` for generation conversion and TM/TR selection. All formats use the classic sprite collection; the optional artwork-style collection is not included. Empty slots have no image, and missing keys use the upstream unknown-item sprite. The same GPL terms and artwork attribution above apply.

2026-10-10：使用同一只读来源的 PKHeX.Drawing.Misc Resources.resx，导入 76 张未修改训练家 PNG（34762 bytes）。脚本为 scripts/import-pkhex-trainer-art.mjs；资源键、源路径与 SHA-256 使用既有两个 artwork manifest。Trainer6Names.cs 的窗口与城堡三语标签来自同版本 WinForms lang_zh-Hans／en／ja；缺少的头像枚举翻译沿用源窗口的实际名称。没有修改 Core、引入远程图片或运行时 CDN。
