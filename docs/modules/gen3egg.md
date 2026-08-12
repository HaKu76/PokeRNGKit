# Gen 3 Egg

> - 模块：`gen3egg`
> - 上游基线：PokeFinder 4.3.2 `EggGenerator3`
> - 状态：已通过本机 Web 工程检查、原生 Core 夹具与 Wasm 发布构建；未运行部署回归或项目所有者验收
> - 范围：第三世代 Egg Generator；不包含 Egg Searcher、第四世代或 Masuda 规则

## 1. 功能范围

`gen3egg` 对应 PokeFinder 的 `Eggs3`。界面按 Emerald 与 RS/FRLG 分开输入，生成孵化结果，不提供反向检索器。

- Emerald：`EBred`、`EBredSplit`、`EBredAlternate`，固定初始 RNG 状态为 `0`。
- Ruby、Sapphire、FireRed、LeafGreen：`RSFRLGBred`、`RSFRLGBredSplit`、`RSFRLGBredAlternate`、`RSFRLGBredMixed`，分别接收生成与领取的 16 位 Seed。
- 支持亲代 IV、性别、Emerald 不变之石与亲代性格、蛋种类、当前存档的 TID/SID、性格/觉醒力量多选、IV、异色、性别和特性槽位筛选。
- 结果支持进度、取消、固定顺序合并、排序、CSV、能力值和遗传来源显示。

存档版本仅允许 Ruby、Sapphire、FireRed、LeafGreen、Emerald。未选择或不兼容存档时使用应用的默认第三世代掌机存档，不能把 XD 或 Colosseum 的 TID/SID 代入本模块。

## 2. 算法原理

PokeFinder 的第三世代孵化分为“蛋生成”和“蛋领取”两段。

### 2.1 蛋生成

每个生成帧先以 `nextUShort() * 100 / 0xFFFF` 判断好感度。通过后：

- Emerald 以 `PokeRNG(0)` 产生 PID 低 16 位，使用由 `Calibration + 3 * Redraws` 回推的 16 位 RNG 产生 PID 高 16 位。
- Emerald 的不变之石成功时，最多尝试 16 次匹配亲代性格；第 17 次 VBlank 分支直接跳过，和 `EggGenerator3.cpp` 一致。
- RS/FRLG 从 Held Seed 得到 PID 低 16 位；Pickup Seed 在领取时补齐 PID 高 16 位。
- Nidoran 与 Illumise 根据 PID 的 `0x8000` 位使用相应异性物种的性别比例。

异色判断使用 `TID XOR SID XOR PID高16位 XOR PID低16位`：`0` 为 Square，`1..7` 为 Star，其余为非闪。

### 2.2 蛋领取与 IV 遗传

领取阶段按 Method 在两次 IV 读取之间插入不同推进数：

```text
Emerald Normal:      iv1 skip 0, iv2 skip 0, inheritance skip 1
Emerald Split:       iv1 skip 0, iv2 skip 1, inheritance skip 1
Emerald Alternate:   iv1 skip 0, iv2 skip 0, inheritance skip 2
RS/FRLG Normal:      iv1 skip 1, iv2 skip 0, inheritance skip 1
RS/FRLG Split:       iv1 skip 0, iv2 skip 1, inheritance skip 1
RS/FRLG Alternate:   iv1 skip 1, iv2 skip 0, inheritance skip 2
RS/FRLG Mixed:       iv1 skip 0, iv2 skip 0, inheritance skip 2
```

两次 16 位读取拆出 `HP / Atk / Def / SpA / SpD / Spe`。随后随机选择三个遗传位置和亲代；桥接层逐字保留 `EggGenerator3.cpp` 的 Emerald 与 RS/FRLG 重复遗传缺陷。`Show Inheritance` 显示 `A` 或 `B`，不改变计算结果。

觉醒属性和威力由六项 IV 的最低位与次低位计算，显示顺序与 PokeFinder 一致。

## 3. 输入限制

