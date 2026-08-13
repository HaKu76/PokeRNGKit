# 第三世代 PID 查询个体值

`gen3pidtoiv` 对应 PokeFinder 4.3.2 的 `PID to IVs` 工具。输入一个 PID，模块反推出 Method 1/2/4、XD/Colo 与 Channel 的可能 Seed 和六项 IV。React 只负责输入、解码和结果表；生产计算在单独的 Wasm Worker 中执行。

## 上游范围

- Form：`Form/Gen3/Tools/PIDToIV.cpp`、`Form/Gen3/Tools/PIDToIV.ui`
- Core：`Core/Gen3/Tools/PIDToIVCalculator.cpp/.hpp`、`Core/RNG/LCRNGReverse.cpp/.hpp`、`Core/Gen3/States/PIDToIVState.hpp`
- 翻译：`Form/i18n/PokeFinder_zh.ts`、`Form/i18n/PokeFinder_ja.ts`
- 固定夹具：`Test/Gen3/PIDToIVCalculatorTest.cpp`

简体中文标题逐字使用 `PID查询个体值`；`PID`、`生成`、`Seed`、`PID`、`生成方式`、`特性`、`SID` 等列名沿用已完成词条。输入为空时复现 `TextBox::getUInt()` 的 `0` 语义。

## 输入限制

| 输入 | 上游设置               | Web/domain 限制                                 |
| ---- | ---------------------- | ----------------------------------------------- |
| PID  | `InputType::Seed32Bit` | 十六进制 `0..0xFFFFFFFF`，最多 8 位；空值为 `0` |

结果的 Method、Seed、PID 和 IV 顺序与 `PIDToIVCalculator` 一致。Channel 计算同时尝试 PID 原值与最高位翻转值，因为 SID 未知。

结果区使用与其他 RNG 模块一致的数据表结构：Seed 与生成方式左对齐，六项 IV 居中，数值使用等宽字体和固定列宽；表头在滚动时保持可见，窄屏通过表格内部横向滚动保留完整列，不压缩字段名。

## Wasm/Worker ABI

API v1：

```cpp
uint32_t gen3pidtoiv_calculate(uint32_t pid);
uintptr_t gen3pidtoiv_result_ptr();
uint32_t gen3pidtoiv_result_count();
uint32_t gen3pidtoiv_last_error();
```

每条结果是 8 个 `uint32_t`：`seed / method / hp / atk / def / spa / spd / spe`。Method 编码为 `1=Method 1`、`3=Method 2`、`4=Method 4`、`5=XD/Colo`、`6=Channel`。Worker 在握手时校验 API 版本、结果数量、4 字节对齐和 Wasm 堆边界，然后通过 transfer list 传回副本；取消或异常会终止当前 Worker。

## 验证状态

已加入 `wasm/modules/gen3pidtoiv/tests/pid_to_iv_native_test.cpp`，夹具包含 PID `0` 的 Method 1 与 Channel 结果。针对 Actions 的 GNU 13.3 编译错误，三个 `RecoverySeeds` 局部值已改为非 const；上游 `operator[]` 只有非 const 重载，未修改 vendored PokeFinder 文件。

2026-08-13 经项目所有者授权，非受限环境的 `npm run verify` 已通过 Prettier、ESLint、TypeScript、28 个 Vitest 文件共 103 项测试、Vite 构建和 PWA 预缓存；Visual Studio 2026 Build Tools x64 环境的 `npm run wasm:test:native` 已通过全部 16 个原生测试，包含 `gen3pidtoiv_native_parity`。未重新运行 GNU 13.3 环境的 Actions，`npm run wasm:build`、浏览器和生产算法回归未运行；算法验收仍需部署完成后由项目所有者提供 URL 并明确授权。

上游算法与 vendored 文件 SHA-256 见 [`third_party/pokefinder/UPSTREAM.md`](../../third_party/pokefinder/UPSTREAM.md)。
