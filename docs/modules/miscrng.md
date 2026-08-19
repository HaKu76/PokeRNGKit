# Misc. RNG Tool

`miscrng` 是 3DSRNGTool 公共 `Misc. RNG Tool` 的静态本地轻量工作区，提供
捕获率与摇晃结果、Random N 比较以及 Gen VI/VII Pokerus 菌株解析。Gen VII
Stationary、Wild、SOS、Battle Tree、Festival Plaza 和 Main RNG 的连续帧搜索
保留在各自独立工作区，不在浮动工具中复制第二套搜索引擎。

## 范围

- 捕获率：复用 `Core/Capture.cs` 的 HP、Catch Rate、Status、Ball、Dex 和
  O-Power 公式，显示暴击、摇晃和总成功概率，并可用十六进制随机值重放一次投球。
- Random N：对一个 64 位随机值按上游无符号范围取模，支持 `<`、`>=`、`=` 比较。
- Pokerus：按 `Gen7/Pokerus7.cs` 检查 `0x4000`、`0x8000`、`0xC000` 触发值，
  消耗后续随机值直到低三位非零，并恢复菌株值。
- 工具在右下角悬浮菜单中打开；输入只在浏览器内计算，不连接 NTR/TCP、不上传或
  持久化文件。

## 输入限制

| 输入            | 范围/格式                     | 空值行为                   | 来源                                 |
| --------------- | ----------------------------- | -------------------------- | ------------------------------------ |
| Generation      | `6` 或 `7`                    | 默认 `7`                   | `MiscRNGTool.cs::Search6`、`Search7` |
| Current HP      | `0..1000` 且不超过 Maximum HP | 默认 `1`                   | `MiscRNGTool.Designer.cs::HPCurr`    |
| Maximum HP      | `1..1000`                     | 默认 `208`                 | `MiscRNGTool.Designer.cs::HPMax`     |
| Catch Rate      | `0..255`                      | 默认 `3`                   | `MiscRNGTool.Designer.cs::CatchRate` |
| Status/Ball/Dex | 上游固定倍率选项              | 默认无状态、`x1.0`、`>600` | `MiscRNGTool.cs::*BonusList`         |
| O-Power         | `1/1.5/2/2.5`                 | 默认 `1`                   | `MiscRNGTool.cs::OPowerList`         |
| Random value    | 1 至 16 位十六进制            | 空值按 `0`                 | `MiscRNGTool.cs::Range`、`Value`     |

### 捕获公式

`Capture.Calc()` 使用 12 位定点倍率：先计算 HP 因子和球倍率，再应用状态、
O-Power、图鉴捕获数，并按上游四舍五入得到 CriticalRate、ShakeRate。Gen VI
读取随机值高 8 位作为暴击字节，Gen VII 读取低 8 位；之后每次摇晃读取低 16
位并与 ShakeRate 比较。

### Pokerus 公式

第一次随机值低 16 位必须等于 `0x4000`、`0x8000` 或 `0xC000`。触发后消耗一个
随机值，再读取后续随机值低 8 位，直到 `(value & 7) != 0`；若高四位非零，
菌株为 `value & 7`，否则保留完整低 8 位。

## 来源与许可证

- 主要来源：`C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN`
- 核验 revision：`359bdd7a9ff7c145fec12302cf43da932923fa62`
- 算法文件：`3DSRNGTool/Core/Capture.cs`、`Gen7/Pokerus7.cs`、
  `Subforms/MiscRNGTool.cs`、`Subforms/MiscRNGTool.Designer.cs`
- 上游许可证：MIT；来源记录见 [`third_party/3dsrngtool/UPSTREAM.md`](../../third_party/3dsrngtool/UPSTREAM.md)。

## 验证

- `src/features/miscrng/domain.test.ts` 覆盖捕获率边界、Gen VI/VII 暴击字节、摇晃
  成功/失败、Random N 比较、Pokerus 触发/非触发和菌株掩码。
- `MiscRngPanel` 使用纯函数域层，不产生网络请求、Worker 或持久化副作用。
