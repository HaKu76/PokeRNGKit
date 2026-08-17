# 3DSRNGTool 存档信息管理

`3dsprofiles` 对应 3DSRNGTool 的 `Profile Manager`、`Profile View` 与主窗体 Profile 选择器。模块管理 X、Y、Omega Ruby、Alpha Sapphire、Transporter、Sun、Moon、Ultra Sun、Ultra Moon 的本地档案，并向已实现的 Gen VII RNG 工作区提供当前选择。

本模块不执行 RNG，不使用 Wasm、Worker、后端、账号、遥测或运行时 CDN。IndexedDB 是主存储，localStorage 是镜像与恢复路径。

## 上游范围

- 档案模型与 XML：`3DSRNGTool/Controls/Profiles.cs`。
- 新建与编辑：`3DSRNGTool/Subforms/ProfileView.cs`、`ProfileView.Designer.cs`。
- 管理列表：`3DSRNGTool/Subforms/ProfileManager.cs`、`ProfileManager.Designer.cs`。
- 十六进制输入：`3DSRNGTool/Controls/HexMaskedTextBox.cs`。
- 版本名称与界面文本：`3DSRNGTool/Controls/StringItem.cs`、`Resources/text/lang_en.txt`、`lang_ja.txt`、`lang_zh.txt`。

行为基线为本地 3DSRNGTool_CHN revision `359bdd7a9ff7c145fec12302cf43da932923fa62`。来源、许可证和本地优化版与公开祖先的关系见 [`third_party/3dsrngtool/UPSTREAM.md`](../../third_party/3dsrngtool/UPSTREAM.md)。

## 字段与输入限制

| 字段              | 上游类型或控件                   | 默认值     | 进制与空值                 | 最小值         | 最大值或长度                         |
| ----------------- | -------------------------------- | ---------- | -------------------------- | -------------- | ------------------------------------ |
| Description       | WinForms `TextBox` / `string`    | 空字符串   | 空白拒绝保存               | 1 个非空白字符 | `TextBoxBase.MaxLength` 默认 `32767` |
| GameVersion       | `ComboBox.SelectedIndex` / `int` | X / `0`    | 固定 9 项，不接受空值      | X / `0`        | Ultra Moon / `8`                     |
| TSV               | `NumericUpDown` / `ushort`       | `0`        | 十进制；空文本按 `0`       | `0`            | `4095`                               |
| TRV               | `NumericUpDown` / `ushort`       | `0`        | 一位十六进制；空文本按 `0` | `0`            | `F`                                  |
| Shiny Charm       | `CheckBox` / `bool`              | `false`    | 布尔                       | `false`        | `true`                               |
| Egg Seed `[0..3]` | `HexMaskedTextBox` / `uint[4]`   | `00000000` | 八位十六进制；空文本按 `0` | `00000000`     | `FFFFFFFF`                           |

版本索引顺序固定为 X、Y、Omega Ruby、Alpha Sapphire、Transporter、Sun、Moon、Ultra Sun、Ultra Moon。X/Y/OR/AS/Transporter 只启用 Seed `[1]` 与 `[0]`；Sun/Moon/USUM 启用 `[3]..[0]`。模型始终保存四个 `uint32`，列表显示顺序与上游一致：Gen VI/Transporter 为 `[1],[0]`，Gen VII 为 `[3],[2],[1],[0]`。

HTML 的 `maxLength`、数值规范化与领域校验同时执行这些边界。Web 档案增加稳定 `id`、`createdAt`、`updatedAt`，避免上游按对象引用和列表位置修改记录时产生选择漂移。

## 管理行为

- 提供新建、编辑、删除、上移、下移、拖放重排、清空、导入和导出；没有选择时编辑、删除和移动命令禁用。
- 桌面使用可滚动表格，显示 Description、Game、TSV、TRV、Shiny Charm 与 Egg Seeds；窄屏改为逐条记录列表。
- 编辑器使用有名称的 modal，支持初始焦点、Tab 焦点圈定、Escape、点遮罩关闭、滚动锁定和关闭后焦点恢复。
- 删除单条与清空全部档案前确认。加载、保存、空列表和错误状态保持稳定布局，忙碌时阻止重复操作。
- 图标命令保留 tooltip 和可访问名称；上游语言文件没有对应翻译时保留 English source label。

