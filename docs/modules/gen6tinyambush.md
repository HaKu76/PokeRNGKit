# Gen VI TinyFinder Ambush

## 范围

本模块落地 TinyFinder 的 `Ambush Encounter`，对应 XY Victory Road Outside（Map
327）。TinyFinder 的 XY 数据表只提供一份 12 槽表，X 与 Y 共用物种和等级数据；模块
仍按游戏版本保留 X/Y 地点选择，便于和其它 Gen VI 工具的档案语义一致。ORAS 没有
Ambush 表，因此不显示 ORAS 选项。

TinyFinder README 将同一组 Victory Road 槽位称为 `Swooping`：1–8 为 Fearow、9–10
为 Skarmory、11–12 为 Hydreigon，并建议在 3DSRNGTool 中使用 `+40` 延迟。源码中
没有独立的 Swooping 方法；`EnctrKey.Ambush`、`Wild.Ambush()` 和 Map 327
`AmbushTable` 是唯一实现。因此模块库存的 T10 Ambush 与 T12 Victory Road Swooping
由本模块共同覆盖，`+40` 是上游操作提示，不是 TinyMT Index 算法中的额外消耗。

## 上游来源

- `TinyFinder/Methods/Wild.cs`：`Wild.Ambush()`、`FindWildItem()`
- `TinyFinder/Classes/Index.cs`：`RandCall`、`Current`、TinyMT 推进语义
- `TinyFinder/Database/TableXY.cs`：Map 327 `AmbushTable` / `AmbushLevel`
- `TinyFinder/Database/LocationsXY.cs`：Victory Road Outside 的地图元数据

代码保留 TinyFinder 的 GPL-3.0-or-later 许可和上游归属；本仓库的 Wasm bridge 仅
负责把同一算法放入 Dedicated Worker 可调用的固定宽度 ABI。

## 输入限制

| 输入             | 类型/范围                                   | 上游依据                                    |
| ---------------- | ------------------------------------------- | ------------------------------------------- |
| TinyMT Seed      | 32 位无符号，`0..0xFFFFFFFF`，8 位十六进制  | `Index.cs` / `TinyMT` 初始化                |
| TinyMT State     | 4 个 32 位无符号字，`0..0xFFFFFFFF`         | `Index.cs` 的 `currentState`                |
| Min Index        | `0..250000`                                 | TinyFinder `Form1` 搜索范围与浏览器任务预算 |
| Max Index        | `Min Index..10000000`                       | TinyFinder `Form1` 搜索范围                 |
| Synchronize Only | 布尔                                        | `FindResults.cs` 的 `CheckCommon`           |
| Slot Mask        | 12 位十进制位掩码，`0..0xFFF`；`0` 表示不限 | `Data.getSlot` 的 12 槽遇敌表               |
| Max Results      | `1..100000`                                 | Web Worker 结果预算                         |

地点默认 Min Index 使用 TinyFinder `Form1.getBagAdvances()`：XY 在地点未覆盖
`Bag_Advances` 时为 `27`。Ambush 本身不额外增加 DexNav 帧。

## 结果与算法

每个 Index 保存进入该 Index 前的 TinyMT 状态，然后严格执行：

1. `RandCall(100)`，按 `10/10/10/10/10/10/10/10/10/5/4/1` 选择 12 槽。
2. 读取同一推进后的 `Current(100)` 作为结果列 `Rand100`。
3. `RandCall(100) < 50` 计算同步结果。
4. `AdvanceOnce()` 后读取 `Current(100)`，按 `<50`、`50..54`、`>=55` 计算物品槽
   `0/1/2`。
5. 恢复 Index 初始状态，推进一帧进入下一个 Index。

没有 BlinkSystem、Honey Delay、Trigger、Flute 或 ORAS 消耗。结果协议使用 16 个
32 位 word：Index、Rand100、State[4]、Initial Seed、同步标志、槽位、物品槽、物种、等级，
其余 word 保留为零以保持固定长度。

## 验证

- TypeScript domain / UI preview 定向测试
- `POKERNGKIT_WASM_MODULES=gen6tinyambush npm run wasm:test:native`
- 完整 `npm run verify`

外部 Chrome/Edge 页面回归和生产算法验收仍按全部 3DSRNGTool 模块完成后的统一门槛
执行。
