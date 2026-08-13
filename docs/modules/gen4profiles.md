# 第四世代存档信息

第四世代 Static 使用独立存档信息，不读取、删除或覆盖第三世代右下角存档控件。

## 1. 数据结构

每条记录包含：`id`、`name`、`version`、`tid`、`sid`、`nationalDex`、HGSS 的 26 个未知图腾字母捕获状态、4 个未知图腾拼图谜题状态、`createdAt` 和 `updatedAt`。

版本为 Diamond、Pearl、Platinum、HeartGold、SoulSilver。TID/SID 范围为 `0..65535`，最多 5 位十进制；没有选择时使用 `- / Diamond / 12345 / 54321` 的临时默认值，不自动创建持久记录。

## 2. 独立持久化

IndexedDB 仍使用 `pokerngkit` 的 `app-data` store，但 G4 记录键为 `gen4-profiles`；localStorage 镜像键为 `pokerngkit-gen4-profiles-v1`。展开状态为 `pokerngkit-gen4-profile-panel-expanded`。这些键与 G3 的 `gen3-profiles`、`pokerngkit-gen3-profiles-v1` 和展开键完全分离。

展开状态由 `App.tsx` 统一协调并通过 `profilePanelState.ts` 持久化。G4 Static 页面任意展开 G4 存档、全局个体值计算器或 Encounter Lookup 时，另外两个工具会收起；切回 G3 页面不会读取或改写 G4 存档的展开偏好。

导入导出格式为 `pokerngkit.gen4-profiles`，schema 版本为 `1`。IndexedDB 失败时回退 localStorage；清除操作只清除 G4 记录和镜像。

## 3. 界面

G4 Static 页面右下角的统一工具轨使用独立 `Gen4ProfileControls` 面板，编辑器在 HGSS 版本显示全国图鉴、未知图腾拼图和未知图腾字母勾选项。桌面面板在工具轨左侧独立打开，窄屏在上方打开，并支持点外关闭、`Escape` 和关闭按钮；后两种方式会恢复触发按钮焦点。G3 Static/Wild/ID 页面继续显示独立的 G3 存档控件。

## 4. 来源与验证

界面字段对照 PokeFinder 4.3.2 `Core/Gen4/Profile4.hpp`、`Form/Gen4/Profile/ProfileEditor4.ui`、`ProfileManager4.ui` 和 `Form/i18n/PokeFinder_zh.ts`。schema、repository、备份和 localStorage 兜底测试位于 `src/features/gen4profiles/*.test.ts`。
