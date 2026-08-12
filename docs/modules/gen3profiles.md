# 第三世代存档信息

本文说明第三世代存档信息的数据结构、本地持久化、导入导出和界面行为。该模块不执行 RNG 计算；Static Generator/Searcher 从当前存档信息读取游戏版本、TID、SID 和无电池状态。

## 1. 数据结构

每条存档信息包含：

```text
id
name
version
tid
sid
deadBattery
createdAt
updatedAt
```

当前版本范围为 Ruby、Sapphire、Fire Red、Leaf Green、Emerald、XD 和 Colosseum。第三世代掌机 Static 仅显示 Ruby、Sapphire、Fire Red、Leaf Green 和 Emerald；GameCube 存档保留给后续对应模块。

TID 与 SID 复用 PokeFinder `TIDSID` 输入限制：`0..65535`、最多 5 位十进制。`Dead Battery` 只对 Ruby/Sapphire 有效，切换到其他版本时强制为 `false`。

没有已选存档信息时使用 PokeFinder 的临时默认值：

```text
Name:    -
Version: Emerald
TID:     12345
SID:     54321
```

该默认值不自动写入 IndexedDB 或备份文件。

## 2. 本地持久化

IndexedDB 是主存储，数据库名为 `pokerngkit`，当前 schema 版本为 `1`。完整状态以 `gen3-profiles` 记录写入 `app-data` object store。

每次成功保存也把同一状态写入 `localStorage` 的 `pokerngkit-gen3-profiles-v1`。加载顺序为：

1. 尝试读取并校验 IndexedDB。
2. IndexedDB 不可用、读取失败或没有记录时读取 localStorage 镜像。
3. 镜像有效且 IndexedDB 恢复可用时，把镜像写回 IndexedDB。
4. 两处都没有有效状态时返回空列表。

主存储与镜像都不可写时，保存操作失败并向界面返回错误。项目没有后端或云端副本。

## 3. 导入与导出

导出文件为 UTF-8 JSON，格式标识为 `pokerngkit.gen3-profiles`，schema 版本为 `1`，包含导出时间、全部存档和当前选择。

导入时先完整解析并校验文件，再按稳定 `id` 合并：

- 新 `id` 追加。
- 相同 `id` 使用导入记录覆盖。
- 导入文件中的已选 `id` 有效时同步选择。
- 任意记录无效时拒绝整个文件，不执行部分导入。

导入不是服务器同步，也不会读取游戏存档文件。

## 4. 清除与恢复

`Clear Profiles` 同时删除 IndexedDB 的 `gen3-profiles` 记录和 localStorage 镜像，并把运行中状态恢复为空列表。

清除前由浏览器确认框二次确认。操作完成后项目无法恢复数据；需要长期保留时先使用 `Export` 导出 JSON。清除存档信息不清除语言、主题、PWA 缓存或其他站点设置。

## 5. 悬浮窗

应用全局右下角显示右侧悬浮工具列，在 ID 与 Static 工作区切换时保持可用：

- 存档信息、个体值计算器和遇敌查询默认收起，以纵向按钮列固定在右下角；展开时从右向左延展，保留当前主题的色彩、边框和字号，任意时刻只允许展开一个工具。
- 点击各自标题区域才会展开或收起；页面空白点击不会收起存档信息，也不会中断管理弹窗。
- `Manager` 打开完整管理界面，提供新建、编辑、复制、删除、导入、导出和清除。
- 折叠后保留当前存档名，不覆盖主要表单。
- 展开状态保存在 `pokerngkit-gen3-profile-panel-expanded`，由 `App.tsx` 与另外两个悬浮工具统一协调；存档内容仍只由 repository 管理。

右侧工具列的固定按钮顺序与展开交互参考 [Butterfly 右下角悬浮菜单栏魔改指南](https://blog.leonus.cn/2022/rightside.html)；PokeRNGKit 未复制该站代码、图标或视觉资产。

## 6. 上游依据

- `Form/Gen3/Profile/ProfileEditor3.ui`
- `Form/Gen3/Profile/ProfileManager3.ui`
- `Form/Gen3/Profile/ProfileManager3.cpp`
- `Form/Controls/TextBox.cpp`
- `Form/i18n/PokeFinder_zh.ts`
- `Core/Gen3/Profile3.hpp`

Web 新增的 IndexedDB、localStorage 镜像、JSON 备份和悬浮窗不属于 PokeFinder 4.3.2；这些能力不改变 RNG 算法。

## 7. 验证入口

- 数据与备份：`src/features/profiles/domain.test.ts`
- IndexedDB repository 与 localStorage 兜底：`src/features/profiles/repository.test.ts`
- 输入规范化：`src/input.test.ts`
- 界面：`src/features/profiles/Gen3ProfileControls.tsx`

运行：

```bash
npm test
npm run build:ui
```

最终的新建、刷新恢复、导入、导出、清除和移动端悬浮窗验收由项目所有者在本地 UI 与 GitHub Pages 中完成。
