# 第三世代个体值查询 PID

本文说明 `gen3ivtopid` 对 PokeFinder 4.3.2 `IVs to PID` 工具的移植边界。用户输入六项个体值、性格和 TID，工具从第三世代 RNG 调用顺序反向恢复可能的 Seed、PID、SID 和生成方式。生产计算位于 C++/Emscripten Wasm，并只在独立 Dedicated Worker 中执行。

## 1. 功能范围

当前支持以下第三世代生成方式：

| Web 方法           | PokeFinder `Method`      | 用途                      |
| ------------------ | ------------------------ | ------------------------- |
| `Method 1`         | `Method::Method1`        | 掌机常规定点/野生调用顺序 |
| `Reverse Method 1` | `Method::Method1Reverse` | PID 高低半字反转          |
| `Method 2`         | `Method::Method2`        | PID 与 IV 之间多一次推进  |
| `Method 4`         | `Method::Method4`        | 两组 IV 之间多一次推进    |
| `XD/Colo`          | `Method::XDColo`         | XD/竞技场 XDRNG           |
| `Channel`          | `Method::Channel`        | Pokémon Channel 基拉祈    |

同一上游计算器返回 `Cute Charm (DPPt)` 与 `Cute Charm (HGSS)`。PokeRNGKit 现在完整保留这两种结果，并继续把 `IVs to PID` 作为全局工具单一入口；结果表的生成方式列直接显示上游英文标签。

`Cute Charm (DPPt)` 仅在 `low / 0x5556 != 0` 且 `high / 0xA3E == nature` 时成立；`Cute Charm (HGSS)` 仅在 `low % 3 != 0` 且 `high % 25 == nature` 时成立。两者按 `0 / 0x32 / 0x4B / 0x96 / 0xC8` 五个性别阈值构造 PID，并使用 `(PID XOR TID) & 0xFFF8` 计算 SID 基准值。

## 2. 输入与输出

输入为：

```text
HP / Atk / Def / SpA / SpD / Spe
Nature
TID
```

输出严格对齐 `Model/Util/IVToPIDModel` 的九列：

```text
Seed / PID / Method / Ability / 12.5% / 25% / 50% / 75% / SID
```

Seed 和 PID 显示为 8 位大写十六进制；Ability 为 `PID & 1`；四个性别比例列根据 `PID & 0xFF` 与阈值 `30/63/126/190` 比较，显示 `♂` 或 `♀`；SID 显示十进制。

## 3. 掌机 Method 1/2/4

六项 IV 被打包为两次 16 位 RNG 输出的已知 15 位：

```text
first  = HP | Atk << 5 | Def << 10
second = Spe | SpA << 5 | SpD << 10
```

`LCRNGReverse::recoverPokeRNGIV` 使用格规约常量恢复满足两次输出的 PokeRNG 状态。Method 1/2 共用连续 IV 恢复，Method 4 使用两组 IV 之间存在一次额外推进的恢复路径。

对每个 Method 1 候选，PokeRNGR 逆向读取 PID 两个半字：

```text
high = previousUShort()
low  = previousUShort()
SID  = (high XOR low XOR TID) AND 0xFFF8
Seed = previousState()
PID  = high << 16 | low
```

只有 `PID % 25 == Nature` 的候选进入结果。Reverse Method 1 使用 `low << 16 | high`；Method 2 先把逆向 RNG 额外移动一次；Method 4 使用单独恢复出的状态，后续 PID 与 SID 计算相同。

SID 低三位被清零，因此该 SID 是能使目标 PID 成为异色的八个连续 SID 中的基准值，不是从存档读取的已知 SID。

## 4. XD/竞技场

XD/竞技场使用 `LCRNGReverse::recoverXDRNGIV` 和 XDRNG/XDRNGR 参数。恢复候选后，前推两次取得 PID 的 high/low，SID 同样使用：

```text
SID = (high XOR low XOR TID) AND 0xFFF8
```

Seed 为恢复状态再逆推一次的原始状态。性格仍以 `PID % 25` 校验。

## 5. Channel

Channel 的六项 IV 是六次 XDRNG 输出的高 5 位，顺序为：

```text
HP -> Atk -> Def -> Spe -> SpA -> SpD
```

`recoverChannelIV` 使用上游 BKZ 规约矩阵恢复候选状态。随后 XDRNGR 逆向三步，再读取 PID low、PID high 和 SID，并按 Channel 的固定 TID `40122` 修正 PID 高位：

```text
if ((low > 7 ? 0 : 1) != (high XOR SID XOR 40122))
    high = high XOR 0x8000
```

Channel 的 SID 来自 RNG 输出，不使用用户输入 TID；TID 输入仍供其他第三世代方法使用。

## 6. 输入限制

限制已对照以下上游文件：

- `Form/Util/IVToPID.ui`
- `Form/Util/IVToPID.cpp`
- `Form/Controls/TextBox.cpp`
- `Core/Util/IVToPIDCalculator.hpp/.cpp`

