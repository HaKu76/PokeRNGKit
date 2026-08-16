# 3DSRNGTool 来源记录

第七世代 `gen7id` 模块以本地优化项目为主要行为来源：

- 本地项目：`C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN`
- 本地来源仓库：[HaKu76/3DSRNGTool_CHN](https://github.com/HaKu76/3DSRNGTool_CHN)
- 本地核验提交：`359bdd7a9ff7c145fec12302cf43da932923fa62`
- 公开祖先仓库：[wwwwwwzx/3DSRNGTool](https://github.com/wwwwwwzx/3DSRNGTool)
- 公开祖先提交：`ae5d1762ddc7ba99d2ea1d916e6b8a84512d50ea`
- 许可证：MIT

本地优化版与公开祖先不只是 README 差异。两者在上述基线比较中有 26 个文件变化，包含中文界面、布局、Gen7 遭遇修正、Seed 工具和项目配置。Gen7 ID 本次依赖的 `Gen7/ID7.cs`、`RNG/SFMT.cs`、`Core/IDFilters.cs`、`Controls/Frame_ID.cs`、`MainForm_Core.cs` ID 路径和 `Util/FuncUtil.cs` 在两份基线中没有代码差异，因此算法行为以本地项目为主、公开祖先用于来源追溯。

## 对应实现

- `Gen7/ID7.cs`：TID、SID、TSV、TRV、Gen7TID 和原始时钟值
- `RNG/SFMT.cs`：SFMT-19937 初始化、推进和 `Nextulong()`
- `Core/IDFilters.cs`：ID、TSV、Random Number 的筛选语义
- `Controls/Frame_ID.cs`：显示字段与指针修正
- `MainForm_Core.cs`：ID 搜索的起始帧和循环顺序
- `Util/FuncUtil.cs`：Sun/Moon 起始帧 `1012`、Ultra Sun/Ultra Moon 起始帧 `1132`

`SFMT.cs` 还保留原始 Rei HOBARA 版权头部。PokeRNGKit 的 C++ bridge 仅移植上述确定性算法和必要筛选，不复制桌面窗体代码。