以下限制已对照 `Form/Gen3/Eggs3.cpp/.ui`、`Form/Controls/TextBox.cpp`、`Form/Controls/EggSettings.cpp/.ui` 和 Core 参数类型。空 Seed 由 `parseHex()` 解释为 `0`，与上游 `getUInt()` / `getUShort()` 的空值行为一致。

| 输入                  | 上游类型或默认值                                       | Web 行为                                                                                       |
| --------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| Held / Pickup Seed    | RS/FRLG `Seed16Bit`，`0..0xFFFF`，4 位十六进制，默认空 | 空值为 `0`；Emerald 不显示且 Core 固定 Seed `0`                                                |
| Initial Advances      | `Advance32Bit`，默认 `1000`                            | 十进制 `0..4294967295`                                                                         |
| Max Advances          | `Advance32Bit`，默认 `5000`，含起点                    | 十进制 `0..4294967295`；还受浏览器组合上限约束                                                 |
| Offset                | `Advance32Bit`，默认空                                 | 空值为 `0`；`Initial + Offset + Max` 不得超过 `0xFFFFFFFF`                                     |
| Calibration           | `u8`，Emerald 默认 `18`                                | 十进制 `0..255`                                                                                |
| Redraws               | `u8`，Emerald默认 `0..5`                               | 十进制 `0..255`，最小值不得大于最大值                                                          |
| Compatibility         | 下拉 `20 / 50 / 70`，默认 `70`                         | 仅允许这三个值                                                                                 |
| 蛋种类                | `EggSettings` 第三世代允许列表                         | 仅 `1..386` 内上游允许的可孵化种类                                                             |
| 亲代 IV               | `QSpinBox`                                             | 每项整数 `0..31`                                                                               |
| 亲代性别              | Male / Female / Genderless / Ditto                     | 仅允许上游的八种兼容组合                                                                       |
| 亲代道具 / 性格       | Emerald 显示                                           | 道具仅 None / Everstone；性格 `0..24`                                                          |
| TID / SID             | 当前档案 `u16`                                         | 整数 `0..65535`                                                                                |
| Nature / Hidden Power | `CheckList`                                            | Nature 使用 25 位掩码 `0x1FF_FFFF`，Hidden Power 使用 16 位掩码 `0xFFFF`；未选择或全选均按 Any |

浏览器的额外保护不改变上游字段含义：总状态数为 `(Held Max + 1) * (Pickup Max + 1) * Redraw count`，上限为 `150,060,006`，恰好容纳 PokeFinder Emerald 默认 `5000 / 5000 / 0..5`。每次 C ABI 调用还限制为 `100,000` 个 Held/Pickup/Redraw 组合；Worker 以 Held 范围切分后运行。

蛋种类选择使用 `AutoCompleteComboBox.tsx`，对应 PokeFinder `Form/Controls/EggSettings.cpp:75` 的 `enableAutoComplete()` 调用；其可编辑、包含匹配、弹出候选和 `NoInsert` 行为与遇敌查询及个体值计算器一致。

## 4. Wasm 与 Worker 边界

`wasm/modules/gen3egg` 是独立 CMake target 和 `module.json`，API 版本为 1。C ABI 使用 54 个 `uint32_t` 请求字，并返回 22 个 `uint32_t`、88 字节的连续记录：

```c
uint32_t gen3egg_api_version();
uint32_t gen3egg_generate(
  const uint32_t* request, uint32_t requestWords,
  uint32_t initialAdvancesHeld, uint32_t maxAdvancesHeld,
  uint32_t maxResults);
uintptr_t gen3egg_result_ptr();
uint32_t gen3egg_result_count();
uint32_t gen3egg_result_truncated();
uint32_t gen3egg_last_error();
```

结果布局：

```text
heldAdvances / pickupAdvances / redraws / pid /
ability / gender / nature / shiny /
hp / atk / def / spa / spd / spe /
inheritanceHP / inheritanceAtk / inheritanceDef /
inheritanceSpA / inheritanceSpD / inheritanceSpe /
hiddenPower / hiddenPowerStrength
```

