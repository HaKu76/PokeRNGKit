# 第六世代 Event 时间反查

TF2 对应 `3DSTimeFinder` 的 Gen VI `EventSearcher6`。时间范围按 Citra epoch 每秒枚举，Initial Seed 使用 `uint32(Save Variable + Epoch + Time Variable)`，每个时间点复用既有 `gen6event` Wasm 的 54-word Event 请求、Wondercard/锁定字段、PID 类型、IV、异色和 Event Filter。

## 输入限制

| 输入                          | 范围与行为                                                    | 上游依据                                                              |
| ----------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------- |
| Start / End Date/Time         | `2000-01-01 00:00:00` 起的整秒范围，Start 不得晚于 End        | `3DSTimeFinder/Source/Forms/Gen6/Event6.cpp`、`Utility::getCitraTime` |
| Save Variable / Time Variable | 32 位十六进制，`0..FFFFFFFF`；由 Gen VI Profile6 提供         | `Profile6.hpp`、`ProfileLoader.cpp`                                   |
| Initial / Max Frame           | 上游 32 位帧，浏览器保护范围 `0..5000000`                     | `EventSearcher6.cpp`、`Event6.cpp`                                    |
| Event fields / filters        | 与 Gen VI Event 工作区完全相同；支持 `.wc6` / `.wc6full` 导入 | `Event6.cpp`、`EventSearcher6.cpp`                                    |

## Worker / Wasm 契约

- `gen6eventtimefinder.worker.ts` 加载 `gen6timefinder` 初始 Seed API 与既有 `gen6event` Wasm。
- 每秒把 Seed 注入既有 54-word 请求；结果为 19 个 `uint32_t`：16-word Event 结果追加 Initial Seed、Epoch low、Epoch high。
- Worker 跨时间点累计结果，达到全局上限后停止后续时间；取消时终止并重建 Worker。

## 来源与许可

- `3DSTimeFinder/Source/Core/Gen6/EventSearcher6.cpp`
- `3DSTimeFinder/Source/Forms/Gen6/Event6.cpp`
- `3DSTimeFinder/Source/Core/Gen6/Profile6.hpp`

上游 `3DSTimeFinder` 使用 GPL-3.0-or-later；来源、revision 与归属见 [`third_party/3dstimefinder/UPSTREAM.md`](../../third_party/3dstimefinder/UPSTREAM.md)。

## 验证

- `npx vitest run src/features/gen6event/timeDomain.test.ts src/features/gen6event/domain.test.ts src/features/gen6event/preview/Gen6EventUiPreviewEngine.test.ts`：3 个文件、9 项通过。
- 定向 ESLint：通过。
- `npm run typecheck`：通过。
- `$env:POKERNGKIT_WASM_MODULES='gen6timefinder,gen6event'; npm run wasm:test:native`：2/2 通过。
- `npm run wasm:build`：未运行，当前环境未激活 Emscripten / `emcmake`。
- 外部 Chrome/Edge 与生产页面算法验收：未运行，按全部 3DS 模块完成后的统一门槛执行。
