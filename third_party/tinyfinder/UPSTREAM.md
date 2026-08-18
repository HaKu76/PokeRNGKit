# TinyFinder 来源记录

六代 TinyMT 辅助工具的主要行为来源：

- 本地参考项目：C:\Users\Hakuhiro\Desktop\project\TinyFinder-main
- 公开仓库：[Bambo-Rambo/TinyFinder](https://github.com/Bambo-Rambo/TinyFinder)
- 公开项目说明：[TinyFinder README](https://github.com/Bambo-Rambo/TinyFinder/blob/main/README.md)
- 许可证：项目窗体代码按上游仓库分发；内置 RNG/MT.cs 与 RNG/TinyMT.cs 的算法代码分别保留 MT LISENCE.txt 与 TinyMT LICENSE.txt 中的 BSD 风格版权与免责声明。

## 功能范围

TinyFinder README 和 Main/EncounterType.cs 定义的功能分为以下独立工作区：

- TinyMT 日期/Index Searcher、按日期和月份筛选、Index 过滤与状态显示
- Gen VI ID、Normal Wild、Friend Safari、Fishing、Rock Smash、Horde、Honey Wild、Poké Radar、Ambush、DexNav Moving、DexNav Searching 与 Victory Road Swooping
- MT Seed Searcher：Gen VI 个体/IV、PID、PID reroll、EC/PID、群聚闪光和 MT 初始 Seed/时间搜索

TinyFinder 没有实现 TinyMT Timeline calibration；该部分仍按 3DSRNGTool 的独立库存继续核对。Rock Smash 的主机命中流程也不在 TinyFinder 本地实现，但 TinyFinder 的结果生成和筛选必须纳入 PokeRNGKit。

## 对应实现边界

PokeRNGKit 只移植算法、数据、输入限制和结果语义，不复制 WinForms 窗体、线程模型或资源加载代码。每个高消耗功能放入 wasm/modules/<module> 和独立 Worker；React 页面仅负责表单、任务编排、虚拟结果表和 CSV。已有 gen6wild、gen6dexnav、gen6pokeradar 与 gen6id 会在逐字段核对后补齐 TinyFinder 独有的 Honey、Ambush、Victory Road、Index/Date 和 MT Searcher 分支，避免覆盖已验证的 3DSRNGTool ABI。

主要代码入口：

- TinyFinder/Main/Form1.cs
- TinyFinder/Classes/EncounterType.cs
- TinyFinder/Methods/*.cs
- TinyFinder/RNG/TinyMT.cs
- TinyFinder/RNG/MT.cs
- TinyFinder/Subforms/MT/Core.cs
- TinyFinder/Subforms/MT/MTForm.cs
- TinyFinder/Utils/BlinkSystem.cs
- TinyFinder/Database/LocationsXY.cs、LocationsORAS.cs、Species.cs

## 关联研究资料

Bambo-Rambo 账号下的 3DSRNGTool、RNG-Guides、Gen-6-TID-SID-to-time、CitraRNG 和 RNGReporter 作为交叉研究来源记录在 third_party/bambo-rambo/UPSTREAM.md。它们不会覆盖本地 3DSRNGTool_CHN 的优先级，也不会把尚未逐文件核对的仓库标记为已实现算法来源。
