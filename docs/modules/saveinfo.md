# 存档读取

从右下角工具菜单选择“读取存档”，打开本地文件。面板按当前语言显示文件名、游戏、训练家姓名、TID、SID、游戏时间和校验和。使用六位训练家编号的游戏另显示带前导零的游戏内 ID。

## 输入与来源

| 输入或字段 | 行为                                             | 来源                                                                   |
| ---------- | ------------------------------------------------ | ---------------------------------------------------------------------- |
| 存档文件   | 单文件，1 字节至 32 MiB，按内容自动识别，先解包  | 原浏览器读取限制，PKHeX.Core `Saves/Util/SaveUtil.cs` 的 `GetSaveFile` |
| TID、SID   | 显示原始无符号 16 位编号，范围 0–65535           | `Saves/SaveFile.cs` 的 `TID16`、`SID16`                                |
| 游戏内 ID  | 六位编号格式显示 000000–999999                   | `PKM/Interfaces/ITrainerID32.cs` 的 `GetDisplayTID`                    |
| 校验和     | 保留可识别存档的校验状态，包括韩版金银偏移表修正 | `Saves/SaveFile.cs` 的 `ChecksumsValid`、`SAV2` 与 `SAV2Offsets`       |

文件选择、Worker 和 Wasm 入口都执行大小检查。格式识别沿用 [PKHeX.Core 26.08.26](../../third_party/pkhex/UPSTREAM.md) 的自动识别路径。文件内容只在独立 Worker 中读取。面板只持有当前摘要，关闭后清除。

`npm run saveinfo:build` 使用 .NET SDK 10.0.401 和 `wasm-tools`，把同源运行时写入 `public/save-info/`。`npm run build` 包含这一步，运行时在选择文件后加载。
