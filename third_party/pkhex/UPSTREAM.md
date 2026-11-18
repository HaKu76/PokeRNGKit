# PKHeX Core

- Source: https://github.com/kwsch/PKHeX
- Owner-provided archive: `PKHeX-master.zip`, read on 2026-09-22.
- Archive SHA-256: `e9b95e7680a0759b7be4649b67970f7bb36bee32cadec2bb13aaf52160de6473`.
- Declared version: `26.08.26` (`Directory.Build.props`); the archive has no Git metadata, so no commit revision is claimed.
- Authors/copyright: Kaphotics / Project Pokémon and PKHeX contributors.
- License: GPL-3.0-or-later, as declared by `PKHeX.Core.csproj`; original license in `LICENSE`.

`PKHeX.Core/` and `Directory.Build.props` are unmodified copies. Per-file SHA-256 values are recorded in
`source-manifest.json` and verified by `npm run saveinfo:build`. The WinForms application is not included. The read-only summary adapter is in `wasm/modules/saveinfo/` and `src/features/saveinfo/`. Source remains distributed with the repository, alongside the build scripts.

The browser bundle uses Microsoft's .NET WebAssembly runtime under its respective MIT license and
third-party notices. `dotnet-notices/` preserves LICENSE.txt and ThirdPartyNotices.txt from Microsoft's
official .NET SDK 10.0.401 win-x64 archive; Vite includes these notices in the distribution's legal folder.
Do not remove runtime license files from the generated publish output.
PKHeX and PokeRNGKit are not affiliated with Nintendo, Game Freak, or The Pokémon Company.

The browser adapter supplies PKHeX's existing RuntimeCryptographyProvider hooks using
@noble/ciphers 2.4.0 (unpadded AES ECB/CBC) and @noble/hashes 2.4.0 (MD5).
These MIT-licensed npm dependencies are pinned in package-lock.json; Vite copies their licenses
into the distribution legal folder. This adaptation does not modify the upstream Core files.
