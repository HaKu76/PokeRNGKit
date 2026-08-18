# 3DSTimeFinder 来源记录

3DSRNGTool 日期/时间反查功能的主要行为来源：

- 本地参考项目：C:\Users\Hakuhiro\Desktop\project\3DSTimeFinder-master
- 公开仓库：[Admiral-Fish/3DSTimeFinder](https://github.com/Admiral-Fish/3DSTimeFinder)
- 核验分支：master
- 核验提交：99f4015cebff5ed3edab909c8ae31b039b3f0bcf
- 许可证：GPL-3.0，完整文本保留在上游 LICENSE；SFMT 与 MT 的第三方版权和免责声明保留在上游 Licenses/SFMT.txt 与 Licenses/MT.txt。

## 功能范围

3DSTimeFinder README、Source/Forms/MainWindow.cpp 和 Source/Core/CMakeLists.txt 定义：

- Gen VI Stationary 时间/初始 Seed Searcher
- Gen VI Event 时间/初始 Seed Searcher
- Gen VII Stationary 时间/初始 Seed Searcher
- Gen VII Event 时间/初始 Seed Searcher
- Gen VII Wild 时间/初始 Seed Searcher
- Gen VII ID 时间/初始 Seed Searcher
- Gen VI Profile Manager / Editor
- Gen VII Profile Manager / Editor / Calibrator

时间搜索以 Citra RTC、Profile Save Variable/Time Variable、Seed、Frame、IV、Ability、Nature、Gender、ID、EC/PID 和 Event/Stationary/Wild 过滤为输入；Profile JSON 的字段和迁移规则必须与上游 ProfileLoader、Profile6、Profile7 保持可追溯。

## 对应实现边界

PokeRNGKit 只移植 C++ Core 的日期换算、初始 Seed 反查、结果过滤和档案字段，不复制 Qt 窗体、线程或资源加载代码。时间反查与现有 Gen VI/Gen VII Generator 共享数据定义但使用独立 Worker/Wasm operation；结果表增加 Date/Time、Initial Seed、Frame 和上游实际列。

主要代码入口：

- Source/Core/Gen6/StationarySearcher6.cpp、EventSearcher6.cpp
- Source/Core/Gen7/StationarySearcher7.cpp、EventSearcher7.cpp、WildSearcher7.cpp、IDSearcher7.cpp
- Source/Core/Gen6/Profile6.cpp、ProfileLoader.cpp
- Source/Core/Gen7/Profile7.cpp、ProfileSearcher7.cpp
- Source/Forms/Gen7/ProfileCalibrater7.cpp
- Source/Core/Util/DateTime.cpp、Utility.cpp