`Gen3EggWorkerPool` 使用独立单线程 Worker/Wasm 实例，不使用 `SharedArrayBuffer` 或 Wasm pthread。消息带 `taskId` 和 `chunkIndex`；主线程按 `chunkIndex` 合并乱序返回的 transferable `ArrayBuffer`。取消、卸载和异常都会终止旧 Worker，迟到批次不会进入结果。Worker 在复制结果前验证 API 版本、结果上限、4 字节对齐和 Wasm 堆边界。

UI 预览引擎只产生确定性样例，用于本地界面验收，不实现也不验证生产 RNG。

## 5. 结果与翻译

Emerald 结果共 16 列，RS/FRLG 去掉 `Redraws` 后为 15 列，和 `EggModel3` 一致。PID 固定以 8 位大写十六进制显示；帧数使用原始十进制，不加入千位分隔符。

简体中文逐字复用 `PokeFinder_zh.ts`：`蛋生成帧`、`蛋领取帧`、`查看图鉴`、`校准值`、`好感度`、`蛋种类`、`父母A`、`父母B`、`不变之石`、`显示遗传来源`。日文上游对应词条未提供完成翻译时保留英文源标签。

## 6. 固定夹具与验收

原生夹具文件为 `wasm/modules/gen3egg/tests/egg3_native_test.cpp`，来源是 PokeFinder `Test/Gen3/egg3.json`：

```text
Emerald / EBred / Bulbasaur
Held 0..9, Pickup 0..9, Calibration 18, Redraw 0, Compatibility 70
50 条；首条 Advances 4294967278、PID 4030878322、IV 31/31/0/31/26/30

Ruby / RSFRLGBredSplit / Bulbasaur
Held/Pickup Seed 0000，Held/Pickup 0..9，Compatibility 70
60 条；首条 Advances 0、PID 59775、IV 30/11/31/31/31/16
```

TypeScript 域测试位于 `src/features/egg/domain.test.ts`，覆盖分片、亲代兼容、Seed 边界、Method 归属和 22 字结果解码。Held 分片除 `20,000` 帧常规块大小外，还按单次 C ABI 的 `100,000` 个 Held/Pickup/Redraw 组合上限收窄；例如 Emerald Pickup `0..0`、Redraw `0..5` 时，每块最多 `16,666` 个 Held 帧。

本地工程证据：已通过 `npm run verify`（Prettier、ESLint、`tsc -b`、15 个测试文件共 54 项测试、Vite/PWA 构建），并在 Visual Studio 2026 Build Tools x64 开发环境中通过 `npm run wasm:test:native` 的 6/6 原生 Core 夹具。Egg bridge 同时修复 lambda 捕获、数字常量兼容性和临时状态 ABI 字段初始化，原生夹具覆盖 Emerald `EBred` 与 Ruby `RSFRLGBredSplit` 固定输入。

已将官方 emsdk 安装到用户级目录并激活 Emscripten `6.0.6`；`npm run wasm:doctor` 与正式 `npm run build` 已通过，`gen3egg.mjs/.wasm` 与其余五个 Gen III Wasm 模块、Vite/PWA 生产站点均成功生成。本机系统 Node.js `24.13.0`、npm `11.6.2` 仍低于 CI 锁定的 Node.js `24.19.0`、npm `12.0.2`，因此上述结果仅是上传前工程证据，不构成算法验收。算法验收必须等 GitHub Actions 部署完成、项目所有者提供实际生产 URL 并明确授权后，才在该页面回归。

## 7. 上游依据

- `Core/Gen3/Generators/EggGenerator3.cpp/.hpp`
- `Core/Gen3/States/EggState3.hpp`
- `Core/Parents/Daycare.hpp`
- `Form/Gen3/Eggs3.cpp/.ui`
- `Form/Controls/EggSettings.cpp/.ui`
- `Form/Controls/TextBox.cpp`
- `Model/Gen3/EggModel3.cpp/.hpp`
- `Form/i18n/PokeFinder_zh.ts`、`Form/i18n/PokeFinder_ja.ts`
- `Test/Gen3/EggGenerator3Test.cpp`、`Test/Gen3/egg3.json`
- 完整 SHA-256 清单与修改边界：[PokeFinder 上游记录](../../third_party/pokefinder/UPSTREAM.md)