## 持久化与迁移

- IndexedDB：数据库 `pokerngkit-3dsrngtool`，object store `profile-data`，记录 key `profiles`。
- localStorage 镜像：`pokerngkit-3dsrngtool-profiles-v1`。
- 主存储待同步标记：`pokerngkit-3dsrngtool-profiles-v1-primary-pending`。
- 状态格式：`{ schemaVersion: 1, profiles, selectedProfileId }`。
- JSON 备份格式：`pokerngkit.3dsrngtool-profiles`，schema version `1`；导入完整校验后按稳定 id 合并。
- XML 导入兼容上游 `profiles_3dsrngtool.xml` 与旧 `profiles.xml` 的 `BindingList<Profile>` 序列化结构；迁移后生成稳定 id，不修改原文件。
- IndexedDB 不可用时回退到 localStorage。镜像写入成功但主存储写入失败时保留待同步标记；下次加载优先恢复较新镜像并重试主存储。
- 清空只影响 3DSRNGTool 档案；任一副本清除失败时保留界面状态并报告错误。

## Gen VII 调用方

页头选择器只把 Sun、Moon、Ultra Sun、Ultra Moon 档案注入 Gen VII 工作区。X/Y/OR/AS/Transporter 档案可管理，但不会写入 Gen VII 表单。

| 工作区                | 档案切换时同步                         |
| --------------------- | -------------------------------------- |
| Stationary、Wild、SOS | GameVersion、TSV、TRV、Shiny Charm     |
| Event                 | GameVersion、TSV、TRV                  |
| Egg                   | Seed `[0]..[3]`、TSV、TRV、Shiny Charm |
| Main RNG Tool、ID     | GameVersion                            |

同步只在档案 id 或 `updatedAt` 改变时发生。同步后用户可以继续手动修改表单，普通重渲染不会重复覆盖；Stationary、Event、ID 同时执行各自现有的版本派生默认值更新。

## 验证范围

- Domain：字段边界、版本与 Seed 数量、Gen VII 类型守卫、JSON 往返、重复 id 和无效选择拒绝。
- Repository：IndexedDB 主路径、localStorage 回退、较新镜像恢复、清空失败保留状态。
- UI：外部浏览器检查表格、移动端列表、编辑器焦点、导入导出、拖放与 Gen VII 档案同步；自动化结果仅作为工程证据。

## 上游文件 SHA-256

```text
8FA0820187F2C0963F812186DA92F8E65B13A0A08AC1373DAF6781FE149CBC6F  Controls/Profiles.cs
504CC6B15A24157BF1B5A8DA46D2C6399B37E817A61444657D143C353BA3ECB1  Subforms/ProfileView.cs
D93C57A068AF4696487C7C0E04FA139A84E015AC3446EAD9FA5DBAB6AF036F08  Subforms/ProfileView.Designer.cs
86B348958F9BC3BC4A47BD1C96659835E3D0DB1BDB5707A3A4CD5BD479CF4C80  Subforms/ProfileManager.cs
CCDB777184E55F6358A06BEA39C4D56C588245ABD84D1CAD452D8DB057CBD75F  Subforms/ProfileManager.Designer.cs
9FA084BFD07905CB74293BB91A64A2EFAFF85A8C0F68EE7C9976EC872C32CE88  Controls/HexMaskedTextBox.cs
BB5FACDF2EE8989C280E3E980725BD00D90BEF6CC75BEF7D6CC6191C6BAC3565  Controls/StringItem.cs
07AE20FE15D2D7361F1070FF770B1D1E662EF3F75815B60A7AA384FF5D457B7D  Resources/text/lang_en.txt
B9D1AB9267DCCBB64CE4C5C6D59A1885577B0D85C081AE8A27E2CD9C24C223D4  Resources/text/lang_ja.txt
299D75120CB9BF5B9AD76C44D9BE2769580AA1B37CD005E2864AB7113DB7E6EB  Resources/text/lang_zh.txt
```
