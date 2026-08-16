# needle-searcher 来源记录

第七世代 `gen7main` 的 Seed 反查采用 [Admiral-Fish/needle-searcher](https://github.com/Admiral-Fish/needle-searcher) 的 SIMD 穷举思路，并结合 3DSRNGTool 的 SFMT 时钟序列规则独立改写为 C++/WebAssembly bridge。

- 上游仓库：[Admiral-Fish/needle-searcher](https://github.com/Admiral-Fish/needle-searcher)
- 许可证：GNU GPL-3.0-or-later
- 用途：验证四路并行 `uint32_t` Seed 穷举、SFMT-19937 向量化初始化、周期认证与时钟指针比较逻辑
- 集成边界：不复制上游源文件，不编译上游项目，不在运行时访问 `rng-api.odanado.com`；`wasm/modules/gen7main/bridge/gen7main_bridge.cpp` 只保留必要的算法移植和独立 C ABI。

主乱数的行为来源仍以 3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 为准，文件、控件限制和时间计算见 [`docs/modules/gen7main.md`](../../docs/modules/gen7main.md)。根目录 `LICENSE` 与本目录 `LICENSE` 提供 GPL-3.0-or-later 文本；PokeRNGKit 的整体源代码继续按 GPL-3.0-or-later 分发。
