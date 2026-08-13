# PokeFinder 上游记录

- 上游项目：[Admiral-Fish/PokeFinder](https://github.com/Admiral-Fish/PokeFinder)
- 上游版本：4.3.2
- 本地核验来源：`C:\Users\Hakuhiro\Desktop\PokeFinder-master`
- 导入日期：2026-08-11
- 许可证：GNU GPL v3 or later
- 导入范围：第三世代 ID Generator 所需的最小 Core、共享 LCRNG、ID 状态与筛选父类；G3 Static、Wild、IVs to PID、Egg 与 G4 Static 以独立 bridge 对照上游源码实现；Encounter Lookup 以静态生成数据对照上游行为

本地核验目录不是构建依赖。PokeRNGKit 构建只使用本目录内的 vendored snapshot；所有文件保留原始版权与 GPL 头部。

## 导入文件 SHA-256

```text
4A54655B74374CA253BA7C727C880110BA9E368036DA9AFD57BA94188F5C6027  Core/Gen3/Generators/IDGenerator3.cpp
0AE6A1DE25093AA8D581C93B4593CA3DA8886DD1F4E6362977BF5202C611FB6A  Core/Gen3/Generators/IDGenerator3.hpp
D7958FE71E879DC9EC8BD53894231F01062AC89ADB3F24C4814DDBC70FDCC7B5  Core/Gen8/States/IDState8.hpp
FF45B4C2FC722FE780FBD3DFF9080930E9AF5E8586D6E5CCDE0FC067FF6EA8F7  Core/Global.hpp
51047452C7203410979CC4A346AF77C157AAB7D6958FAC83D63FB7D34F535102  Core/Parents/Filters/IDFilter.cpp
8B706C7F69639A02C14A17A1ACEB6C21EC0E038D2EA182A73BFA4C93CF8A5C95  Core/Parents/Filters/IDFilter.hpp
E0942D3E04D35320E3682813353AF6481D96C804AB79F6BBC4406BCF0FEEAA42  Core/Parents/Generators/IDGenerator.hpp
C8502F62B522E150D1635DB550911DF09F01129D8412671057D285F9E3A25A91  Core/Parents/States/IDState.hpp
F057BCA7BD5C9A966DEE81EE091178F960A2EF13DF62EEDF5A018EE6F3DACD76  Core/RNG/LCRNG.hpp
```

## 只读核验文件 SHA-256

以下文件用于核验 `gen3static` 算法和第三世代日期/属性规则，未复制到 vendored snapshot：

```text
A3366A5EDC04675F582482D67BF9DD8D406D82CAA880A768121A47F2607C8EA8  Core/Gen3/Generators/StaticGenerator3.cpp
E4EAE7636B3776E9CE25BD1BD64E8E8E2B3EF90A960A587884574DE5016C34E1  Core/Gen3/Generators/StaticGenerator3.hpp
EFDC7F4BCBF8E8FF06F96570F1D3FA91D583650567CDF3A10EAD031EA69EB75C  Core/Util/Utilities.cpp
2DA3496DB43264D42569FB97A70E82E9AB3B1D52008582316C44857042F97458  Core/Util/Utilities.hpp
```

以下文件用于核验 `gen3wild` 的算法、输入、控件、翻译、生成数据和测试夹具，未复制到 vendored snapshot：

```text
C822F8C75B2101D6D2FDD863EFA2C408DF173C260935F168856C47C78965AB21  Core/Gen3/Generators/WildGenerator3.cpp
D23AE7E3E0439A5D55C378115620B6355ECBD05BEFADC865257A8BB693A9087E  Core/Gen3/Generators/WildGenerator3.hpp
38E8AD8C3CB8167C730A4E91A6C5A76B2FD8376873DD83DD286D3E413296C380  Core/Gen3/EncounterArea3.cpp
698229F5C0930912D1351167B4CA2E8E385BD47513481A9873C2FAB708FFB848  Core/Gen3/EncounterArea3.hpp
1256E0B868146F558793A1DADA929793000A88FD9D239115FCB7C7A5CF996F3F  Core/Gen3/Encounters3.cpp
FA95FFE8AD865AF9A934847C81AE05FD110D11F9FAF4F311F1A1589500026425  Core/Gen3/Encounters3.hpp
77D9C9139F3DE643F3D5D109C552057412F11B7F0CA1E6D2B4BACDF833F70630  Core/Parents/EncounterArea.cpp
A33536C5955C41AC6568C666FAF69DF144F7F3291E46A4C4887A347598F4374C  Core/Parents/EncounterArea.hpp
00A8E69E44953041FC9ECF588A3D156BF8038E8DBEAF11CB45C8B92C37D2CB82  Core/Util/EncounterSlot.cpp
7D0AA58B0C9B65549A5971CDE7FE66269D53AF6B588917384CE8DFD94C196A2B  Core/Util/EncounterSlot.hpp
22E88A2A325940AABDE8929207FCD90296955247E8D1C07CA7FD480C152342B1  Core/Enum/Lead.hpp
A2FF462070D77786B4CCFF01800A1B53FC5B08A81D70F1B09120FF6591D9B495  Form/Gen3/Wild3.cpp
67B3F5EC87E1C22B642002B1CAC69DA47F928EDED911C88A88756F4ABAE7FDD8  Form/Gen3/Wild3.hpp
5C18B9E2951B90E4F02DACBDE788687BAC537833B0F485F177DA2EB091B5533D  Form/Gen3/Wild3.ui
51B4F88667748825CE5091600BD2C5EE7F0152912BFC25856004319E41863FCA  Form/Controls/TextBox.cpp
F216F3D15168487B037F0BDC478F3265179B4297B0F0B70A370ED412AEB9AAF2  Form/Controls/TextBox.hpp
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
D67358790583FEBF22227ABF10B002EBAEC02E797EA08E125093CEA8C36F665F  Form/i18n/PokeFinder_ja.ts
D0B23BA13A57098DA6F358B7D8B23C3BC25182FC2476322D750C76AAC2D22AD9  Core/Resources/Embed/embed_gen3.py
48784967E429A87ABD3288177022222071372770C7CB1A3A7ED2CF5ADC4199C1  Core/Resources/Embed/embed_personal.py
1B19F2CDEB667B9DCCE547EB07500C81B692132D861F5B53D3BC4A5085B5AFAA  Core/Resources/Personal/Gen3/personal_rsefrlg.bin
DB18D79618F88FA01C72F9BB2E2784DC9E709F8018E689CB39B5212BEB795E92  Core/Resources/i18n/zh/species_zh.txt
99BA4C6EB2EA0920E31D3F76F4B95C43903C8FECB3C2CC0CFC33E72F72B9193D  Test/Gen3/WildGenerator3Test.cpp
D145C24D2CA64AECF86A1BC4EEE80909F15AB1B9A81C9F004702DA6FD31D5AEC  Test/Gen3/WildSearcher3Test.cpp
6B01ADF1B867D85B959E259FE87261D24DFCA0644A0E24A197EC3AE563A707A0  Test/Gen3/wild3.json
```

PokeFinder 将 `Core/Resources/EncounterTables` 声明为 [Admiral-Fish/EncounterTableGenerator](https://github.com/Admiral-Fish/EncounterTableGenerator) 子模块。当前本地 4.3.2 归档未包含该子模块内容；PR #1 的 `gen3Data.ts` 与生成脚本尚未记录所用子模块的精确 revision。补齐 revision、生成命令和数据许可证记录前，不把全地点数据描述为已完成来源审计。

上段只描述既有 `gen3wild` 数据来源状态；下方 `encounterlookup` 使用独立生成流程，已记录精确 revision。

## Encounter Lookup 静态数据

本轮遇敌查询已锁定以下可复现来源：

- PokeFinder `v4.3.2`：`2d5c6afed9240f2bdb98634b5b8b1fab352aefa5`
- EncounterTableGenerator：`7769c1df80be93761fe6479d51cbf2fe7a7dc4f9`
- 上游行为：`Form/Util/EncounterLookup.cpp`、`Form/Util/EncounterLookup.ui`、`Form/Controls/ComboBox.cpp`、`Form/Controls/ComboBoxProxy.cpp`、`Core/Gen3/Encounters3.cpp`、`Core/Gen4/Encounters4.cpp`、`Core/Gen5/Encounters5.cpp`、`Core/Gen8/Encounters8.cpp`
- 上游控件行为：宝可梦使用可编辑自动补全、`QComboBox::NoInsert`、包含匹配和弹出列表；版本固定提供 16 个游戏。

只读核验文件 SHA-256：

```text
7B98A76E223C64E4B4A70CDB6F65133B497FA3059C3E68B82C1733CDD310F538  Form/Util/EncounterLookup.cpp
2C3BE95F607BE7504B89CCE0FC52DA863D9C47429849EB7751365FBD9EA05652  Form/Util/EncounterLookup.ui
83A93A8C18957D45CF391A14E92036E7D158D8DD812BC24BCB27EF60D30D6794  Form/Controls/ComboBox.cpp
79322B24F8154319DD519F4744D6A43916A8D094EEDC818AA6B0A025A11F46EC  Form/Controls/ComboBoxProxy.cpp
1256E0B868146F558793A1DADA929793000A88FD9D239115FCB7C7A5CF996F3F  Core/Gen3/Encounters3.cpp
ED78E866AA3E7F21193505637E171EBEAFAFE593F7360B8814F71CC18633F6FF  Core/Gen4/Encounters4.cpp
C233B3AF820C2824217DB0B6645E1BD6298E37CD21D1FDB3FF4180949683A5AA  Core/Gen5/Encounters5.cpp
5E77BC4910859F473FF6714EA426A82F75533028A75F422AEDF93FDD2E8EF046  Core/Gen8/Encounters8.cpp
```

生成命令：

```powershell
python scripts\generate_encounter_lookup_data.py `
  --generated .tmp-encounter-tables `
  --i18n C:\Users\Hakuhiro\Desktop\PokeFinder-master\Core\Resources\i18n `
  --output src\features\encounterlookup\data.ts
```

生成数据文件 `src/features/encounterlookup/data.ts` 保留 PokeFinder 与 EncounterTableGenerator 的 GPL-3.0-or-later 署名。`.tmp-encounter-tables/` 与压缩包只用于生成，不是运行时依赖，不应提交。

## Gen III Wild 地点本地化

`src/features/wild/locationNames.ts` 是由 `scripts/generate_gen3_wild_location_names.mjs` 生成的只读显示资源。脚本将 `gen3Data.ts` 中的 EncounterTableGenerator 地点名与 PokeFinder 英文/简体中文地点资源匹配；精确匹配或明确前缀匹配时显示上游中文，未匹配的细分地点保留 EncounterTableGenerator 英文原名。日文地点资源当前上游仍为英文，因此日文界面同样显示上游英文，而不自行翻译。

```text
937EAC9F4E417FB76739ABD11F23EBF8280B9EB0BC640B23EAC9F23385AD1EE6  Core/Resources/i18n/en/rs_en.txt
47786792131B8115EDB84CA52BD677FE3D22A82E9765546EA9898F4F63CFD526  Core/Resources/i18n/en/e_en.txt
C9CE53561052F9AD5FF47BCFC389BBA2CE7E89D71B34986DDA298DA1EE209405  Core/Resources/i18n/en/frlg_en.txt
E8E381E905174138B916622312BC46555CDC19D12E2BD0263238785BF6727D2F  Core/Resources/i18n/zh/rs_zh.txt
EF302CD9F65403FD105F6E8E6CE738AFB9D6340C20E04C1521BFD15AD90F8E13  Core/Resources/i18n/zh/e_zh.txt
EC090E7D122B7EE064C68CFA4FC9D49CEBFBD0319C7AC88F0B561E8F583F7E94  Core/Resources/i18n/zh/frlg_zh.txt
```

## Initial Seed Finder 参考

- [Real96/RSIDsInitialSeedFinder](https://github.com/Real96/RSIDsInitialSeedFinder) `be3a160a1a17d390f0d53887c5110412c786bd31`，GPL-3.0：TID/SID 到 RS 初始 Seed 的公开算法参考。
- [Real96/FRLGRSEInitialSeedsFinder](https://github.com/Real96/FRLGRSEInitialSeedsFinder) `2150f22d25f5c90fdcbfbd64de14a22d6a447df8`，GPL-3.0：目标 Seed 反推初始 Seed 的公开算法参考。
- [StarfBerry/PokeRNG](https://github.com/StarfBerry/PokeRNG)：仅作为算法研究资料登记。

三者都不是本项目的 vendored 构建输入。`wasm/modules/gen3initialseed/bridge/gen3initialseed_bridge.cpp` 是独立实现，只引用已 vendored 的 PokeFinder `Core/RNG/LCRNG.hpp`；不复制、编译或分发上述参考仓库的源文件。

## 红蓝宝石 ID 帧检索行为参考

- 参考项目：[HaKu76/RS-TID-SID-Frame-Finder_CHN](https://github.com/HaKu76/RS-TID-SID-Frame-Finder_CHN)
- 本地核验来源：`C:\Users\Hakuhiro\Desktop\RS-TID-SID-Frame-Finder_CHN-master`
- 用途：核对 TID/SID 与 TID/PID 两种输入、PokeRNGR 逆推、2000 年日期枚举、TSV 和星闪/方块闪显示行为
- 集成边界：不复制或编译 C# / WinForms 文件；`gen3id` bridge 使用现有 GPL-3.0-or-later PokeFinder LCRNG 参数独立实现浏览器算法

本地归档没有 `.git` 元数据或许可证文件，因此仅记录为行为参考，不 vendoring 到构建输入。参考文件 SHA-256：

```text
3259874852D66483DE1FC638615D2BB0A21CC82EC5C9E3F2D9A4FD44FE4517C1  README.md
0C34EEF2D8D692027A676DADBB7DF50D1D9CE94D10EC5EDFD29EC4D0CC87794A  RNGRecovertest/Form1.cs
61155FE0F71FBA836C752E4C7CA31E6DA8B3B1801A1EB92CB0DA156493C2AE5B  RNGRecovertest/PokeRNGR.cs
A4A0464C50D2BF7F633EDF164EF91CC92DFDAEE15A9099045ABBE8BC328585BE  RNGRecovertest/Form1.Designer.cs
FE6A55570119A253DBD69946D86648E25910687D3B851CD92D4213548C028BE2  RNGRecovertest/RNGRecovertest.csproj
```

## PokeRNGKit 修改

当前 vendored 文件未修改。PokeRNGKit 通过独立的 `wasm/modules/gen3id/bridge/gen3id_bridge.cpp` 提供 ID C ABI；`wasm/modules/gen3initialseed/bridge/gen3initialseed_bridge.cpp` 复用 vendored `LCRNG.hpp`，按已登记的 Real96 工作流提供初始 Seed C ABI；`wasm/modules/gen3static/bridge/gen3static_bridge.cpp` 复用 vendored `LCRNG.hpp`，并按 `StaticGenerator3.cpp` 与 `Utilities.hpp` 的规则提供 Static C ABI、筛选和二进制结果布局；`wasm/modules/gen3wild/bridge/gen3wild_bridge.cpp` 复用同一 LCRNG，并按 Wild Generator、Encounter Area 与 Encounter Slot 规则提供独立 Wild C ABI；`wasm/modules/gen3ivtopid/bridge/gen3ivtopid_bridge.cpp` 复用 vendored LCRNG 参数，并按 `LCRNGReverse.cpp` 与 `IVToPIDCalculator.cpp` 的常量和调用顺序提供第三世代 IVs to PID C ABI。

`wasm/modules/gen3egg/bridge/gen3egg_bridge.cpp` 复用 vendored `LCRNG.hpp`，并按 `EggGenerator3`、`EggState3` 与 `Daycare` 的调用顺序提供第三世代 Egg Generator C ABI、亲代遗传、筛选和二进制结果布局；不修改 vendored 上游文件。

`wasm/modules/gen3seedtotime/bridge/gen3seedtotime_bridge.cpp` 复用 vendored `LCRNG.hpp`，并按 `SeedToTimeCalculator3` 的 PokeRNGR 回推、分钟枚举和 post-2000 日历缺陷提供第三世代 Seed to Time C ABI；不修改 vendored 上游文件。

`wasm/modules/gen3ngcseed/bridge/gen3ngcseed_bridge.cpp` 复用 vendored `LCRNG.hpp`，并按 `GalesSeedSearcher`、`ColoSeedSearcher` 与 `ChannelSeedSearcher` 的调用顺序提供 GameCube Seed Finder C ABI。React 不直接执行 XDRNG；`.precalc` 仅在 TypeScript 中解析上游固定的小端文件结构和 Qt ISO 3309 CRC。

## GameCube Seed Finder 只读核验

以下上游文件用于核验 `gen3ngcseed` 的算法、输入、翻译、Precalc 分区和交互，未复制到 vendored snapshot：

```text
5C50E93457AD6A451A167F4106163F7624E2C337D1857A26BBF1B3CC1CE9449A  Form/Gen3/Tools/GameCubeSeedFinder.cpp
5285B43631EAE7DA347C87058FD324439686ADDCA8B2D887AC32FE616A9D77DC  Form/Gen3/Tools/GameCubeSeedFinder.hpp
35DCAE60B417E93746A8C878FA8A740F9C86EA7463FAFC3CFB651E8001972364  Form/Gen3/Tools/GameCubeSeedFinder.ui
41159DF4A91A183D9382BBE5B0B14DD82DAEBD6CD6A872DB0F7969B58BA4E1AD  Core/Gen3/Searchers/GalesSeedSearcher.cpp
87F7994298C8E292184A7096B25312F0EEABBBFAE26DFD20CF003E711E8F6DA8  Core/Gen3/Searchers/GalesSeedSearcher.hpp
35A8BBA1169154F773B7893F9FD88674080FB550CE623CFD852EB217CB5688A6  Core/Gen3/Searchers/ColoSeedSearcher.cpp
7F6D268091BA054761386D5B1CBC67E1BDAE15AF88875CE9ECF0C7B52127EE42  Core/Gen3/Searchers/ColoSeedSearcher.hpp
998CC1D3D0E591A7F1D279270F31BDD56D866FFC37F3669F3F34EEB36A1CD2AD  Core/Gen3/Searchers/ChannelSeedSearcher.cpp
6B1CF0BC492429ECE3B8137213C5A421C52537D3F57CE15DFB8E3174FC46D889  Core/Gen3/Searchers/ChannelSeedSearcher.hpp
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
```

PokeFinder 4.3.2 的 `GalesSeedSearcher::searchSeedSkip()` 读取 `enemyHPStat[enemyIndex + 5]`，而 `enemyHPStat` 只有 5 行。这是确定的越界访问。PokeRNGKit bridge 不复制未定义行为，第一轮使用与普通搜索一致的 `enemyHPStat[enemyIndex]`。该修改边界必须在生产页面与 PokeFinder 实际查询结果交叉回归；当前不能标记为算法已验收。

上游 Gales/Colo Precalc 文件分别使用 25/24 个小端 `uint32_t` 分区计数，并以 Qt 默认 `qChecksum` 校验为 `0xD75B / 0x097B`。本项目不分发 Precalc 文件，只允许用户从本地选择并在内存中校验、读取。

## Gen III Seed to Time 只读核验

以下上游文件用于核验 `gen3seedtotime` 的算法、输入、翻译、结果列和固定夹具，未复制到 vendored snapshot：

```text
5DEC8279DF7CD9A17B6CBDEEEC4ABE51D9B8C82DA92FD6BD8347303C17B27D14  Core/Gen3/Tools/SeedToTimeCalculator3.hpp
D32E8699AEBE81E477F3CECABF36DCCE58891AE7956DFC942480564EBABA28B6  Core/Gen3/Tools/SeedToTimeCalculator3.cpp
94FAB421CAEDEB78A825B2FE9F56C145AF9AA2DD664EFC9608B9AA133BDE01AA  Core/Util/DateTime.hpp
0E7CB0135B09062C6E63D33FCB3DF470AAD25D35D9D0D034420EE11233FE9AF6  Core/Util/DateTime.cpp
7CF95FC275C75DBF50495077C58A4141EF3AC7C75728E36323C10C3D88929E40  Form/Gen3/Tools/SeedToTime3.hpp
4A2F288848122D0960105A1FA019BBE5747C6397D4293086291E3EF606884474  Form/Gen3/Tools/SeedToTime3.cpp
6966178B493801E41AE57038640209E5B5C42DED91187B1D1A491155A5949475  Form/Gen3/Tools/SeedToTime3.ui
D1EE9140BF06CBC5752833D9EBEA9673B6FBD88826821CA02D8EFFC069266CDD  Model/Gen3/SeedToTimeModel3.hpp
CEF38B6E0F4E68BD3DAE0E712E10ED74CDDB0EAA553F088BDDAA9172EF99E7D6  Model/Gen3/SeedToTimeModel3.cpp
1969428968A50AE98AEC9666D3FE329DF23E70A3AB6008312AE5D09F314483AF  Test/Gen3/SeedToTimeCalculator3Test.cpp
7E042AEB2C28F8812DBDF66E9AC2248E4898D725EB8E393961DA74FFEF9CD7F4  Test/Gen3/SeedToTimeCalculator3Test.hpp
FCEC89392D2FD2D751AA986E08529EDBE82C942ED6526A97AE3A43F817BD893B  Test/Gen3/seedtotime3.json
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
D67358790583FEBF22227ABF10B002EBAEC02E797EA08E125093CEA8C36F665F  Form/i18n/PokeFinder_ja.ts
```

## Gen III Spinda Painter 只读核验

以下上游文件用于核验 `gen3spindapainter` 的 PID 半字节映射、拖动边界、输入限制、翻译和图像资源。除 `Form/Images/spinda*.png` 复制到模块运行时 assets 外，未复制到 vendored snapshot：

```text
84B1CD8AB2F28BC2E1219B1F8972361DADC0BCFE8FA35CDF47E95D094ECB8812  Form/Gen3/Tools/SpindaPainter.cpp
BAC6F4A9499695D76A373F35C12EBF681CCE4A4ED4B1CB5990EFFB7035A2FAFB  Form/Gen3/Tools/SpindaPainter.hpp
4A6B555E03A5BDF45F751D21265586BF428D2B3031BA699E1A66D67878FA6401  Form/Gen3/Tools/SpindaPainter.ui
B6148972424661E60B926257BD2527F6BA6538A782D2615CB2273B48FC7047CF  Form/Controls/GraphicsPixmapItem.cpp
4C9338730DF701D0C3A431ABAB81550C302C0438172596AF2900916CF111D345  Form/Controls/GraphicsPixmapItem.hpp
51B4F88667748825CE5091600BD2C5EE7F0152912BFC25856004319E41863FCA  Form/Controls/TextBox.cpp
BB98B0FE73D2310712EE44CA04B255D6E31B8B70D1BD0FB2F759FD14F246140D  Form/i18n/PokeFinder_zh.ts
D67358790583FEBF22227ABF10B002EBAEC02E797EA08E125093CEA8C36F665F  Form/i18n/PokeFinder_ja.ts
6B9ED70B03879C0FE3FA2BB030DE369D0A7696A84A5CCA37449372DFC209EF40  Form/Images/spinda.png
0634A7F4B042C18BBB0CEC75C801EEF389BB7DD6D7E7706CF442DB01702B9421  Form/Images/spinda_spot1.png
0B41E98C219980433FBC3719F917E1845D9DB4F62F308ABD87C9599C8A3D689A  Form/Images/spinda_spot2.png
107EAD1723336D3E0D5DA32AC001178AEE5DC3060FDAB991111F34D73AEA077F  Form/Images/spinda_spot3.png
6BAF4F51D2F3983CFDCCFF8000C9C9203D3493EB08FC50D1460A3FCB7F342F33  Form/Images/spinda_spot4.png
```

`src/features/encounterlookup` 不复制或修改上游 Core；它使用由 EncounterTableGenerator 二进制资源生成的静态数据，并在 TypeScript domain 中复现上游 Encounter Lookup 的版本、图鉴上限、特殊遭遇组合和等级范围映射。

## Gen IV Static 只读核验

`wasm/modules/gen4static/bridge/gen4static_bridge.cpp` 使用 vendored `LCRNG.hpp`，并对照以下 PokeFinder 4.3.2 文件实现第四世代 Static Generator/Searcher 的独立 C ABI、筛选和固定宽度结果布局：

```text
Core/Gen4/Generators/StaticGenerator4.cpp
Core/Gen4/Searchers/StaticSearcher4.cpp
Core/Gen4/States/State4.hpp
Core/RNG/LCRNG.hpp
Core/RNG/LCRNGReverse.cpp
Core/Util/Utilities.hpp
Form/Gen4/Static4.cpp
Form/Gen4/Static4.ui
Form/Controls/TextBox.cpp
Form/i18n/PokeFinder_zh.ts
Test/Gen4/StaticGenerator4Test.cpp
Test/Gen4/StaticSearcher4Test.cpp
Test/Gen4/static4.json
```

- PokeFinder revision：`dd00fe7`。
- EncounterTableGenerator Gen4 revision：`9a2ed62`。
- `scripts/generate_gen4_static_data.mjs` 生成 99 条 `src/features/gen4static/encounters.ts` 定点模板。
- `scripts/generate_gen4_iv_data.mjs` 生成 `src/features/gen4ivcalculator/gen4IvData.ts` 的个人数据和多语言显示资源。
- G4 存档使用 IndexedDB 记录 `gen4-profiles` 与 localStorage 镜像 `pokerngkit-gen4-profiles-v1`；存档面板和 IV 计算器分别使用 `pokerngkit-gen4-profile-panel-expanded`、`pokerngkit-gen4-iv-calculator-expanded`，不复用 G3 键。

### PokemonRNGGuides 交叉参考

- 参考项目：[zaksabeast/PokemonRNGGuides](https://github.com/zaksabeast/PokemonRNGGuides)
- 固定 revision：`c0b2bb664f04a4ef052e6dd4d831351703fa4047`
- 核对范围：`rng_tools/src/generators/gen4/stationary/` 的 Generator/Searcher 分层，以及 `src/rngToolsUi/workbench/tools/gen4/static/` 的 React 工作台流程。
- 使用结论：用于交叉核对 Method 1/J/K 路径、`iv1`/`iv2` 顺序读取、IV Seed 恢复与 SeedFilters 分层；定点模板、控件语义、推进数边界和固定结果仍以 PokeFinder `dd00fe7` 为准。
- 集成边界：不复制、不编译、不 vendoring PokemonRNGGuides 源码，不把其 Rust 或 React 文件作为 PokeRNGKit 构建输入。

## IVs to PID 只读核验

以下上游文件用于核验 `gen3ivtopid` 的算法、输入、翻译、结果列和固定夹具，未复制到 vendored snapshot：

```text
16C2E0D185E3DCBD97E00D8A989A8319981D5161F8D6D4ABD743B877440449F1  Core/Enum/Method.hpp
1D05D72AA46A38C1957DB20F2A53930D0D9F3AC2ACF70044F9D8CCE56CA2D6FA  Core/RNG/LCRNGReverse.hpp
2D3628267C1E5565789D0C42059A251523C39F9B56F31282B74F1AE1F3047521  Core/RNG/LCRNGReverse.cpp
226268DA832ADD4371DA4EF893AD64C204AA7748A6414BF75C4920F933D0534C  Core/Util/IVToPIDCalculator.hpp
879BE303D259722BB32A226C3F1AD1FF0A388098AB0FA6A19E8FF81B6301E227  Core/Util/IVToPIDCalculator.cpp
0EA7CD53AFC68E880624B0773D1F6889617F1AB5B56885900AAA0F8187FC1A68  Core/Parents/States/IVToPIDState.hpp
C9B5AEBF9EA87A381B4F04E3DBDC15AF751C05413789E99B09F70061F2205050  Form/Util/IVToPID.ui
745D0F3ABC443F56DC0CFC863017284254A3BA3C863F97905B9646833A4298E9  Form/Util/IVToPID.cpp
9DAE5EA6D88C5BBB2FDFDD6CC7677F7E336A7BAB6F90379A15EC3359157C7C62  Model/Util/IVToPIDModel.hpp
D0B5DCBF392E5090CABED326D44A7E6C370E577EEC3AA6E447E3FFF767993D5A  Model/Util/IVToPIDModel.cpp
5DE280596558910172C7DBFFD4162A23E342EE294E3F59D257456AF94C903BA5  Test/Util/IVToPIDCalculatorTest.cpp
E617C4445F3B4C57C8E087B079661C2DE1DD95983C36D0028362D97DCAC76F33  Test/Util/ivtopidcalculator.json
```

## Egg 只读核验

以下上游文件用于核验 `gen3egg` 的算法、输入、翻译、结果列和固定夹具，未复制到 vendored snapshot：

```text
2D650A647CA89A524CD64974337B13BCB2BD024483A463877367070F2AE13F1A  Core/Gen3/Generators/EggGenerator3.cpp
B3257E90E23F14AFA7D122CB112B9DD33374C8548E08251E64704DA550300BF7  Core/Gen3/Generators/EggGenerator3.hpp
E7C6DF17CC8DDAA652F1344DAF9B713B7AD76C302FE2BB3C3AE956A293714FFF  Core/Gen3/States/EggState3.hpp
2C7281D92537FBFF5BD1F4385607F32DBEF4C72E7B3C3BC73EEE3D741C7F5B4D  Core/Parents/Daycare.hpp
B0D73EC844F4DEAF628DA00805A950BB0627B00123CE1D9AA2569DCEE9A99914  Form/Gen3/Eggs3.cpp
5D83DBB303CBB39B1522E3E58AB1CCBF279928645BCBBA6D8AA7BD3BF4FE189B  Form/Gen3/Eggs3.ui
C8A8F14C039A49E799B073971CE5A09B5160FE489641D6D741200700DBF86DD3  Form/Controls/EggSettings.cpp
3B7A337B09907F667FDD87ED04B1A936047745F20143316E1258C89ABC1B74B6  Form/Controls/EggSettings.ui
340180968236B0CD29FEE6CFF07AFE6001C3D72F85B1024DC90DA8E2A240B22A  Model/Gen3/EggModel3.cpp
9F0EB6D4987DEA1E2D472F96FC6C3ECCB837EE050687D40A5CCE75C51B719002  Model/Gen3/EggModel3.hpp
340ADEF105CE40DB19F93BA2C6546F8C320A7F79BFA0A9053BACD39994CBA055  Test/Gen3/EggGenerator3Test.cpp
244527C1E8BE240CF59E1B31A1B45A6F0CA0425FB98494CE6BD339B7D84B3810  Test/Gen3/egg3.json
```