| 输入    | 上游控件/类型                                                     | Web 行为                                                      |
| ------- | ----------------------------------------------------------------- | ------------------------------------------------------------- |
| 六项 IV | `QSpinBox`，默认最小值 `0`，`maximum=31`；Core `u8`               | 十进制 `0..31`，2 位，HTML 和 domain/Wasm 同时校验            |
| Nature  | `ComboBoxProxy`，`Translator::getNatures()` 的当前索引；Core `u8` | 固定 `0..24`，顺序与 PokeFinder 一致                          |
| TID     | `TextBox::setValues(InputType::TIDSID)`；Core `u16`               | 十进制 `0..65535`，最多 5 位；空值按 `getUShort()` 解释为 `0` |

当前任务不是大范围帧扫描。每组输入只恢复数量有限的候选状态，因此使用一个 Dedicated Worker/Wasm 实例，不拆分为多 Worker。Worker 仍确保 Channel 格恢复等同步 C++ 计算不会阻塞 React 主线程。

## 7. Wasm 与 Worker 边界

`gen3ivtopid` API v1 暴露：

```cpp
uint32_t gen3ivtopid_api_version();
uint32_t gen3ivtopid_calculate(
    uint32_t hp, uint32_t atk, uint32_t def,
    uint32_t spa, uint32_t spd, uint32_t spe,
    uint32_t nature, uint32_t tid);
uintptr_t gen3ivtopid_result_ptr();
uint32_t gen3ivtopid_result_count();
uint32_t gen3ivtopid_last_error();
```

每条结果为 36 字节、九个 `uint32_t`：

```text
seed / pid / sid / method / ability /
gender12.5 / gender25 / gender50 / gender75
```

Worker 完成 API 版本握手后调用 C ABI，把连续结果缓冲区复制为 `ArrayBuffer` 并通过 transfer list 返回。React 只负责输入、排序、显示和 CSV，不复写生产 RNG。

桥接层最多返回 256 条记录。该上限覆盖 Method 1/Reverse/2/4、XD/Colo、Channel 与两种 Cute Charm 的理论候选总量。Worker 在复制前校验结果数量、4 字节对齐和 Wasm 堆边界；取消或发生错误时主线程销毁对应 Worker，后续请求重新初始化实例。

## 8. 翻译来源

简体中文控件与列名逐字取自 `Form/i18n/PokeFinder_zh.ts`：

```text
个体值查询PID / 性格 / 查找
HP / 攻击 / 防御 / 特攻 / 特防 / 速度 / TID
Seed / PID / 生成方式 / 特性 / SID / XD/竞技场 / 频道
```

`Reverse Method 1` 与 `Method 2` 的简体中文 translation 为空或 unfinished，因此保留英文。PokeFinder 4.3.2 的 `IVToPID` 和 `IVToPIDModel` 日文 translation 全部 unfinished，日文界面按仓库规则保留对应英文源字符串。

## 9. 验证入口

上游固定夹具来源：

```text
Test/Util/IVToPIDCalculatorTest.cpp
Test/Util/ivtopidcalculator.json
```

已写入但本轮未运行的原生夹具包括：

```text
IV 0/0/0/0/0/0, Nature 0, TID 12345
-> Channel, Seed 56654838, PID DC2DA271, SID 48333

IV 31/31/31/0/31/31, Nature 0, TID 12345
-> Method 2, Seed 36E6808A, PID 02B0100B, SID 8832
```

工程检查入口为 `npm test`、`npm run wasm:test:native` 和 `npm run wasm:build`。按照项目所有者规则，本轮不运行；算法验收必须等待 GitHub Actions 部署完成，由项目所有者提供实际 URL 并明确授权后进行。

## 10. 上游依据

- `Core/Enum/Method.hpp`
- `Core/RNG/LCRNG.hpp`
- `Core/RNG/LCRNGReverse.hpp/.cpp`
- `Core/Util/IVToPIDCalculator.hpp/.cpp`
- `Core/Parents/States/IVToPIDState.hpp`
- `Form/Util/IVToPID.ui/.cpp`
- `Model/Util/IVToPIDModel.hpp/.cpp`
- `Form/i18n/PokeFinder_zh.ts`
- `Form/i18n/PokeFinder_ja.ts`
- `Test/Util/IVToPIDCalculatorTest.cpp`
- `Test/Util/ivtopidcalculator.json`

## 11. 界面布局

`IVs to PID` 是精确反查工具，六项 IV、性格和 TID 都是计算输入，不能引入 Static、Wild 或 GameCube 的六维范围、完美个体值和完美个体数筛选语义。

布局使用 `Gen3IvToPidPanel.css` 的 `ivtopid-page` 页面作用域：六项 IV 在桌面保持单行紧凑网格，性格、TID 和查找命令按实际内容宽度排列；窄视口再按单列或三列 IV 重排。输入、`haku-select`、查找/取消、结果操作和下拉选项统一为 `30px`，性格选项与触发框同宽并在框内截断。

结果标题将运行状态、错误或统计信息和操作放在同一行；结果表按 Seed、PID、生成方式、性别比例和 SID 的实际内容收窄，最末列不绘制右边框。模块专属的布局、密度和结果列规则只保留在该功能目录中；共享 Select 继续由公共样式负责。
