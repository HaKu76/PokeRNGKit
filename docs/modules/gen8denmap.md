# Gen 8 Den Map

`gen8denmap` 是 PokeFinder 4.3.2 `Den Map` 的静态地图工具，显示 Sword / Shield 三个巢穴区域的点位。该模块不执行 RNG 计算，不需要 Wasm 或 Worker；地图点位直接复用 `gen8raids` 已核对的 276 条巢穴映射。

## 功能范围

- 区域：Wild Area、Isle of Armor、Crown Tundra。
- 巢穴：按上游索引选择点位，保留每个区域的连续编号和地点名称。
- 地图：显示上游地图资源，并以红色标记当前巢穴坐标。
- 本地化：区域控件使用 `PokeFinder_zh.ts` 的简体中文翻译；巢穴地点名称使用上游 `swsh_zh.txt`、`swsh_en.txt` 数据，日文沿用上游英文原文。
- 响应式：桌面采用控制区与地图区双栏，窄屏改为单栏；地图区域独立滚动，不改变原图比例。

## 上游来源

- 版本：PokeFinder 4.3.2，目录 `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master`。
- 界面流程：`Form/Gen8/Tools/DenMap.cpp`、`DenMap.hpp`、`DenMap.ui`。
- 坐标流程：`Core/Gen8/Encounters8.cpp`、`Encounters8.hpp` 的 `getDenCoordinates` 与 `getDenLocation`。
- 地点文本：`Core/Resources/i18n/en/swsh_en.txt`、`zh/swsh_zh.txt`、`ja/swsh_ja.txt`。
- 复用数据：`src/features/gen8raids/data.ts` 的 `GEN8_DEN_INFO`，不重复生成巢穴哈希和坐标表。

## 输入与边界

本模块只有两个枚举选择，不接受自由文本或数值输入：

| 控件     | 取值                                                                 | 上游依据                        |
| -------- | -------------------------------------------------------------------- | ------------------------------- |
| Location | `Wild Area`、`Isle of Armor`、`Crown Tundra`                         | `DenMap.ui`、`DenMap.cpp`       |
| Den      | Wild Area `0..99`、Isle of Armor `100..189`、Crown Tundra `190..275` | `DenMap.cpp`、`Encounters8.cpp` |

索引 `16` 的 Special 点位按上游行为保留在 Wild Area 列表中；它没有可用的普通/稀有巢穴表，但地图工具仍显示其点位。

## 地图资源

资源由上游 `Form/Images` 原样复制到 `src/features/gen8denmap/assets/`，代码不修改图片内容：

| 文件          |      原图尺寸 |      字节 | SHA-256                                                            |
| ------------- | ------------: | --------: | ------------------------------------------------------------------ |
| `map.png`     |  `458 x 1064` | `775,496` | `A41FE437F52FD30BEC751FE85C1C8BCA1CB26DA0D625CB97FA66A7FDFFD4CBBD` |
| `map_ioa.png` | `1183 x 1183` | `184,951` | `1309BCF7CA2AA68A1A31634E5701AF1315EE2FDE571B3DAE7A3A629A1706C9DE` |
| `map_ct.png`  | `1920 x 2060` | `372,518` | `C5AE00ACCBCFAAD1589825435088E2F7639D79D0898BBDF06645BC8D12311DD6` |

坐标使用上游原图像素坐标。Web 端通过原图宽高计算百分比位置，避免响应式缩放造成标记漂移；Crown Tundra 不复制 Qt 的四分之一缩放，而是保持地图比例并让地图区域滚动。

## 工程文件

- `src/features/gen8denmap/domain.ts`：区域边界、地图尺寸、地点本地化和巢穴选择。
- `src/features/gen8denmap/Gen8DenMapPanel.tsx`：区域/巢穴控件、坐标详情和地图标记。
- `src/features/gen8denmap/Gen8DenMapPanel.css`：桌面双栏、移动端单栏和独立地图滚动区。
- `src/features/gen8denmap/domain.test.ts`：区域边界、资源尺寸、Special 索引、地点翻译和错误边界测试。

## 版权与许可

地图资源、坐标语义和界面流程来自 PokeFinder。PokeFinder Copyright (C) 2017-2024 by Admiral_Fish, bumba, and EzPzStreamz，相关衍生代码遵循 GPL-3.0-or-later；完整来源、许可证和对应源码分发说明见 `third_party/pokefinder/UPSTREAM.md`、`legal/UPSTREAM.md` 与 `legal/LICENSE.txt`。PokeRNGKit 不表示获得 Pokémon、Pokémon HOME 或 Nintendo 的官方授权。

## 验证记录

- 已通过：`npm test -- src/features/gen8denmap`，覆盖 4 个域测试。
- 已通过：`npm run lint`，0 个错误；保留 6 条既有 TanStack Virtual 警告。
- 已通过：`npm run verify`，130 个测试文件、484 项测试和 Vite/PWA 生产构建完成。
- 已通过：`npm run format:check`、`git diff --check`。
- 未完成：外部 Chrome 在接管并刷新 `http://127.0.0.1:5173/` 时连续超时，未取得 DOM、图片加载、区域切换和响应式回归证据；Edge 未运行。
