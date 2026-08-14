# Gen 5 SHA1 Cache Finder

## 范围

本模块实现 PokeFinder 4.3.2 的 `SHA1 Cache Finder`。它按照 `Timer0 -> 日期 -> 有效按键组合 -> 当日 86400 秒` 的顺序，计算第五世代 SHA-1 初始种子，并把命中 `.ivcache` 高 32 位 Seed 的结果写成 PokeFinder 可读取的 `.sha1cache`。

算法运行在独立 Web Worker 的 C++/WebAssembly 模块中。浏览器不使用 pthread、`SharedArrayBuffer` 或后端服务；最多使用 4 个独立 Worker。每个 Worker 在开始检索时只接收一次三类 IV Seed 列表，后续任务只携带一个 `Timer0 + 日期 + 按键` 单元。

## 输入与上游来源

| 控件          | 规则                                                                                             | 上游来源                                                              |
| ------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `Profile`     | 选择现有第五世代 Profile；游戏、语言、机型、MAC、VCount、Timer0、GxStat 和 VFrame 均复用 Profile | `Form/Gen5/Tools/SHA1CacheFinder.cpp:43-46`、`Core/Gen5/Profile5.hpp` |
| `Start Date`  | `2000-01-01..2099-12-31`                                                                         | `Core/Util/DateTime.cpp` 的 `minJD/maxJD`                             |
| `End Date`    | `2000-01-01..2099-12-31`，且不得早于起始日期                                                     | `Form/Gen5/Tools/SHA1CacheFinder.cpp:100-105`                         |
| `IV Cache`    | 上传有效的 PokeFinder `.ivcache`；浏览器实现使用文件上传补足桌面版 Profile 路径                  | `Core/Gen5/IVCache.cpp:86-137`                                        |
| `Output File` | 先选择 `.sha1cache` 输出文件；File System Access API 不可用时检索完成后下载                      | `Form/Gen5/Tools/SHA1CacheFinder.cpp:91-97,149-152`                   |

PokeFinder 控件的简体中文译文逐字保留：`Search -> 检索`、`Start Date -> 起始日期`、`End Date -> 最后日期`、`Output File -> 导出文件`、`Cancel -> 取消`。`SHA1 Cache Finder`、`IV Cache`、错误标题和说明在上游翻译中未完成，因此保留英文；日期范围错误使用上游已有译文 `请输入正确的日期范围`。

日期计算使用上游 Julian Day 基准 `2451545`（2000-01-01），最终写入的日期字段是相对日期 `JD - 2451545`。Timer0、GxStat、VFrame 与 Profile 的域校验边界分别为 `0..65535`、`0..99`、`0..99`；MAC 最多 12 个十六进制字符。

## IV Cache 读取

`.ivcache` 文件头为小端 `u32` magic `0xD08CB7C0`，随后是 `initialAdvances`、`maxAdvances` 和三组桶计数。浏览器会校验所有计数、文件长度和 Seed 数据边界，并按 `IVCache::getSeeds()` 复现上游分桶：

- Entralink：读取全部桶。
- Normal：BW 读取索引 `0..count-3`，BW2 读取索引 `2..count-1`。
- Roamer：读取全部桶。

每组 Seed 会按无符号 `u32` 排序并去重，以便 C++/Wasm 使用二分查找。为避免恶意文件耗尽浏览器内存，三组列表合计最多 1,000,000 个 Seed。

## SHA-1 Cache 格式

所有整数均为小端。固定头部为 54 字节：

```text
magic              u32 = 0x3C50A97E
initialAdvances    u32
maxAdvances        u32
mac                u64
endDateJD          u32
startDateJD        u32
version            u32 (Game bitmask)
timer0Max          u16
timer0Min          u16
reserved           u8 = 0
dsType             u8 (DS=0, DSi=1, DS3=2)
language           u8 (English=0, French=1, German=2, Italian=3, Japanese=4, Korean=5, Spanish=6)
gxstat             u8
vcount             u8
vframe             u8
entralinkCount     u32
normalCount        u32
roamerCount        u32
```

每条 16 字节记录为：

```text
keyLow   u32 = buttonMask:12 | secondsSinceMidnight:20
keyHigh  u32 = relativeDate:u16 | timer0:u16
seedLow  u32
seedHigh u32
```

三组记录分别按完整 64 位 Seed（先 `seedHigh`，再 `seedLow`）升序写入。浏览器实现累计最多写入 1,000,000 条记录；单个 Worker 单元最多返回 100,000 条，命中该上限会中止检索而不写出不完整文件。

## Worker ABI

API v1 的 14-word 请求为：`version, language, dsType, macLow, macHigh, vcount, timer0, gxstat, vframe, year, month, day, buttonMask, resultLimit`。每条 4-word 结果为 `seedLow, seedHigh, seconds, category`，其中 `category` 为 `Entralink=0`、`Normal=1` 或 `Roamer=2`。Wasm 只负责 SHA-1、二分查找和全天扫描；日期、按键、缓存解析、结果校验和文件写入留在 TypeScript 域层。

## 实现文件

- `wasm/modules/gen5sha1cache/bridge/gen5sha1cache_bridge.cpp`
- `wasm/modules/gen5sha1cache/bridge/gen5sha1cache_bridge.h`
- `wasm/modules/gen5sha1cache/tests/gen5sha1cache_native_test.cpp`
- `src/features/gen5sha1cache/domain.ts`
- `src/features/gen5sha1cache/worker/gen5sha1cache.worker.ts`
- `src/features/gen5sha1cache/worker/Gen5Sha1CacheWorkerPool.ts`
- `src/features/gen5sha1cache/Gen5Sha1CachePanel.tsx`

## 验证

- `domain.test.ts` 覆盖日期边界、2144 个上游有效按键组合、BW/BW2 Normal 桶、损坏文件、单元映射、分类解码和 54 字节头布局。
- `Gen5Sha1CacheUiPreviewEngine.test.ts` 固定预览结果和完整进度。
- `gen5sha1cache_native_test.cpp` 精确覆盖 Black、White、Black 2、White 2 的默认 `2000-01-01 00:00:00` SHA-1、三类分类、全天扫描、结果上限、非法日期、非法按键、空指针和未排序 Seed 列表。
- 已通过 `POKERNGKIT_WASM_MODULES=gen5sha1cache npm run wasm:test:native`，原生 CTest `1/1` 通过。

完整日期范围和宽 Timer0 范围属于生产长任务，不在单元测试中执行；算法结果仍须在部署完成后由项目所有者授权在生产页面回归。
