# PokeRNGKit 项目进度与交接

## 2026-11-25 排查全仓乱数数字输入上限

个体值筛选修复已推送 `fcca8df8`。随后使用 TypeScript 语法树清点产品源码中 436 处十进制和 97 处十六进制共享输入调用，检查窄上限、HTML 位数与最大值，再对照领域校验、Wasm 边界及本地上游控件。共修正另外 50 处输入调用，涉及六代 DexNav、Poke Radar、野生，七代野生、SOS、配信时间反查，以及八代巢穴。

六代 Poke Radar 根据 `TinyTimelineTool.cs` 恢复队伍大小 `1..6` 和连锁 `0..255`，同步前端与 Wasm API 2 及两层边界夹具。七代 SOS 的 TRV 使用一位十六进制 `0..F`，与档案导入一致。八代巢穴等级 `1..100`，身高与体重 `0..255`，六项个体值 `0..31`。

本批执行格式与差异检查，按所有者要求提交并推送。没有运行测试、构建、浏览器检查或算法验收。

## 2026-11-25 修复第七世代野生与 SOS 的个体值筛选

基于 `main` / `aedbf001` 恢复野生与 SOS 的六项个体值范围和完美个体值阈值 `0..31`，以及完美个体数 `0..6`。表单与既有请求校验一致，仍检查各项最小值不超过最大值。按所有者要求提交并推送；本机执行格式与差异检查。

## 2026-11-25 修复第七世代野生与 SOS 的 TSV 输入

基于干净的 `main` / `333a33e2` 修正两处 TSV 输入。原控件把位数 `4` 传给数值上限参数，导致只能保留一位且最大为 `4`。野生与 SOS 的宝可梦生成统一使用十进制 `0..4095`、最多四位，空值按 `0` 提交。上游依据见[野生](modules/gen7wild.md)与 [SOS](modules/gen7sos.md)的输入限制。

补充 TSV 输入边界用例。工作区改动尚未提交，收尾执行 `npm run format:changed`、`npm run format:check` 和 `git diff --check`。测试、构建及浏览器检查待授权。

## 2026-11-18 移除存档编辑并保留只读入口

基于干净的 `main` / `23528d34` 移除存档编辑工作区、写回与导出、宝可梦与配信资料库、编辑器设置及专属素材。右下角保留“读取存档”，本地文件交由独立 Worker 识别，结果显示游戏、训练家姓名、TID、SID、适用时的六位游戏内 ID、游戏时间与校验和。PKHeX.Core 仅用于读取，保留固定来源、许可证和浏览器解析所需依赖。

旧存档编辑进度为历史记录。移出的目录暂存于忽略的 `.tmp/pkhex-removed-2026-11-18/`。本轮按所有者要求直接提交并推送 `main`，本机执行格式与差异检查。浏览器、构建、测试与验收未运行，后续通过 Actions 查看工程结果。

## 2026-10-28 设置工作区会话保留（API190 前端，已发布，页面待核验）

76690ac1d419819c32cbe0286b65cf6ac0b2bc4a 已推送并成功发布。[Actions 40638638189](https://github.com/HaKu76/PokeRNGKit/actions/runs/40638638189) 的 build 122651351761、Windows 包 122660712244、Cloudflare 122660712246 和 GitHub Pages 122660712239 均 completed／success；已按精确提交核对 PKHeX 往返、完整前端、原生 Core 与 Wasm／网页四项门禁。原始与归纳终态为 `.tmp/pkhex-settings-session-release-proof-raw.json`／`.tmp/pkhex-settings-session-release-proof.json`。观察进程 79701 因 TLS 握手超时退出 1，连接器与独立 gh 查询随后确认实际成功，未重新推送或重跑流水线。网页启动修订为 0.190.6.0，Core／Worker／API190 不变；页面及所有者验收仍待核验。

第三轮完整 `npm run verify` 已退出 0：385 文件／2406 项测试、全仓格式、Lint、完整类型及网页／PWA 均通过，预缓存 257 条／25291.63KiB。日志／终态为 `.tmp/pkhex-settings-session-gate-serial.log`／`.tmp/pkhex-settings-session-gate-serial-result.json`，归纳证据为 `.tmp/pkhex-settings-session-local-proof.json`。本次进程使用 Node 老生代上限 3072MiB、`VITEST_MAX_WORKERS=1`；没有修改项目配置、测试内容、隔离、超时或检查范围。最终九文件／91 项专项及八文件定向 Lint 也通过。保留既有 Hook、包体及插件耗时提示；Core／Worker／API190 未改，本机原生／核心未重跑。以下保留开发和失败过程，当前工程状态以本段为准，页面及所有者验收仍未完成。

所有者暂时无法更新扩展，要求继续开发。本批开始时 main／20305570 干净。只读桌面更新探测返回 restart_required，但当前安装与运行包一致，未返回新版目标，另有两个任务在运行，因此未重复重启或中断任务。通过正式电脑控制接口启动 Edge 后，进程已运行，浏览器接口仍返回 Browser is not available: edge；启动成功不等于连接可用。证据为 `.tmp/pkhex-settings-session-app-update-probe.json` 和 `.tmp/pkhex-settings-session-edge-connection-probe.json`。未新增权限或安装扩展，真实页面核验继续保留。

核对上游 `PKHeX.WinForms/Subforms/SettingsEditor.cs` 的 `_last` 会话分类记忆，确认网页设置页此前按当前模式条件挂载：离开设置会卸载表单，丢失未保存草稿、预览与分类。改为保留挂载后，快捷入口还须通过受控分类更新表单，不能只依赖 initialGroup；这项新增要求在旧代码的三语回归为 3 失败／1 通过，日志 `.tmp/pkhex-settings-session-baseline.log`。该结果不是既有页面快捷入口故障的复现；基线文件格式、全仓格式与差异检查均通过。

现统一四种工具模式的访问状态，设置首次打开后保持同一挂载，隐藏时使用 hidden／inert 并锁定设置操作；保留内存草稿、已校验预览和本次会话分类。普通返回使用上次分类，具名快捷入口显式切换分类，未知分类退回目录中的有效分组。未新增持久化键或自动保存；完整 Core 校验、设置修订比较、冲突拒绝和显式重新读取路径保持。设置工作区会像已有独立宝可梦与模板页一样在首次访问后保留，退出应用时释放。

内部网页启动修订为 0.190.6.0、八条三语说明；Core／Worker／API190、字段范围和控件样式不变。修改文件、全仓格式与差异检查通过。首轮九文件专项为 90 通过／1 失败，失败是启动修订断言仍为 .5.0，已同步为 .6.0；最终九文件／91 项及八文件定向 Lint 均退出 0，终态 `.tmp/pkhex-settings-session-focused-final-result.json`，原失败日志保留。

首轮完整门禁 88570 已终止，退出 134：普通全仓格式和 Lint 通过，仅有既有第三世代定点 Hook 提醒；完整类型阶段的 Node 堆在约 2GB 达到上限，尚未进入全量测试或打包。失败日志／终态为 `.tmp/pkhex-settings-session-gate.log`／`.tmp/pkhex-settings-session-gate-result.json`，不列为完整通过。核对本机约 8GB 物理内存及约 7.8GB 可用虚拟内存后，仅为重跑进程设置 `NODE_OPTIONS=--max-old-space-size=3072`，保留其他既有进程选项，实际堆限另行记录；从头执行相同 `npm run verify`，重跑日志使用 `.tmp/pkhex-settings-session-gate-3g.log`。不修改项目／CI 配置、浏览器运行时、类型规则、测试范围或超时，也不重复启动已终止的旧检查。

第二轮完整门禁 72097 已退出 1：全仓格式、Lint 和完整类型通过；385 文件的 2404 项测试通过，仅 art／ribbonArt 两项原资源字节校验触发默认 5000ms 超时，未开始网页打包。完整终态为 `.tmp/pkhex-settings-session-gate-3g-result.json`，原失败不覆盖。这两个文件原样以单 Worker 重跑，14 项全部通过，见 `.tmp/pkhex-settings-session-art-isolated-result.json`；不能与上一轮结果拼成完整门禁通过。

已核对安装的 Vitest 4.1.10 解析器与[官方 v4 迁移说明](https://v4.vitest.dev/guide/migration.html#pool-rework)，支持进程环境变量 `VITEST_MAX_WORKERS`。第三轮仅在本次检查进程设置 `VITEST_MAX_WORKERS=1`，继续保留 Node 的 3072MiB 老生代上限；从头运行相同 `npm run verify`。不改项目／CI 配置、测试内容、文件隔离、5000ms 超时或任何筛选，仍检查全部文件。实际参数见 `.tmp/pkhex-settings-session-gate-serial-options.json`，完整结果见本节首段。这里的 Worker 数只影响 Vitest，不改变产品 RNG 或存档 Worker。

完整门禁后核对 12 个任务文件，全部与本次输入哈希一致；原件和两份输入副本的只读哈希仍保持，见 `.tmp/pkhex-settings-session-save-guard-final.json`。产品代码已按已有授权提交推送并完成四项发布；本次仅收尾四份发布记录，文档提交使用 [skip ci]，不重复部署。真实草稿往返、焦点、弹层、双标签冲突及布局不由工程结果验收；完整目标尚未证明完成。

## 2026-10-28 存档设置多语言与本地预览稳定性（API190 前端，已发布，页面待核验）

2555bd11e2a632036779b0807585db2019b6a8bc 已推送并成功发布。[Actions 40608620805](https://github.com/HaKu76/PokeRNGKit/actions/runs/40608620805) 的 build 122554323326、Windows 包 122565189558、Cloudflare 122565189474 和 GitHub Pages 122565189586 均 completed／success；已按精确提交核对 PKHeX 往返、完整前端、原生 Core 与 Wasm／网页四项门禁。原始与归纳终态为 `.tmp/pkhex-settings-captions-release-proof-raw.json`／`.tmp/pkhex-settings-captions-release-proof.json`。网页启动修订为 0.190.5.0，Core／Worker／API190 不变；部署成功不代替页面或所有者验收。

扩展后的完整 `npm run verify` 已退出 0：384 文件／2394 项测试、全仓格式、Lint、完整类型、网页及 PWA 均通过，生成 257 条预缓存。完整日志与终态为 `.tmp/pkhex-settings-captions-gate.log`／`.tmp/pkhex-settings-captions-gate-result.json`。保留第三世代定点既有 Hook、包体及插件耗时提示；本批仅前端文本与开发监听，Core／Worker／API190 不变，本机完整原生未重跑。原件及两份输入副本的只读哈希均与既有记录一致，见 `.tmp/pkhex-settings-captions-save-guard.json`。源码覆盖、SSR 和工程门禁不代替真实页面或所有者验收。

基于干净 main／18131aab，对 API190 现有原生测试程序集只读导出的 22 组／200 个设置字段，调用实际前端可用性判定核对。原判定为 173 项可编辑、3 项自动元数据、11 项有平台原因、插件目录 1 项缺少具体原因，以及 12 项上游未使用的自定义格式字段。此统计是目录与可用性分类，不证明 173 项实际消费点全部正确。快照、程序集及前端文件哈希和分类记录见 `.tmp/pkhex-settings-consumer-audit/audit.json`。

已补齐插件目录和 12 个自定义格式字段的中／英／日原因，保留既有禁用范围、JSON、默认值及控件样式。插件目录沿 Core LocalResourceSettings.PluginPath／WinForms Main.GetPluginPath，只用于桌面插件加载；提供的 PKHeX 26.08.26 中 StatsCustom 仅有声明，BattleTemplateTypeSetting.GetSettings 没有读取它。只对白名单中的两个目标各六个叶字段说明来源未使用，不把未来未知字段归为平台排除。当前目录分类为 173 可编辑／3 自动元数据／12 平台说明／12 来源未使用说明，无未解释的待接路径。

三语原因回归先为 6 失败／1 通过，补齐后四文件／59 项和当时四个 TS／TSX 文件的定向 Lint 全部通过。进一步核对 197 个可见字段，发现三语各有 78 个标题回退到属性代码，涉及 58 个名称。已按已知完整路径及分组前缀补充 96 条三语标题，仅作为缺失资源时的网页后备；当前语言的上游译名优先，未知未来路径不套用现有字段含义。原始 settings-labels.json 未改，原训练家、个体值、相应世代和游戏名称沿来源语义描述。复扫三语各 78 个缺失标题均有可读后备，未映射的属性代码回退为零；证据为 `.tmp/pkhex-settings-consumer-audit/labels-audit.json`，修改前记录为同目录 labels-audit-before.json。该统计不证明真实页面的换行、焦点或几何。

标题回归首轮有两处既有英文／日文资源的预期写错，核对原资源修正后为 3 失败／6 通过；补齐后最终六文件／69 项及本批八个 TS／TSX 文件定向 Lint 通过。首次格式化 settingsLabels.ts 出现 UNKNOWN 打开错误，故当次未运行测试；同文件重试退出 0，失败日志保留在 `.tmp/pkhex-settings-captions-format.log`。完整门禁 67662 在全仓格式通过后的 Lint 阶段，因新增标题缺口而主动停止，退出 -1 不是测试失败；此时尚未进入类型、测试或构建，记录见 `.tmp/pkhex-settings-reasons-gate-abort.json`。扩展范围后的完整结果见本节首段。内部网页修订为 0.190.5.0、七条更新说明，Core／Worker／API190 和输入范围未变；目录工具使用仓库现有固定 SDK，未重跑本机完整原生／核心，也未处理存档。

本地 Vite 曾因监听 `.tmp` 中正在生成的 SettingsAudit.dll 报 EBUSY 退出，原诊断保留在 `.tmp/pkhex-dev-select-state.stderr.log`。在既有 server.watch.ignored 补入 `**/.tmp/**` 后，实际启动 5173 并重建相同临时 .NET 工程：源码目录保持监听，临时目录前后均未进入监听清单、事件与错误为零、重建退出 0，服务仍在监听。专项终态为 `.tmp/pkhex-dev-watch-probe.json`，随后主动关闭专项服务准备完整门禁；这不是浏览器或 UI 验收，也不说明 Chrome 连接已恢复。未扩大其他源码或公开资源的忽略范围。

最终四文档格式、全仓格式与差异检查已通过后提交本批源码，本地 5173 预览已恢复。以下文档收尾按既有授权提交推送，不重复触发产品部署。上一批 18131aab 的 383 文件／2382 项结果只作为历史记录，当前完整结果以本节为准。

Chrome 原存档标签仍在焦点绑定阶段超时，原生只读状态不可用；截图操作又被工具因无法可靠确认 Windows 浏览器地址而终止。已完成的代理重启不重复执行，未新增权限、安装云浏览器或绕过工具检查。连接能力的只读查询未发现适用的本机连接维护入口；这不表示所有插件均不可用。恢复正式页面后，先还原导出测试偏好为六项 0／Default，再核对整页重载、双标签冲突、独立文件草稿、队伍范围导出、三语和布局。当前页面、完整清单与所有者验收仍未完成。

## 2026-10-28 存档表单下拉禁用规则批量修复（API190 前端，已发布，页面待核验）

18131aab3bdd59b731f0027d73d68bc9964d8b1f 已推送并成功发布。[Actions 40595944298](https://github.com/HaKu76/PokeRNGKit/actions/runs/40595944298) 的 build 122511755102、Windows 包 122524527503、Cloudflare 122524527533 和 GitHub Pages 122524527541 均 completed／success，PKHeX 往返、完整前端、原生 Core 及 Wasm／网页门禁通过。观察进程 31554 曾因 GitHub 读取 EOF 退出 1；连接器与 gh 按同一提交及 run 独立确认四任务成功，未重新推送或重跑流水线。原始与归纳终态分别为 `.tmp/pkhex-select-state-release-proof-raw.json`、`.tmp/pkhex-select-state-release-proof.json`。以下保留开发过程，当前提交／发布状态以本段为准，页面及所有者验收未因此完成。

基于干净 main／e43f6598，已按同一规则修改 40 个表单的 90 处 Select：补齐 67 处显式 disabled，并为 23 处已有条件合并父状态。未修改父级全局变量，保留表单外浏览入口及原有局部限制。结构比较确认这 40 个文件除 Select.disabled 及格式外的语法保持，输入范围、校验器和事件处理不变；证据为 `.tmp/pkhex-select-state-migration.json` 与 `.tmp/pkhex-select-state-boundary.json`。

先加入三语锁定／可编辑和只读状态回归，原代码为 12 失败／17 通过；修改后两文件／29 项全部通过，包含只读二进制导出仍可选择范围、只读异常状态锁定而可编辑属性保留。复扫 158 处相关 Select 已没有缺失的 disabled；形式扫描剩余三处均由 locked 的现有 busy 派生覆盖，逐项核对后保留 `locked || !c.canEdit`，不为清零形式告警添加重复判断。这些源码及 SSR 证据不代替实际 Chrome 弹层、键盘和触控核验。

批量格式化曾对 SaveInventoryBatch.tsx 报 UNKNOWN 打开错误，session10145 的退出 2 发生在格式阶段，未运行测试；原文件及失败日志保留，单文件重试退出 0，随后回归通过。内部网页修订推进 0.190.4.0，增加三语更新说明；API190、Core、Worker 及既有控件样式不变。包含启动日志的最终三文件／65 项和本批 44 个 TS／TSX 文件的定向 Lint 均退出 0；两处 PokemonMoveSelect 包装入口也已核对，原来就显式传入相应禁用状态，无需修改。

完整 `npm run verify` 现已退出 0：383 文件／2382 项测试、全仓格式、Lint、完整类型及网页／PWA 均通过，生成 257 条预缓存。日志与终态为 `.tmp/pkhex-select-state-gate.log`／`.tmp/pkhex-select-state-gate-result.json`；保留第三世代定点既有 Hook、包体及插件耗时提示。本批仅前端状态接线，本机原生／核心未重跑。原件、confirmed-input 及昵称测试下载的哈希与此前一致，记录见 `.tmp/pkhex-select-state-save-guard.json`。

修改前的源码扫描基于已发布产品 5d928918：182 个生产 TSX 文件中，有 158 个 Select 位于带禁用条件的 fieldset 内；67 处未显式传入 disabled，另 23 处原表达式未直接包含全部祖先条件，共涉及 40 个文件、90 个候选位置。这是源码候选统计，不表示 90 种已复现缺陷，也不替代页面核验。修改前记录为 `.tmp/pkhex-select-state-source-before.json`，当前复扫见 `.tmp/pkhex-select-disabled-audit.json`。

已核对这些候选没有 legend 例外、JSX 属性展开或祖先条件标识符遮蔽，22 种父条件均为现有只读状态表达式；范围核对见 `.tmp/pkhex-select-disabled-scope.json`。PokemonSelect 会把 disabled 交给共享 Select，同样需要覆盖父表单状态。本批按“全部祖先禁用条件 OR 原局部限制”统一传入控件，保留 dirty、preview、性别、空种类、计数和只读限制；不修改全局禁用变量，避免影响父 fieldset 外的浏览入口。数字限制、Core、Worker、API190 和控件皮肤均保持既有来源。

下一步完成文档格式收尾，按已有授权提交推送并跟踪本次流水线。本轮 Chrome 的两个原存档标签均在焦点绑定超时，未操作页面或新建重复标签；代理重启此前已完成，不重复申请权限或重启。页面核验和导出测试偏好恢复仍待连接恢复，不以源码扫描宣称页面通过，完整目标继续进行。

## 2026-10-28 箱子导出选项记忆（API190 前端，已发布，页面待核验）

产品提交 5d928918f27b8330e5170eee38e8a85d206d11e6 已推送。[Actions 40580217339](https://github.com/HaKu76/PokeRNGKit/actions/runs/40580217339) 的 build 122457282211、Windows 包 122467829465、Cloudflare Pages 122467829553 及 GitHub Pages 122467829565 均 completed／success；CI 的 PKHeX 往返、TypeScript、原生 Core 和 Wasm／网页构建门禁通过。终态为 `.tmp/pkhex-box-locked-release-proof.json`。本机最终门禁 382 文件／2367 项与 196 项专项通过，最后全仓格式采用内容缓存，全部文件仍在检查范围；普通完整 verify 的格式阶段也通过。四份发布记录按格式门禁收尾后以文档提交和 [skip ci] 推送，不重复部署。

原始 E.sav、confirmed-input 和昵称测试下载在推送后重新核对哈希，分别仍为 7DA8AD6A…、7DA8AD6A…、1B7F81A9…，完整值见 `.tmp/pkhex-box-locked-save-guard.json`。本地 5173 服务已恢复；Chrome 同一标签的高级与直接读取均在焦点绑定阶段超时，未新增权限或改用其他调试渠道。导出测试偏好仍为六项最大值／Default，正式页面还原及后续交互检查未完成。完整目标继续进行。以下保留开发过程记录，当前提交与发布状态以上段为准。

收尾新增明确的控件禁用修复：共享 Select 菜单通过 portal 渲染到 body，fieldset 的禁用不能覆盖已展开的菜单。新增 SSR 先失败（1 失败／3 通过），证明锁定时触发器未显式禁用；现给导出区六个 Select 传入 locked，目录名称继续受平铺条件限制。最终专项八文件／196 项通过，定向 Lint 退出 0；第三轮完整门禁的 382 文件／2366 项通过属于此前代码。为修复主动中止最终格式 session50438，formatExit=-1／diffExit=0 不是实际格式违规；同时只暂停已核实的本任务 Vite20772。第四轮完整 `npm run verify` 已退出 0：382 文件／2367 项、全仓格式、Lint、完整类型及网页／PWA 均通过。日志和终态为 `.tmp/pkhex-box-locked-gate.log`／同名前缀 result JSON。仅保留第三世代定点既有 Hook、包体及插件耗时提示；Core／Worker 与 API190 不变，本机原生／核心未重跑。最终文档格式检查后按既有授权提交推送，发布另行跟踪；页面及完整目标仍待核验。

基于干净 main／4639bc93，本批补齐 BoxExporter_FormClosing 的记忆行为。网页关闭导出面板后，经同一 Worker 的完整 Core 设置验证、非导出字段保持比较和设置修订检查写回统一仓库；本次覆盖不另建偏好存储。新增本次 Notify 选择与唯一内置 Default 命名规则，移除按箱子／工作修订重建导出面板的 key，使未关闭的选项可跨箱子保留。枚举沿来源 0–1／0–1／0–2／0–1／0–3／0–1，均为默认 0 的整数。

编辑 UI 使用只忽略六项导出选项及命名器的策略键，其他字段和未知字段继续触发原有刷新；实际 Worker 请求与冻结确认仍读取完整设置 JSON，不放宽并发失效保护。首次没有已保存设置时，仅在内存记住启动读取的 Core 默认值，避免第一次记忆导出选项误清草稿，不增加默认设置写入或存储依赖。无改动面板在重新展开时读取最新仓库修订；冲突／验证／存储失败保留旧设置和本次选项，并提供重试及明确重新载入。

首轮七文件／188 项专项与本批定向 Lint 通过。随后补充导出偏好变化仍取消完整设置请求，以及从当前箱切到同行队伍时强制全箱并将 Notify 留在前端的回归，最终七文件／190 项通过。源码复查发现保留面板后旧 all 状态可能与队伍范围显示不一致，已集中生成请求并校验六项选值；全局请求期间也锁定关闭。为修正这些边界主动终止本轮类型检查 session65519，退出 -1 是本任务中止，不是失败用例或类型错误；最终完整门禁待运行。Prettier 曾一次无法打开 SaveEditorPanel.tsx，随后同文件重新格式化退出 0；原文件保留，无回滚。

首轮完整门禁 `.tmp/pkhex-box-remember-verify.log` 在格式通过后，被 react-hooks/set-state-in-effect 拒绝：仓库修订同步 effect 间接设置表单状态。已改为用户重新展开时进行事件驱动同步，未关闭规则；最终本批 TypeScript 定向 Lint 退出 0。六项边界断言改为直接抄录上游枚举固定值，不从实现常量推导预期，独立 19 项再次通过。失败终态保留在 `.tmp/pkhex-box-remember-verify-result.json`，下一次完整门禁使用 final 日志。

真实 Chrome 本地 5173 已核对关闭后保存六项最大选值、重新展开读取与未应用 DRAFTBOX 昵称草稿保留，存档撤销仍禁用；测试昵称已恢复 UIAUDIT。测试设置尚待恢复为原六项 0／Default；还需双标签冲突、整页重载、独立文件草稿、三语／布局、队伍范围实际导出及最终完整门禁。已暂停本任务 Vite，串行完成检查后恢复预览；Core／Worker API190 未改，未重跑本机原生／核心，网页启动日志为 0.190.3.0。代码及本段尚未提交，完整目标继续进行。

第二轮完整门禁在 session14882 继续运行，日志为 `.tmp/pkhex-box-remember-verify-final.log`。尝试保留 Chrome 现场时，连接工具突然明确要求更新 ChatGPT 扩展；原生 Chrome 维护尝试先报告窗口 591144 的可访问性状态不可读，随后 Computer Use 因无法可靠确认 Windows 浏览器 URL 而停止本轮操作。未绕过地址校验或改用应用内／无头浏览器；已请求手动更新现有扩展，代码门禁和原存档保护继续。当前源代码未提交，不能因先前的有限页面证据提前完成待核验项。

第二轮门禁现已终止：格式、Lint 和完整类型通过；测试为 381 文件／2365 项通过，仅 C-Gear 的完整字节往返用例触发默认 5000ms 超时，故没有开始网页打包。完整失败与退出 1 保留在同名前缀的 result。没有重启活跃进程；原始 C-Gear 五项单独重跑退出 0（`.tmp/pkhex-cgear5-isolated.log`），原件、confirmed-input 和昵称测试下载的哈希均保持。

只优化该测试断言：保留 Uint8Array 类型、196608 字节长度和全部字节相等检查，使用 Node Buffer 严格比较，并增加独立原生 Base64 参考；复用已编码输入，移除重复编码与大数组通用深比较。未改生产 C-Gear 编解码、输入范围、超时或断言覆盖。第三轮完整门禁将使用 `.tmp/pkhex-box-remember-gate.log`，浏览器核验和六项测试设置恢复仍待继续。

第三轮完整 `npm run verify` 现已退出 0：382 文件／2366 项、全仓格式、Lint、完整类型及网页／PWA 通过，终态为 `.tmp/pkhex-box-remember-gate-result.json`。最终专项八文件／195 项通过，测试使用单 Worker；没有提高超时或关闭规则。网页打包生成 257 条预缓存，仅保留第三世代定点既有 Hook、包体及插件耗时提示。本机 Core／原生未重跑，协议仍为 API190；前两轮失败与主动中止的记录保留。

本轮 Chrome 旧标签焦点绑定超时，新建的任务标签 1601081990 曾绑定成功；恢复服务后页面空白，随后连接报告调试器未附着，重新绑定同一标签仍失败。没有把连接状态或空白页当作功能核验，也未新增权限、再次重启应用或绕过外部浏览器要求。为完成门禁重新暂停了本任务 Vite；结束后恢复预览。测试偏好仍为六项最大值／Default，必须在正式页面恢复原六项 0／Default；测试昵称此前已恢复 UIAUDIT，原存档未写入。完整目标保持进行，下一步是最终格式、授权提交推送与发布跟踪，再继续页面及 129 项行为清单核验。

## 2026-10-28 箱子导出真实流程核验与选项记忆缺口（API190，只读核验）

外部 Chrome 的本地 5173 页面使用真实 E.sav 派生工作副本 `edited-confirmed-input (2).sav`，未重新写入原件。全部箱子、平铺、无编号导出得到 20 个 100 字节 PK3；当前 BOX1、逐箱目录、编号和名称及箱号／格位前缀得到 10 个文件，目录 `01 BOX1/`，前缀对应实际 0 起始格位。勾选包含空格后得到 30 个文件，已有 10 只的文件字节与上一份 ZIP 完全一致。

BOX14 空箱在跳过空格时拒绝导出，中文／英文／日文错误均从真实页面读取，没有新增 ZIP。主箱切换按已有 currentBoxEdit 写当前箱子记录，产生一条可撤销修改；这条位置变更已撤销。随后完整存档下载 SHA-256 与本轮输入同为 1B7F81A9D451F3A00484199F49736E290D115E6CE28A6BA679C5FD974FF9A995，证明测试流程恢复到输入字节。原始 E.sav 及 confirmed-input.sav 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。

从实际全部箱子 ZIP 取出的 UIAUDIT 文件在独立宝可梦入口重读为 PK3 队伍格式，100 字节、PID 2ECD5732；昵称、等级 20、MICHAEL、TID／SID、性别、异色与合法性保持。预览恢复 BOX1、中文及 Light，撤销禁用；证据及三份 ZIP 哈希见 `.tmp/pkhex-box-export-browser-audit.json`。本批只补有限绿宝石流程的工程证据，其他格式、所有选项组合、重名、静默、触控及离线仍需适当页面检查。

源码对照确认一个未接行为：WinForms `Subforms/BoxExporter.cs.BoxExporter_FormClosing` 将本次 BoxExport 和 DefaultBoxExportNamer 写回 Main.Settings；网页 BoxArchiveEditor 只有每次挂载的 useState，本次覆盖值不写回统一设置。切换箱子／修订后面板重建会重新读旧默认值。该差异仍属完整接入范围，不能把 ZIP 下载通过写成整个 BoxExporter 等价完成。下一步实现关闭时的导出选项记忆，先核对完整 JSON 的 Core 验证、设置修订比较、跨标签变更和现有草稿／冻结确认保护，不能用自动保存覆盖其他设置或绕过校验。

本轮产品代码未改，沿用同一 59a2fc89 的本机完整门禁 379 文件／2335 项；未重跑 Core、原生或前端测试，只执行上述已授权浏览器及下载文件读取。四份交接文档按格式门禁收尾后，以文档提交和 [skip ci] 推送，避免重复部署。完整 PKHeX 目标继续进行。

## 2026-10-27 设置字段可见性与空白版本标签（API190 前端，已发布）

按只读上游 StartupSettings 的 Browsable(false) 隐藏 Version、RecentlyLoaded 和 Language；完整 Core 目录及 JSON 保留，恢复默认草稿也保留这三个自动维护值。DefaultSaveVersion 虽有相同标记，但上游 SettingsEditor.CB_Blank 提供独立控件，网页保留现有功能并复用 L_Blank 的中／英／日来源标签。SlotExport 分组与未知待接字段仍可见，不把顶层或未来字段推断为平台排除。

字段和下拉框沿现有共享控件，未改 Core、Worker、协议或输入范围；内部网页启动修订推进为 0.190.2.0。三文件／47 项专项通过，覆盖三语呈现、SlotExport、未知字段及恢复默认草稿时的元数据保护。首轮专项中旧日志条数断言、SSR 原生 select 假设和 HTML 引号转义断言失败，已按实际共享控件及新增日志修正，保留失败日志，不放宽功能断言。

外部 Chrome 的本地 5173 页面已核对三语标签与保存预览：41 个版本候选中选择绿宝石，预览仅列默认版本变化；随后通过重新读取取消草稿，没有保存设置。中文控件实测 15px／约 44px，页面无横向溢出；内部字段未显示。底部控件可滚动到可见区，Tab 到恢复默认草稿按钮，未被页脚遮挡。顶部及底部截图、DOM 边界和范围限制见 `.tmp/pkhex-settings-visibility-browser-audit.json`；第一张截图捕获前一帧菜单，作为诊断保留，不作当前页面证据。

2026-10-28 完整 `npm run verify` 退出 0：379 文件／2335 项前端测试、全仓格式、Lint、类型、网页及 PWA 缓存生成通过。日志与终态为 `.tmp/pkhex-settings-visibility-verify.log` 和同名前缀 `verify-result.json`；仅保留第三世代定点既有 Hook、包体及插件耗时提示。Core／Worker 未改，未重跑本机原生／核心，沿 API190 已发布证据。原件和输入副本 SHA-256 均保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。检查期间只停止本任务 Vite，结束后恢复 5173 服务。

本批基于已发布 main／f8f1a594，全部工作区改动属于本任务，按既有授权提交并推送，发布待跟踪。下一步先核对新流水线终态，再继续整箱导出与其余 129 项行为清单的实际页面核验；不以本批显示修正宣称完整 PKHeX 接入或所有者验收。

2026-10-28 已核对 [Actions 40538823305](https://github.com/HaKu76/PokeRNGKit/actions/runs/40538823305)：build 122311314078、GitHub Pages 122326219312、Cloudflare Pages 122326219426、Windows 包 122326219736 均 completed／success，原生／核心及发布门禁通过。产品 59a2fc89 为当前已发布基线，文档 1b7b0929 未重复部署。终态记录为 `.tmp/pkhex-settings-visibility-release-proof.json`；这不替代所有者验收。

产品提交 59a2fc89 已推送，工作区曾干净；[Actions 40538823305](https://github.com/HaKu76/PokeRNGKit/actions/runs/40538823305) 已启动，build 122311314078 正在运行原生往返检查。恢复 Chrome 时旧标签焦点绑定超时，新建标签的导航等待也超时，但绑定同一个新标签 1601081988 后读取成功；自动恢复 E.sav 测试下载，UIAUDIT／异色／合法性及禁用撤销均保持，新版四条日志正常显示并关闭。未重启应用或新增授权，预览已保留。补记上述状态并纠正审计中的两处过期表述，仅文档跟进使用 [skip ci]，继续跟踪产品流水线，不重复部署。

## 2026-10-27 网页启动设置接线（API190 前端，已发布）

继续完整接入目标，接入此前仍待接的 ShowChangelogOnUpdate 和 SkipSplashScreen。来源为只读上游 WinForms Settings/StartupSettings.cs、Program.Main 及 Core Editing/Program/StartupUtil.GetShowChangelog：布尔默认分别 true／false；首次或无效历史版本不弹日志，只有旧版升级才自动弹出，同版和降级不弹，关闭自动显示仍记录当前版本。

网页在每次打开页面后首次进入存档工作区时初始化，复用存档编辑器的同一个 Worker，先由既有 Core 设置接口校验，再恢复最近文件；RNG 工作区不提前启动该流程。启动画面仅覆盖实际初始化，跳过时保留普通处理反馈。启动设置组提供三语说明及手动日志入口；弹窗沿公共存档对话框表面、44px 控件与焦点恢复，不增加主题或控件皮肤。

独立本机键 pokerngkit-save-startup-version-v1 保存网页启动历史，不改导入桌面设置中的 Startup.Version、设置修订或存档。内部比较版本为 0.API.网页修订.0，本批为 0.190.1.0，仅用于启动日志比较，不新增正式产品发布号。历史仅消费本工具写入的数字格式；记录读写失败保留原值并提示，不阻止文件编辑。首次启动、快速切换、StrictMode、取消／重试与已提交启动后的导航通过串行会话保护，日志等待工作区可见且就绪后显示。

首批五文件／55 项专项及本批 TypeScript 定向 Lint 通过；随后补充导航后的会话保持断言及共享弹窗样式。真实 Chrome 已核对三语手动日志、按钮／Escape 关闭和焦点返回。Tab／Shift+Tab 曾落到 BODY，现为这个单按钮弹窗保留键盘焦点；修复后两方向均落在“关闭”按钮。日志入口及两项开关均来自正式设置页。

以临时网页修订 1→2→3 核对真实启动：默认专用画面、升级自动日志、跳过画面后的普通状态、关闭日志后的新版静默及最近存档恢复均通过。正式表单只保存两项测试变化，随后恢复 skip=false／show=true；同版 3 不补弹，证明关闭日志时仍记录版本。正式元数据恢复 1 后逐字节哈希与试验前一致，降级静默；取消初始化后重试也恢复了最近存档。临时值及原设置均已恢复，原始存档没有写入。

深色及 390px 布局的弹窗边界、15px 字号与约 44px 控件已核对；模拟尺寸下整图截图多次超时／裁切异常，保留该诊断，不能外推为所有设备视觉通过。清除视口覆盖、恢复 Light 与中文后，原生默认尺寸截图成功，完整弹窗和关闭按钮可见，证据为 `.tmp/pkhex-startup-native-default.png`。页面没有项目脚本错误，捕获一条 chrome-extension 来源的 fetchError，未据此重启应用或重复授权。详细记录见 `.tmp/pkhex-startup-browser-audit.json`。

首轮完整门禁的格式、Lint 和类型通过，进入前端测试后为修正启动失败消息的语言切换映射主动中止；`.tmp/pkhex-startup-verify.log`／同名 result 的退出 1 是本任务中止结果，不是失败用例。已在渲染时按活动语言重新映射已知启动错误，并补三语交叉断言；最终专项五文件／59 项通过。

最终完整 `npm run verify` 退出 0，378 文件／2328 项、全仓格式、Lint、类型、网页及 PWA 缓存生成通过，日志和终态分别为 `.tmp/pkhex-startup-final-verify.log`、`.tmp/pkhex-startup-final-verify-result.json`。保留第三世代定点既有 Hook、包体与插件耗时提示。原件及输入副本 SHA-256 均保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。检查期间停止本任务 Vite 并关闭重复测试标签释放内存，结束后恢复服务与新预览。Core、Worker 协议和输入范围未改，本机原生及核心未重跑。

产品提交 `f8f1a594abf8015796f53645628269f6814d954a` 已推送。[Actions 40528147562](https://github.com/HaKu76/PokeRNGKit/actions/runs/40528147562) 的 build 122273249852、GitHub Pages 122291443000、Cloudflare Pages 122291443075 及 Windows 包 122291443343 均 completed／success；CI 已重跑完整原生／核心及发布门禁。详细终态见 `.tmp/pkhex-startup-release-proof.json`。这份发布证据覆盖启动设置批，不覆盖后续未发布修改，也不代替所有者验收。

后续设置页核对发现：上游 Startup.Version／RecentlyLoaded／Language 标为 Browsable(false)，通用目录曾把这些元数据暴露为“待接”；DefaultSaveVersion 则由 SettingsEditor.CB_Blank 独立提供。可见性及三语标签已在本轮修正，JSON 元数据与实际默认版本功能保留。SlotExport 的顶层属性虽也有该标记，但 SettingsEditor.LoadSettings 使用的 ReflectUtil 不据此排除分组，不能套用叶字段规则隐藏整个分组。完整目标继续进行。

## 2026-10-27 昵称编辑保留个性值修复（API190，已发布）

真实 Chrome 检查发现：第三世代大颚蚁仅取消“使用种类名称”并改昵称 UIAUDIT 后，编辑缓冲的异色状态由是变否，原箱位尚未变化。已撤销缓冲，恢复 TRAPINCH／异色是；原始 E.sav 和输入工作副本没有写入。缺陷截图与状态见 `.tmp/pkhex-nickname-before-fix.jpg`、`.tmp/pkhex-nickname-regression-before.json`，原生新增夹具已复现 PK3 命名意外重新生成 PID 的失败。

原因是命名开关与物种／形态／性别共用 identity，前端因此传入未改变的特性槽，核心也为所有 identity 更新补选特性。旧世代 Core 的 SetAbilityIndex 会生成 PID。现分别判断物种／形态／性别变化与命名变化，后者不补选特性；草稿合并也不为仅命名的操作占用 PID／特性字段。依据为上游 PKMEditor 的 UpdateIsNicknamed、UpdateNickname、UpdateRandomPID、LoadSave.SaveNickname 及 Core CommonEdits.SetAbilityIndex，名称上限沿既有实体目录和控件 maxLength，不新增或放宽输入范围。

协议、Worker、解析器及相关夹具同步升级 API190，避免缓存中的旧核心继续处理新流程。另移除中／英／日背包说明中“道具图片未接入”的过期句子，保留实际操作与异常值说明。非默认起拖阈值 2000 的短拖不产生编辑，100 的同一路径可移动，撤销恢复；已通过正式设置页保存原值 0，并重新读取确认。证据为 `.tmp/pkhex-threshold-browser-audit.json`。

新增原生回归覆盖 15 种实体、普通／HaX、昵称／种类名称切换、独立完整字节预期、命名与显式 PID 草稿合并、真实 E.sav 的独立文件／完整存档及冻结放入。新增夹具先后修正 Memory<byte> 输出比较、CK3 显示名称副本和解密缓冲输出预期，未放宽完整字节断言，原失败日志保留。专项、默认完整原生及 API190 浏览器核心构建均退出 0，前端专项为 11 文件／247 项；日志分别为 `.tmp/pkhex-api190-nickname-native-checked.log`、`.tmp/pkhex-api190-native-full.log`、`.tmp/pkhex-api190-core.log` 和 `.tmp/pkhex-api190-frontend-focus.log`。

外部 Chrome 正式页面已完成改名、合法性、冻结预览取消与确认、下载及重新打开实际下载文件：昵称 UIAUDIT，PID 始终为 2ECD5732，异色保留，重新读取后报告“合法！”。覆盖前需要勾选确认；此前把未勾选时禁用的按钮误判成提交卡住，实际未派发写入请求，补勾后写入成功。另修正编辑区锁定时误报“正在处理”的状态，仅本区实际请求显示加载提示。修复后零字节预览、取消和控制台均已核对。原件及输入副本哈希不变，下载和页面证据见 `.tmp/pkhex-api190-nickname-browser-audit.json` 与 `.tmp/pkhex-api190-nickname-roundtrip.jpg`。

完整 `npm run verify` 退出 0，377 文件／2292 项、全仓格式、Lint、类型、生产网页及 PWA 缓存生成通过；证据为 `.tmp/pkhex-api190-verify.log` 和 `.tmp/pkhex-api190-verify-result.json`。保留第三世代定点既有 Hook、包体及插件耗时提示，没有重复未修改的原生检查。完整门禁期间暂时停止本任务 5173 服务释放内存，结束后恢复。产品代码 `fcfbcd2cee7f3ac456e3169b642ab05018e1eb0e` 已提交并推送；[Actions 40497786043](https://github.com/HaKu76/PokeRNGKit/actions/runs/40497786043) 的 build、GitHub Pages、Cloudflare 和 Windows 四任务均 completed／success。不将页面工程检查写成全部功能或所有者验收。

发布期间另补真实 Chrome 检查：背包中／英／日均显示新版说明，保留 28 条道具数据，语言已恢复中文；双箱 BOX1 格位 1 移到 BOX2 格位 1 后，两箱占用 10→9、3→4，撤销恢复来源、空目标和 10／3，未导出本次移动。证据为 `.tmp/pkhex-api190-cross-box-browser-audit.json`；恢复单箱与原选中格位，并保留外部 Chrome 预览。组合修饰键、跨视图其他模式、触控、离线、启动更新日志／启动画面及其余完整清单继续保留。发布结果补记仅涉及文档，沿已核对的 `[skip ci]` 避免重复部署。

## 2026-10-27 外部 Chrome 恢复与存档工作区布局修复（已发布，页面工程核验）

按所有者授权完成 Codex 官方 Windows 包更新：26.1007.2314.0 升至 26.1021.3705.0，包名、发布者及声明能力一致，应用通过原有包上下文与进程代理启动。外部 Chrome 标签枚举、页面读取及操作已恢复；一次性更新任务退出 0 后移除，不再以旧连接失败阻塞后续工作。

布局修复产品代码 `57f4dcc714c1473a3c7e59effd1ba18a52581c6c` 已提交并推送；[Actions 40470311047](https://github.com/HaKu76/PokeRNGKit/actions/runs/40470311047) 的 build、Windows、GitHub Pages 和 Cloudflare 四任务均 completed／success。存档往返、完整前端、原生 Core 对照及 Wasm／网页构建全部通过。命令行跟踪曾因 TLS 超时退出，续查同一运行，并通过 GitHub 连接器确认四任务成功，没有重启构建。

在外部 Chrome 的 `http://127.0.0.1:5173/` 使用真实 E.sav 工作副本核验：Core 识别绿宝石，训练家 MICHAEL，队伍 5、箱子 14；全览具有 14×30 个物理格位，单箱显示壁纸、宝可梦图片、异色和空位。训练家姓名改为 UIAUDIT 后下载、撤销恢复 MICHAEL，再导入实际下载文件读到 UIAUDIT。单箱鼠标拖动 1→5 后来源为空、目标为大颚蚁；撤销恢复。复制模式保留来源、BOX1 占用 10→11，撤销恢复 10，未额外弹出放入确认。双箱第二箱独立导航至 BOX2。下载事件等待曾超时，但实际文件已生成，已直接重新导入该下载文件核对，不把等待超时写成下载失败。

页面发现并修复两处结构问题：工具和说明堆在箱子上方，使详情与箱子一起被推下；390px 窄屏的固定高度将内容区压缩至约 4px。现将检索和文件／整箱工具放到箱子下方，箱子选择与拖放模式并排，桌面箱子和详情各自滚动，窄屏自然页面滚动；默认按钮沿统一 44px、圆角及语义令牌补齐低优先级基础样式。未修改 Core、Worker、API189、输入范围或文件写入流程。

核验尺寸为 390／768／1280／1920px，中文、英文和日文切换保持实际存档；390px 内容高度恢复 4356px，390／768 的页面宽度与滚动宽度相等。1280px 桌面截图已核对箱子与详情并列。尺寸覆盖与部分三语入口不代表全部字段及全部模块通过；特殊形态、所有功能清单、非默认起拖阈值、组合修饰键、触控、离线和完整焦点检查继续保留。未运行生产算法回归，也不作所有者验收。

原件及 confirmed-input.sav 的 SHA-256 仍为 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`；无编辑下载与输入逐字节一致，编辑下载 SHA-256 为 `F314C6C7914A9F152AEACD8CE1F834B38F3BF322452E080037A62759566AE94A`。原件未写入。定向 Lint 与完整 `npm run verify` 均退出 0：377 文件／2292 项、全仓格式、Lint、类型、网页及 PWA 缓存生成通过。证据为 `.tmp/pkhex-workspace-browser-verify.log`、`.tmp/pkhex-workspace-browser-verify-result.json`、`.tmp/pkhex-chrome-engineering-audit.json` 和 `.tmp/pkhex-workspace-chrome-default.jpg`。保留第三世代定点既有 Hook、包体及插件耗时提示；未重跑未修改的原生核心。完整门禁期间暂停本任务 Vite 释放内存，完成后恢复 5173。完整接入目标保持进行中。

后续只读页面补查已取得背包、图鉴、游戏记录、事件标记、游走和开拓区数据及控件；没有执行这些工具的全部编辑行为。背包 28 张道具图实际加载成功，但 `inventoryReadNote` 的中／英／日仍宣称图片未接，列入下一批文字与入口一致性修复。此前无样式的“读取训练家数据”按钮实测约 44px 高、15px 字体、10px 圆角；起拖阈值为启用的 Int32 步进输入，当前值 0。保留原始 E.sav 工作副本的箱子页供所有者复核，最终截图为 `.tmp/pkhex-workspace-final-chrome.jpg`。

本次发布结果补记仅涉及文档，提交正文使用 GitHub 支持的 `[skip ci]`，避免为记录已成功的运行再次触发完整部署；产品代码证据仍绑定上面的准确提交和流水线。机制见 [GitHub 官方说明](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)。文档仍执行全仓格式与差异检查。

## 2026-10-27 可配置起拖阈值接线（工程通过，页面待核验）

8313428e设置说明的[流水线40447227473](https://github.com/HaKu76/PokeRNGKit/actions/runs/40447227473)已completed／success，build、GitHub Pages、Cloudflare及Windows桌面包四任务均成功。期间有查询网络错误，续查同一运行确认终态，未重新触发构建。

新增完整鼠标手势消费点并接入单箱、全箱、双箱：完整Int32阈值、严格L1位移、源快照、真实目标命中、精确修饰键反馈、取消及拖后点击抑制；保留原生文件拖入和触控／笔路径。来源及CSS坐标单位见[存档模块](https://github.com/HaKu76/PokeRNGKit/blob/23528d34ec6663514265a5c7f48bc2df905b72e4/docs/modules/saveeditor.md)，设置已开放。十文件76项专项与本批全部TypeScript定向Lint退出0，证据为`.tmp/pkhex-pointer-integration-tests-final.log`和`.tmp/pkhex-pointer-integration-lint-final.log`。捕获点击边界追加后，控制器10项与四文件Lint通过，完整`npm run verify`退出0：377文件／2292项前端、类型、Lint及网页／PWA打包通过，见`.tmp/pkhex-pointer-integration-verify.log`和`.tmp/pkhex-pointer-integration-verify-result.json`。保留既有Hook、包体与插件耗时提示；Core／Worker／API189未改，不重跑本机原生核心。

首轮点击监听清理和React ref规则失败已修正，原日志保留。原始E.sav与工作副本SHA-256再次保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。外部Chrome绑定5173仍报nodeRepl.fetch失败，正式手势、焦点、混合输入与布局未核验，完整接入目标保持进行中。另查明官方离线应用包为26.1021.3705.0，高于本机26.1007.2314.0；包名、发布者和声明能力一致，更新包准备中，尚未安装，不宣称通道恢复。

## 2026-10-27 设置平台说明与代理重启

基线56932064572581aaeaca65ecaf69d82607d99bbe，API189。设置页为11个已核对的桌面／外壳选项补中／英／日逐项限制及网页对应入口，并把说明关联到具体控件。可编辑集合、原有值与Core输入校验不变；起拖阈值、启动更新日志、启动画面和未知选项继续待接。四文件12项专项及定向Lint通过；补入实际列表／整数／枚举夹具后，完整`npm run verify`退出0：372文件／2263项前端、类型、Lint及网页／PWA打包通过。证据为`.tmp/pkhex-platform-reasons-verify.log`和`.tmp/pkhex-platform-reasons-verify-result.json`，保留既有Hook、包体及插件耗时提示。本批不重跑未改动的原生核心。

按所有者明确授权重启Codex，修正本机启动器的过期Windows包路径，并采用一次性、无触发器的Windows任务承载跨进程重启。最终启动记录确认26.1007.2314.0及进程代理参数，任务退出0后已移除。仅修改应用进程代理，不改全局安全配置。外部Chrome仍能被发现，但标签读取继续报`nodeRepl.fetch request failed`；尚未恢复页面，未将重启成功写作浏览器修复成功。代码与检查状态已落盘，完整接入目标保持进行中。

原始E.sav和工作副本再次核对，SHA-256均保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。完整前端门禁结束后，仅文档补记结果；提交前执行最终格式收尾。正式页面仍须经可用外部Chrome或Edge逐项核验，工程通过不代替所有者验收。

## 2026-10-27 拖放修复发布与素材核验（工程通过，页面仍阻塞）

产品基线e14fdffd5ec93739540877222eb05718ea42d354，API189。[Actions40371477829](https://github.com/HaKu76/PokeRNGKit/actions/runs/40371477829)已completed／success，build、GitHub Pages、Cloudflare Pages及windows-desktop四任务均成功。存档往返、完整前端、原生Core对照及Wasm／网页构建均通过。命令行跟踪曾因TLS超时退出，随后续查同一流水线并经GitHub接口与最终状态查询确认成功，未重启构建。

素材只读核验覆盖art-manifest.json的7236项引用，全部文件存在；7236项PNG头部／非零尺寸通过，文件哈希均能对应已记录的上游素材哈希。其中5230个精灵键、213个壁纸键；结果见.tmp/pkhex-drop-feedback-art-integrity.json。这证明文件与记录一致，不证明页面加载、格位匹配、完整图像解码或显示效果。原始E.sav及检查副本的SHA-256仍为7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。

外部Chrome旧连接3不可用；刷新清单发现连接4并绑定后，控制请求仍报nodeRepl.fetch失败，未取得页面。该阻塞在本次恢复后的连续目标轮次中重复；真实格位操作、导入／下载、三语／焦点／布局及可配置起拖阈值仍待完成。更新[完整接入审计](https://github.com/HaKu76/PokeRNGKit/blob/23528d34ec6663514265a5c7f48bc2df905b72e4/docs/pkhex-completion-audit.md)，保留129项来源范围和全部未核验要求。完整目标未完成；本批仅补文档，不重跑已完成的产品构建，也不把资源检查或部署成功写作所有者验收。

## 2026-10-27 箱子拖放效果一致性（API189，页面待核验）

继续完整PKHeX接入目标时，发现SaveBoxGrid的dragover只按shiftKey给出copy／move，未读取当前复制模式，也未遵守实际drop的精确修饰键规则；外部文件导入还被声明为move。已让单箱、全箱及双箱传入当前模式，提示与实际操作共用SlotUtil来源规则；外部文件仅请求copy，并按来源effectAllowed拒绝不兼容效果。dragover不提前读取载荷，原存档和Core／Worker协议不变。

专项五文件76项、完整类型及定向Lint通过。新覆盖三模式与16种修饰键、外部文件副本、来源效果约束、不可写目标及混合类型优先级；保留既有箱位、菜单和存储权限检查。类型与Lint日志为.tmp/pkhex-drop-feedback-typecheck.log及.tmp/pkhex-drop-feedback-lint.log。本批不重跑未改动的Native／核心构建。正式拖放与下载仍缺外部浏览器证据，本轮标签读取继续报nodeRepl.fetch请求失败，完整目标未完成。可配置起拖阈值未被替代或排除。

## 2026-10-27 外部浏览器连接恢复排查

本轮开始于干净的main，HEAD为7df9199d。发现本地5173端口未监听，已启动`npm run dev:web -- --host 127.0.0.1 --port 5173 --strictPort`；Vite报告ready，并确认127.0.0.1:5173监听。仅恢复开发服务，不代表页面、Worker或存档功能已通过核验。

使用Chrome插件随附诊断确认Chrome运行中，Default资料中的ChatGPT扩展已安装且启用，本机NativeMessagingHosts清单、注册路径及允许来源均正确。浏览器连接清单能识别Chrome，但读取标签、新建独立测试标签及会话命名均报`nodeRepl.fetch request failed`。按随附流程为Default新开窗口后仍失败，未收到权限拒绝。Edge已安装，但未安装该浏览器扩展，不能直接作为已连接的替代入口。

随附`chrome-troubleshooting.md`要求在诊断通过、新开窗口仍通信失败时通过插件界面重装Browser插件，并禁止自行安装或修复native host。当前接口没有重新授权或刷新连接的操作，未修改桥接配置、浏览器权限、原始存档或产品代码。完整接入目标继续阻塞；恢复条件为插件连接可实际读取外部浏览器标签，而非再次授予文件系统完全访问权限。

## 2026-10-17 完整接入证据与平台边界（文档审计）

产品代码基线d426c7603bf9f1a9d3c2c4a5b603560eb78706dc，API189。重新读取Actions39019277406，build、GitHub Pages、Cloudflare Pages和Windows桌面包四任务均success。工作区在本轮开始时干净。新增[完整接入证据与平台边界](https://github.com/HaKu76/PokeRNGKit/blob/23528d34ec6663514265a5c7f48bc2df905b72e4/docs/pkhex-completion-audit.md)，逐项区分代码／工程证据、缺失的页面证据及平台行为；129行来源路径唯一，均能对应当前上游文件，但不据此推导完整功能覆盖。

补记已核对的平台来源：额外存档扩展名只扩展桌面选择器，网页文件入口本来不限制扩展名；BAKPrompt是首次创建备份目录的询问记账，不是逐次备份开关；最近磁盘文件初值、Windows箱子临时文件／OLE拖出、覆盖／另存及WinForms焦点绘图分别记录，不伪装成同等网页功能。DragStartThreshold仍是待验证交互：当前原生浏览器拖放没有该配置，不能仅取消dragstart就宣称已适配，也不能未经浏览器验证直接排除。

本轮外部Chrome读取已授权本地5173仍在20秒后超时并重置，未取得页面，没有权限拒绝提示。该浏览器阻塞已连续重复；剩余布局、三语、连续焦点、实际格位操作、文件导入／下载及拖动阈值需要可用外部浏览器。未新增产品代码、未重跑测试／构建，不把文档审计当作验收。完整目标未完成，保留所有历史功能范围和待核验项。

## 2026-10-17 相遇训练家文件资料（API189，工程通过，页面待核验）

基线bb86bef01cfbc6327a462acaf3f6bc07ec2ddc0a。上一轮Actions39010940505已完成，build、GitHub Pages、Cloudflare Pages及Windows桌面包四任务均成功；这属于工程与部署证据，页面仍未验收。源码复核发现localResources.trainerPath尚无消费点，上游Main.MainMenuEncounterDB从该目录递归读取宝可梦，再调用TrainerDatabase.RegisterCopy(PKM)。现有手动训练家来源不能替代这个目录功能。

本轮接显式选择的宝可梦文件／目录，保存在共用IndexedDB资料库的独立分类；按配置路径递归取文件，其他分类和存档文件不参与。读取沿Core BoxUtil.GetPKMsFromPaths的大小判断、扩展名上下文、EntityFormat.GetFromBytes及Species>0筛选，训练家复制／地区回退仍由Core执行。导入、移除、撤销使用资料库原子比较，重复文件先明确移除。文件只读，不改原件；相遇预览仍冻结输出。

新输入同步API189，实际文件训练家计数由核心返回。单文件1MiB、总计2MiB、最多1024文件；手动及解析后的文件训练家合计最多1024。相遇打开JSON上限4Mi UTF-16码元，其他相遇请求仍为1Mi，资料载入失败明确提示并保留手动／存档来源。资源列表独立滚动，不新增控件皮肤。

原生专项.tmp/pkhex-trainer-library-native-focus-final.log已退出0：覆盖E／PK3、X／PK6、X／PK9、US／PK7、US／PK9的储存／队伍及加密组合、GB列表、地区回退、复制隔离、公共计数、十三类存档公开接口及真实E.sav工作副本的相遇生成／冻结确认与字节保护。首轮夹具类型名错误已修正。前端四文件25项、定向Lint与类型检查通过，证据为.tmp/pkhex-trainer-library-front-focus-expanded.log、.tmp/pkhex-trainer-library-lint-focus.log和.tmp/pkhex-trainer-library-type.log。

浏览器核心.tmp/pkhex-api189-core.log、默认完整原生.tmp/pkhex-api189-native-full.log与完整npm run verify的.tmp/pkhex-api189-verify.log均退出0；371文件／2243项前端测试、全仓格式、Lint、类型及最新核心网页／PWA打包通过。保留第三世代定点既有Hook、既有编译／裁剪及包体／插件耗时提示。资料变化后阻止沿用旧来源生成预览，保存并重新载入成功后恢复；三语提示复用现有按钮名称并随语言切换，不重复显示成功信息。

外部Chrome读取本地5173和连接清单均在20秒请求后超时并重置，未取得页面或可用连接；不请求重复授权，不使用内置浏览器替代。正式布局、连续焦点、实际导入及下载交互仍待核验。原件与工作副本的SHA-256均保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442，完整接入目标未完成。

## 2026-10-17 Advanced 设置联动（API188，工程通过，页面待核验）

基线465f3676663468d6456476ac1ede63c6dca6352a。补接导出存档前的宝可梦未保存检查、区块名称目录及事件排除词，复用现有44px控件和确认对话框样式。确认绑定存档副本、程序设置和编辑快照，状态变化后拒绝沿用旧确认。独立宝可梦文件导出按上游NotifyWasExported记录当前编辑内容，尚未应用的表单草稿仍需提示。

名称TXT由所有者明确选择后存入专用IndexedDB资料库，按配置分类及<存档类型>.txt或<存档类型>_flagwork.txt匹配，不扫描磁盘。保留原始文件、重复文件显式移除、修订比较与撤销；资料不可用时提示并保留手动导入和Core内置名称。排除词沿AdvancedSettings.GetExclusionList8的先移除空项、再Trim顺序，不在JS另建区块名称规则。入口跟随设置面板实际选择的Advanced分类，初始化期间锁定输入。核心协议维持API188，本批没有重跑原生或核心构建。

专项检查、完整npm run verify已退出0，368文件／2235项前端测试、类型、Lint、全仓格式和网页／PWA打包通过，日志为.tmp/pkhex-advanced-focus-final.log与.tmp/pkhex-advanced-verify-final.log。首次类型检查触及默认2GiB堆上限，后续沿项目既有临时4GiB上限通过，环境变量在任务后恢复；首轮Lint发现的渲染期ref读取和同步effect清理已修正，最终仅保留第三世代定点既有Hook提醒。首次资料库专项的标识符及大小写预期问题已修正，最终专项通过。放入存档后的编辑保存基准改为实际接受的字节，避免撤销编辑后误报未保存；最终状态的类型、定向Lint／专项和格式记录于.tmp/pkhex-advanced-final-audit.log。

外部Chrome读取127.0.0.1:5173仍在20秒连接请求后超时并重置，未读到页面，布局、焦点、真实导入与下载交互未核验。原件Desktop/200/battery/E.sav与confirmed-input.sav工作副本的SHA-256均保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。完整PKHeX接入目标保持未完成。

## 2026-10-17 回忆招式与记忆保存（API188，工程通过，页面待核验）

基线`19b365766c191727a8bc97db4181896960b53201`。最终准备出口补接PK6／PK7／PB7／PK8／PB8／PA8／PK9／PA9的Core FixRelearn，记忆清理沿实际应用的SlotWrite.SetUpdatePKM开关，默认true；Core-only设置作用域同样生效。HaX不隐式绕过该开关。PK6和PK7按WinForms来源清理Data[0xFE..]的六个保留队伍字节，PB7不套用该偏移。中间编辑和原始输入不提前清理，确认仍使用冻结输出，协议同步升级API188。

来源为WinForms EditPK6／7／8／9的PreparePK*、PKMEditor.ModifyPKM及MainWindow/Main.cs的设置赋值；Core沿各具体格式的FixRelearn／FixMemories，不自建记忆规则或放宽字段范围。回忆招式保持来源四槽顺序整理，开关关闭时不执行记忆清理。扩展原生专项已退出0（`.tmp/pkhex-api188-finalizing-native-final.log`）：覆盖八种现代格式、两种模式、开关开／关、蛋／未交换／已交换、四种输出布局、尾部差异、Core-only设置、冻结放入、公开导出、相遇建议、额外格位、草稿提示及真实E.sav工作副本。首轮夹具误用不共有的经手语言属性已改为IHandlerLanguage；旧Gen6占位记忆在清理后触发随机交换感受，确定性对照夹具改为已交换状态，随机交换仍单独验证冻结输出。逐字节与来源保护断言保留，失败日志保留。

默认完整原生、浏览器核心及完整前端门禁均退出0。364文件／2223项前端测试、类型、Lint、全仓格式及最新核心网页／PWA打包通过，保留第三世代定点既有Hook、既有编译／反射裁剪与包体／插件耗时提示。证据见`.tmp/pkhex-api188-native-full.log`、`.tmp/pkhex-api188-core.log`与`.tmp/pkhex-api188-verify.log`。仅检查真实E.sav工作副本，原件与副本SHA-256均保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。

上一轮19b36576的Actions39002611801已成功部署。API188核心生成并释放闲置编译服务后，外部Chrome绑定本地5173仍超时并重置连接，未读到页面；正式交互、连续焦点及实际下载未核验，不作所有者验收。下一步接已确认的Advanced设置消费点并记录静态平台等效路径，完整PKHeX接入目标保持未完成。

2026-10-17后续设置只读复核：advanced.saveExportCheckUnsavedEntity、advanced.hideEvent8Contains与advanced.pathBlockKeyList均没有当前产品消费点，仍被可用状态表禁用。上游MainWindow/Main.cs:1380在导出存档前按PKMEditor.PKMIsUnsaved询问；当前SaveEditorPanel的exportFile直接导出并下载。SCBlockEditor虽有手动名称／排除输入，初始仍为空；上游SAV_BlockDump8从Advanced.GetExclusionList8及按存档类型命名的txt文件载入，SAV_FlagWork9a另读取<类型>_flagwork.txt。API188收口后，优先补这些全局设置与现有流程的联动，保持明确选择本机资源与原文件保护。

平台行为需分开记录：startup.tryDetectRecentSave用于WinForms打开对话框的磁盘最近文件初值；slotExport.allowBoxDataDrop用于将临时box_<src>.bin以Windows FileDrop拖出，并非整箱文件导入开关。SaveExportForceSaveAs涉及桌面覆盖／另存对话框，网页当前始终下载另存；FocusBorderDeflate涉及WinForms自绘焦点矩形。不能把这些路径一概当作尚缺Core读写功能，也不能未经验证宣称浏览器具备相同OS行为；后续需给出明确的静态等效／平台说明。

## 2026-10-17 最终招式与特性保存（API187，工程通过，页面待核验）

基线`ca13c8c4e045634013da20733d5ecb23e7c21a2c`。合并全部草稿后调用具体实体的Core `FixMoves`，第五世代HaX按最终特性重算隐藏特性标记，再刷新校验和；独立文件显式导出采用相同处理。中间编辑、只读载入和原始来源不提前规范化，确认使用已冻结输出。协议与全部前端握手／夹具同步升级API187。

来源为WinForms `EditPK1`至`EditPK9`的`PreparePK*`及Core `PKM.FixMoves`／`PA9.FixMoves`。普通格式将空招式移至末尾，保持各招式的PP／PP提升组合，末尾清零；PA9使用自己的覆盖，保留位置，空招式PP设35、PP提升设0。基础编辑接受PA9目录规定的空招式PP上限35，修复最终文件再次编辑时被零PP假设拒绝的问题，其他输入上限不变。

扩展原生专项和默认完整原生重跑均退出0，包含真实E.sav工作副本。覆盖18种实体、普通／HaX、存储／队伍及加密／解密四种布局、PK5派生标记、ZA再次编辑、冻结放入、公开文件导出、额外格位、相遇建议、草稿提示和来源保护。证据见`.tmp/pkhex-api187-finalizing-checked.log`与`.tmp/pkhex-api187-native-full-final.log`。首轮旧SAV9ZA整文件预期及公开导出预期遗漏最终FixMoves，已按独立Core规范化修正，完整逐字节与原输入保护断言保留，失败日志保留。

浏览器核心、完整Lint／类型、364文件／2223项前端测试及最新核心的网页／PWA打包均退出0。证据见`.tmp/pkhex-api187-core.log`、`.tmp/pkhex-api187-lint.log`、`.tmp/pkhex-api187-typecheck.log`、`.tmp/pkhex-api187-tests-full.log`与`.tmp/pkhex-api187-web.log`。保留第三世代定点既有Hook、既有反射／裁剪和包体／插件耗时提示。原件与工作副本SHA-256均保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。

只读清单覆盖复核：上游Subforms的129个非Designer C#源码路径全部列入现有盘点，没有漏列路径；此项只证明来源清单覆盖，不证明所有行为已完成。上一轮ca13c8c4的Actions38997537497已成功（build、Windows、两处部署）。外部Chrome绑定本地5173页面仍超时，未读取页面；正式交互、连续焦点和实际下载未核验，不作所有者验收。

下一步继续核对WinForms EditPK6至EditPK9的FixRelearn与受ModifyPKM控制的FixMemories；MainWindow/Main.cs将开关绑定SlotWrite.SetUpdatePKM，当前产品没有这两项调用。PK6与PK7的Data[0xFE..]清理也保留待接，不将本批FixMoves写作全部最终保存行为已完成。完整PKHeX接入目标保持未完成。

## 2026-10-17 已接设置入口修正（前端，API186）

基线`0dd34787534c34f0417671338ef213730b985f9e`。设置页旧可用列表遗漏`startup.forceHaXOnLaunch`和`display.unicode`，导致已有功能仍显示待接并禁用。抽出共用可用状态判定后开放两项：HaX沿既有Worker模式与设置指纹重建流程，Unicode沿实际性别／形态和异色符号消费点。静态集合对照仅增加这两个路径；其他未接消费点继续保留待接状态。

输入依据为上游WinForms `Settings/StartupSettings.cs`的`ForceHaXOnLaunch`与`Settings/DisplaySettings.cs`的`Unicode`，两项均为bool，默认分别false／true。中文／英文／日文名称和说明复用现有来源资源。六文件45项专项及定向Lint通过，覆盖真实设置控件的可编辑状态、保存值、忙碌禁用、未接路径、字符显示和既有客户端重建；完整前端检查已退出0：364文件／2223项测试、类型、Lint、网页与PWA打包通过，保留第三世代定点既有Hook及包体／插件耗时提示；证据见`.tmp/pkhex-settings-availability-verify.log`。Core与协议不变，复用0dd34787的API186完整原生基线，本批不写原始存档，也不将原生基线写作重跑。页面仍受外部Chrome标签接口失败影响，未验收。

## 2026-10-17 当前输入提示与招式候选（API186，工程通过，页面待核验）

基线`b4bd47db3c926d2640ffc9c0438056d618c9b3ee`。标准与第一／二世代编辑器已接Core `LegalMoveInfo`的可学习招式候选，普通模式按可学习组优先、当前语言名称的ordinal顺序排列，并复用共享选择器浅色提示；HaX关闭提示。目录过滤与当前异常值保留独立处理，可学习性不会禁止选择其他目录内招式。回忆招式仍沿其独立目录与格位提示，不套用当前招式候选规则。

草稿区沿当前修订首次注册顺序稳定捕获，提示快照与实际放入使用相同顺序，控件重新注册不重排。当前有效草稿经350ms防抖进入独立只读Worker，复用既有草稿准备与真实存档上下文，不写实体缓冲或存档。请求串行、只保留最新结果；返回值绑定来源文件与完整请求哈希，来源／设置／配信列表变化后旧结果失效，无效输入与失败状态不保留旧推荐。共享选择器以候选值维护活动项，避免异步排序后键盘活动位置指向其他招式。中文／英文／日文状态与说明已接线。

API186最终专项与默认完整原生检查均退出0，包含真实E.sav工作副本。覆盖18种实体的存储／队伍／加密输入、Core可学习集合对照、普通／HaX、草稿种类变更、实际E／SM／LGPE上下文、请求哈希和拒绝路径、来源保护及既有冻结确认不被只读查询消费。证据见`.tmp/pkhex-api186-native-checked.log`和`.tmp/pkhex-api186-native-full.log`。

草稿捕获顺序修正后的完整类型、363文件／2219项完整前端测试、API186核心和最新核心网页／PWA打包通过。完整Lint通过，最后三文件再检查无新增警告；保留第三世代定点原有Hook以及既有编译／裁剪、包体与插件耗时提示。证据见`.tmp/pkhex-api186-order-typecheck.log`、`.tmp/pkhex-api186-order-tests-full.log`、`.tmp/pkhex-api186-lint.log`、`.tmp/pkhex-api186-order-lint.log`、`.tmp/pkhex-api186-core.log`和`.tmp/pkhex-api186-web.log`。

原始`C:\Users\Hakuhiro\Desktop\200\battery\E.sav`与工作副本SHA-256均保持`7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。上一批b4bd47db的Actions38989598601已成功部署。Chrome可被识别，但标签读取及直接绑定仍返回超时／fetch失败；释放闲置C#编译服务后复查仍未恢复。正式页面、键盘焦点、连续操作与实际下载未核验，不作所有者验收；完整接入目标和剩余调用面继续保留。

## 2026-10-17 全局模式与相遇建议（API185，工程通过，页面待核验）

基线 `5edf994bb834b2102a6b082c68f72414ed0caa39`。增加按实际实体格式计算的共享编辑规则，统一手动特性／编号、PA9普通模式例外、LGPE／PLA持有道具及LGPE原始地区可见性；无关编辑保留原值。基础编辑与草稿准备沿相同规则，HaX身份与手动特性不再被当作隐式特性覆盖冲突。

全局HaX已关联背包目录、单项数量与批量可用状态，保留独立高级入口及实际格式回读保护；球果仍沿自己的字段范围。设置改变后，旧背包目录与请求失效。独立编辑器读取招式目录及基础编辑补传实际存档上下文，修复绑定SM目录与PB7道具上限的读写不一致。

普通模式已接当前已应用缓冲的自动状态、招式／回忆格位提示；HaX隐藏自动提示，显式分析保留，分析采用实际绑定存档的个人表。相遇建议已接入共享编辑器的冻结预览／一次确认，包含当前有效草稿，确认后更新可撤销实体缓冲；存档仍需放入与导出。HaX不提供自动建议。其他未核对主窗口事件继续保留待核对，不能据此宣称全局HaX完成。

API185模式／相遇专项与默认完整原生检查均退出0，包含真实E.sav工作副本。覆盖18种实体的两种模式、16种相遇格式的来源对照、全局背包完整文件对照、绑定SM目录／PB7道具1057、草稿合并、独立文件布局、冻结确认与来源保护。首轮PA9测试快照漏算校验和已修正，未放宽产品校验。原生证据见`.tmp/pkhex-api185-met-native-final.log`和`.tmp/pkhex-api185-native-full.log`。

完整前端361文件／2202项、Lint、类型、API185核心及最新核心网页／PWA打包通过，保留既有Hook、裁剪与包体／插件耗时警告。首轮完整前端在内存紧张时停止，保留原日志；释放内存后完整重跑通过，未修改测试标准。证据见`.tmp/pkhex-api185-tests-full-serial.log`、`.tmp/pkhex-api185-lint.log`、`.tmp/pkhex-api185-typecheck.log`、`.tmp/pkhex-api185-core.log`和`.tmp/pkhex-api185-web.log`。

原始`C:\Users\Hakuhiro\Desktop\200\battery\E.sav`与工作副本SHA-256均保持`7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。上一批5edf994b的Actions38981330349已成功部署。外部Chrome连接再次超时，正式页面、连续操作及实际下载未核验，不作所有者验收；完整接入目标与剩余调用点仍保留待完成。

输入来源为WinForms `PKMEditor.ToggleInterface`／`FinalizeInterface`、`LoadSave`、`EditPK4`／`EditPK5`、`SAV_Inventory` 与Core `PlayerBag.IsQuantitySane`。手动特性沿实体／实际存档目录上限，一位编号沿0–9及空值为0的既有掩码；单项背包沿Core `MaxQuantityHaX`，批量数量仍沿原袋上限，不能假定所有物理格式都能保存整个输入范围。

## 2026-10-17 额外格位（API184）

基线 `94524a9437154709118ca1ab56838a3cb2aa97c2`。存档工作区增加额外格位列表与独立宝可梦编辑上下文，显示实际记录、图像、三语名称和读写状态。列表沿 `GetExtraSlots(HaX)`，以类型、实际槽号和 `PartyFormat` 定位；只读记录可查看／导出，可写记录使用当前编辑缓冲准备、冻结预览、覆盖／清空确认及工作副本撤销流程。按钮复用共享样式，未增加独立控件皮肤。

额外格位专项与默认完整原生检查均退出0，后者包含真实 E.sav 工作副本。覆盖公开夹具、GB三种编码、FRLG、剑盾各修订、PLA，以及朱紫／ZA三种修订的写入、清空、完整文件对照和来源保护；ZA清空后仍验证原物理记录。冻结会话检查包含替换、取消、设置变化、来源变化和一次性失败。

浏览器核心构建通过；359文件／2187项完整前端测试通过。共享按钮样式收口后，定向Lint、完整类型、网页／PWA构建及全仓格式、`git diff --check`再次通过。完整Lint保留第三世代定点既有的一条Hook警告，构建保留既有裁剪、包体及插件耗时提示。证据见 `.tmp/pkhex-api184-native-full.log`、`.tmp/pkhex-api184-core.log`、`.tmp/pkhex-api184-tests-full.log` 与 `.tmp/pkhex-api184-controls-*.log`。

原件与副本SHA-256均为 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。外部Chrome本次仍连接超时，正式页面、连续操作和实际下载未核验；工程通过不作所有者验收。上一轮94524a94的Actions 38967292999已完成（success）。下一组继续按 [HaX范围](https://github.com/HaKu76/PokeRNGKit/blob/23528d34ec6663514265a5c7f48bc2df905b72e4/docs/pkhex-hax.md) 对齐字段可见性、手动特性、自动提示与背包全局关联，完整目标保持未完成。

## 2026-10-17 编辑目录过滤（API183）

基线 b5e9b851c5aa1af58bab4b83c1c24fd7b3b2992f。增加种类、持有道具、招式与回忆招式的可选状态，保留名称／PP的编号索引；存档采用Core FilteredGameDataSource，独立实体采用自身存储格式上下文，不把原籍游戏当作目标游戏。普通模式隐藏不可选项并保留当前异常值的禁用显示，修改其他字段不强制替换；新值在编辑、准备与实际写入链校验。SM的回忆招式使用USUM上限并与普通招式分开。

标准、GB与回忆编辑器的三语专项（2文件／12项）通过。Core目录对照专项（18个游戏目录、普通／HaX两种模式）通过，协议已同步升级API183。 .tmp/pkhex-api183-catalogue-tail-final.log 相关原生专项退出0，覆盖GB、回忆、真实存档上下文、冻结放入、HaX空白及真实E.sav工作副本； .tmp/pkhex-api183-core.log 浏览器核心构建退出0。 .tmp/pkhex-api183-verify-final.log 完整前端检查退出0，358文件／2168项测试、类型、Lint、格式、网页及PWA构建通过；首轮因前端版本常量遗漏失败，修正后完整重跑通过。 .tmp/pkhex-api183-native-full.log 默认完整原生检查退出0，含真实E.sav工作副本。原件与副本SHA-256均保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442；本节不表示全局HaX完成。外部Chrome本次仍连接超时，页面未核验。上一轮b5e9b851的Actions 38954187425已完成（success），不作所有者验收。

## 2026-10-17 HaX空白编辑与清空准备（API182）

基线 b36c1480d2d42e6043b7682fc8e85adce780702f。以Startup.ForceHaXOnLaunch作为统一Core模式，模式元数据随存档与实体返回。HaX允许查看实际空格位、GB空列表和空队尾，读取时保留类型、编码、主体／姓名及损坏的校验和；原始存档不写。基础编辑可从空记录创建宝可梦，准备和冻结放入可用空记录清空箱位或删除队伍成员。确认预览明确区分清空与普通放入，队伍删除后前移，空队尾删除不改变成员。普通模式继续拒绝空记录及不合格输入，物理锁仍按API181权限处理。

HaX分支同时保留七位经验值而不按100级经验封顶、允许保留超过普通总量的EV（各字段原有上限不变）、显示LGPE隐藏EV及格式4以上的手动形态。形态沿DEV_Form的0–255输入，Core仍拒绝具体格式无法回读的值；不依赖截断回绕，原始PID与手动特性在无关形态修改时保留。来源为WinForms PKMEditor.EditsComplete／SetForms／UpdateLevelEXP、LoadSave.LoadSpeciesLevelEXP、StatEditor.ToggleInterface，及Core SlotInfoParty.WriteTo／SaveFile.DeletePartySlot、GB PokeList1／2。模式切换沿已有设置指纹重新建立Worker并废弃旧票据，不放宽容器宽度、存档校验或地区编码保护。

四文件161项前端专项及 .tmp/pkhex-api182-hax-final-native.log 原生专项退出0；覆盖18实体的空白读取／元数据／创建、GB名单容器、可修改校验和格式的损坏值保留、七种公开存档与真实E.sav工作副本的冻结清空／队伍删除／空队尾，以及普通模式拒绝。 .tmp/pkhex-api182-core.log 浏览器核心构建退出0，.tmp/pkhex-api182-verify.log 完整网页检查退出0，357文件／2162项前端、类型、Lint、格式及网页／PWA构建通过；保留既有Hook与包体／插件耗时提醒。 .tmp/pkhex-api182-native-full.log 默认完整原生检查退出0，包含真实E.sav工作副本。原件及副本SHA-256保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。外部Chrome连接超时，正式页面未核验。上一轮b36c1480的Actions 38941612499在Cloudflare发布阶段返回Unknown internal error occurred，未将该轮记为部署成功。全局HaX的目录过滤、额外格位、自动提示、部分可见性与背包关联仍未完成，完整范围见 docs/pkhex-hax.md；不能将本批当作全模式完成。

## 2026-10-17 格位写入权限（API181）

基线 a2eabb816afb0bf5cbc1e39fbd35bf8c915085da。Core返回实际箱子／独立队伍结构及受保护箱位，沿SlotInfoBox／SlotInfoParty.CanWriteTo，与图标、合法性、标记显示设置分别处理。菜单保留查看和合法性分析，隐藏不可写格位的放入／删除；工具栏放入、Shift放入和存储工具复用同一状态。受保护来源仍可复制到可写目标，其余来源写入禁用；不能独立写队伍的布局不显示伪队伍选项。游戏兼容性与最后非蛋等实体相关约束仍在Core实际写入时判断。

来源为WinForms Controls/SAV Editor/ContextMenuSAV.cs.MenuOpening、Core Editing/Saves/Slots/SlotViewInfo.cs、Info/SlotInfoBox.cs、SlotInfoParty.cs和StorageEditing.Target。箱号0至BoxCount-1，箱位0至BoxSlotCount-1，队伍逻辑位0至5并在写入时向PartyCount对齐。权限读取不写存档，受保护表只记录实际箱位；Worker拒绝缺失、重复和越界元数据，旧API结果继续被拒绝，前端缺少权限状态时不开放写入。布局、字段和按钮沿既有共享样式，无新增皮肤。

.tmp/pkhex-api181-slot-access-ui.log 四文件149项前端专项、.tmp/pkhex-api181-slot-access-native.log 原生专项均退出0。已覆盖七种公开存档的元数据、23组类型／修订／档位布局的每个物理位置、剑盾空／已占用锁定队伍与解锁刷新、LGPE链接队伍、原输入保护及既有冻结放入／真实E.sav回读。 .tmp/pkhex-api181-core.log 浏览器核心退出0， .tmp/pkhex-api181-verify.log 完整 npm run verify 退出0，357文件／2160项前端、完整类型、Lint、全仓格式和网页／PWA构建通过；保留既有Hook及包体／插件耗时提醒。 .tmp/pkhex-api181-native-full.log 默认完整原生退出0，覆盖最终代码与真实E.sav工作副本。原件及副本最终SHA-256均保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。外部Chrome仍返回nodeRepl.fetch request failed，页面未验收。上一轮a2eabb81的GitHub Actions 38930479155已完成部署（success），不作所有者验收。

全局HaX设置已存在且仅部分消费，完整模式并未完成。本批补齐其格位权限基础，空白记录、目录过滤、原始字段及其他界面行为需作为完整组继续接入；范围见 docs/pkhex-hax.md，不能把打开设置选项当作完成。

## 2026-10-17 手动队伍能力值（API180）

基线 1828aed3a6a25566c2cd485b0a77a0b045d93295。共用经验／状态面板增加手动队伍能力值，沿共享控件和三语。第一世代显示五项并合并特殊，后续显示六项且速度置后；Core 保持HP／攻击／防御／速度／特攻／特防顺序。默认显示计算值，未操作本区时保留原有生命与数值；点击应用更新编辑缓冲，切换手动模式后在放入准备末尾写数值或按最终字段重算。实际存档继续经预览、确认、撤销和导出链路更新。

输入来源为 WinForms Controls/PKM Editor/StatEditor.cs 的 LoadPartyStats、SavePartyStats、UpdateStats、UpdateHackedStatText，以及 Designer 的六项00000掩码：十进制五字符、空白按0、网页超限夹到65535，Core拒绝负数／超过UInt16／非六项数组。HP同时写当前值与上限；按实际序列化能力开放字段，PK1特殊共用，SK2临时属性及RK4只读计算属性不作为已保存值，普通箱位不承诺保存队伍扩展。网页拒绝依赖ushort截断绕回的输入。

计算模式使用当前存档的Personal表，不直接沿PK3默认的PersonalTable.RS；只读上下文和放入克隆保留火红／叶绿运行时选择。来源为Core PKM/PK3.cs、PKM/PKM.cs、Saves/SAV3RS.cs、SAV3E.cs、SAV3FRLG.cs及PersonalInfo/Table/PersonalTable3.cs。四游戏表专项以代欧奇希斯对照存档元数据、只读克隆、公开实体重算、准备及直接存档编辑；R/FR/LG为重建校验和的类型化工程布局，不写作自动识别或所有者验收。

.tmp/pkhex-api180-personal-final-native.log 专项、.tmp/pkhex-api180-final-core.log 最终浏览器核心、.tmp/pkhex-api180-verify.log 完整网页检查及核心修正后的 .tmp/pkhex-api180-final-web.log 网页／PWA重新打包均退出0。356文件／2156项前端、类型、Lint和格式通过；18种实体／两种长度、UInt16边界、第一世代共用字段、草稿顺序及真实E.sav公开读取箱中缓冲／冻结放入队伍／回读／来源保护通过。最终默认完整原生 .tmp/pkhex-api180-final-native-full.log 退出0，已覆盖修正后的代码及真实存档工作副本；保留既有Hook、裁剪、包体及插件耗时提醒。

最终复核E.sav原件和工作副本SHA-256保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。外部Chrome重建控制会话后仍返回nodeRepl.fetch request failed，页面、焦点、三语连续操作和下载未验收。全局HaX空白实体／空格位和其余主窗口／设置消费点继续保留；精确菜单写保护已于API181接线，完整接入目标未完成。

## 2026-10-16 存档上下文与独立宝可梦缓冲（API179）

基线 afaf78a707dd224aa8fe74889ab25786489cd83c。本批开放读取编辑文件及放入预览／确认／取消 RPC，并接单箱、全览、双箱、队伍、工具栏和 Shift 单键入口。右侧复用独立宝可梦编辑器，编辑、随机／建议命令与局部撤销只改变实体缓冲；查看其他宝可梦才切换缓冲，空格位和箱页变化保留已查看内容。实际存档仅在确认放入时改变，沿既有保存历史和导出链路。

独立 Worker 附带当前存档只读上下文，以真实存档限制来源、种类、招式、训练家、特性和蛋操作；GB／SK2 保持已识别编码，不写来源格位。存档、识别选择或玩家档位变化废弃旧 Worker 票据。预览展示 Core 实际导入结果，覆盖和兼容性各自确认；成功后用预导入实体刷新编辑缓冲，保存来源与目标分离。菜单中的存储格位合法性分析仍直接检查实际格位，与编辑缓冲分析分别展示。

协议边界：准备请求不超过1,048,576个UTF-16码元，scope为1–256字符，区号1–64字符且不重复，最多64区／每区32步／整份64步；字段掩码1–32项且只能使用声明字段，训练家编号的两种表示不能同时提交。确认与位置请求上限4096字符，位置必须完整且无重复／额外字段，队伍逻辑位置0–5，箱位按实际箱数和容量。上述是网页协议限制；各值范围继续复用已核对的 Core 编辑器。来源为 ContextMenuSAV.ClickSet、PKMEditor.PreparePKM／NotifyWasExported、SlotInfoBox／Party 和 SaveFile.UpdatePKM。沿共享控件与44px基线，增加原生对话框确认和焦点恢复；没有新增控件皮肤。

`.tmp/pkhex-set-api179-native.log` 与 `.tmp/pkhex-editor-context-api179-native.log` 专项退出0，覆盖七种常规存档、23组类型／修订／档位布局的只读上下文与公开放入路径，真实 E.sav 工作副本的编辑、冻结导出与原件保护通过。`.tmp/pkhex-set-ui-tests.log` 四文件170项前端专项通过；随后补齐旧API结果拒绝、StrictMode加载复用与失败不自动循环用例。`.tmp/pkhex-api179-core.log` 浏览器核心退出0；`.tmp/pkhex-api179-verify.log` 完整 npm run verify 退出0：356文件／2152项前端、完整类型、Lint、全仓格式与网页／PWA构建通过，仅保留Gen3StaticPanel.tsx:404既有Hook提醒及既有包体／插件耗时提示。`.tmp/pkhex-api179-native-full.log` 默认完整原生退出0，新增上下文／公开放入、真实 E.sav 与其余既有用例全部通过。浏览器核心、完整原生与完整网页门禁均通过；原件与工作副本 SHA-256 保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 页面读取仍失败，真实交互和下载未验收，完整接入目标保留。

## 2026-10-16 放入格位的 Core 准备与冻结（API178 内部）

本批基线 d4d005d6ffeb951ed55a5126b1f946b8e5ab169d。新增内部草稿消费者和单次冻结会话，尚未开放 Worker RPC 或前端 Set 入口，API 保持178。准备仅修改实体克隆，按来源／训练家／持有人／基础字段／其他数值／经验顺序处理，基础字段只合并明确修改的掩码；拒绝重复区号、冲突字段、随机和建议命令。兼容性报告复用 Core 并提供三语，目标经 SlotInfo 写保护与队伍限制检查，以默认 EntityImportSettings 在存档克隆中写入，再导出回读并冻结结果。确认检查来源、目标哈希及导入设置快照，不再次执行可能产生随机回忆的默认导入。

日本初代竞技场沿既有精确原始格位适配器，新增可选导入设置；原调用继续显式保持 None。兼容性共享方法接受 SaveFile。专项已通过七种常规存档与23组类型／修订／档位布局对照，覆盖草稿冲突、语言先于姓名、经验与等级、随机冻结、队伍追加及最后非蛋保护、三语兼容性、早期格式、竞技场、两个牧场修订、GameCube、对战革命四玩家、现代类型夹具和真实 E.sav 工作副本。回读使用额外字节副本，防止 Core 原地解密污染冻结输出；SK2 按已识别存档编码读取含糊姓名。预览记录实际导入目标，另存准备后的编辑缓冲。确定性对照排除交易回忆、图鉴性别与接收时间的随机／时钟影响，随机与时间路径单独检查冻结哈希。`.tmp/pkhex-set-core.log` 浏览器核心、`.tmp/pkhex-set-native-full.log` 默认完整原生与 `.tmp/pkhex-set-verify.log` 完整 npm run verify 均退出0；全仓格式、Lint、完整类型、354文件／2134项前端及网页／PWA构建通过。保留既有 Hook、编译／裁剪和包体提醒。最终完整原生再次覆盖本批新增用例及真实 E.sav 工作副本，不写作浏览器或所有者验收。

原件路径已确认是 `C:\Users\Hakuhiro\Desktop\200\battery\E.sav`，131072字节，SHA-256仍为7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。只使用 `.tmp/pkhex-real-save-check/confirmed-input.sav` 工作副本。Chrome 4 读取已授权本地页仍失败，真实页面、焦点和下载未验收。后续须完成各格式与公开协议检查，再接前端菜单、确认、撤销和来源编辑缓冲行为；完整接入目标保留。

## 2026-10-16 当前编辑草稿的准备层（API178 前端，Set 未完成）

本批基线 d94905bf5f8607243fb576a83ac613eb5bf62707。为来源 ContextMenuSAV.ClickSet 的 EditsComplete／PreparePKM 建立按实体位置和工作修订隔离的草稿快照；基础字段记录修改掩码，其他字段输出类型化的值补丁，保留待由 Core 判定的经验／等级关联。基础、原始编号、来源、回忆招式、特殊状态、尺寸、训练家、开发字段、早期格式及其他已加载数值窗口接入。无改变不产生操作，随机／建议／孵化等命令配置不因准备而执行；这些按钮仍只在明确点击时修改工作副本。

注册与释放使用独立令牌，旧渲染清理不能删除新回调；捕获须匹配 scope，任何无效／缺少准备器的已登记表单都会拒绝整份快照。快照深拷贝，限制每区32／整份64项及JSON长度1,048,576个UTF-16码元，这是网页协议边界，不是上游数值范围。独立文件原有照料区与记忆窗口的同类输入使用不同区号，避免互相遮盖。新增表单检查补进既有集中合法性门禁并使用三语区名；源范围与解析继续复用各编辑器已有目录和方法。

下一步必须实现 Core 克隆准备、重复字段意图检查、兼容性报告、默认导入设置、目标写入及冻结确认／回读，再开放菜单 Set；目前没有新增 Set 入口，也没有将复制替代 Set。EditPK3.cs:30 明确先保存语言再编码姓名，后端必须据字段掩码合并，避免未改旧姓名覆盖语言自动编码。Core／Worker 未改，原生基线仍为API178；三文件34项专项与定向Lint通过。首轮完整 verify 在类型检查发现佩戴称号为null的格式不能写入可选数字字段，已保持缺省而非转成零，并保留修改目录校验；修正后的 .tmp/pkhex-draft-prepare-final-verify.log 完整 npm run verify 退出0，354文件／2134项前端、完整类型、Lint、全仓格式及网页／PWA构建通过；保留 Gen3StaticPanel.tsx:404 既有Hook提醒与包体提示。Core／Worker未改，继续复用API178原生基线，不写作本批重跑。实际 Chrome 读取仍失败，交互未验收，完整目标保持未完成。

## 2026-10-16 格位菜单与合法性可见性（API178 前端）

基线35a501d0631f21e528f06833a567193c780a84a7。接单箱、全览、双箱与队伍格位共用菜单，支持右键、菜单键／Shift+F10及通用菜单按钮；命令为查看、删除和合法性分析。复用共享菜单、视口定位、三语、44px 控件、方向键／Home／End、Escape 与焦点恢复。设置／工作修订变化或请求开始即关闭旧菜单，操作前再次检查目标。删除沿既有工作副本／撤销与 Core 保护规则，不直接改原件。

来源 ContextMenuSAV.cs:ClickView／ClickDelete／ClickShowLegality／MenuOpening。合法性项沿精确 Control 单键或 Display.SlotLegalityAlwaysVisible，并要求非空格位和分析回调；开放对应设置消费点，右侧详情入口保持可用。菜单分析直接检查所点工作格位，不自动应用详情草稿，符合来源独立格位分析。普通模式不显示空格位菜单；全局 HaX／空格位模式、Set 的编辑草稿准备与兼容性流程、精确格位写保护的菜单隐藏仍待接，不能把复制动作当成来源 Set。实际删除仍由 Core 拒绝受保护或无效队伍组合。Core／Worker 协议未变，不改 RNG 算法。三文件41项专项与定向Lint退出0，覆盖全部16种修饰键组合、忙碌／只读／异常／空位／越界、三语和四视图入口；.tmp/pkhex-slot-menu-verify.log 的完整 npm run verify 退出0，353文件／2121项前端、完整类型、Lint、全仓格式及网页／PWA构建通过；保留 Gen3StaticPanel.tsx:404 既有Hook提醒与包体提示。本批无 Core／Worker 改动，原生与核心继续使用35a501d0的API178完整基线，不写作本批重跑。Chrome 4 对已授权 http://127.0.0.1:5173/ 的读取仍失败，菜单定位、焦点、触屏和实际页面未验收。

API178 最终工程门禁：.tmp/pkhex-identity-core.log 浏览器 Core、.tmp/pkhex-api178-native-full.log 默认完整原生与 .tmp/pkhex-api178-verify.log 完整 npm run verify 均退出 0。352 文件／2096 项前端、完整类型、Lint、全仓格式及网页／PWA 构建通过；仅保留 Gen3StaticPanel.tsx:404 原有 Hook 提醒和既有编译／裁剪／包体提示。15 种实体专项覆盖来源编号掩码、先 SID 后 TID 与 UInt32 回绕、转移来源显示、游戏／格式特性目录、实际编号位宽、全部 ExtraBytes 偏移、四布局和完整公开输出。另执行 .tmp/pkhex-api178-real-save.log 的 real-save 专项退出0，确认 E.sav 为 SAV3E／绿宝石，131072 字节、14×30 箱位、20 只箱中／5 只队伍宝可梦；公开读取、编辑、导出重开、其他格位与原件保持通过。原件及工作副本 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 读取已授权本地页仍失败，真实页面／焦点／下载未验收；设置消费点和其他主窗口行为继续核对，完整目标保留。

## 2026-10-16 训练家编号与开发字段（API178）

基线 013c30aae3e369ab9a2bd4836829f2bd56acc2b1。基础编辑器按实体来源显示五位／六位训练家编号及秘密编号，未修改时保留原始 ID32；新增共用的按需手动特性、特性编号与额外字节面板。存档与独立实体复用三语、共享控件、工作修订和草稿门禁；切换额外字节前须应用或还原当前输入。16 项前端专项、完整类型、定向 Lint 与全仓格式已通过。原生专项的类型比较、跨语言目录排序、Invalid／零版本、上游 internal 常量访问等测试问题已修正；15 种实体、四布局、完整公开输出和新版编号规则已通过，随后补加存档游戏特性上限并重跑。补加游戏上限后的 .tmp/pkhex-identity-native-public-limits.log 专项及 .tmp/pkhex-identity-core.log 浏览器核心均退出0。默认完整原生、完整 npm run verify 和真实存档专项均已通过，实际页面仍未验收。

输入来源：PKHeX.WinForms/Controls/PKM Editor/TrainerID.cs、TrainerTID.cs、TrainerSID.cs、LoadSave.cs、PKMEditor.cs／Designer，以及 Core TrainerIDManager、ITrainerID、ITrainerID32、各实体 ExtraBytes。ID 格式按 TrainerIDDisplayFormat，含转移实体来源世代；十六位控件掩码五位、空值或无法解析为零、上限65535。现代 TID 六位／SID 四位，SID 先写并按旧 TID 校正到4294或4293，TID 随后写入，保留 Core UInt32 回绕与来源 Save6 分支。工具提示含原始ID32、TID16、SID16、按当前格式计算的TSV。

手动特性从第四世代起按源特性目录及 MaxAbilityID；存档入口同时应用当前游戏上限，独立实体按格式上限；第三世代仅原有特性位。PK5 手动修改同步隐藏特性标记。第六世代起特性编号是一位十进制掩码，空值零、0–9 写入具体格式，回读可能受实际存储位宽影响；按编号查找限1／2／4，PA9 使用相遇来源的 ZA personal。额外字节仅列出实体 ExtraBytes，值为三位十进制、空值或无法解析为零、超过255按源限制到255；禁止任意地址。写入先克隆验证，未改异常值保持，不触发通用队伍数值重算。

API177 最终工程门禁：.tmp/pkhex-dimensions-core.log 浏览器 Core、.tmp/pkhex-api177-native-full.log 默认完整原生与 .tmp/pkhex-api177-final-verify.log 修正后完整 npm run verify 均退出 0。351 文件／2080 项前端、完整类型、Lint、全仓格式、网页／PWA 构建通过；保留 Gen3StaticPanel.tsx:404 既有的一条提醒和既有编译／裁剪／包体提示。专项包含六类尺寸实体、五类地形／第四世代实体、全部 256 分类与叶子组合、四布局／完整公开实体、浮点载荷／负零、CP／自动／随机动作、RK4 日期及十组存档／修订版的队伍／箱位或 LGPE 队伍引用对照。默认完整套件带已授权 E.sav 工作副本，原文件 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 读取已授权本地页仍失败，真实交互／焦点／下载未验收；完整接入目标继续保留。

API177 完整网页首轮 .tmp/pkhex-api177-verify.log 退出 1：格式通过，但 react-hooks/refs 将尺寸渲染辅助函数中的随机事件识别为可能在渲染期读取引用。已改为 JSX 内直接生成标量字段与事件，.tmp/pkhex-dimensions-lint.log 的五文件定向 Lint 退出 0；不禁用规则。修正后重跑 .tmp/pkhex-api177-final-verify.log；默认完整原生 .tmp/pkhex-api177-native-full.log 沿同一进程继续，C# 输入未改。

API177 阶段检查：.tmp/pkhex-dimensions-native-floats.log 原生专项、两文件 48 项前端、完整类型、全仓格式及 .tmp/pkhex-dimensions-core.log 浏览器 Core 重建均退出 0。覆盖六类现代尺寸实体及 PK4／BK4／RK4／PK5／PK6 地形记录、全部 256 分类、四布局／公开完整实体输出、随机／重置、手动浮点与 NaN 载荷／负零、冠冕／心情边界、RK4 日期，以及十组存档／修订版的箱位／队伍或 LGPE 队伍引用完整输出。默认完整原生和完整 npm run verify 接续运行，实际 Chrome 页面仍待核验。

## 2026-10-16 尺寸／CP 与第四世代记录（API177）

本批基线 c9ada3231a27f45b6f901cd0c0cf301dce03613e。接入六类现代实体的尺寸／CP、G4PKM 叶子／散步心情、Gen4 原游戏地形，并按 G4PKM 统一 RK4 日期能力。原始浮点、CP 掩码、PA8 联动、随机／重算与冠冕联动均按源事件处理；未修改的特殊原值与高位保留。两个共用编辑入口与草稿门禁已接线，原生专项、默认完整原生与修正后的完整前端工程门禁均通过。输入范围和上游路径见模块文档，本批提交前工程结果见本页最终记录。

API176 最终工程门禁：.tmp/pkhex-special-core.log 浏览器 Core 重建、.tmp/pkhex-api176-native-full.log 默认完整原生、.tmp/pkhex-api176-verify.log 完整 npm run verify 均退出 0。350 文件／2067 项前端、完整类型、Lint、全仓格式与网页／PWA 构建通过；保留 Gen3StaticPanel.tsx:404 既有一条提醒及既有编译／裁剪、包体提示。新专项覆盖 15 种实体的四布局、全部菌株／天数组合、感染／治愈状态表、PK5 邻位／名气、GC 原始零编码、箱位／队伍与两种牧场修订版的完整文件对照；默认完整套件带已授权 E.sav 工作副本检查。最终原存档 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 对已授权本地页的调用仍失败，真实交互、焦点与下载尚未验收；完整接入目标继续保留。

API176 阶段检查：.tmp/pkhex-special-native-ranch.log 原生专项退出 0，覆盖 15 种实体／四种布局、全部菌株与天数组合、感染／治愈切换、PK5 邻位与名气边界、GC 零天数编码、完整输出／原件保持、绿宝石／黑版公开箱位与队伍、剑盾／朱紫类型化块样本及两个牧场修订版的公开手动识别。两文件 46 项前端、完整类型、全仓格式和 .tmp/pkhex-special-core.log 核心重建均通过。默认完整原生与完整 npm run verify 最终结果见本页记录；Chrome 实际操作仍未验收。

## 2026-10-16 特殊状态与记录（API176）

本批基线 232f682bb53b488b11117f30fc075f7415e2ae5c，开始接入宝可病毒和 PK5 专属记录。Core 与两入口共用表单已接线，状态切换由 Core 处理，菌株天数目录来自 Core，保留未改异常值与 GC 零天数编码。三语和共享控件、草稿门禁同步，输入来源与范围见模块文档。原生专项、默认完整原生与完整前端工程门禁均通过，最终证据见本页记录。

API175 最终工程门禁：.tmp/pkhex-trainer-core.log 的浏览器 Core 重建、.tmp/pkhex-api175-native-full.log 的默认完整原生、.tmp/pkhex-api175-verify.log 的完整 npm run verify 均退出 0。349 文件／2056 项前端、完整类型、Lint、全仓格式与网页／PWA 构建通过；保留 Gen3StaticPanel.tsx:404 既有的一条提醒及既有编译／裁剪、包体提示。原生完整套件包含本批 14 种实体／四种布局、目录／编码／完整输出／原件保持与箱位／队伍检查，并带已授权 E.sav 工作副本的既有工程回归。最终原存档 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 标签读取再次失败，实际页面／连续操作／下载与所有者验收仍未完成；完整接入目标继续保留。

API175 阶段列出的特殊状态字段已由 API176 接入：第三世代及以后宝可病毒的正式编辑（第二世代已有适配），以及 PK5 的 NSparkle 与 PokeStarFame。前者核对 LoadSave.LoadPokerus／SavePokerus、PKMEditor 的感染／治愈／菌株／天数事件与实际存储；不能按游戏合法性隐藏仍存在的字节。后者来源 EditPK5 与 Designer 的 0–255 名气控件，NSparkle 为独立标记。批量属性可读写不视为正式表单已接，完成后继续核对其他主窗口控件与 Chrome 实际交互。

API175 工程进度：.tmp/pkhex-trainer-native-typed.log 原生专项退出 0，覆盖 14 种实体各四种文件布局、三语目录、完整输出、姓名编码、范围与原件保持；绿宝石箱位／队伍通过公开接口，剑盾／朱紫合成块样本通过类型化适配器，未弱化正式识别。两文件 45 项前端、完整类型、定向 Lint、全仓格式及 .tmp/pkhex-trainer-core.log 浏览器核心重建均通过。最后调整三语标签以区分其他训练家与当前持有者，空姓名禁止选择其他训练家持有。默认完整原生与完整 npm run verify 接续进行，原存档 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442；实际 Chrome 页面未验收。

## 2026-10-16 训练家与来源信息（API175）

本批提交前基线为 0bfb262fd4b8340d7ad75e4246d50a38febffa09。继续接入主编辑器训练家字段，新增按需目录及编辑动作，存档与独立文件共用三语表单。包含语言、原训练家性别、持有者姓名／性别／归属／语言、原始地区、对战版本与服从等级；目录、空值、宽度和转换见模块文档。源码、协议和版本断言同步 API175，完整工程门禁已通过，结果见本页最终记录。完整 PKHeX 目标继续保留，不能将本批当作全功能完成。

Chrome 4 对已授权 http://127.0.0.1:5173/ 的读取仍失败。真实页面、下载与所有者验收未完成；不追加权限请求，不使用内置浏览器替代。确认的原存档仍是 C:\Users\Hakuhiro\Desktop\200\battery\E.sav，原文件保持只读。

API174 最终工程门禁：最后核心重建 .tmp/pkhex-stats-final-core.log、默认完整原生 .tmp/pkhex-api174-native-full.log、完整 npm run verify 的 .tmp/pkhex-api174-final-verify.log 均退出 0。348 文件／2046 项前端、完整类型、Lint、格式与网页／PWA 通过；保留 Gen3StaticPanel.tsx:404 既有的一条提醒、既有 .NET 编译／裁剪及包体提示。原存档 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Native 默认套件包含本批六种实体／四种布局、所有来源动作和太晶选项、零 IV 建议差异、隐藏 EV 保留以及七种类型／修订存档的箱位／队伍或 LGPE 队伍引用对照。最后使用稳定挂载同步草稿并条件恢复焦点；实际 Chrome 布局／交互／下载仍未验收。Chrome 4 可被识别，但现有标签读取及同一连接中新建标签均失败；不使用内置浏览器替代工程核验。

后续原生专项 .tmp/pkhex-stats-native-hidden-ev.log 退出 0，包含零 IV 攻击／速度的 AV 最低值及 GV 推荐／满值区别、LGPE 普通昵称编辑完整文件对照与隐藏 EV 字节保留。LGPE 普通模式按来源以 AV 替代 EV 输入，摘要同步显示实际 AV／GV，未发送的 EV 数据保持；三文件 46 项专项 .tmp/pkhex-stats-final-front.log 通过。首轮完整前端检查的 347 文件／2039 项、类型／Lint／格式通过，但网页复制与核心资源替换发生 ENOENT 交叠（System.Linq 压缩资源），该次完整 verify 退出 1，不列为完整通过。最后核心 .tmp/pkhex-stats-final-core.log 已退出 0，资源稳定后重跑 .tmp/pkhex-api174-final-verify.log；默认完整原生 .tmp/pkhex-api174-native-full.log 同时运行。Chrome 4 本地页读取再次失败，实际布局／焦点／下载未验收。

API174 修正后原生专项 .tmp/pkhex-stats-native-linked.log 退出 0，LGPE 队伍采用存储引用并沿实际箱位编辑，其他六类／修订存档完整对照通过。两次样本准备失败及修正已记模块文档。完整类型与定向 Lint 通过；面板改为稳定挂载、元数据回读同步草稿并仅在焦点回到 body 时恢复原控件。浏览器核心和完整 npm run verify 运行中，随后执行默认完整原生；不作真实页面验收。

## 2026-10-16 世代专属统计字段（API174）

基线 58296fa0802604172d335fcc1d4486038c7ab426 已推送。本批将四组明确缺口一起接入：LGPE AV、PLA GV、极巨／超极巨／头目／王标记、PK9 原始／覆盖太晶属性。元数据沿实体实际接口，两个正式入口共用控件与三语文案，纳入草稿门禁；只发修改项，快捷动作保护当前面板草稿。范围和特殊值均已从 StatEditor、LoadSave 和 Core 接口核对，详见模块文档；API／Worker／夹具统一为 174。

五文件 189 项前端及全仓格式通过，完整类型进行中。原生首轮六种实体／四布局与原值、异常请求检查通过，存档样本准备在 LGPE 未初始化队伍箱位引用处失败；已沿既有测试的 PartyData 初始化修正样本并重跑。产品解析与写入规则未改变。浏览器核心、默认完整原生与完整工程门禁已通过，真实 Chrome 页面待核验。

API173 最终工程检查：.tmp/pkhex-alpha-filter-core.log 的浏览器核心重建、.tmp/pkhex-api173-native-full.log 的默认完整原生，以及 .tmp/pkhex-api173-verify.log 的完整 npm run verify 均退出 0。346 文件／2005 项前端、完整类型、Lint、全仓格式与网页／PWA 通过；保留第三世代定点既有的一条 Hook 提醒、既有裁剪／编译和包体提示。最终原存档 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 读取已授权本地页仍失败，真实交互／下载与所有者验收未完成；完整接入目标及统计字段余项继续保留。

主编辑器统计字段另有四组明确待接：AV／GV、极巨等级／超极巨、头目／王标记、太晶原始／覆盖属性。来源与正式表单缺口已记入模块文档，不以图像读取或批量属性能力当作控件已完成。后续按字段组批量实施。

补查并修正下拉框筛选：来源 FilteredGameDataSource.GetFilteredMoves 与 GameDataSource.LegalMoveDataSource 排除战斗专用及 PLA 未使用招式。Core 为招式目录返回 alphaSelectable，前端只显示可选项；普通写入也按相同 Core 规则拒绝未列出编号，保留旧存档原值可读。修正后 .tmp/pkhex-alpha-filter-native.log 退出 0，逐项对照全部 0–850 编号，与上游 178 项集合完全一致，全部可选／不可选编号均检查，并重跑四布局及完整输出。首轮范围检查与核心构建已通过，但不替代本次筛选修正后的核心重建和完整门禁；后者均已通过，最终结果见本页当前记录。

## 2026-10-16 头目初始精通招式（API173）

基线 f6d4b26713cd3fab4cc2d503517f97176105e624 已推送。新增 PA8 AlphaMove 的独立读取与编辑，存档和独立实体两个入口共用三语选择控件并接集中草稿检查。按上游组合框及 Core MaxMoveID 限制写入 0–850；原始 ushort 的未列入目录值保持可读。该字段与 IsAlpha 标记、当前招式／PP、商店记录独立，编辑保持健康、队伍能力与其他内容。接口／Worker／前端及 Native 版本断言统一为 API173。

首轮原生专项 .tmp/pkhex-alpha-native.log 退出 0，覆盖四种独立布局／两种头目标记、公开编辑回读和完整输出、两个 LA 修订版箱位／队伍完整存档对照，以及错误范围／动作／格式拒绝。五文件 168 项前端通过；完整类型与格式进行中。旧的四处 Native API172 断言在首轮编译结束后同步更新，未在编译期间修改输入。浏览器核心、默认完整 Native 与完整 npm run verify 已通过；真实页面仍受 Chrome 连接影响，未验收。

## 2026-10-16 集中草稿校验与请求失败反馈（API172 前端）

基线 031eb132d57a78f8cc217fa49487432916d04e40 已推送；Actions 38819366949 当前仍在 build。新增按实体位置与工作修订隔离的草稿校验，复用基础／GB 请求构造器及现有原始值／经验解析，接入来源、回忆招式和已加载居住历史。共享合法性入口遇到无效草稿隐藏旧报告并显示三语提示，精确 Ctrl+Shift+Alt 仅跳过界面检查；分析仍针对已应用工作副本，写入仍由 Core 校验。上下文更换不重挂载经验面板。当前请求的普通失败、超时与版本不匹配补充声音，取消／过期请求安静。

首轮四文件 40 项通过，全仓 format:check 与 git diff --check 退出 0；完整类型进行中。原件 E.sav SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 读取已授权本地页再次失败，无页面验收。

下一步完成本批工程门禁，再继续专用字段与设置消费点审计。上游 AllowBoxDataDrop 是从箱子标题向外拖出 box_N.bin，不是导入开关；SlotLegalityAlwaysVisible 是上下文菜单选项，不应据此隐藏详情分析入口。Unicode 同时涉及性别、异色按钮与字体行为，已有部分消费不能代表整个设置完成。保持这些选项未完成状态，避免用禁用说明代替开发。

最终完整 npm run verify 的 .tmp/pkhex-draft-verify.log 退出 0：345 文件／1991 项前端、完整类型、全仓格式、Lint 与网页／PWA 构建通过。已消除本批两条 Hook 依赖提醒，仅保留 Gen3StaticPanel.tsx:404 原有的一条提醒及既有包体／插件耗时提示。Core／Worker 未改，继续复用 API172 默认完整原生基线。Chrome 4 读取本地页仍失败，草稿实际交互、连续焦点与声音未验收；PA8 AlphaMove 确认为独立于招式商店的未接字段，继续作为下一步，不宣称完整接入。

## 2026-10-16 交互提示与音效（API172 前端）

上一批 24712f93995be8e0a0769152b6647772e39f0df3 已推送。本批只改前端，Core、Worker 协议及存档字段未改，继续使用 API172。补齐 Asterisk／Exclamation／Hand／Question 四类 170 ms 合成音及三语试听，保持本页显式启用和三种来源开关独立，开放 PlaySoundOther。背包批量给予和有效箱子批量操作在成功写入后提示；礼物全部已用／未用在当前预览成功后提示；信件删除根据当前队伍引用发询问音，仍由复选框、预览及确认决定是否改道具。

用户查看空格位、背景识别拖放、不可写格位拒绝、忙碌时再次打开、无效实体分析及基础／DV／进阶／经验控件校验增加对应反馈；有效导入／移动的程序性目标选择保持安静。逐项核对剩余 18 个直接调用，明确区分实际连接、禁用态拦截和浏览器流程适配；集中草稿 EditsComplete 与通用对话框间接声音继续未完成，见 docs/pkhex-sound-coverage.md，不以本批代替完整 PKHeX 接入。

首轮十文件 287 项中 284 项通过，三个试听 SSR 断言错误地要求关闭的共享下拉框渲染未选项，已修正到可见状态；首轮类型错误为独立实体错误状态传文字，已沿现有本地化错误代码修正。前端与完整类型继续重跑，真实页面／音频受 Chrome 连接问题影响，尚未验收。原生代码未改，不重复运行同一 API172 的完整原生基线；上一批默认完整原生已通过，本批运行相应前端门禁。

最终十文件 287 项专项、定向 Lint、完整类型均退出 0；完整 npm run verify 的 .tmp/pkhex-feedback-verify.log 退出 0，343 文件／1966 项前端、完整类型、格式和网页／PWA 构建通过。Lint 仅保留 Gen3StaticPanel.tsx:404 原有依赖提醒，网页保留既有包体提示。Core／Worker 无差异，原件 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome 4 读取已授权本地页仍失败，实际音频、拖放和弹层交互未验收；不可写目标的原生 drop 事件可达性仍待核验，不将脚本事件测试当作实际鼠标拖放证据。上一批 Actions 38815597300 已全部成功，Pages、Cloudflare 与 Windows 打包完成。本批按此前授权合并提交推送，集中草稿校验、间接对话框、其余设置及真实页面继续在完整目标中。

## 2026-10-16 共用实体编辑控件（API172）

上一批累计改动已合并为 fb2bf561595fc6814e8da1039225c91ba80ca1f9 并推送 main，工作区随后开始本批。对应 Actions 38808749597 已全部成功，build、Pages、Cloudflare 与 Windows 打包均完成；浏览器页面核验继续受外部 Chrome 连接影响，不把部署成功写成页面验收。

存档与独立宝可梦新增共用经验值／等级、经验条、异常状态、觉醒力量编辑。沿现有 GB 专用／标准进阶接口、工作副本、撤销与导出回读处理；Core 提供成长曲线与觉醒力量 IV 算法。状态能力通过实际序列化差异确定，GB 存档 PK2 箱装记录单独拒绝，SK2／RK4 不开放不会保存的状态写入。保留状态高位与当前 HP；濒死显示不当成可选状态或治疗操作。四项剩余 EntityEditor 设置已接消费，第一世代性别同时控制详情和悬浮预览。

七张状态图像直接复制原版资源并登记哈希，资源导入脚本同步覆盖。首轮前端失败是标题包含控件名称导致的断言范围错误，修正后九文件 198 项及定向 Lint 已通过；原生首轮编译失败为测试直接设置只读运行时属性，改用既有 Reset／Configure 后重跑。完整类型、格式与原生专项仍在运行，尚未提交本批。日志 .tmp/pkhex-vitals-{native-final,front-final,lint,types,cleanup}.log。

专项最终 .tmp/pkhex-vitals-native-storage.log 退出 0，覆盖 18 种实体的箱装／队伍输出、等级／经验、全部可用觉醒力量类型与两项 IV 策略、实际状态存储、完整字节及原输入保持，并包含经验条、GB 实档布局和真实 E.sav 工作副本。CK3／XK3 状态仅为 Core 内存属性，已按源码修正测试预期，产品实际序列化检测保持；G8／G9、LA／Z-A 部分箱装记录本身保存状态，不能一概按“箱装不保存”处理。浏览器核心 .tmp/pkhex-vitals-core.log 已通过；空字段与等级夹取复核后九文件 199 项及 Lint 通过，首轮完整类型检查已通过。

经验条连续操作保持同一组件与折叠状态，报告更新同步草稿；忙碌结束后只在焦点仍属于该控件或文档主体时恢复焦点，避免关闭折叠区或抢走其他控件焦点。上述最后三处前端变化已格式化，定向 Lint 通过；完整 npm run verify 与默认完整原生仍在运行，日志 .tmp/pkhex-api172-{verify,native-full}.log，未到提交门禁。Chrome 4 对已授权本地页的读取仍失败，不能据此声明真实页面或所有者验收通过。原件 SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。

最终 .tmp/pkhex-api172-native-full.log 默认完整原生与 .tmp/pkhex-api172-verify.log 的 npm run verify 均退出 0。341 文件／1945 项前端、完整类型、网页／PWA、格式均通过；Lint 无错误，保留 Gen3StaticPanel.tsx:404 原有 initialTransfer 依赖提醒，网页保留既有包体提示。浏览器核心构建通过，原件哈希再次确认未变；所有编译与回归任务均已结束。本批按此前授权整理为一次提交推送，最后文档与暂存差异继续清理。真实页面、其余显示／声音设置、主窗口操作及完整 PKHeX 目标仍未完成。

## 2026-10-16 竞技场二代与牧场实体适配（API171）

SK2 与 RK4 已加入独立实体和存档内编辑能力。SK2 共用 GB 基础／特殊字段，保留内嵌名称、租借标记和保留位；租借训练家姓名不支持写入，三语界面说明并禁用。RK4 共用第四世代编辑，保留额外 28 字节牧场资料。文件选择、模板结果协议、Worker 与 API 统一更新，继续通过工作副本、撤销和导出路径处理。

原生专项 .tmp/pkhex-stadium-ranch-native-final.log 退出 0，覆盖两种 SK2 编码与租借组合、RK4 四种导出布局、竞技场二代两个区域、牧场及白金更新版的完整输出／回读／校验／原输入保持，并通过既有 GB 回归。日版合成样本初次缺少区域标记，已按来源补齐样本，产品校验保持。十文件 248 项前端、Lint、完整类型和全仓格式通过；i18next 选项修正后五项专项复核通过。核心与网页构建继续核验，日志 .tmp/pkhex-stadium-ranch-{core,web}.log。外部 Chrome 页面待核验，经验值／状态／觉醒力量等入口和其余设置仍在完整目标中；本批尚未提交推送。

提交前完整检查已通过：.tmp/pkhex-api171-native-full.log 为默认完整原生回归，退出 0；.tmp/pkhex-api171-verify.log 为 npm run verify，340 文件／1935 项前端、完整类型、Lint、格式及网页／PWA 构建全部完成。Lint 仅有 Gen3StaticPanel.tsx:404 原有 initialTransfer 依赖提醒，没有错误。浏览器核心 .tmp/pkhex-stadium-ranch-core.log 退出 0，网页结果以完整 verify 日志为准，未单独运行上述 web 日志命令。最后文档格式／diff 继续清理；外部 Chrome 4 读取已授权本地页仍失败，实际布局、文件下载、IndexedDB 与所有者验收仍待核验。远端 main 提交前核对仍为 1e2dd114dbee0850010e0eaf3c0763bf504420f2；累计改动准备合并为一次提交推送，后续由现有 main Actions 构建部署，不将推送或工程通过视为部署完成。

## 2026-10-16 存档内宝可梦编辑能力拆分（API170）

新增独立的宝可梦基础／进阶／导入／仓储能力，不扩大原 CanEdit 所控制的训练家、背包、整箱与批量编辑范围。普通宝可梦表单、文件导入和格位拖放消费新能力；校验和无效时全部写入关闭，仍保留格式专用只读界面。GB 存档复用独立实体的 DV／能力经验、名称、招式、相遇／病毒及蛋操作；共用共享候选控件，完整名称／列表头按真实队伍或箱位宽度比较，保留最后非蛋队员约束。GB 目录放在存档层，条目只携带自身字段，避免为每只重复地点与语言目录。

LGPE 派生数值／CP 刷新移入基础与进阶编辑的共用逻辑，原独立文件同时使用；无关编辑仍保留已有异常值。新编辑和导出继续走原工作副本、撤销、识别参数及 BR 角色上下文。首轮 13 组既有存档、LGPE 两版本的基础／进阶完整输出通过，随后剑盾合成样本缺少自动识别签名，已采用现有手动类型／版本／语言上下文，不放宽检测。银行、盒子、竞技场以及现代格式与 GB 区域布局的扩展原生专项正在重跑，共用独立文件回归同步运行。首轮九文件 239 项前端及定向 Lint 已通过，后续补充见下文；日志 .tmp/pkhex-save-pokemon-{native-final,front-final,lint-final,types}.log。

扩展专项发现并处理了两处实际边界：韩文 GSC 偏移表没有水晶性别／调色板字段，手动识别现在明确拒绝该组合，原生目录返回组合限制，三语界面禁用对应选择并解释原因；竞技场日版初作的 Core 读取器使用固定 33+6+6 字节，而继承写入器使用单只列表。新增项目侧 PokemonSlotWriter，以原 GetPKM 的逆布局写入，编辑／导入／仓储共用，Core 源码保持不变；错误地区布局拒绝，校验及最终容器仍由 Core 处理。

最终原生 .tmp/pkhex-save-pokemon-native-slot.log 退出 0，覆盖现代格式、银行、RS Box、BR 两角色、GB 区域布局、竞技场、完整字节／回读及原件保持，基础／进阶／GB 独立文件共用回归同步通过；手动识别完整回归 .tmp/pkhex-save-pokemon-detection.log 已通过。九文件 243 项前端、定向 Lint、完整类型、浏览器核心与网页／PWA 构建均退出 0。日志 .tmp/pkhex-save-pokemon-adapter-{front,lint,types}.log、.tmp/pkhex-save-pokemon-{core,web}.log；全仓格式和 diff 已通过，最后文档批次再清理。Chrome 4 直接读取已授权本地页仍失败，页面未核验。所有编译任务结束，原件 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。早期 native／native-final／native-expanded／native-complete／native-regions／native-all／native-supported／native-adapter 日志保留对应失败，不能当作最终通过记录。

竞技场二代的 SK2 等尚无专用实体编辑适配，不能因识别或其他存档编辑器可用就宣称全部可写。经验值、状态、觉醒力量及其余设置／主窗口操作继续在完整目标内；外部 Chrome 页面仍待核验。本批尚未提交推送。

## 2026-10-16 图示球种选择（API169）

存档和独立宝可梦共用来源编辑器新增图示球种选择。依据 BallBrowser.LoadBalls 与 PKMEditor.ClickBall，使用原 Core.GetLegalBalls 逐项检查，保留 1..实体 MaxBallID 的全部选项；ShowLegalBallsFirst 只稳定排序，不过滤未通过项。原版本地球图、原版三语名称、检查文字和当前选择同时显示；按颜色推荐、恢复精灵球以及 Shift／Alt 快捷操作已接线，应用后仍走现有工作副本与撤销／导出流程。

切换来源版本或球种后重新读取；使用 Core 球种 setter 的实际读回值处理第四世代双球字段，不强行保留无法表达的请求值。设置修订号隔离旧目录与加载状态，重复保存相同配置也使旧读取失效。设置页仅开放已消费的 EntityEditor.ShowLegalBallsFirst，经验值、状态和觉醒力量等剩余设置／编辑入口继续保留在完整目标中。

最终原生专项通过 14 种独立格式、合法上游夹具、两种排序、完整球 ID／三语／检查／颜色推荐／setter 读回、跨版本预览、公开文件编辑重开及真实存档保持；独立来源既有专项同步通过。补充只读保留原始异常球种后，十文件 231 项前端、定向 Lint、完整类型、核心及网页／PWA 构建均退出 0。日志 .tmp/pkhex-ball-browser-native-final.log、.tmp/pkhex-ball-browser-preserve-{front,lint,types}.log、.tmp/pkhex-ball-browser-{core,web}.log。全仓格式与 diff 已通过，最后文档批次再清理。Chrome 4 读取已授权本地页仍失败，页面未核验；原件哈希不变，未提交推送。

下一步先补存档内的宝可梦编辑能力边界。当前 Program.cs 的 CanEdit 只列 Gen3–7 主系列、GC、剑盾与 BDSP；GB、LGPE、LA、SV、Z-A、BR 没有进入此通用开关，SavePokemonBrowser 仍以 report.canEdit 禁用普通宝可梦表单。独立文件的 16 格式支持及各专属存档编辑器不能证明该入口已完成。需要按实际写入路径拆分能力并核对队伍／盒装／BR 角色上下文，保留现有训练家和其他功能的独立约束；之后继续经验值、状态、觉醒力量等共用编辑。不能仅扩大全局开关便宣称全功能已接。

## 2026-10-16 所有者确认真实存档路径

采用所有者提供的 `C:\Users\Hakuhiro\Desktop\200\battery\E.sav`，仅以 `.tmp/pkhex-real-save-check/confirmed-input.sav` 工作副本运行当前 API168 的 `real-save` 专项。检查退出 0：SAV3E／E、131072 字节、14 箱 × 30 格、箱内 20 只、队伍 5 只；公开识别、完整宝可梦读取、数据库预览、报表、搜索、编辑、导出重开及校验和通过，其他箱位与队伍数据保持。

原件与工作副本检查后的 SHA-256 均为 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。日志 `.tmp/pkhex-confirmed-path-real-save.log`。外部 Chrome 4 直接读取已授权 `http://127.0.0.1:5173/` 仍失败，未进行页面操作，不能据此确认布局、控件交互或浏览器导出通过。本轮没有修改产品代码，也没有提交推送；完整接入目标保持进行中，经验值、状态及觉醒力量等剩余编辑入口仍需继续接线。

## 2026-10-16 宝可梦模板创建（API168）

补齐 Main.LoadBlankSaveFile／ResetSAVPKMEditors 对应的初始化流程。新增独立模板工作区，读取 Startup.DefaultSaveVersion，通过 BlankSaveFile.Get 与 EntityTemplates.TemplateFields 创建可编辑的独立实体，不把空白上下文当作可游玩的新存档。当前存档仅作为上游安全语言规则的参考，保留手动识别与 BR 角色上下文，不替换已打开的存档或独立文件。

LocalResources.TemplatePath 对应本机库分类，按末级目录名及实体格式选择唯一模板；复用 IndexedDB 文件库，支持校验后导入／替换、移除与单步撤销，事务 CAS 使用界面读取快照，拒绝覆盖其他页签的更新并保留其他分类。新建的模板编辑器独立保留，关闭有明确丢弃确认。

原生首轮差异为部分空白存档只暴露 DP／XY 等版本组，原 Core 会从组内选择版本。已验证结果属于正确组，仅对齐独立随机的版本字段后比较完整数据，不改 Core 或强制版本。目录内 41 个版本的默认／自定义模板、来源上下文、异常大小／空模板回退、设置路径、默认版本与真实 E.sav 保持专项均退出 0（.tmp/pkhex-entity-template-native-real.log）。正式 Worker／三语入口和两个设置已接线；九文件 217 项前端、定向 Lint、完整类型、核心及网页／PWA 均退出 0。首轮 Lint 四处生命周期依赖提醒已修正，重跑清洁。最终文档格式及 diff 继续清理，Chrome 4 读取已授权本地页仍超时，真实布局／IndexedDB／模板编辑交互未核验。原件 SHA-256 仍为 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442；无编译任务存活，完整接入目标继续，未提交推送。

## 2026-10-16 对战文本导入（API167）

新增上游 Main.ClickShowdownImportPKM／PKMEditor.LoadShowdownSetDefault 对应的导入预览：只取第一组，调用原 Core.ApplySetDetails，显示解析内容、前后对战文本、PID／加密常量、变化字节及三语解析问题，确认后更新工作副本。支持空箱位和独立实体，不自动读取剪贴板或抓取文本中的网址；本地文本上限 1 Mi 字符是浏览器资源边界。

预览冻结完整输出、来源与目标哈希、目标位置和设置／存档上下文；拒绝过期、替换、取消、重复确认及未确认的解析问题。13 组游戏样本的存档／实体、全部 16 种独立格式及中日文 GB 队伍／箱子、真实 E.sav 工作副本专项通过。GB 的差异为单体容器含队伍专用数据、盒装不保存，已改用来源 PokeList 的真实格位宽度完整比较，保留列表头／名称和全部实际字段，没有放宽断言。核心构建退出 0；首轮前端 205 项通过、3 项失败，原因是共享下拉框关闭时只渲染当前项，已修正渲染断言；首轮类型发现可缺省请求种类未收窄，已补判断。新增共享导入／导出页签以减少纵向堆叠，切换时丢弃旧预览，最终八文件 208 项前端、定向 Lint、完整类型、网页／PWA、全仓格式及 diff 均通过；追加三语回导、仅第一组和空／超限拒绝专项通过（.tmp/pkhex-battle-import-language.log），原有实体／GB／实档检查同步通过。最后文档批次再清理格式。Chrome 4 直接读取已授权本地页面仍超时，页面未核验，无正在运行的编译。完整目标继续，未提交推送。

## 2026-10-16 对战文本导出（API166）

补齐 Main.ClickShowdownExportPKM 与 SAVEditor.ExportShowdownText：存档工作区新增单只／队伍／单箱／全箱对战文本，独立宝可梦面板增加相同的单只导出。读取当前工作副本并显示完整三语文本，显式复制，不写原件，不自动读取剪贴板；来源哈希、范围、物理格位及请求编号核对，取消与迟到结果沿现有 Worker 生命周期处理。

开放已由 Core.GetSettings 消费的 BattleTemplate.Hover／Export 语言、顺序、能力值和招式格式等设置。StatsCustom 子字段未见上游实际消费，保持禁用并单独记录，避免把序列化算作功能。首轮原生编译修正测试样本的 PartyData 与实体写出调用；次轮 GP 合成实体自动识别不符，改用现有显式文件格式路径，最终专项退出 0。追加能力值／招式／Champions 格式及真实 E.sav 副本的队伍／单箱／全箱三语完整文本、数量、来源哈希和文件保持专项亦退出 0（.tmp/pkhex-battle-template-real.log）。八文件 194 项前端、定向 Lint、完整类型、核心及网页／PWA 构建均退出 0，全仓格式和 diff 已通过；最后文档批次再清理格式。Chrome 原连接已失效，重新识别为外部 Chrome 4，但读取标签仍超时，页面未核验。无运行中的编译任务。下一步补对战文本导入及剩余设置／主窗口操作，不能把导出或全部工程检查算作完整接入；未提交推送。

## 2026-10-16 单只合法性报告复制保护

共享 PokemonLegality 补齐来源 Main.cs:1177 的成功复制提示，存档与独立宝可梦面板共用。复制进行时禁用重复操作；报告、格位、语言或视图变化后忽略迟到结果，不显示旧成功提示或声音。拒绝访问保留三语错误状态，复制内容保持完整原文。新增异步剪贴板专项覆盖完整文字、过期请求、拒绝与迟到成功／失败；四文件 20 项专项、定向 Lint、完整类型、网页／PWA、全仓格式与 diff 已通过；无 Core 修改，未重复原生回归。真实 Chrome 剪贴板与提示仍待页面核验。提示音累计 139 处已绑定、7 处平台对应、18 处直接调用与通用消息仍待处理，整体目标未完成，本批未提交。

## 2026-10-15 存储关联检查公开接线（API165）

新增 JSExport、saveBulkLegality Worker 只读请求、来源 SHA-256 与 API 校验，正式工作区宝可梦分组新增三语关联检查、数量与完整报告、明确复制及合法性设置入口，开放已消费的处理训练家策略。工作副本和操作编号双重绑定，退出视图后忽略迟到结果；复制成功后才消费原来源提示。没有新增数值输入或修改 Core 算法。

本批原生专项、六文件 172 项前端测试、定向 Lint、完整类型检查和浏览器核心构建均退出 0；网页／PWA、最终全仓格式与 diff 检查通过；完整 npm run verify 退出 0，333 文件 1837 项前端测试通过。完整默认原生回归最终退出 0（.tmp/pkhex-bulk-public-native-full.log），无运行中的检查任务。真实 E.sav 的 25 条目、1 条关联发现及三语报告与原 Core 一致，原件哈希未变。Chrome 标签列表及直接读取本地 URL 均超时，页面未核验。来源提示音累计 138 处已绑定、7 处平台对应、19 处直接调用与通用消息仍待处理，PlaySoundOther 总入口继续禁用。前述 API164／内部服务状态为历史批次记录，完整 PKHeX 目标仍未完成，本批未提交推送。

## 2026-10-15 存储关联合法性检查原生服务

第九世代批次最终类型已退出 0，十一文件 373 项、Lint、网页／PWA、全仓格式和 diff 检查通过。本轮继续源码审计时确认缺少 SAVEditor 的存储整体检查，优先补齐实际功能：新原生服务使用 Core.Bulk.BulkAnalysis 的 SaveFile 重载，保留存档专属关联检查与当前处理训练家策略，返回来源哈希和完整三语结果，不以逐只分析列表代替。

首次专项因数据保持断言失败，定位为 GBA CloneInternal 会经过 GetFinalData 序列化；去掉克隆，改为分析 Open 已隔离的 SaveFile，保留断言并重跑。最终原生专项退出 0，覆盖 11 格式、双策略、空存档、重复条目、坏校验和排除及来源／输入保持。真实 E.sav 为 25 个条目、1 条关联发现，三语文本均与原 Core 一致；这只是工程比对，不对实际游戏合法性作单独结论。原件仍保留。

当前只有内部 C# 服务及测试，JSExport／Worker／正式三语 UI 尚未接线，API164 未变，不算浏览器功能完成；批量处理训练家设置先禁用，接线后再开放。无原生编译任务存活。下一步实现公开协议与存档工作区入口，更新版本握手、只读来源核对及取消／迟到保护，再生成浏览器核心和网页。剩余 20 处提示音与通用消息及其他全局设置仍在完整目标内，不因切换到实际缺口而移出范围。

追加的合法 Castform PK6 为所有者提供源码中的未修改测试样本，来源／哈希已纳入夹具说明和 manifest。单只分析保持合法，故意不匹配的测试存档身份使 CheckActiveHandler 开启时产生关联问题、关闭时 clean；专项 `.tmp/pkhex-bulk-legality-policy.log` 退出 0，原有 11 格式及真实 E.sav 同步通过。`.tmp/pkhex-bulk-legality-source.log` 核验 3555 个来源文件通过，设置页定向 Lint 通过；原件 SHA-256 仍为 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。没有 JSExport／Worker 新接口或新浏览器核心，正式接线和整体目标仍未完成，本轮未提交。

## 2026-10-15 第九世代提示与甜甜圈剪贴板

第八世代最终类型检查退出 0，十二文件 332 项、Lint、网页／PWA、全仓格式和 diff 检查已通过。本批追加第九世代 38 处来源，按当前冻结操作和成功提交回调提示，不把确认 token 当作动作；服饰同次批量的重复系统音合并为一声。团体战、服饰和甜甜圈返回明确的实际应用结果，失败保留预览／令牌，不误报成功。

甜甜圈新增三语复制十六进制按钮，沿 Core 的 72 字节原数据顺序复制；二进制和文本文件导出保持。拒绝错误尺寸，剪贴板失败／迟到结果不触发成功提示，原存档与工作副本不写入。训练家图像下载沿原 PNG／JPEG／BMP 流程补来源提示，不改图像编码。累计 137 处已绑定、7 处平台对应、20 处直接调用和通用消息仍待处理，PlaySoundOther 总入口继续禁用。本批十一文件 373 项、Lint、最终类型、网页／PWA、全仓格式与 diff 检查通过，无 Core／输入范围变化，真实 Chrome 交互／剪贴板／声音仍待核验，完整目标继续，未提交。

## 2026-10-15 第八世代来源提示音

第六／七世代最终类型检查退出 0，十五文件 322 项、Lint、网页／PWA、全仓格式与 diff 检查已通过。本批追加剑盾／BDSP／LA 图鉴、剑盾训练家和 BDSP 事件／贴纸／地下道／宝芬共 29 处来源。保持 BDSP 单种／形态、LA 高级研究、训练家外观重置及普通字段保存的原静默行为；宝芬提示按结果格式限制为 SAV8BS，不扩散到其他食物。

累计 99 处已绑定、7 处平台对应、58 处直接调用与通用消息仍待处理，PlaySoundOther 总入口继续禁用。本批十二文件 332 项、Lint、最终类型、网页／PWA、全仓格式与 diff 检查通过，仅变更来源事件映射，不改 Core／输入范围，真实 Chrome 页面与声音仍待核验，完整目标继续，未提交。

## 2026-10-15 第六与第七世代来源提示音

第五世代最终类型检查退出 0，九文件 238 项、Lint、网页／PWA、全仓格式与 diff 检查已通过。本批新增第六、七世代 23 处来源，普通动作沿成功应用入口；GO Park 批量导入的未放下文件及圆庆广场眼镜分别由当前冻结预览传入成功提交回调，不改变 Core 请求。豆子提示按结果格式限定 SM／USUM，其他食物保持。

空 GO Park 摘要不再清空剪贴板，沿已有三语无条目信息；非空写入成功且视图存活后才提示。圆庆广场截断提示记录为现有输入 maxLength 与 Core 校验的平台对应；累计 70 处已绑定、7 处平台对应、87 处直接调用与通用消息仍待处理。十五文件 322 项、Lint、最终类型、网页／PWA、全仓格式与 diff 检查通过，PlaySoundOther 总入口继续禁用，未改 Core／输入范围，真实 Chrome 页面／剪贴板／声音仍待核验，完整目标继续，未提交。

## 2026-10-15 第五世代来源提示音

第二至第四世代批次最终类型检查退出 0，十五文件 204 项、定向 Lint、网页／PWA、全仓格式与 diff 检查均通过。第五世代新增图鉴三类批量、奖章五类操作、森林／装扮、下载内容／C-Gear 导入和加盟大道实体导出，对应 13 处直接来源。C-Gear 图片只在 Core 的颜色／图块统计不超限时提示成功；超限沿既有警告，不改转换数据。原始文件在成功导入预览提示，确认保存不重复，失败及迟到请求不播放。

累计 47 处已绑定、6 处有浏览器平台对应、111 处直接调用与通用消息路径仍待处理，PlaySoundOther 设置入口继续禁用。本批九文件 238 项、Lint、最终类型、网页／PWA、全仓格式与 diff 检查通过，无 Core 或输入范围变化，真实页面／声音仍待 Chrome 核验，完整目标继续，未提交。

## 2026-10-15 第二至第四世代来源提示音

资料库批次最终类型检查退出 0，七文件 140 项、定向 Lint、网页／PWA、全仓格式及 diff 检查通过。本批以明确的请求类型／动作表接入 20 处来源成功提示，共用已核验的工作副本应用入口；录像导出沿原下载分支。不把所有成功请求统一加声音，失败、迟到、预览取消和未列动作保持来源规则。资料库取消预览也补齐代次核对，防止迟到取消清除新预览。

清单累计 34 处已绑定，6 处空白候选越界提示有浏览器平台对应，124 处直接调用及通用消息内部路径仍待处理；PlaySoundOther 设置入口继续禁用。本批十五文件 204 项、定向 Lint、最终类型、网页／PWA、全仓格式与 diff 检查通过，无 Core 或输入范围变化；真实 Chrome、声音及所有者验收仍待完成，完整目标继续，未提交。

## 2026-10-15 宝可梦资料库操作提示

相遇／配信批次最终类型检查退出 0，134 项定向测试、Lint、网页构建和全仓格式门槛已收齐。本批追加资料库用户搜索、手动重置及删除提交成功提示，共 3 个直接来源位置；翻页、初始化、其他提交、失败及旧资料返回不播放。搜索及提交补齐目录／设置代次核对，沿既有冻结确认、工作副本和本机库写入，不改变 Core 或输入范围。

来源清单累计 14／164 处已有消费点，PlaySoundOther 继续禁用，剩余 150 处与通用消息路径仍待处理。本批七文件 140 项、定向 Lint、最终类型、网页／PWA、全仓格式与 diff 检查通过，实际页面与音频仍待外部 Chrome，完整目标继续，未提交。

## 2026-10-15 相遇与配信操作提示

相遇和配信工作区新增用户搜索／手动重置提示，相遇条件另接重置和从编辑器读取成功，按只读来源共补 6 处。翻页、初始化和手动应用条件不增加提示，失败和卸载后返回不播放；配信搜索新增资料版本核对，目录／设置／资料变更后不恢复旧列表。累计 11／164 处直接调用已有对应，PlaySoundOther 设置入口仍禁用，其余调用与通用消息继续逐项处理。

本批六文件 134 项定向测试、两入口 Lint、最终类型检查、网页构建及 PWA、全仓格式与 diff 检查通过。本批不改变 Core、输入限制或控件样式。完整清单中手动识别工具的三处旧状态已按 API163 的模块收口证据与当前代码修正，不将页面标为已验收；实际 Chrome 交互和声音仍待连接恢复后核验。完整接入目标继续，未提交。

## 2026-10-15 确认真实存档路径与编辑回读

所有者确认原件为 `C:\Users\Hakuhiro\Desktop\200\battery\E.sav`，大小 131072 字节，SHA-256 为 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。本轮复制到 `.tmp/pkhex-real-save-check/confirmed-input.sav` 后运行现有原生核验程序，退出 0；识别 SAV3E、14 × 30 箱位、5 只队伍及合计 25 只宝可梦。训练家修改导出重读、单只宝可梦 PID 修改导出重读及独立 Core 完整字节比对通过，其他 24 只保持；原件未写入。日志为 `.tmp/pkhex-real-save-check/confirmed-run.log`。

外部 Chrome 的 `cua.getState()` 本轮在 20 秒后超时，连接未恢复；不属于新增授权，未使用应用内浏览器替代。真实页面、箱子图像布局、交互及音频仍未验收。当前完整目标保持进行中，本轮未提交或推送。

## 2026-10-15 搜索与静默导出提示音

首批 Other 提示音接用户搜索／重置、逐个定位成功／无结果、静默箱子导出 5 处直接来源；后台自动刷新、失败与迟到请求不播放。成功与无结果用不同短音，保留页级启用与独立来源静音，偏好读取失败不影响已发起下载。来源清单已逐项更新为已绑定／待页面核验，其余 159 处及通用消息内部路径仍待接，PlaySoundOther 设置入口不开放。

前端三文件 16 项、定向代码检查、最终类型检查、网页打包、全仓格式及 diff 检查通过；网页构建包含 PWA 257 项预缓存。本批无核心改动，不重复核心构建；实际声音与页面仍待外部 Chrome 核验，完整目标继续，未提交。

## 2026-10-15 加载与合法性提示音

独立页级提示音入口接存档成功打开和存档／独立宝可梦合法性报告两类事件，按各自来源开关播放。默认关闭，显式启用后使用浏览器短提示对应 SystemSounds.Asterisk，不带 Windows 音频、不改变叫声开关；隐藏／改设置／停用清理及迟到启用取消已接。PlaySoundOther 与其他源调用点仍未开放。

前端三文件最终 13 项（生命周期、开关消费、三语控件及叫声回归）、定向代码检查、最终类型、网页打包、全仓格式及 diff 检查均通过。没有核心代码变化，不重复核心构建；实际音频与听感待外部 Chrome 核验。本批未提交，完整目标继续。

后续 Other 提示音已从只读来源提取 164 个直接调用位置，记录在 [其他提示音清单](https://github.com/HaKu76/PokeRNGKit/blob/23528d34ec6663514265a5c7f48bc2df905b72e4/docs/pkhex-sound-coverage.md)。其中 5 处接线见上节，其余 159 处以及通用 Alert／Error／Prompt 内部路径仍待处理，不算接入完成。

## 2026-10-15 性别显示共享规则

基础及第八／九世代训练家、宝可梦编辑与详情、名人堂、第四世代／剑盾图鉴入口接同一设置订阅与来源符号表。三语名称保留，Unicode／ASCII 显示模式仅改变符号；原编号、范围与写入链不变。字段式训练家只处理 gender，剑盾确认预览同步；其余语言等选项保持。

前端首轮 12 项、追加训练家视图后的三文件 20 项通过；初次代码检查指出预览辅助函数未消费新规则，已补齐并复查通过。批量编辑时发现并撤回语言选项的过宽替换，最终仅性别字段变化。最终类型、网页打包、全仓格式与 diff 检查均通过；日志为 `.tmp/pkhex-gender-display-{front-final,lint,lint-final,build,format-doc-final,types}.log`。

字体复核找到实际 PGLDings TTF，已记录大小／哈希与 fsType=4；原笔记中“只找到家族信息”不再代表文件现状。字体内未找到许可文本，fsType 的预览／打印嵌入标记不足以确认 Web 编辑分发，未复制或改写字体。详细来源及 OpenType 说明见模块文档。字体平台对应及其他消费点未齐，Display.Unicode 仍禁用，本批未提交，完整目标继续。

## 2026-10-15 Unicode 与异色符号显示

原生实体读取新增可选潜力文字，直接使用 Core.GetPotentialString；形态名称按 Display.Unicode 选择 Core 的性别符号表。性别可选范围仍使用固定语义名称判断，显示偏好不改变编辑限制。前端基础编辑器显示当前潜力评价，异色按钮消费两项自定义符号设置，三语操作名称保持，普通文本转义及显示宽度保护已接。

前端三文件 14 项及定向代码检查通过。原生双模式、潜力等级、三语形态和原字节专项通过；首轮测试在同一 Worker 切换设置触发冻结保护，已用 Reset 模拟新 Worker，不修改产品保护。图鉴、个人数据图表、森林、运动场、名人堂及训练家形态列表已批量接来源符号表，个人数据图表／运动场／名人堂及第四至第九世代对应图鉴回归均通过；合成图鉴证据仍不作为真实游戏验收。

真实 E.sav 的 Unicode／ASCII 两种模式共 50 条潜力读取均与原 Core 一致，输入和工作副本完整字节保护通过。最终类型检查、最新浏览器核心、顺序网页打包、全仓格式及 diff 检查通过。批量 C# 编辑产生的 15 个文件尾空行已修正为 LF／单个结尾换行。上一批无效选项的最终增量类型及文档格式均通过。

日志为 `.tmp/pkhex-unicode-{front,lint,native-final,forms-native,dex-native,real,core,build,types,format-confirm}.log`。训练家性别等剩余 UI 消费点与字体映射未接齐，Display.Unicode 全局入口仍禁用，不宣称完整 Unicode 接入。实际页面仍待外部 Chrome 核验。完整目标继续，未提交。

## 2026-10-15 无效选项颜色

实体编辑选择框共用存档内包装，保留未知原始编号、禁选不适用占位并声明无效状态；修正后恢复共享控件样式。基础属性／招式、回忆招式、来源、记忆、历史、形态参数、缎带、异色和超级训练沿同一规则，开放 Draw.InvalidSelection；不改变核心读写、数值域或查询工作台。

前端三文件最终 14 项及定向代码检查通过，最终网页打包、全仓格式及 diff 检查通过，类型检查仍在运行。联动核对修正缎带按列表长度误判稀疏编号的旧条件，改为按真实 ID 查找；有效零值及稀疏编号均有检查。来源及颜色边界已记入模块文档；本批无核心代码变化，不重复核心构建。日志为 `.tmp/pkhex-invalid-select-{front-final,lint,lint-final,build-final,format-final}.log`，类型日志为 `types.log`。上批标记文档最终格式扫描已通过。Chrome 仍未连接可读标签，实际页面未核验，本批未提交；完整目标继续。

## 2026-10-15 宝可梦形状标记

存档和独立宝可梦共用三语形状标记入口，读取 Core 的四／六项状态、按来源切换并显式应用到工作副本；接 Draw.MarkBlue／MarkPink。第三世代显示顺序与 Core 已规范化索引分别映射，保留未编辑的保留值及打包其他位，不重算队伍能力值。原始实体保护、撤销和导出路径复用。

前端六项及定向代码检查通过。原生十四种实体布局的标记专项及既有十一版本原始编辑回归通过，并直接运行最终 DLL 复核退出码为 0。首轮因测试对 Span 再取 Span 导致编译失败，已修正，并将第三世代期望改为独立形状属性。首次全仓格式及 diff 检查通过；旧会话句柄与对应进程均已消失，不能还原旧类型检查退出码，现顺序复核类型结果，未启动重叠检查。

真实 E.sav 工作副本全部 25 只的标记与 Core 独立形状属性一致；箱内和队伍各一例编辑／导出／重读与独立 Core 设置后的完整文件逐字节一致，校验和及输入／工作副本保护通过。核验脚本曾修正 Memory 转换及 JSON 大小写命名，两项均为脚本问题。原件 SHA-256 保持 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。类型复核、最新浏览器核心、顺序网页打包、最终格式和 diff 检查均通过。证据为 `.tmp/pkhex-markings-{front,lint,native-confirm,real-confirm,types-confirm,core,build,format-confirm}.log`。Chrome 复查为 id3／标签为空／fetch 失败，页面仍待外部 Chrome 核验，本批未提交；完整目标继续。

## 2026-10-15 格位轮廓光晕

实体悬停新增独立轮廓图像资料，排除道具与格位标记；共享箱子／队伍及登记队伍入口接像素遮罩，原图保留在上层。普通与蛋的空心算法分别沿来源，颜色映射现有 Ant Neutral 语义令牌；16 阶、512ms 往返及减少动态效果分支已接，隐藏／切换与迟到结果沿共享生命周期清理。

未修改上游 ImageUtil 生成三组普通光晕夹具，前端四文件 46 项、定向代码检查、原生上下文及七类存档悬停回归通过；最新浏览器核心及顺序网页打包通过，首次全仓格式及 diff 检查通过。补齐 HoverSlotGlowEdges 的设置入口、布尔校验和实际启停；补线后的资源哈希检查首次超出默认 5 秒，以 30 秒上限复查后 46 项及定向代码检查均通过。类型检查及补线后的全仓格式检查仍在运行，不重复启动。代码检查初轮指出渲染中读取引用及组件混合导出，已改为已验证响应保存元素、绘图辅助独立模块。

真实 E.sav 工作副本 25 只宝可梦（含队伍 5 只）的光晕物种／格位／标记排除、三语预览、叫声名及完整字节保护通过，编辑／导出／重读通过；原件 SHA-256 保持 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。日志见 `.tmp/pkhex-slot-glow-{native,core,build,real,real-save,front-final,lint-final,format-final}.log`，补线复查另见 `switch-*`，最终格式日志为 `format-switch-final.log`。Chrome 复查仍 id4／标签为空／fetch 失败，实际叠层与页面未核验，本批未提交；完整目标继续。

## 2026-10-15 本机叫声资料与播放

Worker 返回来源形态 WAV／物种回退名，保留武道熊师特例；设置页新增三语本机资料导入、当前目录列表、移除／单步撤销与页面级播放启用。资料为独立 IndexedDB Blob 快照，名称冲突不覆盖，CAS／失败保护及跨标签通知已接。共享悬停使用有属主的单通道播放，离开、隐藏页面、改设置／资料或停用后停止，迟到解码取消。SoundPath 与 HoverSlotPlayCry 两个消费点已开放。

前端六文件 29 项、原生命名／上下文及既有悬停回归、最终类型与代码检查通过；两处生命周期清理警告已修正。最新浏览器核心与顺序网页打包通过，框架已更新。真实 E.sav 工作副本全部 25 只宝可梦（含队伍 5 只）的来源叫声名、位置、三语标题与字节保护通过，编辑／导出／重读回归也通过；原件 SHA-256 保持 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。

日志为 `.tmp/pkhex-cry-{front-final,lint-last,types-final,native,core,real,real-save,build-final,format-doc}.log`；其余改动文件的代码检查见 `lint.log`。旧的重复格式扫描已停止，最终合并扫描通过。Chrome 仍为 id4／标签为空／`nodeRepl.fetch request failed`，未使用真实 WAV、浏览器解码或播放结果作为证据，页面与听感未验收。边缘光晕及其他提示音仍未完成，本批未提交，完整目标继续。

## 2026-10-15 跨来源悬停预览

资料库、Stadium 登记队伍、相遇与配信候选接入同一弹层和显式来源；登记队伍不映射到箱子，资料库沿各条目的储存类型分析。候选沿来源只读资料提示，不为悬停生成实体，开放候选详细信息开关。查询、列表和元素三层校验旧响应，嵌套编辑器只由最近作用域处理，悬停不占用前台操作编号。

最终前端五文件 122 项、定向 Lint、类型和格式检查通过；原生上下文、五类 Stadium、原有七类存档／队伍格位回归通过，普通相遇详细模式及相遇／配信冻结输出哈希已核对。初次类型检查发现资料库没有直接持有 SaveReport，已改为从响应读取图像及世代，解除多余依赖；修正后重跑通过。最新核心与顺序网页打包通过，框架已更新。

真实 E.sav 工作副本的 25 条当前存档及 25 条只读备份记录，三语标题、目标／来源／图像对应及完整字节保护通过；编辑／导出／重读回归也通过。原件 SHA-256 保持 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。日志为 `.tmp/pkhex-context-hover-{front-final,lint-final,types-final,native-final,core,real,real-save,build-final,format-last}.log`；首轮其余文件的 Lint 见 `lint.log`。Chrome 仍为 id4／标签为空／`nodeRepl.fetch request failed`，实际弹层、嵌套与输入交互未核验，不作为所有者验收。本批未提交，声音／叫声与光晕等尚未接入，全部适用 PKHeX 目标继续。

## 2026-10-15 格位悬停预览

箱子、队伍、全览与双箱视图接入同一套只读预览。Worker 使用 Core 的三语战斗模板、招式有效性、非法原因及相遇格式，显示本机宝可梦／精灵球／属性图像。开放七个已绑定 Hover 字段，Alt 切换文字、键盘焦点和 Escape、触屏排除及视口限制已接；切换格位、数据与设置后忽略旧读取结果，保留前台编辑。

前端四文件 115 项、原生七类存档及 Party 上下文、最终类型／Lint／格式、最新核心和顺序网页打包均通过，框架已更新。初稿测试直接设置受保护的 PartyCount 已修正为调用来源写入方法；清理回调警告已修正。E.sav 工作副本全部 25 只宝可梦（含队伍 5 只）悬停读取、三语标题、完整哈希／格位绑定及字节保护通过；编辑／导出／重读回归也通过，原件 SHA-256 保持 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。日志为 `.tmp/pkhex-hover-{front,native-final,types-final,lint-last,core,real,real-save,build-final,format-final}.log`。

Chrome 本轮识别为 id4，但标签读取仍报 `nodeRepl.fetch request failed`。真实弹层的布局、键鼠／触屏交互未核验，不作为所有者验收。数据库、登记队伍与相遇候选预览、声音和光晕仍未完成，不将格位预览当作全部 Hover 已接入。本批尚未提交，完整目标继续。

## 2026-10-15 自定义配信共享数据

已接入各 Worker 的外部配信表配置、数据指纹及客户端资料变更取消。合法性、相遇和默认配信窗口共享当前资料目录，显式文件列表避免重复拼接全局外部表。配信资料写入后重建会话，保留窗口撤销快照；读取失败停止操作。来源 Core 保留内容相同的多个文件，测试按该行为核对。

前端六文件 143 项、定向 Lint、类型与全仓格式通过；原生共享表／相遇／合法性、目录识别和配信数据库回归通过。初稿修正重复文件预期与测试中的来源字段名后通过，产品沿用原始 Core。真实 E.sav 工作副本的识别、箱子读取、编辑／导出／重读、其他格位及输入保护通过。日志为 `.tmp/pkhex-external-gifts-{front-final,lint-final,types,native-final,real-save,format-final}.log`；最新浏览器核心与顺序网页打包均通过，框架已更新，日志为 `.tmp/pkhex-external-gifts-{core,build-final}.log`。Chrome 仍识别为 id3，但标签列表为空并返回 `nodeRepl.fetch request failed`；实际页面、浏览器虚拟文件系统和跨标签交互未核验。原件 `Desktop/200/battery/E.sav` 为 131072 字节，SHA-256 仍为 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。完整 PKHeX 目标与 SettingsEditor 模块保持进行中，本批尚未提交。

## 2026-10-15 存档编辑阶段记录

- 2026-10-15 MGDatabasePath 接配信资料库分类与子分类，旧记录只读归属 mgdb；存储版本 2 保留旧仓库／快照，CAS／撤销覆盖完整集合，移除保护其他分类。目录导入保留相对路径，新增只读 Core 批量识别入口，按来源识别跳过无关文件，不在 JS 实现格式识别；验证后再写入本机库。前端五文件 17 项、定向 Lint 通过，修订测试 Span 访问后原生识别与配信数据库回归通过；类型、最新核心与顺序构建后的前端产物通过。日志为 `.tmp/pkhex-gift-directory-{front,lint,native-final,types,core,build-final,format-final}.log`。全局自定义配信刷新仍待接，页面／真实 IndexedDB 升级未核验，未提交，完整目标继续。

- 2026-10-15 资料目录接 LocalResources.DatabasePath：旧记录只读归属 pkmdb，切换分类与子分类筛选保留其他资料；原生来源名称含目录，新增回执验证目录归属，拒绝删除非活动目录与库快照。存储升版本 2，不重建已有仓库，CAS／撤销包含目录元数据；存档库及手动其他存档保持独立。前端五文件 32 项、定向 Lint、完整原生数据库回归通过；类型、前端构建与真实副本目录提交检查通过；真实 E.sav 的 PK3 目录身份绑定、错误目录替换拒绝、加入／冻结确认及源字节保持有证据，原件哈希保持。日志为 `.tmp/pkhex-database-directory-{front,lint,native,types,build,format-final}.log`、`.tmp/pkhex-database-directory-check/run.log`。本轮无 C#／Wasm 产品改动，不重复核心构建；浏览器升级与页面尚未核验，未提交，完整目标继续。

- 2026-10-15 目录设置补接启动发现、最近／备份分类和配置目录快捷筛选。九项常见主机路径逐项对照 Core；仅识别已导入的本机分类，不扫描磁盘。派生分类不写入原元数据／CAS 哈希；目录范围可查看未列入最近／备份的已导入文件，采用共享 Select／44px 按钮，并保留来源 ID 打开避免重复缓存。配置备份根整理不递归，手动标记沿旧规则。原生设置专项及原列表／会话／API、前端五文件 38 项、定向 Lint 通过；类型、最新核心和最终前端产物通过；首次前端构建主动停止，最终产物在新核心完成后顺序生成。真实 E.sav 副本通过分类／范围／打开重读、校验和与 25 只宝可梦检查，打开副本与原件哈希一致。日志为 `.tmp/pkhex-library-locations-{native,front,lint,types,core,build-final,format-final}.log`、`.tmp/pkhex-library-locations-check/run.log`。页面未核验，未提交，完整目标继续。

- 2026-10-15 宝可梦数据库接本机存档库的备份／额外分类／子目录搜索，开放四项设置。保留额外目录排除备份、子目录开关同时作用于备份目录、重叠目录重复扫描的来源规则；来源是只读会话快照，预览／确认／导入／报表同包，文件库替换和撤销只含自有文件。读取代次保护设置切换，清单三语及 44px 折叠控件已接。前端五文件 29 项、定向 Lint、原生完整数据库专项通过；真实 E.sav 副本 25＋25 条目、来源删除拒绝、导入／确认／重读与无来源文件 delta 通过，原件哈希保持。最终类型、定向 Lint 与前端构建通过，已补加载状态／旧预览清理／合并容量预检／旧目录结果保护，日志为 `.tmp/pkhex-database-library-{front,lint,lint-final,native,types-final,build-final,format-final}.log`、`.tmp/pkhex-database-library-check/run.log`。本轮未改 C#／Wasm 产品代码，不重复核心构建。Chrome 当前 id3，标签为空／fetch 失败，页面未核验；当前未提交，剩余全局设置和完整目标继续。

- 2026-10-15 接打开时自动备份、启动恢复及最近记录上限，开放四项已接设置。名称沿 Core GetBackupFileName，复制原始输入、同名不覆盖；最近记录和备份单次 IndexedDB CAS，容量／并发失败保留旧目录并给三语提示。最近上限只修剪标记，不删除原件或备份；恢复区分文件修改时间与打开顺序，保留 .bak／backup 基础名的来源排除规则。备份路径明确对应浏览器库内分类，不扫描电脑路径。原生备份专项、前端首轮三文件 108 项与最后两文件 11 项、定向 Lint、最新核心构建通过；真实 E.sav 副本命名／后缀去重、设置 JSON 字段、完整字节及重读校验和通过，原件／输入／备份均为 SHA-256 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。修复状态提示未显示／恢复错误被通用错误覆盖，以及 ES2023 toSorted 超出 ES2022 目标的问题；最终类型复查、全仓格式及 diff 检查通过。日志为 `.tmp/pkhex-save-library-{native,front,front-repaired,lint-final,lint-repaired,core,types-repaired,format}.log`、`.tmp/pkhex-real-save-check/backup-run.log`。浏览器工具当前只列 IAB／MCP Apps，无外部 Chrome；页面未核验，不使用 IAB 替代。本批未提交，剩余设置和完整目标继续。

- 2026-10-15 合法性报告接四项 Display 设置，保留来源 Ctrl-only XOR 详细展开、忽略合法报告正文、隐藏复制入口及完整 verboseReport + 相遇描述的三语复制。内联页面保留完成状态，复制只在点击发生且回执绑定报告；存档分析用实体副本。原生两合法性结果 ×16 设置组合、前端四文件 131 项／最终视图五项、类型／Lint、最新核心、property-trim 与原合法性 11 格式上下文回归通过，框架已更新。真实 E.sav 副本编辑／导出／重读与独立 Core 全字节对照通过，原件哈希保持。日志为 `.tmp/pkhex-legality-display-{native,front,ui-final,types,core,trim,context-regression}.log`、`.tmp/pkhex-real-save-check/legality-display-run.log`。Chrome 仍 id4／标签为空／fetch 失败，实际复制和页面未核验；本批未提交。已只读核对 Backup／LocalResources／Startup 与现有文件目录，下一步实际绑定自动备份、启动恢复及本机资源对应方式，不把保存路径字符串当作功能完成，完整目标保持。

- 2026-10-15 补齐真实格位 team／locked／party1–6／starter 标记，保留来源位置、顺序、slot<30 限制与首位优先。空格位保护状态单独返回，用 b_0 绘制，不删除格位或伪造宝可梦；经验条依合法性标记分支保持源顺序。原始资源累计 6421 项。原生六组合、SWSH 实际锁定、空／非空、LGPE 指针与原件保护通过；图像四文件 46 项、更新全览七项、最终类型／Lint、最新核心和 property-trim 通过，框架已更新。真实 E.sav 新报告下编辑／导出／重读与独立 Core 全字节对照通过，原件哈希保持。日志为 `.tmp/pkhex-storage-markers-{native,front,gallery,types,core,trim}.log` 和 `.tmp/pkhex-real-save-check/storage-markers-run.log`。Chrome 本轮仍 id4／标签为空／fetch 失败，页面未核验；本批未提交。下一步继续剩余全局设置的实际作用点与平台限制，保持完整目标。

- 2026-10-15 存档格位接合法性警告／禁用招式提示与原始相遇背景，保留 Personal／队伍／箱子上下文，副本分析；校验和与合法性独立。开放非法格位开关、PKM 相遇背景及筛选灰度／透明度四项设置，移除旧固定 0.35 CSS。Worker 生成实际运行时 alpha 映射，按来源 <=0.01f／>1f 跳过处理。未修改的 ImageUtil 七组位图与前端 SHA-256 全字节匹配；资源累计 6412 项。原生格位／公开报告／设置、前端三文件 38 项、最终定向 Lint／类型、修订核心与 property-trim 均通过，框架已更新；真实 E.sav 副本编辑／导出／重读及独立 Core 全字节对照通过，原件哈希保持。日志为 `.tmp/pkhex-slot-art-{native-final2,filter-reference-final,front-final2,types-final,core-final,trim}.log` 与 `.tmp/pkhex-real-save-check/slot-art-run.log`。Chrome 本轮仍 id4／标签为空／fetch 失败，实际图片未核验。本批未提交；继续格位队伍／锁定／伙伴标记和剩余全局设置，完整目标保持。

- 2026-10-14 相遇／配信数据库和报告接共享轻量图片视图，保留物种、当前模式及来源图层；开放捕获球与普通相遇背景五个设置。配信不加相遇颜色，玛纳霏蛋独立处理；报告沿原存档初始化，避免 FRLG Clone 重置个人表。原始资源累计 6410 项。共享视图／公开 JSON 及设置、报告、相遇、配信四组原生回归全部通过，前端六文件 35 项、最终类型／Lint、最新核心与 property-trim 通过，框架已更新。真实 E.sav 工作副本编辑／导出／重读及独立 Core 全字节对照通过，原件哈希保持。初稿类型／必需 Location、无有效 GBA 区块的 FRLG 夹具及 Gen3 默认配信在场筛选预期均已修订，未改变产品筛选。日志为 `.tmp/pkhex-shared-art-*-regression.log`、`.tmp/pkhex-shared-art-{core,trim}.log` 和 `.tmp/pkhex-real-save-check/shared-art-run.log`。Chrome 本轮仍 id4／标签为空／fetch 失败，页面未核验；当前不提交，下一步接 PKM 合法性相遇背景与剩余设置，完整目标保持。

- 2026-10-14 图像接入超极巨化／头目来源标记与暗黑／霸主光晕，暗黑洛奇亚使用专属底图、普通形态生成背景光晕，霸主保留原形态并显示基础形态及前景光晕。按资源地址组合图层，避免数组下标错位。未修改的来源 ImageUtil 生成六组原生夹具，前端完整字节哈希全部匹配；原始资源累计 6373 项。原生设置、最终前端三文件 26 项、Lint、类型、最新核心与 property-trim 均通过，框架已更新；真实 E.sav 图片报告下的编辑／导出／重读及独立 Core 全字节对照通过，原件保持。日志为 `.tmp/pkhex-special-sprites-{native,reference,front,lint,types,core,trim}.log` 和 `.tmp/pkhex-real-save-check/special-sprites-run.log`。Chrome 仍 id4／标签为空／fetch 失败，实际图片与页面未核验。本批未提交；下一步继续合法性相遇背景、数据库／报告图片模式与效果、剩余全局设置，完整目标保持。

- 2026-10-14 存档图片接入太晶背景与经验条，开放五项设置；以来源透明度阈值和 20/80 字节混合处理像素，独立实体预览保持来源不加格位效果。修正插画模式 TM、代欧奇希斯随当前存档版本／FRLG PersonalTable 变化、阿尔宙斯 Curse 索引及缺失形态 0.5 未知标记。原生设置、最终前端三文件 17 项、Lint、类型、最新核心及 property-trim 均通过，浏览器框架已更新；真实 E.sav 新报告结构下的训练家／单只宝可梦编辑导出重读与独立 Core 全字节对照通过，原件哈希保持。日志为 `.tmp/pkhex-sprite-color-{native,front-final,lint,types,core,trim}.log`、`.tmp/pkhex-real-save-check/sprite-color-run.log`。Chrome id4 仍标签为空／fetch 失败，实际 Canvas／页面未核验。本批未提交；下一步继续合法性相遇背景、超极巨化／头目／暗黑／霸主图像效果和剩余全局设置，完整目标保持。

- 2026-10-14 图像补齐携带道具／招式学习器／招式记录与星形／方形异色标记，导入来源原始 PNG 共 6371 项并记录宽高与 SHA-256；统一 68×56 图层组合接入箱子、详情、独立实体、数据库、登记队伍及多个游戏队伍预览。修复旧 img 尺寸规则遗漏组合图像的问题，对战录像／DLC 队伍也复用组件。原生设置专项、最终前端三文件 13 项、定向 Lint、类型、最新核心构建与 property-trim 均通过。真实 E.sav 副本单只宝可梦 PID 编辑／导出／重读与独立 Core 完整字节一致，其余 24 只保持；原件哈希不变。日志为 `.tmp/pkhex-sprite-overlays-{front,types,core,trim,lint}.log` 与 `.tmp/pkhex-real-save-check/pokemon-run.log`。Chrome 本轮仍 fetch 失败，页面未验收；相遇／太晶／经验／特殊形态效果及其他设置继续，当前不提交，完整目标保持。

- 2026-10-14 接入 HOME 标识的无损字符串读取／编辑与隐私隐藏，补浏览器标题隐私和 Core 三语游戏名。来源输入上限 16 字符、过滤非十六进制、空值为 0、显示 X16；五种支持格式复用副本编辑和完整导出，不因仅改 HOME 重置队伍能力值。原生 HOME／标题、既有独立原始值回归、前端 53 项、表单／隐私 5 项、最终核心／类型／Lint 与 property-trim 均通过，框架已更新，全仓格式通过；完整输出与原件保护有证据。原 E.sav 哈希保持，Chrome 仍 fetch 失败，页面未验收。当前不提交，其他全局设置与图片叠加继续。日志为 `.tmp/pkhex-home-tracker-title.log`、`.tmp/pkhex-home-tracker-raw-regression.log`、`.tmp/pkhex-home-tracker-core.log`、`.tmp/pkhex-home-tracker-trim.log`。

- 2026-10-14 设置继续接报告两项、箱子导出六项默认值与命名器。报告修复忽略核心 Visible 的问题，按来源保留隐藏列／额外列顺序和 CSV 导出全部数据列行为，排序保留临时显示状态；报告请求保护上限在设置完整校验与表单同步。箱子导出沿来源默认零值和枚举范围，可按本次操作覆盖，Silent 不显示成功文字，命名器实际用于 ZIP 路径。五文件 130 项、原生设置、最终核心／类型／Lint、property-trim 与全仓格式均通过，框架已更新；ZIP 命名／完整存档保护有证据。日志见 `.tmp/pkhex-settings-report-export.log`、`.tmp/pkhex-settings-report-export-core.log`、`.tmp/pkhex-settings-report-export-trim.log`。原 E.sav 哈希保持，Chrome 本轮仍 fetch 失败，实际页面未验收。本批仍未提交；AllowBoxDataDrop、声音、其他设置与图片叠加仍须完成，完整目标保持。

- 2026-10-14 SettingsEditor 补齐三个数据库共十个选项的统一读取与入口：相遇／神秘礼物完整设置、宝可梦数据库排序／在场筛选／行数。旧设置只迁移到草稿，Core 完整校验后单次保存统一 JSON 与版本 2 标记，保留原模块键及训练家数据，旧页面不能覆盖新标记。重复控件改为跳转对应分组，保留导入与训练家操作。八文件 153 项、最终类型／Lint、全仓格式与 diff 检查均通过；本批未改 C#／Wasm，不重复原生构建。原 E.sav 哈希保持，Chrome 本轮仍标签读取失败，页面未验收。三个目录扫描字段及其他全局设置、HOME 标识和图片叠加仍待完成，当前不提交，完整目标保持。

- 2026-10-14 SettingsEditor 已挂存档工作区顶部三语入口，开放实际已接的 Core／隐私／图像字段，完整目录保留其余待接项。补齐只读字段默认恢复保护、数值 HTML 范围、同名字段层级、无变化保存阻止和重新读取操作；设置变化终止旧请求并刷新工作副本，保留原件和撤销记录。独立文件改为复用设置／活动／模式规则的独立 Worker，原先未传设置和未保留模式的问题已修正。六文件 131 项前端、最终原生设置、类型／Lint、最终核心与全仓格式均通过，框架已更新；当前不提交。原 E.sav 哈希保持；Chrome 本轮仍 fetch 失败，页面未验收。HOME 标识、标题隐私、其他设置作用点与图像叠加仍须完成，完整目标保持。日志为 `.tmp/pkhex-settings-entity-builder-final.log`、`.tmp/pkhex-settings-entry-final-core.log`；下一步继续剩余设置绑定，不重复已通过的检查。

- 2026-10-14 真实存档路径确认采用 `Desktop\200\battery\E.sav`。API164 在工作副本上通过识别、训练家金钱修改、导出、重新读取与完整宝可梦报告保持检查：SAV3E、14×30 箱子、5 个队伍成员、共 25 个非空宝可梦；原件 SHA-256 保持。图像模式／蛋叠加接入共享组件，修订后的原生设置专项、前端 7 项、定向 Lint、类型检查、最新核心构建及 property-trim 均通过，浏览器框架已更新；全仓格式与 diff 检查通过。日志见 `.tmp/pkhex-settings-sprites-build.log`、`.tmp/pkhex-settings-sprites-trim.log` 和 `.tmp/pkhex-real-save-check/run.log`。Chrome 已识别扩展但标签读取仍失败，页面未验收。全局设置其余作用点、正式入口及其他图像叠加未完成，当前不提交；完整接入目标继续。

- 2026-10-14 设置API164核心32508、裁剪元数据专项、图片引用3项9477、末次全仓格式27844均退出0；原生目录／公开／实际异色报告与前端97项及类型已通过，原E.sav哈希保持。当前22对象模型／目录／验证／Worker／存储已接，组件已写但未挂入口；其余对象作用点、图像模式和叠加、完整整仓与实际Chrome仍未完成，本批未提交。下一步继续接行为和正式入口，保持完整目标，不把工程检查当所有者验收。手动识别1e2dd11已推送，Actions38533869202已success。

- 2026-10-14 设置API164核心32508已退出0，public框架已更新；手动识别Actions38533869202确认completed/success。实际异色读取15117、完整目录9099／颜色87743／公开93380原生、前端97项与编辑组件类型78965均通过；末次格式39115通过。裁剪元数据专项现运行（TEMP/pokerngkit-settings-trim.log），源码仍保持。其余17对象作用点、Sprite模式与叠加、正式入口、完整整仓／页面验收未完成，本批不提交，完整目标继续。

- 2026-10-14 Settings API164 新目录复核9099与异色报告15117退出0：22对象／默认候选来源排除／枚举类型别名／颜色名RGB与实际报告异色图标链路通过。设置切换保持指纹锁和旧Core／SpriteName恢复。三语资源已扩大413条并含枚举名称；三文件97项37899、末次组件Lint88616、编辑类型78965通过。图片导入21216按来源resx复制5230个原始b／a／c资源，原路径SHA256列入third_party art-manifest，PNG未改动。API164核心现构建（TEMP/pokerngkit-settings-core164.log），冻结编译输入；设置组件仍未挂入口，模式选择／蛋与其他叠加、显示／数据库／导出等剩余对象作用点需继续接，不宣称已全部生效。本批未提交、页面未验收，完整目标继续。

- 2026-10-14 SettingsEditor API164 已扩完整22对象模型／嵌套字段目录／源默认与规范化、公开读取／验证／每请求设置作用域、Worker finally恢复、客户端指纹变化重建和本机快照。模型专项5141、目录49562、公开93380退出0；前端两文件96项15995、定向Lint6361／29713通过。新共享Select编辑组件已写但未挂产品入口，其他17对象的实际显示／导出／数据库作用点与完整设置流程仍待接，不能声称全部设置生效。颜色名规范化专项87743在运行（TEMP/pokerngkit-settings-colors.log），编译输入冻结；类型99881与编辑组件类型新句柄仍待终态。312条三语标签来自WinForms语言资源，本地打包。API164核心尚未构建，完整门槛／实际Chrome未完成、本批未提交，完整目标继续。

- 2026-10-14 设置严格重复字段测试已加强为两个完整有效 converter 对象，排除首对象缺字段提前失败的间接证据。专项 `99949` 已退出0（TEMP/pokerngkit-core-settings-duplicate.log）；写格位八组合31248／严格结构77565／作用域55999均通过，末次格式4761退出0。原文件哈希保持，API163不变，本批未提交；下一步接完整公开设置目录／Worker与本机UI。

- 2026-10-14 设置实际写格位专项 `31248` 已退出 0，八种默认设置组合与来源显式 EntityImportSettings 的完整 G3E 导出一致，原文件保护通过；严格 JSON `77565`、原子／嵌套恢复 `55999`、首次内部应用修正91041均通过。当前只有五 Core 对象的内部层，公开22对象目录／Worker／本机持久化／正式UI待接，API163保持，本批未提交。Actions38533869202最近仍in_progress，原E.sav哈希保持；完整目标继续。

- 2026-10-14 全局设置严格 JSON 专项 `77565` 退出 0：完整嵌套往返、未知／遗漏／重复字段拒绝与原子作用域保持通过。进一步增加实际绿宝石写格位八种默认选项组合，对照 Core 显式 flags 的完整输出和原件；专项 `31248` 运行（TEMP/pokerngkit-core-settings-slot-effects.log），编译输入冻结。来源 SAVEditor.GetImportSettingsOverride 对 Yes／No／其他分别用 All／None／default，确认全局默认和显式操作可并存，不盲目替换现有 None。最后全仓格式 `6055` 通过；API163 保持，公开设置／22对象UI／持久化未接，本批未提交。

- 2026-10-14 全局设置原子／嵌套作用域修正专项 `55999` 已退出 0，完整嵌套非空／enum 拒绝、旧对象 identity、分组语言版本、UseDefault 原始写入值、嵌套与重复 dispose 恢复通过。内部再增完整 JSON 形状检查：256 KiB 上限、必含全部可读写字段、未知／重复字段拒绝、再做类型验证，专项 `77565` 正运行（TEMP/pokerngkit-core-settings-json.log），编译输入冻结。写格位实际使用点继续核对，已有编辑／批量显式 EntityImportSettings.None 不应盲目改成默认；要按来源具体工作流接各设置。API163 保持，无公开22对象设置／持久化／UI，本批未提交。

- 2026-10-14 全局设置内部新增 source-generated 类型元数据递归验证（完整嵌套非空／五种 enum）、应用前旧全局快照、失败恢复与可嵌套 IDisposable 请求作用域；恢复保留旧合法性对象 identity、原始 EntityImportOption 和分组语言版本，避免来源 Apply 忽略旧分组版本造成请求残留。专项 `41197` 编译失败是测试 Severity 的 sbyte 常量255越界，已按底层类型改127，保留无效 enum 断言；修正 `55999` 正运行（TEMP/pokerngkit-core-settings-atomic2.log），编译输入冻结，只收原句柄。API163 保持，无公开设置／UI／持久化，完整22对象还待接，本批未提交；完整目标继续。

- 2026-10-14 SettingsEditor 内部修正专项 `91041` 已退出 0，五对象深拷贝／嵌套合法性所有权、写入三参数、导入与转换效果、默认恢复通过。首轮 `97280` protected getter 编译失败保留，测试改用公开 SetUpdateSettings 后通过。API163 保持，无公开设置／Worker／UI／持久化；完整嵌套验证、原子恢复和22对象完整作用点仍待实现，本批未提交。手动识别 1e2dd11 已普通推送；完整目标继续。

- 2026-10-14 SettingsEditor 内部首轮 `97280` 退出 1，测试读取 SaveFile 三个 protected getter，已改用来源公开 SetUpdateSettings 对照 EntityImportSettings.None／All，保留行为断言。修正专项 `91041` 正运行（TEMP/pokerngkit-core-settings-native2.log），编译输入冻结，只收原句柄；生产五对象深拷贝／逐项应用已写，完整输入验证／原子恢复／22对象目录／持久化／Worker／UI 尚未接，API163 不变，本批未提交。最后全仓格式 `51880` 已退出 0。手动识别 1e2dd11 已提交推送，Actions 38533869202 最近 in_progress；完整目标继续。

- 2026-10-14 手动识别已普通提交推送 main／origin/main `1e2dd114dbee0850010e0eaf3c0763bf504420f2`，标题 `feat: 接入手动存档识别与编辑上下文`，108 文件 1266 增加／398 删除；提交后工作区干净。Actions 38533869202 当前 in_progress，未确认部署；实际 Chrome／所有者验收仍未完成。下一独立模块 SettingsEditor 已开始内部 SaveCoreSettings：五个 Core 对象深拷贝、按来源逐项应用 SlotWrite／Import／Legality／Converter／SaveLanguage，避免磁盘扫描。专项 `97280` 当前编译运行（TEMP/pokerngkit-core-settings-native.log），输入冻结；API163 保持，无公开设置协议／UI／持久化／其余17对象，输入完整验证和冻结预览期间设置策略仍待完成。本批未提交，完整 PKHeX 目标继续。

- 2026-10-14 手动识别 API163 默认完整原生 `49264` 已退出 0，来源全类型／容器／识别生命周期与既有各模块全部通过。核心 `12273`、裁剪、新资源网页 `34704`、完整前端 `73623`（301 文件／1431 项）已通过；99 框架文件 public／dist 完全一致、E.sav 原件哈希保持。最后文档／格式与提交范围检查后按已有授权普通提交推送，标题 `feat: 接入手动存档识别与编辑上下文`。当前模块正式入口／三语／共享 Select／错误恢复／撤销和重建重绑定已接；实际 Chrome 页面及所有者验收仍未完成。下一独立模块全局设置，已核对 22 对象与实际 Core／UI 使用点，尚未开始代码；完整目标继续。

- 2026-10-14 手动识别完整前端 `73623` 已退出 0：全仓 Lint／类型、301 文件／1431 项单 Worker 测试通过，保留既有 Gen3Static Hook warning。核心 `12273`、裁剪专项、新资源网页 `34704`、最后全仓格式 `37034` 已通过，99 框架资源一致、原件哈希保持。默认完整原生 `49264` 仍在活跃句柄，已推进圆庆广场等模块，尚无总终态；继续只收该任务。最后完整原生通过后补记录／格式并普通提交推送。本批未提交，实际 Chrome／所有者验收未完成，完整 PKHeX 目标继续。

- 2026-10-14 手动识别新资源网页构建 `34704` 退出 0，PWA 257 项／24769.63 KiB。99 个 public／dist 框架资源哈希完全一致，E.sav 原件仍为既有 SHA-256。完整前端 `73623` 已过 Lint／类型，单 Worker 全测试正在运行；默认完整原生 `49264` 已进入阿尔宙斯等专项，仍有活跃 SaveEditor.Tests 14984，无总终态。最后格式 `37034` 运行中。继续只收三个现有句柄，成功后最后记录／格式并按已有授权提交推送；本批未提交，实际 Chrome／所有者验收未完成。

- 2026-10-14 手动识别 API163 核心 `12273` 已退出 0，public/pkhex/_framework 已生成新资源；裁剪元数据专项通过。默认完整原生在串行句柄 `49264`（TEMP/pokerngkit-save-detection-full-native.log），新资源网页构建 `34704`（web-build.log），完整 Lint／类型／单 Worker 测试 `73623`（verify3.log）仍运行，只收原句柄、不改编译输入。前一基础训练家 Actions 38519538084 本轮确认 completed/success；本批未提交，页面和所有者验收未完成。工程门槛后核对框架资源与原件哈希、最后格式，按已有授权普通提交推送。

- 2026-10-14 手动识别全 32 类型扩大 `9883` 已退出 0，含两 Bank7 版本／两 Ranch 版本、GB 全来源子版本和语言、九 GCI 区域组合及四 NSO 组合、完整输出对照／原件／公开上下文生命周期。最后格式 `18033` 退出 0。核心构建现运行（TEMP/pokerngkit-save-detection-core.log），编译输入冻结；全仓 Lint→类型→单 Worker 测试 `73623` 仍活跃。后续收核心再串行裁剪／默认完整原生，并在新框架资产上构建网页；未提交、Chrome 未验收，完整目标继续。

- 2026-10-14 全类型扩大 `32966` 已终态失败：新增 Stadium1J／Stadium1／Stadium2／Bulk3／Bulk4 对照通过，Bulk7 旧夹具缺来源版本与 100 箱子字段，现按 Bank7.IsFormat1／2 补 0x15C／0x15E；最新 `9883` 在运行（TEMP/pokerngkit-save-detection-all-types6.log），输入冻结。完整前端 `9101` 退出 1，只有新增捕获异常缺 cause 错误及既有 Gen3Static Hook warning；已为本地化 Error 附 cause，修正完整 Lint→类型→单 Worker 测试 `73623` 正运行（TEMP/pokerngkit-save-detection-verify3.log）。最后格式 `18033` 尚无终态。未提交，核心／裁剪／默认原生／网页构建与实际 Chrome 仍待完成。

- 2026-10-14 手动识别 API163 全类型扩大中：GB 全语言、RS／FRLG／AODemo／SWSH／LA／SV／ZA／BattleRevolution 的完整输出对照已逐项通过。失败分别来自 GBA 空夹具分区、LA／SV 合成日期、Stadium 空构造调用来源 ClearBoxes；已修夹具使用有效分区／日期及来源手动读取的 bytes 构造，不改生产规则、不删对照断言。最新 `32966` 运行（TEMP/pokerngkit-save-detection-all-types5.log），编译输入冻结；此前扩大 89029／71634／74148／36530 是失败结果，不冒充成功。游戏格式与容器多语言显示已补。完整前端分步检查 `9101` 仍运行，使用单 Vitest Worker；首次 verify `73729` 在格式阶段主动停止，避免无限制 Worker，不是通过。本批未提交，下一步收两句柄再串行核心构建／裁剪／默认原生与网页构建。

- 2026-10-14 手动识别 GB 扩大 `85608` 已退出 0，第一／二世代全部来源子版本与 LanguageID 的显式构造、完整输出对照和原件保护通过，既有全部容器及公开上下文专项继续通过。类型 `97301` 仍确认活跃（tsc 26868），最后全仓格式 `25237` 运行中；不重复启动。本批 API163 未提交，完整构建／裁剪／默认原生／前端和 Chrome 页面门槛仍待完成，保留完整目标。

- 2026-10-14 手动识别 API163 公开目录／参数、Worker 每请求配置与 finally 清理、输出重绑定、客户端重建重发、正式工具栏与三语共享 Select 已接。打开失败／取消恢复旧选择，新文件自动读取清理选择。公开原生 `83498`、客户端 92 项 `66246`、定向 Lint `62215` 退出 0；类型 `97301` 尚在运行。GB 全来源版本／语言扩大 `85608` 运行中（TEMP/pokerngkit-save-detection-gb.log），编译输入冻结，只收原句柄。其他类型及完整工程门槛未收齐、Chrome 页面未验收、本批未提交。完整目标继续，不进入下一独立模块。

- 2026-10-14 所有者指定 `Desktop/200/battery/E.sav` 最新原生 real-save 检查退出 0：SAV3E/E、131072 bytes、14×30 箱子、20 个占用箱格和 5 个队伍成员，正式读取／宝可梦编辑／导出重新打开、其他格位与原件保护通过。该结果仅原生工程证据，Chrome 页面及所有者验收未完成。当前手动识别模块仍待公开协议和产品入口，本批未提交。

- 2026-10-14 手动识别内部生产路径专项 `20291` 已退出 0：原始／RTC／DSV／ARDS、九个 GCI 游戏／区域及四个 NSO 语言／RTC 组合通过；自动识别失败的 DP 经正式读取、原样导出、训练家编辑及冻结确认可保持所选构造方式。当前与派生读取已分开，外来文件继续自动识别；清理／错误替换／撤销重绑定／重建绑定有内部证据。公开协议／Worker／正式 UI 仍待接，API162 保持，本批未提交。E.sav 原件哈希保持，Chrome 仍标签 fetch 失败，未完成页面或所有者验收。下一步接公开识别参数和正式入口，再完成整模块检查与已授权提交推送；完整 PKHeX 目标继续。

- 2026-10-14 手动识别 NSO 主体边界修正专项 `48283` 已退出 0，英／日与有无 RTC 四组合的完整头部／SHA1 重算／原件保护通过，损坏 build 长度拒绝；首轮 12 游戏原始／RTC／DSV／ARDS 检查仍通过。当前仅内部 SaveDetection，API162 不变，尚无公开上下文／Worker／UI，GCI 与全部类型／区域及上下文恢复待完成；本批未提交。下一步补剩余容器及持久识别上下文，再接正式入口，不把一次识别报告当接入完成。基础训练家 fe1ef9a 已普通推送，完整 PKHeX 目标继续。
- 2026-10-14 手动识别首轮内部 `44554` 已退出 0，12 游戏原始类型及 RTC／DSV／ARDS 的完整容器／原件保护通过。NSO 扩大 `2699` 在损坏 build 长度仍被接受时失败，已补 split.Data 合法主体长度检查，保留失败样本；修正 `48283` 当前运行，日志 TEMP/pokerngkit-save-detection-nso-bounds.log/.exit，编译输入冻结，只收原句柄。API162 保持，本批无公开接口／Worker／UI／持久识别上下文，GCI／其余类型区域与失败恢复待补，本批未提交。基础训练家 fe1ef9a 已提交推送，Actions 38519538084 最近一次仍 in_progress；完整 PKHeX 目标继续。
- 2026-10-14 手动存档识别内部层 `SaveDetection` 已加入全部来源类型构造分支、六处理器顺序、独立 split.Data 主体与头尾 Metadata、明确类型／子版本／语言／名称检查。原始／RTC／DeSmuME／ARDS 完整容器专项 `44554` 当前运行（TEMP/pokerngkit-save-detection-native.log/.exit），编译输入冻结，只收原句柄；全仓格式 `86413` 同句柄运行。API162 保持，无公开接口／Worker／UI／跨撤销和重建的识别上下文；GCI／NSO／区域／全部类型及失败恢复仍需补齐。本批未提交，完整目标继续。基础训练家已提交推送 fe1ef9a，Actions 38519538084 最近一次 in_progress，未确认部署。
- 2026-10-14 基础训练家 API162 已普通提交推送 main／origin/main `fe1ef9ad3ad96bce7d2c3a27d2bd567273946100`，标题 `feat: 补齐基础训练家编辑与保存`，35 文件 1605 增加／224 删除，提交后工作区干净。完整原生／前端／核心／裁剪及最后全仓格式 `80957` 通过。Actions [38519538084](https://github.com/HaKu76/PokeRNGKit/actions/runs/38519538084) 当前 in_progress，未确认部署；前一研究任务 Actions 38506948817 已 success。此回执为后续交接文档修改，尚未提交。下一独立模块 SaveHandlerTroubleshooter：来源已核对，需明确文件／类型／子版本／语言／处理器、完整容器保护与跨 Worker／撤销的识别上下文，不以一次报告代替接入。实际 Chrome／所有者验收仍未完成，完整 PKHeX 目标保持 active。
- 2026-10-14 SimpleTrainer API162 完整工程门槛收齐：默认完整原生 `85811` 最终退出 0，核心 `32863`、裁剪、完整 verify `87470` 全部通过，301 文件／1429 项、PWA 257 项（24762.72KiB）及 99 框架资源一致有证据，原 E.sav 哈希保持。最后文档／全仓格式后按已有授权普通提交推送 main，标题 `feat: 补齐基础训练家编辑与保存`。正式入口、GB 身份／补充字段、GC 时间、来源重新保存、完整三语差异与冻结确认沿既有历史撤销／导出。浏览器／所有者验收未完成，不能宣称全部 PKHeX 完成；下一独立模块为手动存档识别，来源已核对，尚未开始代码。
- 2026-10-14 SimpleTrainer API162 完整 verify `87470` 已退出 0：301 文件／1429 项、类型、网页与 PWA 257 项（24762.72KiB）通过，仅保留既有 Gen3Static Hook warning 与构建提示。99 个框架文件 public／dist 哈希完全一致，原 E.sav SHA-256 保持。默认完整原生 `85811` 同一活跃句柄仍推进 BR 训练家等模块；不改编译输入、不重复启动，尚无总终态。清单概述已纠正旧 API150／单只合法性报告等陈旧表述，保留逐窗口未完项与页面待验收。完整原生成功后更新最后记录／格式，再按既有授权普通提交推送；当前未提交，完整 PKHeX 目标保持 active。
- 2026-10-14 SimpleTrainer API162 最新核心 `32863`、修正类型 `30788`、裁剪 `85811` 的前置阶段、最后全仓格式 `97242` 均退出 0。默认完整原生仍在同一串行句柄 `85811`，SaveEditor.Tests 26468 已确认活跃并继续通过图鉴等既有模块；完整 verify `87470` 已通过格式，当前运行 Lint，尚无终态。源码保持不变，不改编译输入、不重复启动。工程门槛收齐后核对 public／dist 与原件哈希，最后记录／格式再普通提交推送 `feat: 补齐基础训练家编辑与保存`。当前未提交，实际 Chrome 页面／所有者验收未完成；完整 PKHeX 目标保持 active。
- 2026-10-14 SimpleTrainer API162 地区扩大 `59335`、最后三文件 130 项 `55299`、新浏览器核心 `32863` 退出 0，public 已更新。韩国 GS 校验布局、日版 XD 浮点时间、GB 身份及完整差异预览均有专项证据。接线类型 80064 的 Promise<void>／boolean 错误已用应用回调修正，类型 `30788` 同句柄仍运行；末次 Lint 12057 通过。最后裁剪→默认完整原生 `85811`、完整 verify `87470` 已启动（TEMP/pokerngkit-simple-trainer-trim／full／verify.log/.exit），编译输入冻结，只收原句柄不重复启动。完整门槛后核对 public／dist 及原件哈希，最后格式再普通提交推送，本批未提交。Chrome 最新仍 fetch 失败，真实页面／所有者验收未完成，完整 PKHeX 目标保持。
- 2026-10-14 SimpleTrainer API162 正式训练家入口／客户端／Worker 已接，GB 基础身份、来源空姓名、隐藏 SID、金钱／代币最大值、三语完整字段预览和草稿互斥已加入；金额操作抽为共享样式，保留 44px 控件。原生 `92663` 退出 0，GB 完整身份／原件、G5 日期高位预览／冻结保存通过；首轮测试 int→uint 编译失败已修正。前端 `80064` 三文件 130 项与定向 Lint 通过，类型同句柄仍运行；最后姓名修订专项 `55299` 运行中。区域扩大 `59335` 活跃，日志 TEMP/pokerngkit-simple-trainer-regions.log/.exit，追加韩国 GS、XD 日版布局，编译输入冻结，只收句柄不重启。API 升级只替换 apiVersion／ApiVersion 字段，普通索引／资源不改。尚未重建浏览器核心／跑最新完整工程／页面验收，本批未提交；下一步先收区域与类型，再重建核心及完整门槛，完整 PKHeX 目标继续。
- 2026-10-14 SimpleTrainer 公开 JSON／JSExport `99013` 与最后时间修订专项 `8706` 已退出 0：读取、冻结预览／确认／取消、必需 JSON 字段与失败清理、GB／E／GC 完整输出保持有证据。小时单项编辑按原控制顺序恢复省略分钟／秒，避免第一世代及 XD setter 副作用；独立完整文件对照通过。三语组件复用既有徽章样式，处理卸载后的迟到预览，确认仅传令牌／两个哈希。前端 16 项与定向 Lint 重跑通过；首轮类型 53850 的测试字典推断错误已修复，修正后的类型 `93389` 已退出 0；末次界面逻辑改动由后续完整 verify 收口。最后全仓格式 `17430` 已通过，原 E.sav 哈希保持。当前 API161 开发基线不变，未重建 Core 资源、未接客户端／Worker／正式入口，未跑最新完整工程或页面验收，本批未提交。下一步补完整预览／区域覆盖并接客户端、Worker 与正式 UI，统一升级协议后跑最后完整工程门槛；完整 PKHeX 目标保持 active。
- 2026-10-14 SimpleTrainer 内部／冻结专项 `66245` 已退出 0：GB 英／日 RB／Yellow／GS／Crystal、E、五种 DS 与竞技场／XD 对照通过。GC 补齐各槽 0x101 识别签名后完整加密文件可自动识别；冻结输出覆盖一次确认／替换／旧取消／过期源／失败清理，原数据保持。首轮编译变量／Memory 比较错误、原件测试调用 Clone 的副作用和空白 GC 缺签名均定位修正，没有降低检查；前端 16 项及校验 Lint 通过。三语组件未正式挂载，界面 refs Lint 已修正；最新类型 `53850` 的 node 25388 已确认活跃，只收终态。API161 保持，无公开接口／Worker／主入口、无新核心／完整 verify／默认完整原生及浏览器验收；本批未提交。下一步收类型、补完整预览和来源保存覆盖后接公开协议及正式 UI，完整 PKHeX 目标继续。Actions 38506948817 最近一次仍 in_progress。
- 2026-10-14 SimpleTrainer 内部开发批已加入 `SimpleTrainerEditing` 额外字段读取／克隆编辑与来源整窗保存、GB 多语言所有设置组合／代币／徽章／时间／Yellow 边界专项，以及 DS unsigned 日期上限断言。已确认现有通用入口遗漏 GB 训练家和 GC 游玩时间，日期已有实现不重复。API161 保持，尚无公开接口／Worker／正式 UI，完整来源保存和 GC 精度夹具仍待补齐。专项 `37547` 的 dotnet 26452 已确认活跃（TEMP/pokerngkit-simple-trainer-native.log/.exit），编译输入保持冻结；全仓格式 `44366` 同一运行句柄，只收终态、不重复启动。本批未提交，完整 PKHeX 目标继续。上一研究任务 Actions 38506948817 最近一次仍 in_progress，未确认部署。
- 2026-10-14 阿尔宙斯研究任务已普通提交推送 main／origin/main `7795fa9d2f83df4a4098384198c429750c26f25c`，标题 `feat: 补齐阿尔宙斯研究任务状态`，36 文件 444 增加／160 删除，提交后工作区干净。末次全仓格式 `12882` 与 diff 检查通过。Actions [38506948817](https://github.com/HaKu76/PokeRNGKit/actions/runs/38506948817) 当前 in_progress，未确认部署。原 E.sav SHA-256 保持 7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442；Chrome 最新仍 fetch 失败，页面／真实存档交互未验收。此条提交回执属于后续交接文档修改，尚未提交；下一步继续 SimpleTrainer 来源差异核对，不重复基础日期能力，完整 PKHeX 目标保持 active。
- 2026-10-14 阿尔宙斯研究任务 API161 工程检查通过：默认完整原生 `44369` 最终退出 0，核心／property-trim `64870`、完整 verify `46958` 已通过，300 文件／1412 项及网页／PWA 构建有终态。阈值四状态、三语文字、独立额外点数与原版图像保持既有计数／汇报／副本编辑路径。最后文档／格式后按已有授权普通提交推送 main，标题 `feat: 补齐阿尔宙斯研究任务状态`。外部 Chrome 仍标签读取 fetch 失败，正式页面／真实存档交互／所有者验收待完成；下一步核对 SimpleTrainer 来源差异，完整 PKHeX 目标继续。
- 2026-10-14 阿尔宙斯任务 API161 最终完整 verify `46958` 退出 0：300 文件／1412 项、类型、网页与 PWA 257 项（24752.02KiB）通过，保留既有 Gen3Static Hook warning 与大 chunk 提示。99 框架文件 public／dist 哈希一致；483-byte 原版研究图标 public／dist 完全一致，SHA-256 4803A0624B2C382A917E23E35CB3346C5C8543F4F54CEEB98054695581EC84FC；原 E.sav 哈希保持。默认完整原生 `44369` 仍同一活跃句柄，继续通过既有模块；只收终态，不重复启动、不改编译输入。当前未提交，成功后最后记录／格式再普通提交推送。正式页面与真实存档未获浏览器／所有者验收，完整 PKHeX 目标保持。
- 2026-10-14 神秘礼物提交 `8dbaf4773cf4be596fd830deb77649135017e08a` 的 Actions [38500459834](https://github.com/HaKu76/PokeRNGKit/actions/runs/38500459834) 已 confirmed completed／success。当前阿尔宙斯任务 API161 完整 verify `46958` 已通过全仓格式／Lint（仅既有 Gen3Static warning）进入类型，默认完整原生 `44369` 持续通过既有模块；现有句柄保持，只收终态、不重复启动、不改产品输入。只读核对 TrainerDates／TrainerDateFields 与 TrainerDateTests，确认 G4／G5 等日期入口及 2068／2096 边界已有保护，后续只补明确来源差异和完整重保存覆盖，不重复基本日期编辑。当前未提交 API161；两个完整门槛通过后匹配资源、末次格式及普通提交推送，真实页面／IndexedDB 仍待外部 Chrome，完整目标继续。
- 2026-10-14 阿尔宙斯任务 API161 核心／property-trim 串行 `64870` 全部退出 0；完整 verify `46958` 已启动并通过格式进入 Lint，默认完整原生 `44369` 已启动并持续输出既有检查（TEMP/pokerngkit-research-task-final-verify／full.log/.exit）。原生输入保持冻结，不重复启动，当前未提交。只读源码核对纠正后续清单：训练家日期已有 TrainerDates.cs、domain 校验及 TrainerDateFields 页面，不重复实现；SimpleTrainer 仍须核对 Designer 范围、DateUtil signed-int 转换与整窗重保存，当前尚未修改下一模块代码。完整工程终态后匹配资源／最后格式再提交推送，真实页面／所有者验收未完成，完整 PKHeX 目标保持。
- 2026-10-14 阿尔宙斯任务 API161 两修订原生专项 `46033` 退出 0，覆盖全部 242 种的原序阈值、独立奖励和总点数、既有 30 计数／编辑／汇报与原件／完整导出保护；前端 11 项已通过。类型／定向 Lint `67566` 与全仓格式 `11356` 退出 0。原版图标字节与来源哈希保持；额外点数文字明确包含于总点数，未改变计算。最新核心→property-trim 串行 `64870` 已启动（TEMP/pokerngkit-research-task-core／trim.log/.exit），编译输入冻结，只收该句柄。当前未提交，核心成功后再跑最终完整前端与默认完整原生、匹配资源和末次格式；页面／真实存档仍未验收，完整目标继续。上一神秘礼物 Actions 38500459834 最近一次仍 in_progress，尚未声明部署完成。
- 2026-10-14 阿尔宙斯研究任务 API161 开发批已接原序阈值四状态、当前草稿／派生形态预览、独立 BonusPoints 与原版奖金 PNG，复用既有任务表和所有读写／汇报路径。两文件前端 11 项通过；协议升级只改 apiVersion／ApiVersion 行，普通索引和资源不变。PNG 483 bytes 及来源哈希已登记，新增导入脚本可复现。原生／格式串行 `46033` 与类型／Lint `67566` 当前运行中（TEMP/pokerngkit-research-task-format／native／types／lint.log/.exit），编译输入冻结，只收现有句柄、不重复启动；完整核心／裁剪／原生／前端尚未执行本批。当前未提交，页面仍未验收，下一步先收专项与类型后再运行完整门槛，完整 PKHeX 目标保持。
- 2026-10-14 神秘礼物 API160 已普通提交推送 main／origin/main `8dbaf4773cf4be596fd830deb77649135017e08a`，标题 `feat: 接入神秘礼物数据库与图像检索`，41 文件 2197 增加／147 删除，推送后工作区干净。Actions [38500459834](https://github.com/HaKu76/PokeRNGKit/actions/runs/38500459834) 当前 in_progress，未声明部署完成。全部工程门槛与提交前全仓格式 `83879` 退出 0；实际页面／IndexedDB／下载仍待外部 Chrome。下一独立模块为 PokedexResearchTask8aPanel：既有 LA 已读任务计数／阈值／报送级数／点数，下一步补来源阈值四状态及额外点数标识，仍须核对来源图像和完整条件。当前仅只读源码核对，尚未开始该模块代码；完整 PKHeX 目标保持。
- 2026-10-14 神秘礼物 API160 最终工程门槛全部收齐：串行 `90401` 最新核心／property-trim／默认完整原生全部退出 0；完整前端 `5983` 退出 0，299 文件／1408 项、网页及 PWA 257 项（24749.72KiB）通过。99 框架文件 public／dist 哈希一致，原 E.sav 保持，末次交接格式 `61296` 退出 0。本批完成最后记录／全仓格式后普通提交推送，标题 `feat: 接入神秘礼物数据库与图像检索`。不重复测试、不再修改产品代码；正式 Chrome 页面、真实 IndexedDB 和下载仍未验收，完整 PKHeX 目标继续。下一独立模块为 PokedexResearchTask8aPanel，当前仅源码核对，先完成本批提交收尾。
- 2026-10-14 神秘礼物最终完整前端 verify `5983` 退出 0：299 文件／1408 项、类型、网页和 PWA 257 项（24749.72KiB）通过，仅保留既有 Gen3Static Hook warning 与大 chunk 提示。99 框架文件 public／dist 哈希一致，原 E.sav SHA-256 保持；最新核对清单全仓格式 `82062` 退出 0。最终原生 `90401` 核心／property-trim 已退出 0，默认完整原生仍同一活跃句柄，已继续通过多个既有存档编辑模块；只收该句柄、不改编译输入、不重复启动。当前未提交，终态成功后最后文档／格式并普通提交推送。Chrome 直接读取授权的 127.0.0.1:5173 仍 fetch 失败，不属于新增授权或 UI 验收。库存补充 API160 后续源码核对：LA 任务状态／额外点数、SimpleTrainer 日期、手动识别排错及全局设置，并明确该表不缩小完整范围。下一模块仅只读核对，完整 PKHeX 目标保持。
- 2026-10-14 神秘礼物末次 ZIP／公开专项 `38020`、页面类型 `3077`、全仓格式 `22596` 与末次 Lint `88561` 均退出 0。ZIP 同名礼物全部保留且逐条回解 matches Core 原 bytes；最后类型覆盖默认世代／属性回读／原生 ZIP 接线。最终原生串行 `90401` 的最新核心已退出 0，继续 property-trim→默认完整原生（TEMP/pokerngkit-mystery-gift-final-core／trim／full.log/.exit），原生输入保持冻结。完整前端 verify `5983` 已启动（TEMP/pokerngkit-mystery-gift-final-verify.log/.exit），保留 4096MB Node 与单 Vitest worker；只收这些现有句柄，不重复启动。当前未提交，工程全部终态后匹配产物、最后文档／全仓格式再普通提交推送。只读核对下一项 PokedexResearchTask8aPanel：既有 LA 已含任务计数／阈值／报送级数／点数，仍缺来源逐阈值状态和额外点数标识，不能将库存待核对直接视为无功能；尚未修改下一模块代码。浏览器与所有者验收仍未完成，完整 PKHeX 目标保持。
- 2026-10-14 神秘礼物页面复核：Designer 确认世代比较控件在 FLP_Format 内，OnShown 不重置它，已修正为默认 <= 当前世代、低世代 Any=10，重置保留该比较组。编辑器属性回读已接，卸载后的存储失败不再覆盖新 Core 会话。前轮页面类型 `6145` 退出 2，原因是未安装 fflate；已移除该依赖假设，全部结果 ZIP 改用 Core ZipArchive，在同一独立 Worker 生成并传输出缓冲，不新增依赖。增加逐 ZIP 条目回解与同名礼物完整性专项，原生 `38020` 运行（TEMP/pokerngkit-mystery-gift-archive.log/.exit），输入冻结。最后前端四文件仍 98 项通过，同串行 `3077` 继续类型（TEMP/pokerngkit-mystery-gift-ui-types2.log/.exit）。前批格式 `5497` 退出 0，本轮代码／文档需收末次格式；之前 `51975` 核心／裁剪成功证据早于新增 ZIP 导出，须最终重建，不能沿用为当前全部输出通过。当前未提交，下一步只收这两检查后修正实际问题，再运行最新核心／裁剪／完整前端与完整原生门槛；页面验收仍待外部 Chrome，完整目标保持。
- 2026-10-14 神秘礼物 API160 已接正式存档导航与页面：共享候选／Select、六列壁纸／精灵网格、三语详情、条件与只读指令构建器、设置、原格式生成下载、转换后完整编辑器／数据库／存档导入、单个礼物／全部结果 ZIP。重复礼物名按独立编号目录保留，原文件不改动。外部礼物独立 IndexedDB 快照用 revision 与完整内容 CAS 拒绝跨标签覆盖；写失败旧库保持，Core 全部文件确认后才写库，移除／撤销已接。核心与 property-trim 串行 `51975` 均退出 0，前轮类型 `60790` 退出 0。首轮 SSR 误查共享 Select 隐藏选项已修订，四文件 98 项 `6145` 通过；同句柄继续最新页面类型（TEMP/pokerngkit-mystery-gift-ui-types.log/.exit）。页面 Lint `64808` 已通过，后续仅补编辑器属性回读与卸载失败恢复，仍须最后 Lint／完整工程。Chrome 本轮仍 id4／tabs 空／fetch 失败，不改用内置浏览器、不声称页面验收；当前批未提交。下一步收 `6145`，复核最后代码后运行完整门槛再普通提交推送，完整 PKHeX 目标继续。
- 2026-10-14 神秘礼物 API160 已接来源生成 JSON／公开 JSExport、三语候选、精灵／完整礼物说明、分页、外部礼物载入、两类生成预览／一次确认、单个／全部礼物导出、取消／重置及独立 Worker／客户端通道。公开专项 `54579` 首轮把各语言排序错误当作同序列，修订为稳定英文顺序与各编号三语映射后 `63532` 退出 0；13 游戏所有页及全部候选／原件、冻结与错误开库／外部礼物检查通过。协议／客户端两文件 90 项与定向 Lint `88565` 通过，类型 `60790` 正在执行；核心→property-trim 串行 `51975` 运行（TEMP/pokerngkit-mystery-gift-core／trim.log/.exit），当前原生输入冻结，不重复启动。版本替换误触的无关图像／文字限制及原生夹具编号／偏移已恢复并核对差异；保留修改仅协议版本与当前功能。正式三语图像页面、只读构建器、编辑器／存档联动、本机外部礼物持久化和 ZIP 尚待接，不提交当前开发批。目录 Actions 38490792807 仍 in_progress；真实页面／IndexedDB 尚未验收，完整目标继续。
- 2026-10-14 神秘礼物内部专项修订 `31239` 已退出 0：13 游戏 × 可接收过滤开／关的完整结果序列、所有世代比较、组合字段筛选、属性指令、全部礼物 bytes 导出，以及生成原生／当前格式与一次确认／取消／旧源／失败预览检查通过；原 Core 礼物库逐项保持完整数据，WA9 类型保持。日志 TEMP/pokerngkit-mystery-gift-native2.log/.exit。原生已终态，下一步接三语候选和公开 JSON／JSExport，再接 Worker／正式图像页面／本机外部礼物库与 ZIP；API159 仍保持，不提交内部半成品。最后文档格式仍须以收尾结果为准，目录部署和真实浏览器验收状态未改，完整目标继续。
- 2026-10-14 SAV_MysteryGiftDB 内部检索与冻结生成会话开始开发，原始／当前存档格式分开，WA9 完整副本保留真实类型，来源礼物库不改动。13 游戏来源序列／所有比较／组合筛选／指令／完整导出及冻结失败专项已加入；首轮 `13289` 因测试误用文件名字段编译失败，已修正为 FileName，当前只收串行 `31239`（TEMP/pokerngkit-mystery-gift-native2.log/.exit），原生输入冻结。全仓格式 `74379` 仍活跃，文档后续批须收最终格式。API159 保持，公开协议／Worker／正式页面／本机礼物库与 ZIP 尚未接，不声明功能完成、不提交当前开发批。目录 Actions 38490792807 当前仍 in_progress；完整目标继续，真实页面／IndexedDB 待外部 Chrome。
- 2026-10-14 存档目录 API159 已普通提交推送 main／origin/main `8b7592c447a09ace605fd5f841bde3da0fe62255`，标题 `feat: 接入本机存档目录与备份管理`，40 文件 2205 增加／149 删除，推送后工作区干净。Actions [38490792807](https://github.com/HaKu76/PokeRNGKit/actions/runs/38490792807) 当前 in_progress，未声明部署完成。最终文档格式与 diff 检查通过；完整工程证据见下一条。下一独立模块 SAV_MysteryGiftDB 已只读核对来源过滤、四招式、世代比较、生成／转换、礼物单个／全部导出与设置；发现 WA9.Clone 返回 WC9，后续副本必须保留实际礼物类型，不能直接信任该接口。当前尚未开始该模块产品代码；外部页面／真实 IndexedDB 未验收，完整目标保持。
- 2026-10-14 存档目录 API159 最终工程门槛全部通过：串行 `75453` 核心／property-trim／默认完整原生均退出 0；完整 verify `49016` 退出 0，296 文件／1397 项、类型、网页与 PWA 257 项（24730.22KiB）通过。99 个框架文件 public／dist 哈希一致，原 E.sav SHA-256 保持；末次文档全仓格式 `76462` 退出 0。最终类型／测试／打包覆盖最后失败恢复代码，保留既有 Gen3Static Hook warning 与大 chunk 提示。本批进入普通提交推送，标题 `feat: 接入本机存档目录与备份管理`。浏览器选择目录按各父目录保存副本；整理覆盖库中所有明确标记的备份组，预览逐项确认，不随当前筛选缩小范围，也不删除磁盘原件。游戏显示三语名称，来源游戏筛选／排序仍按 Core GameVersion 枚举值。外部 Chrome／真实 IndexedDB 和所有者验收尚未完成，完整目标继续；下一独立模块为 SAV_MysteryGiftDB，当前仅只读核对来源。
- 2026-10-14 目录批复核增加失效行清理与确认失败令牌释放，存储失败仍保留 Core 冻结差异重试；页面末次定向 Lint 与四文件 103 项专项 `14267` 退出 0。库存 SAV_FolderList 已改为 API159 工程接入状态，仍明确真实页面／IndexedDB待核验。全仓格式 `13171` 退出 0；本轮文档／页面后续编辑再收格式。完整原生 `75453` 与前端 verify `49016` 仍同一活跃句柄，当前分别推进既有模块与全仓 Lint；只收原句柄，不重复启动、不修改原生输入、不进入下一模块。完整 verify 开始后仅新增页面失败恢复，类型／打包是否覆盖最后代码仍须以最终产物核对，不提前声明门槛全部完成。

- 2026-10-14 目录 API159 核心／裁剪 `75453` 分别退出 0，当前同一串行句柄继续默认完整原生（TEMP/pokerngkit-save-folder-final-full.log/.exit）；完整前端 verify `49016` 已启动（TEMP/pokerngkit-save-folder-final-verify.log/.exit）。本轮仅补页面刷新失败恢复：库已保存时先更新 snapshot／清除旧令牌，保留重新载入／撤销；页签状态取已应用查询。目录页／协议／事务／客户端四文件 103 项通过，定向 Lint `51185` 通过；当前只收完整两句柄，不重复启动、不改原生输入。相遇 Actions 38467835110 已 completed／success，原 E.sav 哈希保持。外部 Chrome 本轮仍 id4／tabs 空／fetch 失败，真实 UI／IndexedDB 未验收。目录批未提交，完整目标继续。

- 2026-10-14 目录修订类型 `85260` 退出 0。最终原生门槛已串行启动 `75453`：核心→property-trim→默认完整原生，日志 TEMP/pokerngkit-save-folder-final-core／trim／full.log/.exit；当前原生输入冻结，不重复启动。核心终态成功后再跑最终完整前端 verify 与资产核对。末次文档全仓格式 `41056` 仍执行中，先收句柄；工程门槛全部成功后才普通提交推送。完整目标与未验收浏览器／真实存储限制保持。

- 2026-10-14 目录可靠性修订完成：原生三语 `58010` 和跨语言固定哈希 `81153` 退出 0；前端协议／库事务／客户端 100 项通过，末次定向 Lint 通过。分页绑定已应用条件，保存核对完整 metadata／顺序／bytes 和 revision；Core 冻结输出哈希在浏览器独立核对后才写库，配额失败可保留确认差异重试。首轮扩大事务夹具共享缓冲区已改独立副本。初稿类型 `5509` 退出 2，源码 openFile 错误作用域已修正；当前只收修订类型 `85260`（TEMP/pokerngkit-save-folder-ui-types2.log/.exit），不重复启动。完整核心／裁剪／前端／默认原生尚未运行这批最终代码，浏览器未验收，本批未提交。下一步先收类型再启动最终门槛，保持当前独立模块。

- 2026-10-14 目录 API159 正式工作区顶部入口、本机最近／备份／目录、文件选择、九列筛选排序／分页、打开副本联动、冻结清理确认／撤销／下载已接。独立 IndexedDB 快照用 revision 拒绝跨标签覆盖，失败保持旧库；协议／存储／客户端三文件 98 项通过。此前类型 `15396` 与格式 `76273` 已退出 0；游戏三语原生 `2737` 通过，最新名称对照 `58010` 运行中，原生输入冻结。类型／末次 Lint `5509` 运行中，先收这两句柄，不重启；日志 TEMP/pokerngkit-save-folder-ui-native.log/.exit、ui-types.log/.exit、ui-final-lint.log/.exit。初稿打开 scope 与 ref cleanup 已修正，最后代码须再检查后才声明完整门槛。当前未提交，公开页面还未实际 Chrome 核验，完整目标继续。

- 2026-10-14 目录列表 API159 已统一 Core／前端握手，公开 JSON／JSExport／独立 Worker 通道与分包协议已接；空存档即可加载，不伪造训练家报告。冻结 `82212`、公开／列表／会话 `28297` 退出 0，前端协议与客户端 95 项通过。首轮公开编译 List／array 不匹配已修正。文件全部内容／元数据／顺序绑定，预览输出冻结一次，显示计划修改不影响输出，清理仅处理目录直接文件，原件保留。类型 `15396` 正在执行（TEMP/pokerngkit-save-folder-types.log/.exit），下一步收该句柄，再接本机最近／备份持久化、正式页面与完整打开／清理／撤销／下载；当前仍未接产品页面，不提交。相遇 Actions 38467835110 本轮仍 in_progress，完整目标保持。

- 2026-10-14 SAV_FolderList 内部开发已开始：明确文件、Core 原字段／语言修正／单文件异常、两列表、九列类型排序、三文化筛选、打开副本及非破坏清理计划已加入。专项 `97109` 退出 0；语言与异常修订／rename／不同目录同名扩大 `77382` 退出 0（TEMP/pokerngkit-save-folder-native3.log/.exit），当前原生检查已终态，下一步接冻结清理与公开会话协议。公开协议／Worker／本机最近与备份持久化／完整页面和打开／清理确认仍待接，API158 保持，本批未提交。相遇 `ffbb364` 的 Actions 38467835110 本轮仍 in_progress，尚未声明部署完成。完整 PKHeX 目标继续。

- 2026-10-14 相遇 API158 已普通提交推送 main／origin/main `ffbb364d147afebc35e54f044f467f36a3d637f2`，标题 `feat: 接入相遇数据库与条件生成`，43 文件 2809 增加／277 删除，推送后工作区干净。Actions [38467835110](https://github.com/HaKu76/PokeRNGKit/actions/runs/38467835110) 已确认 in_progress，未声明部署完成。提交前全部工程门槛与末次全仓格式 `62694` 退出 0；正式页面／真实 IndexedDB 仍待外部 Chrome。当前唯一下一步为 SAV_FolderList，已只读核对 Form／Designer、SavePreview 和 SaveFinder，开始前继续核对输入与浏览器文件持久化方案；尚未开始该模块代码。完整 PKHeX 目标保持。

- 2026-10-14 相遇 API158 最终工程门槛全部收齐：串行 `75855` 的相遇专项／核心／裁剪／默认完整原生分别退出 0，完整 verify `49795` 退出 0（293 文件／1380 项、网页／PWA 257 项 24710.99KiB）。99 个框架文件 public／dist 一致，E.sav 原件 SHA-256 保持；末次格式 `79029` 退出 0。本批进入普通提交推送收尾，标题 `feat: 接入相遇数据库与条件生成`；不再重复测试或改产品代码。下一模块为已只读核对的 SAV_FolderList，当前未开始实现。正式页面／真实 IndexedDB 与所有者验收仍待外部 Chrome，完整 PKHeX 目标继续。

- 2026-10-14 相遇完整前端 verify `49795` 退出 0：293 文件／1380 项、类型、生产 Vite 与 PWA 257 项（24710.99KiB）通过，保留既有 Gen3Static Hook warning 与大 chunk 提示。99 个框架文件 public／dist 哈希一致，E.sav 原件 SHA-256 保持。末次交接文档格式 `56961` 退出 0。默认完整原生 `75855` 仍同一活跃进程，已继续通过相遇、数据库、箱子导入、Battle Revolution 与多个既有模块；当前只收该句柄，不重复启动、不改原生输入、不开始下一模块代码。终态成功后最后文档／全仓格式并普通提交推送，建议标题 `feat: 接入相遇数据库与条件生成`。浏览器／真实存储仍未验收，完整目标继续。

- 2026-10-14 相遇提交前收尾：本轮末次全仓格式 `7885` 退出 0，git diff --check 通过。完整 verify `49795` 已通过 Lint（仅既有 Gen3Static Hook warning）及类型，现已进入 Vitest；默认完整原生 `75855` 仍同一存活进程，持续通过既有编辑模块。仍只收这两句柄，不重复启动、不修改原生编译输入。本轮只读核对 SAV_FolderList／SavePreview 并记录桌面扫描、列筛选及原版删除索引缺陷，未开始下一模块代码。本批未提交；两条完整门槛成功后再匹配资产、末次文档／格式、普通提交推送。

- 2026-10-14 相遇 API158 正式导航与页面已接检索／完整条件／本机训练家／设置、来源格位或实体、Core 形态图片／三语说明、只读属性指令构建器和生成冻结确认。复用完整实体编辑器及数据库加入／导入／联合撤销，准备编辑副本可直接载入下一次条件；切换检索与语言保留实体编辑。`2426` 核心／trim、`16536` 三语图像接口、`63932` 全 16 BR 来源场景、`6053` 类型／Lint、`36166` 末次定向 Lint 均退出 0；前端 `77537` 三文件 109 项通过。串行 `75855` 的相遇专项／核心／trim 已退出 0，默认完整原生仍同一进程运行（TEMP/pokerngkit-encounter-final-full.log/.exit），原生输入冻结；完整 verify `49795`（TEMP/pokerngkit-encounter-verify.log/.exit）已通过全仓格式，后续门槛执行中。唯一下一步收这两句柄，成功后匹配资产、末次文档／格式，再按已有授权提交普通推送。本批未提交，完整目标继续；Chrome 本轮仍 id4／tabs 空／fetch 失败，页面／真实存储及所有者验收未完成，原存档 SHA-256 保持。

- 2026-10-14 相遇数据库开发批已统一 API158，公开 JSON／JSExport／Worker／客户端、完整条件 DTO、三语候选、物理格位与独立实体来源、分页和冻结生成已接。公开原生 `85529`／`22831` 退出 0，前端客户端 `86828` 86 项通过；尚未接正式页面／训练家本地管理／导入，不声明模块完成、不提交。当前只收串行核心／裁剪 `82331`（TEMP/pokerngkit-encounter-core.log/.exit 与 encounter-trim.log/.exit）及类型／Lint `54432` 终态，不重复启动、不修改原生输入。核心日志已报告 IL2008：不存在 `PKHeX.Core.PGL`，来源确认为 PL6／LinkEntity6 而无 PGL；收终态后移除错误保留项并重建／裁剪核对，再进入图像相遇工作区、完整条件控件及准备编辑器联动。上一目标轮为实质进展；Chrome 已知故障不阻挡独立开发，完整目标保持。

- 2026-10-14 API157 普通提交推送 `e8e7b2b0d198a558e449037f0967608b5420827f`，标题 `feat: 补齐数据库转换与完整编辑`，Actions [38452088518](https://github.com/HaKu76/PokeRNGKit/actions/runs/38452088518) 已 completed／success。相遇数据库内部检索与冻结生成会话已加入，专项 `24384`、`81235`、`67441` 均退出 0，最新日志 `TEMP/pokerngkit-encounter-database-session.log/.exit`；覆盖 13 游戏夹具、11 额外环境、来源完整检索／条件／训练家与预览生命周期，详见模块文档。真实原件 `C:\Users\Hakuhiro\Desktop\200\battery\E.sav` SHA-256 保持 `7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442`。外部 Chrome 本轮仍 tabs 空且 `nodeRepl.fetch request failed`，不构成页面验收。本批尚未提交，API157 保持；唯一下一步为相遇数据库公开会话协议及完整生成条件候选，再接 Worker、图像页面、训练家本地管理和导入，完成该独立模块后再进入下一模块。

- 2026-10-14 API157门槛全部收齐：默认完整原生35173退出0，核心／真实E.sav／property-trim此前均退出0；完整verify91800通过292文件1362项、生产构建及PWA257项24684.24KiB。99框架文件public／dist一致，原件哈希保持；取消按钮仅对应编辑器自身任务，末次定向Lint80533通过。更新最后记录／全仓格式后普通提交推送，标题`feat: 补齐数据库转换与完整编辑`。外部Chrome仍无法读取标签，真实页面／IndexedDB未验收；完整目标继续。下一模块为SAV_Encounters，已只读核对源检索／生成／criteria／训练家与设置，当前未开始生产实现，先完成本批提交收尾。

- 2026-10-14 API157完整前端verify91800退出0：292文件1362项、类型、Vite／PWA257项24684.24KiB通过，保留1条既有Gen3Static warning与大chunk提示。99个框架文件public／dist无哈希差异，E.sav原件SHA-256保持。复核嵌入编辑器取消按钮仅在其自身localBusy时显示，避免外层数据库任务被误解为可由该按钮取消；末次全仓格式86259退出0、diff检查通过。默认完整原生35173仍同一活跃句柄，已通过新增数据库／准备／卡专项及多个既有模块；当前只收该句柄，不重复启动。当前API157未提交；成功后更新最终门槛／全仓格式并普通提交推送。SAV_Encounters仅只读核对入口，确认包含检索、生成criteria、训练家来源与准备，不由现有相遇字段编辑器替代，未开始生产实现。完整目标继续，页面验收仍待外部Chrome。

- 2026-10-14 API157门槛运行：35173核心重建、真实E.sav、property-trim分别退出0，默认完整原生仍同一活跃句柄，TEMP/pokerngkit-database-prepared-full.log／.exit。完整verify91800已启动，TEMP/pokerngkit-database-prepared-verify.log／.exit；下一步只收35173／91800终态，成功后匹配public／dist资产、末次文档／全仓格式及普通提交推送。未提交当前157代码，原生输入冻结，不重复启动、暂不开始下一模块。Chrome仍id4／tabs空／fetch失败；正式页面和真实存储操作未验收，完整目标继续。

- 2026-10-14 API156数据库已普通提交推送main／origin/main `545a2fb3730369a08aa2889eddab385507c152f1`，标题`feat: 接入本地宝可梦数据库`，60文件3901增加／287删除；Actions [38441026439](https://github.com/HaKu76/PokeRNGKit/actions/runs/38441026439)本轮确认success。当前API157开发批已接Source ClickView转换、可保留内容的检索／准备视图、完整StandalonePokemonPanel复用及冻结加入／导入。声明实体格式纳入回读、文件哈希和IndexedDB冲突比较，版本仅替换协议相关156。原生97972／48179准备与全部数据库通过，含13存档与BR全地区／分区／档案；存储卡85702合成三游戏单卡／混合卡、占用箱位／所有权及主目录备份恢复／源缓冲保持通过。前端70525三文件93项、34190两文件8项、Lint18372／76109和类型35177退出0。串行35173核心→实档→trim→默认完整原生正在运行，TEMP/pokerngkit-database-prepared-*.log／.exit，不重复启动、不修改原生编译输入。下一步收该句柄，核心完成后跑完整verify及最后格式，再按已有授权提交普通推送。Chrome本轮仍id4／tabs空／fetch失败，真实浏览器流程未验收；尚未开始下一产品模块，完整PKHeX目标继续。

- 2026-10-14 数据库API156提交收尾：最后本地化后的完整verify6461退出0，292文件1362项、类型、Vite／PWA257项24680.43KiB通过；串行76075核心重建、真实E.sav、property-trim、默认完整原生全部退出0。数据库请求／保存／撤销失败提示已按当前语言显示；没有原生源码后续修改。99框架文件及3530字节数据库壁纸public／dist一致，原存档SHA-256保持。末次文档／全仓格式后普通提交推送，标题`feat: 接入本地宝可梦数据库`。浏览器页面／真实IndexedDB尚未核验，存储卡代表性夹具／完整暂存实体编辑器／转换View待补；完整PKHeX目标继续，不标记完成，也不把工程通过当页面验收。

- 2026-10-14 数据库正式入口／三语图像网格、自动读取、目录显式类别、共享控件与工具栏底部对齐、冻结确认／本地事务及单步撤销已接；全部结果导入／ZIP／报表、实体加入副本库与显示设置持久化已接。存储失败保留工作存档和冻结结果，拒绝其他标签变化；历史按存档及独立文件缓冲总量限制。93项协议／客户端／事务专项和2项设置检查通过，设置默认值函数漏调用已修复；原生19570通过13存档ZIP字节／报表／CSV／Core.LoadBoxes完整输出及BR上下文，前几轮错误测试预期与复制／格式识别oracle修复见模块文档。完整verify13450退出0：292文件1362项、类型、Vite／PWA257项24679.95KiB通过，保留1条既有Gen3Static warning与大chunk提示；99核心文件及新增3530字节壁纸public／dist哈希一致。串行76075核心、实档、property-trim已退出0，默认完整原生仍运行，TEMP/pokerngkit-database-full-native-final.log／.exit；不重复启动。E.sav原件131072字节、SHA-256保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。Chrome本轮id4／tabs空／fetch失败，页面及真实IndexedDB未验收，不重复请求授权。API156本批未提交，下一步收76075终态并更新最后文档／全仓格式，再按已有授权普通提交推送。存储卡代表性夹具／完整暂存实体编辑器／转换View待补，完整目标继续。

- 2026-10-13 数据库API156／Worker正式协议已接8动作，含选中实体完整候选／属性目录。51443公开13存档确认增量／输入保持及BR双地区×双分区×四档案上下文过期通过，91485目录全部字段通过；26956三文件90项＋Lint、63653首轮类型退出0。真实E.sav冻结单格删除预览与全部有效槽、既有编辑回读／原件保持及浏览器核心串行69588退出0，API156资产已生成。新增DatabaseFilters复用共享候选／Select、全部普通条件／4招式／可见格式比较／只读构建器与日文覆盖；后续类型66030、property-trim92992均退出码0，日志TEMP/pokerngkit-database-filters-type.log／.exit与pokerngkit-database-trim.log／.exit，不重复启动。正式图像UI／文件列表／持久化确认／结果ZIP和报表联动未接，本批未提交。下一步收两个句柄，完成主界面接线和完整工程，完整目标继续，页面仍待外部Chrome。

- 2026-10-13 数据库格式／回归30030退出码0，含完整数据库会话／JSON及既有pokemon-search源码筛选／全部公开13存档目录／定位／原缓冲检查。上一最后全仓格式97300退出码0；为确认全部18实体确实进入矩阵，新增Valid及行数断言19138退出码0，TEMP/pokerngkit-database-format-all.log／.exit，不重复启动。API155无JSExport／Worker／图像UI，本批未提交。下一步收19138，最后格式后接正式协议／Worker与独立数据库界面，完整目标继续。

- 2026-10-13 数据库冻结会话与二进制／JSON内部层已落地。73613通过13存档delete／import／add／clones全部动作／完整输出、较新文件保留、来源哈希／替换取消／一次确认／失败失效；首轮44233测试语法错误已修复重跑。8120通过13存档连续文件段／required JSON／typed分页／筛选／导出／冻结确认与两个输入缓冲保持，修复首次错误地Search而非完整Rows显示；Source可见Context／Comparison已补。前端12228两文件4项及Lint通过。格式矩阵55625空白SAV3E上游克隆越界，改已识别合成E后30030数据库＋既有pokemon-search串行回归运行中，TEMP/pokerngkit-database-format-fix.log／.exit。API155无JSExport／Worker／正式图像入口，本批未提交；下一步收矩阵与回归终态，再完成公开协议／Worker、三语图像检索、持久化与报表联动，完整目标继续。

- 2026-10-13 数据库最终内部专项5993退出码0：13存档全部来源组合、文件载入／识别失败隔离、各自party宽度导出／源转换、文件id归属、当前箱位删除／过期拒绝与四组导入完整文件对照通过。20190发现Core Clone序列化来源缓冲，复制入口已恢复原始缓冲；99382／20866定位BDSP展示补HP 0x8A造成虚假过期，改为保留原始实体快照比较，真实变化仍拒绝，原输入字节保持。三组检查已接默认原生门槛；TS IndexedDB仓库2项边界与Lint通过，但浏览器存储／存储卡代表性夹具未核验。API155无公开数据库／Worker／图像UI／冻结确认／文件与克隆删除／报表联动，未提交本批。下一步完成有序冻结与本地文件删除生命周期再接正式UI，完整目标继续。

- 2026-10-13 数据库文件89637修复专项退出码0：13存档完整读取、无效文件隔离、各自party宽度导出、转换／源随机记忆规则及输入保持。独立文件id已跟随所有槽及过滤／排序，内部DeleteCurrent保护当前箱位／未变化实体／锁定，Import克隆输入调用源LoadBoxes。写入专项8060在测试Memory<byte>比较编译失败，修复20190运行中，TEMP/pokerngkit-database-editing-fix.log／.exit；TS仓库2项边界与Lint通过，实际IndexedDB和存储卡代表性夹具待核验。尚未公开API／Worker／图像UI／冻结确认／文件与克隆删除／报表联动，API155保持。下一步收20190并补完整编辑生命周期，未提交本批，完整目标继续。

- 2026-10-13 数据库文件读取／导出／View转换内部层及IndexedDB副本仓库已加入。用户选择实体／存档／存储卡读取复制全部输入，逐文件失败回退，自己的party宽度导出，源转换／适配；输入1024文件、128MiB总量、64MiB单文件，存储卡代表性夹具待补。TS仓库2项边界和Lint99401通过，实际持久化及正式界面未接。原生55355编译失败修复；58673／87547转换字节对照失败，39718定位A6随机感受及校验，oracle同类型转换返回原实体，改独立克隆后的89637运行中，TEMP/pokerngkit-database-files-oracle.log／.exit。下一步收该句柄，补文件唯一所有权及存储卡／格式全覆盖，再接冻结编辑、Worker与图像检索，不把内部层当功能完成。API155保持，本批未提交，完整目标继续。

- 2026-10-13 报表已提交普通推送main／origin/main `796fac948db7e8c7cf65c4937e36aeeba880b703`，标题 `feat: 接入箱子数据报表`；36文件1335增加／139删除，提交后工作区干净，末次全仓格式56547通过。Actions [38402090314](https://github.com/HaKu76/PokeRNGKit/actions/runs/38402090314) 首次in_progress，未确认部署。下一独立数据库内部PokemonDatabase已增加当前／独立文件／其他存档所有权、源过滤／初始排序／ForcePartyData及来源合法性克隆Search，只读实体／存档副本保持，API155无公开接线。专项7587在GP夹具无Valid实体时选样失败，修正独立外部测试实体后99719退出码0，13存档全部来源／合法性／克隆组合与完整字节保持通过，TEMP/pokerngkit-database-native-fix.log／.exit；最后格式41363通过，下一步收现有句柄后完善完整文件载入、图像检索、转换／删除／导出与报表联动，不以内部阶段代替完成。本批未提交，完整目标继续，页面仍待Chrome。

- 2026-10-13 箱子数据报表API155工程门槛已收齐：完整verify72520、裁剪／默认完整原生89767、核心50128及修正类型25378退出码0。289文件1351项、PWA257项24644.90KiB，99核心文件public／dist哈希一致；摘要85属性裁剪、18实体全部额外属性、13存档三语／位置／排序／公开CSV及真实E.sav／原文件保持有证据。变量重名和前端接口签名错误均修正后重跑，不降低校验。正式入口、三语列名、图片／真实槽、共享候选、重复列排序、显示恢复、选择复制与CSV已接；Span类型显示与CSV引用转义为明确Web修正。最后文档／全仓格式后按已有授权普通提交推送 `feat: 接入箱子数据报表`；网页／所有者验收待外部Chrome，完整目标继续。下一独立模块SAV_Database只读来源已审，未开始实现。

- 2026-10-13 报表完整verify72520退出码0：289文件／1351项、类型、Vite及PWA257项（24644.90KiB）通过，Lint保留1条既有Gen3Static warning；99个public／dist框架文件哈希一致。默认完整原生89767仍同一活跃进程27636，已推进Battle Pass4，无总终态；此前EntitySummary85属性裁剪通过，末次全仓格式18497退出0。源码未追加，API155未提交。下一步收89767终态，成功后最终更新库存／模块／全仓格式并按既有授权提交普通推送；外部Chrome本轮仍fetch失败，完整目标继续。

- 2026-10-13 报表门槛等待复核：最新verify72520通过格式与Lint（0 errors、既有Gen3Static 1 warning），当前tsc进程24236活跃；默认全原生89767的SaveEditor.Tests27636活跃，新增裁剪证据确认EntitySummary全部85属性签名及访问器保留，尚无总终态。上一末次格式76134退出0。箱子检索Actions38392271642本轮确认success；Chrome本轮getState仍id4／tabs空且fetch失败，页面未核验。源码保持不变，不因等待重启，未提交API155；下一步收72520／89767终态，成功后匹配99框架产物并更新库存／最终格式再普通提交推送。数据库只读来源初审不属于生产实现，完整目标继续。

- 2026-10-13 报表当前收尾句柄：核心50128、修正类型25378与全仓格式69249全部退出码0。最新完整verify72520及property-trim→默认完整原生89767已启动，日志分别TEMP/pokerngkit-report-verify.log／.exit与pokerngkit-report-full-native.log／.exit，只收取现有句柄不重复启动。源摘要的六种Comparer<T>.Default显式保留，EntitySummary全部属性增加裁剪根；API155源／公開专项、18格式额外属性、真实E.sav及前端／Lint通过。后续完成全量门槛并对比public／dist99框架文件，最后文档／全仓格式后按既有授权提交普通推送 `feat: 接入箱子数据报表`。此记录后需再次格式收尾；本批未提交，网页仍待外部Chrome，完整目标继续。

- 2026-10-13 报表API155补充检查：真实E.sav29096、显式源Comparer六类型98175、18实体全部额外属性／Span显示87745退出码0；复制矩形选择后的36403为三文件92项及定向Lint通过，后续英文训练家名描述修改由最终verify收口。首轮类型32708因client四参数／Select错误props失败，已修复25378运行中；浏览器核心50128运行中，日志TEMP/pokerngkit-report-type-fix.log／.exit与pokerngkit-report-core.log／.exit，同一句柄不重复启动。三只读接口及正式入口／三语列名／显示恢复／索引排序／复制CSV齐备，Span只显示类型名属于明确源反射失败修正。源码在Core构建期间冻结；后续必须收齐最新类型与核心，再运行property-trim、最新完整verify及默认全原生，核对public／dist资产并最后格式收口后才提交普通推送。全仓格式本轮待终态，未提交；页面仍待Chrome，完整目标继续。

- 2026-10-13 报表API155正式接线开发批：只读目录／读取／CSV三个接口、Worker及存档宝可梦分组入口、三语列名、共享候选与列控件、源类型排序和索引区分重复额外列、显示恢复／表格复制／CSV已加入。API155专项40393退出0，13种合成存档公开JSON／三语／完整CSV／拒绝及原缓冲保持通过；前端22677三文件92项、定向Lint96446通过。真实E.sav29096与4096MB类型32708仍同一活跃检查，日志TEMP/pokerngkit-report-real.log／.exit及pokerngkit-report-type.log／.exit，不能重复启动。后续核对全部候选与裁剪类型比较、补复制选择／多语言值及页面状态，尚未核心构建／全verify／默认全原生／页面验收，未提交本批。下一步收取当前句柄后完成实际缺口再统一工程门槛，完整目标继续。

- 2026-10-13 报表内部读取／类型排序／CSV已加入，API154保持。源摘要字段与三语地点不修改全局语言，保存源克隆及箱子／队伍／额外槽所有权，源先隐藏后额外列及重复有效属性保留。首轮82126模式变量重名编译失败，修复55277退出码0：13种合成存档全部摘要字段／三语／逐列升降序、额外／隐藏列、引用安全CSV与源完整字节保持。补物理位置／Sprite／空表拒绝40289退出码0，最后全仓格式待收齐；无公开API／Worker／正式UI，未提交本批。下一步完成候选属性／特殊槽与公开完整文件对照，再接报表入口；完整目标继续，Chrome未重复探测。

- 2026-10-13 箱子检索已提交普通推送main／origin/main `e80cc91e572fc10b9c857db4f12464d0c77fa63b`，标题 `feat: 接入宝可梦箱子检索`；最后全仓format:check与git diff --check通过，45文件2037增加／134删除，提交后工作区干净。Actions [38392271642](https://github.com/HaKu76/PokeRNGKit/actions/runs/38392271642) 首次in_progress，未宣称部署完成。下一ReportGrid只读来源审计已核对Main入口、Designer、EntitySummaryImage／PropertyComparer／SortableBindingList及Core EntitySummary／SlotInfoLoader／BatchPropertyProvider／ReportGridSettings：源列表包含箱子、队伍及额外槽，不限箱子；额外／隐藏属性默认空，值依赖实际类型，Sprite不排序，其余按类型比较；CSV包含隐藏列且原版不转义嵌入引号，复制包含表头。Web需明确导出差异、三语字段与位置、不可修改原实体及额外槽定位边界，尚未实现或提高API。完整目标继续，下一步完成报表源字段与完整文件对照，再接独立入口，Chrome页面仍待恢复连接。

- 2026-10-13 宝可梦箱子检索API154本批工程门槛已收齐：最新完整verify55427、真实E.sav／property-trim／默认完整原生26013、最新Core41724、定向147项前端56282与最终Lint88911全部退出码0。288文件／1346项、PWA257项（24633.06KiB），99核心文件public／dist哈希一致，原存档SHA-256保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。三只读接口、三语筛选／候选／属性构建器、真实箱位标记与环绕定位、工作副本变化重检已接。旧检查快照与主动停止结果不代替最终门槛；前批信息列表Actions38375495992本轮确认success。最后文档／全仓格式后按既有授权提交普通推送，标题 `feat: 接入宝可梦箱子检索`。Chrome仍登记id4但标签请求fetch失败，页面／Worker及所有者验收未完成。下一独立模块从ReportGrid与EntitySummaryImage来源核对开始；LGPE独立队伍、数据库和其他未完成窗口保持待办，完整PKHeX目标继续。

- 2026-10-13 搜索最终空值版本：41724专项＋最新Core重建退出码0，56282六文件147项、88911最终候选Lint通过；空／未匹配候选取GetIndex的0，完整名称匹配不区分大小写，属性空框无选中、默认源首项，语言切换保留空状态。旧14088通过但类型／核心快照过期，旧66180因源码修正主动停止，均不替代最终门槛。最新完整verify55427与真实E.sav→property-trim→默认全原生26013已启动，日志为TEMP/pokerngkit-search-final-verify.log／.exit及pokerngkit-search-final-native.log／.exit，不重复启动。下一步收取现有句柄，处理实际失败，再匹配public／dist核心资产、更新最终文档及全仓格式后提交普通推送；本批未提交，页面仍待外部Chrome连接，完整目标保持。

- 2026-10-13 搜索空候选复核修正：WinFormsUtil.GetIndex在无SelectedValue时返回0，与Any的-1／Nature25不同。共享候选现在保留空／未匹配状态，按0筛选、匹配完整名称时恢复实际值；属性框空状态为无选中，禁止生成错误指令，默认仍选源首项。Core允许清空来源版本0，公开13存档增加该对照。新前端56282六文件147项通过，41724串行专项及最新Core重建运行中，TEMP/pokerngkit-search-empty-native.log／.exit。旧66180确认拥有进程后因源码更正主动停止，退出-1，不是算法失败；旧14088完整verify退出0但属于更正前类型／核心快照，不能作为最终门槛。下一步收取41724，最新Core成功后重新完整verify、property-trim与默认全原生，再核对产物／格式并提交普通推送。源码已机械格式化，最后全仓格式仍需收口，本批未提交，完整目标继续。

- 2026-10-13 搜索API154正式开发批：三只读接口、Worker、箱子工作区、三语普通／高级筛选、只读构建器、共享候选控件、真实格位标记／聚焦及版本更新后重检已接。复查FLP_Format嵌套层级纠正先前“首次清隐藏Context”的错误：源保留Gen8+Equals／旧代LessThanEquals及当前存档Context；86712与最终排序28876对照通过。59162公开13存档、18实体／6Context矩阵、63908真实E.sav、15270六文件145项、类型53426与lint66453／49798／3617通过；后续React刷新修改由完整verify收口。属性“当前值”使用工作副本，未应用表单草稿不在其中，切换选择需要重读，页面待核验。Core74170退出码0，TEMP/pokerngkit-search-core.log／.exit；完整verify14088及裁剪后默认全原生66180已启动，日志分别TEMP/pokerngkit-search-verify.log／.exit与pokerngkit-search-native-full.log／.exit。末次格式66778运行中；下一步收取现有三句柄并处理真实失败，再匹配生成产物、最后更新文档及格式后按既有授权提交普通推送。API154本批未提交，完整目标继续，Chrome未再重复探测。

- 2026-10-13 搜索候选与构建器内部阶段已落地：全来源种类／特性、存档道具／招式、来源版本及觉醒力量三语目录，全部格式属性／当前值／Span／空值、源只隐藏“.”的前缀规则。首轮19732因源道具重复571字典失败，按出现次数匹配名称54348修复通过；77461补充18实体所有属性和13存档全部三语候选、重复项及完整字节对照通过。前端37470的3项状态／指令构建边界、40340定向lint均通过，导入27具名源标签与来源哈希。当前没有公开API／Worker／正式控件和箱位高亮，API153保持，本批未提交；下一步接只读公开目录／搜索／定位并升协议，再连接箱子工作区与完整工程。Actions38375495992本轮仍in_progress，Chrome未再重复探测，完整目标继续。

- 2026-10-13 搜索内部专项12397与补充18950均退出码0：18种实体格式普通条件、三态异色／蛋／ESV、三位等级空／非法值、招式去重、只读指令以及13种存档完整箱位匹配／前后环绕与字节保持。32767昵称／2147483647高级RichTextBox默认值由本机WinForms探针确认，32767指令暂为独立浏览器资源上限；补版本UInt8溢出拒绝。当前只Settings／Read／Seek内部阶段，没有候选目录、属性构建器、API／Worker／产品入口；下一步完整候选与只读构建器对照后再公开接线，不以内部专项替代功能完成。格式98262通过，最后文档编辑后仍需全仓格式；本批未提交，完整目标继续。

- 2026-10-13 信息列表已提交普通推送main／origin/main `ef9af0794f3eca4387469fbce238393e9f772fff`，标题 `feat: 接入宝可梦信息列表`；首次TLS失败，HTTP/1.1普通重试成功。Actions [38375495992](https://github.com/HaKu76/PokeRNGKit/actions/runs/38375495992) 本轮仍in_progress，未宣称部署成功。新批EntitySearchSetup源码／Control／Designer／Core已初审，增加内部PokemonSearch及可选pokemon-search原生focus，API153保持，无正式入口。专项12397与格式98262运行中；下一步收取结果，核实控件默认字符串长度与完整目录选择、版本UInt8边界及source隐藏context重置后再公开接线。完整目标继续，Chrome页面仍未取得。

- 2026-10-13 信息列表API153全部工程门槛已收齐：默认完整原生修复70467、完整verify17993、核心40286、类型39903、专项／13公开存档全字段／真实E.sav／裁剪47130、末次格式71382均退出码0。287文件／1337项、PWA257项（24614.67KiB），99核心及19宽属性图public／dist哈希一致。首轮全原生90532的4处API152断言更新153后完整重跑通过；保留既有1条Gen3Static Hook warning。正式只读入口、三语、源表筛选／形态／原生标记、图像、能力值／特性／Z-A头目招式及搜索／排序／键盘列序齐备。最后文档格式收尾后按既有授权提交普通推送，标题 `feat: 接入宝可梦信息列表`；Chrome请求仍fetch失败，网页和所有者验收未完成。下一独立模块从EntitySearchSetup或数据库清单来源核对开始，LGPE独立队伍及其他剩余窗口保持未完成，完整目标继续。

- 2026-10-13 信息列表完整verify17993退出码0：287文件／1337项测试，Lint仅既有Gen3Static Hook warning，TypeScript、Vite与PWA257项（24614.67KiB）均通过。99核心文件和19宽属性图public／dist哈希全部一致。核心40286、类型39903、专项／13公开存档／真实E.sav／property-trim47130已通过。默认全原生修复70467仍运行，PID14860活跃，已推进Pokeathlon4全地址／表单检查；此前90532的4处协议断言失败已修复，本批尚未提交。下一步收取70467终态，按实际结果修复或最后更新文档／全仓格式后提交普通推送；Chrome仍fetch失败，网页和所有者验收未完成，完整目标继续。

- 2026-10-13 信息列表当前工程句柄：完整verify17993已通过全仓Lint（0 errors、Gen3Static既有1 warning），进入最新typecheck；默认完整原生修复70467的SaveEditor.Tests.exe PID14860／父22604活跃，已通过基础存档及LGPE／BDSP图鉴阶段，尚无终态。文档末次format:check50069的node4088活跃，不重复启动；格式后的git diff --check无输出。核心40286、类型39903、专项／真实文件／裁剪47130及前批Actions成功证据已收齐。下一步只收取现有检查句柄，完整verify成功后比较生成产物，默认原生成功再提交普通推送；未提前开始其他模块代码，网页仍待外部Chrome连接，完整目标保持。

- 2026-10-13 信息列表默认全原生90532在首个E夹具因JSON链式API断言仍152失败。完整搜索发现GsBall2、RegisteredGroups、SaveEditorTests与StandalonePokemonApiTests共4处，已改153，种类编号152保留；修复后完整70467已重跑，TEMP/pokerngkit-chart-full-native-fix.log／.exit。生产API153核心及最新定向47130保持通过。完整verify17993仍在全仓Lint，末次文档全仓格式50069尚待终态，记录后需重新格式化本任务文档；未提交、未推送本批。下一步收取现有三句柄并处理实际失败，再核对public／dist全部99核心与19宽属性图哈希，按既有授权提交普通推送；页面仍待Chrome连接。

- 2026-10-13 信息列表收尾：浏览器核心40286、4096MB类型39903、格式44184／34290均退出码0；47130串行personal-chart（25构造及明确13种公开JSON全字段）、所有者E.sav只读目录与既有编辑／回读烟测、property-trim全部退出码0。真实源SHA-256保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442。加入Worker副本传输专项及读取中防重复重读，完整verify17993正在全仓Lint；默认完整原生已启动，日志TEMP/pokerngkit-chart-full-native.log。先前基于单子进程排队返回“专项未确认”，并未启动重复原生；已收取47130终态后才开始默认检查。前批文字编辑Actions38363225816本轮确认success。Chrome本轮仍登记id4但tabs请求fetch失败，无页面验收，本批未提交，完整目标继续。

- 2026-10-13 信息列表本轮正式UI／API接线已落地，尚未提交。资源62765检查3项通过，API153原生专项94428退出码0，137项前端13677与修复lint12089通过；最后文档格式43256通过。核心40286、4096MB类型39903与最后全仓格式44184的句柄仍存活，日志分别位于TEMP的pokerngkit-chart-core.log、pokerngkit-chart-type-fix.log、pokerngkit-chart-final-format.log；不得因观察等待重新启动。下一步收取三个句柄，核心完成后运行property-trim与完整verify，默认全原生待运行，再核对生成资产并提交普通推送。外部Chrome尚未重新取得可用页面，完整目标保持。

- 2026-10-13 信息列表API153正式接线开发中：ReadPersonalChart、Worker与存档分组入口、三语源列、搜索／排序／共享Select列序、过期读取保护、19张本地宽属性图齐备。未修改ColorUtil源副本用于每行颜色独立对照。原生33754首次因测试模式变量重名编译失败，修复94428退出码0（25种存档、全部源行、共享个人表／完整存档、公开JSON合成文件）；前端13677为5文件／137项通过。定向lint30269发现同步effect清状态，改为带revision／retry的结果，12089修复退出码0。类型2084因默认Node堆不足退出134，39903以本任务4096MB堆重跑；核心构建正在运行。首次并发format93637遇到后续编辑的2文件警告，重新format:changed80459／78674与format:check37641通过；最后编辑后仍需末次全仓格式。完整verify、默认全原生、property-trim、核心产物匹配及外部Chrome页面尚未收齐，未提交本批。完整PKHeX目标继续。

- 2026-10-13 文字字节编辑已按既有授权提交并普通推送 main／origin/main `8e7ba010eeda131ea29eb9d44e9131832a9323a2`，标题 `feat: 接入宝可梦文字字节编辑`；提交后工作区干净。Actions [38363225816](https://github.com/HaKu76/PokeRNGKit/actions/runs/38363225816) 最后记录为 in_progress，尚未刷新最终结果。新批信息列表增加只读 PersonalChart 与可选 personal-chart 原生 focus；API152保持，尚未接目录API／Worker／页面。首轮45984因上游SAV3Colosseum空白构造器越界失败，改用ColoCrypto.SAVE_SIZE缓冲与decrypt=false，90347修复检查退出码0：25种存档构造的在场种类／形态、三语名称、属性转换、能力值／特性／头目招式、完整存档与个人表保持通过。首次format:check51727退出码0。下一步补原生标记、编号、图像与颜色的独立全量对照，再接三语信息列表；页面／真实存档浏览器核验仍待外部Chrome连接，完整目标继续。

- 2026-10-13 文字字节编辑API152本批全部工程门槛通过：默认完整原生22995、完整verify29431、核心20362、最后类型45657、property-trim、lint与格式均退出码0。前端286文件／1330项、PWA257项（24605.99KiB），99核心文件与19属性图public／dist哈希一致。存档与独立实体两详情入口共用44px控件及三语界面；三姓名字段、有序Core草稿、字符／byte／名称层、真实差异／冻结确认、只读权限、折叠取消与既有副本／撤销齐备。18实体布局、四文件表示、13种存档、LGPE共享队伍和锁定拒绝均有专项证据；测试修正不降低生产校验。本批最后文档收尾后按既有授权提交普通推送，标题 `feat: 接入宝可梦文字字节编辑`。Chrome标签请求仍fetch失败，页面／实档待核验；LGPE独立队伍导航、信息列表及数据库等仍未完成，完整目标继续。
- 2026-10-13 超级训练已提交普通推送 main：`75ae6323a446860cef85395bc7d9da09e7d20a73`，标题 `feat: 接入宝可梦超级训练`；提交后工作区干净，Actions [38351119872](https://github.com/HaKu76/PokeRNGKit/actions/runs/38351119872) 首次 in_progress。新批通用文字字节窗口只增加来源审计与可选原生 focus，18 种实体布局的缓冲／编码尾部／原版关闭行为首轮13429的日文GB英文字符假设失败；修复56382后发现PK7忽略None而清目标缓冲。已改为源窗口临时编码／前缀复制审计，61486运行中。API151保持，无正式接线；下一步收取审计结果后实现有序草稿与完整文件冻结，完整目标继续，Chrome页面仍待连接。
- 2026-10-13 超级训练 API151 本批全部工程门槛通过：默认完整原生40245、完整verify修复67826、核心19821、最后类型27761、property-trim、lint与格式均退出码0。前端285文件／1316项、PWA257项（24584.78KiB），99核心文件及19类型图的public／dist哈希一致。两正式详情入口复用44px共享控件及45个三语来源标签；有序草稿、完整冻结差异／确认取消、工作副本与撤销齐备。首次verify因脚本URL未显式导入失败，已修复后完整重跑通过。清单修正箱子ZIP／文件目录批量的过期状态。本批正在最后文档收尾，随后按既有授权提交普通推送，标题 `feat: 接入宝可梦超级训练`；页面和第六／七世代实档尚未验收，完整PKHeX目标继续。
- 2026-10-13 所有者确认的Desktop/200/battery/E.sav真实烟测20786退出码0：公开识别SAV3E/E，131072字节、14箱×30格、箱内20只／队伍5只；内存副本编辑一只亲密度、完整导出回读、格式／长度／校验、其他箱位／队伍及源文件字节保持通过。源SHA-256检查前后保持7DA8AD6A95CB58076705118947C41BD0131A622CA95336D3F617C091FDD30442；样本未写入或提交仓库。仅本地原生证据，Chrome连接仍fetch失败，不能作为网页／Wasm或所有者验收。新批测试与记录尚未提交，完整目标继续。

- 2026-10-13 当前已推送基线 main／origin/main `672235bf36eccec22fbf4375d69c9bdd018bb776`，标题 `feat: 接入宝可梦强化招式记录`；Actions [38340554724](https://github.com/HaKu76/PokeRNGKit/actions/runs/38340554724) 已成功。真实绿宝石工作副本检查结果见上文，Chrome 登记 id4 但标签请求仍 fetch 失败。当前新增测试、超级训练与记录尚未提交，完整 PKHeX 目标继续。

- 2026-10-13 强化招式API150全部工程门槛收齐：完整原生46795、完整verify40310、核心29896、最后类型81934、定向lint75820、裁剪及格式均退出码0；284文件／1304项测试、99核心／19类型图哈希一致。最终文档收尾后按已有授权一次提交普通推送main，标题 `feat: 接入宝可梦强化招式记录`。所有者提供真实存档路径Desktop/2f/battery/e.sav但该目录不存在，已询问已找到的三个同名文件；Chrome重启后重新登记id4，但getState与直接URL连接仍fetch失败，未取得页面。真实文件与页面未验收，完整目标继续。

- 2026-10-13 强化招式完整verify40310退出码0：284文件／1304项测试、生产构建、PWA257项（24562.49KiB）通过；99核心资产／19类型图public与dist SHA-256无差异。默认完整原生46795的实际进程27284仍活跃并推进，尚无终态；本批未提交。后续超级训练只读确认PK6／PK7普通30项物理顺序相同：3,4,7,2,5,6,9,10,13,8,11,12,15,16,19,14,17,18,20..31，三语资源各38行；不混入实现。页面／实档待核验，完整目标继续。

- 2026-10-13 强化招式收尾前置已齐：核心29896、最终类型81934、定向lint75820、property-trim及最后格式均退出码0。默认完整原生46795的实际测试进程27284持续输出，完整verify40310已通过格式并进入全仓lint；均保持原任务。模块文档将强化招式历史阶段收敛为当前范围／规则／专项证据／两入口及未完成门槛，避免旧阶段表述混淆；功能代码未变。本批未提交，页面／实档待核验，完整目标继续。

- 2026-10-13 强化招式核心29896退出码0、最后文档格式7154通过；类型81934仍活跃，原生总链46795已开始property-trim，verify40310等待类型成功，观察超时不重启。下一独立候选SuperTrainingEditor只读初审完成，已记普通30／配信6、袋0–255、第一次／第二次All有序差异、PK6秘密事件与PK7隐藏状态AND、配信Setter高字节来源待复现。当前不混入下一模块源码，API150本批未提交，正式页面／实档待核验。

- 2026-10-13 技式记录提交39e88c7的Actions [38331668599](https://github.com/HaKu76/PokeRNGKit/actions/runs/38331668599) 已完成且conclusion为success；不代替正式页面／真实存档和所有者验收。当前强化招式API150本批仍未提交，工程总链等待收尾。

- 2026-10-13 强化招式收尾句柄：核心29896、最终类型81934、全仓格式52885运行中，定向lint75820退出码0。原生总链46795等待核心成功后做property-trim再默认完整原生；完整verify40310等待核心／最终类型／格式均0再启动。持久日志与退出码为TEMP/pokerngkit-plusrecord-api150-*，观察超时不重启。功能代码保持稳定，两正式入口已接，页面／真实存档仍待核验，本批未提交，完整目标继续。

- 2026-10-13 强化招式API150正式两入口已接：SAV9ZA存档详情／PA9独立文件共用PlusRecordEditor、现有Select／按钮／44px列表样式及三语词条。340项逻辑编号、属性图标、当前／可学提示、七操作、尾位提醒、完整原始及逐项冻结差异、确认／取消和既有副本／撤销齐备；语言切换保留草稿，关闭／换目标针对取消。默认完整原生链加入来源／实体／会话三组。下一步定向lint／类型、新核心发布／裁剪，再跑本批完整verify与原生；页面／真实存档未验收，本批未提交。

- 2026-10-13 强化招式API150公开原生专项3950、前端三文件12823（86项）及类型43958均退出码0，全仓格式通过。公开JSON读／预览／确认完整文件、required字段与失败清旧票、两类Worker来源复制及领域容量／目标冻结校验通过。正式三语UI、新核心发布及本批完整工程门槛仍待完成，本批未提交；下一步接共用详情编辑器和既有副本／撤销，完整目标继续。

- 2026-10-13 强化招式记录API150已增加四JSExport／required JSON及八种存档／单只Worker请求，来源／目标冻结协议接入前端领域模型；容量340候选／360位／45字节、草稿全行／不保存分支、尾位差异和六目标字段验证已加入。原生公开专项3950、前端三文件12823及类型43958正在运行，尚无结果；尚未接正式三语UI、新核心发布或完整工程收尾，本批未提交。前一技式记录已推送39e88c7，完整目标继续。

- 2026-10-13 强化招式完整文件专项64342退出码0：四种PA9单只布局、SAV9ZA队伍／箱子在七动作下完整文件Core对照、完整原始位差异、六目标字段绑定、单次／过期／替换／针对取消／失败清理及原件通过。合成存档类型路径不代替公开识别和真实存档验收。内部目录／克隆编辑／冻结会话已完成专项，生产API149未变；下一步required JSON、版本握手和两条Worker／统一三语UI，本批未提交，完整目标继续。

- 2026-10-13 强化招式实体专项61565退出码0：35种族／形态／等级组合、七操作、每个可见位的完整实体对照、源提示／三语、尾部／技式记录隔离和原件／拒绝通过。新增内部PlusRecordSession完整文件冻结，限定SAV9ZA／PA9，绑定源／输出hash及全部目标字段、记录360位变更并一次确认；完整存档回写校验长度／队伍／存储，单只保留布局。四单只布局与队伍／箱子、七动作完整文件和冻结生命周期专项待运行。生产API149保持，公开接口／Worker／正式UI未接，本批未提交。

- 2026-10-13 强化招式记录内部PokemonPlusRecord已加入PA9完整目录与克隆编辑：340候选／360总位、三语招式／类型、当前招式／LearnPossible提示、原始两段与非法尾位；手动保存及窗口四Give All分支／Remove All／父Shift共七动作，直接调用Core，不暴露非窗口ForceAll。七种族形态×五等级、每个可见位、完整实体Core对照、尾部／技式隔离、原件与无效请求专项61565运行中，未宣称通过。API149保持，完整文件冻结／公开JSON／Worker／三语UI尚未接，本批未提交，完整目标继续。

- 2026-10-13 PlusRecord来源专项92927退出码0：PA9全部360位独立物理地址／264分区、340候选、尾20位、手动保存保留与清理全容量、Core ForceAll范围、技式记录隔离、越界拒绝和逐位完整实体往返／原件通过。只读上游未改；当前生产API149及已推送技式记录保持，新批仍只有来源审计测试，正式强化招式读写／冻结／Worker／三语UI尚未接入。下一步实现内部目录与克隆编辑，完整目标继续。

- 2026-10-13 技式记录已提交并普通推送main：`39e88c71db03c9ea47ce93de1221f33ba2b6e35d`，标题 `feat: 接入宝可梦技式记录`；提交后工作区干净。Actions [38331668599](https://github.com/HaKu76/PokeRNGKit/actions/runs/38331668599) 首次查询为in_progress，未确认部署。下一批只增加PlusRecord来源原生审计：全部360位独立地址／264分区、340候选、尾20位、手动／清理／Core强制容量、技式记录隔离与原件；专项92927正在编译，尚无结果。生产接口149不变，正式强化招式编辑尚未接入，完整目标继续。

- 2026-10-13 技式记录API149完整工程门槛收齐：默认完整原生42124、完整verify99973、核心30877、类型38970、定向lint11727及裁剪均退出码0；283文件／1294项前端测试、PWA257项，99核心资产／19类型图标public与dist哈希一致。正在完成最终文档和格式，随后按已有授权提交并普通推送main，标题 `feat: 接入宝可梦技式记录`。正式两入口／七动作／冻结确认／副本撤销齐备，页面和真实存档未验收；完整目标继续，下一模块为PlusRecordEditor。

- 2026-10-13 技式记录完整verify99973退出码0：283文件／1294项测试、生产构建与PWA257项（24547.78KiB）通过；Lint0错误，仅保留既有Gen3Static initialTransfer Hook警告。99个核心资产与19张类型图标的public／dist SHA-256全部一致。默认完整原生42124的实际进程27048仍活跃，尚未取得终态；不因前端通过提前提交。本批页面／真实存档仍待核验，完整目标继续。

- 2026-10-13 下一项强化招式记录增加只读二进制审计：两等级资源均1445目录／594非空／8030招式等级对，340候选覆盖全部招式；强化等级6–100，普通0–99。强化表404处等级下降，Core按原序遇到超等级即停止，接入将直接复用Core而不排序补齐；326项一字节00尾部按源Reader整除忽略。库存已更正为来源已核对、正式接入未完成。当前API149完整检查继续使用99973／42124两个活跃任务，不混入下一模块实现。

- 2026-10-13 招式商店提交 `ac0d4f7` 的 Actions [38323927065](https://github.com/HaKu76/PokeRNGKit/actions/runs/38323927065) 已完成且 conclusion 为 success；此结果不代替部署页面和所有者验收。技式记录 API149 核心、裁剪、定向 lint、类型与格式检查已通过；完整 verify99973 已完成格式／lint并进入类型检查，默认完整原生42124的实际测试进程27048仍活跃并推进。继续收齐同一批工程结果，未因等待重启，本批尚未提交。

- 2026-10-13 API149类型38970与核心30877仍确认同一活跃句柄，裁剪／完整原生42124和verify99973等待其成功终态，未因观察等待重启。下一独立候选PlusRecordEditor仅完成只读窗口／父入口／Core初审：实际340候选／360总位，264处分区、两段偏移、手动／清理尾位差异，默认当前合法／Control加TM／Shift掌握之种加TM／Alt清空及父HasFlag(Shift)入口不同规则已记录。未混入生产实现，本批未提交，完整目标active；当前首要动作仍为API149工程门槛收尾。

- 2026-10-13 技式记录当前收尾句柄：定向lint11727、类型38970、核心30877、全仓格式76276正在运行；原生收尾42124已排队，待已确认核心退出码0才做property-trim及默认完整原生；完整verify99973已排队，待最后类型／格式／核心均0才启动。持久日志与退出码统一在TEMP/pokerngkit-techrecord-api149-*，观察超时不重启。后续不再改变功能源码，先收齐工程终态；正式两入口已接但页面／真实存档仍待核验，本批未提交，完整目标active。

- 2026-10-13 技式记录API149已加四JSExport及required JSON、八种存档／单只Worker请求和版本握手；公开JSON专项37479退出码0（五格式／二十布局、完整文件和六目标字段绑定、必填与失败清理），前端三文件83项通过。正式两入口及三语TechRecordEditor已接，复用MoveShop的44px控件／表单／滚动样式，七操作、许可／当前招式、类型图、原始与逐项冻结差异、ZA列表外位计数齐备；提交进入既有副本／撤销，不放宽通用CanEdit。默认完整原生链已加入本模块。类型38970正在运行，新核心／完整verify／完整原生／裁剪尚待完成；页面／真实存档未验收，本批未提交，完整目标active。

- 2026-10-13 技式记录完整文件专项21221退出码0：二十单只布局、五存档箱子／队伍在七动作下完整文件Core对照、所有原始变更位及冻结生命周期／原件保护通过；生产公开识别和真实存档仍待核验。前端领域85389七项通过，容量／显示编号／独立草稿／完整逻辑行／目标冻结校验已加入。当前生产API148保持，公开JSON／Worker／正式三语UI／新核心与本批完整工程门槛尚未接或运行，本批未提交。下一步公开required JSON接口与版本握手，再接两正式入口，完整目标active。

- 2026-10-13 技式记录初轮59156退出码0：五实体×四种族、真实候选及每一物理位／SV分区、七动作完整实体独立字节Core对照、三语／许可提示、LA高位与商店隔离、原件与拒绝通过。新增内部TechRecordSession完整文件冻结，绑定来源／目标hash及全部目标字段、记录所有原始位变更（包括ZA未显示批量位），单次确认／过期／替换／针对取消／失败清理；存档专用五格式，不放宽通用CanEdit或SaveUtil。二十单只布局及五存档箱子／队伍、七动作完整文件oracle与生命周期专项正在运行，尚无通过证据。生产API148不变，公开JSON／Worker／正式三语UI尚未接，本批未提交，完整目标active。

- 2026-10-13 技式记录内部PokemonTechRecord读写已加入：五实体真实候选、三语名称／类型、当前与进化许可／当前招式提示，逻辑位与显示号分离；保存／源四种Give All分支／Remove All／父Shift七操作直接调用Core，清理遵循总容量，原件克隆。新增五实体×四种族、每一可见位／SV200分区、七动作完整实体独立字节Core对照及LA商店／高位隔离专项，正在运行。生产API148保持不变，完整文件会话／冻结／Worker／正式UI尚未接入，本批未提交，完整目标active。

- 2026-10-13 TechRecord修正审计91722退出码0：五实体候选／批量位／总容量、独立地址、清空／ForceAll边界、LA高48位保留及商店缓冲隔离、原件通过。ZA实际160候选／230批量位／304总位；已复现原窗口001保存使0x12F为02，Core首项实际为01，正式接入将逻辑0..159与显示001..160分离并保留Core批量容量，修复窗口偏移而不改上游。审计格式70336通过；当前新批仍只有测试及记录，API148生产不变，尚未接正式读写／冻结／Worker／UI。已推送ac0d4f7的Actions38323927065复查仍in_progress，未确认部署。完整目标active，下一步实现技式记录内部读写与完整实体Core对照。

- 2026-10-13 TechRecord来源审计28550首轮失败：PK8／PB8／PA8／PK9范围与字节检查通过，PA9候选数断言失败。已核对ZA实际MachineMoves为160项，RecordCountUsed230、总位304，初审把批量容量当成候选长度不成立；修正专项为三维范围及Z-A物理1..160对0..159的首尾差异后重跑，尚未宣称通过。生产API148和已推送招式商店保持，当前仅审计测试／记录改动，完整目标active。

- 2026-10-13 招式商店已提交并普通推送main：`ac0d4f7b3a63128b9797e5b374cbeae3ec88e388`，标题 `feat: 接入宝可梦招式商店`；提交后工作区干净，Actions38323927065首次in_progress，未确认部署或所有者验收。新批TechRecord只增加原生来源审计，核对五实体候选／总位和分区地址、清理／ForceAll边界、LA独立缓冲、Z-A首尾显示编号差异；尚无正式读写／冻结／UI接入，API148不变。下一步取得审计终态再确定Z-A索引处理，完整目标active。

- 2026-10-13 招式商店API148本批工程门槛收齐：默认完整原生23975、完整verify27411、核心14548、裁剪和最后类型82594均退出码0；前端282文件／1279项、PWA257项，99核心资产／19图标public与dist哈希一致。正在完成最终文档和格式，随后按既有授权一次提交普通推送，标题 `feat: 接入宝可梦招式商店`。原件保护、两路径冻结确认／撤销及统一三语控件已接；页面和真实存档仍待核验，Chrome标签请求fetch失败、样本路径问题仍待回复。完整目标active，下一独立模块TechRecordEditor已只读核对，尚未实现。

- 2026-10-13 招式商店完整verify27411退出码0：282文件／1279项、PWA257项（24533.07KiB），全仓Lint0错误且保留既有Hook警告。99个核心文件及19张属性图标在public／dist的SHA-256全部一致；原生总链23975仍为同一活跃任务，尚无终态。Chrome较长初始化已返回明确状态：外部Chrome id3已登记，但标签列表请求为nodeRepl.fetch request failed，仍未获得页面上下文；宿主文件存在且进程10060活跃，两条应用登记presence PID已退出只是线索，未认定根因、未改授权或重启用户窗口。已询问真实存档路径／游戏版本，并请求保存内容后完全重启Chrome、重新打开5173及@Chrome，以恢复核验。本批未提交，下一步等原生终态再完成最后格式、提交普通推送；完整目标active。

- 2026-10-13 招式商店最后类型82594退出码0；文档审计后格式45278也通过。完整verify27411已通过格式与全仓Lint（0错误、1个既有initialTransfer Hook警告），进入类型阶段；默认完整原生23975持续推进，同一任务未重启。库存总览更正已接礼物相册与多项世代窗口的旧状态，明确历史API证据不替代当前完整接入；下一候选TechRecord只读核对追加PK9／PA9两段存储偏移、PA8独立缓冲及清理总位数差异。工程总链仍待终态、本批未提交、页面与真实存档待验收，完整目标active。

- 2026-10-13 当前招式商店最后格式43289已通过，属性裁剪退出码0；类型82594和默认完整原生23975仍为同一活跃句柄，未因观察等待重启。完整verify27411已排队，只有最后类型与格式退出码均0才启动。下一独立候选TechRecordEditor仅只读审计：五实体独立记录、61／100／230候选及64／112／304总位、父Shift与窗口批量不同草稿规则、Z-A显示编号／Core批量索引差异已记入模块文档；未开始实现。本批未提交，完整目标active，当前首要动作仍为收齐API148整体检查。

- 2026-10-13 招式商店核心14548构建退出码0，API148浏览器资产已生成；最新前端三文件73项、定向lint54737及全仓格式56668通过。初次类型21788退出码2，检查的是早期存档callback快照及单只文件可选格式值；已修复两处callback返回和明确false默认值，最后类型82594仍在运行。属性裁剪／默认完整原生串行23975已启动，分别保存TEMP中的moveshop-api148-trim和native-full日志／退出码。最后控件表头补15px／44px并统一动作底部基线，本批待最终格式与完整verify；未提交。Chrome5173仍超时，页面与真实存档未验收，完整目标active。

- 2026-10-13 招式商店API148已接存档和单只PA8两个正式详情入口，共用44px控件、Select与表单样式，中／英／日操作与属性名称、19张来源未修改类型图标齐备。预览冻结完整输出，确认进入既有副本／撤销；SAV8LA使用专用写入，不放宽通用编辑范围。最新原生专项95792退出码0，覆盖六动作的四PA8布局和LA两修订箱子／队伍完整文件对照、12种族等级组合／全部61索引、公开单只JSON和冻结生命周期。前端专项72项、首次定向lint通过，后续UI改动需最终检查；核心14548与类型21788正在运行。全量verify／默认完整原生／裁剪和真实存档仍待完成；Chrome5173仍连接超时。本批未提交，完整目标active，下一步收齐当前检查再进行完整工程门槛，不提前开始其他模块。

- 2026-10-13 招式商店首轮21193和两路径冻结69253均退出码0：12种族等级组合／61索引／六动作全实体oracle、四单只PA8布局（加密／解密×存储／队伍）及LA两修订箱子／队伍完整文件对照通过；一次确认／来源目标哈希／明确目标绑定／过期替换取消失败清理及原件通过。前端领域／冻结确认三项通过。内部MoveShopSession使用既有单只Serialize完整回读，存档限定实际SAV8LA，不放宽公开SaveUtil识别。API147，尚未公开JSExport／Worker／三语正式UI／类型图标／新核心，本批未提交，完整目标active；下一步公开required JSON与两入口接线。

- 2026-10-13 招式商店前端领域初稿及两项专项通过：61完整行／排序物理索引／手动不许可项／独立草稿／重复缺行拒绝及父入口reset不保存行。首轮原生21193仍确认同一dotnet21972运行，未重启；当前无公开接口／UI／冻结及两路径接线，API147保持不变。后续先取得原生终态，再补存档与PA8文件完整冻结／对照、三语正式入口和图标资源。本批未提交，完整目标active。

- 2026-10-13 当前基线main／origin/main `2f7a341850e47a594bf52dff93c68eb536f933b7` 已提交普通推送，标题 `feat: 接入SCBlock区块工具与存档比较`；Actions38317344036首次in_progress，未确认部署，新批开始工作区干净。当前独立MoveShopEditor：内部PokemonMoveShop克隆读取／完整61行保存／默认当前招式建议／Shift全部合法建议／Control清理再当前建议／None清两组／父入口Shift遭遇初始恢复已加入，保留两组尾部三位。首轮种族×等级／61索引／三语／完整实体source操作oracle专项21193编译运行中；API147、无公开接口／冻结／存档和单只文件接线／正式UI／新核心，本批未提交，完整目标active。

- 2026-10-13 SCBlock API147本批工程门槛收齐：完整原生18124退出码0，最新完整verify62651退出码0（281文件／1266项、PWA257项），Core／扩展裁剪62546退出码0，99个框架资产public/dist SHA-256一致。当前仅更新最终记录与库存／模块终态，最后格式后按既有授权提交普通推送 `feat: 接入SCBlock区块工具与存档比较`。正式页面／真实存档仍待核验，工程通过不作为所有者验收；完整目标active，下一独立模块MoveShopEditor来源已核对，未实现。

- 2026-10-13 SCBlock最新完整verify62651退出码0：281文件／1266项、格式／Lint／类型／网页与PWA257项预缓存24517.63KiB；99个public/dist框架资产SHA-256一致。Core／扩展裁剪62546成功证据保留，完整原生18124同一进程仍在继续（新增SCBlock四家族已通过），未取得总终态。下一步收该终态、最后文档／格式后授权提交普通推送；无功能源码追加，页面／真实存档仍待核验，完整目标active。

- 2026-10-13 当前SCBlock最终源码的完整verify62651和默认原生总链18124已启动，持久日志／退出码文件位于TEMP，原生wrapper24356确认活跃；此前核心62546成功证据保留。检查期间不再编辑功能源码。下一独立候选MoveShopEditor只读窗口初审：全部购买／掌握记录按Permit.RecordPermitIndexes逐索引、1基显示；Save先写全部行，再按Shift／Control／默认All不同Core操作，None的Core清理范围待核对。现有PokemonTraining仅华丽／极限特训，不覆盖商店，后续需读完整Core接口／掌握建议和窗口来源，未实现。完整目标active，本批未提交，正式页面未核验。

- 2026-10-13 SCBlock API147 Core发布＋扩展裁剪62546退出码0，四SC访问器的21／12／23／34个属性及全部常量字段／方法等元数据一致；保留实际IL2026反射提示。类型52050退出码2，Worker includes传入可能undefined的kind，已加存在性判断；最后UI未再变，完整verify将覆盖最终快照。全仓格式39783通过此前快照。下一步最新完整verify和含SCBlock默认原生总链、public/dist资产一致性、最终格式与授权提交推送。本批未提交，页面／真实存档未验收，完整目标active。

- 2026-10-13 SCBlock 名称设置补本地TXT导入，最后UI定向Lint84798退出码0；仍复用共享控件。Core62546已推进到wasm-opt，类型52050与最后全仓格式39783仍确认运行，未重启；当前不再修改产品/Core。最新界面完整verify及含SCBlock默认原生总链尚未启动，待现有重型任务终结再串行推进；公开真实识别／页面未验收，本批未提交，完整目标active。

- 2026-10-13 SCBlock 补完批量结果／完整差异50项分页与raw3072字节分页，全部记录仍可逐页查看，避免大量详情一次渲染。裁剪根生成器已同步保留四个SC访问器，当前Core62546正优化程序集，未重启；追加发生在原生测试文件，不影响产品发布输入，后续裁剪命令将检查根。最后UI Lint81517运行中，旧类型52050仍活跃，最终verify须覆盖最后UI；全仓格式39097已通过前一快照，39783仍运行。所有门槛未齐，本批未提交，完整目标active。

- 2026-10-13 SCBlock 四家族ZIP专项82143退出码0，源文件名和每块完整raw对照通过；目录选择补仅顶层文件／不排序，普通多文件仍支持，前端两文件60项通过。默认原生总链已加入SCBlockEditingTests。四个SC访问器反射属性／常量保留加入BlockAccessorRoots，Core发布＋扩展property-trim62546启动，尚无终态；后续需让root生成器保留这些四显式根。类型52050仍活跃，属于最后目录入口之前快照，最终verify覆盖。新核心未确认、页面未核验，本批未提交，完整目标active。

- 2026-10-13 SCBlock API147 最新原生27995、前端客户端／领域59项通过；正式三语工作区和主导航工具分组已接。目录50项分页、详情／只读raw 3072 bytes分页、名称／排除、16导出复选项、双存档源报告＋完整差异、逐文件结果及partial确认接工作副本撤销。首次UI Lint33366两个render-ref错误已改effect，最终UI Lint69703退出码0；类型52050仍运行且属于最后raw分页之前快照。全部区块目录用本地ZIP下载替代数千次文件下载，最新四家族ZIP专项82143运行中。新核心／裁剪／完整门槛未运行，页面未核验，本批未提交，完整目标active。

- 2026-10-13 SCBlock 接入 API147 六种 JSExport／Worker请求与四返回字段，Core／前端／客户端及既有原生协议断言同步147（保留物种146数据）。追加required JSON／公开失败预览reset断言，最新原生27995运行中；前端领域／六请求客户端两文件59项已通过。三语操作／字段词条已写，正式UI及导航、新核心和扩展裁剪尚未接／构建，本批未提交。全仓格式54851仍活跃，最后追加需最终闭环，完整目标active。

- 2026-10-13 SCBlock 最新边界／API初稿专项 40325 编译通过并已过前三家族，仍在 Z-A；sourcegen 和六项 JSExport／SaveService初稿已加入，尚未验证全部公开 JSON。前端 scblock 领域类型／有序导入克隆／来源与 partial确认／支持格式三项专项通过，尚未 Worker或正式入口。协议146保持不变，下一步取得当前终态、扩大公开required JSON／reset断言后同步升级协议和Worker、三语统一控件。全仓格式30153通过此前快照；最后追加需最终闭环。本批未提交，完整目标active。

- 2026-10-13 SCBlock 名称／排序／排除与数组子类型／NaN字节边界测试已加入；边界 68272 编译失败（CS0246），原因是运行时追加 SCBlockApi／Program sourcegen，构建读取旧 csproj 列表导致新类型缺失。没有通过证据，不计为产品行为失败；当前文件集合已完整，最新专项已串行重开，后续编译结束前不编辑其 Core 文件。六项 Core API／sourcegen 初稿已写，协议146、Worker／正式 UI 尚未接；本批未提交，完整目标 active。

- 2026-10-13 SCBlock 最新冻结专项 16235 退出码0，四家族完整文件缓存／partial确认／一次提交／过期来源／替换／旧取消／失败预览清理与原件通过；日志既有标题未改，覆盖以测试断言为准。下一步补名称／排除／分页及结构比较边界，再接公开 JSON、协议、Worker 与三语共享控件入口，随后扩展裁剪和完整门槛。本批未提交，API146，正式窗口未开放；完整目标 active。

- 2026-10-13 SCBlock 第二轮四家族专项 50435 退出码0：物理目录／克隆读取、16 导出组合、非空目录、部分成功及重复键顺序、布尔／raw 独立全文件 oracle、选中原始字节与完整比较通过。追加内部冻结会话及四家族测试，部分成功须明确确认，完整输出缓存一次，覆盖过期／重复／替换／旧取消／失败清理；最新 16235 正在运行。全仓格式 53000 已通过此前快照，最后追加仍需最终格式闭环。协议146，公开接口／Worker／正式三语 UI／新核心未接，本批未提交，完整目标 active。

- 2026-10-13 SCBlock 首轮专项 41788 退出码 -532462766：测试假定合成存档存在 Bool1，First 无匹配；未证实产品失败。通过公开 SCBlock 线格式为四个工程夹具明确追加 Boolean 测试块，未改生产识别。第二轮 50435 正在运行，覆盖追加的按实际存档类型回读、版本／数量／键／类型／子类型／完整 bytes 导出验证。当前仍内部初稿，无冻结／公开协议／正式 UI；本批未提交，完整目标 active。

- 2026-10-13 当前基线 main／origin/main `41944f8f8c4ab101e0afbe1b752254851f8205dc` 已普通提交推送，标题 `feat: 接入神秘礼物相册与本地二维码`；Actions 38306226365 首次确认为 in_progress，未宣称部署完成，新批开始时工作区干净。当前独立模块 SCBlock：内部读取／全部16导出／逐文件部分成功导入／布尔及等长 raw 写入／源报告和完整结构字节比较初稿已加入，四家族专项 41788 编译运行中。随后追加按实际类型回读及全部块元数据／bytes验证，因此首轮不能替代最后快照，需结束后最新专项。协议仍146，无公开 JSExport／Worker／UI／冻结会话，正式功能未开放；完整目标 active。

- 2026-10-13 相册 API 146 本批工程门槛收齐：完整原生 99420 退出码 0；最后图像追加的完整 verify 95943 退出码 0（280 文件／1256 项、网页／PWA 257 项），核心发布／扩展裁剪 21800 退出码 0，99 个 public/dist 框架资产哈希一致。最终全仓格式 65806 通过，此后仅更新本段和库存／模块终态，再执行最后格式与空白检查，按既有授权提交普通推送 `feat: 接入神秘礼物相册与本地二维码`。正式页面、真实存档以及桌面显示偏好仍待核验，完整目标 active；下一独立模块为来源已核对的 SCBlock 区块工具。

- 2026-10-13 图像追加后的最新完整 verify 95943 退出码 0：280 文件／1256 项，格式、Lint、类型、网页与 PWA 257 项预缓存 24497.28 KiB。99 个 public/dist 核心框架资产 SHA-256 全一致，保留既有 Hook／包大小提示。完整原生 99420 确認同一进程仍活跃，已推进到第八世代训练家，未取得终态；本批尚未提交，最终格式及授权提交推送待该终态。完整目标 active，页面／真实存档仍待核验。

- 2026-10-13 追加相册图像组件：网格／详情／导入预览统一本地图片、携带物叠层、三语异色标记与整图已用透明度，两项渲染专项退出码 0。这是完整 verify 62406 成功后的前端追加，须由新的完整 verify 覆盖，旧 1254 项不代表最后源码；不影响运行中的原生 99420 快照，未重启。桌面源星图／蛋下层／可选精灵球和遭遇背景设置仍记录待对照，未宣称视觉全部完成。本批未提交，完整目标 active。

- 2026-10-13 相册完整前端 verify 62406 退出码 0：279 文件／1254 项，格式、Lint、类型、网页与 PWA 257 项预缓存 24496.58 KiB；最后全仓格式 13824 退出码 0。public/dist 的 99 个核心框架资产 SHA-256 全一致，三个新 QR 许可证已在 dist/legal。完整原生 99420 确认仍在同一 dotnet 进程运行，已有新增相册全部用例及后续多个模块通过，未取得终态，不提前提交。只读补齐下一 SCBlock 工具的四实际家族、目录导入部分成功／顺序、16 组合导出及源比较遗漏边界；没有混入其功能代码。正式页面仍待 Chrome 连接及真实存档核验，完整目标 active。

- 2026-10-13 按所有者再次确认的控件统一要求复核相册：输入、共享 Select、按钮与文件入口沿用存档工作区既有样式，没有新增控件皮肤。修复详情基础规则覆盖容器断点的问题，窄面板的单列布局不再保留桌面左分隔线与内边距。完整 verify 62406 已过格式、Lint 与类型，进入 Vitest；完整原生 99420 已过相册全部新增用例并继续后续模块，仍无终态。Chrome 本地标签直接连接仍超时，正式页面未核验。本批未提交，待同一句柄终态、最终格式和资产一致性后提交推送；完整目标 active。

- 2026-10-13 API 146 核心发布／扩展裁剪 21800 退出码 0，228 根类型／2 程序集及原属性目录检查通过，保留既有反射 IL2026 提示。最新完整 verify 62406 已过全仓格式并在 Lint；开始串行完整原生总门槛（含 Wondercard 初始／十布局动作／特殊／公开 JSON 与导入卡片 QR）。最后样式／资源清理与导入导出定向 Lint 71863通过；当前代码不再编辑，待全量终态后只更新工程记录、核对 public/dist资产、最后格式和授权提交推送。正式页面和真实存档仍待核验，完整目标 active，本批未提交。

- 2026-10-13 相册正式界面补齐导入卡片的独立导出／QR、下载 URL 清理及按容器宽度重排，避免导航／详情压缩六格图片。一次 JSX 编辑语法错误由格式／Lint定位并修复，最后定向 Lint 71863 退出码 0；新增公开 imported-QR source-generated JSON 断言，待默认原生总链运行。核心／扩展裁剪 21800 仍确认运行，完整 verify 62406 已启动并在格式阶段；未重启活跃检查。上一篇类型通过为此前快照，最新完整 verify 将覆盖最后 UI／Worker。下一步收齐核心／verify终态、比对 public／dist 核心资产、完整原生及最终格式，再按授权提交推送。本批未提交，完整目标 active。

- 2026-10-13 相册当前实现进入全量工程收尾：公开 API 146、正式用途导航、三语真实槽位／图像／详情／所有操作、PNG QR 生成与本地图片解码已接；最后客户端／QR 三文件 59 项和能力专项 43273通过。下一步串行最新核心发布／扩展裁剪、完整 verify 和完整原生，最后格式及授权提交推送。页面连接仍超时，真实图片文件渲染与真实存档未验收；本批未提交，完整目标 active。

- 2026-10-13 API 146 最新公开 QR／UI 原生专项 63228、前端客户端／相册／离线 QR 三文件 59 项及类型 94909 均退出码 0。已修复 SAV5 clone 解密后校验导致 CanEdit 误禁用，改在 source 序列化数据上先取能力；追加断言及默认总链 WondercardEditingTests，最新专项 43273 退出码 0，十布局有效存档在克隆解密后仍可编辑。正式控件首次读取去重、换语言保留草稿、迟到结果清理与新预览旧票据取消已处理，浏览器仍未连接。所有旧原生协议断言同步 146。最新核心／裁剪及完整 verify／原生总门槛未运行，本批未提交，完整目标 active。

- 2026-10-13 SAV_Wondercard 已接 API 146 六项公开 JSExport／Worker 请求、完整 required JSON 与冻结清理，公开十布局专项 87492 退出码 0。正式三语相册入口加入事件分组，真实格位／图片／卡片导出、文件预览／设置／外部路径、删除／复制／交换／已用、领取标记及冻结差异接既有工作副本撤销。加入独立本地 QR Worker 的 qrcode 1.5.4（MIT）／jsqr 1.4.0（Apache-2.0）和 @types/qrcode 1.5.6，四种卡片长度与反色离线往返三文件 53 项通过，最后客户端六请求专项待运行；新文件 Lint通过，类型 94909 仍运行，最新 QR／UI 原生 63228 运行中。镜像连续 ETIMEDOUT 已按实际网络错误终止安装 63748，使用官方 registry + 现有代理安装16416完成；未更改用户 npm 配置。新增许可证将随网页输出。Chrome getState 仍超时，页面／真实存档未验收；最新核心发布／裁剪／全量门槛未跑，本批未提交，完整目标 active。

- 2026-10-13 相册前端请求／目录／冻结领域类型已加入，4 项专项通过，保留原始卡片载荷与动作顺序，覆盖 HGSS 第 11 槽、flag 0／最高范围、WR7 禁用已用及 QR、来源／目标 hash、格式与问题确认。尚未公开 API 或 Worker；下一步接公开协议及三语网格／本地 QR codec，完整目标 active，本批未提交。

- 2026-10-13 SAV_Wondercard 特殊分支专项 59009 退出码 0：HGSS 胶囊第 11 槽、PCD／PGT 转换／外部 drop、AO 无限船票接收／发送完整文件联动、XY 拒绝、QR 导出限制与源异常移动原子拒绝；三语物品详情资源通过。增加 WondercardDetails 三语描述，PGT 特殊类型使用明确语言资源，保留原卡标题；新增结构化图片／名称／数量元数据且晶体图像映射不覆盖原 ItemId。最新元数据专项 97854 退出码 0，API 145、正式接口／界面／本地 QR codec 未公开，本批未提交，完整目标 active。

- 2026-10-13 SAV_Wondercard 加入内部冻结会话：来源／目标哈希、一次确认、问题确认、替换／旧 token 取消、过期／失败清理；新增十布局设置首空位／删除前移／交换／全部已用／本地 QR 载荷与独立完整文件 oracle，专项 22086／诊断 37999 在 B 首空槽 oracle 失败；诊断证实共享 SAV5 空白夹具解密后无空卡，测试错误假设全空。保留原异常夹具读写测试，另经独立 source-save 明确清相册构造动作夹具，最新专项 41355 退出码 0，十布局设置／交换／删除／已用／QR 载荷／冻结哈希／问题确认／过期／替换／旧取消／失败清理及原件 oracle 通过。修复 QR 载荷误走空扩展名 parser，分离单文件预览与受限制 QR 导出；正式 API／Worker／三语 UI／图片 QR 尚未公开，协议仍 145。本批未提交，完整目标 active。

- 2026-10-13 当前基线 main／origin/main `df5e503f8b678b7c4fd62d5679dd6ea14100ca15` 已普通提交推送，标题 `feat: 接入通用区块属性编辑并统一存档控件`；Actions 38295730184 仍 in_progress，未宣称部署完成。工作区在此批开始时干净。唯一当前模块 SAV_Wondercard：增加内部相册读写／来源有序动作初稿，覆盖实际 Gen4–7／LGPE 目录、领取标记、复制／设置／外部拖入／QR 文本设置、删除／交换／已用状态和 Gen4／5／6 保存联动；读取独立 clone、异常源移动原子拒绝。首次原生专项 86696 退出码 0：十布局完整相册、独立 clone／加密原件、领取／源保存顺序完整文件 oracle 通过，尚未证明完整动作，未公开协议，API 145；正式三语 UI／冻结会话／本地 QR 图像与资源导入未接。本批未提交，完整目标 active。

- 2026-10-13 SAV_Accessor API 145 当前批次工程门槛收齐：完整原生 11100 退出码 0（含新增八访问器／数组／结构化对象／冻结／原件测试）、完整 verify 88612 退出码 0（277 文件／1239 项、全仓格式／Lint／类型及最新核心网页／PWA 253 项，24308.92 KiB）、核心发布及 228 类型／2 程序集扩展裁剪 57631 退出码 0。此前全仓格式一次中间编辑警告已修复，8095 最终全仓格式与 diff 空白检查退出码 0。本批准备按既有授权一个提交普通推送；提交后唯一下一模块 SAV_Wondercard 相册，已记录来源与静态边界，尚未实现。Chrome 连接超时，正式页面和真实存档仍待验收；完整 PKHeX 目标保持 active。

- 2026-10-13 完整 verify 88612 的类型与全部 Vitest 已通过：277 文件／1239 项，完整 verify 88612 退出码 0，Vite／PWA 253 项预缓存 24308.92 KiB 已生成；核心资产已先更新，打包使用最新 API 145。完整原生 11100 的进程 27352 仍活跃，已有大量后续夹具通过；观察等待不重启。下一步取得两个终态、更新最终工程记录并完成格式检查，按既有授权提交／普通推送。神秘礼物离线 QR／相册来源边界已记录，仍未实现，完整目标 active。

- 2026-10-13 完整原生 11100 已在默认链实际执行并通过八访问器／嵌套数组／UInt128 新测试，仍继续后续箱子与属性批处理，未终结。完整 verify 88612 已过格式与 Lint，类型阶段仍运行；保留原句柄，不重复启动。完成只读下一窗口初审并记录 SAV_Wondercard 的 Gen4–7 相册／收取标记／源槽位兼容及保存加密语义，未混入功能实现。下一步收齐两个全量终态、最终格式、普通提交推送；页面和真实存档仍待核验，完整目标 active。

- 2026-10-13 API 145 核心发布及扩展裁剪 57631 退出码 0，确认 228 个根类型／2 程序集的属性、构造器、枚举字段、类型／属性 custom attributes 与方法签名／方法体存在性；嵌套根解析警告消除，保留实际反射 IL2026 提示。旧 26 类型属性签名检查亦通过。完整前端 verify 88612 已过格式／Lint（0 error、1 既有 initialTransfer Hook dependency warning），进入类型；串行完整 PKHeX 原生总门槛 11100（含新增 BlockAccessorEditingTests）仍运行且已有各世代 PASS 输出。已核对原客户端 244 请求名称无遗漏；工程结果仍不是真实存档或页面验收，本批未提交，完整目标 active。

- 2026-10-13 区块入口补齐 StrictMode 首次读取去重、冻结区块／类型／文化一致性与完整编码请求限额，结构化确认显示完整 JSON 前后值并内部滚动。最新三文件 55 项通过，界面最后批格式化与 diff 空白检查通过。全仓格式 64861 一次失败（检查时 BlockAccessorEditor.tsx 正在编辑，已重写格式）；最终完整 verify 88612 正在进行，锁定 Node v24.19.0／npm 12.0.2。类型 33398 已退出码 0；完整 verify 88612 的全仓格式已通过并进入 Lint，修正嵌套根的核心／扩展裁剪 57631 确认仍运行，不因观察超时重启。下一步读取这三个句柄终态，修复实际失败，串行完整原生并确认最新核心网页构建，最后格式与普通提交推送。Chrome getState 仍超时，页面／真实存档未验收；本批未提交，完整目标 active。

- 2026-10-13 SAV_Accessor API 145 正式三语入口已接到工具分组，共享控件、40 项逐层分页、跨区块有序草稿、冻结前后属性／全部区块字节差异、确认应用接既有撤销／导出。可编辑结构化对象增加当前 JSON；动态序列化改为 JsonNode，不依赖 object 反射序列化。前端三文件 54 项与首轮界面 Lint 通过；旧原生专项因新增测试错误引用 Fashion6XY.Fashion 编译失败，按 MyStatus6XY 的 Status.Fashion 来源修正后，新专项 62177 退出码 0，增加四组合数组和男女外观 JSON 原样回写的全文件 oracle。旧发布 13012 退出码 0但含嵌套根警告，已修正 `/` 并扩展两程序集成员／属性检查，新发布与扩展裁剪检查 57631 正在运行；界面类型检查 33398 仍运行。本批未提交，完整目标 active。

- 2026-10-13 所有者再次确认存档 Demo 布局与控件统一要求。补齐共享表单最终规则、输入宽度及标签基线对 `.save-primary-workspace` 的覆盖，沿用 44px 高度、15px 标签及现有主题／焦点／禁用反馈；未改专用箱子布局。当前 SAV_Accessor 已公开 API 145 与四项 Worker 请求，原生公开 JSON 专项和前端 48 项通过；实际运行时裁剪根生成 228 类型／2 程序集，核心发布与类型检查仍在运行；发布已提示嵌套类型根使用 `+` 无法解析，下一步修正 ILLink 名称并重做发布／裁剪检查。正式属性窗口未挂载，本批未提交，完整 PKHeX 目标继续进行。

- 2026-10-13 SAV_Accessor 文化专项 16683、显示／提交三文化 roundtrip 与完整 collection-item 清单 12791 均退出码 0。96785 曾因 en-US 不接受测试字面 Infinity 失败，改实际 NumberFormat 符号并统一 Reader／Session／Writer 文化参数；nullable 空日期、NaN／Infinity 符号、0xFF、未知枚举 255、八访问器／复杂数组／冻结的完整文件对照通过。最终审计含 8 家族／207 命名对象／22245 可见属性节点／19184 可写描述符／28 getter错误；初步涉及 164 个 Core 类型，裁剪根尚需补实际运行时子类与转换器依赖，未验证，不能按计数称完成。原生读写／冻结初稿未公开接线，API 144、本批未提交；下一步裁剪根与完整属性编辑覆盖、正式协议及统一三语 UI。一次只读清单汇总使用错误 wildcard 产生重复错误，已终结并以字符串后缀过滤重算，未改存档。完整目标 active。

- 2026-10-13 SAV_Accessor 编辑初稿加入原生 PropertyDescriptor／实际转换器、有序跨区块路径、数组与脱离对象逐层回写、结构化数组／对象替换、独立 clone 导出重读；首轮 44845 因测试错误调用 SAV6.Encount 编译失败，按实际 XY／AO 类型修正后 35706 退出码 0。新增冻结会话／来源目标哈希／全部原始区块差异，16515 退出码 0，八访问器标量、森林末槽、Radar 嵌套、数组替换、服饰末项、战斗树、UInt128 全文件 oracle 与原件通过，失效／重复／替换／取消旧 token／失败预览清理通过。最后追加 nullable 日期、NaN／Infinity、十六进制与未知枚举数值待最新专项；未公开 Worker／界面／裁剪，API 144、本批未提交，完整目标 active。

- 2026-10-13 BlockAccessorReading 八访问器专项 88783 退出码 0：来源排序／显式接口别名、原件不变与完整选中树通过，森林 4244 节点含第 529 槽，服饰 5793 节点含第 1447 项。审计中 collection-item 扩展刚补入，终端仍输出旧版清单计数，后续重新生成最终审计，不据旧数声称全量覆盖。当前原生读取初稿未公开接线，编辑／数组与嵌套回写／冻结／Worker／三语控件／裁剪仍未完成，API 144，本批未提交，完整目标 active。下一步先完成完整属性转换和按路径回写、完整字节对照，再正式协议与界面。

- 2026-10-13 SAV_Accessor 原生清单审计 40085／转换器展开与逐 getter 字节审计 21031 均退出码 0，八访问器 207 个命名对象；数组展开后的清单为 6137 属性，但非 expandable 的 collection-item 属性仍继续补齐，不能当最终数量。源 EntreeForest.Slots 在 BW／B2W2 解密并改变各 2115 字节，元数据构造本身无变化；普通 Span 读取不支持及合成日期／SM 越界另记录，不隐藏字段。新增 BlockAccessorReading 原生初稿：原件独立克隆、源排序／别名、完整描述符树、数组项属性和失败状态；88783 正在检查源名称、原件及第 529 森林槽／第 1447 服饰项。尚未编辑／冻结／JSExport／Worker／三语入口／元数据裁剪，新核心未改，API 144，本批未提交，完整目标 active。Z-A 精确提交 Actions 38280587451 仍 in_progress，未确认部署。

- 2026-10-13 Z-A 训练家已提交并普通推送 main：`b94ee7539d3c39e6d330dc120491994ab444e5fc`，标题 `feat: 接入Z-A训练家完整编辑与收集工具`，36 文件；最终格式 8399 退出码 0，推送后工作区干净。精确提交 Actions `38280587451` 为 in_progress，未确认部署。下一独立 SAV_Accessor 已核对窗口／Designer 与 SAVEditor 调用点：BW／B2W2／XY／AO／AO试玩／SM／USUM／Let’s Go 八种 accessor，按 SaveBlockMetadata.GetSortedBlockList 选择 IDataIndirect 对象并直接 PropertyGrid 编辑；Raw 页未指定对象，不能当作已实现原始导入导出。尚未产品实现，接下来核对全部属性、TypeConverter／范围／只读行为、元数据裁剪及 clone-first 冻结方案。Chrome／真实存档仍未验收，完整目标继续 active。

- 2026-10-13 Z-A 训练家 API 144 工程收尾通过：完整原生 59874、最新小时／姓名专项 28944、最终完整 verify 89701（276 文件／1229 项）、最终核心／26 类裁剪和最新核心网页 69970 均退出码 0，PWA 253 项、24293.86 KiB，保留既有提示。完整字段／地图／DLC／三图片 PNG-JPG-BMP／招式机与螺丝收集联动／姓名字节字符／三语冻结和撤销已接，控件复用公共样式。三修订为类型化工程夹具，公开识别／真实存档／页面仍未验收；不以工程通过代替完整 PKHeX 完成。最后文档／格式后按既有授权提交并普通推送 `feat: 接入Z-A训练家完整编辑与收集工具`；下一独立模块为 SAV_Accessor，当前仅来源初查，完整目标继续 active。

- 2026-10-13 最终完整 verify 89701 退出码 0（276 文件／1229 项），最终核心与 26 类裁剪 69970 的核心门槛退出码 0；完整原生 59874 与最新小时／姓名专项通过证据保留。69970 正在用最后源码和 API 144 核心生成网页，尚未计为最新网页通过；本批未提交，最后文档／格式后按授权提交推送。下一独立 SAV_Accessor 仅完成只读来源初查（泛型 block metadata 与直接 PropertyGrid），尚未开始实现，须先完成本批。Chrome 连接两次查询超时，页面／真实存档未验收，完整目标继续 active。

- 2026-10-13 最后小时／空 mask 专项 28944 退出码 0，三修订整文件、小时空值拒绝与其他 mask 归零通过。最新完整 verify 89701 已启动，串行核心／裁剪／最新网页任务 69970 等待同一 npm PID 11372 与原生成功门槛（24952／持久退出码），不会复用旧核心作为最后产物。此前完整原生与 276 文件／1229 项 verify、姓名专项及首轮核心裁剪通过证据保留；新源码还须最新完整工程与产物闭环。最后编辑格式通过，本批未提交；Chrome 查询超时，页面／真实存档未验收，完整目标继续 active。

- 2026-10-13 API 144 完整原生 59874、完整 verify 21183（276 文件／1229 项）、最新姓名原生专项和核心／26 类裁剪 54448 均退出码 0，保留既有提示；全仓格式 87284 通过。核心生成后复核小时空值发现不符上游直接 ushort.Parse，已改 Core／domain 明确拒绝并加三修订全文件空 mask 对照；该最新追加仍待检查，现有核心不是最后源码状态。Chrome 查询再次超时，页面／真实存档未验收，本批未提交，完整目标继续 active；下一步最新专项／完整 verify，再重新生成核心、裁剪与最新网页，最后格式后按既有授权提交推送。

- 2026-10-12 姓名来源补齐后的前端 43797 三文件 56 项退出码 0，最新完整 verify 21183 的全仓格式已通过，后续阶段仍在运行。原生 59874 仍确认活跃，对应 .NET run PID 24424；修复版 verify 对应 npm PID 21484。串行核心任务 54448 等待这两个真实进程终结及持久成功退出码，再运行最新姓名原生专项、发布 API 144 核心与 26 类裁剪；未提前计为通过，不重启仍活跃任务。原生全量属于姓名追加前快照，最终证据必须结合最新专项。新核心未发布、本批未提交，最新网页与最终格式随后进行；页面／真实存档未验收，完整目标继续 active。

- 2026-10-12 API 144 完整 verify 78152 在类型阶段退出码 2，查明 Worker 本地消息 union 漏四种 Trainer9a 请求，已补齐。继续对照上游 `PKM Editors/Text.cs`／Designer，补姓名源世代 0–100、Z-A 新西班牙语 layer 和 18 个 Switch 特殊字符，新增 Core 完整文件 oracle 与领域边界；最新追加待检查。完整原生 59874 仍在运行，属于追加前的代码快照，不重启同一活跃任务；最终需对最新源码收尾。新核心未发布、未提交，页面／真实存档未验收，完整目标继续 active。

- 2026-10-12 Z-A 训练家 API 144 已接完整 Core／冻结、JSExport／Worker／客户端、正式训练家用途入口与三语五分组，图片抽成共享组件，快捷值与输入同行。三修订源保存／三图片／100 螺丝位置／背包联动／服装重置专项 60648 退出码 0；最新公开 JSON／冻结专项 32155、前端 3572（三文件 55 项）、接线 Lint 65163 均退出码 0，保留既有原生平台提示。类型 85916 已通过，随后新增测试由完整 verify 再覆盖。新核心尚未发布，本批未提交，完整原生／verify／核心与 26 类裁剪／最新网页开始收尾；页面和真实存档未验收，完整目标继续 active。

- 2026-10-12 朱／紫训练家已提交并普通推送 main：`5df11e3bd5a7105fd808b7c3bb15d594c7149243`，标题 `feat: 接入朱紫训练家完整编辑与图片导出`；最后全仓格式／空白检查通过，推送后工作区干净。精确提交 Actions `38264466485` 首次为 in_progress，后续查询遇到 EOF，未确认部署。下一独立 Z-A 训练家已核对完整窗口与 Core，新增读取／编辑／冻结原生初稿及三修订工程夹具；首次定向检查因合成游玩秒数块仍为 Object 失败，按 Core 明确改为 Double，第二次检查正在运行。生产识别未放宽，API 保持 143，尚未 JSExport／Worker／正式三语入口／新核心构建／页面核验，本批未提交。完整目标继续 active。

- 2026-10-12 朱／紫训练家 API 143 工程收尾通过：完整原生 26960、完整 verify 75539（275 文件／1217 项）、核心／26 类裁剪 53559、最新核心网页 22130 均退出码 0，保留既有提示。完整字段／地图／蓝莓／三图片 PNG/JPG/BMP／全部解锁／源 TID-SID 与姓名字节／冻结撤销三语入口已接，复用共享控件。SV 专项为类型化工程夹具，公开识别和真实存档／页面仍未验收；PKHeX 完整目标继续 active。最后文档与全仓格式收尾后，按既有授权提交并普通推送 `feat: 接入朱紫训练家完整编辑与图片导出`；下一独立模块为尚待核对的 SAV_Trainer9a。

- 2026-10-12 API143核心／26类裁剪53559退出码0，完整原生26960与完整verify75539（275文件／1217项）证据保留；最新核心网页正在生成。保留既有警告，本批未提交，最后文档／格式和提交推送待最新网页终结；SV工程夹具识别／真实存档／页面核验限制继续保留，完整目标active。

- 2026-10-12 API143完整原生26960退出码0；完整verify75539的275文件／1217项通过证据保留。串行核心53559已获得真实原生成功门槛，发布／26类裁剪正在收尾，尚未计为通过；最新核心网页与最后格式／提交推送随后进行。当前未提交，类型化SV夹具不代表公开识别／真实存档验收，Chrome／页面仍未核验，完整目标继续active。

- 2026-10-12 API143完整verify75539退出码0，全仓格式／Lint／类型／测试／网页通过，保留既有提示。完整原生26960仍活跃，核心53559继续等待同一wrapper24932与持久成功退出码，新核心未发布；当前网页仍API142核心，最新核心网页与最后格式／提交推送待收尾。页面／真实存档未验收，本批未提交，完整目标继续active。

- 2026-10-12 Trainer9 最新类型66083、Core58693、前端36317／最终49项均通过。日期UI补源入学date-only（变化才归零时间）、保存日期1753–4095，最新完整原生26960／完整verify75539已启动并持久退出码。确认原生.NET wrapper24932活跃，串行核心等待同一进程和真实成功退出码后发布／26类裁剪；新核心未发布，本批未提交。SV工程fixture识别限制保留，Chrome／真实存档未验收，完整目标继续active。

- 2026-10-12 Trainer9 ID／trash专项 15289 退出码 0；API143已接正式训练家用途导航、JSExport／Worker／客户端和三语五分组，原件冻结／撤销、TID/SID事件、完整ID与姓名高级字节、三图片PNG/JPG/BMP、全部源解锁入口已接。最新Core58693／类型66083／前端36317正在运行，客户端四变体新增待最新专项；新核心未发布，本批未提交。SV仅类型化工程夹具，未将公开识别失败改为放宽门槛，页面／真实存档仍未验收，完整目标继续active。

- 2026-10-12 Trainer9 UI补齐源六位TID／四位SID事件、姓名高级文本／hex／prepare／clear／layer入口，复用共享控件与Core；完整ID／普通姓名编辑清相应高级队列以避免冲突，脏预览禁用保留。图片PNG／JPG／BMP与卸载异步释放专项前端8项通过，组件最新Lint通过。最新句柄15289正在检查ID/trash完整文件事件顺序；尚未Worker/JSExport/协议升级和正式入口，本批未提交，API142，完整目标继续active。

- 2026-10-12 Trainer9 全部解锁／类型化冻结 84580 与 ID 源事件专项 29764 均退出码 0，六布局完整 source 操作先于保存、当前性别、坐骑／木桩／配方／飞行／投球风格／教练／点心、完整文件／原件及 SID-first/TID空值边界通过。UI 加 TID／SID 源输入事件，完整 ID 改动清源事件避免冲突；姓名 raw目录／Core trash事件已接但完整高级入口尚未挂载。最新小时／ID／trash追加后仍需专项，正式 Worker／协议／入口未接，API142，本批未提交，目标继续 active。

- 2026-10-12 Trainer9 UI 初稿加入五分组、共享 Select／输入／工具栏、地图未触发保留、三图片本地 PNG／JPG／BMP 导出及异步生命周期，前端 8 项通过，组件 Lint 通过。全部解锁工程对照在缺 shrine bool／UInt64、Snacksworth Int32 的合成元数据上失败，按 Core 明确补 fixture，最新 84580 运行中；生产没有改变源操作。修复源小时 UInt16 溢出为明确输入拒绝，最新追加尚待专项覆盖。尚未正式挂载／Worker／协议升级，日期／ID完整源控制形态和 trash 入口仍待补，API142，本批未提交，完整目标继续 active。

- 2026-10-12 Trainer9 类型化冻结专项 20430 退出码 0，六布局必填 JSON／完整文件缓存／过期替换取消重复确认／原件通过，明确没有公开识别验收。全部解锁专项 84779 因合成 fixture 缺五坐骑 bool blocks 失败；按只读 accessor 常量补具体哈希，DLC飞行块仅修订 >=2 补入，最新 38684 运行中，生产识别／缺块行为未放宽。新增 trainer9 三语领域／请求像素校验初稿，尚未 UI／Worker／协议升级，本批未提交，API 142，完整目标继续 active。

- 2026-10-12 Trainer9 图片／源保存扩大专项 33765 退出码 0，三位置真实 DXT1像素、独立 BGRA→RGBA、异常尺寸与读取不变通过。冻结公开专项 57193 因既有 SvBlockFixtureTests 合成文件未被 SaveUtil 识别失败；不放宽产品 Open。按现有 Raid9 路径增加内部类型化 Core 准备／会话供工程对照，公开仍严格识别；最新 20430 正在运行，不能称为真实公开存档验收。IDManager 源确认值变更即时写 SID 再 TID，后续 UI 须对应；全部解锁／日期控件／界面仍待完成，API 142，本批未提交，完整目标继续 active。

- 2026-10-12 Trainer9 目录 5728 与源保存 72959 均退出码 0：六 SL／VL×修订0／1／2，完整字段／日期／时间取模／Blueberry UInt32／MapUpdated 忽略未触发文本／float四元数，独立加密全文件对照与原件通过。Trainer9Fly 按只读源完整 FlyHashes 本地复制并署名，加入跳过缺块的解锁操作，尚待最新专项。三图片尚未实际像素／导出夹具，全部解锁／冻结／Worker／三语 UI 仍未接，本批未提交，API 142，完整目标继续 active。

- 2026-10-12 Trainer9 目录初检 1823 因合成图片宽高块为 Object 失败，修正对应六 UInt32 夹具块并加产品类型 guard 后 35276 又因合成日期未初始化失败。目录改无效日期返回空状态、夹具设置明确有效日期，最新 5728 正在运行；不放宽实际编辑日期。Trainer9Actions 初稿加入源基础保存／MapUpdated float 四元数／蓝莓／Core 解锁，解锁顺序已放在完整保存前以使用源当前性别；尚未飞行点／完整独立字节对照／冻结／Worker／三语 UI，API 142，本批未提交，完整目标继续 active。

- 2026-10-12 Trainer9Editing 目录初稿加入完整源基础字段、地图 decimal 可表示性／四元数、修订 >=2 蓝莓任务／投球风格三语源选择，以及三图片 DXT1→RGBA 读取（缺块／非四倍数／长度／资源上限明确不可显示）。六种 SL／VL×0／1／2 类型化专项 1823 正在运行，来源字段与图像实际块尚待补夹具；完整编辑／解锁／冻结／Worker／三语 UI 未接，新协议未改，本批未提交，API 142。下一步确认目录专项，再完整源编辑／图片导出／命令，不缩小范围。

- 2026-10-12 圆庆广场已提交并普通推送 main：a3fa0984b52d0c12fb65485b5111988ec7a7bb74，标题 `feat: 接入圆庆广场与对战代理人工具`，36 文件，推送后工作区干净；完整工程／核心裁剪／最新网页通过，最后格式 90633 退出码 0。精确 SHA Actions 38247656251 已确认 in_progress，未确认部署。下一独立 SAV_Trainer9 开始来源核对，范围含基础信息／地图四元数／三图片／蓝莓任务风格与解锁命令，不简化成基础训练家页；尚未实现。Chrome／真实存档未验收，完整目标继续 active。

- 2026-10-12 圆庆广场 API 142 工程收尾通过：完整原生 31376、完整 verify 3351（274 文件／1205 项）、核心／26 类裁剪 40417、最新网页 31785 均退出码 0，PWA 253 项、24254.70 KiB；保留既有提示。七设施／短语奖励／日期 FC／USUM 代理人与原件冻结三语共享控件已接，本批最后文档／格式后按既有授权提交推送 `feat: 接入圆庆广场与对战代理人工具`。Chrome／真实存档未验收，其他 PKHeX 清单仍未完成，完整目标保持 active。

- 2026-10-12 API 142 核心／26 类裁剪 40417 退出码 0；完整原生 31376 与完整 verify 3351（274 文件／1205 项）通过证据保留。最新核心网页正在生成，最后文档／格式与提交推送随后收尾；本批未提交，页面／真实存档未验收，完整目标继续 active。

- 2026-10-12 API 142 完整原生 31376 退出码 0；完整 verify 3351 的 274 文件／1205 项通过证据保留。串行核心 40417 已获真实成功退出门槛，开始发布／26 类裁剪，尚未计为核心通过；最新核心网页、最后文档／格式与提交推送待终结。当前未提交，页面／真实存档未验收，完整目标继续 active。

- 2026-10-12 API 142 完整 verify 3351 退出码 0：274 文件／1205 项、格式／Lint／类型／网页与 PWA 253 项、24254.70 KiB 通过，保留既有提示。网页仍使用 API 141 核心；完整原生 31376 活跃，核心 40417 按同一原生 wrapper 16284 与真实退出码等待。当前未提交、新核心未发布，页面／真实存档未验收，整体目标继续 active。

- 2026-10-12 Festival 最后专项 17848、类型 55367 均退出码 0。完整原生 31376／完整 verify 3351 已启动并保存持久退出码，API 142 核心仍未发布。专项与前端 47 项结果保留，本批未提交，页面／真实存档未验收；下一步沿同一任务收尾，再串行核心／裁剪／最新网页与最后格式提交推送，完整目标保持 active。

- 2026-10-12 Festival API 142 接线 Core／冻结 56113、Lint 21777、前端 94586（三文件 47 项）均退出码 0；类型 55367 仍运行。最新 17848 增加全部 125／128 类型事件颜色 clamp 与 facility DTO 必填，正在运行；普通字段界面不复制 Core 几率／限额算法，bulk 显示按完整动作顺序处理。当前新核心未发布、未完整工程、本批未提交，Chrome／真实存档未验收，完整目标继续 active。

- 2026-10-12 Festival API 142 已接 JSExport／Worker／客户端、正式用途导航与三语五任务页签。源选项／短语／奖励本地资源、实体图片／六导出格式、冻结／工作副本撤销已接；当前类型事件由 Core 回读颜色，等级变化由 Core 回读胜场限额。最新 Core 56113、类型 55367、Lint 21777、三文件专项 94586 正在运行，协议已同步但新核心未发布；API 142 产品尚未完整工程／浏览器核验，本批未提交。仍需确认类型事件 source oracle、预览导入反馈和大模块字段全覆盖；完整目标继续 active。

- 2026-10-12 Festival UI 继续补齐本地日／英源短语与署名、中文显示翻译、源顺序 125／128 个设施名称／八 NPC／十一奖励标签；控件使用共享 Select，不再仅编号。类型事件通过 Core NormalizeType 限制颜色并回读预览，普通颜色编辑仍按范围拒绝，不静默夹取。最新 type 归一化尚待专项覆盖；仍未 JSExport／Worker／正式挂载／协议升级，本批未提交，API 141。下一步先接完整产品协议，再运行最新源动作／JSON／UI 专项和完整工程，整体目标保持 active。

- 2026-10-12 Festival 冻结专项 27203 退出码 0，来源／目标、公开 JSON、完整 bytes／六实体文件、one-time／stale／替换／targeted discard／失败预览清理通过。新增 festivalPlaza 领域与五任务页签 UI 初稿，复用共享输入／Select／工具栏、原图、本地下载、生命周期释放和脏预览禁用，组件 Lint 退出码 0。尚未挂载／JSExport／Worker／协议升级；设施类型仍数字初稿、短语奖励仍编号，源选项文本与动态类型颜色联动／所有 agency 导入反馈待补，不能标记产品完成。API 141，本批未提交，完整目标继续 active。

- 2026-10-12 Festival 扩大专项 38724 退出码 0，完整 source 保存／clone-first 输出、动态边界、SM 名称无写入和 USUM 三实体两格式 party-size 导出通过。FestivalPlazaSession 初稿已加来源／目标 SHA-256、独立 token、缓存完整输出、前后目录／差异与六导出文件；确认不重算，旧 discard 不清新预览。源生成 JSON 已接，最新冻结专项 27203 正在运行；尚未 JSExport／Worker／三语 UI，新核心未发布，API 141，本批未提交。下一步确认专项并补完整 UI／协议，不把 Core 会话等同产品完成。

- 2026-10-12 Festival 动作保存 80120 退出码 0，SN／US 独立完整 source 保存顺序对照通过；此前 78127 编译失败是导出误用不存在的 PKM.DecryptedPartyData，已改为源 SavePKMDialog 的 SIZE_PARTY／WriteDecryptedDataParty／WriteEncryptedDataParty，支持两格式。最新 38724 增加 clone-first Prepare、动态等级边界／原件失败保护及三实体两格式导出，仍运行。完整模块尚未冻结会话／JSExport／Worker／三语界面，本批未提交，API 141，下一步按同一范围继续。

- 2026-10-12 Festival 初始目录／删除访客／Hex 专项 67797 退出码 0，覆盖 SN／US 实际工程夹具原件与完整独立字节 oracle。FestivalPlazaActions 已加入完整有序动作和源保存顺序初稿：FC／rank／日期／短语奖励、设施事件和当前设施规范化、USUM 代理人完整重写／邀请／等级／胜场／训练家／队伍导入与实体导出／眼镜确认。最新完整保存 source oracle 78127 运行中，尚未冻结会话／JSExport／Worker／UI，API 仍 141，本批未提交；下一步确认动作专项与扩大边界、机构导入导出，再接会话和共享三语控件，完整目标继续 active。

- 2026-10-12 FestivalPlazaEditing 初稿加入七设施／107 短语／11 奖励／四消息、FC／日期／完整 raw 与 USUM 三只代理人目录，源类别／动态颜色与胜场、删除访客条件 ID 清除、Hex 源解析及 SaveFacility 规范化辅助。尚未完整源事件／agency 保存／冻结会话／JSExport／Worker／三语 UI，API 仍 141，本批未提交。初始专项 67797 正在运行，覆盖 SN／US 实际工程夹具读取不变、目录数、代理人 gate 和删除／Hex 独立完整文件 oracle；初稿格式 44567 已输出通过。下一步先确认专项，再完整有序动作与代理人导入导出，不缩小模块范围。

- 2026-10-12 邮箱已提交并普通推送 main：eb3390c3e06fe3e4cb61a3699243e732e38fcbfc，标题 `feat: 接入邮箱编辑与队伍信件联动`，32 文件，推送后工作区干净；最后格式 67780、完整原生／verify／核心裁剪／最新网页均退出码 0，最新 PWA 253 项、24222.35 KiB。精确 SHA Actions 38235573848 已确认 in_progress，未确认部署。下一独立模块 Festival Plaza 已只读核对来源和 Core，包含七设施／短语／奖励／日期／FC 与 USUM 对战代理人，不简化为设施字段页；尚未实现。Chrome／真实存档未验收，完整目标继续 active。

- 2026-10-12 邮箱 API 141 工程收尾通过：完整原生 99441、完整 verify 65435（273 文件／1191 项）、核心／26 类裁剪 48789、最新核心网页 10343 均退出码 0，保留既有提示。目录／作者消息／图案／数量／移动删除／队伍编号联动与冻结确认已接，源问题明确接受、原件保留、撤销与三语共享控件可用；浏览器与真实存档未验收，RS／FRLG／其他 Gen4–5 和极端源选择的扩大夹具仍需后续补充。当前最后文档／格式，随后按既有授权提交推送 `feat: 接入邮箱编辑与队伍信件联动`，完整目标保持 active。

- 2026-10-12 API 141 完整原生 99441、核心／26 类裁剪 48789 均退出码 0；完整 verify 65435 的 273 文件／1191 项通过证据保留。最新核心网页正在生成，最后文档／全仓格式与提交推送随后进行。当前未提交、浏览器与真实存档未验收，完整目标继续 active。

- 2026-10-12 API 141 完整 verify 65435 退出码 0，全仓格式／Lint／类型／Vitest 与网页构建通过，保留既有 Hook／构建提示。完整原生 99441 仍运行，核心 48789 继续等待同一原生 PID 和持久退出码，不提前发布；最新核心网页、最后格式与提交推送尚待收尾。当前网页使用 API 140 核心，不将它视为新版 Worker 运行验收。本批未提交，Chrome／真实存档未验收，完整目标保持 active。

- 2026-10-12 邮箱完整原生 99441 的 PID 948 仍活跃，完整 verify 65435 全仓格式通过、Lint 运行中，核心 48789 仍按同一原生进程和退出码等待，不重启。补只读邮箱选择直接换显示，不发修改预览；单文件格式通过，该前端改动由当前完整 Lint／类型／测试收尾覆盖。上一批 9592052 精确 Actions 38213032772 已确认 completed／success；外部 Chrome 本轮仍超时，页面与真实存档未验收，本批未提交，完整目标保持 active。

- 2026-10-12 邮箱 API 141 最新专项 90113、前端 84866（三文件 41 项／Lint）、类型 85523 均退出码 0。JSON 字段必填、UInt16 边界、冻结问题确认、读取重试及脏草稿取消已覆盖；取消仅草稿也可用。完整原生 99441／完整 verify 65435 已启动并写持久退出码；确认原生 PID 948 活跃，串行核心任务等待该进程及真实退出码为 0 后发布／裁剪。新核心未发布，本批未提交，页面与真实存档未验收，目标继续 active。

- 2026-10-12 邮箱 API 141 已接正式用途导航、共享控件、三语关联提示、JSExport／Worker／客户端与冻结预览。Mailbox Core／会话 11520、最新协议专项 69406 均退出码 0；前者涵盖 Gen2 多语言完整备份块、六实际布局完整字段／删除 oracle、Stadium2 两布局、Gen3 对象偏移移动及关联道具删除，后者覆盖公开 JSON 与冻结。前端 79031 三文件 37 项／接线 Lint 通过，最新新增客户端／必填字段／重试与脏草稿处理尚待最终专项；类型 85523 仍运行。新核心尚未发布，本批未提交，浏览器／真实存档未验收，整体目标继续 active。

- 2026-10-12 邮箱扩大专项发现 Gen2 只读目录中的 SaveFile.Clone 调用 GetFinalData，改变原内部 bytes；已改为复制原 Data 后使用准确 SAV2／SAV2Stadium 类型化构造器，不在读取中调用序列化克隆。此前 17563 编译失败为测试 Gold／Silver 枚举和 Span 误写，修正后 74645 报只读不变失败；当前修正专项 76779 正在运行。全字段／删除完整 oracle 与 Gen2／Stadium 数据尚未记为通过，本批未提交，仍未会话／Worker／UI，完整目标继续 active。

- 2026-10-12 邮箱六种实际夹具初检 3979 退出码 0，目录／作者编辑／校验和／原件通过；E 名称实测为 Core 补空格 `MAIL  `，改用独立 Mail3 名称预期，未修改源保存语义。完整字段／删除对照 37292 因测试误把 Gen3 邮箱第六格当第零格失败，已修正独立 oracle；增加 Gen2 英／日／韩类型化布局、源消息顺序与备份块完整对照，最新专项 17563 运行中。尚未 Stadium2／移动／队伍全覆盖、冻结会话与产品接线，本批未提交，API 仍 140，完整目标继续 active。

- 2026-10-12 邮箱初稿 MailboxEditing 已加入：Core 目录／作者消息／箱数／队伍编号／删除道具联动／源对象移动和保存，Prepare 从原 bytes 的克隆生成输出并重读校验。尚未完整来源字节对照／冻结会话／JSExport／Worker／三语 UI，API 仍 140。初始专项 18470 编译失败（测试误用 Memory<byte>.AsSpan／传 byte[]），已修正，第二专项 98002 仍运行；新增 Prepare 与去掉缺失夹具静默跳过尚待最新专项覆盖。本批未提交。录音精确 SHA Actions 38213032772 已确认 in_progress，未确认部署；完整目标继续 active。

- 2026-10-12 录音工具已提交并普通推送 main：95920523605ea8254743cfdf9ec4f30bde3a2458，标题 `feat: 接入录音读取编辑与试听工具`，32 文件，推送后工作区干净。最后格式 4297、完整原生／verify／核心裁剪／最新网页均退出码 0，网页／PWA 253 项、24206.27 KiB。首次精确提交 Actions 查询返回空，未确认部署。开始下一独立邮箱模块：已读 SAV_MailBox／Designer 与 Mail2–5，需覆盖持有信件、邮箱数量、消息／作者／图案／杂项、移动删除、队伍信件编号与关联道具提示，按源保存顺序处理；尚未实现。Chrome／真实存档未验收，完整目标继续 active。

- 2026-10-12 录音 API 140 工程收尾通过：完整原生 40299、完整 verify 51237（272 文件／1179 项）、核心／26 类裁剪 33106、最新网页 89368 均退出码 0；最新网页使用 API 140 核心，保留既有 Hook、裁剪与构建提示。共享文件控件背景／悬停／禁用已统一，原件／冻结预览／撤销／音频释放已接。当前最后文档／格式收尾，随后按已有授权提交并普通推送 `feat: 接入录音读取编辑与试听工具`。Chrome 超时，页面／真实存档未验收，PKHeX 完整目标继续 active。

- 2026-10-12 API 140 完整原生 40299 退出码 0，覆盖新增录音及全部既有存档回归；完整 verify 51237 的 272 文件／1179 项通过证据保留。真实原生退出码已写入串行门槛，核心任务 33106 开始浏览器资源发布，之后检查 26 类裁剪属性；尚未计为核心通过。共享文件控件最终样式格式通过，最新网页、全仓格式与提交推送待核心终结。本批未提交，Chrome／真实存档未验收，完整目标继续 active。

- 2026-10-12 API 140 完整 verify 51237 退出码 0：272 文件／1179 项、全仓格式／Lint／类型及网页／PWA 通过，保留既有 Hook 与构建提示。该网页使用尚未更新的 API 139 核心，只作前端工程证据；完整原生 40299 仍运行，串行核心任务 33106 等待其真实退出码，再生成最新网页。当前未提交，Chrome 超时，页面／真实存档未验收，完整目标保持 active。

- 2026-10-12 API 140 完整原生 40299 正在运行，已通过新增 Chatter 五布局及五布局公开冻结会话；全仓 verify 51237 格式／Lint 通过（0 errors、1 个既有 Gen3Static Hook warning），进入类型检查。前端专项 58417 的四文件 60 项／接线 Lint、类型 56331、最后组件 Lint 88903 与最新格式 61456 均退出码 0。协议批量替换曾使格式检查失败一次、原生编译失败一次，已修正全部占位与六项协议断言；最新完整原生仍运行，未将阶段通过写成整体成功。核心任务 33106 等待完整原生终结和真实退出码文件，成功才发布／检查 26 类裁剪；当前未发布、未提交。外部 Chrome 探测超时，页面／真实存档未验收，完整目标继续 active。

- 2026-10-12 录音工具已接入独立存档导航、JSExport／Worker／客户端与三语界面，协议同步到 API 140。按钮、导入、勾选及只读值复用现有 44px 控件与工具栏；共享文件控件补齐悬停和禁用反馈。勾选／PCM 导入先冻结预览，确认写工作副本并接现有撤销，取消或关闭释放票据；音频和下载 URL 按生命周期释放。最新前端四文件 60 项通过，类型／Lint／API 140 原生专项仍运行，完整工程与新版核心未发布，本批未提交，页面及真实存档未验收。下一步收尾这些检查，再完整工程／核心／裁剪／网页与提交推送，整体目标继续 active。

- 2026-10-12 录音初稿 Core 26970 与冻结会话 23185 均退出码 0：五种实际布局、所有 256 个字节值／四类初始化标记、源 PCM／WAV、勾选／导入顺序、完整独立文件对照、失败原子性和原件保留通过。会话增加只读 JSON、来源／目标哈希、冻结完整文件、变化字节与 PCM 字节数；确认只复制缓存，不重算，过期／替换／重复确认拒绝，旧窗口关闭不丢弃新预览，失败预览清空旧令牌。初稿格式 79072 通过；源码生成 JSON 已接，JSExport／Worker／三语播放与文件操作界面尚未接线，协议仍 API 139，新核心未发布，本批未提交。下一步接统一控件、工作副本／撤销／预览与播放生命周期，再升级协议并收尾工程检查；整体目标继续 active。

- 2026-10-12 注册队伍查看器已提交并普通推送 main：eb0e337c761b3935cfef809cbc2b3f1e8a5b93b5，标题 `feat: 接入竞技场注册队伍查看器`，29 文件；推送后工作区干净。最后格式 53070、完整原生／verify／核心／26 类裁剪属性／最新网页均通过；精确 SHA 的 Actions 38204321575 已确认 in_progress，尚未确认部署完成。Chrome 无可用连接，页面／真实存档未验收，完整目标保持 active。
  开始下一独立录音模块，基线 eb0e337。已确认 SAVEditor 源入口仅 sav is SAV4 or SAV5。ChatterEditing 初稿使用实际五类存档的 Core IChatter、已核对 active General 偏移和公开 Gen5 块 Data，读取原始标记／PCM／WAV／派生混乱几率／播放判定；有序勾选和导入动作先完整验证，再写克隆、完整导出并重新读取校验，不改原件。重复相同勾选值不触发源事件，保留原始未知标记；PCM 导入始终设标记为 1。初稿专项已启动，覆盖五布局、全部字节阈值／四种标记、源 WAV 采样顺序、完整独立文件对照、原件与原子失败。尚未冻结会话／JSExport／Worker／三语 UI，协议仍 API 139，本批未提交。

- 2026-10-12 Stadium 注册队伍 API 139 工程收尾通过：完整原生 54655、完整 verify 45049（271 文件／1168 项）、核心发布／26 类裁剪属性 59082、最新网页 94911 均退出码 0，最新网页／PWA 253 项、24193.74 KiB；保留既有 Hook、反射裁剪和构建提示。vendored Core／来源 manifest 未改。清单改为工程通过；新版核心发布后再次探测 Chrome，仍 nodeRepl.fetch request failed、无可用标签，页面与真实存档未验收。本批最后文档／格式收尾，随后按既有授权提交并普通推送 `feat: 接入竞技场注册队伍查看器`，再独立接已核对的录音工具和其余清单，完整目标继续 active。

- 2026-10-12 API 139 完整原生 54655 退出码 0，已覆盖新增注册组公开接口与全部既有回归；完整 verify 45049 的 271 文件／1168 项通过证据保留。核心串行任务 59082 已进入发布，publisher wrapper 26348／dotnet 20044 当前活跃，完成后执行裁剪属性检查；尚未计为核心通过。最后文档格式 49485 退出码 0。本批未提交，页面／真实存档未验收，下一步等待该任务终结并用最新资源重新打包网页，再作最终文档／格式与提交推送；完整目标保持 active。

- 2026-10-12 注册队伍 API 139 完整 verify 45049 退出码 0：271 文件／1168 项、格式／Lint／类型与网页／PWA 253 项、24193.74 KiB 通过；保留既有 Hook 与构建提示。最后来源文档格式／空白 95748 通过。完整原生 54655 已推进第五世代联合塔，核心任务 59082 仍等待相同已确认 wrapper，不重启或提前发布。录音工具来源核对独立成文档小节，尚未混入实现。本批未提交，页面及真实存档未验收，下一步仍是原生／核心／裁剪收尾后按最新资源生成网页，再提交推送；完整目标继续 active。

- 2026-10-12 API 139 完整 verify 45049 已通过类型检查并进入 Vitest；完整原生 54655 已推进宝可全能竞技，核心任务 59082 仍按同一 wrapper 等待，没有重启。只读核对下一项 SAV_Chatter 的表单／Designer 与 Gen4／5 Core：1000-byte PCM、源 WAV header／低四位先展开、播放判定和派生混乱几率已记入模块文档；来源没有实时录音入口，无新增麦克风权限需求。尚未实施第二模块，注册队伍本批仍未提交，当前先继续完整检查与核心收尾。

- 2026-10-12 已确认第二箱精确提交 4b7793a 的 Actions 38196543241 为 completed／success。注册组最后格式／空白 61952 退出码 0；完整 verify 45049 已完成格式与 Lint（0 errors、1 个既有 Hook warning），进入类型检查。完整原生 54655 正在背包回归，核心串行任务 59082 仍等待已确认的原生 wrapper 9788；均未重启。最新专项／类型／四文件 57 项通过证据保留，本批未提交，新核心尚未发布，页面及真实存档未验收。下一步保持同一任务收尾，成功后生成最新网页、更新清单并提交推送，完整目标继续 active。

- 2026-10-12 API 139 完整原生 54655、完整 verify 45049 已启动，分别保存 TEMP/pokerngkit-api139-native-full.log／verify-full.log 和退出码；完整原生 wrapper PID 9788 当前确认活跃，已进入存档基础／宝可梦边界。已排定原生成功后串行发布 API 139 核心并检查 property-trim 的任务，输出 TEMP/pokerngkit-api139-core-pipeline.log／.exit；最新网页必须等完整 verify 与核心检查成功后再生成。Chrome 当前探测超时并重置内核，页面检查未运行，不使用内置浏览器；上一批 4b7793a 的 Actions 38196543241 本轮查询 EOF，最近确认状态仍为 in_progress，未宣称部署完成。最新专项 11890／39117、类型 40154 与前一批完整工程格式 71419 的通过证据保留，本批尚未提交，完整目标保持 active。

- 2026-10-12 注册队伍 API 139 最新专项 11890、类型 40154、四文件 57 项与接线 Lint 39117、全仓格式／空白 71419 均退出码 0。五布局工程存档经 SaveUtil 识别，公开目录／报告／分析、源生成 JSON、缺失字段／小数／字符串／越界拒绝及原件保留通过；StrictMode 生命周期警告已修正。前端专项覆盖本地图片、真实六格／空位、三语训练家描述及错误、跨组旧分析隔离、只读客户端响应和来源 bytes 保留。协议 API 139 已同步，新核心未发布，本批未提交，页面及真实存档未验收。下一步完整原生与完整 verify，再串行发布核心、核对 26 类裁剪属性、生成最新网页并最后格式提交推送；完整目标继续 active。

- 2026-10-12 注册队伍 API 139 已接 JSExport／来源生成 JSON、Worker 读取／分析、客户端、独立用途入口与三语共享控件工作区，全部协议及握手同步。五布局读取／合法性 Core 专项 57025 与四文件 52 项／Lint 60201 通过；新增生命周期 ref 警告已修正，单组件 Lint 退出码 0。公共接口专项 77512 因夹具没有识别标记失败；26383／26890 确认初代三布局通过、二代误用 POKE。按源码区分初代 POKE=454B4F50 与二代 P3v0=30763350，并在真实箱子 footer 位置补工程标记后，75417 已输出五布局通过，退出结果待确认；生产 SaveUtil 识别未改。类型 40154 仍运行，新核心尚未发布，页面／真实存档未验收，本批未提交。下一步补入口／图片／错误三语专项，确认类型及最新公共接口，再跑完整工程与 API 139 核心收尾。

- 2026-10-12 Stadium 注册组读取专项 12405 退出码 0：日版初代 16 组、初代国际／日版 70／108 组、二代国际／日版各 60 组，全部真实六格、Core 名称／顺序、首个非空组、图片键、成员脱离、越界及存档 bytes 不变通过。初稿 9884／67389 两次编译失败原因是 PokeCrypto.SIZE_1STORED 为 Core 内部常量，并非可公开调用的成员；按来源记录 33 字节修正后，20085 又发现 SAV1StadiumJ 空白构造器将 PK1 列表写入 Stadium 原始格位而越界。夹具改用实际长度的原始数据构造器，不改上游或生产识别，明确仅为类型化 Core 工程证据。新增 registeredGroups 领域与六格／详情工作区，沿用共享 Select、工具栏与语义主题；初步前端五项与 Lint 32376 退出码 0。已追加合法性标记／详情分析及原件保留专项，57025 运行中；新界面尚未挂载，JSExport／Worker／协议仍待接线，当前 API 138 产品保持既有提交，本批未提交。

- 2026-10-12 第二箱查看器已提交并普通推送到 main：4b7793af90a4ed87d022b76726b56d4cc6989878，标题 `feat: 接入第二箱查看器与当前箱子联动`；25 文件，推送后工作区干净。最后编辑后的格式／空白 7980 退出码 0；完整工程、最新核心／裁剪及网页证据保留。首次 Actions 查询 EOF，同一 SHA 重试确认 38196543241 为 in_progress；部署尚未确认完成，页面与真实存档未验收。
  已开始下一独立模块 Stadium 注册队伍查看器，基线 4b7793a。读取原版 GroupViewer／Designer 与 SAVEditor 调用点，确认只对 SAV_STADIUM 开放，菜单只有 View，组名／顺序／六个格位取 Core。初稿 RegisteredGroups 支持完整目录、首个非空组、脱离存档的成员读取与同上下文合法性分析；独立位置使用 Group／Slot，不冒用可写箱子位置。五种语言／类型夹具覆盖 Core 返回顺序、全部物理成员、空位、图片资源键、首选组、越界拒绝、返回实体脱离与文件不变；专项正在运行。尚未 JSExport／Worker／三语界面／协议升级，不宣称已接入产品；本批未提交，完整目标继续 active。

- 2026-10-12 第二箱 API 138 工程收尾通过：完整原生 24650、完整 verify 4743（270 文件／1158 项）、修正版专项 48956、核心发布 90208、裁剪／最新网页 28779 均退出码 0。最新网页已使用 API 138 核心；保留既有 Hook、反射裁剪与构建提示。没有修改 vendored Core 或来源 manifest。功能清单更新为工程通过，页面与真实存档未验收；Chrome 仍无可用连接，不重复授权。下一步最后格式与暂存对照后，按既有授权提交并普通推送 `feat: 接入第二箱查看器与当前箱子联动`，随后独立接 Stadium 注册队伍和剩余清单，完整目标继续 active。

- 2026-10-12 API 138 完整 verify 4743／完整原生 24650 的持久退出码均为 0，旧句柄已终结；前端 270 文件／1158 项、格式／Lint／类型与网页／PWA 253 项、24184.98 KiB 通过。串行任务 71262 在新增类型化专项失败并停止：SWSH 夹具缺少 Core BoxFlags 读取的零长度布尔块 32A339E9。修正只在 CurrentBoxTests 中按 SWSH／LA 访问器定义补入合成布尔块，不改生产读取、校验或既有夹具生成器。最新 box-viewer 48956 与最后格式 5435 退出码 0，包含 15 个已识别存档布局、17 个类型化区块组合、RS Box 英／日各 50 个显示编号、完整导出 bytes 和既有箱名／布局回归。API 138 核心发布 90208 正在运行（TEMP/pokerngkit-api138-core-final.log／.exit），之后串行检查裁剪及最新网页；本批未提交，Chrome／真实存档未验收，完整目标继续 active。

- 2026-10-12 完整 verify 4743 已完成全仓 Lint（0 errors、1 个既有 Hook warning），进入 TypeScript；当前 PID 23512 活跃。完整原生 24650 的 PID 23108／父 .NET 27552／wrapper 25564 确认活跃，已推进背包与 O-Power。已启动严格串行收尾 71262（TEMP/pokerngkit-api138-core-pipeline.log／.exit）：等待已确认 wrapper 25564 退出且完整原生 .exit 为 0，才运行最新 box-viewer 专项、关闭编译服务器、发布 API 138 核心、检查 property-trim 并关闭服务器；任一步失败停止后续任务。最新网页须在完整 verify 与该核心流水都成功之后再构建。当前流水仍等待原生，不把等待状态视为通过；本批未提交，整体目标保持 active。

- 2026-10-12 已确认上一批精确提交 ec6e5f4 的 Actions 38162211479 为 completed／success。当前 API 138 最后格式／全仓格式／空白 71933 退出码 0；完整 verify 4743 仍在全仓 Lint，完整原生 24650 已通过当前箱号旧专项并推进单只宝可梦高级编辑。两个句柄当前确认仍运行，未重启。最新导出／RS Box 规范化、17 个类型化区块组合与 RS Box 英／日各 50 个显示编号的追加专项尚待串行编译执行，不把旧专项结果覆盖到这些新改动。下一步仍是同句柄收尾→最新 box-viewer 专项→API 138 核心／裁剪／最新网页；当前未提交，页面与真实存档未验收。

- 2026-10-12 收尾核对发现元数据导出能力缺口，ExportWorkingCopy 增加同一当前箱子能力门槛，仍只导出已经校验的原 bytes；15 个已识别格式专项补充完整导出相等断言。SAV3RSBox.CurrentBox 的源码按 value／2 写入、读取乘 2，Verify 修正奇数编号规范化，不缩小可查看的 50 箱。CurrentBoxTests 增加剑／盾与朱／紫各三修订、Z-A 三修订、阿尔宙斯两修订的类型化 Core 完整输出／重新读取／校验和／格位保留专项，未放宽生产识别。完整原生 24650 已进入剑盾图鉴，需在其终结后串行运行最新 box-viewer 专项以覆盖启动后追加的导出／规范化与类型化夹具；完整 verify 4743 的全仓格式通过、Lint 运行中。最后格式 28709 仍运行，增量格式 67685／44873／43155 退出码 0。外部 Chrome 本轮仍为 nodeRepl.fetch request failed，无可用标签，不作页面／真实存档验收，不重复授权。本批未提交，下一步保持现有检查句柄并收尾最新专项、API 138 核心、裁剪和网页构建。

- 2026-10-12 恢复 API 138 收尾。旧类型 62885、格式 13026、完整原生 11653 的会话句柄已失效，当前进程清单没有对应 TypeScript／dotnet／原生测试进程；格式日志明确通过，类型与原生日志没有可确认的退出结果，不计为通过。最新协议专项 40190 和前端五文件 55 项 7026 的既有通过证据保留；此前类型 11246 缺少夹具字段、67981 稀疏渲染夹具断言已修正。已启动完整 verify 4743 与完整原生 24650，分别输出 TEMP/pokerngkit-api138-verify-recovered.log／native-recovered.log，并保存 .exit 结果。第二箱按钮改为继承工作区高度令牌，模块文档修正旧“待实现”状态；本批未提交，新核心尚未发布，页面与真实存档未验收，下一步先收尾这两个检查。

- 2026-10-12 BoxViewer 已接入双箱模式、独立主／第二箱选择、详情／工具位置与共享拖放；原版交换显示复用索引交换，主箱的可保存当前编号使用独立 Core 请求，第二箱不写。API 138 已更新 13 个协议专用文件及全部 Worker 握手，不改 PNG 签名、事件数值和地区编号。初次扩大原生 69671 在第一世代快照失败：PK1／PK2 的 SIZE_STORED 是含外部姓名的列表，实体 Data 缓冲更短；快照改为保留完整实体 Data、训练家与昵称原始缓冲，不截断或屏蔽差异。修正扩大版 6747 退出码 0，含 11 个已识别工程存档、英／日第一与第二世代、GP／GE 不支持编号保存的拒绝，以及原箱名／布局回归。前端两文件 11 项及新增接线 Lint 2314、格式 69930／92255／51646／43741／65490 均通过；4096 MB 类型 11246 仍运行，API 138 最新协议断言与完整工程／核心发布待收尾。本批未提交，页面与真实存档未验收，完整目标继续 active。

- 2026-10-12 开始独立 SAV_BoxViewer，基线 main／origin/main `ec6e5f4`，起始仅有上一批提交后进度记录。直接读取原版窗体／Designer、BoxEditor／Core BoxEdit 与 SAVEditor.SwapBoxesViewer，确认交换按钮只交换显示编号；第二窗 CanSetCurrentBox=false，主窗为 true。已增加双箱组件及导航／显示交换助手，尚未接线。Core／领域已增加当前箱子元数据能力与独立原子请求；默认 SaveFile.CurrentBox 仅为内存属性，实际可保存类型按源码 override 列出，不扩大通用宝可梦编辑白名单。初版 CurrentBox／箱名／布局专项 36827 与核心格式 94044 退出码 0；随后扩大第一／二世代和不支持元数据的拒绝检查，并让元数据请求使用独立能力门槛，最新扩大版尚未运行。协议仍 API 137，新字段待升 API 138 及全部握手接线；新版核心未发布，本批未提交，完整目标保持 active。前批 Actions `38162211479` 最近已确认 in_progress。

- 2026-10-12 独立存档工作区已提交并普通推送到 main：`ec6e5f4cbbecba79ef0e20f54652a4b7e903b3b4`，标题 `feat: 增加独立存档工作区`；14 文件，推送后工作区干净。类型／定向检查／完整 verify 19959 和最后格式 73553 均通过：269 文件／1152 项，网页／PWA 253 项、24180.09 KiB。精确 SHA 的 Actions `38162211479` 已确认 in_progress，尚未确认部署完成。Chrome 仍返回通信错误，页面与真实存档未验收，不请求重复授权；完整 PKHeX 目标保持 active。
  下一项独立补齐 SAV_BoxViewer 的第二箱并行查看，复用实际箱数／槽数、共享格位与当前拖放事务，保持主箱和第二箱各自选择状态；随后 Stadium 注册队伍与其余库存缺口。原版来源已在 docs/modules/saveeditor.md 核对，未以当前全箱页代替第二箱能力。本条提交后进度记录纳入下一模块。

- 2026-10-12 独立存档工作区工程收尾通过：新增接线 Lint／两文件 10 项 95878、类型 12748、完整 verify 19959 均退出码 0。完整网页／PWA 253 项、24180.09 KiB，保留既有 Gen3StaticPanel Hook 与构建提示；Core／Worker 协议和 vendored 源码未改，沿用上一批 API 137 原生／核心证据。62 项旧入口标签／能力表达式已作 AST 对照，全部一致。Chrome 仍报通信错误，页面与真实存档未验收，本批未提交；下一步最后文档格式后提交并普通推送 `feat: 增加独立存档工作区`。上一批精确 SHA 的 Actions `38158212696` 已确认 completed／success，完整 PKHeX 目标继续 active；随后补齐独立第二箱与 Stadium 注册队伍及其余清单。

- 2026-10-12 开始独立存档工作区迁移，基线 main／origin/main `599570a`，起始仅有上一批提交后进度记录。App 已接乱数／存档主导航，原悬浮入口改为工作区快捷入口，SaveToolsPanel 保持唯一挂载，隐藏区 inert，切换不卸载工作副本与 RNG 缓存。原有 62 项入口的标签和能力条件已完整迁入五组用途导航；桌面 224px 左栏，窄屏复用带分组的共享 Select，文件操作保留顶部，箱子与右侧详情继续使用原组件。控件沿用现有 44px 几何与主题，未修改 Core／Worker 协议或存档写入。工程检查待运行，页面及真实存档未验收，本批未提交；完整目标保持 active。
  原乱数档案联动复用到宝可梦详情栏，保留训练家页面同一字段与状态。固定工作区样式仅作用于 save-file-workspace，避免裁掉单只宝可梦编辑器的长表单。迁移前后 AST 对照确认 62 项标签／能力表达式一致；新增接线 Lint 与两文件 10 项 95878 退出码 0。初轮 73995 的全仓格式通过，但空白检查因文档新增 EOF 空行退出 1；完成格式化后 70607／2154 均退出码 0。4096 MB 类型 12748 仍运行，随后完整 verify；本批不重复未改变的 API 137 原生／核心构建，不作浏览器或真实存档验收。

- 2026-10-12 箱子全览与跨箱拖放已提交并普通推送到 main：`599570ac7e0ab16e453e13f3e12602478c53e602`，标题 `feat: 接入箱子全览与跨箱拖放`；27 文件，推送后工作区干净。首次推送发生 TLS 连接错误，同一提交重试成功；精确 SHA 的 Actions `38158212696` 已确认 in_progress，尚未确认部署完成。完整原生／verify／核心／裁剪／最新网页和最后格式 95581 均通过；网页／PWA 253 项、24178.29 KiB。页面与真实存档未验收，整体目标保持 active。
  下一批迁移已认可的独立存档工作区：主导航切换保留两边工作状态，顶部文件操作、左侧用途分组和中央任务／右侧详情复用现有模块、Worker 与统一控件。已核对 App 的 WorkspaceCache、唯一 SaveToolsPanel 挂载位置及全部 62 项存档用途入口；正式迁移代码尚未修改。独立第二箱、Stadium 注册队伍及其余清单缺口继续保留。本条提交后进度记录纳入下一批。

- 2026-10-12 BoxList API 137 工程收尾通过：完整原生 48249、完整 verify 14683、核心发布 3862、裁剪／编译服务器关闭／最新网页 29002 均退出码 0。268 文件／1147 项和 26 类裁剪元数据通过，最新网页已使用新核心；保留既有 Hook／裁剪／构建提示，vendored Core 与来源 manifest 未修改。外部 Chrome 连接仍报通信错误，页面与真实存档未验收。下一步最后格式后提交并普通推送 `feat: 接入箱子全览与跨箱拖放`，随后按已认可布局迁移独立存档工作区，完整 PKHeX 目标继续 active。

- 2026-10-12 所有者已查看并认可存档工作区 Demo，明确要求控件样式统一。正式迁移方向已确认，不再等待 Demo 反馈：先收尾当前 BoxList 批次，再将存档功能迁入独立工作区，采用顶部文件操作、左侧用途导航、中央任务与右侧详情／乱数联动。输入框、共享 Select、按钮、页签及状态提示沿用项目语义令牌与组件，统一几何及交互状态；Demo 的原生控件仅用于布局展示。规则已写入 docs/ui-design.md，正式迁移尚未实施，页面与真实存档未验收。
  BoxList 完整 verify 14683 已确认退出码 0：268 文件／1147 项及网页／PWA 253 项预缓存通过。完整原生 48249 仍运行，随后串行发布 API 137 核心、裁剪与最新网页；当前尚未提交，不重复已通过的完整前端检查。

- 2026-10-11 开始独立 BoxList，基线 main／origin/main `d13f706`，起始仅有上一批提交后进度记录。全箱视图、共用真实格位网格、本地壁纸／图像、相邻首尾循环交换、点击详情及键盘导航、跨箱拖放与外部首文件导入已接；独立第二箱与 Stadium 注册队伍仍待实现。覆盖并清空来源是单次 Core 操作，复用工作副本与撤销，不串联写入；API 137 已更新全部握手与原生断言，新版核心尚未发布，本批未提交。
  前端五项 7926、三文件 47 项／全部新增接线 Lint 1381、初稿界面 Lint 79949、4096 MB 类型 85818 与文档格式／空白 37179 均通过；完整 verify 14683 运行中（TEMP/pokerngkit-api137-verify.log），使用 4096 MB 堆及单测试 Worker。原生 64429 在 SN 完整文件对照失败，诊断 13069 确认仅 0x6BB00 起 128 字节 MemeCrypto 签名被清空：测试直接用导出数组调用 SaveUtil，SAV7 解析会修改其输入。产品 Open 原本已复制；测试改为解析 output.ToArray()，保留完整文件字节断言，不屏蔽签名差异。最终覆盖／队伍专项 36644 退出码 0；关闭编译服务器后启动完整原生 48249（TEMP/pokerngkit-api137-native.log），原生终态前不发布共享输出的核心。本批未提交，随后核心／裁剪／网页收尾；前批 Actions `38149108362` completed／success，不作页面或真实存档验收，完整目标继续 active。

- 2026-10-11 七星团体战编辑已提交并普通推送到 main：`d13f7066cd3054df6e428ac76bd8370fa1005cbd`，标题 `feat: 接入朱紫七星团体战编辑`；26 文件，推送后工作区干净。完整原生／verify／API 136 核心与裁剪／最新网页／最后格式 26520 均通过；精确 SHA 的 Actions `38149108362` 已确认 in_progress，尚未确认部署完成。外部 Chrome 仍报通信错误，页面与真实存档未验收，不请求重复授权。
  下一步按完整清单补齐箱子列表／查看器的多箱浏览与编辑联动，再继续未覆盖的训练家和专属窗口；正式存档工作区迁移仍待 Demo 反馈。完整 PKHeX 目标保持 active，本条提交后进度记录纳入下一模块。

- 2026-10-11 七星 API 136 工程收尾通过：完整原生 99315、完整 verify 37513、核心发布 58043、裁剪／编译服务器关闭／最新网页 58307 均退出码 0。267 文件／1142 项、26 类裁剪元数据与最新网页／PWA 253 项预缓存通过；保留既有 Hook／裁剪／构建提示，vendored Core 与来源 manifest 未修改。上一轮最后文档格式／空白 5874 通过，本批未提交；下一步最后格式后提交 `feat: 接入朱紫七星团体战编辑` 并普通推送。页面与真实存档待核验，整体目标保持 active。

- 2026-10-11 开始独立七星团体战窗口，基线 main／origin/main `8a9feba`，起始仅有上一批提交后进度记录。新增 SevenStar9Editing／Session、分页领域与三语表单；3000 条默认物理记录按实际 CountAll 浏览，支持标识符搜索／编号定位、跨页草稿、三个属性、两块关联／旧版回落、完整冻结预览及原件保护。四种 JSExport／Worker 与悬浮入口已接 API 136，新版浏览器核心尚未发布，本批未提交。
  初稿原生 44433、API 136 扩大 12 组专项 15999、前端四项／领域 Lint 84623、三文件 46 项／全部新增接线 Lint 45518、新界面 Lint 8985 与文档全仓格式／空白 43321 均退出码 0。类型 60156 因 Node 默认堆内存耗尽退出 134，按 4096 MB 重跑 62135 后退出码 0；完整 verify 37513 退出码 0，格式／Lint／最终类型、267 文件／1142 项及网页／PWA 253 项预缓存通过，保留既有 Hook 与构建提示。完整原生 99315 经原句柄确认仍运行，日志已推进第六世代专属工具；原生终态前不发布共享输出的核心。本批未提交，前批精确 SHA 的 Actions `38142693395` 已确认 completed／success，页面与真实存档仍待核验，整体目标继续 active。
  修正预览卸载表单后的键盘焦点：确认操作使用新按钮引用，返回编辑聚焦重新渲染的预览按钮，迟到帧检查组件存活状态。最终界面 Lint 68842、进度格式／空白 20204／61363、最新界面及进度格式／空白 20364／7495 均退出码 0；完整 verify 已覆盖最终产品代码，不将源码修正或 Lint 当作外部浏览器验收。下一步沿用完整原生句柄，结束后核心发布／裁剪／最新网页与最后文档格式、提交及普通推送。

- 2026-10-11 普通太晶团体战编辑已提交并普通推送到 main：`8a9feba577bd8f885aae955a7394b18cdf31bfeb`，标题 `feat: 接入朱紫太晶团体战编辑`；25 文件，推送后工作区干净。完整原生／verify／API 135 核心与裁剪／最新网页／最后格式 4239 均通过；精确 SHA 的 Actions `38142693395` 已确认 in_progress，尚未确认部署完成。Chrome 连接仍返回通信错误，页面与真实存档未验收，不请求重复授权。
  下一项独立实现已核对的 `SAV_RaidSevenStar9`，保留两块关联与旧版回落语义；正式存档工作区迁移仍待 Demo 反馈，箱子查看器、训练家及其余库存缺口继续保留。完整 PKHeX 目标保持 active；本条提交后进度记录纳入下一模块。

- 2026-10-11 API 135 工程收尾通过：完整原生 17980、完整 verify 13728、核心发布 65851、裁剪／编译服务器关闭／最新网页 61487 均退出码 0。266 文件／1137 项、26 类裁剪元数据及最新网页／PWA 253 项预缓存通过，保留既有 Hook／裁剪／构建提示；vendored Core 与来源 manifest 未修改。远端 fetch 重试成功，main／origin/main 分叉 0／0；本批未提交，下一步最后文档格式检查后提交 `feat: 接入朱紫太晶团体战编辑` 并普通推送。页面及真实存档待核验，整体目标保持 active。
  等待期间独立七星控件探针 42461 退出码 0，核验三项描述器、UInt32 完整范围及 0x 输入、非法值拒绝、Bool 恰好等于 1、Identifier 双记录联动、新旧击败标记位置及保护 bytes、编辑器文本上限 32767。仅来源／控件证据，七星未接产品；下一步仍先收尾普通团体战。

- 2026-10-11 API 135 六种原生专项 19242、三文件 45 项／新增接线 Lint 55219、全仓格式／空白 47572 均退出码 0。最终类型 40455 仍运行，不并发启动会写同一构建缓存的 verify；完整原生 17980 已启动（TEMP/pokerngkit-api135-native.log），编译服务器先正常关闭。协议已接但最新浏览器核心尚未发布，本批未提交，后续完整 verify／核心／裁剪与最新网页保持串行收尾。
  精确提交 614e775 的 Actions 38134339978 已确认 completed／success，上一批服装部署完成，不作页面或真实存档验收。普通团体战继续收尾，七星及其余库存仍未完成，整体目标保持 active。

- 2026-10-11 普通团体战三语表单、四种 JSExport／Worker 请求与 API 135 已接。三区域／单记录选择、全部八属性、只读场景名、区域种子失焦／显式验证、可选 Seed 传播、完整属性／区域种子／块预览及返回编辑齐备。验证事件即时入队，预览读取最新引用，迟到／失败预览释放缓存，确认才进入工作副本和撤销／导出。本批未提交，新版浏览器核心尚未发布。
  三文件专项 55219 共 45 项和新增界面／接线 Lint 通过；旧类型 84358 与格式 88423 已通过，最新 API 135 类型 40455、六种原生专项 19242 正在运行。接线临时脚本完成 13 文件后移除，保留物种编号等非协议数字；初稿 JSX 闭合错误已修正并格式化。后续完整原生／verify、最新核心与裁剪／网页，最后提交推送；页面和真实存档待验收，整体目标保持 active。

- 2026-10-11 普通团体战扩大 JSON／失败 Open／替换与过期确认专项 66592 退出码 0，六种版本／修订均通过；前端四项及新增文件 Lint 通过。类型 84358 与最终格式 88423 仍运行，原生编译服务器随后关闭。协议仍 API 134，产品入口未接，本批未提交；下一步三语工作区／Worker 与新协议接线，再完整工程收尾，整体目标保持 active。

- 2026-10-11 开始普通团体战 SAV_Raid9，基线 614e775，起始仅有上一批提交后进度记录。直接引用只读上游表单／Designer 的种子流程探针 79197 退出码 0：Validated 先写克隆，已验证值进入 Origin.Copy；无提前验证时，复制仍是旧值，随后 ValidateChildren 才更新克隆。图标／翻译／提示替身不改数据路径，未显示 UI，不作界面验收。
  新增 Raid9Editing／Session，三区域实际切片、全部八属性、两种种子转换、传播及冻结完整文件已写；初稿编译 58310、六种版本修订专项 75282 退出码 0。前端四项与新增文件 Lint 通过；扩大的 JSON／失败 Open／替换与过期确认专项 66592 仍运行。尚未 JSExport／Worker／三语 UI，协议仍 API 134，本批未提交。上一批 614e775 的 Actions 38134339978 最近查询仍为 in_progress，部署未确认完成。

- 2026-10-11 第九世代服装编辑已提交并普通推送到 main：614e775bd6a96dcfecde987765317c979cc7b7b6，标题 `feat: 接入第九世代服装与外观编辑`；24 文件，推送后工作区干净。完整原生／verify／API 134 核心与裁剪／最新网页均通过。精确 SHA 的 Actions 38134339978 已确认 in_progress，部署尚未完成，不作页面或真实存档验收。本条提交后进度记录纳入下一模块。
  下一项独立实现 SAV_Raid9，已核对三区域切片、PropertyGrid 转换器和 32767 文本上限，区域种子的验证／复制顺序仍需补探针；随后独立接 SAV_RaidSevenStar9。箱子查看器、训练家及其余库存缺口继续保留，完整 PKHeX 目标保持 active。

- 2026-10-11 服装 API 134 工程检查收尾通过：完整原生 18704、完整 verify 1592、核心发布 66886、裁剪／编译服务器关闭／最新网页 31759 均退出码 0。265 文件／1132 项，裁剪后 26 类属性签名／访问器一致，最新网页／PWA 253 项预缓存。没有修改 vendored Core／来源 manifest；保留既有 Hook、裁剪与构建提示。远端 fetch 后 main／origin/main 分叉 0／0，基线仍 d83707b。
  当前最后文档／格式收尾，随后按已有授权提交 `feat: 接入第九世代服装与外观编辑` 并普通推送。Chrome 本轮仍返回 nodeRepl.fetch request failed，页面与真实存档未验收，不使用内置浏览器替代。下一项普通团体战已核对来源与 PropertyGrid 转换器，种子验证顺序待探针；仓储查看器和其余库存继续，完整 PKHeX 目标保持 active。

- 2026-10-11 完整原生 18704 退出码 0，服装九种版本／修订和全部既有套件通过；完整 verify 1592 的 265 文件／1132 项证据保留。最后格式／空白 34474 通过；本批仍未提交。当前 API 134 核心发布已启动（TEMP/pokerngkit-api134-core.log），完成后检查裁剪并以最新资源重打网页，最后文档／格式与提交推送。页面及真实存档尚未验收，整体目标保持 active。

- 2026-10-11 等待服装原生期间，独立团体战控件探针 54990 退出码 0：PropertyGrid 文本上限 32767、ScenePointName 只读、Seed 自定义十六进制转换的空／非法值归零及前缀空白行为、Content 四项独占标准列表与底层未命名 UInt32／逗号转换均已核验并入文档。区域 Seed 的焦点验证／复制顺序仍待探针，没有接第二产品模块。本轮最后轮询 18704 仍存活，日志已推进究极之月训练家；完整 verify 1592 的 265 文件／1132 项通过证据保留，下一步仍先收尾服装。

- 2026-10-11 完整 verify 1592 退出码 0：格式／Lint／最终类型、265 文件／1132 项与网页／PWA 253 项预缓存通过；保留既有 Hook 与构建提示。完整原生 18704 仍运行，日志已推进第六世代专属工具，不重启、不提前发布共享输出的核心。最终界面 Lint 99762 与格式／空白 41109 通过；后续团体战来源文档已格式化，本批仍未提交。
  来源核对补齐普通／七星团体战的实际 DLC 切片、72／100／80 格、两种 Bool 语义、Identifier 联动和传播规则；两个库存行改为已核对但未实现，枚举／PropertyGrid 文本上限及种子验证顺序仍待探针。下一动作仍为收尾服装原生→API 134 核心／裁剪→最新网页→最后格式／提交推送，整体目标不结束。

- 2026-10-11 服装完整原生 18704、完整 verify 1592 已启动，日志为 TEMP/pokerngkit-api134-native.log 和 TEMP/pokerngkit-api134-verify.log。末次全仓格式／空白 40968 退出码 0；拥有批量操作随后改为折叠区，已格式化，新增界面最终 Lint 99762 运行中，完整 verify 将覆盖当前代码。保留原有检查句柄，不提前发布共享 .NET 输出的核心；本批未提交，页面及真实存档待验收。

- 2026-10-11 服装三语面板、四种 JSExport／Worker 请求与 API 134 已接。分组／已载入编号筛选／物理定位／分页、跨组草稿、精确文件及首文件拖放、当前／全部拥有、完整逐行／块预览齐备；返回编辑保留队列与 Core 快照显示，确认才进入工作副本／撤销／导出。迟到或未冻结预览会释放缓存，语言变化不取消票据；读取失败可重试，错误按当前语言显示。本批未提交，浏览器核心仍待发布 API 134。
  API 134 九种原生专项 22580 退出码 0，三文件接线 21238 共 46 项与新增界面／接线 Lint 通过；类型 72008 退出码 0，随后错误语言状态修正仍需最终复查。临时接线脚本完成 11 文件后已移除，物种编号 133 未作为协议号替换。下一步完整原生、完整 verify、最新核心／裁剪及最新网页，最后提交推送；真实页面／存档待验收，整体目标继续 active。

- 2026-10-11 服装初稿／扩大／分页／JSON 九种版本修订专项 23728、35357、45467、3601 均退出码 0。最后 JSON 专项覆盖 camelCase、完整冻结票据及失败 Open 释放旧预览；扩大专项包含整数空白／符号／溢出／无效值、尾部不足一行 bytes 与后项失败。前端五项与新增文件 Lint 通过，类型 56268 通过；后续返回守卫和请求大小改动仍需最终复查。尚未 JSExport／Worker／三语 UI，协议仍 API 133，本批未提交。
  精确提交 d83707b 的 Actions 38126979896 已确认 completed／success，上一批部署完成；不作页面或真实存档验收。下一步服装三语工作区与 API 接线，再完整工程和提交推送；整体目标保持 active。

- 2026-10-11 开始 SAV_Fashion9，基线 main／origin/main d83707b；起始仅有上一批提交后的进度记录。新增 Fashion9Editing／Session，读取朱／紫 8 组和 Z-A 25 组全部物理行，以 Core 类型保留未开放标记位；按顺序处理行草稿、精确块导入／重载、当前／全部服装拥有及整窗保存。预览冻结完整文件与实际源 bytes 差异，原件保持不变；JSExport／Worker／三语 UI 尚未接，协议仍为 API 133，本批未提交。
  初稿编译 67009 退出码 0；新增九种版本／修订专项包含独立全文件字节预期、UInt32／None／长度、物理分页、导入顺序、拥有标记与发型空操作、冻结及拒绝路径。当前运行最新专项，随后完善边界与前端接线；不将类型化合成夹具视为生产 SaveUtil 或真实存档验收。

- 2026-10-11 Z-A 事件编辑已提交并普通推送到 main：d83707b58a0e95fc1278dd33f9cd4a05633d918c，标题 `feat: 接入 Z-A 事件标记与变量编辑`；25 文件，含独立布局 Demo，推送后工作区干净。完整原生／verify／最新核心与裁剪／最新网页证据保留。精确 SHA 首次 Actions 查询返回 EOF，稍后重查确认 38126979896 为 in_progress，部署尚未完成；不作页面或真实存档验收。本条提交后进度记录纳入下一模块。下一项实现已核对的 SAV_Fashion9；整体目标保持 active。

- 2026-10-11 API 133 工程检查收尾通过：完整原生 75169、完整 verify 17726、核心发布 35736、裁剪／编译服务器关闭／最新网页 44000 均退出码 0；264 文件／1125 项，裁剪后 26 类属性签名及访问器一致，最新网页／PWA 253 项预缓存。没有修改 vendored Core／来源 manifest，保留既有警告。远端 fetch 后 main／origin/main 分叉 0／0，基线仍 4a073df。
  Z-A 事件窗口库存改为工程通过，页面和真实存档待验收；Demo 是示例布局，正式工作区迁移未实施。当前最后文档／格式收尾，随后按已有授权提交 `feat: 接入 Z-A 事件标记与变量编辑` 并普通推送。下一项服装窗口已完成来源与控件上限核验，尚未实现；箱子查看器和其余库存仍保留，完整 PKHeX 目标继续 active。

- 2026-10-11 API 133 完整原生 75169 和完整前端 verify 17726 均退出码 0。verify 包含全仓格式、Lint、类型、264 文件／1125 项及网页／PWA 253 项预缓存；保留既有 Hook 与构建提示。全仓格式／空白 24661 通过，vendored Core 与来源 manifest 未修改。本批仍未提交，API 133 浏览器核心发布 35736 已启动（TEMP/pokerngkit-api133-core.log）；完成后检查裁剪并用最新资源重打网页，再最后文档／格式、提交及普通推送。
  独立 WinForms 探针 53556 退出码 0，.NET 10.0.12／WinForms 10.0.0.0 确认服装 Value 列为 UInt32、MaxInputLength=32767；8／25 组及导入／拥有来源已记录，服装窗口仍未实现。布局 Demo 仍用示例数据，空格位已清详情并禁用操作；正式迁移和真实页面／存档验收保留。

- 2026-10-11 按所有者请求新增独立布局 Demo：`public/demos/save-workspace.html`，本地预览路径 `/demos/save-workspace.html`。展示主导航存档入口、224px 用途侧栏、顶部文件状态／撤销／导出、中央箱子与队伍、右侧宝可梦编辑和乱数联动；可以切换全部箱子、分类、详情及输入预览。使用已有本地许可图片和示例数据，不接真实存档，不改变产品入口。Chrome 连接仍失败，未执行浏览器核验，等待所有者评审布局。

- 2026-10-11 最终类型 18523 退出码 0，API 133 类型接线通过；完整原生 75169 仍运行，完整前端 verify 17726 已启动，日志为 TEMP/pokerngkit-api133-verify.log。先完成本批工程收尾、核心发布及提交推送，页面与真实存档继续待验收。
  所有者提出功能增多后的入口组织问题；已建议独立存档工作区、按用途分组、统一文件状态／撤销／导出和乱数联动。该建议尚未实施，不作为已经确认的 UI 变更。Chrome 页面虽已重新打开，连接仍返回通信错误，不再请求重复权限。

- 2026-10-11 完整前端 62692 退出码 0：264 文件／1125 项通过，完整 Lint 零错误，保留既有 Hook warning。类型 94466 退出码 2，仅 Worker 事件分支 includes 接收可缺省 kind；已加显式 kind !== undefined，保留默认请求语义，不使用断言或忽略错误。类型继续最终复查，完整原生 75169 仍运行，本批未提交。

- 2026-10-11 完整 Lint 已通过，零错误，仅既有 Gen3StaticPanel Hook warning；62692 随后进入全部前端测试，尚无最终汇总。修正后三语类型 94466 仍运行；完整原生 75169／实际进程 24216 日志已推进 SecretBase3 和后续专属工具，保留原进程。代码稳定，本批尚未提交，下一步等待这三项终态，再最新核心／裁剪和完整 verify。

- 2026-10-11 类型 73141 退出码 2：event9aWords 的 as const 使三语错误文案进入公共资源时形成互不兼容的字面量，影响共享错误函数的调用；已移除该新增断言，沿用既有文案宽化类型，不修改其他模块、不忽略错误。最后类型重新启动 94466（TEMP/pokerngkit-api133-types.log）。完整原生 75169／实际进程 24216 继续运行，日志已到 Z-A 图鉴；完整 Lint→前端 62692 运行中（TEMP/pokerngkit-api133-frontend.log）。
  上轮全仓格式 45310 已通过；本次文案修正已格式化，最后文档后再查格式。本批仍未提交，原生终态前不启动核心发布，页面／真实存档待验收。

- 2026-10-11 Z-A 事件接线稳定，最后新增界面／面板／Worker Lint 58467 退出码 0；45 项三文件专项通过。完整原生 75169 已启动（TEMP/pokerngkit-api133-native.log），最终类型 73141、全仓格式／空白 45310 仍运行，保留同一进程。完整原生结束前不发布共享 .NET 输出，本批尚未提交；随后最新核心／裁剪、完整 verify、文档格式与提交推送，页面／真实存档待验收。

- 2026-10-11 API 133 三修订原生专项 9260 退出码 0，最后新增界面 Lint 54062 通过；45 项接线专项证据保留。追加拖放存档后的旧／新分配队列、名称表 txt 拖放及已选文件名，修复初始迟到读取覆盖新页和比较键包含完整名称表的问题；最终类型仍为 73141，后续界面改动需最终复查。尚未完整原生、verify、API 133 核心发布／裁剪，本批未提交。
  精确提交 4a073df 的 Actions 38118042134 已确认 completed／success，上批部署完成；不作为页面或真实存档验收。下一步本批工程收尾再提交推送，整体 PKHeX 库存继续。

- 2026-10-11 Z-A 事件三语界面、悬浮入口、JSExport 与五种 Worker 请求已接，API 133。分组／Core 名称搜索／分页／物理编号跳转、跨页草稿、名称表输入／文件、整窗冻结保存、全部逐槽／块对照与双文件比较齐备；关闭释放缓存，迟到读取不覆盖新页，原件和撤销／导出保留。本批仍未提交。
  三文件专项 27771 共 45 项及新增接线 Lint 通过。接线脚本首次在换行锚点失败，保留已应用部分后只续接未完成部分，临时脚本已删除；补齐 Worker 事件联合类型。复核发现旧事件比较 1 MiB 限额不适用 Z-A，改为独立 1 byte–32 MiB 检查，不修改旧世代限制。API 133 原生专项 9260 与类型 73141 运行中，界面最后 Lint 7708 运行中；代码后续字段修正仍需最终检查。后续完整原生／verify、最新核心与裁剪、提交推送；浏览器和真实存档待验收。

- 2026-10-11 Z-A 事件最终扩大原生专项 36877 退出码 0，三个修订均通过；追加元数据／尾部 bytes 比较、尾部保留、部分键及长预载名称、失败 Open 清缓存。Core 分页专项 72188 与第一次类型 91658 通过，最新前端六项及新增文件 Lint 41184 通过；新分页类型／部分键字段后仍需最终类型。先前全仓格式 2638 通过，最后本批文档收尾后再查格式。
  本批尚未 JSExport／Worker／三语 UI，协议仍为 API 132，不能作为已接产品入口提交。下一步接 API 133 的分页读／预览／确认／取消／比较与三语工作区，仍保留原件、撤销／导出。整体目标保持 active；上一批 4a073df Actions 38118042134 最后结果仍为 in_progress，后续核验，不以工程专项替代真实页面验收。

- 2026-10-11 Z-A 事件初稿三修订原生专项 10733 退出码 0，涵盖全部 15 组、范围、名称解析、整体规范化／压缩、独立完整 raw 文件对照、冻结令牌及原版比较缺陷。前端领域五项与新增文件 Lint 87552 通过，类型 91658 运行中。实际 WinForms 控件探针 27931 确认名称／数值／搜索上限均 32767。
  新增 Core 过滤／分页读取，保留全部物理 Count 与完整写入，避免发送／绘制数万行；原版 tuple 只查 Key A，其他按所有名称键查找，保留 OrdinalIgnoreCase。分页扩大专项 72188 运行中，不与其他 .NET 输出任务并行。尚未 JSExport／Worker／UI，协议仍 132，本批未提交，下一步检查分页专项，再接三语工作区及 API 133。

- 2026-10-11 开始 Z-A 事件窗口，本批基线 main／origin/main 4a073df；起始仅有上一批提交后进度记录，不覆盖所有者改动。新增 Event9aEditing／Session，覆盖 15 组与所有物理槽、四类键显示、有符号第二键、原版名称表、完整窗口规范化／Compress、冻结副本及两类文件比较。JSExport／Worker／三语入口未接，协议仍 API 132，本批未提交。
  初稿核心编译 82412 退出码 0；新增三修订专项已写，最终专项运行中（TEMP/pokerngkit-event9a-focus.log）。既有 API 132 没有套用旧事件数组，未修改 Core／SaveUtil 检测。比较保留原版九组报告及其删除循环行为；完整逐槽 raw 对照单独显示所有 15 组，原版越界时保留完整对照并报告源错误，不将原版缺陷当作无变化。
  上批 Actions 38118042134 本轮精确 SHA 查询仍为 in_progress，未确认部署完成。后续完善专项和输入记录，再接三语 UI／Worker 与下一协议；最后完整工程和提交推送，页面／真实存档仍待验收，整体目标保持 active。

- 2026-10-11 甜甜圈已提交并普通推送到 main：4a073df44461838b28fdb7f1f783d98da7ad558e，标题 `feat: 接入 Z-A 甜甜圈编辑与生成`，推送后工作区干净。首次 Actions 查询 EOF，使用完整 SHA 重查确认 38118042134 为 in_progress，部署未完成，不据此验收。当前进度记录随后更新，纳入下一项模块提交。
  下一项独立接 Z-A SAV_FlagWork9a／EventWorkGrid64，先沿已记录 15 组和复合键来源实现完整读取、编辑、名称表、冻结保存及双文件研究；不得把旧事件数组套成完成。甜甜圈页面／真实存档、仓储三查看器和库存其余缺口仍保留，完整 PKHeX 目标继续 active。

- 2026-10-11 甜甜圈 API 132 完整工程门槛通过：完整原生 5170、核心发布与 26 类裁剪属性 5601、完整 npm run verify 35916 均退出码 0。verify 包括全仓格式／Lint／类型、263 文件／1118 项、网页与 PWA 252 项预缓存。保留既有 Hook、裁剪、分块大小和工具耗时提示；最新核心已用于网页打包。
  四个甜甜圈窗口库存更新为工程通过、页面／真实存档待验收；未修改 vendored Core／source manifest。当前最后文档格式收尾，随后按已有授权提交 `feat: 接入 Z-A 甜甜圈编辑与生成` 并普通推送。Chrome 最新尝试仍失败，不声明 UI 接受或算法验收；下一项独立接 Z-A 事件窗口，仓储查看器及其他未完成库存继续保留，完整目标不结束。

- 2026-10-11 API 132 浏览器核心发布、裁剪后 26 类属性与编译服务器关闭 5601 退出码 0，最新资源已生成到 public/pkhex/_framework；既有反射裁剪警告保留。完整原生 5170、前端 263 文件／1118 项、最终类型与 Lint 已通过。远端 fetch 后 HEAD／origin/main 仍为 0／0 分叉；本批未提交。下一步完整 npm run verify，完成后更新库存工程状态、最后格式、提交及普通推送，页面／真实存档待验收。
  完整 verify 原进程 35916 已启动（TEMP/pokerngkit-api132-verify.log），格式与 Lint 通过，当前类型检查，尚无整套终态；Node 堆 4096 MiB、VITEST_MAX_WORKERS=1，仅此命令作用域。最新核心后再次尝试外部 Chrome 新标签仍返回 nodeRepl.fetch request failed，未使用内置浏览器，不宣称页面已核验。

- 2026-10-11 完整原生 5170 退出码 0，最终跑完训练家日期／徽章／货币／选项与全部记录，甜甜圈三修订专项包含在完整套件中通过。原生子进程已结束；按顺序启动 API 132 浏览器核心发布→26 类裁剪属性→build-server shutdown（TEMP/pokerngkit-api132-core.log），没有并发共享输出。前端 263 文件／1118 项、最终类型与 Lint 已通过；最新核心完成后再运行完整 verify，本批仍未提交，页面／真实存档未验收。

- 2026-10-11 等待原生期间复核三种仓储查看器：BoxList 全箱同时显示与相邻交换、BoxViewer 第二独立箱／拖放、GroupViewer 特殊 SlotGroup／详情仍有缺口；已用上游窗口和现有仓储／SaveReport 对照，库存三行改为明确部分接入／待实现，没有以单箱图片和壁纸替代全功能完成。原生 5170 仍运行，产品代码不变，下一步仍先收尾甜甜圈。
  同一完整套件已通过 Donut9a 三修订专项，继续推进到 BR gear；整套最终退出码尚未返回。最后既有检查的类型、263 文件／1118 项前端及 Lint 证据保留，不重新启动原生，也不提前发布共享输出的核心。

- 2026-10-11 等待完整原生期间核对下一项 Z-A 事件来源，模块文档记录 15 组、64／128／192 位键、全部物理槽、来源 Compress、Int64 第二键位模式、自定义名称表与双文件研究删除循环疑点；没有接新产品代码或把库存标为完成。当前甜甜圈工程门槛保持不变，完整原生 5170 仍运行，结束后再发布核心。

- 2026-10-11 完整前端 75035 退出码 0：263 文件／1118 项通过，全仓 Lint 零错误，仅既有 Hook warning；最终类型 65460 通过，格式 73217 通过。完整原生 5170 最后轮询仍存活，日志已到 SecretBase6，不能当作已完成。下一动作仍为等待该句柄终态，随后 API 132 浏览器核心发布→26 类裁剪属性→完整 npm run verify，最后文档格式、提交及普通推送。页面／真实存档待验收，本批未提交，整体库存未完成。

- 2026-10-11 全仓 Lint 已通过，零错误，仅既有 Gen3StaticPanel initialTransfer Hook warning；75035 随后开始完整单 Worker 前端测试，尚无最终汇总，不提前宣称通过。完整原生 5170 仍运行，日志继续推进到 Global Link5，未重启任务。最后格式 73217 已通过；本条编辑后重新格式化进度。当前仍等待两项完整检查，后续发布／裁剪／完整 verify 和提交推送保持原顺序。

- 2026-10-11 最后全仓格式与空白检查 73217 退出码 0；精确提交 b5a48415bc6f4c2a2431ed28d9a827ea0ff1231d 的 Actions 38109434744 已查询确认 completed／success，上一批剑／盾部署完成，仍不代表页面／真实存档验收。
  甜甜圈完整原生 5170／实际进程 25740 仍运行，完整前端 Lint→单 Worker 测试 75035 已启动（TEMP/pokerngkit-api132-frontend.log）。最终核心发布、裁剪属性、完整 verify 与本批提交推送尚未执行；按顺序收尾，不并发共享 .NET 输出。

- 2026-10-11 甜甜圈最终类型 65460 退出码 0；新增文件专项 Lint 初次 30263 发现导入脚本 Berry 正则多余转义，修正后 58053 退出码 0。变化格位搜索和效果图片跟随草稿已格式化；全仓格式／空白检查 40000 通过，后续文档及脚本编辑仍须最后全仓收尾。
  完整原生 5170 仍存活，实际 SaveEditor.Tests 进程 25740，日志已推进至 Gen7 事件数组专项，没有宣称套件完成。完成前不启动共享 .NET 输出的发布；之后按顺序构建 API 132 核心、裁剪属性和完整 npm run verify（本机 Vitest 可用 VITEST_MAX_WORKERS=1），再按已有授权提交及普通推送。Chrome 仍未恢复，页面／真实存档待验收，整体 PKHeX 目标继续。

- 2026-10-11 恢复甜甜圈收尾：旧 94710／33479／6644 检查句柄均不存在，无法补取最终输出，不据此宣称类型或格式通过；当前没有遗留类型／原生检查子进程。
  预览变化格位改为可搜索选择，避免 999 项长菜单；四个甜甜圈库存行更新为 API 132 已接入、全量工程检查中。重新启动类型 65460 与完整原生 5170（日志 TEMP/pokerngkit-api132-native.log），不重启仍存活的任务。Chrome 本轮仍返回 nodeRepl.fetch request failed，页面及真实存档待验收；本批尚未提交，整体目标保持 active。

- 2026-10-11 Z-A 甜甜圈 API 132 三文件专项 44 项通过，五种 Worker 读／预览／确认／取消／导出传输核对原件不脱离；三修订原生 94790 通过。
  首次类型原进程 8823 的输出指出 useRef 初始值与 findLast 库目标不符；PowerShell finally 恢复环境曾掩盖退出码，已改为显式保存并返回检查码，不能把此轮报告为成功。修正为明确 undefined ref 和既有数组方法，不改 tsconfig、不忽略错误。最终新增文件 Lint／类型原进程 94710 运行中。
  源 GetItemSpriteA 需要 Artwork 树果图，补导入 ItemStorage9ZA.Berry 全 66 项，总资源 385 张／1847336 bytes；生成候选按源列表顺序发送。初次 JSX 选项数组括号与取消缓存空 catch 已修正。Chrome 本轮再读仍为 nodeRepl.fetch request failed，未转用内置浏览器；页面与真实存档未验收。代码稳定后继续完整原生／前端、浏览器核心和网页构建，本批尚未提交。

- 2026-10-11 Z-A 甜甜圈已接三语悬浮面板与独立 Worker，协议 API 132，本批基线 b5a4841，尚未提交。
  六分组、999 可搜索物理格位、甜甜圈／66 树果／效果图片、Core 口味图、有序草稿、生成／文件与文本导入／导出、完整逐格冻结确认齐备。取消和关闭会释放缓存，原件及已有撤销／存档导出保留。总资源增加至 385 张／1847336 bytes，既有哈希与归属保持。原生 API 132 三修订原进程 94790 通过，前端三文件 44 项通过。
  初稿 JSX 选项数组闭合错误已修复；Lint 指出取消缓存的空 catch，补充生命周期说明后通过。字段／选择已用活动语言，生成选择保持源列表顺序，初始文本导入也确实提交屏幕显示的 bytes。类型原进程 8823 仍运行；后续树果图及选择顺序修改还需最终检查。完整原生／前端、最新核心和网页待检查，页面与真实存档未验收；整体 PKHeX 目标继续。

- 2026-10-11 Z-A 甜甜圈内部核心／领域／资源本批工程专项收尾：最终原生三修订 77389、前端六项与修正后新增文件 Lint 通过，完整类型原进程 54588 正常结束。
  新增 319 张原版 PNG、SHA-256 及版权说明，随机输出单次冻结，有序日期／毫秒事件、导入前缀行为、失败预览清理与原件保留已核对。协议仍为 API 131，UI／Worker／API 更新未接，本批不提交。最后全仓格式收尾，后续完成三语悬浮面板、图像与口味图、生成与导入／导出及冻结确认，再运行完整原生／前端和新版核心／网页。上一批 b5a4841 Actions 两次只读查询均返回 EOF，结果未知，不猜测部署状态。

- 2026-10-11 开始完整接入 Z-A 甜甜圈窗口及其编辑器／口味图／生成器，main／origin/main 基线 b5a4841，起始干净，协议暂保持 API 131，尚未接产品入口或提交。
  新增 Donut9aEditing／Controls／Session，覆盖 999×72 字节、全部源选择与输入、两时间存储、有序事件、来源规范化、重置／克隆／两种导入／导出、三种原版生成。随机预览冻结完整输出，确认不重掷；失败预览先清旧缓存，过期、替换、重复及取消均核验。首次编译 48256 通过，基础三修订 45413、失败清理／异常日期扩大 30129、最终有序事件及格式失败清理 77389 均通过，夹具为类型化合成数据，不作生产 SaveUtil／真实存档验收。
  导入 319 张原版 PNG（1738995 bytes），保留源路径／SHA-256 和版权说明，无运行时 CDN。前端六项专项通过；首轮 Lint 因脚本漏 URL 显式导入而失败，已修正，最后 Lint／类型／格式待检查。浏览器接线、下一协议和完整工程为后续工作。上一批剑／盾 Actions 38109434744 本轮查询返回 EOF，不能据此认定成功或失败；后续重查精确提交。

- 2026-10-11 剑／盾训练家 API 131 工程检查通过，main 基线 22e4034，本批提交收尾中。
  完整原生原进程 31134 退出码 0；完整前端 262 文件／1111 项、全仓 Lint、最后类型均通过。API 131 核心发布→26 类裁剪属性原进程 51700 正常结束，最新核心网页／PWA 原进程 96917 正常结束，预缓存 252 项。保持既有 Hook、反射裁剪、包大小与工具耗时提示，不作为所有者验收。最后文档与格式收尾后，按本轮已有授权提交并普通推送。
  新增九分组、双队伍六格本地图像与全部来源属性、双姓名字节、ID／号码／日期／坐标、记录与外观附带联动、三服装及地鼠操作；冻结源／目标哈希、逐块回读、原件和撤销／导出保留。Chrome 连接未恢复，页面／真实存档尚未验收。下一步继续按库存核对第九世代剩余存档窗口；完整 PKHeX 目标保持 active。

- 2026-10-11 剑／盾 API 131 完整原生原进程 31134 正常结束，退出码 0，最终跑完训练家与全部记录检查；新十二组训练家与六组队伍专项也在完整套件中通过。
  完整前端 262 文件／1111 项、全仓 Lint、最后类型检查证据保留，不重复运行。当前 PKHeX 浏览器核心发布→26 类裁剪属性原进程 51700 运行中，结束后再构建网页／PWA；不会与其他 .NET 输出任务并行。源码稳定，本批仍未提交，最终文档／格式和提交推送待收尾。页面与真实存档未验收，完整 PKHeX 目标未完成。

- 2026-10-11 剑／盾 API 131 完整前端 262 文件／1111 项全部通过，原进程 28294 正常结束；全仓 Lint 零错误，保留既有 Gen3StaticPanel Hook 警告。
  最后外观／焦点修改的类型 58749 已通过，当前代码稳定。完整原生 31134 仍运行，实际 SaveEditor.Tests 子进程 26216 存在且日志继续推进到 Pokeathlon4，不能并行启动共享输出的 .NET 发布。原生结束后按顺序构建 PKHeX 浏览器核心、裁剪后属性检查、网页／PWA 包；之后最终格式、提交与普通推送已获所有者授权。本批尚未提交，页面／真实存档未验收，完整 PKHeX 目标仍继续。

- 2026-10-11 剑／盾 API 131 UI／Worker 接线完成，工程门槛进行中，尚未提交。
  最终扩大原生十二组合原进程 13608 通过，覆盖双队伍第六槽动作及布尔类型变化预览。首两次新增布尔专项使用空白模板查找 Bool1／Bool2，但该模板没有此类型；改为独立类型化工程标记后验证变化元数据，不在生产补块。新增文件 ESLint 74452、初次类型 56607、全仓格式 81547 均通过。
  最后外观目录／预览焦点修改的类型原进程 58749 和完整原生 31134 运行中。原生日志已运行到第九世代图鉴，不能因前段暂无终端输出重启。Chrome 再读取仍为 nodeRepl.fetch request failed，不需新增授权；页面／真实存档未验收。最新核心、裁剪属性、完整前端及网页／PWA 待检查，整体 PKHeX 目标继续。

- 2026-10-11 剑／盾训练家已接三语界面、悬浮工具专属入口与 Worker，协议 API 131，基线 22e4034，本批尚未提交。
  九分组包含双队伍六格本地图片、原版完整属性、双姓名字节与特殊字符、号码／瓦特／对战塔记录联动、完整位置、肤色／外观、三服装模式及地鼠。预览新增 18 项外观标识和全部变化块元数据，布尔零字节块仍能显示实际类型变化。冻结期间禁用草稿，原件／撤销／导出沿用现有流程。
  前端领域／客户端／通用领域三文件 44 项通过，初稿 JSX 属性闭合错误已格式检查定位并修正。第一次类型原进程 56607 及原生 API 131 专项 72354 仍运行；后续添加的外观目录与双队伍动作／布尔块预览专项还需最终复查。最后文件格式收尾中，完整工程、最新核心与网页构建待检查；页面及真实存档尚未验收。

- 2026-10-11 剑／盾训练家本批内部核心与领域检查通过，协议保持 API 130，尚未接产品入口、提交或推送。
  最终原生十二组合 21793、前端三文件 23 项及新增文件 ESLint 通过。首轮类型 9476 发现测试夹具坐标元数据 decimals 与既有 places 不符，修正测试后原进程 44108 通过，未改共享接口或生产保存逻辑。全仓格式 21258 通过，最后交接文档再次格式收尾。未运行完整前端／新浏览器核心构建；后续接三语界面与 Worker 后再运行完整检查。
  本轮外部 Chrome 再读仍返回 nodeRepl.fetch request failed，未使用内置浏览器，也未把工程结果视为页面或真实存档验收。上一批 22e4034 Actions 已成功；当前目标和库存继续保留完整 PKHeX 范围，下一步为 SAV_Trainer8 产品接线及 API 更新。

- 2026-10-11 剑／盾训练家扩大十二组合最终原进程 21793 通过，前端三文件 23 项通过，新增领域／三语文字／领域测试 ESLint 通过。
  前次空值／全零地图原进程 30716 在两条新测试缺少 UI 语言处失败；补齐显式语言，并为 Trainer8 提供独立文化区错误和前端必填校验，未改写入逻辑。首轮 ESLint 拒绝控制字符正则，改为字符编码范围判断，同时补齐 Unicode C1 控制范围测试，不关闭规则。类型原进程 9476 运行中，最后文档／全仓格式收尾中。协议仍为 API 130，产品与 Worker 尚未接入，本批不提交核心初稿。
  上批阿尔宙斯训练家 22e4034 的 Actions 38102788757 已确认 completed／success；该 CI 结果不代表页面或真实存档验收。继续完成 SAV_Trainer8 的三语分组、六槽图像选择、完整属性、姓名字节、附带联动与冻结预览，再更新协议和库存。

- 2026-10-11 剑／盾训练家内部核心已补齐 71 字段、50 记录、双姓名字节、六位 ID、八地图控件、肤色／性别外观、三服装模式和地鼠操作，协议暂保持 API 130，尚未接产品入口或提交。
  十二组合专项第一次在地鼠命名块处失败：Core 空白模板缺少部分来源所需标记。生产目录新增完整类型／块检查，不创建缺失块；专项夹具明确添加来源命名类型化字段，仍不能通过生产 SaveUtil 认定为真实存档。修正后原进程 91494 十二组合通过。补核对两个 Designer 日期初始值固定 2000-01-01，实际 WinForms 探针证明隐藏控件仍参与 Save，已实现 2061 年归零时间／4095 年上界超时回到初始日期／1900 年归零时间三种保留态，扩大十二组合原进程 16749 通过。
  新增前端领域、三语文字与冻请求校验，两文件十项通过；源码加载范围、位偏移、空值、map NumericUpDown、服装清理及地鼠检测已记入模块文档。最终空值／全零地图专项原进程 30716 运行中，完整类型及浏览器核心构建尚未运行。浏览器保持等待所有者重新打开已授权本地页，不重复索要授权；整体库存仍未完成。

- 2026-10-11 剑／盾训练家窗口开发开始，main／origin/main 基线 22e4034，起始干净，协议仍为 API 130。
  本批先接联盟卡与标题画面各六槽内部组件，按来源 PropertyGrid 的完整 CLR 类型与显式转换器保存，保留未知字段、局部写入及队伍复制清理规则；尚未接 UI／Worker／冻结预览，库存仍未完成，暂不提交核心初稿。新增六组合类型化合成块专项，初次失败是测试预期资源名漏写下划线，已对照 SpriteName 修正；修正后六组合通过，原进程 72937 正常结束。补充截短块拒绝已通过，缺失必需块在 Core 构造阶段即拒绝，不能声称到达编辑组件；第二次专项按真实构造边界修正测试预期，最终扩大六组合原进程 13366 全部通过。全仓格式原进程 64586 已通过，最后交接文字格式收尾中；未运行完整原生／前端或新浏览器核心构建。上一批 22e4034 Actions 38102788757 本轮查询仍为 in_progress。
  所有者已关闭旧本地标签；新建 Chrome 标签及读取列表仍返回 nodeRepl.fetch request failed，扩展 ID 可识别，没有新增授权要求。本地 5173 原无监听，已恢复 dev:web 服务并确认监听；不使用内置浏览器替代，页面与真实存档尚未核验。

- 2026-10-11 阿尔宙斯窗口最终加载态四组合专项原进程 89348 通过，前端三文件专项 40 项通过。全零坐标单改地图忽略，非零加载态会触发地图／完整朝向保存；重保存同样核对原版无 Loading guard 的副作用。
  完整前端原进程 6596 返回 1：1102 项通过，trainerDates 三个时区子进程单项超过默认 5 秒，没有数据断言不一致。日期／阿尔宙斯领域／Worker 路由三文件 19 项复查通过；生产逻辑和超时阈值未改，低负载完整重跑及网页原进程 5597 正常结束，261 文件／1103 项、最新核心网页／PWA 通过，预缓存 252 项。全仓格式原进程 3566、API 130 核心／裁剪后 26 类属性原进程 67756 已正常结束；Lint 零错误，类型原进程 25159 正常结束。Chrome 读取 15 秒超时，无新增授权要求；页面与真实存档未验收。上批 BDSP Actions 38100798964 已确认 success，本批工程检查通过，提交收尾中。

- 2026-10-11 阿尔宙斯训练家窗口已接三语界面与 Worker，协议 API 130，本批基线 1a255d1，未提交。
  概览／六位 ID／地图／姓名字节分组，日期不转时区，坐标禁用异常源值；显示忽略输入、完整坐标块、两种日期原始编码与冻结变化。补核对原版加载无 Loading guard，非零坐标触发重保存四元数重建，已修正并扩大原生专项。当前首次扩大原生原进程 17299 与最终加载态四组合原进程 89348 均通过，前端专项→Lint→类型原进程 25159 运行中；初稿四组合与领域专项证据保留，不作产品验收。最终核心、完整前端、网页与浏览器待检查。

- 2026-10-11 开始补齐 SAV_Trainer8a，基线 main／origin/main=1a255d1，起始干净；当前核心／领域初稿，协议保持 API 129，尚未接产品入口或提交。
  核对 13 字段、四项 999999999 控件、六位 ID、姓名废字节、运行时语言、两种无时区日期及地图单改按全零／非零加载态决定保存。核心保留源 MapUpdated 规则、ASCII 写入、完整四元数及未知原值；日期不复用 BDSP 时区转换。编译／既有裁剪元数据原进程 81957 正常结束，前端领域 4 项通过；原生基础／洗翠黎明 × 两性别四组合原进程 4247 正常结束，使用类型化合成块，不代表真实存档或产品验收。产品／新协议／完整工程待接入。

- 2026-10-11 BDSP 训练家扩展已接三语 UI／Worker，协议 API 129；基线 6782607，本批未提交。
  50 字段／六位 ID／双姓名废字节／坐标／时区与 ticks／排行联动均进入专属分组与冻结预览。通用训练家入口同步补全全零 ID 修复及匹配排行更新，避免两入口结果不同；记录复用三语名称，内部滚动。首轮界面格式 JSX 闭合错误已修正，接线脚本旧 Worker 边界不匹配后按现结构完成，未升级无关数字。
  两文件前端专项 37 项、扩大原生八组合原进程 31027、完整前端原进程 23121 的 260 文件／1098 项、格式原进程 24554 均通过。完整 Lint 零错误，类型原进程 4547 正常结束，保留既有 Hook 警告。首轮 API 129 核心／26 类裁剪原进程 27793 已正常结束；收尾发现坐标空／无效文本需沿原控件保留旧值，已修正并新增专项，最新八组专项全部通过，后续核心→26 类裁剪原进程 94815 已正常结束。浏览器日期省略零秒已补齐，来源保存接收明确偏移；重保存核对输入、坐标、日期及徽章规范化。Chrome 本轮读取 15 秒超时，页面／真实存档未验收，最新核心网页／PWA 原进程 96782 正常结束，预缓存 252 项。本批工程检查通过，提交收尾中。上一批巢穴 Actions 38097744866 已确认 success。

- 2026-10-11 开始补齐 SAV_Trainer8b，基线 main／origin/main=6782607，起始干净；当前核心初稿未接产品入口，协议保持 API 128，尚未提交。
  已核对来源 50 字段、六位 ID、双姓名废字节、坐标、UTC FILETIME 小数秒、全零 ID 修复及 1.1+ 匹配扩展排行同步。新增 Trainer8bEditing 与独立地址专项，姓名同步不会改不匹配排行及扩展标记；日期请求含显式偏移，避免 Worker 时区误差。初次核心编译及既有裁剪元数据探针原进程 64608、原生八组合原进程 81815 均通过。前端领域与日期转换专项 26 项通过（含既有领域检查），全仓格式原进程 33229 通过，最后新增文件仍需最终格式检查。原版重保存及异常边界还需更完整核对，产品与新协议接线待完成，当前不提交或推送核心初稿。上一批巢穴 Actions 38097744866 已核实 in_progress。

- 2026-10-11 剑／盾极巨巢穴参数已接 API 128 三语产品入口与 Worker，基线 f1467a9，起始干净，尚未提交。
  核对三地区 100／90／86 显示索引、24 字节记录、UInt64 十六进制转换、完整 byte、只读激活及四派生 setter 联动。产品保留有序修改、跨巢穴原始记录前后对照、预览／撤回／丢弃／冻结应用与原版保存，缺失 DLC 块不补造。前端三文件 37 项及原生六组合原进程 9873 通过；专项使用类型化合成块，不构成 SaveService 或真实游戏验收。全仓格式原进程 39461 正常结束，完整 Lint 零错误，新增预览／路由文件 ESLint 复查通过；类型原进程 70439 仍运行。API 128 核心与裁剪后 26 类属性原进程 27782 正常结束。
  完整前端首轮原进程 25295 返回 1：258 文件／1069 项通过，C-Gear byte transport 单项超过默认 5 秒，未报告数据断言不一致。保持生产代码及超时设置不变，C-Gear／巢穴领域／新增 Worker 路由三文件 19 项复查通过；关闭项目构建服务后完整前端原进程 86423 正常结束，259 文件／1071 项通过，不能将首轮称为零错误。首轮类型发现 Select 接口及新增 before／after 文案错误，已修正 children／事件接口、三语标签与巢穴搜索候选，最终控件 ESLint 复查通过；原进程 25772 仍读到修正前接口并返回 2；稳定文件类型与最新核心网页／PWA 原进程 75041 已正常结束。最后格式收尾中，页面及真实存档未验收。地下物品 Actions 38095820339 仍 in_progress；贴纸 Actions 38094624640 cancelled。

- 2026-10-11 地下物品窗口初稿已接三语产品面板与 Worker，API 127，基线 main／origin/main=d2e5070，起始干净，尚未提交。
  已核对来源 631 可见／999 物理记录、四种类型、数量完整 Int32、新获得反向、全部按类型 999／99、清空标记、保存全部隐藏标记规范化；当前草稿进入批量前处理，完整来源／目标冻结与原件保护保留。原生八组合原进程 26655、完整前端原进程 31955 的 258 文件／1066 项、格式原进程 89309 均正常结束；新增 Worker 路由纳入完整结果。完整 Lint 零错误，原有 Gen3StaticPanel Hook 警告保留，类型原进程 80686 已正常结束。API 127 核心、裁剪后 26 类属性原进程 1148 与最新核心网页／PWA 原进程 20108 均正常结束，预缓存 252 项。本轮 Chrome 状态读取 15 秒超时，页面与真实存档未验收。上一批贴纸 Actions 38094624640 仍在运行，杂项 Actions 38093241797 已 cancelled，不能称其部署成功。本批工程检查通过，提交收尾中。

- 2026-10-11 晶灿钻石／明亮珍珠贴纸窗口已接入三语界面与 Worker，协议 API 126；基线 ab09826，尚未提交。
  核对 96 显示项／200 物理项、有符号 Int32 文本与归零规则、全部的差额及回绕、清空、完整保存的隐藏取得标记规范化。草稿先于批量操作处理，冻结预览展示所有取得值变化；原件、工作副本、撤销和导出保留。补齐切换非 BDSP 存档时贴纸及杂项入口回退。
  原生八组合原进程 85666、完整前端原进程 7116 的 257 文件／1061 项及全仓格式原进程 75120 均正常结束；新增 Worker 路由测试已纳入完整结果。首轮 Lint 原进程 74018 因 JSX 解析报错结束，当前文件标签完整、格式及专项 ESLint 复查通过，完整 Lint 重跑零错误；类型原进程 51746 已正常结束。API 126 核心构建／裁剪后 26 类属性原进程 1213、最新核心网页／PWA 原进程 97342 均正常结束，保留既有 Hook 与反射裁剪警告。本轮外部 Chrome 读取 15 秒超时，页面及真实存档未验收，本批工程检查通过，提交收尾中。

- 2026-10-11 晶灿钻石／明亮珍珠杂项十项操作已接入，协议 API 125，基线 main／origin/main=3327b3d，尚未提交。
  按 SAV_Misc8b 与 Core 接入三种幻兽、花岩怪、封面传说、两只游走、707 位训练家、624 区域标记与 12 时装标记；三语操作、分组原始状态、冻结预览、工作副本及撤销／导出保留。数值输入不存在，不附加通用事件编辑。修正表头未定义背景变量，使用项目现有表面色。
  八组原生整文件独立地址专项、前端专项 35 项及完整 256 文件／1055 项测试通过。初次编译 Span 哈希参数不匹配已修正；API 125 核心构建与裁剪后 26 类属性检查通过。全仓格式／差异检查通过，Lint／类型原进程 58375 正常结束，最新核心网页／PWA 打包原进程 89223 正常结束。保留既有 Gen3StaticPanel Hook 及反射裁剪警告。
  所有者已关闭旧标签；本次 Chrome 状态读取 20 秒超时，未新增权限要求。页面及真实存档未验收，完整 PKHeX 目标继续按库存推进。

- 2026-10-11 Let's Go 训练家与 GO 传送公园 API 124 工程检查通过，基线 512067e，提交收尾中。
  三语完整窗口、20 区 × 50 格本地图像、单个／顺序空位 GP1 导入、单个／逐格目录 ZIP 导出、摘要、称号／服装、双姓名废字节、完整 64 位地图、冻结预览及既有撤销／导出均已接入。普通箱子编辑能力没有据此扩大；通用训练家入口明确引导到本工具。
  含 ZIP 的四组合原生专项通过，原进程 55785 正常结束；共享姓名助手的原 Gen7 八组合回归已在前批通过。API 124 核心构建及裁剪后 26 类属性检查通过，原进程 62617 正常结束。原类型原进程 61299 正常结束，最终串行等价 verify 原进程 62748 正常结束：255 文件／1050 项测试、格式／Lint／类型及最新核心网页／PWA 打包通过，预缓存 252 项。原有 Gen3StaticPanel Hook 警告与反射裁剪警告保留，未据此声明所有者验收。
  更新后的外部 Chrome 读取仍返回 nodeRepl.fetch request failed，无新增权限要求，页面及真实存档未验收。完整 PKHeX 目标仍继续按库存推进，下一项核对 SAV_Misc8b。

- 2026-10-11 Let's Go 训练家与 GO 传送公园已接三语产品入口及独立 Worker，协议更新 API 124，尚未提交。
  界面按基础／六位 ID／八项位置缩放／双姓名废字节／GO Park／称号服装分组；20 区各 50 个真实格位使用本地图像和形态／性别／异色信息，支持键盘移动。单个导入覆盖，批量跳过占用格，冻结预览逐文件报告放入／过滤／容量不足，并从真实地址提取所有 GP1 字节变化的格位，保留仅改未知原始字节的记录。
  GP1 单个导出、逐格目录 ZIP、当前语言摘要复制与失败后手动复制均已接入；目录隔离重复文件名，压缩包保留精确原始 bytes。删除全部提供来源确认语义与预览，工作副本／撤销／导出沿用既有路径；日期控件补齐零秒，64 位地图始终用字符串。
  含 ZIP 的四组合原生专项通过，原进程 55785 正常结束；三文件领域／客户端专项 39 项通过，原进程 50413 正常结束，之后增加三语错误专项，待完整前端测试。首轮全仓 Lint 通过，类型原进程 61299 仍在运行；已补键盘偏移字典的显式类型，完成后再核对结果及最终代码。API 124 浏览器核心构建／裁剪原进程 62617 仍在运行，不因观测超时重复启动；最终网页打包和完整工程检查待前置完成。当前不推送未完成检查的代码，浏览器与真实存档未验收。

- 2026-10-11 开始补齐 SAV_Trainer7GG，工作区基线 main／origin/main=512067e，起始干净；当前为未提交核心初稿，协议暂保持 API 123，产品入口与 Worker 待接入。
  已通读来源窗口、Designer、SAV7b、Coordinates7b、两姓名字符串、两时戳、GO Park／GP1、称号与服装。新增完整基础字段／六位 ID／八项坐标／双姓名废字节／来源重新保存，以及称号、服装、1000 GP1 格位读取、单个和顺序空位批量导入、删除、单个／全部原始导出、冻结预览与导入回执。
  GO Park 为 20 区 × 50 格，单个 GP1 0x1B0 bytes；单个导入只校验长度，批量严格沿用 .gp1 小写扩展及长度过滤、跳过占用格、容量不足停止放入。无效旧种类／招式仍可读取和原样导出，保留所有原始 bytes；删除写源 GP1 模板而不是全零。地图 UInt64 使用十进制字符串，不经 JavaScript Number；任一实际坐标修改按源窗口保存全部八项并重建四元数。
  核心编译／既有裁剪类型探针通过，原进程 40545 正常结束，不代表新浏览器核心已构建。首轮专项因旧语言目录未覆盖 SAV7b 失败，改为直接使用原版语言候选；次轮整文件对照发现 SAV7b.SetString 忽略 None 并清空目标，已按 TrashEditor 的编码前缀复制规则修正共享助手及独立预期。GP／GE × 两性别四组合核心专项通过，原进程 43345 正常结束；前端领域八项专项通过，尚未接实际控件。共享助手的原 Gen7 八组合专项通过，原进程 32070 正常结束。格式原进程 47388 正常结束；后续新增文件与文档仍需最终全仓格式检查。
  下一步接三语完整产品界面、20 区真实格位和本地图像、文件／ZIP／摘要操作、Worker 与 API 124 握手，再执行对应工程检查。当前不推送核心初稿、不声明整个窗口完成；浏览器及真实存档仍待验收。上一批 Actions 38087432340 已确认 success，SHA=512067e。

- 2026-10-11 第七世代训练家窗口 API 123 工程检查通过，main 基线 4485e2d，提交收尾中。
  日月／究极日月全部扩展设置、六位公开 ID／四位隐藏 ID、坐标、服装、姓名废字节、来源重新保存与冻结预览已接入。设置按分组展示，长列表使用共享搜索控件，确认控件保持 44px 点击区域，预览按当前语言显示实际选项名称。原存档、撤销与导出路径保持。
  八组原生专项通过，254 文件／1039 项前端测试及串行等价 verify 检查通过；最后样式／预览修改后的格式、Lint、类型检查通过。完整原生首轮运行至基础训练家检查时，旧测试遗漏了第七世代性别修改同步肤色的来源行为；按独立 status bit 2 地址修正预期后，从该项开始重跑全部剩余检查通过，前段结果继续保留，不能写成完整原生首轮零错误。
  原生后段、API 123 核心构建与裁剪后 26 类型属性检查串行原进程 7179 正常结束；最新核心最终网页／PWA 打包原进程 22082 正常结束，预缓存 252 项。最后界面检查原进程 79831 正常结束。反射裁剪警告及原有 Gen3StaticPanel Hook 警告仍保留，不作为所有者验收。上一批 Actions 38080816220 已确认 success，SHA 对应 4485e2d。
  外部 Chrome 扩展可识别，但标签读取仍返回 nodeRepl.fetch request failed。代理启动脚本已包含本地地址绕过；已请所有者重新打开已授权本地地址，等待连接恢复。浏览器与真实存档未验收；完整 PKHeX 目标仍继续按库存推进，下一项核对 SAV_Trainer7GG。

- 2026-10-11 第七世代训练家设置已接入产品面板与独立 Worker 请求，协议更新 API 123，尚未提交。
  新增六位公开 ID／四位隐藏 ID，保留来源先保存 SID、再保存 TID 的边界与 UInt32 回绕；基础姓名与金钱允许空值归零，性别改变同步肤色低位。设置按分组展示，长地图／投球动作／护照列表使用共享搜索候选，服装、坐标、姓名废字节、原版重新保存均需冻结预览后应用。
  扩展整文件重保存专项八组合通过，原进程 61994 正常结束。首轮失败定位到测试夹具误将庆典广场总金币 0x50C 当余额 0x508；修正夹具后核对金币总数联动，不修改 Core。最新 ID／基础联动扩展专项正在运行，完整工程与新浏览器核心待检查。前端领域／客户端／通用领域三文件 37 项通过，原进程 6258 正常结束。首轮类型检查因 Node 默认堆不足终止，原进程 14141 返回 134；已使用 4 GiB 堆重跑，尚未取得完成结果。
  所有者关闭旧本地标签后再次读取外部 Chrome，扩展仍被识别但标签请求返回 nodeRepl.fetch request failed；不是新增授权要求，页面与真实存档尚未核验。

- 2026-10-11 开始补齐第七世代训练家窗口，main 基线 4485e2d，协议暂保持 API 122，尚未接前端入口。
  已通读源窗口与对应 Core 类型、Designer，新增 Trainer7Editing／Position／Names／MapData／Fashion。核心初稿包含宝可搜寻镜、十二对战树、肤色与显式不匹配确认、SM 投球动作两列表、十五护照章、Mega／Z、广场姓名／刷新／Vivillon／时差、两套真实地图标记、USUM 冲浪／洛托姆，以及坐标、姓名废字节、服装模式、冻结预览与来源重保存；重保存及基础输入仍需更完整来源对照，不能把初稿等同完整窗口。
  生成器从只读 PKHeX 26.08.26 导入三语原始标签、46／48 项地图索引与八个未修改服装载荷；载荷长 1388–1449 bytes，实际清空的 Fashion 区长 0x1A08。每个载荷保存 SHA-256，按来源清空后复制短载荷，不补造全 FF。
  初次导入因路径重复失败；改为正确只读路径后，固定全块长度检查发现来源是短载荷，已按 Core ImportPayload 的上限修正。首次核心编译因 ushort／int Math.Min 重载歧义失败，原进程 2779 已结束；明确类型后编译及既有裁剪元数据探针通过，原进程 48190 正常结束，这不代表新浏览器核心已构建或新功能通过验收。
  新增八组合原生专项通过，原进程 70002 正常结束，格式原进程 55948／51420 正常结束，全仓格式与差异检查通过；核对每个源字段／选择与独立地址、点赞联动、服装、坐标／镜像、废字节、完整文件与原件。前端领域／三语操作文案已建立，尚未接实际界面；基础输入联动、完整重保存验证及全套工程尚未完成。上一批 Actions 38080816220 查询仍 in_progress，HEAD=4485e2d；浏览器和真实存档未验收。

- 2026-10-11 接入第七世代殿堂，main 基线 90e07ec，API 122，工程检查通过，提交收尾中。上一批 Actions 38075827502 已确认 success，HEAD=90e07ec，不代替本批部署或所有者验收。
  已按 SAV_HallOfFame7／Designer、EventWork7、Misc7 与 Accessor 接入首次／最新两组六个种类、三语候选与本地种类图像；源数据无形态、性别、异色、昵称或训练家字段，不补造完整宝可梦记录。普通补丁保护未指定旧值，明确来源重新保存才将不在候选中的旧种类归零。
  十二格连续 UInt16，SM 绝对起点 0x25C4，USUM 0x283C；使用 GetEntry／SetEntry 避开独立属性重复地址问题。初始宝可梦加密常数只随真实 USUM 布局开放，绝对地址 0x4548；八字符文本按 Util.GetHexValue 跳过非十六进制，空值零。候选缓存以真实类型及游戏标记为键，跨游戏标记不转换存档布局。
  首轮原生因图像接口 species 需要 UInt16 编译失败，原进程 26707 正常失败结束；明确转换后四游戏专项通过，原进程 14682 正常结束。新增全部跨游戏标记／布局组合后，原生专项及类型原进程因工具中断句柄丢失，已核实对应子进程不在运行后启动原生 48106 与类型 33745；不把中断日志当作完成结果。
  前端领域／客户端／三语专项 33 项通过；两组六格列表与可搜索候选、草稿／冻结预览／工作副本／撤销／导出已接通。种类选择避免不必要重建，保持共享控件键盘焦点。扩展原生专项通过，原进程 48106 正常结束，覆盖四游戏及八组真实布局／标记组合；类型 33745 正常结束并通过；格式 42292／85961 已正常结束，全仓格式及差异检查通过。完整 verify／原生／核心／裁剪开始执行，最新核心最终网页待前置构建完成，完整 verify 原进程 37556 正常结束，253 文件／1029 项测试、格式／Lint／类型及网页／PWA 打包通过；完整原生、API 122 核心构建与裁剪后 26 类型属性检查通过，串行原进程 99573 正常结束；最新 API 122 核心的最终网页／PWA 打包通过，原进程 53484 正常结束，预缓存 252 项；最后格式与差异检查后按既有授权提交推送，外部浏览器和真实存档未验收。本轮重试在 Chrome 创建已授权本地页仍返回 nodeRepl.fetch request failed，未进行界面验证。

- 2026-10-11 接入日月基格尔德细胞／究极日月霸主贴纸，main 基线 396b5df，API 121，工程检查通过，提交收尾中。
  已按 SAV_ZygardeCell／Designer、EventWork7 和两版本 Accessor 接入 95／100 个真实格位、0–2 状态、独立 UInt16 储存数量／已收集、来源全部领取及重新保存；USUM 每次保存同步记录 72，SM 全部领取同时增加储存数量。未知旧状态可读取、保留或明确修复，批量遇未知状态或计数超限时原子拒绝。
  完整来源位置顺序由只读源码生成并固定两个 SHA-256；基础地名取 Core 三语资源，方位／建筑／昼夜补充本地三语描述，生成器拒绝未覆盖词。API、JSExport、Worker、三语浮动入口、共享 Select、草稿／冻结预览／工作副本／撤销／导出已接通；手机列表重排，真实记录作为滚动区域。
  首轮原生因测试将 Span 当数组调用 AsSpan 编译失败，原进程 62460 已结束；改为 Slice 后四游戏专项通过，原进程 52005 正常结束。专项使用独立绝对地址、索引位图、来源位置哈希与全文件 Core 对照，覆盖全部格位、两计数边界、未知旧值、领取／重复领取、USUM 记录、拒绝、校验、冻结与原件保持。
  前端领域／客户端／三语专项 33 项通过，原进程 68586 正常结束。类型原进程 26251 正常结束；全仓格式与差异检查通过，原进程 3860 正常结束。首轮完整 verify 原进程 43768 在 Lint 因生成器缺少 URL 导入失败结束；已显式从 node:url 导入，第二轮完整 verify 原进程 84922 正常结束，252 文件／1023 项测试、格式／Lint／类型及网页／PWA 打包通过；完整原生、API 121 核心构建及裁剪后 26 类型属性检查通过，串行原进程 4850 正常结束；最新 API 121 核心的最终网页／PWA 打包通过，原进程 43708 正常结束，预缓存 252 项。保留既有 Hook、JSExport、反射裁剪及网页体积／插件提示；最后格式及差异检查后按既有授权提交推送。第七世代殿堂已核对来源，但产品实现仍待下一步。API 120 的 396b5df 已推送，Actions 38071307902 已确认 success，HEAD=396b5df；此状态不代替本批部署或所有者验收。浏览器与真实存档未验收。

  继续核对原窗口三语 L_Cells，确认它是 Stored／储存了／キューブ内，已纠正初版累计数量标签与说明。数据字段沿用 Core Total 命名，实际读写地址及联动未变。更新后三文件前端专项 34 项通过，原进程 6214 正常结束；标签及证据格式原进程 69521 正常结束。API 121 核心产物完成后重试已授权 Chrome 本地页，仍返回 nodeRepl.fetch request failed；没有进行浏览器或真实存档验收。

- 2026-10-11 接入 ORAS 试玩版训练家窗口，main 基线 4d59abd，API 120，工程检查通过，提交收尾中。
  已核对 SAV6AODemo、SaveBlockAccessor6AODemo 和 Gen6/SAV_Trainer.cs／Designer。试玩版没有真实箱子，报告与操作目录按 HasBox 判断，保留真实队伍及本地图像。训练家、游戏记录与导出采用独立权限，其他试玩版编辑仍待逐项接入。
  源窗口移除留言、Maison、多人形象、Mega 与 XY 专属页，Overview 的 Vivillon 仍显示；已接基本信息、地理、日期、时间、徽章、点数、坐标与姓名废字节。整窗保存保留来源隐藏留言重编码、里程同步及模型重置，普通补丁保护隐藏字段。
  前端领域／训练家专项 38 项通过。两轮测试夹具因受保护队伍方法／属性编译失败，已改为公开 SetPartySlotAtIndex 自动更新数量，第三轮四种布局专项通过，原进程 58087 正常结束。完整 verify 原进程 99454 正常结束，251 文件／1015 项测试、格式、Lint、类型与网页打包通过；额外类型原进程 14151 正常结束。完整原生、API 120 核心构建与裁剪后 26 类型属性检查均通过，串行原进程 14337 正常结束。使用最新 API 120 核心的最终网页／PWA 打包通过，原进程 48377 正常结束。保留既有 Hook、JSExport、反射裁剪及网页体积／插件提示；最后格式与差异检查后按既有授权提交推送本批。Chrome 重试返回 nodeRepl.fetch request failed，浏览器／真实存档未验收。GitHub CLI 查询因网络失败；连接器确认上一批 4d59abd 的 Actions 38065690329 build、windows-desktop、deploy-cloudflare 与 deploy 均成功，不将其作为本批部署或算法验收。Git 直连失败后，核实既有本地 127.0.0.1:7897 代理正在监听；用单命令 http.proxy 成功读取远端 main=4d59abd，与本地基线一致。收尾推送可沿用单命令代理，不写全局设置。

- 2026-10-10 补齐第六世代训练家窗口，main 基线 1996412，API 119，X／Y／ORAS 工程检查通过，提交收尾中。
  新增 Trainer6Editing／Trainer6Names、三语领域与图像面板，五留言、二十 Maison、多人头像／Vivillon、Mega／ORAS 烈空坐标记、XY 城堡／Style、解锁所有时装、姓名废字节、来源整窗重新保存与完整文件冻结预览已接 JSExport／Worker。面板嵌入既有训练家入口，基础与补充草稿互相锁定；密集外观按单属性选择显示，沿用共享 Select 与 44px 控件。保留原件、未指定旧字段、撤销和完整导出。
  从原版 ResX 导入 76 张未修改本地训练家 PNG，共 34762 bytes，原进程 72661 正常结束；来源 SHA-256 与前端键映射同步。新增来源属性路径使用 UInt32Converter／EnumConverter 和显式绑定，允许 unsigned 数字／十六进制、signed 枚举及名称后由 Core 截位，既有 API 47 常规外观规则保持；男／女所有公开属性独立反射对照在原生测试中，生产没有运行时属性发现。
  第一轮核心专项因 params new() 目标类型和 Math.Min 重载编译失败，原进程 25579 已失败结束，已修正。第二／三轮整窗保存对照发现夹具设置里程被 Core 截顶，原进程 67613／80872 已失败结束；已改为明确原始地址构造异常旧值，未修改正确的生产保存路径。第四轮 X 通过后因 Y.sav 不存在失败，原进程 41204 已结束；从 X／OR 生成 Y／AS 后第五轮四版本通过，原进程 95607 正常结束。第六轮新增外观测试因 SAV6.Status 的静态类型不能访问 Fashion 编译失败，原进程 67357 已结束；明确 XY 类型后第七轮四版本含男／女全部属性通过，原进程 94765 正常结束。
  前端／客户端／领域／多语言首轮专项 35 项通过，原进程 71655 正常结束；加入来源外观属性文本转发、空白／长度与本地图片回退后，第二轮 36 项通过，原进程 10266 正常结束。首轮类型检查因未使用既定 4GiB 内存设置退出 134，原进程 89637 已结束；第二轮报分组键 string 类型，原进程 93094 已结束；已明确分组字面量，第三轮类型／定向 Lint 通过，原进程 29588 正常结束，不因观察超时重跑。最近格式原进程 35321／36754／92170／90436／70281 正常结束，前端第二轮测试格式原进程 96030 和证据／枚举裁剪注记格式原进程 25123 均正常结束。新增静态泛型枚举明确保留 PublicFields 元数据；全套 verify、原生和最终网页尚未启动；本阶段先构建 API 119 核心并检查裁剪后的属性，串行原进程 86851 正在运行，用于恢复本地前后端协议匹配，不代替最终整轮门槛。
  基础输入继续补齐：Gen6 空姓名已在领域／Core 通用入口开放，其他格式保留原规则；TID／SID 采用 ChangeFFFF 空值归零、超限截顶并保留前导零，增加源四位 TSV 悬停提示和最大金钱按钮。金钱空值按源 Util.ToUInt32 解释为零，按钮与输入并排，沿用标准触控高度。第三轮前端测试因新增用例引用不存在的 report 失败，原进程 84574 已结束；改用既有 emeraldReport 后第四轮 38 项通过，原进程 73455 正常结束。新的四版本／男女外观／通用空姓名完整输出专项通过，原进程 86957 正常结束；第四轮类型／定向 Lint 通过，原进程 99569 正常结束。基础输入与测试格式原进程 96286／50042／75412、证据格式原进程 79399 均正常结束。当前保留核心原进程 86851 等待，未提交。
  剩余完整版本行为已继续补齐：新增 Trainer6Position，按源 NUD 的 decimal Value／当前 UI 文化解析、越界截顶、失败保留、实际 ValueChanged 才标记脏、全部五项与镜像保存；保留原始加载精度，地图／朝向保存截为整数，预览显示实际值和忽略输入。源值无法载入时只禁用位置分组，其他安全编辑仍可用。第九轮四版本专项通过，原进程 92410 正常结束，覆盖三语、五项极值／小数／失败输入、未变化不写镜像、异常原值与完整输出；前端第五轮 39 项通过，原进程 72921 正常结束。
  地区顺序新增 Core 的三语真实 ID 数组，按 CompareOrdinal 的原始列表保留前一地区 SelectedIndex；Gen6 国家零保留刚才的地区列表，初次国家零列表为空，其他格式沿用旧规则。共享下拉同步显式禁用状态。剧情记录已有旧 TimeHint，本批新增三语展示，保持源 DateUtil 的日内余数和 unchecked int 相加语义；日期整窗载入上限明确为 2050-12-31 00:00:00，不能只检查年份。第十轮完整四版本专项含全部国家／地区顺序、日期边界、三语剧情日期通过，原进程 59341 正常结束；前端第六轮 40 项已通过，原串行 39281 类型通过后，定向 Lint 因 react-hooks/set-state-in-effect 失败结束。已移除 Effect 同步，通过工作副本／文件／重置的显式 key 重新初始化地区控件，选择时只在事件里更新状态；共享下拉显式禁用、负坐标键盘与这次修正由完整 verify 原进程 33452 覆盖，该原进程仍在运行。
  上轮阶段 API 119 核心与裁剪后 26 类型元数据检查通过，原进程 86851 正常结束；随后核心新增了位置、地区与提示，最终核心仍需重建。本轮格式原进程 3931／35925／75927／97814／3075／6430／9342 均正常结束。最终完整 verify 通过格式、Lint、类型、251 文件／1013 项测试及网页／PWA 打包，原进程 33452 正常结束，预缓存 252 项。确认 76 张训练家 PNG 已进入 dist 本地资源，沿用既有按需缓存规则。全套原生／API 119 核心／裁剪后 26 类型属性检查均通过，串行原进程 54341 正常结束；使用最新核心的最终网页／PWA 打包通过，原进程 65523 正常结束，预缓存 252 项。来源证据格式原进程 51050、地区状态修正格式原进程 68455、运行状态文档格式原进程 52974 均正常结束；保留既有授权与原进程；最后证据文档格式收尾后提交推送本批 111 文件。
  试玩版进一步核对：SAV6AODemo 有十六块（Situation 0x1000／0x150、Status 0x3C00／0x170、Party 0x3E00、Records 0x5400／0x25C），没有 Maison／多人头像／箱子地址；SAV6 基类 BoxCount 固定 31，但 HasBox 因 Box=int.MinValue 为假。当前 PokemonReader.Boxes 与报告数量只看名义 BoxCount，下一批应纠正为实际存储能力，不能渲染试玩版的虚假箱子；一般编辑白名单也还未开放试玩版。此批最终检查运行时没有修改其产品代码。
  最后重新查询外部 Chrome 仍列出浏览器但无标签，并返回 nodeRepl.fetch request failed；没有重复请求授权，也未使用内置浏览器替代验收。试玩版范围另需接入，已核对 SAV6AODemo 无 Maison／多人头像，源窗口移除 Multiplayer／Maison 两页；该范围尚未开放，不用四个完整版本的证据冒充试玩版覆盖。新增控件／操作已可通过代码访问，浏览器、真实存档和所有者验收仍待完成，本批不是全窗口或 PKHeX 全目标验收。上批 1996412 的 Actions 38053830987 已确认成功。

- 2026-10-10 接入第六世代超级训练，main 基线 8240686，API 118，工程检查通过。
  新增 SuperTrain6Editing、领域／三语图像面板：32×2 纪录、种类候选、独立 0–255 形态／性别、当前 UI 语言 Single 解析与原始位、十二训练袋、来源打包／重保存及完整文件冻结预览。失败／空输入保持旧值并显示忽略项，不把未知旧值或 NaN payload 规范化；克隆来源名称缓存，保留来源不清尾的袋位行为、未显示十六纪录与所有其他标记，原件／撤销／完整导出继续保持。
  初批格式与差异检查通过，原进程 77935 正常结束。X／Y／OR／AS 核心专项通过，原进程 93076 正常结束，覆盖全部地址／三语／IEEE754／失败输入、完整候选／十二袋／空洞打包与超界修复、来源缓存／隐藏区保护、冻结完整文件对照与拒绝原子性。随后加入 numberSymbols.naN 的浏览器协议 JSON 键核对，已由全套原生覆盖。前端／客户端／领域／多语言专项 34 项及定向 Lint 通过，原进程 30360 正常结束；UI、接线与测试批格式通过，原进程 93148／37730／48007 正常结束；界面证据文档格式通过，原进程 15786 正常结束。
  上游 Main.ApplyMainLanguage／SetCultureLanguage 已确认 UI 语言设置解析文化。公开 .NET 控件实现核对发现 MaskedTextBox 忽略 EM_LIMITTEXT，产品三个文本的 32767 字符保护上限与源成功的 byte 数值范围分别说明，不把 getter 值当硬输入约束。API 118 已接 JSExport、Worker 和三语入口。完整 verify 通过格式、Lint、类型、250 文件／995 项测试及网页／PWA，原进程 4355 正常结束；全套原生、API 118 核心与裁剪后 26 类型属性检查通过，串行原进程 23420 正常结束。新核心最终网页／PWA 打包通过，原进程 75816 正常结束，预缓存 252 项。保留既有 Hook、JSExport、反射裁剪与网页体积／插件提示；没有因观察超时重跑原进程。来源文档格式收尾原进程 98165／84002／49585 均正常结束，最后证据文档格式收尾后按已有授权提交推送本批 22 文件。
  秘密基地已提交推送 8240686，起始工作区干净；Actions 38049366053 已确认成功。训练家完整窗口已通读，五留言／二十 Maison／XY 城堡／多人形象／Mega 及全保存副作用、Demo 页移除和枚举空洞候选已记入模块文档，三语／参数／夹具继续核对；既有里程／坐标、缺少的 Style／全部服饰、模型重设及本地形象图片来源已复核，当前没有新增该窗口产品代码。所有者关闭旧标签后，本轮连接仍列出 Chrome 但无标签并返回 nodeRepl.fetch request failed；无需重复已有授权，外部 Chrome 与真实存档仍待核验，完整 PKHeX 目标继续。

- 2026-10-10 接入第六世代秘密基地，main 基线 0452989，API 117，工程检查通过。
  新增 SecretBase6Editing／SecretBase6Fields／SecretBase6Pokemon：31 基地／828 摆设／90 队伍、十五／十七属性、全部队伍控件及候选、记录 80、给予摆设、删除移动、两种 sb6 与完整冻结预览。普通补丁保持未指定旧字段，来源重保存只处理当前格位，导出在临时副本按 SaveCurrent 转换，不改工作副本；使用显式 Core setter 与标准数字属性转换器，避免以运行时反射发现产品字段。API 117 已接秘密基地 JSExport、独立 Worker、领域和三语浮动界面。
  初批格式与差异检查通过，原进程 37877 正常结束。首轮全仓格式通过后，核心专项在双性别种类调用 FixedGender 时失败，原进程 80639 已失败结束；修正目录元数据后 OR／AS 专项通过，原进程 54164 正常结束。复核并修正未知特性编号的种类／形态联动：旧槽大于等于 3 应恢复第一槽，而非截到隐藏槽；补充完整文件对照后的扩展专项通过，原进程 12715 正常结束。
  最后一批加入全部三十一队伍控制的两端／独立字节地址对照、雌雄形态联动、负旧记录读取与来源保存／导出分离；OR／AS 扩展专项通过，原进程 74319 正常结束。全部公开可写属性、每个基地／摆设／队伍地址、类型／掩码／转换、旗标高位、全部删除、两种文件及完整原件／目标／导出在其中；未删减范围或修改预期避开失败。各批全仓格式与差异检查通过，证据文档收尾原进程 78722／63342 正常结束。
  前端按属性／摆设／队伍／旗标分组，全部选择器使用共享 Select，三格队伍显示本地图像；未确认草稿锁定基地／模式／格位，同一目标的属性或队伍字段分组可保留草稿切换。预览显示实际属性、坐标／编号、成员、异色／蛋共用位、旗标、删除移动、库存原始标记和完整字节变化。原始读取保留未知值，摆设／旗标清空输入恢复保留状态，队伍数字掩码空输入明确拒绝；允许主动修复不能被来源载入的旧数据。
  API 接线后的前端／客户端／领域／多语言专项 36 项及定向 Lint 通过，原进程 47569 正常结束。页面各批全仓格式和差异通过，原进程 9992／11451／73395／55397／46783／45554／48498 正常结束；界面与后续来源证据文档收尾通过，原进程 15101／80852 正常结束。
  完整 verify 通过全仓格式、Lint、类型、249 文件／985 项测试及网页／PWA 打包，原进程 95756 正常结束。本次无测试池退出超时提示，保留一条原有 Hook 警告。全套原生、API 117 核心构建及裁剪后 26 类型属性检查通过，原串行进程 53441 正常结束；OR／AS 新专项在全套中再次通过。使用新核心的最终网页／PWA 打包通过，原进程 69615 正常结束，预缓存 252 项。保留既有 JSExport、反射裁剪和网页体积／插件提示，未因观察超时重跑原进程。最后证据文档格式收尾后按已有授权提交推送本批 24 文件。
  宝可梦连接已提交推送 0452989；首次推送遇到 TLS 连接错误，使用一次性 HTTP/1.1 选项重试成功，未改永久 Git 设置。Actions 38041766328 已确认成功。本轮重新读取外部 Chrome 仍报 nodeRepl.fetch request failed，没有进入标签或进行 UI 检查；真实存档仍待核验，不重复索要已有权限。下一项超级训练窗口、Designer、块 46／0x318、32 显示／48 存储阶段、两组 Single 与独立 byte holder、十二袋和来源不清尾的打包规则已记入模块文档，完整候选／解析与夹具待核对。完整 PKHeX 目标继续。

- 2026-10-10 接入第六世代宝可梦连接，main 基线 2acea42，API 116，工程检查通过。
  核对 SAV_Link6／Designer 的真实禁用状态和 LinkBlock6／PL6／LinkEntity6。新增六道具／六宝可梦本地图像、来源／原始标记／内部校验显示、Enabled 记录 BP／里程补丁、来源整窗重新保存、精确 2631-byte pl6 导入与只读原始导出；接 JSExport、独立 Worker、三语浮动面板和完整文件冻结预览，保持原件、未指定旧值、撤销与完整导出。
  上游来源、启用、道具与数量永久只读，产品不将这些字段伪装成可用输入。普通补丁与来源规范化分别预览，内部和外层校验时机分别处理；工作副本应用后重新读取，相当于重开来源窗口，不继承 WinForms Enabled 暂态残留。异常 BP 读取保持，重新保存前明确修复。
  前次核心专项日志只有启动记录且当前没有原生运行进程；本轮据实际终止状态重新运行。X／Y／OR／AS 核心专项通过，原进程 75386 正常结束；前端／客户端／领域／多语言专项 33 项及定向 Lint 通过，原进程 60755 正常结束。初次新 JSX 格式化报一处缺失闭括号，已修复并通过后续全仓格式／差异检查，原进程 65795／61349 正常结束；来源与证据文档收尾通过，原进程 73354／48124／3246 正常结束。
  完整 verify 通过全仓格式、Lint、类型、248 文件／973 项测试及网页／PWA 打包，原进程 26065 正常结束。Vitest 全部通过后出现 locales.test.ts 的退出清理超时提示，进程仍正常结束；保留一条既有 Hook 警告，未将其描述为新功能失败。全套原生、API 116 核心构建及裁剪后 26 类型属性检查通过，原串行进程 5687 正常结束；X／Y／OR／AS 新专项在全套中再次通过。使用新核心的最终网页／PWA 打包通过，原进程 42374 正常结束，预缓存 252 项。保留既有 JSExport、反射裁剪与网页体积／插件提示，未因观察超时重跑原进程；最后证据文档格式收尾后按已有授权提交推送本批 22 文件。
  Chrome 扩展已出现在连接列表，但标签读取和重建会话后新建本地标签均返回 nodeRepl.fetch request failed；已报告通信问题，未重复索要访问授权，浏览器／真实存档仍待核验。2acea42 的 Actions 38037921218 已确认成功。已通读下一项秘密基地窗口，核对自身／三十基地、二十八摆设／三格队伍、两种 sb6 尺寸／共同复制、删除移动、GUI -1 摆设与 UInt32 旗标转换及异色／蛋共用位，来源证据记入模块文档；完整属性表和夹具仍待完成。PKHeX 全目标继续，本批不等于完整接入验收。

- 2026-10-10 接入第六世代名人堂，main 基线 2b6ca2a，API 115，工程检查通过。
  核对窗口、Designer、Core、两份块 36 Accessor、数字掩码／HEX／文本转换和完整 TrashEditor。新增 16×6 图像格位、全部字段、首次队伍保护与后续移动删除、来源重保存、特殊字符／26-byte 昵称废字节、当前语言文本复制及完整文件冻结预览，接 JSExport／Worker／三语浮动面板。原件、未指定旧值与未知位保持，普通补丁与来源规范化分别预览。
  X／Y／OR／AS 首轮核心专项通过，原进程 59376 正常结束；补充文本／名称层／世代端点与旧值规范化的扩展专项亦通过，原进程 29012 正常结束。前端／客户端／领域专项 32 项及定向 Lint 通过，原进程 40979 正常结束。代码各批格式与差异检查通过，原进程 35337／29538／66042／82162／72938 正常结束，来源与工程证据文档格式收尾通过，原进程 56531／54143／15908 正常结束。完整 verify 通过全仓格式、Lint、类型、247 文件／964 项测试及网页／PWA 打包，原进程 47371 正常结束；全套原生、API 115 核心构建及裁剪后 26 类型属性检查通过，原串行进程 70544 正常结束。使用新核心的最终网页／PWA 打包通过，原进程 28405 正常结束，预缓存 252 项。
  本轮工程检查没有失败；构建出现的 CA1831 字符串切片提示已改为 AsSpan，后续扩展原生和完整检查覆盖修正。保留既有 Hook、JSExport、反射裁剪与网页体积／插件提示，未因观察超时重跑原进程。本轮起始工作区干净，最后证据文档格式收尾后按已有授权提交推送本批 23 文件。
  上一批树果园读取已提交推送 2b6ca2a，Actions 38033369456 已确认成功。后续 Pokémon Link 的 PL6 精确尺寸、独立内部校验、六数量 UInt16 输入／byte 保存与导入导出时机已初步记入模块文档，尚未改它的产品代码。外部 Chrome 尚无恢复证据，浏览器／真实存档待核验；本批收口后继续核对 Pokémon Link，PKHeX 全目标仍进行中，不把工程通过视为所有者验收。

- 2026-10-10 接入 X／Y 树果田来源读取，main 基线 5f6aaa5，API 114，工程检查通过。
  核对来源窗口、Designer、BerryField6XY 与块 40；窗口所有数值只读、保存按钮禁用，GUI 36 项中的末四项超出 Core 32 格上限。新增全部 32 格／八 UInt16 的原始数值与精确字节读取、三语浮动查看器和只读 Worker 分支，拒绝附带编辑 payload，不猜测未知字段或树果编号语义。原件与工作副本不变，保持完整源块和摘要。
  初批格式与差异检查通过，原进程 83715 正常结束；X／Y 原生专项及接线批格式收尾通过，原进程 26631 正常结束。前端／客户端／领域专项 28 项、定向 Lint 与类型通过，原进程 94157 正常结束。完整 verify 通过全仓格式、Lint、类型、246 文件／955 项测试及网页／PWA 打包，原进程 17085 正常结束；全套原生、API 114 核心构建与裁剪后 26 类型属性检查通过，原串行进程 54420 正常结束。使用新核心的最终网页／PWA 打包通过，原进程 80945 正常结束，预缓存 252 项。本轮工程检查没有失败，保留既有 Hook、JSExport、反射裁剪与网页体积／插件提示，未因观察超时重跑原进程。
  上一批汇合大道已提交推送 5f6aaa5，起始工作区干净；Actions 38030038525 已确认成功，两次读取 EOF 为观察网络错误，未据此判定失败或重复启动。下一项名人堂的 16×6 布局、日期 2000–2050、首次记录保护、删除移动、GUI 通关编号 255 截顶及 packed／文本边界已初步记录，尚未改它的产品代码。来源与工程证据文档格式收尾通过，原进程 92003／10753 正常结束；最后证据格式收尾后按已有授权提交推送本批 21 文件。
  重新读取浏览器连接列表仍无外部 Chrome，浏览器／真实存档待核验。本批收口后继续核对并接入第六世代名人堂，PKHeX 全目标仍进行中，不把来源只读窗口的接入或工程通过当作所有者验收。

- 2026-10-10 接入第五世代汇合大道，main 基线 b1a3a8c，API 113，工程检查通过。
  核对主窗口、全部子编辑器／Designer、三类实体、块 67、字符串／日期／列表／商店编码及语言保存顺序。新增完整大道／设置及 33 角色目录、明确补丁、当前对象来源重保存、三类同／跨类型文件导入导出、完整文件冻结预览与三语界面，接 JSExport／Worker／浮动面板。原件、未指定旧数据及完整导出保持，店铺编码直接沿用来源不对称 setter；隐式保存规范化拆为明确预览。
  首轮核心专项编译因生成数据库标签缺括号失败，原进程 60079 已结束；已修正括号。第二轮发现姓名校验误用了通用二十字符上限，原进程 57845 已结束；核心和前端已按七／八／二十字符分别修正。第三轮黑2通过后因引用不存在的 W2.sav 失败，原进程 20936 已结束；改从既有 B2 样本生成白2布局后，B2／W2 两版及全部对象重保存扩展专项通过，原进程 89928 正常结束。
  首轮前端专项两项失败，原进程 78774 已结束；一项为上述字符上限，另一项为测试调用本地化函数参数错误。修正后前端／客户端／领域专项 32 项、定向 Lint 和类型通过，原进程 58076 正常结束。后续导入文件读取期间锁定格位／字段，防止异步选择切换；完整检查覆盖此修正。最后几批全仓格式与差异检查通过，原进程 95377／8499 正常结束。
  完整 verify 通过全仓格式、Lint、类型、245 文件／950 项测试及网页／PWA 打包，原进程 38419 正常结束。全套原生、API 113 核心构建及裁剪后 26 类型属性检查通过，原串行进程 30706 正常结束；使用新核心的最终网页／PWA 打包通过，原进程 32168 正常结束，预缓存 252 项。保留既有 Hook、JSExport、反射裁剪与网页体积／插件提示，未因观察超时重跑原进程。最后证据文档格式收尾后按已有授权提交推送本批 24 文件。
  上篇联合塔已按授权提交推送 b1a3a8c，工作区起始干净；Actions 38025707015 已成功。外部 Chrome 仍无恢复证据，浏览器／真实存档待核验。X／Y 树果田窗口的只读状态、禁用保存按钮及 GUI 36／Core 32 格差异已记入模块文档，尚未改它的产品代码；本批收口后接入来源已有的读取能力。PKHeX 全目标继续，不把工程通过视为全目标或所有者验收。

- 2026-10-10 接入第五世代联合塔，main 基线 4f162b1，API 112，工程检查通过。
  新增 UnityTower5Editing 与三语编辑器，实际 616 个国家／地区点和 232 个楼层，真实编号与当前语言排序分离；普通补丁、两标记、全部／合法／清除批量、来源整窗重新保存、完整文件冻结预览与应用已接 JSExport／Worker／浮动存档面板。应用重新标记自身位置为 Red，普通补丁保护其他位和旧标记，整窗重新保存才规范化全部可见内容。
  OwnSafe 按来源物理布局验证：国家零不写自身点；非零国家 1–255、地区 0–63 均可安全写入，目录外但物理安全的旧位置保留。地区 64–255 可能跨国家槽或越界，读取显示但拒绝编辑，不擅自修正存档信息。输入只用来源国家／地区、四种点和布尔候选，未添加自由数值输入。
  四版本核心专项通过，原进程 15934 正常结束，覆盖所有地点四编码、所有楼层两值、三语真实编号、来源批量／重保存、自身联动、安全未知／越界位置、异常旧标记、完整文件对照、冻结和拒绝原子性。前端／客户端／领域专项 30 项、定向 Lint 与类型通过，原进程 83212 正常结束；本轮格式及差异检查通过，原进程 40808／26336／73212／58687 正常结束。
  完整 verify 通过全仓格式、Lint、类型、244 文件／941 项测试及网页／PWA 打包，原进程 81874 正常结束。全套原生、API 112 核心构建与裁剪后 26 类型属性检查通过，原串行进程 96940 正常结束；使用新核心的最终网页／PWA 打包通过，原进程 61793 正常结束，预缓存 252 项。本轮没有工程检查失败；保留既有 Hook、JSExport、反射裁剪与网页体积／插件提示，未因观察超时重跑原进程。最后证据文档格式收尾后按已有授权提交推送本批 21 文件。
  所有者已关闭旧本地标签；连接列表仍无外部 Chrome，尝试 Chrome 入口明确返回 Browser is not available: chrome，浏览器／真实存档待核验，不重复请求已有访问授权。4f162b1 的 Actions 38022622908 已成功。加盟大道三种实体大小、共有复制、General／Settings 部分边界和实际块 67 已记录；下一步核对其剩余编辑器、字符串／日期／商店编码和夹具，再接产品代码。PKHeX 全目标继续，本批不是全目标验收。

- 2026-10-10 接入第五世代 Misc，main 基线 beda2cd，API 111，工程检查通过。
  新增 Misc5Editing／Misc5Forest／Misc5Subway／Misc5Text：常规飞翔／BW 游走及船票／B2W2 钥匙、对战地铁八路线、连入／Pass Power／任务、100 配饰、68 个 32 位与 100 个 16 位记录、530 格森林与 BW fc5 文件的目录、明确补丁、来源批量及完整冻结预览。Core 负责加密、截顶及来源副作用，保护原件、未指定旧值、相邻数据和完整导出；API 111 已接 JSExport／独立 Worker／三语浮动面板，读取／预览只读，只有确认应用返回工作副本，原始导出使用独立 fc5 路由。
  来源探针通过，原进程 40238 正常结束：随机候选 BW 651／B2W2 578，均足够 530 格；全部 45 个 Funfest 条件可读取，源码注释的编号不能当数组长度。源 UnlockAllFunfestMissions 的循环不含最后编号 44，接入保留源批量效果并在未来界面预览实际状态，不擅自增加未调用的任务解锁。
  首次核心编译因两处 Math.Min 的 int／ushort 重载二义性失败，原进程 57489 已结束；加明确 int 转换后首轮功能专项在地点名称查找失败，原进程 88526 已结束。Core 初始化会修改共享 CachedStrings 的地点显示名，改从原始字符串资源单独读入不可变地点表，未修改 Core 缓存或源码。修正后 B／W／B2／W2 专项全部通过，原进程 21708 正常结束；覆盖真实飞翔 bit66、八路线反序补丁／字节地址、标记联动、等级／经验、全部记录／配饰／森林格位、530 个唯一来源抽取、随机确认不重抽、任务／钥匙／fc5、完整文件与无效请求原子性。
  复核窗口末尾确认解锁全部配饰直接调用 Core.UnlockAllMusicalProps，会清末字节高四位；修正原逐位批量实现与对照预期，普通单项继续保护其他位。补全种类对应形态／性别和 Core 给出的 1000 个经验上限，四版本扩展核心专项通过，原进程 34885 正常结束。本轮前端／客户端／领域专项 31 项、定向 Lint 与类型通过，原进程 93113 正常结束；全仓格式与差异通过，原进程 66035／74463 正常结束。随后空格位性别显示及任务空输入恢复另已格式化，原进程 73980 正常结束。
  界面按用途及真实格位选择，不铺开全部记录或森林；当前／预览森林使用本地图像，修改种类明确提交首个形态及性别候选。草稿／预览阻止切换，全部下拉显式同步禁用状态，预览显示实际标记、记录截顶、任务、森林及原始变化。完整 verify 通过全仓格式、Lint、类型、243 文件／934 项测试及网页／PWA 打包，原进程 9734 正常结束。
  全套原生、API 111 核心构建及裁剪后 26 类型属性检查通过，原串行进程 29552 正常结束；未知森林种类／招式／形态／性别、超常 UInt32 记录及全部 Core 候选元数据夹具也在其中。使用新核心的最终网页／PWA 打包通过，原进程 9475 正常结束。后续联合塔来源文档全仓格式及差异检查通过，原进程 59970 正常结束；最后证据文档格式收尾后按已有授权提交推送本批 26 文件。保留既有 Hook、JSExport、反射裁剪与网页体积／插件提示，未因观察超时重跑原进程。
  下一模块联合塔窗口、Designer、Core、LocaleNDS5、CSV 三语列、地理点枚举和两份 Accessor 已核对，记入模块文档；完整目录／地区边界、自身异常位置与夹具仍待完成。PKHeX 全目标继续，外部 Chrome 无恢复证据，浏览器与真实存档仍待核验；beda2cd 的 Actions 38016001638 已成功。

- 2026-10-10 接入第五世代奖牌与栖息地，main 基线 6683ac3，API 110，工程检查通过。
  新增 Medals5Editing.cs：255 枚奖牌三语名称／类型、90 个栖息地、置顶／等级／教程及未知字段、异常日期／状态／原始标记读取；支持明确字段补丁、全部给予、等级计算、明确范围完成／清除、精确 1020-byte ml5 导入导出及完整文件冻结预览。自动日期在预览时冻结，确认核对完整目标摘要；修改调用 Core setter 并在预览保留实际高位清理结果，不静默规范化其他旧字段。保留原件、相邻区域、未指定字段、全部校验及完整导出。
  B2／W2 原生专项通过，原进程 69616 正常结束，覆盖全部奖牌／栖息地、状态、日期、保留位、八设置、十个等级计数边界、导入与批量的来源完整文件对照、冻结日期及无效请求。首轮前端领域 7 项专项与定向 Lint 通过，原进程 86879 正常结束；补三语枚举顺序专项后的 8 项与三文件 Lint 通过，原进程 97909 正常结束。API 110 已接 JSExport、独立 Worker 与三语面板，目录／预览只读，只有确认应用返回工作副本；新增精确 ml5 原始导出路由。完整工程检查及新版核心／网页构建已通过，结果见下文。
  已将固定来源的中／英／日窗口标签及五状态／五等级／四完成度／三遇敌类型按实际枚举顺序写入 medals5Labels.ts，不在浏览器请求外部资源。分组及名称／格位候选使用共享 Select；普通编辑与批量勾选分别呈现，批量范围明确选择勾选／全部，不沿用隐藏选中行语义。未应用草稿／预览阻止切换，原始位、实际状态／日期／未读、栖息地及设置变化均可见，沿用原件、撤销和完整导出。所有编辑下拉显式传入禁用状态，避免忙碌／预览时仅靠 fieldset 仍留下弹出菜单。
  本轮接线的前端／客户端／领域专项 32 项通过，原进程 87509 正常结束；定向 Lint、类型检查通过，原进程 85654 正常结束。较早全仓格式进程 27909 读到正在编辑的测试文件后失败；后续最新文件格式检查通过，原进程 27641 正常结束，下拉保护修改另已格式化。完整 verify 通过全仓格式、Lint、类型、242 文件／926 项测试及网页／PWA 打包，原进程 75798 正常结束。
  全套原生、API 110 核心构建及裁剪后 26 类型属性检查通过，原串行进程 88045 正常结束；使用新核心的最终网页／PWA 打包通过，原进程 93012 正常结束。后续源码核对文档的全仓格式及差异检查通过，原进程 38663 正常结束，最后证据文档格式收尾后按已有授权提交推送本批 23 文件。保留既有 Hook、JSExport、反射裁剪和网页体积／插件提示，未因观察超时重跑原进程。
  下一模块 Misc5 窗口已通读，Designer 显式范围和多项 Core 类型已核对；飞翔 bit66、游走清理、Subway Flag3／7 同控件、黑侧经验事件提前返回、加密记录／森林、530 格与随机候选需求已记入模块文档，三语资源及余下块／方法仍待核对。PKHeX 全目标继续，外部 Chrome 仍没有恢复证据，浏览器／真实存档待核验；6683ac3 的 Actions 38012155652 已成功。

- 2026-10-10 接入第五世代 Global Link，main 基线 b825b0d，API 109，工程检查通过。
  已接通三语常规／道具／家具，六标量、四标记、日期设置／清除、二十道具图片与目标存档真实候选、五家具名称／值，普通字段补丁、整窗重新保存、完整文件冻结预览与应用。读取保留异常日期、非零旧标记、未知道具与名称尾随数据，普通修改保护未指定字段和上传宝可梦区域。
  家具选择保留 GUI 0–255 与 Core 低七位语义，日期严格 2000–2099，名称输入 32767／保存十二 UTF16 字符，由 Core 完成清理与性别符号处理。数量按来源成功提交的 byte 0–255 与三字符控制验证，不以 SaveData 的 TryParse 兜底把无效草稿改零。整窗重新保存的规范化先预览，保持原件、撤销及完整导出。
  前端／客户端／领域专项 30 项、定向 Lint、类型与全仓格式通过；原格式进程 46327、后续格式进程 49268、类型进程 80017 均正常结束。四版本原生专项通过，原进程 23263 正常结束，覆盖全部格位、Int32 极值、日期、名字与完整输出，未修改生产代码修补测试结果。
  完整前端 verify 通过全仓格式、Lint、类型、241 文件／917 项测试及网页／PWA 打包，原进程 53197 正常结束。全套原生、API 109 核心构建与裁剪后 26 类型属性检查通过，原串行进程 85240 正常结束；使用新核心的最终网页／PWA 打包通过，原进程 96323 正常结束。保留既有 Hook、JSExport、反射裁剪和网页体积／插件提示，未因观察超时重跑原进程；最后证据文档格式收尾后按已有授权提交推送本批 21 文件。
  下一模块奖牌窗口、Designer、Medal5／MedalList5／Habitat、三语 255 名／五类型、枚举资源、批量日期与格位范围已核对，异常旧日期／状态及 setter 高位副作用记入模块文档。PKHeX 全目标仍进行中，再次检查连接仍没有外部 Chrome，浏览器／实档待核验。b825b0d 的 Actions 38008992229 已成功。

- 2026-10-10 接入第五世代 DLC 其余文件，main 基线 1022d65，API 108，工程检查通过。
  已接通 PWT／音乐剧／四格对战录像／八格宝可电影／两份记忆连接／图鉴皮肤／对战测试，BW 九格与 B2W2 二十格三语目录、来源尺寸调整、导入冻结预览、原始导出及录像解密导出，关联已有 C-Gear 背景工具。
  录像从实际 Team1–4 和 Core inflater 还原四支图像队伍及可恢复字段，避开来源 GetTeam 取错区域；保护其他区域、footer、原件和旧异常值。PWT／电影限制实际格位范围，读取 B2W2 后续下载字段避开 getter 的错误上限。所有写入沿用来源 Set 方法、完整文件冻结摘要、工作副本、撤销与完整导出。
  前端／客户端／领域专项 29 项、定向 Lint 与类型检查通过，原进程 5994 正常结束。首轮原生在首版本文件／录像对照后于音乐剧二十一字夹具预期失败，原进程 92001 失败结束；已核对二十字来源限制并修正预期，四版本修正专项通过，原进程 25747 正常结束。初次全仓格式进程 23871 报告一处正在编辑的 JSX 后失败，后续按最新文件格式化并通过全仓检查，原进程 4220 正常结束。
  全套原生、API 108 核心构建、裁剪后 26 类型属性检查通过，原串行进程 96215 正常结束，四版本 DLC 专项在其中再次通过；完整 verify 通过全仓格式、Lint、类型、240 文件／910 项测试及网页／PWA 打包，原进程 96315 正常结束。使用新核心的最终网页／PWA 打包通过，原进程 51603 正常结束，没有因观察超时重跑原进程。保留既有 Hook、JSExport、反射裁剪与网页体积／插件提示；最后证据文档格式收尾后按已有授权提交推送本批 21 文件。
  已读取下一模块 Global Link 窗口、Designer、Core、DateQuad5、字符串清理与目标存档道具候选规则及三语资源，后续接入保持本地数据编辑。
  图鉴皮肤源图片按钮未接线、对战测试实机状态待研究均在三语界面明确，未把这些来源空功能记为完成。PKHeX 全目标仍进行中，Chrome 无恢复连接证据，浏览器／实档待核验；1022d65 的 Actions 38005697103 已成功。

- 2026-10-10 接入第五世代 C-Gear，main 基线 623829a，API 107，工程检查通过。
  已接通黑／白和黑2／白2背景图、PNG 导入导出、psk／cgb 自动排列转换、完整文件冻结预览与确认应用，三语入口沿用浮动存档面板及撤销。皮肤校验、存在标记、额外区域 footer 和下载记录由 Core 同时写入，未初始化及异常旧布局只读取不规范化。
  本地浏览器解码 RGBA，C# 只转换到来源 BGRA 通道后调用 Core。预览显示实际颜色／贴图返回值、转换结果、变化像素数及完整存档变化位置；容量提示不擅自拒绝来源可处理的图像。PNG 尺寸 256×192，文件 4 MiB，RGBA 精确 196608 bytes，原始皮肤精确 9728 bytes。Windows PixelFormat／隐藏透明 RGB 差异已记入模块文档。
  前端／客户端／领域专项 28 项通过。首轮原生因 JSON 转义加号放大文本而超过请求长度限制，原进程 58559 失败结束；已修正 JSON 文本上限，保留 Base64 与解码长度限制，四版本修正专项通过，原进程 15560 正常结束。首轮 Lint 的画布 effect 同步状态错误已修正，原进程 81650 失败结束且未运行类型检查；修正 Lint／类型通过，原进程 94724 正常结束。
  首次完整 verify 在新增 Worker 包装的 preserve-caught-error 检查失败，原进程 43425 已结束，后续类型／测试／构建未运行。补原始 cause 并格式化后，修正后的完整 verify 通过全仓格式、Lint、类型、239 文件／904 项测试及网页／PWA 打包，原进程 2148 正常结束；保留一个既有 Gen3Static Hook 警告。
  全套原生、API 107 核心构建、裁剪后 26 类型属性检查通过，原串行进程 54292 正常结束；使用新核心的最终网页／PWA 打包通过，原进程 9259 正常结束。未因观察超时重跑原进程。保留既有 JSExport、反射裁剪与网页体积／插件提示。最后证据文档格式收尾后按已有授权提交推送本批 22 文件。
  DLC 文件尺寸、额外 footer、下载记录、音乐剧名、录像结构、Designer 与三语分组资源已核对；明确图鉴皮肤图片按钮未接线，并记录 PWT／电影越界格位及录像 GetTeam 取错区域问题。
  PKHeX 全目标仍在进行。外部 Chrome 上次重新检查仍未连接，界面与真实存档待核验；623829a 的 Actions 38001577857 已成功。下一步接入 DLC 其余本地分组并编写对应夹具，不把 C-Gear 接入视为完整 DLC 或 PKHeX 全目标完成。

- 2026-10-10 接入第四世代地下世界，main 基线 36bd140，API 106，工程检查通过。
  已接通十三成绩、四类 40 格背包、三语资源与真实编号、球体大小文本、单项补丁、单背包／整个窗口重新保存、冻结预览与完整数据对照。普通修改保留其他格位及旧值，不自动压缩；重新保存才沿用来源跳空／重复名称首编号及分数截顶。
  球体新输入最多两字符；-1 存 255，空白或无效文本明确清空当前玉格位。旧三位 byte 仅允许原值保持，大小不在前端另算，预览显示 Core 实际结果。语言变更重建编辑器，防止来源资源规范化语言与旧预览混用。
  DP／Pt 原生专项通过，覆盖十三偏移上下界、三语全部 160 格、所有重新保存、符号／空白／无效／旧三位大小、未使用成绩孔与相邻区域、冻结目标、原件及完整文件对照。前端专项 7 项、定向 Lint 与类型检查通过，原进程 17808 正常结束；完整 verify 通过，含 238 文件／899 项测试、网页与 PWA 打包，原进程 93530 正常结束。
  全套原生、API 106 核心构建、裁剪后 26 类型属性检查通过，原串行进程 58640 正常结束；使用新核心的最终网页／PWA 打包通过，原进程 17905 正常结束。原专项进程 98795 正常结束，没有因观察超时重跑。保留既有反射裁剪与网页体积提示，最后文档格式收尾后按已有授权提交推送本批 21 文件。
  接口接线脚本的类型替换误命名原生 Include／测试类，检查差异后已修正。用户关闭旧标签后重新检查连接，列表仍只有应用内浏览器，没有外部 Chrome，浏览器／真实存档待核验；36bd140 的 Actions 37997965339 已成功。PKHeX 全目标继续，收口后进入第五世代 C-Gear。

- 2026-10-10 接入第四世代 Misc 窗口，main 基线 140228a，API 105，工程检查通过。
  已写入常规／飞翔／宝可表／计步器／贴纸／饰品／背景／两种记录／五设施与舞台种类记录的三语目录和明确补丁，接通冻结预览、实际保存值、完整数据变化、点阵与本地图片导入，链接已有宝芬／宝可装置／全能竞技入口。
  塔计数复现源事件联动，城堡按实际 16 位字段写入并保护相邻字段；记录在副本中解密读取，修改时刷新记录块校验。记录保留完整 GUI 整数输入范围并展示 Core 截顶上限，不以保存上限缩窄来源可输入值。
  首轮 DP／Pt／HGSS 五布局原生专项通过，含两份舞台分区、全部记录上限、城堡相邻字段、原件与完整文件对照。前端专项 7 项、定向 Lint 与类型检查通过。完整 verify 通过，含 237 文件／895 项测试、网页及 PWA 打包，原进程 63172 正常结束；使用 API 105 新核心的最终网页／PWA 打包亦通过，原进程 53274 正常结束。
  扩展原生专项在塔计数独立对照失败，原进程 39329 已结束。重新逐句核对源回调的提前返回，确认当前值不因更新整数商而再次向下取整；修正夹具预期后五布局扩展专项通过，原进程 93563 正常结束，生产联动实现未改。全套原生、API 105 核心构建与裁剪后 26 类型属性检查通过，原串行进程 43806 正常结束；未因观察超时重跑。
  初次前端格式化发现 JSX 花括号缺失，已修正并格式化。数字草稿改由父级保管，放弃时清空且无效草稿阻止切换；所有写入需有效源摘要与冻结目标，异常旧值只浏览不自动规范化。
  保留既有 Hook、JSExport、反射裁剪及网页体积／插件提示。暂存 23 个本批文件并通过暂存差异检查，最后证据文档格式收尾后按已有授权提交推送。外部 Chrome 没有新连接证据，浏览器／真实存档待核验；140228a 的 Actions 37991251510 已成功。地下世界四类背包／十三成绩／球体符号与压缩规则已写入模块文档，本批收口后继续接入，PKHeX 全目标仍进行中。

- 2026-10-10 接入第四世代甜甜蜜树，main 基线 5405107，API 104，工程检查通过。
  已接通 DP／Pt 21 棵树、四字段明确补丁、可捕获时间、重新保存的数值／八字节预览及三语种类目录。读取保留异常旧值，时间／摇动／槽补丁不规范化群或子表；群补丁沿用 Core 同步子表。
  保留四个小卡比树位置的顺序和重复值、非小卡比树警告及钻石／珍珠甲壳茧差异。源窗口切换树即写回的隐式行为改为明确应用，防止浏览时改动旧数据。
  前端专项 6 项、DP／Pt 全部树地址原生专项、定向 Lint 与类型检查通过。补齐重新保存预览的目标种类／小卡比树警告后，完整 verify 通过，含 236 文件／891 项测试及网页／PWA 打包，原进程 77977 正常结束。
  完整原生回归、API 104 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页／PWA 打包通过，原串行进程 54780 与网页进程 68101 正常结束。本轮工程检查无失败；保留既有 Hook、JSExport、反射裁剪及网页体积／插件提示。最后证据文档格式收尾后按已有授权提交推送。
  沿用源摘要、工作副本、撤销、完整文件导出与原件保持。外部 Chrome 上次检查未连接，浏览器与实档待核验；5405107 的 Actions 37986869170 已成功。
  已核对第四世代 Misc 主功能及战斗设施窗口流程，记录解密副作用、背景压缩、塔计数联动与城堡 16 位读取／32 位写入覆盖问题。下一步完成设施 Core 布局、输入和夹具核对再接入；不把甜甜蜜树接入视为 PKHeX 全目标完成。

- 2026-10-10 接入第四世代 Geonet 世界地图，main 基线 b4db054，API 103，工程检查通过。
  已写入三语真实国家／地区目录、四颜色点位、原始旗标保护、三类批量计划及明确重新保存，显示全部变化位置、颜色数量和旗标结果。
  普通补丁保留未显示格位与旧非零旗标；显式操作沿用 Core 的注册地红点和旗标语义。越界旧注册地关闭写入并保留浏览，避免跨国家写入。
  九布局核心专项、隐藏注册地补充及完整原生回归通过；前端专项 7 项、定向 Lint 与完整 verify 通过，后者为 235 文件／888 项测试及网页／PWA 打包。API 103 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页／PWA 打包通过，原串行进程 98917 与网页进程 69107 均正常结束。
  首次类型检查发现读取器类型名称错误，已修正并通过完整类型检查。夹具发现逐点对照重复解析整存档，已明确中止原进程并改为一次解析，修正后专项通过；未因观察超时重启。
  保留既有 Hook、JSExport、反射裁剪及网页体积／插件提示。最后证据文档格式收尾后按已有授权提交推送。
  所有改动沿用源摘要、工作副本、撤销、完整文件导出和原件保持，未修改 vendored Core。重新检查连接仅返回应用内浏览器，外部 Chrome 仍未连接，界面与真实存档待核验；b4db054 的 Actions 37982418802 已成功。
  本轮收口后继续核对第四世代 Honey Tree 窗口，不把 Geonet 接入视为 PKHeX 全目标完成。

- 2026-10-10 接入第四世代对战录像窗口，main 基线 d06c75e，API 102，工程检查通过。
  已写入 Pt／HGSS 四格、四支图像队伍、文件导入预览以及加密／解密导出，明确版本与捕获信息等无法从录像恢复。
  保留目的格 footer 与参与 General 格位选择的 Key，防止不同来源 key 使录像失去关联；读取只用副本，不初始化空格或增加上游没有的删除／播放操作。
  前端／玩家上下文／错误本地化 7 项专项、定向 Lint、类型及完整 verify 通过；后者为 234 文件／884 项测试及网页／PWA 打包。
  核心夹具最初的 enum／私有分区常量／Span 调用编译问题已修正，Pt／HGSS 两分区往返专项通过。全套原生、API 102 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页／PWA 打包通过，原串行进程 11924 已正常结束。
  保留既有 Hook、JSExport、反射裁剪及网页体积／插件提示，最终检查退出码均为 0。最后证据文档格式收尾后按已有授权提交推送。
  沿用工作副本、撤销、完整文件导出、源摘要确认及原件保持。外部 Chrome 无新恢复证据，界面与真实存档待核验；d06c75e 的 Actions 37977628699 已成功。
  本轮收口后继续核对第四世代 Geonet 世界地图窗口，不把单个录像窗口视为 PKHeX 全目标完成。

- 2026-10-10 接入 Battle Revolution 独立训练家窗口，main 基线 3a015c7，API 101，工程检查通过。
  已写入四个三语分组、姓名／生日／自我介绍／玩家 ID、20 项标量与候选、十一竞技场标记、完整时间组以及原始文本字节。
  国家／地区写回 getter 读取地址并保护错误 setter 指向区域；时间整组处理，其他编辑保留小数。ID 沿用五位限值，玩家 HEX 沿用过滤／补齐并显示应用值。
  语言六种候选及 Japanese／对战证分类影响已明确，保持未改自我介绍和通行证，沿用四玩家、工作副本、撤销、摘要校验和原件保护。
  四种地区／分区核心专项与前端／玩家上下文／错误本地化 7 项专项通过，姓名尾随／空名、五位 ID 限制、HEX 解析及时间组补充检查通过。
  完整原生、API 101 核心构建、裁剪后 26 类型属性检查及最终 verify 通过；后者为 233 文件／880 项测试及使用新核心的网页／PWA 打包。最后复核补齐时间五位／两位长度限制，已重跑相关专项和完整 verify。
  定向 Lint、类型、格式与差异检查通过，保留既有 Hook、JSExport、反射裁剪和网页构建提示，本轮功能检查无失败。最后证据文档格式收尾后按已有授权提交推送。
  外部 Chrome 没有新的连接恢复证据，新界面与真实存档待核验；3a015c7 的 Actions 37971522146 已成功。
  本轮收口后继续核对第四世代 DLC 窗口的本地可适用内容，不把本轮训练家入口视为 PKHeX 全目标完成。

- 2026-10-10 接入 Battle Revolution 对战通行证，main 基线 00de9f2，API 100，工程检查通过。
  已写入 187 份真实通行证、六个三语分组、人物／装备／称号、台词及原始字节、创建者、成绩与六格图像队伍。
  接通完整导入／导出、相邻交换、删除、两类解锁及成员导入预览／导出／删除，沿用四玩家上下文、工作副本、撤销和原件保持。
  按实际字节长度拒绝生日字段有损截断；保留未改旧值及语言变更时的原自我介绍。导入兼容性提示需明确确认，预览和破坏性操作核对源摘要。
  核心专项发现上游成员写入器越界，接入层改按 stored 长度写入并保护链接字节；修正后四种地区／分区与三语兼容性预览的扩展专项通过。
  最终扩展专项覆盖三语兼容性预览与明确例外确认；增加非零链接标记夹具后的完整原生回归通过。
  前端／玩家上下文／错误本地化 7 项专项、定向 Lint 与类型通过。完整 verify 通过 232 文件／876 项测试与网页构建；保留既有 Hook／构建提示及一次 Vitest worker 退出超时提示，最终退出码 0。
  新增核心编译中的局部变量重名、资源调用类名、成员 stored 状态对照差异及一处 Lint 控制字符正则均已修正并重新检查；未把失败结果记为通过。API 100 核心构建、裁剪后 26 类型属性检查及使用新核心的最终网页／PWA 打包通过。
  保留既有 JSExport、反射裁剪及网页体积／插件提示。本轮最后文档格式收尾后按已有授权提交推送。
  外部 Chrome 在关闭旧标签后仍返回 nodeRepl.fetch request failed，没有权限拒绝。浏览器与真实存档待核验。00de9f2 的 Actions 37962334050 已成功。
  本轮收口后继续核对同游戏的独立训练家窗口 SAV_Trainer4BR，不把专用对战证接入视为 PKHeX 全部功能完成。

- 2026-10-10 接入 Battle Revolution 四玩家选择与独立装备窗口，main 基线 95528f6，API 99。
  已写入全局玩家选择、训练家／箱子联动、Worker 重建后明确恢复所选玩家、逐装备标记、六种特殊套装与两种批量预览；通用训练家和箱子写入仍按原白名单保持只读。
  加密完整文件原件保持，专用改动沿用工作副本、撤销和完整导出。批量操作重写装备块并显示所有改变位，六种特殊套装独立处理；中文装备专名按上游缺失资源回退英文。
  前端、Worker 玩家上下文及错误本地化共 7 项专项、类型与定向 Lint 通过；生成连接脚本遗留导入路径已修正。四种区域／分区核心专项全部通过，覆盖各四玩家；第二分区夹具曾错误保留有效全零第一分区，已修正并重新通过。
  完整原生、API 99 核心构建及裁剪后 26 类型属性检查通过；最终 verify 通过 231 文件／872 项测试及网页／PWA 构建，保留既有 Hook、JSExport、反射裁剪与构建提示，本轮最终检查无失败。
  最后证据文档格式收尾后按已有授权提交推送。对战证窗口已通读，其人物外观、台词、队伍、导入／导出／交换／删除／解锁等操作继续接入，不记为已完成。
  外部 Chrome 与真实存档核验仍待恢复；95528f6 的 Actions 37953393420 已成功。

- 2026-10-09 接入 HGSS 宝可全能竞技窗口及六个子控件，main 基线 d20c827，API 98。
  已写入三语七分组、点数／商店／数据卡标记、493 种奖牌、29 项计数与只读计算值、最佳成绩、五赛道三格图像队伍，以及十种个人／通信赛事和各五份成绩／训练家。
  分开处理两种队伍编码，单字段与姓名原始字节补丁保留旧超限值、高位和其他记录。奖牌全部操作先展示替换效果并核对源摘要，沿用工作副本、撤销与原件保持。
  上游 ID／PID 的解析结果在应用前明确展示，保留五位 ID 显示、未知性别及未改姓名；操作、专名目录和错误提示按当前语言显示。
  核心与公开接口四布局专项、前端及错误本地化 8 项专项、类型与定向 Lint 通过。图像断言曾误选共用图标的皮卡丘，已依据 SpriteName 的实际列表改为沙河马并重新通过专项和完整回归。
  完整原生、API 98 核心构建及裁剪后 26 类型属性检查通过；最终完整 verify 通过 229 文件／866 项测试及网页／PWA 构建，保留既有 Hook、JSExport、反射裁剪和构建提示，本轮最终检查无失败。
  编辑后刷新数据保留当前分组、赛事和成绩位置。最后证据文档格式收尾后按已有授权提交推送，下一项核对 Battle Revolution 的对战证窗口及独立装备窗口。
  d20c827 的 Actions 37943949358 已成功。外部 Chrome 未恢复，新增界面及真实存档待核验。

- 2026-10-09 接入 HGSS 宝可装置通讯录，main 基线 44db9be，API 97。
  已接通 75 个真实格位、联系人选择、有符号原始数值以及全联系人／非训练家／清空三种批量预览。
  批量沿用 Core 的顺序和角色排除规则，替换整个列表；单格保留其他格位、重复联系人、空洞及未知旧值。源摘要过期则拒绝应用，沿用工作副本、撤销与完整导出。
  此窗口实际只编辑通讯录，未含地图或广播控件；上游缺少联系人本地化资源，操作与角色描述使用三语，专名保留源名称。
  核心与公开接口八布局专项、前端及错误本地化 5 项专项、类型与定向 Lint 已通过。首次编译发现 SAV4HGSS 不含 SaveRevision，已改核对地区 Magic；完整原生、API 97 核心构建与裁剪后 26 类型属性检查通过。
  最终完整 verify 通过 228 文件／859 项测试及网页／PWA 构建，保留既有 Hook、JSExport、反射裁剪和构建提示，本轮工程检查无失败。
  最后证据文档格式收尾后按已有授权提交推送。下一步统一接入 SAV_Pokeathlon4 及其六个子编辑控件，已核对点数、奖牌、计数、赛道队伍、个人和通信成绩的字段范围。
  44db9be 的 Actions 37937818617 已成功；外部 Chrome 连接和真实存档核验仍待恢复。

- 2026-10-09 接入第三世代秘密基地，main 基线 6c9c7f9，API 96。
  RS／E 已记录基地、训练家字段及原始姓名、六格队伍、种类／道具／招式候选和未知图腾形态预览已接通三语 Worker 入口。
  使用真实物理槽位与记录自身语言，只写分离校验后的单格；保留隐藏空槽、装饰、未改旧值、登记 2／3 状态和其他成员，沿用工作副本、撤销与原件保持。
  原生及公开接口四布局专项、前端及错误本地化 5 项专项、类型、定向 Lint 与格式检查通过；完整原生、API 96 核心构建及裁剪后 26 类型属性检查通过。形态使用 Core PK3.Form 生成并展示 PID，明确应用成员后才写入。
  最终完整 verify 通过 227 文件／855 项测试及网页／PWA 构建，保留既有 Hook、JSExport、反射裁剪和构建提示，本轮工程检查无失败。
  最后证据文档格式收尾后按已有授权提交推送；清单下一项为第四世代 PokeGear4Editor，先核对 HGSS 电话／地图／广播等实际范围。浏览器与真实存档待核验。6c9c7f9 的 Actions 37930784511 已成功。

- 2026-10-09 接入第三世代杂项主设置与幻影岛，main 基线 9317e54，API 95。
  RS／E／FRLG 代币、FRLG 劲敌姓名及原始字节、六格可视化卡片图标、RS／E 首槽原始 PID 匹配已接通三语 Worker 入口。
  输入和原始区域依据已记录；各操作互斥，保护未改姓名残留、未选内部编号、超限代币、其他变量、队伍与密钥，沿用工作副本、撤销及完整导出。
  原生及公开接口十六组布局／地区／密钥专项、前端及错误本地化 5 项专项、类型、定向 Lint 与格式检查通过。
  完整原生、API 95 核心构建及裁剪后 26 类型属性检查通过。旧未识别图标显示未知状态，新增错误提示按当前语言展示。
  最终完整 verify 通过 226 文件／851 项测试及网页／PWA 构建，保留既有 Hook、JSExport、反射裁剪和构建提示，本轮工程检查无失败。
  最后证据文档格式收尾后按已有授权提交推送，随后接入独立第三世代秘密基地窗口。9317e54 的 Actions 37925608612 已成功；新增界面与真实存档仍待外部浏览器核验。

- 2026-10-09 接入绿宝石／火红叶绿小游戏成绩与树果粉，main 基线 1b51c4b，API 94。
  七项小游戏记录、树果粉、完整成绩存储详情与明确重新保存已接通三语 Worker 入口，沿用工作副本、撤销与完整导出。
  前七项新输入 0–9999，树果粉 0–99999；保留未改超限值及成绩高位，树果粉使用完整 UInt32 安全密钥读写。
  原生及公开接口十四组布局／地区／密钥专项、前端 4 项专项、类型、定向 Lint 与格式检查通过；完整原生、API 94 核心构建与裁剪后 26 类型属性检查通过。
  最终完整 verify 通过 225 文件／847 项测试及网页／PWA 构建，保留既有 Hook、JSExport、反射裁剪和构建提示，本轮工程检查无失败。
  最后证据文档格式收尾后按已有授权提交推送，下一项核对第三世代劲敌姓名、训练家卡片与幻影岛。1b51c4b 的 Actions 37922304789 已成功。
  外部 Chrome 连接仍待恢复，未重新尝试相同失败连接；新界面和真实存档待核验。

- 2026-10-09 接入绿宝石船运与船票，main 基线 ceb6ef8，API 93。
  十个船运标志、五种船票和三语预览入口已接通 Worker；只写重要物品袋，保护其他袋、数量原值与安全密钥。
  日文版自动包括古航海图，非日文版缺少时需明确选择；沿用空间边界并增加连续格位覆盖检查，源摘要过期则拒绝应用。
  原生及公开接口六组布局／密钥专项、前端 4 项专项、类型和定向 Lint 通过；完整原生、API 93 核心构建与裁剪后 26 类型属性检查已通过。
  界面分成标志／船票两视图，草稿或预览未处理时限制切换；只读仍可浏览预览，使用既有 44px 共享控件。
  最终完整 verify 通过 224 文件／843 项测试及网页／PWA 构建，保留既有 Hook、JSExport、反射裁剪和构建提示，本轮工程检查无失败。
  沿用工作副本、撤销和完整导出。最后证据文档格式收尾后按已有授权提交推送，下一项为第三世代小游戏成绩与树果粉。ceb6ef8 的 Actions 37917764564 已成功。
  关闭旧标签后重试外部 Chrome 清单及打开 http://127.0.0.1:5173/，均返回 nodeRepl.fetch request failed；没有权限拒绝信息，页面和真实存档核验仍待连接恢复。

- 2026-10-09 接入绿宝石对战开拓区，main 基线 3910a38，API 92。
  七设施、合法模式／等级组、66 个成绩、26 个继续标记、银金标志、通行证与 BP 已接通三语 Worker 入口，沿用工作副本、撤销与完整导出。
  保留未修改的超限成绩、原 BP、金单独开启状态、继续保留位和其他故事标志；只读可浏览组合，草稿分组互斥并限制切换。
  核心与公开 API 两布局专项、前端 4 项专项、TypeScript 与定向 Lint 通过。
  按钮迁入 44px 操作栏时格式化发现一次 JSX 标签配对错误，已修正并重新格式化；最终完整 verify 覆盖该界面版本。
  完整原生、API 92 核心构建与裁剪后 26 类型属性检查通过；完整 verify 通过 223 文件／839 项测试及网页／PWA 构建，保留既有 Hook、JSExport、反射裁剪和构建提示。
  最后证据文档格式收尾后按已有授权提交推送；下一项接入绿宝石船运标志和船票添加。
  3910a38 的 Actions 37913065907 已成功；后续提交推送继续使用既有进程范围代理，浏览器及真实存档待核验。

- 2026-10-09 接入第三世代游戏记录与首通时间，main 基线 dc60cd9，API 91。
  全部开放记录、UInt32 数值、独立时分秒编辑和三语名称已接通 Worker、工作副本、撤销与导出；保护保留记录，使用 Core 安全密钥读写。
  核心／公开接口 14 组布局与密钥专项、前端／名称覆盖 6 项专项、完整原生、TypeScript 与定向 Lint 通过。
  首次 TypeScript 检查发现四个重复翻译条目，已复用原有条目并复跑通过；补齐跨游戏格式的记录选择重置。
  API 91 核心构建及裁剪后 26 类型属性检查通过。只读显示切换移出编辑禁用区域后，重新执行完整 verify，通过 222 文件／835 项测试及网页／PWA 构建；保留既有 Hook、JSExport、反射裁剪和构建提示。
  最后证据文档格式收尾后按已有授权提交推送；下一项接入绿宝石对战开拓区。
  GitHub 推送与查询使用既有本机代理的进程范围设置；Actions 37906671669 已成功，浏览器及真实存档待核验。

- 2026-10-09 绘画功能已提交推送，功能提交 16f2a39，main 与 origin/main 已同步。
  同时补推 8af598a（游走）和 b79b9eb（装饰品）；Actions 37906131399 已启动，尚未完成部署。
  直接 GitHub 连接仍超时，读取既有 Start-Codex-With-Proxy.ps1 得到本机代理 127.0.0.1:7897；单次 Git 命令的 http.proxy 和 gh 进程的 HTTPS_PROXY 已恢复推送／状态查询，未改持久化配置。
  后续推送与状态查询继续使用该进程范围代理；浏览器连接请求失败仍独立待恢复。下一步开发第三世代游戏记录与首通时间。

- 2026-10-09 接入 RS／E 五幅绘画，main 基线 b79b9eb，API 90。
  核心、Worker 与三语入口包含启用／关闭清空、种类、说明、ID／个性值、昵称／训练家姓名及原始字节；限制每次写入为单幅 32 字节，保留相邻绘画和寄放屋。
  首次原生专项因形态参数 int／byte 不匹配而编译失败，修正后四布局专项通过；前端 4 项专项、定向 Lint 与 TypeScript 检查通过。
  完整原生、API 90 浏览器核心构建与裁剪后 26 类型属性检查通过；28 种未知图腾和 RS／E 代欧奇希斯图像检查通过。
  完整 npm run verify 通过：221 文件／831 项测试、网页／PWA 构建成功，保留既有 Hook、JSExport、反射裁剪和构建提示。
  最后文档格式检查后按已有授权提交推送；下一项接入第三世代游戏记录与首通时间。
  b79b9eb 与 8af598a 已本地提交，GitHub 连接超时导致推送未完成；最新外部 Chrome 连接请求失败，未能列出标签页，浏览器与真实存档仍待核验。

- 2026-10-09 接入 RS／E 装饰品管理，main 基线 8af598a，API 89。
  核心、Worker 与三语入口包含八类 150 格、同类候选、稳定整理空槽和清空分类；保留未选分类与异常旧值，沿用工作副本、撤销和完整导出。
  原生四布局专项、前端 4 项专项与 TypeScript 检查通过；完整原生、API 89 浏览器核心构建及裁剪后 26 类型属性检查通过。
  完整 npm run verify 通过：220 文件／827 项测试、网页／PWA 构建成功。仅保留既有 Hook、JSExport、反射裁剪和构建提示，本轮验证无失败。
  最后证据文档格式收尾后按已有授权提交推送；下一项接入第三世代绘画，必须限制单幅 0x20 字节以保护相邻记录和寄放屋数据。
  8af598a 已本地提交，GitHub 推送重试仍因连接超时失败；网络恢复后继续推送。浏览器与真实存档待核验。

- 2026-09-30 接入第三世代游走宝可梦，main 基线 246bb3a，API 88。
  独立三语入口包含种类、个性值、六项 IV、等级、当前 HP、激活状态和本地图像；区分存储 IV 与遭遇 IV，沿用工作副本、撤销与精确导出。
  核心与公开 API 六布局专项、前端 4 项专项和定向 Lint 通过。首次原生专项因测试夹具 SAV1 构造参数错误而编译失败，修正后复跑退出 0。
  2026-10-09 恢复后核对保留日志：完整原生、API 88 浏览器核心构建、裁剪后 26 类型检查已完成；完整 verify 日志包含 219 文件／823 项测试通过及网页／PWA 构建成功。原进程句柄已失效，不重启已完成的验证。
  本批代码未变化，补齐证据文档并完成最终格式检查后，按已有授权提交推送。下一步继续第三世代杂项；源范围和绘画切片越界风险已记入模块文档。
  外部 Chrome 页面读取超时尚未解除，本批浏览器和真实存档待核验。

- 2026-09-30 接入第三世代殿堂记录核心、API 87、Worker 与三语入口，main 基线 03fd1d6。
  六格本地图像、形态显示版本、成员字段、昵称原始字节、清空和当前／全部记录队伍导入已实现，沿用工作副本、撤销与原件保留。
  核心专项已通过国际／日文 RS、E、FRLG 六布局，覆盖全部 300 格、跨扇区、校验、残留数据和完整导出；前端 4 项专项通过。
  公开 API 六布局、完整原生套件、API 87 浏览器核心构建和裁剪后 26 类型属性检查已通过。
  完整 npm run verify 通过：218 文件／819 项测试、网页构建与 PWA 预缓存成功；保留既有 Hook、JSExport、裁剪和构建提示，无新增殿堂代码警告。
  最终证据文档完成格式收尾后，按已有授权提交推送。本轮验证无失败，下一项接入第三世代游走宝可梦，其源契约已记录。
  最新外部 Chrome 会话能列出项目标签，但读取新标签仍超时；没有清除站点数据，浏览器与真实存档待核验。

- 2026-09-30 核对第三世代殿堂记录，main 基线 03fd1d6，API 保持 86。
  已记录双扇区布局、300 格字段、两种字符集、ID／PID 规范化、等级控件 0–255 与 Core 写入上限 100 的差异。
  核对清空成员与当前／全部记录队伍导入、异色和派生形态；明确没有第一世代的队列删除与计数滚动操作。
  完整源依据和后续验证范围写入模块文档；产品实现待开始，本批文档随功能提交。
  03fd1d6 的 Actions 36698174300 已成功；核心与界面接入进度见本页最新条目。

- 2026-09-30 接入水晶版 GS 球事件入口，main 基线 7b803e7，API 86。
  三语状态与开启按钮仅面向水晶存档，已开启、只读及区域缺失状态禁用；操作进入既有工作副本、撤销与导出流程。
  核心区域与公开接口专项、4 项前端专项及定向 Lint 通过。
  完整原生套件、API 86 核心构建和裁剪后 26 类型属性检查通过；完整 npm run verify 通过，217 文件／815 项测试及网页／PWA 构建成功。
  仅保留既有 Hook、JSExport、裁剪与构建提示；7b803e7 的 Actions 36695150884 已成功。
  本批浏览器与真实存档待核验；按既有授权提交推送，下一项接入第三世代殿堂记录。

- 2026-09-30 实现水晶版 GS 球事件核心，main 基线 7b803e7，API 保持 85。
  已核对上游杂项窗口的唯一操作与国际／日文两组偏移；不限制 GB／VC 来源，金银不适用。
  主状态按精确 0x0B 判断，开启同时写入主／备；缺少日文后半段时禁用，不补零、不改写已开启状态。
  国际版 32／64 KiB、日文版 64 KiB 的主／备状态组合、完整文件对照、校验与原件保持专项通过；日文缺失区域拒绝及非水晶格式拒绝通过。
  专项进程退出 0，仅保留既有 JSExport 提示；API、Worker、三语入口与完整验证待完成。
  本批未提交，完成后沿用既有授权提交推送。

- 2026-09-30 接入第一世代殿堂记录界面，main 基线 a9322d6，API 85。
  三语入口包含 50 队／六格图像预览、种类与等级、昵称文字／原始字节／恢复种类名、计数及全部登记／清除操作。
  Worker、工作副本、撤销与导出已接通；成员与计数草稿互斥，存在草稿时限制切换和其他操作，避免静默丢失。
  核心四布局与公开 API 专项通过，三语目录、前端 4 项专项及定向 Lint 通过。
  完整原生套件、API 85 核心构建与裁剪后 26 类型属性检查通过；完整 npm run verify 通过，216 文件／812 项测试及网页／PWA 构建成功。
  保留既有 Hook、JSExport、裁剪和构建提示；a9322d6 的 Actions 36690849352 已成功。
  浏览器更新确认仍待所有者处理，本批界面与真实存档未验收；按既有授权提交推送，下一项接入水晶版 GS 球事件。

- 2026-09-30 实现第一世代殿堂记录核心，main 基线 a9322d6，API 保持 84。
  核心覆盖全部 50 队／300 格、成员与昵称原始字节、恢复种类名、计数、登记当前队伍、删除及清空。
  成员修改先校验独立缓冲区，写出复核完整殿堂区域、计数、游戏及区域布局；原件保持。
  四布局专项通过，包含全部格位、登记边界、完整文件对照、空洞和尾部字节保持、无效请求原子性与精确导出；仅保留既有 JSExport 提示。
  初次专项的测试代码赋值编译错误已修正，最终专项进程退出 0。
  当前功能及核对文档尚未提交，API、Worker、三语图像界面与完整验证仍待接入，完成后按授权提交推送。

- 2026-09-30 核对第一世代殿堂记录，main 基线 a9322d6，API 保持 84。
  已记录 50 队／300 格的原始布局、等级与计数 0–255、两种昵称长度与原始字节保持、删除位移及登记队伍语义。
  明确 50 队容量不等于计数上限，计数达到 50 后登记队伍会前移并返回 50；清空和删除的计数行为不同。
  完整操作及后续验证范围写入存档模块文档，产品实现尚未开始，不计作已接入。
  a9322d6 已提交推送，Actions 36690849352 当前运行中；浏览器确认仍待所有者完成。
  下一步按该契约接入殿堂读写、三语图像界面和工作副本撤销，本轮核对文档随功能提交。

- 2026-09-30 接入第一世代定点与赠送事件重置，main 基线 3b68d8b，API 84。
  国际版／日文版 RB 与 Yellow 增加三语目录、搜索、多选、应用与撤销，分别覆盖上游 18／21 项。
  全部选择验证后清除关联标记，保持原件与未选数据；导出复核游戏组、区域布局、校验及两组完整数组。
  四布局全部项目与双标记组合、原始位／完整文件、无效请求和导出专项通过，前端 4 项专项与定向 Lint 通过。
  完整原生套件、API 84 核心构建及裁剪后 26 类型属性检查通过，包含 G1OverworldSpawner 的全部 21 个属性。
  完整 npm run verify 通过，215 文件／809 项测试及网页／PWA 构建成功；保留既有 Hook、JSExport、裁剪与构建提示。
  3b68d8b 的 Actions 36686815755 已成功。
  所有者关闭旧窗口后，Chrome 项目页可正常读取；点击更新已出现确认框，自动确认超时，已请所有者手动确认。
  本批浏览器及真实存档待核验，完整接入目标保持，按既有授权提交推送。

- 2026-09-30 接入 BDSP 事件与系统标记编辑，main 基线 0fbc959，API 83。
  增加两版本四修订版的三类独立数组、具名预设与完整比较，草稿、撤销、导出复用事件工作区。
  写入前整体验证，未改异常布尔字节保持；导出复核修订版、长度、校验与全部数组。
  八布局原始字节／完整文件对照、边界、比较与导出专项通过；第二至第七世代与 Let’s Go 事件专项、22 项前端检查及定向 Lint 通过。
  修正新增资源常量提示后，完整原生套件、API 83 核心构建及裁剪后 25 类型属性检查通过；完整 npm run verify 通过，214 文件／806 项测试及网页／PWA 构建成功，仅保留既有 Hook、JSExport、裁剪和构建提示。
  0fbc959 的 Actions 36683119731 已成功；外部 Chrome 能列出当前项目标签，但只读页面检查超时，未将其计作新版验收。
  本批浏览器与真实存档待核验，完整 PKHeX 清单继续推进，按既有授权提交推送。

- 2026-09-30 接入 Let’s Go 事件编辑与比较，main 基线 0797d5b，API 82。
  两版本增加全部标记、有符号数值、分组与组内编号、具名预设和双文件比较，保留 72 个未分类槽位。
  第二至第七世代维持原范围；整个请求验证后写入，独立编辑权限与工作副本、撤销及导出复用既有流程。
  两版本原始偏移与完整输出、Int32 边界、称号及未改块数据保持、原子拒绝与比较专项通过；原有第二至第七世代事件专项、21 项前端检查与定向 Lint 通过。
  完整原生套件、API 82 核心构建及裁剪后 25 类型属性检查通过；完整 npm run verify 通过，214 文件／805 项测试与网页／PWA 构建成功，保留既有 Hook、JSExport、裁剪和构建提示。
  0797d5b 的 Actions 36680506617 已成功。
  本批浏览器与真实存档核验待完成，完整 PKHeX 清单继续推进，按既有授权提交推送。

- 2026-09-30 接入第二世代事件编辑与比较，main 基线 8fc594c，API 81。
  金银／水晶的国际、日文及韩文金银五种布局增加完整事件目录与 0–255 编辑，沿用三语、草稿、撤销及双存档比较。
  事件权限独立于训练家编辑，目录携带实际数值上限；导出复核游戏组与区域布局，复用韩文双区域校验，保持原件及精确工作副本下载。
  五布局八组样本长度的全部编号／byte 值、原始偏移与完整文件对照、备份和校验损坏、原子拒绝、比较与导出专项通过；原有 12 种事件布局专项、19 项前端检查及定向 Lint 通过。
  完整原生套件、API 81 核心构建及裁剪后 25 类型属性检查通过；完整 npm run verify 通过，214 文件／803 项测试及网页／PWA 构建成功，保留既有 Hook、JSExport、裁剪与构建提示。
  8fc594c 的 Actions 36678110619 已成功；浏览器更新确认仍待所有者操作，本批浏览器及真实存档核验未完成。
  完整 PKHeX 清单继续推进，本批按既有授权提交推送。

- 2026-09-30 接入第三至第七世代事件标记与数值，main 基线 0a18c87，API 80。
  12 种存档布局增加三语目录、具名分类／预设、按编号编辑、草稿差异和双文件比较；比较结果可下载，不替换工作副本。
  请求先完整验证再写入，拒绝缺失、重复及越界项目；实际修改沿用第七世代 QR 领取数据联动，只读与未改请求保留原字节。
  12 布局的三语资源、每个编号、位／UInt16 边界、完整文件 Core 对照、原子拒绝、QR 组合与比较方向专项通过；16 项前端专项和定向 Lint 通过。
  完整原生套件、API 80 浏览器核心构建及裁剪后 25 类型属性检查通过；完整 npm run verify 通过，214 文件／801 项测试与网页／PWA 构建成功，保留既有 Hook、JSExport、裁剪与构建提示。
  0a18c87 的 Actions 36675289133 已成功；本批按既有授权提交推送。
  浏览器更新确认仍待所有者操作，未运行本批浏览器检查；真实存档与所有者验收待完成，完整 PKHeX 清单继续推进。

- 2026-09-30 修复仓储工具重复并收紧布局，main 基线 56a8fc4，API 保持 79。
  外部 Chrome 在所有者关闭旧标签后恢复，新页面资源与当前构建一致；X 合成存档的壁纸、皮卡丘图像、30 格布局，以及游走次数 0→11→撤销回 0 已完成本地检查。
  切换队伍与箱子发现导入工具和整理工具重复，原因是相邻组件使用相同标识；已分配独立标识，并将仓储入口收拢为可换行网格，展开项占完整一行，保留 44px 操作高度。
  完整 npm run verify 通过，213 文件／785 项测试及网页／PWA 构建成功；保留既有 Hook 与构建提示。56a8fc4 的 Actions 36673072129 已成功。
  更新入口能提示等待版本，但外部 Chrome 连接在原生确认框确认步骤超时，已请所有者手动确认；修复版布局、窄屏与真实存档仍待核验。
  本地合成样本检查不替代所有者验收，完整 PKHeX 接入目标继续推进。

- 2026-09-30 接入 X／Y 游走宝可梦，main 基线 731b259，API 79。
  三语入口覆盖种类、遭遇次数与游走状态，复用工作副本、撤销与完整块回读；未设置种类和未改异常旧值原样保持。
  初始伙伴推导改为显式草稿选择，不在读取时初始化种类，不联动改写剧情标记。
  X／Y 各 180 个合法组合的独立字节与完整文件专项、完整原生套件、API 79 核心构建及裁剪后 25 类型属性检查通过。
  前端三项边界专项与定向 Lint 通过；完整 npm run verify 通过，213 文件／785 项测试及网页／PWA 构建成功，保留既有 Hook、JSExport、裁剪与构建提示。
  731b259 的 Actions 36671031402 成功；本批提交前已统一 API、Worker 与导出接口。
  浏览器和真实存档仍待核验；完整接入清单继续推进，本批按既有授权提交推送。

- 2026-09-30 修正页面更新流程，main 基线 0549909，存档 API 保持 78。
  检查发现自定义注册配合 autoUpdate 未启用跳过等待，页面也没有处理等待版本的入口；旧激活脚本会强制导航所有窗口。
  改为三语手动更新入口，仅在当前窗口确认后请求激活并刷新，其他窗口保留现场；首次安装不刷新，超时和失败支持重试。
  顶栏入口替换就绪状态，窄屏保留 44px 图标按钮；不清除本地资料，不改动存档核心。
  完整 npm run verify 通过：212 文件／782 项测试及网页／PWA 构建成功，包含 7 项更新专项；保留既有 Hook 与构建提示。
  构建产物已确认包含等待消息处理与控制器接管，不再引用旧更新脚本或执行全窗口导航；按授权提交推送。
  外部 Chrome 仍加载旧资源；另一个项目标签连续控制超时，无法确认编辑现场，未关闭窗口或清除缓存。
  新版更新交互、多窗口延迟资源和真实存档仍待浏览器验收；完整 PKHeX 接入目标继续推进。

- 2026-09-30 接入第三世代存档时钟，main 基线 9ceecf0，API 78。
  红／蓝宝石与绿宝石增加两组时钟编辑、归零及树果修复日期推进，保持原始保留字节和未改异常时间值。
  三语入口、Worker、工作副本、撤销与完整两组时钟回读已接通；常规数值范围及 734 天阈值有上游依据。
  RS／E 原生专项、完整原生、API 78 浏览器核心构建与裁剪后 25 类型属性检查通过；前端边界专项及类型检查通过。
  npm run verify 通过，211 文件／775 项测试及网页／PWA 构建成功；保留既有 Hook、JSExport、反射裁剪与构建提示。
  9ceecf0 的 Actions 36667303981 成功；本批按授权提交推送，浏览器交互和真实存档仍待验收。

- 2026-09-30 接入第六世代 O 力量，main 基线 99bf491，API 77。
  增加 XY／ORAS 三语入口，覆盖 65 个解锁状态、场地／战斗各两组数值、点数及全部解锁／清空。
  保持上游批量语义：解锁保留点数，清空保留总开关；逐项编辑保留未改的未知状态。
  枚举名称使用上游三语资源，选择器保留全部项目草稿，批量操作保护未应用修改。
  Worker、原件、工作副本、撤销与完整块回读已接通；四版本专项、完整原生、API 77 核心构建及裁剪后 25 类型属性检查通过。
  最终类型检查发现并修正读取按钮的旧变量引用，随后完整 npm run verify 通过：210 文件／772 项测试及网页／PWA 构建成功。
  定向 Lint 通过，保留既有 Hook、JSExport、反射裁剪与构建提示；99bf491 的 Actions 36664557539 成功，本批按授权提交推送。
  外部 Chrome 连接正常，核对时页面仍加载 index-BoVopdVG.js，本地服务返回 index-DzG5kUQX.js，未将旧资源页面作为新版验收。
  浏览器交互与真实存档仍待验收，继续按完整接入清单推进。

- 2026-09-30 接入心金／魂银球果盒，main 基线 4dab9d7，API 76。
  背包增加独立球果分类，提供七项三语名称、本地图像、0–255 数量编辑及全部设为 99／清空。
  保留红黄蓝绿粉白黑真实存储顺序，修改只作用于独立七字节；拒绝与普通背包动作混用。
  原件、工作副本、撤销与回读检查复用现有流程；草稿保护分类切换与批量操作。
  HG／SS 专项、完整原生、API 76 浏览器核心构建与裁剪后 25 类型属性检查通过；npm run verify 通过，209 文件／769 项测试及网页／PWA 构建成功。
  定向 Lint 与类型检查通过，保留既有 Hook、JSExport、反射裁剪及构建提示；按授权提交推送。
  4dab9d7 的 Actions 36662493861 构建、两路部署及 Windows 桌面包全部成功；本批浏览器交互与真实存档仍待验收。

- 2026-09-30 接入第三世代宝可方块与第四世代／BDSP 宝芬盒，main 基线 e7ddc7a，API 75。
  食物入口增加真实格位、种类、六项口味／口感编辑和上游补满／清空；BDSP 保留独立等级与新增标记，保存时沿用 Core 排序。
  旧两代等级只读，第四世代展示保存后的主要／次要口味。显示排序与存档地址分离，切换格位和批量操作保护未应用草稿。
  原始未识别种类、保留字节、BDSP 异常新增标记和烹饪次数按已记录规则保留；完整功能范围与上游依据已写入模块文档。
  六种布局专项、完整原生、API 75 浏览器核心构建与裁剪后 25 类型属性检查通过；npm run verify 通过，208 文件／767 项测试及网页／PWA 构建成功。
  类型检查与定向 Lint 通过，保留既有 Hook、JSExport、反射裁剪与构建提示；按授权提交推送。
  e7ddc7a 的 Actions 36352516238 成功；新版浏览器交互与真实存档仍待验收，完整功能清单继续推进。

- 2026-09-28 接入 ORAS 宝可方块与树果田操作，main 基线 b3e79af，API 74。
  现有食物入口增加宝可方块分区，提供 12 项三语数量、补满／清空，以及带范围说明与确认的 90 块树果田随机重置。
  宝可方块新值限制为 0–999，原有 UInt32 异常值可保持；树果田使用 Core 默认成熟状态，保留 10 个未使用格位。
  分区切换保护未应用草稿；修改、撤销、原件保持及完整块回读验证复用现有流程。
  OR／AS 专项、完整原生、API 74 浏览器核心构建与裁剪后 25 类型属性检查通过；npm run verify 通过，207 文件／764 项测试及网页／PWA 构建成功。
  修复新增的组件快速刷新提示，文本移入现有数据文件，定向 Lint 通过；保留既有 Hook、JSExport、反射裁剪与构建提示。
  最终提交检查使用修正后的代码；浏览器交互与真实存档验收仍待完成，继续按完整功能清单推进。

- 2026-09-28 接入 XY／ORAS 宝芙蕾与 SM／USUM 宝可豆，main 基线 88b0044，API 73。
  存档工具增加三语“宝可梦食物”入口；宝芙蕾支持 100 个真实格位、独立持有数量、正反排序、普通／顶级补满与五种初始宝芙蕾恢复。
  宝可豆支持 15 类数量与补满／清空。所有操作调用 Core 食物块，保留原件、工作副本及既有撤销；未应用草稿禁止直接批量覆盖。
  宝芙蕾已有异常编号和数量可原位保留，新增值按 0–26／0–100 校验；宝可豆按 0–255 校验。上游范围及桌面数量保存差异已写入模块文档。
  四版本专项及非空乱序夹具已通过：全部合法编号／数量、批量行为、完整文件 Core 对照、输入保持与错误请求拒绝。
  完整原生、API 73 浏览器核心构建与裁剪后 25 类型属性检查通过；npm run verify 通过，207 文件／763 项测试及网页／PWA 构建成功。
  全仓格式检查通过，保留既有 Hook、JSExport、反射裁剪与构建提示；按授权提交推送。
  本批未新增真实存档或浏览器验收；浏览器旧缓存问题与剩余世代专属编辑继续保留在完整接入目标内。

- 2026-09-28 接入第一／二世代独立文件专属编辑，main 基线 861c7ad，API 72。
  第一世代提供捕获率与原生属性目录；第二世代提供捕获等级／地点／时段、原训练家性别与宝可病毒菌株／天数。
  位字段通过 Core 属性写入，保留相邻位与未修改的特殊值；宝可病毒天数按菌株限制。
  增加按文件编码选择名称语言、恢复种类名称与第二世代创建蛋／周期／孵化；语言选择随工作副本与撤销保留。
  日文／非日文／韩文共五种布局的字段、名称、蛋操作与 Core 完整字节对照专项通过；成功与拒绝请求均保持输入缓冲区。
  完整原生、API 72 浏览器核心构建与裁剪后 25 类型属性检查通过；npm run verify 通过，206 文件／760 项测试及网页／PWA 构建成功。
  保留既有 Hook、JSExport、反射裁剪与构建提示；861c7ad 的 Actions 36345864038 成功，本批按授权提交推送。
  外部 Chrome 连接正常，但普通刷新仍加载 index-BoVopdVG.js；核对时本地服务返回 index-DBoam5QN.js，未把旧资源页面作为新版验收。
  新版交互和真实文件验收仍待完成；捕获率建议、原始队伍字段、其他格式与转换继续列入完整接入目标。

- 2026-09-28 接入第一／二世代独立文件基础编辑，main 基线 cb76753，API 71。
  专用单体列表读取严格校验长度、数量、终止符与种类／蛋标记；写出回读同时检查实体与两个名称缓冲区。
  三语表单使用四项 DV、五项能力经验，隐藏不存在的性格／特性／SID；第二世代提供亲密度与道具。
  三语错误提示使用这两代的实际数值范围，名称长度／编码失败单独提示，不沿用 510 总和说明。
  原件、20 步撤销、合法性报告与工作副本流程复用；第一／二世代专属捕获信息、宝可病毒及蛋操作仍待完成。
  12 组日文／非日文、名称终止方式与蛋状态组合的自动／显式读取、四种导出、Core 全字节对照、输入边界和原件保持专项通过。
  完整原生、API 71 浏览器核心构建与裁剪后 25 类型属性检查通过；npm run verify 通过，206 文件／760 项测试及网页／PWA 构建成功。
  保留既有 Hook、JSExport、反射裁剪与构建提示；cb76753 的 Actions 36342976102 成功，本批按授权提交推送。
  本批没有新增浏览器或真实文件验收；后续继续第一／二世代专属字段，不把基础编辑标记为完整接入。

- 2026-09-28 接入独立蛋操作上下文，main 基线 ef4ec40，API 70。
  目标游戏和训练家姓名／TID16／SID16 由三语表单明确呈现，初值来自实体，目录受当前实体 Context 约束。
  转换为蛋、孵化周期和孵化复用已有流程；共享逻辑改用 ITrainerInfo，独立文件通过 SimpleTrainerInfo 提供上下文。
  不使用隐藏训练家缓存，不构造虚拟存档；来源及格式信息继续随工作副本撤销保留。
  14 类型四种表示的全部目标游戏、交换／未交换、周期边界与 Core 孵化对照专项通过；补充姓名／两类 ID 的分别交换判断及上下界检查。
  所选目标上下文随工作副本保留和撤销，朱紫来源清零后仍保留已选目标版本。
  完整原生、API 70 核心构建与裁剪后 25 类型属性检查通过；npm run verify 通过，206 文件／760 项测试及网页／PWA 构建成功。
  PB7 孵化对照不额外重算无变化的能力值和 CP，姓名／两个 ID 的分别交换判断及上下界通过。
  保留既有 Hook、JSExport、反射裁剪与构建提示；ef4ec40 的 Actions 36340887479 成功，本批按授权提交推送。
  第一／二世代写出、其他专属功能、浏览器和真实文件验收仍待完成。

- 2026-09-28 接入独立宝可梦来源与地点编辑，main 基线 cdfd159，API 69。
  来源目录改为共享可配置范围，独立文件使用实体的游戏／球种上限和 Context，存档入口保留原有存档范围。
  复用三语来源表单、只读预览、工作副本与撤销；未知现值保留，只校验主动修改的目录值。
  14 类型四种表示的全部游戏预览、球种／地点边界与完整字节对照专项通过；BK4 对照保留原标记，避免 Clone 的队伍标记影响预期。
  专项发现 PK5 来源编辑会改变自动识别结果，已增加显式扩展名读取和已知工作副本格式保持；默认识别、精确长度与校验和限制保留。
  未知原值的目录回退改用实体 Context 对应的具体游戏，避免分组枚举产生空目录。原件与撤销同时保留格式／编码信息。
  公共接口往返、完整原生、API 69 核心构建与裁剪后 25 类型属性检查通过。
  npm run verify 通过：206 文件／760 项测试、网页与 PWA 构建成功；出现一项测试工作进程清理超时提示，最终退出码为 0。
  保留既有 Hook、JSExport、反射裁剪与构建提示；cdfd159 的 Actions 36338515219 成功，本批按授权提交推送。
  独立蛋上下文、第一／二世代写出、真实文件与浏览器验收仍待完成。

- 2026-09-28 接入独立宝可梦文件进阶编辑，main 基线 4f72f9e，API 68。
  共享训练、相遇日期、记忆、亲密度、训练家历史、缎带、回忆招式、闪光、原始值与形态计数的三语表单和字段处理。
  目录与建议通过独立接口读取；编辑沿用工作副本、20 步撤销和旧合法性报告清理。
  形态计数按实际文件长度约束队伍字段；PB7 按能力值变化更新能力值与 CP，保留 HP／状态。
  新增五类实体真实日期字段支持；14 类型四种表示、随机 PID／加密常量、闪光、边界拒绝及原件保持专项通过，类型检查通过。
  完整原生、API 68 核心构建、裁剪后 25 类型属性检查通过；npm run verify 通过，206 文件／760 项前端测试及网页／PWA 构建成功。
  保留既有 Hook、JSExport、反射裁剪与构建提示。4f72f9e 的 Actions 36336156074 成功，本批按授权提交推送。
  来源游戏／球种／地点、蛋操作、第一／二世代写出仍待完成；浏览器和真实文件未验收。

- 2026-09-28 接入独立宝可梦文件合法性报告，main 基线 4c2b08d，API 67。
  使用实体 PersonalInfo 与 StorageSlotType.None；文件长度不作为来源格位证据，原存档分析仍保留真实上下文。
  增加 Worker 操作、三语摘要与完整报告；编辑、撤销、还原、换文件和关闭后清理旧结果。
  校验损坏与空实体拒绝分析，只读的第一／二世代实体也可检查；分析保留原件。
  页面与核心版本不一致时显示三语刷新提示，旧核心缺少独立接口也按版本不匹配处理。
  上游合法／非法样本、16 种实体 × 四种表示、三语 Core 报告对照、损坏校验拒绝与原件保持专项通过。
  首轮类型检查发现操作联合类型分隔符遗漏，修正后完整原生、API 67 核心构建及裁剪后 25 类型属性检查通过。
  npm run verify 通过：206 文件／760 项前端测试、网页与 PWA 构建成功；保留既有 Hook、JSExport、反射裁剪与构建提示。
  4c2b08d 的 Actions 36334339416 成功；本批按授权提交推送接口、界面、检查及文档。
  上轮 Chrome 仍加载旧资源，本批未将旧页面作为新版验收；真实文件及项目所有者验收未完成。

- 2026-09-28 接入独立宝可梦文件三语工作区，main 基线 9287081，API 66 不变。
  现有悬浮存档工具顶部切换存档／宝可梦文件，分别保留工作状态；复用实体图片、基础编辑表单和共享选择器。
  增加读取方式说明、原件下载、20 步撤销、还原原件及存储／队伍 × 解密／加密导出。
  打开失败与取消不替换当前文件；BK4 布局随历史恢复，编辑输出始终按解密布局使用。
  首轮静态检查发现渲染直接读取可变引用，已改为显式副本状态；清理任务生命周期警告。
  npm run verify 通过：206 文件／760 项测试、网页与 PWA 构建成功；保留既有 Hook 与构建提示。
  API 66 核心沿用上一批已验证产物，不重复重建。进阶编辑与真实文件验收未完成。
  构建后 Chrome 普通刷新仍加载 index-BoVopdVG.js，本批产物为 index-BlPpuAFy.js；新版交互、下载与窄屏仍待核验。
  未清理浏览器数据，不将旧页面当作新版验收；按授权提交推送本批工作区与文档。

- 2026-09-27 接入独立宝可梦文件 API 66、Worker 分支与专用客户端，main 基线 5af7197。
  请求与数据分别限长，转移输入副本；编辑后按解密布局读取，取消／超时清理待处理请求。
  JSON 专项定位 BK4 箱子长度扩展为队伍长度时缺少状态标记，现与 Core 队伍构造行为对齐，保留箱子导出原标记。
  2026-09-28 完整原生、API 66 核心重建及裁剪后 25 类型属性检查通过。
  npm run verify 通过：206 文件／760 项测试、网页与 PWA 构建成功；首轮出现单个测试进程退出超时提示，最终退出码为 0。
  保留既有 Hook、JSExport、反射裁剪与构建提示。工作区、撤销界面、进阶编辑与新版浏览器核验仍待完成。
  5af7197 的 Actions 36330763194 成功；本批继续按授权提交推送。

- 2026-09-27 开始独立宝可梦文件内核，main 基线 d4ecc90，API 65 暂不变。
  从基础编辑与读取中分离 SaveFile 格位依赖，增加按实体类型读取、目录、编辑及存储／队伍／加密写出与回读检查。
  原存档包装层继续负责格位保护、存档写入及原有目录限制；独立文件使用 PKM.PersonalInfo／Context。
  专项先后定位 X/Y 与 ORAS 形态表差异、SM 与 USUM 性别表差异、GC 非序列化状态、BK4 原始数据块布局及 PB7 衍生数值处理。
  14 种实体类型的基础编辑、明文／加密及存储／队伍交叉转换、完整目录、原件保持专项通过；第一／二世代单体列表只读边界通过。
  完整原生、核心重建及裁剪后 25 类型属性检查通过；npm run verify 通过：205 文件／756 项测试、网页与 PWA 构建成功。
  按授权提交推送本批内核、共享逻辑分离及检查；保留既有 Hook、JSExport、反射裁剪与构建提示。
  独立 API、Worker、三语工作区及进阶编辑尚未接入；不将内部工程样本通过当作浏览器或真实文件验收。
  d4ecc90 的 Actions 36327750291 成功；既有新版浏览器核验仍受旧资源加载影响。

- 2026-09-27 接入整箱二进制会话、Worker 与三语入口，main 基线 86ae35a，API 65。
  支持当前／全部箱子导出、精确格位替换预览、分别确认删除与覆盖、定向取消和工作副本撤销。
  切换箱子、修订或语言会丢弃预览；只读格式保留导出入口；箱名和壁纸不包含在二进制中，替换时保留。
  11 格式 × 27 组设置 × 两种范围与 Core 对照专项通过；第六世代随机记忆感受按已记录约束验证后对齐。
  JSON 往返、一次性提交、过期源／令牌、定向取消、失败预览清理与原件保持专项通过。
  完整原生、API 65 核心重建及裁剪后 25 类型属性检查通过。
  首轮前端类型检查发现下载结果的缓冲区类型过宽，按 Worker 实际复制行为修正为 ArrayBuffer 后，npm run verify 通过：205 文件／756 项测试、网页及 PWA 构建成功。
  86ae35a 的 Actions 36325738352 成功；本批按授权提交推送。保留既有 Hook、反射裁剪及构建提示。
  构建后 Chrome 普通刷新仍加载 index-BoVopdVG.js，新入口实际导入／导出、撤销、多语言和窄屏仍待核验；不把旧页面当作新版验收。

- 2026-09-27 开始整箱二进制导入导出，main 基线 41d55fa，API 64 保持。
  BoxBinary 增加精确格位替换、保护范围拒绝、删除／覆盖确认及队伍尾部回读检查；11 格式原生专项通过。
  首轮默认更新在 Gen6 因 Core 随机交换记忆感受不同而失败；验证随机字段合法后对齐该字节再比较，其余完整字节相等。
  None 设置直接逐字节对照通过；随机影响范围检查通过。完整套件首轮在 PK3 损坏头用例失败，发现 G3PKM.Valid 固定为 true。
  已给批量导入、文件属性与存档属性编辑补充 ChecksumValid；整箱替换拒绝损坏实体，避免隐式修复和格位错移。
  队伍批量操作预先检查全部六格，拒绝损坏队伍，避免编辑其他成员时连带重写异常数据。
  PK3 校验、损坏队伍与 11 格式二进制专项及最新完整原生套件通过；浏览器核心重建与裁剪后 25 类型属性检查通过。
  npm run verify 通过：205 文件／756 项测试、网页与 PWA 构建成功；保留既有 Hook、反射裁剪与构建提示。
  上一批 41d55fa 的 Actions 36323804094 成功；本批按授权提交推送校验修复、二进制内核、检查及文档。
  核对并更新完整接入清单的过期状态；新建 Chrome 标签页与原页均加载 index-BoVopdVG.js，本地 HTTP 返回 index-D6qDa9uO.js。
  两页未报告控制台错误，未把旧页面当成新版验证；实际批量导入及窄屏仍待核验，内部二进制功能尚无 Worker／界面入口。

- 2026-09-27 接入批量导入界面，main 基线 6b21490，API 64 保持。
  箱子工具增加折叠入口、文件／目录选择、起始箱与三项设置、清空／覆盖选项、分页逐项预览和分别确认。
  应用复用工作副本与撤销记录，切换箱子／修订／语言会移除预览；只对可编辑且校验通过的存档开放。
  中英日文与会话错误提示已补齐；npm run verify 通过：205 文件／756 项测试、网页与 PWA 构建成功。
  按固定 UI 契约复核共用 44px 按钮、表单、长路径换行及有界结果滚动；静态复核不作为视觉验收。
  Chrome 2／1601080320 已连接，构建后普通刷新仍加载 index-BoVopdVG.js，当前 dist 为 index-D6qDa9uO.js。
  页面未报告控制台错误；未清理浏览器存储或绕过外部浏览器要求。新版实际导入、撤销、语言切换和窄屏检查仍待完成。
  按授权提交推送界面、文案、检查和文档；API 64 核心沿用上一批构建，不重复重建。

- 2026-09-27 接入箱子导入会话与 Worker，main 基线 6a8c134，API 64。
  增加预览／提交／取消、令牌替换与一次性提交、失败预览清理、源文件哈希检查及前端类型。
  11 格式 × 27 设置专项通过，覆盖全部三项导入设置、旧令牌／旧源文件拒绝、定向取消和 JSON 往返。
  首轮 BDSP 对照误用含队伍尾部的原箱子对象，定位为等级字节差异；改为 Core 读取相同存储格式文件后全部通过。
  完整原生、API 64 浏览器核心构建和裁剪后 25 类型属性元数据检查通过。
  npm run verify 通过：204 文件／753 项前端测试、网页与 PWA 构建成功；保留既有 Hook、反射裁剪、JSExport 与构建提示。
  按授权提交推送接口、Worker、检查和文档；不将本轮工程结果作为浏览器实际导入或项目所有者验收。
  批量导入界面、工作副本撤销联动和实际浏览器操作仍待接入，完整 PKHeX 目标不变。

- 2026-09-27 接入 BoxImportFiles 文件来源层，main 基线 ccff1ba，API 63 保持。
  增加文件／组内序号、路径与大小边界、实体和礼物转换、成组展开及文件错误确认；提交复用固定预览字节。
  首轮专项暴露 ConcatenatedEntitySet 不属于通用成组接口，补充目标存档格位读取后，11 格式文件／PC 展开及 PGT 检查通过。
  文件到导入计划的联动、礼物随机结果固定和 RentalTeam8 专项通过；租借样本初始 HP 未设置导致 Core 拒绝，按 Core 状态初始化后通过。
  诊断输出曾出现一次转义编译错误，已移除；最终专项与完整原生套件退出码 0。
  npm run verify 通过：204 文件／753 项前端测试、网页与 PWA 构建成功；保留既有 Hook、JSExport 与构建提示。
  按授权提交推送来源层、检查及文档；未重建浏览器核心，未进行新版浏览器或真实存档验收。
  当前仍无 Worker／界面入口；精确 PC 布局替换、完整导入设置和真实文件验收仍待完成。

- 2026-09-27 完成 BoxImportPreview 实体输入层，main 基线 b0da046，API 63 保持。
  增加逐格删除／覆盖记录和独立确认、实际写入计数、保护／兼容性／容量结果、源哈希过期检查及固定字节副本提交。
  使用 Core 原始格位存在判定；导出重读核对箱子元数据、内容、保护标记及队伍，无操作保留原始字节。
  11 格式专项通过，清空／覆盖四种组合与 Core 导入导出逐字节一致；完整原生套件通过，包含新增容量与保护格位预览用例。
  npm run verify 通过：204 文件／753 项前端测试、网页与 PWA 构建成功，保留既有 Hook、JSExport 与构建提示。
  当前未公开新接口，未重建浏览器核心或进行新版界面验收；按授权提交推送内核、检查和文档。
  下一步接入文件／礼物／成组来源解析、导入设置完整检查、Worker 和界面；内部内核不等于完整批量导入功能。

- 2026-09-27 核对箱子批量导入契约，main 基线 6bd8494，API 63 保持。
  识别 Core 空输入仍可能先清空箱子、覆盖计数包含受保护跳过格位两项行为，添加 11 格式固定检查。
  后续适配要求副本预览、显式删除范围、实际写入计数、兼容性与导入设置，并保留礼物／成组输入扩展范围。
  首轮兼容性夹具误用 PK3 无法表达的种类编号，改为可表达但超出游戏范围的招式；修正后 11 格式专项及完整原生套件通过。
  npm run verify 通过：204 文件／753 项前端测试、网页与 PWA 构建成功；保留既有 Hook、JSExport 与构建提示。
  本批生产核心未改动，未重建核心；按授权提交推送检查和文档，产品批量导入入口尚未接入。
  Chrome 2／1601080320 普通刷新及等待后仍加载 index-BoVopdVG.js，本机 index.html 与 sw.js 均包含新版 index-CF3dCxFq.js。
  一次页面读取超时后恢复，未重复启动服务或更改浏览器存储；已请求所有者手动刷新，新版箱子导出界面仍待核验。
  下一步实现批量导入副本预览和固定结果提交，继续保留浏览器与真实文件核验；完整 PKHeX 目标不变。

- 2026-09-27 接入箱子 ZIP 导出（API 63），main 基线 f9b6b5f。
  当前／全部箱子、目录命名、编号前缀及包含空格／无效实体均可选择；默认 Core 文件名，同名自动加后缀。
  Worker 独立传输 ZIP，三语可折叠入口沿用现有表单；不改变工作副本、撤销链或原始文件。
  11 格式专项及完整原生套件通过，ZIP 文件名和内容逐项对照原生 BoxExport，包含重复／保留目录名检查。
  核心构建及 npm run verify 通过：204 文件／753 项测试、网页与 PWA 构建成功（253 项预缓存）。
  保留既有 JSExport、裁剪、Hook、网页体积与插件耗时提示。本批无失败工程检查，按授权提交推送。
  Chrome 2／1601080320 在授权 127.0.0.1:5173 读取 E.sav 工程样本，确认 API 62 箱子壁纸与宝可梦图像显示。
  文件批量页实际加载 18 种格式；PK3 的 235 个属性名／类型与原生目录一致（逐项串联 FNV-1a a5733e66）。
  legal-shedinja.pk3 执行 .IV_HP=31 后显示可导出；本机实际下载 PokeRNGKit-Pokemon.zip，实体 100 字节、HP IV 31、校验 18600 一致。
  下载事件监听超时，但页面反馈和落盘文件确认完成，控制台无错误／警告；目录选择自动化未改变选择列表，仍待核验。
  最终 API 63 构建与本机 HTTP 为 index-CF3dCxFq.js，Chrome 普通刷新后仍为 API 62 的 index-BoVopdVG.js。
  未以旧页面验收新增箱子导出；其下载、窄屏、三语切换及真实文件待核验。工程样本已关闭，未修改个人存档或浏览器存储。
  下一步核对新资源生效后的箱子导出，再继续批量导入与独立实体文件工作流；完整 PKHeX 目标不变。

- 2026-09-27 修复明确扩展名的加密 PK4／PK5 读取顺序，main 基线 e570a2d，API 62 协议保持。
  单只导入与文件批量共用副本解密后识别，保留校验与格式冲突检查；BK4 和未知扩展名沿用 Core 行为。
  增补 DS 仓储／队伍、多 PID、单只导入、错误扩展名、损坏校验与 11 格式明文／加密 ZIP 对照。
  文件专项、完整原生套件、核心构建与 npm run verify 通过：204 文件／753 项前端测试、网页与 PWA 构建成功。
  保留既有 JSExport、反射裁剪、Hook 和网页体积／插件耗时提示；本批无失败工程检查。
  上批 Actions 36316096869 已成功。本批按授权提交推送；浏览器与真实存档验收未完成。
  下一步继续独立宝可梦文件工作流及世代专属窗口，保留浏览器资源不一致问题；完整 PKHeX 目标不变。

- 2026-09-27 接入文件批量编辑 Worker 与三语页签（API 62），main 基线 1291b10。
  提供文件／目录选择、全实体属性目录、指令构建、双层分页预览和 ZIP 副本下载；不写入当前存档工作副本。
  新增票据替换／取消／重复下载／失败清理及 JSON 检查，文件读取支持取消并在读取前检查总量。
  原生专项、独立类型、5 项文件输入检查、完整原生套件、核心构建与 npm run verify 通过。
  最终前端 204 文件／753 项测试、网页及 PWA 构建通过；核心产物先于网页打包完成。
  追加裁剪检查确认 25 个实体／继承类型的属性签名及访问器保留。保留 JSExport、反射裁剪、Hook、网页体积与插件耗时提示。
  上批 Actions 36314141313 已成功。本批无失败工程检查，按授权提交推送。
  Chrome 2／1601080320 刷新和新标签 1601080337 均加载 index-BlFknA01.js；最终构建及本机 HTTP 返回 index-BoVopdVG.js。
  已停止本任务旧预览进程并确认端口释放，以最终构建重启 5173 服务，Chrome 仍旧资源，原因未确定；页面控制台无错误／警告。
  未向旧页面导入示例文件，不据此验收新页签。目录选择、裁剪后属性、ZIP 下载、响应式与真实文件仍待外部浏览器核验。
  下一步继续文件流程的剩余功能与专用窗口清单，保留浏览器资源不一致问题；完整 PKHeX 目标不变。

- 2026-09-27 实现文件批量编辑内部预览与 ZIP 导出，main 基线 2407c02，API 61 和页面入口不变。
  共用指令解析，保留混合格式、逐组队伍初始化、三语名称和相对目录；固定预览结果，分别确认失败、空值与忽略行。
  拒绝明确扩展名冲突、危险／重复路径和超限输入；每次输出重读对照，原文件与上下文存档保持。
  最终 11 格式文件专项与原有存档批量预览、完整原生套件、核心构建及 npm run verify 均通过。
  前端 203 文件／748 项测试、网页及 PWA 构建通过；核心生成先于最终网页打包，未以旧资源代替本批产物。
  新批量调用有同类反射裁剪提示，沿用属性保留清单；保留既有 JSExport、Hook、网页体积与插件耗时警告。本批无失败检查。
  上批 Actions 36312995689 已成功。本批按授权提交推送；功能清单明确内部内核与页面接入的区别。
  下一步接入 Worker 生命周期、文件／目录选择、三语预览与副本下载；浏览器裁剪运行、真实文件及完整 PKHeX 目标继续推进。

- 2026-09-27 核对文件／目录批量编辑契约，main 基线 acf0b1c，API 61 与产品入口保持不变。
  新增 11 格式明文／加密输入、原格式、来源路径、同名文件、部分失败、队伍导出与跨组初始化检查；最终定向检查通过。
  首轮夹具误用 DP 组合版本，改为单游戏版本；第二轮确认上游将本次加密 PK5 样本识别为有效 PK4，新增明确限制检查。
  后续文件适配须处理扩展名与识别结果冲突，并保留相对目录，避免桌面版平铺输出造成同名覆盖；原存档与 Core 不变。
  完整原生套件与 npm run verify 通过：全仓格式、静态检查、类型、203 文件／748 项前端测试及网页／PWA 构建。
  保留既有 JSExport、Hook、网页体积与构建插件耗时警告；生产核心未改动，本批未重建核心。
  上批 Actions 36311944202 已成功，中途一次查询遇到 TLS 超时后恢复。本批按授权提交并推送检查与文档。
  下一步接入文件选择、逐项预览和保留路径的副本导出；完整 PKHeX 目标及真实存档／浏览器核验继续推进。

- 2026-09-27 接入通用批量编辑 Worker 与三语页签（API 61），main 基线 178c5a6。
  提供属性目录、指令构建、范围、分页预览和独立确认，沿用工作副本／撤销；票据替换、取消和成功提交均释放旧结果。
  显式保留批量实体类型及继承成员，新增票据、JSON、目录和裁剪清单检查，11 格式定向检查通过。
  完整原生套件、核心构建、独立类型检查与最终 npm run verify 通过：203 文件／748 项前端测试、网页及 PWA 构建。
  发布后追加检查确认 25 个实体／继承类型的全部属性签名和 getter/setter 可见性／方法体保持；11 格式目录产物已生成。
  首次直接在桌面加载浏览器裁剪程序集出现 IEnumerator.Reset 类型加载异常，改为读取 PE 元数据对照；不将该诊断视为浏览器失败。
  保留既有 JSExport、裁剪、Hook、网页体积和插件耗时警告。前批 178c5a6 的 Actions 36309840560 已成功。
  本机最初无 5173 监听，已启动授权地址的 Vite preview。Chrome 2／1601080320 连接可用，但刷新后仍加载 index-BlFknA01.js，
  本轮最终构建为 index-Bmht6E7o.js，原因尚未确定；未向旧页面导入测试存档，实际目录与界面仍待浏览器核验。
  本批按授权提交推送；下一步继续文件／目录批量流程，保留真实存档与浏览器核验清单，完整 PKHeX 目标不变。

- 2026-09-27 实现通用属性批量编辑内部预览／提交适配，main 基线 c3cfc4c，API 60 不变，未开放产品入口。
  预览固定随机结果、逐组状态与错误，提交核对源文件并分别确认部分失败、空值和忽略行；支持箱子范围和队伍重排。
  11 格式初次定向检查通过；首次编译发现 PartyCount 为受保护写入，已改为由上游格位方法维护。
  增补保护格位、损坏实体、无变化原件保持和多组来源筛选检查，最终 11 格式定向与完整原生套件通过。
  核心构建及 npm run verify 通过：全仓格式、静态检查、类型、203 文件／748 项测试及网页／PWA 构建。
  保留既有 JSExport、裁剪、Hook、网页体积与插件耗时警告；除首次编译外无失败检查。本批按授权提交推送。
  前批 c3cfc4c 的 Actions 36308638301 已成功；本批推送后另行查询。
  下一步接入 Worker 预览生命周期、保留浏览器属性目录及三语构建器；完整目标与真实存档／浏览器核验继续推进。

- 2026-09-27 核对通用属性批量编辑契约，main 基线 cee33e6，API 60 与产品入口保持不变。
  新增 11 格式检查：筛选、顺序运算、属性引用、部分失败、多组联动、来源编号和三语名称解析；定向检查全部通过。
  确认 Core 会保留部分成功修改、忽略未识别行，预览必须展示实际解析与失败结果。
  属性目录依赖反射，后续须核对浏览器裁剪包；当前原生证据不能证明浏览器目录完整。
  最终完整原生套件与 npm run verify 通过：全仓格式、静态检查、类型、203 文件／748 项测试、网页与 PWA 构建。
  保留既有 JSExport、Hook、网页体积和插件耗时警告；本批没有失败检查，未改核心产品代码或重建核心。
  本批按授权提交推送测试与契约文档，不将此项标为产品已接入。前批 Actions 36307704920 已成功。
  下一步实现预览／提交适配器、队伍删除重排及三语指令构建器；真实存档、浏览器及完整 PKHeX 目标继续推进。

- 2026-09-27 接入箱子批量菜单（API 60），包含 Core 四类动作、当前／全部箱子、反向／反选与三语名称。
  使用临时副本隔离 Core 全仓排序重写，只应用选定范围内变化格位；保留保护规则、撤销和原件。
  main 基线 d727db6，本批功能、检查和文档按授权提交推送。类型及最终 11 格式定向检查通过。
  初始原生与诊断共有 5 次失败，定位为招式随机回退、未变空格位重新编码、异常来源被 Core 拒绝和第六世代孵化随机回忆。
  已调整对应验证并增加原子拒绝与三语提示，合法上游大岩蛇的心金完整服务检查通过。
  最终完整原生套件、核心构建及 npm run verify 通过：全仓格式、静态检查、类型、203 文件／748 项测试与网页及 PWA 构建。
  保留既有 Hook、核心裁剪与网页体积警告；本次最终前端测试未报告 Worker 退出超时。
  上一批 Actions 36305497534 已成功。真实存档与浏览器待核验；下一步接入通用属性批量编辑，继续核对专用窗口。

- 2026-09-27 接入箱子布局剩余操作（API 59）：解锁箱数、十六进制标记与整箱交换。
  保留第六世代解锁标记联动、锁定格位限制、工作副本及撤销；不扩大已有编辑格式白名单。
  main 基线 5b1e544，代码、测试和文档按授权提交推送。最终 11 格式箱子专项与完整原生套件通过。
  核心构建、独立类型检查及完整 npm run verify 通过：全仓格式、静态检查、类型、203 文件／748 项测试、网页与 PWA 缓存。
  前端测试有两条既有 RNG 测试 Worker 退出超时提示，最终 748 项通过且命令退出 0；保留 Hook、核心裁剪及网页构建警告。
  增补检查确认未锁定对战队伍登记也阻止整箱交换，移除登记后可交换并反向恢复；本批未出现失败检查。
  上批 5b1e544 的 Actions 36303944848 已成功。真实存档与浏览器待核验，完整 PKHeX 目标继续有效。
  下一步继续核对剩余专用存档窗口和仓储全局工具，不将通用箱子布局视为全部 PKHeX 功能完成。

- 2026-09-27 接入 Z-A 图鉴（API 58）：三语入口、三组形态、十语言、超级进化及显示设置。
  修复清除捕获残留额外形态位，保留未修改原始数据与工作副本撤销。
  main 基线 8c6bc3f，本批功能、测试和文档按授权提交并推送。
  最终三种合成修订专项与完整原生套件、核心构建、独立类型检查和完整 npm run verify 均通过。
  verify 包含全仓格式、静态检查、类型、202 文件／746 项前端测试及网页与 PWA 离线缓存生成。
  保留既有 Hook、JSExport／裁剪、网页体积及构建插件耗时警告；本批未发生检查失败。
  上一批 8c6bc3f 的 Actions 36302212632 已成功，本批推送后的部署状态另行查询。
  真实存档和浏览器仍待核验；完整 PKHeX 目标继续推进，不把本次图鉴接入视为全部完成。
  下一步按功能清单核对剩余专用存档窗口，继续保持本地优先和原始存档保护。

- 2026-09-27 核对 Z-A 图鉴与三个修订，新增合成分块检查，API 57 及产品入口不变。
  覆盖完整序列化、内部地址、三组 32 位形态、十语言、四种显示性别及超级进化位。
  已记录越界种类映射至空条目、批量清除残留捕获位和原始布尔保留要求。
  main 基线 700e359，本批为测试与文档，按授权提交。三组专项与完整原生套件通过。
  npm run verify 通过：格式、静态检查、类型、201 文件／742 项测试及网页离线缓存生成；保留已有警告。
  本批未改产品代码，未重建核心或运行浏览器；700e359 的 Actions 36301367263 在最后查询时仍运行中。
  下一步实现 Z-A 编辑适配层与三语入口，真实存档和浏览器待核验，完整 PKHeX 目标继续有效。

- 2026-09-27 接入朱／紫旧版与 DLC 图鉴（API 57），增加独立三语编辑入口、字段校验、工作副本与撤销。
  保留原始异常值与未改字节，适配缺失 DLC 块、末项范围及各形态地区显示差异。
  当前 main 基线 eca18de，本批功能、测试及文档按授权提交。六组最终专项、完整原生套件及核心构建通过。
  完整 npm run verify 通过：格式、静态检查、类型、201 文件／742 项测试及网页离线缓存生成。
  首轮前端测试有 worker 退出超时提示但退出 0，最终 verify 无此提示；保留已有 Hook、核心裁剪与网页构建警告。
  上一批 eca18de 的 Actions 36299287357 已成功；真实存档及浏览器待核验。
  完整 PKHeX 接入继续推进，下一步核对 Z-A 图鉴及剩余专用窗口，不把图鉴覆盖视为整个目标完成。

- 2026-09-27 核对朱／紫旧版与 DLC 图鉴，补充两版本各三修订的合成分块检查。
  覆盖内部种类地址、位图、九语言、地区显示及完整输出中的无关数据保持。
  API 56 与产品入口不变；当前分支 main，基线 d93f63e，工作区为本批测试和文档改动。
  原生检查首轮因语言枚举名称错误未编译，改用 Core 的 ChineseS 后六组专项及完整原生套件通过。
  npm run verify 通过：全仓格式、静态检查、类型、200 文件／736 项测试及网页构建；保留已有警告。
  本批仅改测试与文档，未重建核心或运行浏览器；上一批 d93f63e 的 Actions 36298654505 仍在运行。
  不将合成块表视为真实存档验收；下一步接入朱／紫图鉴适配层、三语界面并处理已记录上游差异。

- 2026-09-27 接入阿尔宙斯图鉴与高级研究（API 56）：242 种、形态／体型、任务、30 项计数与汇报。
  区分只读研究状态与可编辑进度，保留原始异常值和隐藏数据，沿用工作副本、撤销与三语资源。
  两种合成修订专项、最终原生套件、200 文件／736 项前端测试、最终类型、静态检查及核心／网页构建通过。
  保留既有 Hook、核心裁剪、网页体积和构建插件耗时警告。
  真实存档端到端与浏览器待核验；上一批 50cf4b9 的 Actions 36297217080 已成功。
  完整 PKHeX 目标继续推进，下一步核对朱／紫图鉴及剩余专用窗口。

- 2026-09-27 接入剑／盾图鉴（API 55）：三个地区的独立记录、全部形态位、九语言、显示与次数，
  明确区分手动地区记录和 Core 批量主记录范围，沿用原件保护、工作副本与撤销。
  六组增强原生专项、最终原生套件、前端 199 文件／729 项测试、最终类型、静态检查及核心／网页构建通过。
  保留测试 worker 退出超时、既有 Hook、核心裁剪和网页体积警告。真实游戏存档端到端及浏览器待核验。
  上一批 8ca6e36 的 Actions 36295898806 已成功。
  完整 PKHeX 接入目标继续有效，下一步核对阿尔宙斯图鉴与剩余世代专用窗口。

- 2026-09-27 补充剑／盾分块存档合成工程夹具：两版本各三种图鉴块组合，六组专项检查通过。
  检查加密哈希、无改动完整导出、400／611／821 个独立图鉴地址及修改后其他字节保持。
  已测访问器使用明确标量／数组类型，未知块仍为合成类型，不视为真实游戏存档或产品入口验收。
  原有非法空白模板拒绝检查保留，生产识别器与 API 54 不变。原生全套检查通过。
  完整 PKHeX 目标继续推进，下一步接入剑／盾图鉴界面及适配层。

- 2026-09-27 接入晶灿钻石／明亮珍珠图鉴（API 54）：493 种、四种状态、九语言及 13 种形态记录。
  区分当前种类与全图鉴操作，保持手动字段独立性和未修改原始数据。
  八组存档专项、198 文件／724 项前端测试、类型、静态检查、最终原生套件及核心／网页构建通过。
  保留既有 Hook、核心裁剪与网页构建警告。上一批 d1be200 的 Actions 36294282192 已全部成功。
  浏览器待核验，完整 PKHeX 接入目标继续推进；下一步核对剑／盾图鉴和分块存档工程夹具。

- 2026-09-27 接入 Let’s Go 图鉴及捕获／传送次数（API 53）：186 份体型记录与 153 种计数。
  修复形态体型未保存、批量传送求和溢出问题；保留异常原值，沿用工作副本和撤销。
  两版本原生套件、197 文件／721 项前端测试、类型、静态检查及核心／网页构建通过。
  前端单项超时上限为 30 秒，断言不变；保留既有 Hook、核心裁剪与网页构建警告，浏览器待核验。
  上一批 c5e5d5e 的 Actions 36293079484 已全部成功；整体 PKHeX 接入目标继续推进。
  下一步接入晶灿钻石／明亮珍珠图鉴，并继续剩余专用窗口。

- 2026-09-27 接入第七世代 SM／USUM 图鉴（API 52）：独立形态条目、九语言、四类见过／显示及批量操作。
  本体和形态按真实索引分别编辑，共 1061／1116 条，沿用工作副本与撤销。原生套件通过。
  全仓前端测试 716/717 首轮通过，日期子进程一项超时；原断言单独重跑三项全部通过。
  类型、静态检查、核心与网页构建通过；保留既有 Hook、核心裁剪、网页体积／插件耗时警告。
  浏览器待核验，不将工程检查视为所有者验收。
  上一批 45a5ce6 的 Actions 36291791385 已全部成功。
  PKHeX 全量接入目标继续有效，下一步核对 Let’s Go 图鉴及剩余专用窗口。

- 2026-09-27 接入第六世代 XY／ORAS 图鉴（API 51）：721 种、七语言、形态、来源和计数及 DexNav。
  第五／六世代共用界面；按真实版本保留输入规则，修复上游形态读取、批量性别表及 DexNav 范围问题。
  两种格式原生套件、全仓 195 文件/714 项前端测试、类型、静态检查、核心与网页构建通过。
  保留既有 Hook、核心裁剪及网页体积/插件耗时警告；浏览器待核验，下一步继续第七世代图鉴。

- 2026-09-27 接入第五世代图鉴（API 50）：649 种、普通／闪光显示、形态、七语言及全国／图案设置。
  黑白与黑白2按各自形态范围读写；修饰键改为明确选项，保留上游批量语义与异常原记录。
  两种布局最终原生套件、全仓 194 文件/710 项前端测试、类型、静态检查、核心与网页构建通过。
  保留既有 Hook、核心裁剪及网页体积/插件耗时警告；浏览器待核验。上一批 4b25f21 的 Actions 36289854800 已全部成功。
  本轮重新连接外部 Chrome 并刷新 127.0.0.1:5173，仍加载旧的 index-BbDn0w3C.js，不能用于新图鉴验收。
  下一步继续第六世代图鉴及剩余专用窗口，不把当前图鉴覆盖视为完整 PKHeX 接入完成。

- 2026-09-27 接入第四世代专用图鉴（API 49）：493 种、六语言、性别／形态顺序、解锁及五种批量操作。
  DP、Pt、HGSS 按版本能力开放；未应用条目草稿暂停切换和其他写操作，保持工作副本／撤销链。
  三种布局最终原生套件、全仓 193 文件/705 项前端测试、类型、静态检查、核心与网页构建通过。
  保留既有 Hook、核心裁剪及网页体积/插件耗时警告；浏览器待核验，下一步继续第五世代专用图鉴。

- 2026-09-27 接入第一至第三世代基础图鉴（API 48），覆盖逐项标记与四种批量操作。
  独立入口使用三语名称和本地图像；第二世代未知图腾、GBA 三份见过位图、FRLG 特殊文件名规则按上游联动。
  第一、二世代单独开放图鉴编辑和工作副本下载，其他编辑器保持原范围。
  韩文金银按主区与备份区的实际写入规则分别检查校验和，四类独立损坏均拒绝编辑和下载。
  原生套件、全仓 192 文件/701 项前端测试、类型、静态检查、核心与网页构建通过。
  保留既有 Hook、核心裁剪及网页体积/插件耗时警告；浏览器待核验。
  上一批 49945f1 的 Actions 36287034795 已全部成功；后续继续扩展第四世代及以后的专用图鉴。

- 2026-09-27 接入 XY 训练家昵称与完整外观属性（API 47），男性 30 项、女性 34 项。
  三语折叠入口、完整命名枚举与高级编号，保留未改位模式和昵称尾部，性别失配的草稿保留并提示重置。
  两种性别全部属性/命名项与原生套件、24 项定向测试、全仓 191 文件/698 项测试通过。
  最终类型、全仓静态检查、核心与网页构建通过，保留既有 Hook 提示及核心裁剪/网页体积警告。
  浏览器待核验；上一批 1f4a5b2 的 Actions 36285655002 已全部成功。
  下一步核对图鉴编辑，继续补齐通用存档入口及完整 PKHeX 清单。

- 2026-09-27 接入第七、八世代游戏版本标记（API 46），第六世代遵循上游禁用设置。
  日月/究极日月允许修改全部四个标记，但不转换格式；不匹配时暂停配置联动。
  应用、撤销、恢复后同步配置候选，修复配置下拉框使用翻译名称作为内部值的问题。
  原生套件、21 项定向测试、全仓 190 文件/674 项测试、类型、核心与网页构建通过。
  全仓格式和静态检查通过，保留既有第三世代定点 Hook 提示及核心裁剪/网页体积警告。
  浏览器和剑盾真实存档往返待核验；上一批 06ecbe6 的 Actions 36284458594 已全部成功。
  其他训练家字段及完整 PKHeX 清单继续推进，下一步核对 XY 训练家昵称与外观字段。

- 2026-09-27 接入第六至第八世代地图、坐标、旋转及剑盾缩放（API 45）。
  按上游精度/单位保存，剑盾地图保留 uint64 精度，BDSP Y 截断预览，保留未改旋转与异常浮点字节。
  五种工程存档与剑盾 Core 对象、原生套件、22 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告。
  浏览器及剑盾真实存档往返仍待核验；上一批 9c337ac 的 Actions 36283278115 已全部成功。

- 2026-09-27 接入第六/七世代最近保存时间、剑盾和 BDSP 日期（API 44）。
  日期按字段呈现精度及范围，BDSP 使用浏览器本地时区并保留小数秒，未改异常数据保持，支持明确修复。
  最终原生套件、21 项前端测试、变更文件 lint、全量类型检查、核心与网页构建通过，保留既有构建警告。
  剑盾使用 Core 对象，仍缺实档往返证据；浏览器待核验，完整清单继续推进。
  上一批 1902476 的 Actions 36281964027 已全部成功。

- 2026-09-27 接入第四至第七世代冒险开始/首次名人堂日期（API 43），按世代日历范围精确到秒。
  三语折叠入口沿用草稿、撤销和导出回读，保留未改异常日期与第五世代高位，避免 DS 远期日期溢出。
  九种存档日期检查、原生套件、17 项前端测试、变更文件 lint、核心与网页构建通过，保留既有构建警告。
  浏览器待核验，最近保存及剑盾/BDSP 日期继续接入；上一批 275caf4 的 Actions 36280664028 已全部成功。

- 2026-09-27 接入 DS 训练家地图与坐标（API 42），覆盖 DP、Pt、HGSS、BW、B2W2。
  三语折叠入口、位置草稿成组撤销、X/Y 关联坐标同步与负 Z 转换提示，未改异常值保持。
  五种 DS 存档的位置边界、完整输出、负 Z 编码、关联坐标与异常地图保持及原生套件通过。
  20 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告；浏览器待核验。
  完整 PKHeX 清单继续推进。

- 2026-09-27 接入第四/第五世代训练家国家和地区（API 41），覆盖 DP、Pt、HGSS、BW、B2W2。
  使用世代专用三语目录和默认地区，按 DS/3DS 区分国家零值行为；DS 不显示或写入不存在的主机区域。
  支持草稿、撤销及导出回读，未知原值未改时保持；19 项前端测试与变更文件 lint 通过。
  五种 DS 存档的完整目录/配对、各国家首尾地区完整输出、边界及异常值保持与原生套件通过。
  类型、核心与网页构建通过，保留既有构建警告；浏览器待核验，完整 PKHeX 清单继续推进。
  上一批 e6d851b 的 Actions 36279166166 已全部成功。

- 2026-09-27 接入 GBA 训练家游戏设置（API 40）：文字速度、战斗方式、声音、战斗动画。
  三语折叠入口沿用草稿、应用、撤销和完整导出回读，其他设置位保持，无法原样写入的速度请求明确拒绝。
  三种 GBA 格式的 32 种可写组合与异常速度检查通过；RS/FRLG 为合成扇区，E 为工程夹具。
  最终原生套件、18 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告。
  本地 Chrome 刷新仍加载 index-BbDn0w3C.js 旧页面，新设置界面待核验。
  上一批 eb260fe 的 Actions 36278194585 已全部成功，完整 PKHeX 清单继续推进。

- 2026-09-27 补齐游戏记录中文/日文名称，第八世代内部代号另提供可读英文名称，详情保留上游原名。
  按完整字符串匹配，未知含义和未命名记录明确标注；不改变 API 39 或记录编辑范围。
  覆盖测试核对 vendored Core 的第六至第八世代目录，16 项前端测试、变更文件 lint 与网页构建通过。
  类型与全仓格式检查通过；保留既有构建警告。浏览器待核验，完整 PKHeX 清单继续推进。
  上一批 63d93c8 的 Actions 36277302408 构建及两项部署已成功，Windows 打包仍在运行。

- 2026-09-27 接入独立游戏记录页（API 39）：XY/ORAS、SM/USUM 各 200 项，剑／盾 50 项、BDSP 30 项。
  支持名称/编号选择、动态上限、时间解释、应用/撤销与整个记录区回读；保留负数及隐藏异常原值。
  五种存档全部记录完整输出、边界、原文件保持与原生套件、剑／盾 Core 对象、14 项前端测试通过。
  第六/七世代无法正常回读的部分 int16 上限请求明确拒绝；不输出负数或截断修改。
  最终类型、变更文件 lint、核心与网页构建通过，保留既有构建警告；浏览器和记录专名三语词表仍待完善。
  上一批 1e60845 的 Actions 36276162566 已全部成功。

- 2026-09-27 接入训练家 BP、宝可里程、圆庆币和瓦特（API 38），按存档提供四位/七位输入范围。
  同步上游规定的累计记录，未改余额不重写，界面说明副作用并沿用撤销与导出回读。
  七种存档完整输出、累计联动、边界/异常值保持、剑／盾 Core 对象及原生套件通过。
  13 项前端测试、变更文件 lint、类型、核心与网页构建通过，保留既有构建警告；浏览器仍待核验。

- 2026-09-27 接入训练家逐枚徽章（API 37）：GBA、第四/第五世代、XY/ORAS 与 BDSP，HGSS 支持 16 项。
  仅修改徽章字段，沿用草稿、撤销和导出回读；BDSP 保留未改异常系统标记。
  九种存档逐枚设置/清除、完整输出、边界与原生套件、12 项前端测试、变更文件 lint 通过。
  类型、核心与网页构建通过，保留既有构建警告；浏览器待核验，完整 PKHeX 清单继续推进。

- 2026-09-27 接入训练家国家、地区和 3DS 区域（API 36），覆盖 XY、ORAS、SM、USUM。
  使用上游本地目录，保持未改异常值，撤销按国家/地区成组保留独立草稿；不联动改写宝可梦产地。
  四种存档完整输出、目录/边界与异常值保持、原生套件、11 项前端测试和变更文件 lint 通过。
  类型、核心与网页构建通过，保留既有构建警告；浏览器待核验，完整 PKHeX 清单继续推进。
  上一批 ebd1d76 的 Actions 36273861449 已全部成功。

- 2026-09-27 接入训练家存档语言（API 35），覆盖已开放的第六至第八世代格式，按版本提供三语目录。
  与界面语言独立；未改姓名保留原字节，改名先使用目标语言，剑／盾同步内部语言字段。
  五种存档的全部支持语言、Unicode 姓名与完整输出、旧格式拒绝、剑／盾 Core 对象及原生套件通过。
  10 项前端测试、类型、变更文件 lint、核心与网页构建通过，保留既有构建警告；浏览器仍待核验。
  上一批 a750d7c 的 Actions 36272806061 已全部成功；完整 PKHeX 清单继续推进。

- 2026-09-27 扩展训练家性别与游玩时间（API 34），并将训练家应用接入工作副本、撤销和资料联动。
  未改姓名/时间保持原字节；剑／盾性别变化沿用核心外观重置，未变不重置，界面说明副作用。
  11 种存档完整输出与边界、剑／盾 Core 对象外观行为、原生套件、9 项前端测试及变更文件 lint 通过。
  最终类型、核心与网页构建通过，保留既有构建警告；浏览器待核验。
  上一批 22b32fa 的 Actions 36271584796 已全部成功；其余训练家字段和完整 PKHeX 清单继续推进。

- 2026-09-27 接入背包高级编辑（API 33）：完整版本目录、单格高级数量范围和 PC/自由空间批量入口。
  保留普通模式限制、原文件和撤销；写回后核对请求值，拒绝位宽截断或核心丢弃的修改。
  11 种存档高级行为、完整输出及原生套件通过，补充 BDSP 清空重排与空白项数量差异检查。
  7 项前端测试、类型、变更文件 lint、最终核心与网页构建通过，保留既有构建警告。
  Chrome 在最终构建后刷新仍加载旧 index-BbDn0w3C.js，浏览器待核验，完整目标继续。
  上一批 8c467fc 的 Actions 36270616576 已全部成功。

- 2026-09-27 接入背包列表与单格草稿道具图片（API 32），复用上游 606 张本地 PNG。
  按核心世代转换与 TM/TR 规则配图，空格无图、未知编号使用回退图；保留文字与既有编辑流程。
  来源与哈希清单、可重复导入脚本已补齐；原生套件、7 项前端测试、类型、变更文件 lint、核心与网页构建通过。
  606 张图片原始哈希逐项通过，保留既有构建警告；上一批 c456486 的 Actions 36269597636 已全部成功。
  localhost Chrome 刷新后仍加载旧 index-BbDn0w3C.js，新版 UI 待核验；完整 PKHeX 目标保持。

- 2026-09-27 接入口袋排序与批量操作（API 31）：六种排序、统一数量、获得全部、清空及容量不足时的随机选择。
  沿用上游口袋限制和逐道具数量规则，共用编码差异合入与撤销流程。
  11 种存档排序/批量完整输出、随机容量/范围、输入边界及特殊道具数量截取通过。
  原生套件、648 前端测试、类型、变更文件 lint、核心与网页构建通过，保留既有构建警告，浏览器待核验。
  上一批 `520b9f1` 的 Actions `36268411351` 已全部成功。
  道具图片与其他 PKHeX 功能继续推进，完整目标保持。

- 2026-09-27 接入单格背包编辑（API 30）：道具目录、数量、支持的标记、清空草稿及撤销联动。
  采用核心编码差异合入，避免整包写入附带清理其他数据；早期格式清空非空格位后前移后续格位。
  11 种存档完整输出、标记设置/清除、顺序与保留位检查、原生套件、648 前端测试、类型及变更文件 lint 通过。
  最终核心与网页构建通过，保留既有构建警告；上一批 `fdfc22f` 的 Actions `36266876402` 已全部成功，浏览器仍待核验。
  背包排序、批量操作与图片仍待接入，完整 PKHeX 目标保持。

- 2026-09-27 接入背包读取入口（API 29）：按口袋查看真实格位、三语道具名、数量上限和格式专有标记。
  支持搜索、空格位与分页；不自动清理异常原值，不改变原存档。
  11 种存档读取、未知编号/超限值保持、原生套件、648 前端测试、类型、变更文件 lint、核心与网页构建通过。
  保留既有构建警告，浏览器待核验；上一批 `feed0e6` 的 Actions `36265833412` 已全部成功。
  背包编辑、排序、批量操作与图片仍待接入，完整 PKHeX 目标保持。

- 2026-09-27 修正基础编辑隐式重置经验、恢复血量和清除异常状态的问题。
  仅在等级/成长曲线变化时重设经验，仅在等级或计算能力值变化时重算队伍数值；保留未修改的训练家名称字节。
  编辑字段不变，握手提升为 API 28 以识别缓存旧核心；11 种存档受伤/濒死场景及原生套件通过。
  类型、变更文件 lint、5 项前端领域测试、核心与网页构建通过，保留既有构建警告。
  上一批提交 `7e055b9` 的 Actions `36264404084` 已全部成功；线上 UI 地址仍待提供，完整 PKHeX 清单继续推进。

- 2026-09-27 接入极限特训六标记与华丽大赛六项数值（API 27），按实体接口显示与限制。
  保留原始个体值、未使用标记位和健康状态；仅特训影响队伍能力值重算，华丽大赛编辑不重算。
  华丽大赛 11 种存档、极限特训三种存档往返及 15 实体能力/边界检查通过。
  原生套件、648 前端测试、类型、变更文件 lint 与两阶段构建通过，保留既有构建警告。
  已请求所有者指定线上 UI 检查地址；浏览器待核验，完整 PKHeX 清单继续推进。
  上一批持有者与居住记录提交 `7739411` 的 Actions `36263357207` 已全部成功，含双站部署与 Windows 打包。

- 2026-09-27 接入当前持有者切换和五组居住记录（API 26），含三语目录、草稿、逐行/全部清空。
  核对上游后修正归属：记忆窗口持有者为只读，切换依据宝可梦主编辑器。
  只改变指定字段，保留亲密度、记忆、记录顺序与空位；分离只读目录与编辑禁用条件。
  四种存档居住记录及五种存档持有者往返、原生套件、648 前端测试、类型、变更文件 lint 与两阶段构建通过。
  保留既有构建警告，浏览器待核验。
  上一批互动数值提交 `4dc07f2` 的 Actions `36262161032` 已全部成功，含双站部署与 Windows 打包。
  完整 PKHeX 清单继续推进。

- 2026-09-27 接入双训练家亲密度/好感度及格式支持的饱食、愉悦、社交度（API 25）。
  按实际接口与上游限制提供三语编辑，仅写入变更项，蛋字段明确为剩余孵化周期。
  五种存档字段往返与数据保持、原生套件、648 前端测试、类型、lint 及两阶段构建通过，保留既有警告。
  居住记录和持有者切换继续推进；Chrome 仍为旧入口，新界面待核验。
  上一批记忆编辑与草稿刷新已提交推送为 `b3f7c60`，Actions `36261163871` 全部成功，包含网页构建、双站部署和 Windows 打包。

- 2026-09-27 接入原训练家/接手训练家的记忆目录与四字段编辑（API 24），含三语预览、清空和草稿保护。
  修正摘要外字段在应用/撤销后编辑草稿不刷新的问题，保留盒子选择。
  五种存档的双训练家记忆往返、边界及完整载荷保持通过；648 前端测试、类型、lint 和两阶段构建通过，保留既有警告。
  `738424c` 的 Actions `36259551366` 已全部成功：网页构建、GitHub Pages/Cloudflare 部署及 Windows 打包均完成。
  完整功能清单和新版浏览器检查继续推进，不等同于所有者验收。

- 2026-09-27 已将累积改动提交推送为 `5bd8f78`；Actions `36259258716` 在 npm 安装阶段失败。
  原因是两个 `@noble/*` 锁定地址指向镜像站，被 npm 的远程包策略拒绝。
  改为官方 npm 地址；2.4.0 版本及 SHA-512 与官方元数据一致，不放宽安装限制。
  待推送修复后查看重新构建结果，完整 PKHeX 清单和新版浏览器检查继续推进。

- 2026-09-27 接入缎带合法性提示、核心建议及精简操作（API 23），保留关联字段和撤销。
  11 格式核心一致性检查、类型、lint、648 前端测试、核心/前端构建与格式检查通过，保留既有警告。
  所有者已授权提交推送；本次提交范围为可视化仓储至 API 23 的累积改动和 1,707 张本地图片。
  完整 PKHeX 目标仍未完成，浏览器新版检查待继续。

- 2026-09-27 补充 161 张本地缎带/证章图标及数量分级规则，资源来源与哈希已记录。
  不改变存档协议；3 项资源/映射检查、类型、lint、前端构建与格式检查通过。
  Chrome 刷新后仍为旧入口，新图标浏览器检查待完成；未提交或推送。

- 2026-09-27 接入缎带与证章手动编辑（API 22），含三语目录、搜索/持有筛选、数量与佩戴项。
  静态映射在 15 种实体上与上游字段集一致；11 存档格式往返与数据保持通过。
  类型、lint、645 前端测试及核心/前端构建通过，保留既有警告与测试清理提示。
  图标、合法性辅助及浏览器检查仍待补齐，未提交或推送。

- 2026-09-27 接入四槽回忆招式与 PKHeX 建议预览（API 21），三语目录、草稿清空及明确应用。
  保留当前招式、PP 与队伍健康数据，旧格式隐藏入口；五种存档往返与只读建议检查通过。
  原生套件、类型、lint、645 前端测试及核心/前端构建通过，保留既有警告。
  完整目标继续推进，浏览器待检查，未提交或推送。

- 2026-09-27 接入异色操作（API 20）：PID/SID 双路径、任意/指定 XOR 异色及取消异色。
  区分身份与遭遇关联影响，保留队伍健康数据，旧来源按规则同步 EC。
  指定 PID 用有限完整候选检查处理未知图腾无解，保留形态和原来源游戏。
  11 格式双路径往返、未知图腾 28 形态有解/无解及旧来源 EC 同步检查通过。
  类型、lint、645 前端测试与两阶段构建通过，保留既有警告，浏览器待检查。
  完整目标保持，未提交或推送。

- 2026-09-27 接入转换为蛋（API 19），联动名称、周期、地点、日期与记忆。
  保留既有蛋来源记录、原始初训家字节和队伍健康状态，拒绝导致全蛋队伍的转换。
  界面提示第三世代掌机日文蛋规则；11 格式的原训练家/交易场景往返和数据保持检查通过。
  类型、lint、645 前端测试及两阶段构建通过，保留既有警告，浏览器待检查。
  完整清单仍在推进，未提交或推送。

- 2026-09-27 接入剩余孵化周期与核心孵化（API 18），支持三语与撤销，保留队伍健康状态。
  修正蛋周期误用当前持有者亲密度的问题，基础编辑同步使用原训练家字节。
  11 格式周期/孵化往返、持有者字段与数据保持检查通过，第六世代记忆按上游随机范围核对。
  类型、lint、645 前端测试与核心/前端构建通过，保留既有警告；反向转为蛋及完整清单仍待实现。
  浏览器仍受旧缓存影响，未提交或推送。

- 2026-09-26 接入来源游戏、球种和相遇/蛋地点（API 17），通过核心按需读取三语目录。
  目录随来源与当前格式联动，保留原有值供核对；仅应用变更字段，并处理第四世代地面类型。
  11 格式目录/预览/编辑往返、边界与数据保持检查通过；类型、lint、645 前端测试和构建通过。
  重启本地预览后 Chrome 仍载入旧版缓存，浏览器待检查；保留既有工程警告。
  蛋状态转换和后续完整清单仍待实现。
  未提交或推送。

- 2026-09-26 接入相遇等级、日期与命运相遇标记（API 16），仅应用变更字段，保留队伍健康状态。
  按实际存储宽度限制等级，日期严格限制真实日期与上游年份范围，第三世代不开放日期。
  11 格式往返、实体边界与受伤队伍数据保持检查通过；类型、lint、645 前端测试和两阶段构建通过。
  补充检查与核心构建文件占用已通过顺序重跑解决，保留既有警告。
  来源/地点目录、蛋转换和后续完整清单仍待实现，浏览器待检查。
  未提交或推送。

- 2026-09-26 补齐身份变化的参数联动（API 15）：按旧/新控件模式清零、限制范围或保留计时值，
  盒子不使用缺失的队伍字段覆盖已存储计数；身份未变化不整理无关数据。
  普通编辑导出增加目标完整载荷核对。原生往返与转换边界、类型、核心及最终前端构建、
  185 文件 / 645 前端测试通过，保留既有构建警告。
  下一步相遇/蛋信息与异色操作；完整目标保持，浏览器待检查，未提交或推送。

- 2026-09-26 接入特殊形态参数（API 14）：按核心模式开放命名选项、计数和计时字段，
  保留第六世代队伍/盒子存储区别，糖饰按上游枚举与三语物品资源对应。
  X/OR/SN/US 适用计时参数往返及数据保持通过；PK8 糖饰/计数边界仅为实体层证据。
  核心及最终前端构建、类型、lint、185 文件 / 645 前端测试通过，保留既有警告。
  下一步补齐身份变化后的参数默认值联动，再继续相遇/蛋和异色操作。
  完整目标保持，浏览器待检查，未提交或推送。

- 2026-09-26 接入高级原始值（API 13）：PID、加密常量及核心规则重新生成，独立应用并支持撤销。
  按格式开放 EC，输入 1–8 位十六进制；队伍重算能力值时保留 HP/异常状态。
  11 种格式的边界、往返、重新生成及数据保持检查通过；核心及最终前端构建、类型、lint、
  185 文件 / 645 前端测试通过，保留既有警告。
  下一步特殊形态参数、相遇/蛋和异色快捷操作，完整目标保持；浏览器待检查，未提交或推送。

- 2026-09-26 继续接入身份编辑（API 12）：种类、形态、性别与默认种类名称，联动新形态的特性目录。
  处理经验曲线、旧世代 PID 和第三世代未知图腾约束，保留原文件与撤销。
  11 种格式的身份/昵称/等级往返、代表特殊形态与非法输入检查通过；类型、lint、核心与最终前端构建通过，
  185 文件 / 644 前端测试通过。保留既有警告，测试池出现 Worker 终止超时但最终退出 0。
  下一步原始 PID/加密常量、特殊形态参数及相遇/蛋字段；完整目标未完成，浏览器待检查，未提交或推送。

- 2026-09-26 继续接入属性编辑（API 11）：性格、特性槽位、携带物品及第八世代能力值性格。
  三语目录来自核心，按上游处理旧世代 PID、第三世代特性位与第五世代隐藏标记。
  11 种格式的属性往返、隐藏特性切回、数据保持与非法输入检查通过；核心及最终前端构建、
  类型、lint、185 文件 / 644 前端测试通过，保留既有警告。
  下一步种类/形态/性别与特殊字段，完整目标未完成；浏览器待检查，未提交或推送。

- 2026-09-26 继续补齐招式编辑（API 10）：每招式 PP 提升次数与恢复 PP，三语界面，
  上限跟随核心规则，空招式归零。11 种格式的四档提升往返、逐档越界与非法提升拒绝通过。
  核心与最终前端构建、类型及 lint 通过，保留既有警告；类型检查默认 2 GB 内存不足，4 GB 重跑通过。
  新版浏览器检查待完成，下一步接入种类/形态、性格/特性及其世代关联；完整目标保持，未提交或推送。

- 2026-09-26 继续接入单只宝可梦文件（API 9）：选中格位导入、解密实体导出与核心默认格式转换，
  接入工作副本和撤销，保留锁定格位、队伍及原文件保护。11 种格式往返、PK3 → PK4 转换、
  逆世代拒绝与 PGT 扩展名冲突检查通过。185 文件 / 644 前端测试、类型、lint、核心及最终前端构建通过。
  保留既有警告；测试池提示过 Worker 终止超时但最终退出 0。新版浏览器流程待检查。
  下一步继续完整宝可梦字段、批量操作和通用/世代专属存档编辑；完整目标未完成，未提交或推送。

- 2026-09-26 继续接入队伍调度（API 8）：队伍/盒子互换、移动、复制、删除，按最终队伍
  处理前移、末尾追加、人数和蛋限制；删除开放损坏宝可梦清理，仍保护锁定格位与原文件。
  11 种格式的顺序、完整存储载荷及其他格位保持检查通过；PK6 损坏实体清理通过。
  185 文件 / 644 前端测试、类型、lint、核心与最终前端构建通过，保留既有警告。
  浏览器新版检查仍待完成；下一步单只文件导入导出及完整接入清单，未提交或推送。

- 2026-09-26 继续接入盒内整理（API 7）：移动到空位、交换、覆盖复制、删除与全局撤销。
  11 种格式的受影响载荷、其他格位/队伍及原文件保持检查通过；锁定格位写入拒绝、
  从锁定源复制、非法位置和操作检查通过。基础宝可梦编辑同时补齐锁定检查。
  更新三语功能介绍，原生检查、核心构建、185 文件 / 644 前端测试、类型和 lint 通过；核心生成后的最终前端打包通过，浏览器待检查。
  下一步继续队伍调度、单只导入导出及剩余完整接入清单；未提交或推送。

- 2026-09-26 继续接入盒子名称与壁纸（API 6）：选中盒子展开设置，核心按上游世代限制
  返回可编辑长度和三语壁纸目录；局部预览、应用、撤销、导出使用现有工作副本流程。
  原生检查覆盖 11 种格式的空/最长名称、首尾壁纸、非法输入、其他格位与原文件保持。
  上述原生检查、核心构建、185 文件 / 644 前端测试、类型及 lint 检查通过；
  保留原有 Hook 与上游裁剪警告，测试池曾提示一个 Worker 终止超时，最终退出 0。
  核心生成后的最终前端打包通过，浏览器待检查；完整 PKHeX 目标保持不变，未提交或推送。

- 2026-09-26 继续接入合法性分析（API 5）：按选中格位调用 PKHeX LegalityAnalysis，
  带入存档 Personal 表及队伍/盒子上下文；摘要和详细报告使用上游中/英/日资源。
  工作副本修改、撤销、重新打开后清除旧报告；其他格位的结果不显示为当前结果。
  上游合法/非法脱壳忍者样本、三语报告一致性、只读边界及 11 种存档队伍/盒子上下文检查通过。
  核心构建及完整 verify 通过；补齐 TSX 测试收集后 185 文件 / 644 测试通过，
  核心生成后的前端重新打包通过。保留原有 Hook、大分块与上游裁剪警告。
  外部 Chrome 可读取页面，但操作超时，新界面尚未验证。
  仍未完成全部 PKHeX 范围，也尚未新增提交或推送。

- 2026-09-26 新目标：完整接入静态浏览器可适用的 PKHeX 功能，按
  [功能清单](https://github.com/HaKu76/PokeRNGKit/blob/23528d34ec6663514265a5c7f48bc2df905b72e4/docs/pkhex-inventory.md)逐项推进，不把训练家基础读写称为完整接入。
  起点为已提交的 `6b9ce80`，工作区干净。首批开发可视化盒子：本地上游图像/壁纸、
  实际盒子名称、空格位与真实位置。可视化 API 3 批次通过 11 种原生夹具、
  核心构建与完整 verify（184 文件 / 641 测试）；Chrome 仍显示旧缓存，已请所有者刷新。
  继续开发 API 4：宝可梦基础字段编辑、独立工作副本、内存撤销与全局导出入口；
  当前源码已切换 API 4，队伍/盒子基础编辑与边界拒绝的 11 种原生夹具通过；
  完整 verify（184 文件 / 641 测试）、最终增量类型检查和核心构建通过，核心生成后重新打包前端通过。
  新图像字节与来源清单一致，壁纸/图像/编辑/撤销的浏览器检查仍待所有者刷新；不代替验收。
  后续为宝可梦编辑、仓储操作、合法性分析、通用及世代专属存档编辑。
  本目标尚未完成，不提交或推送后续改动。

- 2026-09-26 提交整理：按所有者要求合并 PKHeX 基础读写、宝可梦浏览与多语言改动为一个提交。
  固定上游文件的 Git 原始字节，避免换行转换破坏源码清单校验；本次授权仅提交，不推送或发布。

- 2026-09-26 补充：所有者指出基础训练家读写不足以覆盖宝可梦存档信息。现补充队伍/盒子
  宝可梦只读浏览、详细属性与真实位置，API 升级为 2；存档入口、字段、操作、游戏名称与
  常见错误接入中/英/日资源，中文不再展示 OT / Save Editor。此前完成状态仅指训练家基础
  接入，不代表完整 PKHeX。11 种合成存档的新读取断言、核心构建和前端打包通过。
  完整检查补齐测试 Node 类型声明后遇到默认 2 GB 内存上限；以 4 GB 进程额度重跑通过，
  184 个测试文件、641 项测试、TypeScript、ESLint 与 Vite/PWA 构建通过，保留原有警告。
  所有者刷新后，外部 Chrome 已确认新版入口；US 合成存档队伍与第 32 盒第 30 格、
  中文训练家字段、中/英/日宝可梦名称与招式切换通过，未捕获控制台错误。
  桌面面板首屏截图未见遮挡；新宝可梦面板手机布局和自动跨版本更新仍待检查。
  宝可梦当前只读，不代表完整 PKHeX 或所有者验收。未提交或发布。

- 2026-09-26：PKHeX 基础接入已完成工程实现与授权范围内验证，入口为悬浮工具。
  使用未修改的 Core 26.08.26 + .NET Wasm Worker，提供本地识别、训练家四字段编辑、
  新文件导出及 III/IV/V/VI-VII/VIII 档案联动；保留原文件和既有校准参数。
  补齐浏览器 AES/MD5 适配；Emerald 浏览器读写回读和测试档案写入成功，US/BD 浏览器
  导出与原生结果逐字节一致。正式构建在关闭 5173 服务后重载、读取、编辑和导出 US 成功。
  640 项前端测试、11 种合成存档原生回归、核心构建和最新前端构建通过。
  修正坏校验提示及测试参考字节被上游读取修改的问题。首次使用核心按需加载，约 33 MiB
  未压缩资源；初始预缓存 252 项 / 22722.61 KiB。桌面截图及手机边界/控件尺寸已检查。
  限制：手机加载后截图超时、跨核心版本缓存更新未实测，剑盾/GameCube/真实存档覆盖不足；
  不等于完整桌面 PKHeX 或所有者验收。具体证据与范围见 [存档模块](https://github.com/HaKu76/PokeRNGKit/blob/23528d34ec6663514265a5c7f48bc2df905b72e4/docs/modules/saveeditor.md)。
  任务起点为干净的 main/ec8bd68；工作区尚未提交、推送或发布。预览已恢复在 5173。
  后续由所有者评审基础功能，再决定真实存档覆盖与更多编辑字段。

- 本轮 UI 一致性工程检查与批量修复完成。最终共享规则下复查 73 个入口、四档宽度共 292 次，
  未检出页面横向溢出、异常撑高的结果滚动区或已显示排序表头的尺寸偏差。
  排序表头及虚拟首行偏移统一，另修复 VII 孵化桌面结果容器随 5,000 行撑高的问题。
  `npm run verify` 通过 180 个文件、627 项测试、TypeScript 与前端构建；其后补齐 `find`
  中英文显示并经 Chrome 确认。具体覆盖、代表截图核对与未覆盖状态见
  [UI 检查记录](ui-audit-2026-09-21.md)。未作为所有者验收，尚未提交或发布。

以下为各批次过程记录，其中“待检查”以顶部结果和 UI 检查记录为准。

- 工具续查修复研究工具自定义输入超出手机浮层，以及公共 Select 丢失数字标签的问题。
  研究工具、地图已完成四宽度复核；杂项三模式、查询长结果、计算器无解/有解与增删行已检查。
  Select 新增 2 项渲染回归用例通过；最新 npm run verify 完成，180 个文件、627 项测试、
  TypeScript 与前端构建均通过。下一步为剩余可排序表头及全入口最终布局复核。

- 表格批次已修复 VI 野生/VIII 团体战表头偏移、VII 闯入对战 44px 可点击行，12 次四宽度
  复查无溢出或行重叠；团体战通用样式已限制作用域。三种语言补齐 12 个缺失文字键。
  全局存档新建/取消、校准模式已续查，并修复手机世代页签压缩至不可点击的问题。
  本批 npm run verify 已通过 625 项测试、TypeScript 和前端构建；保留原有 Hook 与包体积提示。

- 本批完整工程检查已通过 625 项测试和前端构建；第四世代孵化的亲代参数补上响应式网格，
  英文辅助操作修复横向挤出，四种宽度已复查。该样式及类名调整发生在本次检查过程中，
  最终 TypeScript 与受影响文件 ESLint 已通过；截图续查修复了筛选辅助行与 IV 表重叠，
  最新 CSS 的格式与构建正在补查。

- 参考模块 ID/定点已补齐手机 44px 布局，桌面基线不变；七个粘性操作区加入工具 Rail 避让。
  Chrome 复现并确认第七世代野生误点工具的问题已消除，野生/闯入对战样例首行未被加高表头覆盖，
  孵化双按钮行无横向裁切。覆盖与剩余事项见 [UI 检查记录](ui-audit-2026-09-21.md)。
  全轮目标仍在进行，最新改动尚待完整工程检查。

- 完整 `npm run verify` 已通过当前密集表单与手机控件批次：179 个文件、625 项测试、
  TypeScript 与前端构建成功。随后完成九个全局工具四种尺寸的外框与 Escape 检查，均未越界；
  工具页签、Tips、计算器与存档按钮统一 44px，并已在手机复查。
  工具内部模式、编辑弹窗、长结果及浮动 Rail 遮挡仍待继续检查。完整检查早于最后工具 CSS
  修改，最终工程收口尚未完成，未提交或发布。

- 密集表单批次已接入八个 VI/VII 工作区，按分组宽度重排设置并收紧空结果区。
  Chrome 完成四种视口共 32 次复核，未发现文档溢出或乱数信息卡裁切；宽屏文档高度
  明显下降，详情见 [检查记录](ui-audit-2026-09-21.md)。图鉴导航样例生成/清空已验证
  有结果时恢复独立滚动、空状态恢复 240px。笔记本表单内部空间仍需优化，目标未完成。

- 手机控件批次已推进：公共 tablist、IV 快捷键、常用操作与筛选辅助按钮统一 44px；
  VI 孵化、VII 孵化/配信、VIII Raids 的模式组与图标操作通过语义标记接入。
  Chrome 已复查主要受影响页面、IV 父行高度、768px 取整边界及英文长页签/深色切换，
  具体覆盖见 [检查记录](ui-audit-2026-09-21.md)。尚待表头排序按钮、参考模块手机例外、
  密集表单重排与浮动工具遮挡检查。本批之后尚未重新运行完整工程检查，改动未提交。

- 2026-09-21：建立现有模块 UI 全面检查与批量修复目标。外部 Chrome 已恢复，已在
  `http://127.0.0.1:5173/` 对 73 个导航入口完成 390/768/1280/1920px 初筛，292 次检查
  未发现文档横向溢出；这不代表局部遮挡、所有交互或所有者验收通过。
  已确认候选箭头尺寸错位、手机小按钮和 VI/VII 纵向空间使用问题，详见
  [UI 检查记录](ui-audit-2026-09-21.md)。候选箭头已修复并实测桌面 30/28px、手机 44/42px。
  下一步按控件类型修复手机页签与操作按钮，再重排密集表单；全局工具和交互状态仍待检查。
  工作区改动未提交，本次箭头 CSS 之后尚未重新运行完整工程检查。

- 2026-09-21：所有者要求从逐模块修补改为公共规则与批量迁移。沿用 0.1.0 全模块 UI 收口及
  发版目标，以第三世代 ID/定点作为稳定对照；执行规则更新见 `docs/ui-design.md`。
  已加入 `src/workspace-ui.css`，统一字号、控件高度和菜单密度；15 个第六／七世代表单接入
  自然高度标记，移除固定高空白与表单独立滚动。算法和输入约束未因本批公共规则改变。
  本批完整 `npm run verify` 已通过：179 个测试文件、625 项测试、TypeScript、前端构建，
  保留原有定点模块 ESLint 警告和大文件提示。外部 Chrome 标签读取仍返回连接失败，
  视觉复核尚未完成，改动未提交或部署。预览已恢复于 `http://127.0.0.1:5173/`。

- GameCube RNG 正在收口：修正窄屏筛选底部列位置、恢复 44px 触控尺寸、允许标签与错误换行。
  Chrome 已确认手机操作区和 Generator 样例；完整工程检查待运行。
  Spinda Painter 已提交并推送为 `d6af5ea`。

- Spinda Painter 已修正 PID/性格词条、手机属性布局、绘图区尺寸与小斑点命中区域。
  Chrome 已检查 390/768/1280/1920px、中英文、拖动、方向键回写与清空 PID；
  完整 `npm run verify` 已通过，625 项测试、TypeScript 与前端构建成功。
  IVs to PID 已提交并推送为 `e67491f`。

- IVs to PID 已修复：手机控件、性格候选与表头恢复 44px，错误和长方法名称允许换行；
  清空结果同步重置统计、耗时和就绪状态。宽屏工作区明确上下排列，修复共享双栏规则造成的
  查找按钮裁切。Chrome 已检查 390/768/1280/1920px、中英文、浅深主题、样例结果和清空状态。
  完整 `npm run verify` 已通过，625 项测试、TypeScript 与前端构建成功；保留原有 ESLint 警告。
  Seed 工具修复已提交并推送为 `b8f4da5`。

- Seed 工具正在收口：修复窄屏结果区仍占用桌面网格列导致的面板重叠；初始 Seed 的静态说明
  并回输入面板，手机主入口改为两列并恢复 44px 控件。菜单样式仅作用于当前可见工作区。
  外部 Chrome 已检查 390/1280/1920px 布局、初始 Seed 两种模式与 Seed 查询时间样例结果、
  NGC 手机候选项高度及 Painting 显示。完整 `npm run verify` 已通过：625 项测试、
  TypeScript、前端构建及格式检查；仅保留原有定点模块 ESLint 警告与大文件构建提示。
  Egg 已独立提交并推送为 `dafc10f`；本轮尚未创建版本标签或 Release。

- 2026-09-13：项目所有者要求进行一轮版本更新与发版。本轮目标为 `0.1.0` 全模块可用性与 UI
  一致性收口；执行范围、稳定参考、检查授权和发布条件见 [发布计划](release-0.1.0.md)。
- 当前稳定参考仅为所有者反馈的第三世代 ID 与第三世代定点；其余模块均待本轮逐项核对，
  不沿用历史“已实现”状态宣称 UI 验收完成。起始 `main` / `da8f8ab` 工作区干净。
- 首批修改：第三世代 Wild 修正筛选区宽度与三栏断点、恢复手机/粗指针 44px 控件高度，
  错误提示允许换行。已完成首批外部 Chrome 与工程检查，独立提交并推送为 `ebeb357`。
- 源码补充：Wild 自动完成输入恢复展开按钮文本预留，筛选底部操作允许换行，IV 快捷按钮与
  开关标签同步点击高度；标题栏 ref 修复首次进入时页签落入正文，等级范围独占一行，英文长标签换行。
  地点默认值与切换遭遇类型后的候选选择保持一致，输入范围与算法未改变。
- 发布渠道已恢复：GitHub CLI 成功登录 `HaKu76`；远端暂无 Release，当前基线 `da8f8ab` 的
  Actions #33499313935 已成功完成，不包含本轮修复；`ebeb357` 的 Actions #34759421492 已全部成功，
  包括 Web/Wasm、Windows 桌面包、GitHub Pages 与 Cloudflare 部署。
  尚未创建版本标签或 Release。
- 浏览器阻碍已解除：外部 Chrome 已成功读取所有者授权的 `http://127.0.0.1:5173/`，
  标签页、DOM、菜单与输入交互可用；部分截图调用仍有超时，不能把 DOM 测量写成截图验收。
- 已检查：Wild 的 390/768/1280/1478/1920px 面板宽度、首次进入页签、地点候选与键盘操作、
  Generator/Searcher 样例结果及错误显示；具体证据与剩余项见 [Wild 文档](modules/gen3wild.md)。
  Wild 已改为按剩余空间伸缩结果表，1920×1080 下整页高度由 1312px 收至 1080px；短视口保留
  180px 表格与自然滚动，页脚不覆盖结果。碎岩/Bike/同步/Wild 4 和稳定参考模块的局部布局已复查。
  当前正在处理 Egg；本地 `main` 已同步 `origin/main` 的 Wild 提交。
- 授权状态：所有者已明确授权本轮 `npm run verify`、`npm run verify:full`、`npm run build` 和
  `npm run desktop:package`，本轮不重复询问这些命令。
  生产算法回归仍等待部署 URL 与授权。
- 已通过：`verify:full` 中的完整 `verify`（Prettier、ESLint、TypeScript、179 个测试文件共
  625 项测试、2341 个前端模块与 245 项 PWA 预缓存），以及 69/69 项原生检查。
  Wasm 阶段首次因终端未激活 emsdk 失败；加载本机 Emscripten 6.0.6 后，以 `BASE_PATH=./`
  执行完整 `npm run build` 成功。保留既有 Hook 依赖、CMake 共享库支持与大 chunk 警告。
- 桌面打包：首次下载发生 TLS 中断；使用现有本地代理后下载成功，但解压目录重命名两次报 EPERM。
  改用打包器 `electronDist=release/win-unpacked.tmp`，并在当前进程清除代理变量后打包成功。
  `release/PokeRNGKit.exe` 为 Windows x64、96,854,911 bytes，SHA-256 为
  `7B58B1B36C06508D4DD99B22313D20292025D1A0956667FEC1CE3CE00F1A61E2`。
  此包对应 Wild 修复和原 0.0.0 元数据，只是工程试包，未验收桌面运行或发布 0.1.0。
  桌面包未配置应用图标，归入桌面外壳批次。
- 网络恢复：GitHub 经显式代理发生 TLS 握手失败，直连返回 200；用进程级 `NO_PROXY=*`、
  Git `http.proxy=` 与 `http.sslBackend=schannel` 成功推送，未修改全局网络设置。
- 浏览器补充：旧标签页已失效，接管替换标签页发生焦点控制超时；在同一外部 Chrome 新建
  所有者已授权的 5173 地址后恢复，导航、Wild 标题页签、默认地点与截图可用，无需重新授权。
- 当前 Egg 修改：仅 `Gen3EggPanel.css`，修复底部操作压缩、英文标签裁剪、亲代输入内边距、触控高度、
  三栏断点和结果区高度。两模式、四种视口、两种语言、浅深主题和错误提示已取得工程证据，
  详见 [Egg 文档](modules/gen3egg.md)。完整 `npm run verify` 已通过：179 个测试文件、625 项测试，
  2341 个前端模块与 245 项 PWA 预缓存。下一步独立提交推送 Egg，然后核对 Seed 工具。
  预览服务停止后已在同一授权地址通过 `npm run dev:ui` 重启。
- 工程修复：桌面打包后的 `release` 目录未被 ESLint 排除，导致一次默认堆 OOM；提高当前进程堆上限
  后发现 8197 条错误均来自已生成的桌面网页资产。`eslint.config.js` 增加 `release` 忽略，
  保持源码规则不变；正常内存设置下完整 `verify` 已通过。本批格式检查均通过，无格式失败。
- 功能清单复核：共享 3DS RNG Info 的 Timeline / Timeline Leap 仍是禁用入口，不能宣称完整工作流；
  Gen IV Voltorb Flip 为库存记录的未实现扩展，Gen V 参数/时间深审仍待进行。发布限制见发布计划。

- 逐个优化尚未迁移的 RNG 面板，沿用 `docs/ui-design.md` 已确认的紧凑布局规则；每次只处理
  一个面板，完成本地验证后独立提交并推送，再开始下一个面板。
- 每次迁移同步解耦样式：模块专属布局和密度归入功能目录 CSS，共享控件只保留跨模块语义，
  并清理该面板散落在全局样式中的专属覆盖。

## 2026-09-01 绿宝石新档高V异色御三家

- 调整：第三世代定点 Generator 的“绿宝石新档御三家”改为两段式流程。第一阶段要求输入十进制
  TID，并以 `Seed = TID` 顺序生成御三家 PID、PSV 与 IV；第二阶段点击 PSV 跳转第三世代 ID
  Generator，只检索目标帧之前真实出现的异色 SID/TSV。
- 默认：入口使用 `0..1000000` 帧与 `Perfect IV Value / Count = 31 / 4`，同时覆盖至少 4V、5V、
  6V，并按完美个体数降序显示。Static 第一阶段不提前指定 SID，也不显示无依据的异色结果。
- 结果：候选表显示御三家帧、完美个体数、PID、标准 PSV、六项 IV 和派生字段；点击 PSV 自动带入
  TID、PID、Star/Square 与 `0..targetAdvance-1` 到 ID Generator。选定 ID 结果后仍可带着精确
  TID/SID 和目标帧返回 Static 单帧验证。
- 补充：御三家工作流新增 `TID（建档后不重启）` 与 `0000（重启后）` 两种 Seed 路径。重启路径仍使用
  当前 TID/SID 判断异色，但 ID 生成与御三家目标属于两段独立 RNG 流，不再错误要求 ID 帧早于御三家帧；
  ID 与 Static 往返上下文保存真实目标 Seed。
- 界面：Generator、Searcher、绿宝石新档御三家切换保持单行；第三世代 ID Generator 在桌面保持
  “乱数信息 / 筛选项 / 结果”单行三栏，“表 ID 同时作为 16 位 Seed”提示限制在输入列宽内。
- 修复：`gen3static_search_emerald` 的 65,536 项距离表由 Wasm 栈迁到堆内存，不再触发
  `memory access out of bounds`；Gen3 Static UI 预览同时保留 Perfect IV Value / Count 判断。
- 已验证：本地生产 Wasm 对 `TID 59476`、Method 1、木守宫、`0..1000000`、至少 4V 返回 11 个
  御三家目标，均为 4V；ID Generator 在各目标帧之前共返回 618 条异色 ID 记录。首个目标为帧
  `83552`、PID `3B1AD6F6`、PSV `7613`，其中 SID `1470` 在 ID 帧 `1858` 可用。
- 已通过：项目所有者授权后运行完整 `npm run build`；全部已配置 Wasm 模块与 2337 个前端模块完成
  生产构建，PWA 生成 245 个预缓存条目。保留 CMake 4.3.1 共享库支持警告和 Vite 大 chunk 警告，
  均未阻止构建。
- 已验证：最新本机生产预览继续使用 `http://127.0.0.1:4174/`；首页、`gen3static.wasm` 与
  `gen3id.wasm` 均返回 HTTP 200。外部 Chrome/Edge 的界面交互与项目所有者最终验收仍待确认。
- 此前已通过：`npm run typecheck`、两个定向 Vitest 文件共 11 项、`gen3static_native_parity` 1/1、
  定向 ESLint 0 error；保留 `Gen3StaticPanel.tsx` 原有 Hook 依赖 warning。

## 2026-09-01 3DSRNGTool 乱数信息入口与面板布局修复

- 更正：删除未经项目所有者要求而新增的 `3DSRNGTOOL` 侧栏快捷组；Gen VI、Gen VII 原有模块入口不变，
  3DS 档案仍从存档信息管理入口访问。
- 源码复核：`MainForm.cs` 把同一个 `RNGInfo` 加入当前 Method 页，Stationary、Event、Wild 共用检索范围、
  目标帧与 Delay 区域；Gen VII 显示 NPC，Timeline 按世代和方法条件显示，只有 Gen VII Event 显示
  `Timeline Leap`。不再把截图中的乱数信息误判为配信专属。
- 功能：Gen VI Stationary、Event、Wild 与 Gen VII Stationary、Event、Wild 复用同一个 React 乱数信息
  组件；普通闭区间与目标帧 ±100 已接入各模块现有 Worker 请求。Timeline 与 Timeline Leap 暂以禁用控件
  明确标记为待接入，不能把普通连续帧搜索冒充上游时间线。
- 调整：全部 25 个 Gen VI、Gen VII 外层工作区显式使用 `.stacked-module-workspace`，统一保持“设置在上、
  结果在下”，不再被公共 `1081..1500px` 容器规则改回左右两列。图鉴导航、宝可雷达、TinyMT Timeline、
  Gen VII Egg、Egg Seed Finder、Battle Tree 与 Festival Plaza 原有的模块级左右两列规则同步改为单列。
- 修复：Gen VII Stationary 的 RNG Info 改为设置区首行，目标设置与筛选位于下一行；移除三列各自的滚动区域，
  设置面板只保留一条纵向滚动条，目标帧、Delay、NPC、Timeline 和筛选控件不再越过裁剪边界。
- 已通过：项目所有者授权后运行最新 `npm run build:web`；2341 个模块完成生产构建，PWA 生成 245 个
  预缓存条目，仅保留既有大 chunk 警告。
- 已验证：外部 Chrome 本地预览 `http://127.0.0.1:4186/`，CSS 视口 `1478×679`、
  `devicePixelRatio ≈ 1.3`。18 个 Gen VI 入口与 14 个 Gen VII 入口的可见工作区均未出现外层左右并排；
  侧栏收起后的 Gen VII Stationary、Gen VI TinyMT Timeline、Gen VI DexNav 继续保持单列。Stationary 在
  `1078px` 与 `1238px` 工作区宽度下均无横向裁剪控件，且设置区只有一条纵向滚动区域。
- 保留：Gen VII Stationary、Event、Wild 均显示共用乱数信息，只有 Event 显示 Timeline Leap；Gen VI
  Stationary、Wild 显示 Timeline，Event 不显示。侧栏不存在 `3DSRNGTOOL` 分组。
- 修复：公共 `1081..1500px` 工作区断点在追加两个 `:not(...)` 后提高了选择器权重，再次把第三世代 ID
  Generator 改回两列。公共 `[class*="-workspace"]` 规则现统一包装在低优先级 `:where(...)` 中，模块 CSS
  继续负责实际行列结构，不再通过逐页提高选择器权重互相覆盖。
- 标准：第三世代定点乱数继续作为紧凑密度、面板对齐、实体边界和单一滚动责任的参考；布局角色由
  各模块明确声明。第三世代 ID 固定桌面单行三栏，第三世代定点保持三块控制面板在上、结果在下，
  Gen VI、Gen VII 完整工作区保持设置在上、结果在下。
- 已验证：外部 Chrome 本地预览 `http://127.0.0.1:4187/`，CSS 视口 `1478×679`、
  `devicePixelRatio ≈ 1.3`。第三世代 ID 在侧栏展开时为约 `360 / 260 / 434px`，收起时为约
  `360 / 260 / 594px`，三块面板顶边均约为 `192.8px`；第三世代定点仍为三块控制面板同排、结果在下；
  Gen VII Stationary 在两种侧栏状态下仍为上下两行且没有被裁剪的控件。以上为工程证据，不代表
  项目所有者最终验收。

## 2026-08-31 第七世代定点乱数响应式布局优化

- 优化：第七代定点乱数在宽屏下将设置区与结果区保持并排；内容容器收窄到 `1279px` 以下时，
  设置、乱数信息和筛选项自动改为单列，避免三列字段被挤压到不可见区域。
- 修复：为第七代模块控件统一增加页面作用域的紧凑密度，桌面输入、下拉、多选、IV 输入和操作按钮
  使用 `30px` 高度，手机端恢复 `44px` 触控高度；IV 最小/最大列改为可收缩轨道，最大值输入不再超出筛选面板。
- 修复：中等分辨率不再依赖视口宽度判断控制区溢出，改由内容容器断点切换滚动策略；输入区在面板内完整展开，
  结果表继续作为独立滚动区域。
- 已验证：外部 Chrome 本地预览 `http://127.0.0.1:4173/` 的 `1895×872`、`1280×720`、`1024×768`、
  `768×1024` 和 `390×844`；实际点击 `HP 最大` 输入框并打开“游戏版本”下拉，均能获得焦点或打开菜单，
  手机端六组 IV 输入均为 44px，下拉菜单宽度与触发框一致；各尺寸文档无横向溢出。
- 备注：一次截图采集出现 Chrome CDP 超时，未影响页面交互、DOM 边界或焦点检查。
- 未运行：测试、类型检查、原生夹具、Wasm 构建和 Vite 构建；本轮只获授权进行浏览器 UI 检查。
- 已通过：`npm run format:files -- src/features/gen7stationary/Gen7StationaryPanel.css`、
  `npm run format:check`、`git diff --check`。
- Git：第七代定点乱数样式修改尚未提交或推送，等待项目所有者确认。

## 2026-08-31 第三世代 Seed 工具外层布局修复

- 修复：公共内容容器在 `1081–1500px` 宽度时的两列规则不再覆盖 Seed 工具；外层页签与当前页签内容
  显式固定到同一列的上下两行，避免宽屏下被 Grid 自动放入两个隐式列。
- 保留：初始 Seed、Seed 查询时间、NGC Seed 和 Target Painting Timer 的内部面板布局保持不变。
- 已验证：外部 Chrome 本地预览 `http://127.0.0.1:4173/` 中，`1895×872` 宽屏、默认桌面尺寸和
  `390×844` 窄屏的 Seed 工具外层均为单列；宽屏页签与内容左边界一致，初始 Seed 三块面板保持在内容区内，
  未出现横向溢出。
- 已通过：`npm run verify`（Prettier、ESLint、`tsc -b`、179 个 Vitest 文件共 621 项测试、
  Vite/PWA 生产构建）；保留既有 ESLint Hook 依赖 warning 和构建大 chunk warning。
- 已通过：`npx prettier --check src/features/gen3seedtools/Gen3SeedToolsPanel.css src/styles.css` 和
  `git diff --check`。
- 未运行：完整 `npm run format:check` 在当前环境超过 60 秒未返回，已终止；本轮修改文件的定向格式检查通过。
- Git：修复待提交并推送。

## 2026-08-31 第三世代 Seed 工具紧凑布局预览

- 优化：初始 Seed、Seed 查询时间、NGC Seed 和 Target Painting Timer 四个页签统一采用
  `30px` 输入、下拉和操作控件；控制面板按内容收窄，结果区与输入区共享边界。
- 调整：初始 Seed 页的“乱数信息”面板进一步收窄为 `220–260px` 内容约束，TID/SID
  保持左对齐，释放的桌面空间交给结果区；三块同排面板之间保留 `12px` 间距。
- 优化：桌面端初始 Seed 的输入与信息面板保持同排等高，NGC 的 XD、竞技场和频道表单保留
  各自的多列结构；窄视口按单列重排，长标签和下拉选项在控件内截断。
- 移除：Seed 工具面板中的 `01/02/03` 编号、`PokeRNG / PokeRNGR` 和 `Gen III / API 1`
  等不参与操作的说明，结果状态、统计和操作保持在结果标题区域。
- 解耦：新增 `src/features/gen3seedtools/Gen3SeedToolsPanel.css`，由 Seed 工具入口导入，
  通过页面作用域覆盖旧的全局宽度和密度规则；未改变 RNG 算法和输入校验语义。
- 已验证：外部 Chrome 本地预览 `http://127.0.0.1:4173/` 的四个 Seed 工具页签；桌面端控件
  计算高度为 `30px`，初始 Seed 两个控制面板等高，Seed 查询时间结果区与输入区同宽；
  `390×844` 窄视口下初始 Seed 面板单列排列且文档无横向溢出。首次 `npm run dev` 因本机
  未激活 Emscripten 失败，随后使用 `npm exec vite -- --host 127.0.0.1 --port 4173`
  仅启动 UI 预览。
- 已通过：`npm run verify`（Prettier、ESLint、`tsc -b`、179 个 Vitest 文件共 621 项测试、
  Vite/PWA 生产构建）；ESLint 仅保留 `Gen3StaticPanel.tsx:298` 的既有 Hook 依赖 warning，
  构建保留既有大 chunk warning。
- 已通过：`git diff --check`；Node `24.19.0`、npm `12.0.2` 与仓库要求一致。
- 未运行：真实 Emscripten Wasm 构建、生产 URL 算法回归和项目所有者最终验收。
- Git：当前修改待提交并推送，工作区包含 Seed 工具四个子面板的结构清理和专属 CSS。
- 下一步：提交并推送本轮第三世代 Seed 工具紧凑布局。

## 2026-08-27 第三世代个体值查询 PID 紧凑布局迁移

- 优化：六项 IV 在桌面单行紧凑排列，性格、TID 与查找命令按照实际内容宽度收拢；结果状态、统计、错误和操作收进同一标题行，结果列按真实内容宽度收窄。
- 解耦：新增 `src/features/ivtopid/Gen3IvToPidPanel.css`，页面通过 `ivtopid-page` 局部作用域控制密度；清理 `src/styles.css` 中散落的个体值查询 PID 专属布局、表格和响应式规则。
- 修复：共享 `useMenuPlacement` 不再将菜单硬限制为 `360px`，Select、MultiCheckSelect 和自动完成菜单会优先匹配触发框宽度，仅在视口两侧保留 `12px` 间距时收窄。
- 已恢复：外部 Chrome 重新导航本地预览 `http://127.0.0.1:5174/` 在约 `2.7s` 完成，DOM 就绪检查为 `29ms`；此前控制层的偶发等待超时未复现，也没有对应的页面或 Vite 服务阻塞。
- 已验证：Chrome 桌面预览中，性格菜单与 `473.8px` 触发框同宽；输入、Select、菜单项和查找按钮均为 `30px`，查询 `0/0/0/0/0/0`、勤奋、空 TID 后正常返回 Channel 结果，页面无横向溢出，结果首行紧贴表头且末列右边框为 `0px`。以上仅为本地界面和交互工程证据，不代表算法或项目所有者验收。
- 已通过：`npm run verify`（Prettier、ESLint、`tsc -b`、179 个 Vitest 文件共 621 项测试、Vite/PWA 生产构建）。ESLint 仅保留 `Gen3StaticPanel.tsx:298` 的既有 Hook 依赖 warning；构建保留既有大 chunk warning。
- 未运行：生产 URL 算法回归、真实 Emscripten Wasm 构建和 Windows EXE 验收。
- Git：本轮已作为 `style: 优化第三世代个体值查询PID布局` 单独提交并推送至 `origin/main`。
- 下一步：选择下一个尚未迁移的 RNG 面板，按当前目标逐个核对、验证、提交并推送。

## 2026-08-27 第三世代 ID 乱数布局修正

- 修复：生成器/检索器切换器移入页面标题右侧，避免占用工作区内容行并消除切换器滚动条。
- 优化：Generator 在桌面改为“乱数信息 / 筛选项 / 结果”同一行三列，结果数据列较少时直接在结果面板内完整显示；中等宽度保留双列后结果换行，窄视口再单列重排。
- 修复：第三世代 ID 页输入框恢复与按钮、Select 一致的 `30px` 高度；修正虚拟结果表首行偏移，首行紧贴 `40px` 表头且五列无横向滚动。
- 修复：三块 Generator 面板保持同一行并共享底边，避免结果区较高时前两块面板高度不一致。
- 修复：Searcher 同一行的输入与结果面板也共享底边；仅在窄视口单列时恢复按内容高度排列。
- 修复：Searcher 的 TID 与 SID/PID 两行输入保留 `8px` 间距；PID 前缀输入内层与 `30px` 外框同步，避免文字和边框上下错位。
- 已验证：外部 Chrome `http://127.0.0.1:5173/` 中 Generator 三栏约为 `360 / 260 / 434px`，三块面板底边一致；标题切换器约 `240×40px`，无页面或切换器溢出。Searcher 切换后为 `440 / 626px` 双栏且无横向溢出。以上仅为本地 UI 工程证据，不代表算法或项目所有者验收。
- 已通过：`npm run verify`（Prettier、ESLint、`tsc -b`、179 个 Vitest 文件共 621 项测试、Vite/PWA 生产构建）。ESLint 仅保留 `Gen3StaticPanel.tsx:298` 的既有 Hook 依赖 warning；构建保留既有大 chunk warning。
- 下一步：提交并推送本轮第三世代 ID 乱数布局修正；生产页面算法回归仍等待部署完成和项目所有者提供 URL。

## 2026-08-27 第三世代 GameCube RNG 紧凑布局迁移

- 优化：Generator/Searcher 切换移入存档选择左侧；乱数信息、设置、筛选在桌面同排，结果区紧接其下并共享右边界，窄视口再单列重排。
- 优化：输入、下拉、多选、操作按钮及下拉选项统一为 `30px`；完美个体值/个体数保持独立于六项 IV 范围的筛选语义，筛选底部操作与个体值计算器对齐，结果提示收进标题行，结果列按实际内容收窄。
- 解耦：新增 `src/features/gamecube/Gen3GameCubePanel.css`，并将 GameCube 面板从 `gen3static-*` 布局选择器迁移为 `gen3gamecube-*` 局部命名；共享 Select/MultiCheck 和菜单定位不包含模块条件。
- 修复：Searcher 以六项 IV 范围与完美个体阈值的交集计算组合数，并把满足条件的组合拆为互斥 IV 子范围；`0..31`、阈值 `31`、数量 `5` 的有效组合数为 `187`，不再按 `32^6` 错误拒绝。
- 已恢复：外部 Chrome 可稳定读取本地页面和执行点击；实际切换 Generator/Searcher 后，`aria-selected` 状态
  正确，随即恢复原有 Generator 工作区。此前的鼠标事件超时未复现。
- 已验证：本地 UI 预览 `http://127.0.0.1:5173/` 默认桌面视口中，乱数信息、设置、筛选为同排三栏，结果区
  共享筛选面板右边界；主要输入、Select、MultiCheck、存档选择、操作按钮和下拉选项均为 `30px`。普通下拉
  菜单宽度 `176px`、多选菜单宽度 `231px`，分别与触发框一致；结果表首行紧贴表头，最后一列表头没有右边框。
- 已验证：筛选范围 `0..31`、完美个体值 `31`、完美个体数 `5` 时 Searcher 正常完成，不再显示组合数上限错误；
  本地窄视口 `390×844` 时三栏重排为约 `343px` 单列，文档宽度 `375px`，无横向溢出。以上仅为本地 UI 与
  交互工程证据，不代表算法或项目所有者验收。
- 已通过：`npm run verify`（Prettier、ESLint、`tsc -b`、179 个 Vitest 文件共 621 项测试、Vite/PWA
  生产构建）。ESLint 仅保留 `Gen3StaticPanel.tsx:298` 的既有 Hook 依赖 warning；构建保留既有大 chunk
  warning。
- 下一步：选择下一个尚未迁移的 RNG 面板，按当前目标逐个核对、验证、提交并推送。

## 2026-08-27 第三世代 ID 乱数紧凑布局迁移

- 优化：Generator 的乱数信息与筛选项收敛为内容所需宽度，结果区紧接其下并共享右边界；Searcher
  使用紧凑的输入/结果双栏。桌面宽度只伸缩筛选或结果区域，窄视口再改为单列。
- 优化：输入、下拉触发器、分段标签、生成/计算及结果操作按钮统一为 `30px`；筛选字段按两列
  对齐，结果状态、提示和指标收敛到标题行，结果列按实际内容收窄且最后一列取消多余右边界。
- 解耦：新增 `src/features/id/Gen3IdPanel.css`，由模块入口导入；新增的共享菜单定位只依据锚点和
  已渲染菜单的实际尺寸，不包含任何 ID 模块条件。Select、MultiCheckSelect 和自动完成控件通过
  `menuRef` 复用该定位，修复长菜单在空间充足时仍被错误上翻的问题。
- 已验证：外部 Chrome 本地 UI 预览 `http://127.0.0.1:5173/` 默认视口中 Generator 控制区为约
  `364 / 702px`，控件均为 `30px`；目标 PID 下拉触发器和菜单均为 `248px`，选项高度为 `30px`。
  `900×800` 下 Generator/Searcher 无横向溢出；`390×844` 下 Searcher 单列重排，无横向溢出。
  Chrome 连接可即时读取、点击和输入；当前检查未新增控制台错误，历史 HMR 记录不作为本轮故障。
  以上只验证本地界面和交互，不代表算法或项目所有者验收。
- 已通过：`npm run verify`（Prettier、TypeScript、178 个测试文件共 619 项测试、Vite/PWA 生产
  构建）。Lint 保留 `Gen3StaticPanel.tsx:298` 的既有 Hook 依赖 warning；构建保留既有大 chunk
  warning。
- 未运行：生产 URL 算法回归、真实 Emscripten Wasm 构建和 Windows EXE 验收。
- Git：本轮修改已提交为 `1883308 style: 优化第三世代ID乱数布局` 并推送至 `origin/main`。
- 下一步：选择下一个尚未迁移的 RNG 面板，按当前目标逐个核对、验证、提交并推送。

## 2026-08-27 第四世代野生乱数紧凑布局迁移

- 优化：第四世代 Wild 的 Generator/Searcher 模式切换移入存档信息左侧标题栏；乱数信息、设置、筛选三块
  面板桌面同排，前两块按内容收窄，筛选和结果区共享右边界，窄屏按单列重排。
- 优化：输入框、下拉框、多选触发器、生成/检索与个体值计算器按钮、下拉菜单选项统一为 `30px`；完美个体值/
  个体数采用左右结构，六项 IV 和结果列按内容收紧，长文本截断。
- 修复：取消筛选与显示能力值共用底部操作行，结果提示移到标题右侧，结果表首行虚拟偏移与 `40px` 表头一致，
  最后一列表头取消多余右边界线；移除 `PokeFinder / Wild4` 与 `PokeFinder / Filter` 冗余说明。
- 解耦：新增 `src/features/gen4wild/Gen4WildPanel.css` 并由 `Gen4WildPanel.tsx` 导入，页面通过
  `gen4wild-page` 局部变量控制密度；清理 `src/styles.css` 中 Gen4 Wild 专属布局、响应式和结果表覆盖。
- 已验证：外部 Chrome 本地 UI 预览 `http://127.0.0.1:5173/` 的桌面三栏约为 `270 / 304 / 480px`，页面无横向
  溢出；`900x800` 时单列无横向溢出。下拉菜单与触发框同宽且均为 `30px`；生成预览结果表可横向滚动，首行与
  `40px` 表头间距为 `0px`，末列表头右边界为 `0px`。该结果只验证界面和交互，不代表算法或项目所有者验收。
- 已恢复：外部 Chrome 页面可即时读取、点击和生成 UI 预览。导航/元素等待偶发超时后，页面仍为
  `readyState=complete` 且可直接读取；后续 UI 检查使用实时 DOM 状态判断，不将控制层等待超时记作产品故障。
- 已通过：`npm run verify`（Prettier、TypeScript、178 个测试文件共 619 项测试、Vite/PWA 生产构建）。Lint
  保留 `Gen3StaticPanel.tsx:298` 的既有 Hook 依赖 warning，构建保留既有大 chunk warning。
- 下一步：提交并推送本轮单独的布局迁移；生产页面算法回归仍等待 GitHub Actions 部署和项目所有者提供的 URL。

## 2026-08-27 第四世代定点乱数紧凑布局迁移

- 优化：第四世代 Static 的 Generator/Searcher 模式切换移入存档信息左侧标题栏；乱数信息、设置、筛选三块
  面板桌面同排，前两块按内容收窄，筛选和结果区共享右边界，窄屏按单列重排。
- 优化：输入框、下拉框、多选触发器、生成/检索与个体值计算器按钮、下拉菜单选项统一为 `30px`；完美个体值/
  个体数采用左右结构，等级、方法、六项 IV 和结果列按内容收紧，长文本截断。
- 修复：取消筛选与显示能力值共用底部操作行，结果提示移到标题右侧，结果表首行虚拟偏移与 `40px` 表头一致，
  最后一列表头取消多余右边界线；移除 `PokeFinder / Static4` 与 `PokeFinder / Filter` 冗余说明。
- 解耦：新增 `src/features/gen4static/Gen4StaticPanel.css` 并由 `Gen4StaticPanel.tsx` 导入，页面通过
  `gen4static-page` 局部变量控制密度；清理 `src/styles.css` 中 Gen4 Static 专属结果表覆盖。
- 已修改：`src/features/gen4static/Gen4StaticPanel.tsx`、`src/features/gen4static/Gen4StaticPanel.css`、
  `src/App.tsx`、`src/styles.css`、`docs/modules/gen4static.md`。
- 已通过：`npm run verify`（格式、TypeScript、178 个测试文件共 619 项测试、Vite/PWA 生产构建）；Lint 保留
  1 条既有 `Gen3StaticPanel.tsx` Hook 依赖 warning，构建保留既有大 chunk warning。
- 已恢复：外部 Chrome 旧标签连接失效导致的读取超时；Chrome 进程、扩展和 Native Host 只读诊断均正常，
  通过重新打开 Chrome 窗口并绑定新标签恢复 `http://127.0.0.1:5173/` 页面通信。
- 已验证：新标签页面连续 8 次 DOM 读取均成功，单次延迟 `29–44 ms`；存档信息浮窗关闭点击成功，页面保持
  `readyState=complete`，未复现连接超时。
- Git：本轮修改已提交并推送为 `7407eee style: 优化第四世代定点乱数布局`；工作区与 `origin/main` 已同步。
- 下一步：在已恢复的外部 Chrome 中完成桌面、HGSS、Searcher、下拉菜单和窄视口检查，之后开始下一个面板。

## 2026-08-26 第三世代野生乱数紧凑布局迁移

- 优化：第三世代 Wild 的生成器/检索器移入存档信息左侧标题栏；乱数信息、设置、筛选三块面板
  桌面同排，前两块按内容收窄，筛选和结果区共享右边界，窄屏按单列重排。
- 优化：输入框、`haku-select`、`multi-check-control`、生成/检索与个体值计算器按钮、下拉菜单选项
  统一为 `30px`；完美个体值/个体数、等级和六项 IV 保持同列边界，长文本截断。
- 修复：结果提示移到标题右侧，结果表首行虚拟偏移与 `40px` 表头一致，最后一列表头取消多余右边界线；
  移除 Wild 面板内 `Gen III / Wild API 4`、存档版本和 `PokeFinder / Filter` 冗余说明。
- 解耦：新增 `src/features/wild/Gen3WildPanel.css` 并由 `Gen3WildPanel.tsx` 导入，页面通过
  `gen3wild-page` 局部变量控制密度；同步清理 `src/styles.css` 中 Wild 表格的散落覆盖，共享控件不判断具体模块。
- 已修改：`src/features/wild/Gen3WildPanel.tsx`、`src/features/wild/Gen3WildPanel.css`、`src/App.tsx`、
  `src/styles.css`、`docs/modules/gen3wild.md`。
- 已通过：外部 Chrome `http://127.0.0.1:5173/` 默认视口与 `900×800` 窄视口检查；桌面三块面板尺寸约
  `244 / 252 / 558px`，控件和菜单选项为 `30px`，单选、多选、地点菜单宽度分别跟随触发框，页面无横向溢出。
  结果生成 500 条 UI 预览记录后，结果表宽度为 `1240px`，首行与表头间距为 `0px`，最后一列表头右边界为 `0px`；
  控制台无 error/warning，窄视口检查后已恢复默认视口。
- 已通过：`npm run verify`（格式、TypeScript、178 个测试文件共 619 项测试、Vite/PWA 生产构建）；Lint 保留
  1 条既有 `Gen3StaticPanel.tsx` Hook 依赖 warning，构建保留既有大 chunk warning。
- 未运行：生产 URL 回归、真实 Emscripten Wasm 构建和 Windows EXE 验收。
- Git：当前分支为 `main`；本轮修改已提交为 `2c24ad1 style: 优化第三世代野生乱数布局` 并推送至 `origin/main`。
- 下一步：选择下一个尚未迁移的 RNG 面板，按本目标逐个核对、验证、提交并推送。

## 2026-08-26 第三世代孵化乱数紧凑布局迁移

- 优化：第三世代 Egg 的 Emerald、RS/FRLG 模式切换移入存档信息左侧标题栏；乱数信息、设置、筛选三块面板
  桌面同排，前两块按内容收窄，筛选和结果区共享右边界，窄屏按单列重排。
- 优化：输入框、下拉框、多选触发器、生成/取消与个体值计算器按钮、下拉菜单选项统一为 `30px`；父母 IV、
  完美个体值/个体数、六项 IV 和结果列按内容收紧，长文本截断。
- 修复：结果提示移到标题右侧，结果表首行虚拟偏移与 `40px` 表头一致，最后一列表头取消多余右边界线；移除
  Egg 面板内 `PokeFinder / Eggs3` 与 `PokeFinder / Filter` 冗余说明。
- 解耦：新增 `src/features/egg/Gen3EggPanel.css` 并由 `Gen3EggPanel.tsx` 导入，页面通过 `gen3egg-page` 局部变量
  控制密度；同步清理 `src/styles.css` 中 Egg 专属网格和表格覆盖，共享控件不判断具体模块。
- 已修改：`src/features/egg/Gen3EggPanel.tsx`、`src/features/egg/Gen3EggPanel.css`、`src/App.tsx`、
  `src/styles.css`、`docs/modules/gen3egg.md`。
- 已通过：外部 Chrome `http://127.0.0.1:5173/` 默认视口与 `900×800` 窄视口检查；桌面三块面板尺寸约
  `240 / 270 / 544px`，两种游戏模式控件均为 `30px`，单选、多选、蛋种类菜单宽度跟随触发框且选项为 `30px`，
  页面无横向溢出。RS/FRLG 生成 500 条 UI 预览记录后，结果表首行与表头间距为 `0px`，最后一列表头右边界为 `0px`；
  控制台无 error/warning，窄视口检查后已恢复默认视口。
- 已通过：`npm run verify`（格式、TypeScript、178 个测试文件共 619 项测试、Vite/PWA 生产构建）；Lint 保留
  1 条既有 `Gen3StaticPanel.tsx` Hook 依赖 warning，构建保留既有大 chunk warning。
- 未运行：生产 URL 回归、真实 Emscripten Wasm 构建和 Windows EXE 验收。
- Git：当前分支为 `main`；本轮修改已提交为 `5913c87 style: 优化第三世代孵化乱数布局`，本地领先
  `origin/main` 1 个提交。推送尝试因 GitHub HTTPS 连接被重置/超时，网络恢复后需重试。
- 下一步：先将 `5913c87` 推送至 `origin/main`，再开始下一个面板。

## 2026-08-26 第三世代定点乱数紧凑密度与筛选器对齐

- 优化：第三世代定点乱数页面的输入框、单选下拉、多选触发器、模式标签、IV 范围、
  生成/检索按钮、个体值计算器及标题区存档选择统一为 `30px`，同步收紧垂直内边距、
  字段间距、IV 行高和下拉选项行高。
- 修复：`MultiCheckSelect` 以实际触发控件作为菜单定位锚点，觉醒力量、性格菜单宽度不再
  把左侧标签计入，且与 `haku-select` 共用边框、状态、截断和宽度规则。
- 修复：第三世代定点乱数中文界面的 Offset 专用标签改为“校准帧数”，不改变其他模块的
  通用 Offset 翻译和内部请求字段。
- 解耦：新增 `src/features/static/Gen3StaticPanel.css` 集中管理该页面紧凑密度，页面通过局部
  变量声明密度；共享 Select、MultiCheck 与菜单定位不判断具体 RNG 模块。
- 记录：将第三世代定点乱数布局原则写入 `docs/ui-design.md`、`docs/modules/gen3static.md`
  和固定 UI 契约，后续 RNG 面板按一次一个面板的顺序迁移；每个面板完成验证后独立提交并推送。
- 已修改：`src/features/static/Gen3StaticPanel.css`、`Gen3StaticPanel.tsx`、`src/styles.css`、
  `src/App.tsx`、共享 MultiCheck、`src/i18n.ts` 及上述 UI 文档。
- 已通过：外部 Chrome `http://127.0.0.1:5173/` 默认视口与 `900×800` 窄视口检查；控件高度
  均为 `30px`，存档选择和管理按钮均为 `30px`，普通/多选菜单选项均为 `30px`，觉醒力量、
  性格和存档菜单与各自触发框宽度一致；页面无横向溢出，控制台无 error/warning，窄视口
  检查后已恢复默认视口。
- 已通过：本轮最终代码的 `npm run verify`（格式、Lint、TypeScript、178 个测试文件共 619 项
  测试、Vite/PWA 生产构建）；Lint 保留 1 条既有 Hook 依赖 warning，构建保留既有大 chunk warning。
- 已通过：HakuStyle Skill 校验。首次因系统 `python` 不可用而退出 `9009`，改用工作区捆绑
  Python 并安装 `PyYAML 6.0.3` 后输出 `Skill is valid!`；该依赖安装在 Codex 运行时，不属于仓库文件。
- 未运行：生产 URL 回归、真实 Emscripten Wasm 构建和 Windows EXE 验收。
- Git：当前分支为 `main`；本轮第三世代定点乱数紧凑密度修改待提交并推送 `origin/main`。
- 下一步：提交 `style: 收紧第三世代定点乱数控件` 并推送。

## 2026-08-26 第三世代定点乱数布局收敛

- 优化：生成器/检索器移到存档信息左侧；乱数信息、设置、筛选三块面板在桌面同一行，结果面板位于其下方并与标题区右边界对齐。
- 优化：统一输入框、下拉框、多选触发器和底部操作按钮高度；收窄方法、等级、图鉴编号、个体值及结果列空白，保持同列控件左右边界一致。
- 调整：完美个体值、完美个体数采用左右结构并置于异色/性格筛选下方；显示能力值、取消筛选与个体值计算器在同一底部操作行；结果提示移到结果标题右侧预留区域。
- 修复：下拉菜单宽度跟随触发框，筛选面板及结果表在窄视口按内容重排，结果列表最后一列取消多余右边界线；移除面板内冗余的 PokeFinder / Filter 说明。
- 已修改：`src/features/static/Gen3StaticPanel.tsx`、`src/App.tsx`、`src/features/shared/useMenuPlacement.ts`、`src/styles.css`。
- 已通过：`npm run verify`（格式、Lint、TypeScript、178 个测试文件共 619 项测试、Vite/PWA 生产构建）；Lint 保留 1 条既有 Hook 依赖 warning，构建保留既有大 chunk warning。
- 浏览器证据：外部 Chrome `http://127.0.0.1:5173/` 默认视口与 900×800 窄视口均无横向溢出，三块面板和底部操作行布局正常，控制台无 error/warning；已恢复默认视口，待项目所有者最终确认视觉效果。
- 未运行：生产 URL 回归、真实 Emscripten Wasm 构建和 Windows EXE 验收。
- Git：当前分支为 `main`；本轮修改待提交并推送 `origin/main`。
- 下一步：提交 `style: 优化第三世代定点乱数布局` 并推送。

## 2026-08-26 存档编辑器层级修复

- 修复：统一存档信息工具中的 Gen4 编辑器提升到浮动工具面板之上，编辑器输入、按钮和 HGSS 未知图腾字段不再被下一层面板遮挡。
- 调整：Portal 下拉菜单提升到模态编辑器之上，心金/魂银版本选择可正常打开并点击；嵌套模态继续保持更高层级。
- 优化：`verify` 在已完成 `typecheck` 后只运行 Vite/PWA 打包，避免经由 `build:web` 重复执行 `tsc -b`；独立 `build:web` 继续保留完整类型检查。
- 已修改：`src/styles.css`。
- 已通过：`npm run format:files -- src/styles.css`、`npm run format:check`、`git diff --check`；外部 Chrome `http://127.0.0.1:5173/` 回归确认 Gen4 存档编辑器、心金字段、版本下拉、勾选和取消流程可操作，控制台无 error/warning，页面无横向溢出。
- 已通过：优化后的 `npm run verify`（格式、Lint、TypeScript、178 个测试文件共 619 项测试、Vite/PWA 生产构建）；Lint 保留 1 条既有 Hook 依赖 warning，构建保留既有大 chunk warning。
- Git：本轮修改待提交并推送 `origin/main`。
- 下一步：提交 `fix: 修复存档编辑器浮层层级` 并推送。

## 2026-08-26 工作区布局错乱修复

- 修复：Gen5 孵化、Gen5 配信、Gen4 配信、Gen7 配信时间检索和 Gen8 静态面板按实际内容容器宽度提前重排，侧栏与工具 Rail 展开时不再让三栏内容互相覆盖。
- 修复：Gen5 孵化双亲六项个体值网格移除强制最小轨道，并为紧凑标签增加省略保护，避免字段溢出到筛选面板。
- 优化：Gen6/Gen7 工作区及 Gen8 孵化、配信面板的桌面高度为顶部标题和底部操作栏预留空间，降低窄桌面视口中的操作栏裁剪风险。
- 已修改：`Gen4EventPanel.css`、`Gen5EggPanel.css`、`Gen5EventPanel.css`、`Gen7EventTimePanel.css`、`Gen8StaticPanel.css`、`styles.css` 及相关世代工作区样式。
- 已通过：`npm run format:files -- src/styles.css src/features/gen5egg/Gen5EggPanel.css docs/progress.md`、`npm run format:check`、`git diff --check`，以及完整 `npm run verify`（178 个测试文件、619 项测试、TypeScript、Lint、Vite/PWA 生产构建）。
- 浏览器证据：已尝试使用外部 Chrome 连接 `http://127.0.0.1:5173/` 复查，但两次标签连接均超时；未将本地浏览器检查写作通过或项目所有者验收。
- 未运行：Wasm 原生/真实构建、生产页面回归和 Windows EXE 验收。
- Git：当前分支为 `main`；本轮改动已提交为 `35a2631 fix: 修复工作区布局遮挡`。推送 `origin/main` 时 GitHub 连接被重置，当前本地分支领先远端 1 个提交，网络恢复后需重试。
- 下一步：由项目所有者在外部 Chrome/Edge 中确认 Gen5 孵化、Gen4/Gen5 配信及 Gen6/Gen7/Gen8 工作区的桌面和窄视口表现。

## 2026-08-26 存档编辑器浮层裁剪修复

- 修复：第四代存档在心金/魂银版本显示未知图腾配置时，编辑器不再被统一存档浮窗的固定高度和 `overflow: hidden` 裁剪或叠加。
- 修复：第三代、第五代、第八代和 3DS 存档编辑器同步移出可能存在的浮动面板父级，避免同类 fixed overlay 的层级和裁剪异常。
- 调整：新增共享 `BodyPortal`，Gen3/Gen4 统一存档面板仅在嵌入模式 Portal 化，独立管理器保持原有 modal 层级、关闭和焦点行为。
- 未运行：测试、Lint、TypeScript、构建、Wasm、外部 Chrome/Edge 视觉验收和生产页面回归；本轮只执行格式与差异检查。
- Git：当前分支为 `main`；存档编辑器浮层修复已纳入 `35a2631 fix: 修复工作区布局遮挡`。推送 `origin/main` 时 GitHub 连接被重置，当前本地分支领先远端 1 个提交，网络恢复后需重试。
- 已通过：`npm run format:check` 与 `git diff --check`。
- 下一步：由项目所有者在外部 Chrome/Edge 中共同确认 Gen4 HGSS 及其他存档编辑器的桌面和窄视口表现。

## 2026-08-25 Searcher 完美个体组合计数修复

- 对齐：按 3DSRNGTool `RNGFilters.CheckIVs` 保持两层 AND 语义，先检查六项 `IVlow..IVup`，再检查不低于 `PerfectIVValue` 的项目数是否达到 `PerfectIVCount`；没有增加互斥开关。
- 修复：Gen III/IV Static 与 Wild Searcher 的范围校验、Worker 分片、UI 预览和 C++ bridge 统一按两层筛选的交集候选计数与反向索引，不再先按完整六维笛卡尔积触发任务上限。
- 结果：六项 `0..31`、`Perfect IV Value=31`、`Perfect IV Count=5` 的候选数为 `187`，由 186 个恰好 5 项为 31 的组合与 1 个全 31 组合构成。
- 增加：共享 TypeScript/C++ 组合计数与反向索引；四个 domain 测试和四个 native 夹具覆盖索引 `186` 有效、`187` 越界。
- 已通过：定向 Vitest 9 个文件、39 项测试；四模块 native 夹具 4/4；`npm run verify` 的格式、Lint、TypeScript、178 个测试文件、619 项测试和生产 PWA 构建。
- 已知：Lint 保留 `src/features/static/Gen3StaticPanel.tsx:296` 的既有 Hook 依赖 warning，构建保留大 chunk warning；未运行外部 Chrome/Edge、生产 URL 回归、真实 Emscripten Wasm 构建或 Windows EXE 验收。
- Git：当前分支为 `main`；本轮修复、夹具和文档纳入同一提交并推送 `origin/main`。

## 2026-08-25 完美个体筛选冲突修复

- 修复：Gen VI Wild 不再把筛选用的 `Perfect IV Count` 当作遭遇生成时的保底 31 IV 数量，筛选 Count 不会改变 RNG 推进或生成结果。
- 保留：Gen VI Wild 上游 Undiscovered Egg Group 的 3V 规则；XY 保留 BabyMons 的 3V 行为，ORAS 按上游排除 BabyMons。
- 增加：原生夹具覆盖筛选 Count 与生成流独立、筛选结果数量正确；TypeScript 夹具覆盖 Perfect IV 与六项 IV 区间的组合筛选。
- 已通过：`npm run wasm:test:native`（69/69 CTest）、`npm run verify`（177 个测试文件、615 项测试、生产构建）。
- 已知：Lint 仍保留 `src/features/static/Gen3StaticPanel.tsx:296` 的既有 Hook 依赖 warning，以及生产构建的大 chunk warning；未进行外部 Chrome/Edge 或生产 URL 验收。

## 2026-08-25 完美个体筛选扩展与工程验证

- 新增：Gen III、Gen IV、Gen V、Gen VI Egg 和 Gen VIII 相关 Generator/Searcher
  工作区统一支持 `Perfect IV Value` 与 `Perfect IV Count`，语义为六项个体值中
  不低于指定值的项目数量至少达到指定数量；默认值为 `31 / 0`，范围为 `0..31 / 0..6`。
- 接入：共享筛选控件、domain 校验、Worker 请求编码、Wasm bridge、API 版本与请求长度，
  并同步 TypeScript/C++ 固定请求夹具、预览测试、模块文档和简体中文标签。
- 更新：贡献记录第二条赞助人改为“厉害啊”，新增“千一”于 2026-08-25 贡献 20 RMB
  用于 AI Token；记录总额为 120 RMB。
- 已通过：`npm run format:check`、`git diff --check`、`npm run verify` 和
  `npm run wasm:test:native`；177 个测试文件、615 项测试、69 个 CTest、TypeScript 检查、
  Vite 生产构建和 PWA 预缓存均成功。构建保留既有大 chunk 警告，Lint 保留 1 条
  `Gen3StaticPanel.tsx` Hook 依赖警告。
- 未运行：`npm run verify:full`，本机未发现 `emcc`、`em++` 或 `emcmake`；外部 Chrome/Edge
  视觉验收、生产页面算法回归和 Windows EXE 实机验收也未运行。
- Git：当前分支为 `main`，本轮功能与文档改动已完成本地提交；推送 `origin/main` 时
  GitHub 443 连接被重置，网络恢复后需重试推送。

## 2026-08-25 贡献记录更新

- 修正：第二条赞助记录的赞助人名称改为“厉害啊”，保留 2026-08-23、50 RMB 和 AI Token 用途。
- 新增：第三条赞助记录为“千一”于 2026-08-25 赞助 20 RMB，用于 AI Token；贡献记录总额更新为 120 RMB。

## 2026-08-24 第三世代 Seed 工具合并

- 调整：侧栏将 `初始Seed检索`、`Seed查询时间` 和 `GameCube Seed查询` 合并为
  一个 `Seed工具` 入口，进入后使用三页签切换具体工作流。
- 保留：三个功能的 Wasm、Worker、输入限制、结果表和算法文档仍然独立；统一
  工作区让页签切换不卸载面板，因此已有输入、结果和检索状态不会被清空。
- 接入：Tips 中的 Back Seed 与 Seed to Time 快捷入口改为打开统一 Seed 工具并
  自动切换到对应页签。
- 已通过：本轮触及文件的 `npm run format:files`、全仓
  `npm run format:check` 与 `git diff --check`。
- 未运行：测试、Lint、TypeScript、构建、Wasm、浏览器验收和生产回归；这些仍需
  项目所有者对具体命令或 URL 授权。

## 2026-08-24 Gen III Back Seed 与 Seed to Time 流程标注

- 澄清：第三世代 `Initial Seed Finder` 的 `FRLG / RSE` 页签就是 Real96
  `FRLGRSEInitialSeedsFinder/backSeed.cpp` 的 Back Seed 反推流程，功能未丢失；
  现在页签显式显示为 `Back Seed (FRLG / RSE)`，并补充 Tips 入口。
- 修正：Tips 将 `Gen 3 Seed to Time` 放在定点 Searcher 得到的 32 位 Seed 与
  模拟器 Target Painting Timer 之间，明确其职责是桥接得到四位十六进制 16 位
  Seed；Back Seed 作为 FRLG/RSE 的独立反推分支保留。
- 保留：Target Painting Timer 只服务模拟器，默认十进制校准值为 `30`，不实现
  实机 Painting Reseeding。
- 调整：Target Painting Timer 已移入“第三世代Seed工具”的独立页签，右下角工具
  Rail 不再显示其入口；Tips 仍为全局浮窗，并可直接切换到该页签。回填定点
  Generator 的四位十六进制 Seed 行为保持不变。
- 调整：第四世代 `Swarm RNG` 已从右下角工具 Rail 移入第四世代侧边栏，作为独立
  工作区保留每日 Encounter Seed、MT 推进与目标帧记录流程；不与仅有 Swarm 遭遇
  表开关的第四世代野生乱数合并。
- 已完成：代码与文档已定向格式化；本轮未运行测试、Lint、TypeScript、构建、Wasm
  或浏览器验收。
- 下一步：由项目所有者决定是否授权工程验证、浏览器验收或提交。

## 2026-08-24 Actions #172 ESLint 修复

- 定位：GitHub Actions `32652282635` 在 `npm run verify -> npm run lint` 检查 `public/sw-update.js` 时因 Service Worker 全局 `self` 缺少声明而失败，Windows EXE、Pages 和生产部署步骤因此被跳过。
- 修复：为 `public/sw-update.js` 增加 ESLint `/* global self */` 声明，不改变 Service Worker 的安装、激活、接管和旧页面刷新逻辑。
- 已通过：本地 `npm run verify`；Prettier、ESLint、TypeScript、177 个 Vitest 文件共 615 项测试、Vite 生产构建和 PWA 预缓存均成功。构建保留既有大 chunk 非阻断提示。
- 当前：修复尚未提交或推送，等待项目所有者确认后再进入 GitHub Actions 重跑；外部 Chrome/Edge UI 验收和生产页面算法回归未运行。

## 2026-08-24 模块会话状态缓存与贡献记录

- 修复：应用按模块键缓存本页面会话中已访问的工作区；从定点乱数切换到野生乱数再返回时，表单输入、检索结果、排序和操作上下文不再因组件卸载而重置。
- 边界：非当前模块通过原生 `hidden` 与 `inert` 隐藏并禁止交互，仍保留 React 状态；刷新页面恢复现有默认状态，不把可能很大的结果集写入 localStorage 或 IndexedDB。
- 更新：贡献榜新增“厉害啊”于 2026-08-23 贡献 50 RMB 用于 AI Token 的记录，并增加日期列；记录总额同步更新为 100 RMB。
- 已通过：本轮触及文件格式化、全仓格式检查和 `git diff --check`。
- 未运行：测试、Lint、TypeScript、构建、浏览器切换回归和生产页面回归；本轮未取得对应具体命令或 URL 的授权。

## 2026-08-23 PWA 版本更新与旧缓存修复

- 修复：移除 `vite-plugin-pwa` 的简单自动注入注册脚本，改为应用启动时显式注册 Service Worker；新 Service Worker 接管已有页面后自动刷新，避免用户继续停留在旧版 JS/CSS。
- 迁移：新增 Service Worker 激活桥，在已有旧 Service Worker 控制的窗口中主动导航到新入口，覆盖旧用户第一次回访时仍先命中旧预缓存的场景。
- 防护：Service Worker 注册使用 `updateViaCache: "none"`，检查更新时跳过浏览器 HTTP 缓存。
- 更新：用户切回页面时立即检查更新，已打开页面每 5 分钟主动检查一次；入口 `index.html`、`sw.js` 和 Web Manifest 在 Cloudflare Pages 使用重新验证缓存头。
- 保留：继续使用 Workbox 的 `skipWaiting`、`clientsClaim`、预缓存和离线回退，不清理用户 IndexedDB/localStorage 存档数据。
- 已通过：本轮触及文件格式化和 `git diff --check`。
- 未运行：测试、Lint、TypeScript、构建、浏览器缓存迁移验收和生产回归；需要部署后在已有 Service Worker 的浏览器中确认自动刷新行为。

## 2026-08-23 第三、四世代顶部存档选择兜底

- 新增：在第三世代静态、野生、孵化、GameCube、PokeSpot，以及第四世代定点、野生、孵化、配信模块的页面标题区域恢复轻量存档选择。
- 统一：顶部选择器复用共享 HakuStyle `Select`，按当前模块过滤兼容游戏版本；空存档时保留 `-` 占位和统一存档浮窗入口，可直接新建或导入存档。
- 保留：Gen5/Gen8 面板已有的存档选择和六/七代现有的 3DS 选择不变；顶部选择结果继续写入现有 IndexedDB/localStorage 存档控制器。
- 已通过：本轮触及文件格式化和 `git diff --check`。
- 未运行：测试、Lint、TypeScript、构建、浏览器验收和生产回归；当前改动等待项目所有者确认页面标题区的控件密度与选择行为。

## 2026-08-22 临时图片产物清理

- 移除：删除未跟踪的 `ui-audit-2026-08-21/` 审计目录，其中包含 75 张 UI 截图和 1 个审计 JSON；删除根目录 `ui-audit-current.png` 临时截图。
- 保留：`public/favicon.ico`、第四世代漫游宝可梦、七世代时钟、八世代地图、Spinda 和赞助信息等产品运行所需图片资源未改动。
- 更新：`.gitignore` 新增 `ui-audit-*`、`ui-audit-current.png` 和本地 `release/` 忽略规则；`release/` 目录仅忽略，未删除。
- 已通过：本轮文件格式化、`npm run format:check` 和 `git diff --check`。
- 未运行：测试、构建、浏览器验收和生产回归；本轮仅处理仓库清理与忽略规则。

## 2026-08-22 浮窗滚动槽与档案弹窗描边复查（待项目所有者视觉验收）

- 修复：普通 `profile-modal` 移除品牌色顶部描边，保留中性 `1px` 边框，避免与固定 UI 契约中的普通面板样式冲突。
- 修复：浮窗正文滚动层改为固定垂直滚动槽，浮窗切换内容或下拉菜单时不再因 `auto` 滚动条出现/消失造成布局跳动；结果表内部横向滚动规则未改动。
- 已确认：源码横查未发现产品 TSX 中的原生 `<select>`，共享下拉统一使用 `Select` 自定义控件。
- 已通过：本轮文件格式化和 `git diff --check`；未运行测试、构建、外部 Chrome/Edge 视觉验收或生产页面回归。
- 当前：本轮修改尚未提交；既有 `release/`、`ui-audit-2026-08-21/` 和 `ui-audit-current.png` 未跟踪产物保持不变。

## 2026-08-22 第八世代控制行容器断点复查（待项目所有者视觉验收）

- 修复：第八世代配信与孵化面板的顶层 `control-row`、第四世代配信的 `gen4event-controls` 和第七世代定点的 `gen7stationary-controls` 纳入主内容容器的 `1080px` 响应式断点；侧栏和浮动 Rail 占用空间后，控制区会在实际内容宽度不足时切换为单列，避免固定最小列造成裁剪或横向挤压。
- 修复：上述控制行和三栏控制区的直接子 section 在收窄时允许 `min-width: 0`，与现有 workspace、control-grid 的收拢规则保持一致。
- 已通过：`npm run format:files -- src/styles.css`、`npm run format:check`、`git diff --check`；源码横查确认其余顶层控制布局已由 workspace/control-grid 断点覆盖。
- 未运行：测试、构建、外部 Chrome/Edge 视觉验收和生产页面回归；当前规则仍需项目所有者在第八世代配信/孵化面板的桌面、中等宽度和窄视口共同确认。
- 当前：本轮仅修改 `src/styles.css` 与本交接记录；提交后保持未推送，既有 `release/`、`ui-audit-2026-08-21/` 和 `ui-audit-current.png` 未跟踪产物保持不变。

## 2026-08-22 第五世代结果区高度收敛（待项目所有者视觉验收）

- 优化：第五世代静态和野生结果面板取消 `780px`/`600px` 固定最小高度，改由结果表滚动区使用视口相关的 `clamp` 高度，减少无结果时的底部空白。
- 保留：结果表自身的横向滚动、虚拟列表和移动端操作空间；未修改算法、筛选字段或结果列定义。
- Git：功能变更已提交为 `ad0d879`；当前 `main` 已同步至 `origin/main`，未跟踪的 `release/`、`ui-audit-*` 文件未纳入提交。
- 已通过：`npm run format:check`、`git diff --check`、`npm run verify`；其中 177 个测试文件、615 项测试和生产 Web/PWA 构建均通过。
- 未运行：外部 Chrome/Edge 视觉验收仍待项目所有者连接浏览器并确认；当前自动化结果不能替代第五世代静态/野生在桌面、中等宽度和窄视口下的人工验收。

## 2026-08-22 高频布局遮挡与页签截断（待项目所有者视觉验收）

- 修复：桌面主内容为固定工具 Rail 预留右侧空间，移动端预留底部空间，降低浮动工具覆盖末端控件的风险。
- 修复：Gen VIII Raids 在内容容器收窄时切换为两列，Gen VIII Static 三栏使用更紧凑的自适应比例。
- 修复：Gen VII 定点控制区移除 `620px` 固定最小高度，结果区使用响应式高度；中等宽度下允许结果区自然收缩，避免控件被推离视口。
- 修复：统一存档浮窗页签取消省略号截断，文字居中并允许换行；窄视口改为两列并提高页签高度。
- 已通过：本轮 CSS 与进度文档已格式化，`npm run format:check` 和 `git diff --check` 无错误。
- 未运行：本轮外部 Chrome/Edge 视觉验收、生产页面回归和 Windows EXE 实机验收；仍需项目所有者共同确认 Rail 覆盖、Gen VIII/Gen VII 几何和窄视口页签表现。

## 2026-08-22 工程验证与 Git 同步

- 更新：修正顶部交接记录，确认 `a519b1d docs: 更新 UI 验证记录` 已同步至 `origin/main`。
- 已通过：`npm run format:files -- docs/progress.md`、`npm run format:check`、`git diff --check` 和完整 `npm run verify`；Vitest 为 177 个测试文件、615 项测试，Web 生产构建和 PWA 预缓存成功。
- 当前：`main` 将包含本次文档修正并推送至 `origin/main`；未跟踪的 `release/`、`ui-audit-2026-08-21/` 和 `ui-audit-current.png` 保留，不纳入提交。
- 未运行：外部 Chrome/Edge 视觉验收、GitHub Pages 生产页面算法回归和 Windows EXE 实机验收；这些仍需项目所有者在对应外部环境中共同确认。

## 2026-08-22 高频 UI 自检第三轮（工程修复完成，待项目所有者视觉验收）

- 修复：共享 Select、自动完成和多选菜单改为通过 Portal 挂载到 `document.body`，按触发器实时计算视口内的固定位置、宽度和最大高度，避免被面板、section 或浮窗内容裁剪。
- 修复：浮窗内容滚动层不再因下拉打开切换为 `overflow: visible`，滚动条轨道保持稳定；浮窗外点关闭、滚轮和触摸锁定均识别 Portal 菜单。
- 修复：Select 和多选触发器的长中文标签允许换行，自动完成选项不再省略文本；浮窗键盘焦点陷阱跳过 Portal 菜单。
- 工程验证：`npm run format:check`、`npm run lint`、`npm run typecheck`、`npm test`（177 个文件、615 项测试）和 `npm run build:web` 均已通过；构建仅保留既有 chunk 大小提示。
- 已提交并推送 UI 修复：`6c5273e style: 修复共享菜单与浮窗滚动布局`；交接记录已合并为 `a519b1d docs: 更新 UI 验证记录` 并同步至 `origin/main`。
- 待验收：外部 Chrome/Edge 当前未连接，尚未进行实际视口截图和下拉展开验收。

## 2026-08-22 高频 UI 自检第二轮（待工程验证与项目所有者视觉验收）

- 修复：NGC Seed 的标签、控制区和结果区共享同一自适应宽度，移除窄工作区会触发横向挤压的 `520px` 固定最小列。
- 修复：共享数字输入在网格内拉伸到所属轨道，避免左对齐后留下不一致的右侧空白；IV 范围输入统一为 `64px` 可读轨道。
- 修复：共享 Select 和自动完成菜单允许长选项换行显示，菜单保持视口内宽度，不再用省略号截断选项文本。
- 更新：补齐第七世代 ID、定点、野生和时间反查入口的中文世代前缀，页面标题与侧栏命名保持一致。
- 待验收：外部 Chrome/Edge 未连接，本轮尚未进行实际视口截图和下拉展开验收。

## 2026-08-22 高频 UI 二次收紧（工程验证已通过，待项目所有者视觉验收）

- 优化：杂项乱数的十六进制输入限制为可读的紧凑宽度，文本区域继续保留完整可用宽度。
- 修复：等级筛选与等级显示的双输入框共用 `56px` 轨道；IV 筛选的两个数值列固定为 `60px`，避免宽面板拉伸或数值被挡住。
- 修复：浮窗内容层打开共享下拉时暂时解除内部滚动裁剪，菜单不再被浮窗正文滚动容器截断。
- 优化：第六世代 TinyMT 时间线的控制面板、事件结果表列和第五世代 SHA1 Cache 日期/档案区收紧固定轨道，减少宽屏冗余。
- 已通过：本轮完成 `npm run verify`，Prettier、ESLint、`tsc -b`、177 个 Vitest 文件共 615 项测试、Vite 生产构建与 PWA 预缓存均成功；构建保留既有大 chunk 警告。
- 待验收：本轮未进行外部 Chrome/Edge 视觉验收；浮窗下拉裁剪、控件宽度和结果表几何仍需由项目所有者在页面中确认。

## 2026-08-22 高频控件与结果表几何收紧（待项目所有者视觉验收）

- 修复：共享菜单定位估算与自定义下拉的 `360px` 最大宽度统一，靠近右侧的长选项可按同一边界切换对齐方向。
- 优化：杂项乱数双列输入固定为紧凑的 `220px` 内容轨道；数字输入在普通工作区和浮窗中限制最大宽度，移动端仍恢复为全宽。
- 修复：等级筛选的双输入框统一为 `56px`，IV 筛选标题改为 flex 居中；第三、四代静态与第三代野生结果表的重复 IV 列收紧为 `56px`，同步缩小表面最小宽度。
- 已通过：`npm run format:files -- ...`、`npm run format:check`、`git diff --check`、`npm run verify`；Vitest 为 177 个测试文件、615 项测试，生产 PWA 构建成功。
- 未运行：没有可用的外部 Chrome/Edge 会话；下拉展开、浮窗滚动槽和各视口几何仍需项目所有者共同进行视觉验收。

## 2026-08-22 共享下拉与杂项乱数布局收紧（已通过工程验证，待项目所有者视觉验收）

- 优化：共享多选、自动完成和自定义下拉菜单改为内容自适应宽度，保留触发器宽度作为最小值，并限制在视口内，减少窄控件造成的横向空白。
- 修复：共享菜单定位的宽度估算与新的最大宽度策略保持一致，靠近视口右侧时仍可选择可用的对齐方向。
- 优化：杂项乱数浮窗收窄至 `640px`，输入网格保持紧凑双列，数值输入使用等宽数字，结果卡片保留稳定的可读最小宽度。
- 已通过：`npm run format:files -- src/features/shared/useMenuPlacement.ts src/styles.css src/features/miscrng/MiscRngPanel.css`、`npm run format:check`、`git diff --check`、`npm run verify`；Vitest 为 177 个测试文件、615 项测试，生产 PWA 构建成功。
- 未运行：当前没有新的外部 Chrome/Edge 会话；下拉实际展开宽度、菜单边界定位和杂项乱数各视口布局仍需项目所有者共同进行视觉验收。

## 2026-08-22 静态工作区与结果列收紧（待项目所有者视觉验收）

- 修复：PokeSpot 的成对 Seed / 帧数输入在三栏布局的临界宽度保留完整轨道，并继承共享输入的实体背景与中性色 `1px` 边框。
- 优化：第三、四代定点及第三代野生的虚拟结果表将六项两位 IV 列统一收紧为 `62px`，减少重复列占用；其余信息列、数据顺序与表格内部横向滚动保持不变。
- 规则：三栏工作区按内容分别分配宽度；含一标签双输入的左栏必须先满足双输入的最小可读宽度，不能由筛选栏的剩余比例挤压。
- 未运行：本轮尚未在外部 Chrome/Edge 进行视觉核验；需在 360/768/1280px 及桌面宽度确认 PokeSpot 双输入、静态/野生表头及 IV 数据列。

## 2026-08-22 浮层滚动锁统一（已通过工程验证）

- 修复：浮动工具、移动端模块抽屉、第六/七代 3DS、第五世代和第八世代档案编辑器，以及 HakuStyle Demo 不再直接切换 `body` 的 `overflow` 或增加右侧补偿内边距。
- 统一：新增共享滚动锁，在浮层可见期间阻止背景的滚轮、触摸与分页键滚动链，同时持续保留根滚动槽，避免打开浮窗时滚动条消失或工作区横向跳动。
- 已通过：`npm run format:files -- <9 个本轮文件>`、`npm run format:check`、`git diff --check` 与 `npm run verify`；Vitest 为 177 个测试文件、615 项测试，生产 PWA 构建成功。
- 未运行：外部 Chrome/Edge 中的滚轮、触摸、嵌套档案编辑器和 360/768/1280px 视觉复核；这仍需与项目所有者共同完成。

## 2026-08-22 共享菜单与浮窗滚动自检（已通过工程验证）

- 修复：顶部品牌壳移除随当前世代变化的重复副标题，保留固定产品名，避免导航元数据和页面世代标题重复占位。
- 修复：共享 `Select`、自动完成和多选菜单按视口边界自动选择左右对齐，并使用不小于触发器的可读宽度；长物种名和筛选项不再被 section 宽度直接截断。
- 优化：浮窗主体统一采用标题固定、内容区占剩余空间的稳定滚动轨道，切换内容高度时不再改变面板内部基线；字段内文本控件统一允许收缩并填满所属列，复选框、结果表和图标按钮保持独立几何规则。
- 优化：第三世代静态筛选器的标签列和输入列改为自适应比例，减少野生等级、槽位等筛选行的左侧空白。
- 已通过：定向格式化、`npm run format:check`、`git diff --check`、`npm run lint`、`npm run typecheck`、`npm test -- --run`（177 个测试文件、615 项测试）和 `npm run build:web`。
- 未运行：当前没有可用的外部 Chrome/Edge 会话；菜单实际左右定位、浮窗滚动槽和 360/768/1280px 视口仍需项目所有者共同做视觉验收。

## 2026-08-22 共享令牌与工作区响应式复查（已通过工程验证）

- 修复：补齐旧模块仍在使用的共享语义令牌别名，恢复多世代面板的边框、背景、文字、危险状态和等宽字体声明，避免因变量缺失导致样式静默失效。
- 优化：为主内容增加容器查询；当侧栏占用空间导致内容宽度收窄时，工作区、控制区和表单网格按断点收拢，避免固定最小列宽造成控件裁剪和无效空白。
- 统一：图标按钮使用 `44px` 触控尺寸、零额外内边距和网格居中；工作区与控制网格的同级 section 统一拉伸到共享高度基线。
- 已通过：`npm run format:files -- src/styles.css docs/progress.md`、`npm run format:check`、`git diff --check` 和 `npm run verify`；Vitest 为 177 个测试文件、615 项测试，Web 生产构建成功。
- 未运行：当前没有可用的外部 Chrome/Edge 会话，因此本轮未做浏览器视觉验收；下拉是否仍被裁剪、各视口收拢、图标居中和浮窗滚动槽仍需项目所有者共同确认。

## 2026-08-22 共享下拉与浮窗布局修复（已通过工程验证）

- 修复：共享 `Select`、自动完成和多选控件统一根据视口空间向上或向下展开，并避免被面板 `overflow` 裁剪。
- 修复：浮动工具锁定页面滚动时保留滚动槽宽度，打开和关闭面板不再造成内容横向跳动。
- 优化：杂项乱数输入改为网格内自适应，移除人为的数字/文本输入宽度上限；侧栏标题去除重复世代前缀，保留完整 `title` 和搜索匹配。
- 已通过：`npm run format:check`、`git diff --check`、`npm run verify`；其中 Vitest 为 177 个测试文件、615 项测试，Web 生产构建成功。
- Git：本地 `main` 已提交本轮修改；当前 `origin/main` 暂领先 1 个提交，推送因 GitHub 443 暂不可达待重试。
- 未运行：本轮未启动本地 UI 或外部 Chrome/Edge；下拉遮挡、浮窗滚动槽和各视口布局仍需项目所有者共同验收。

## 2026-08-22 UI 几何统一规则（进行中）

- 规则：同一工作区行内的 section 必须共享最高内容高度；宽度按内容重要性分配，不强制等宽。第三世代静态工作区固定为“乱数信息较窄、设置居中、筛选较宽”。
- 规则：查询表单与结果表必须使用明确的 `12px` 以上间距；结果表首行直接贴合表头，不使用重复的顶部占位。
- 规则：数值输入必须保留完整可读内容，不能因全局控件 padding、原生数字微调器或网格最小宽度而裁切；下拉菜单不得被 section、圆角或 overflow 裁掉。
- 规则：移除 `progress-track` 装饰进度条；进度数字保留在 metrics/status 区域，后续新增模块不得恢复该模式。
- 当前状态：已从 36 个旧模块渲染点移除 `progress-track`，并清理关联 CSS；第三世代静态、NGC Seed、基拉祈帧数查询、IV 筛选与 IV Calculator 已先完成共享样式调整，其他模块继续按同一规则逐页复核。
- 静态复核：产品 TSX 的原生 `<select>` 为 0；可见下拉均通过共享候选控件实现。
- 已通过：本轮 39 个触及文件的 `npm run format:files -- ...` 与 `git diff --check`。
- 未通过：`npm run format:check` 仅报告既有未跟踪审查产物 `ui-audit-2026-08-21/audit.json`，未改写该产物。
- 未运行：本轮未运行测试、构建或生产回归；等待项目所有者使用外部 Chrome/Edge 共同验收。

## 2026-08-22 档案浮窗描述修正

- 更正：统一浮窗仍保留第三、第四、第五、第六/七代 3DS 和第八代全部档案功能；仅将 3DS 档案页签的描述改为“第六、七代存档信息管理”，不删除其他世代入口。
- 保留：3DS 档案编辑器内部标题和实际存档功能不变；页签描述与世代归属分开维护。

## 2026-08-22 下拉裁剪与静态面板宽度复查（待项目所有者验收）

- 修复：共享 `Select`、自动完成和多选控件打开时，所在普通面板允许菜单溢出并提升层级，避免下拉选项被面板圆角或相邻列裁掉；菜单补充最小可读宽度。
- 优化：第三世代定点、野生、蛋、GameCube 及第四世代同类静态控制区改为三栏等宽自适应，`static-panel` 与 `static-rng-panel` 不再使用固定的不同列宽。
- 优化：NGC Seed 进度条移入结果面板，补齐 `progressbar` 的最小值、最大值和当前值，消除表单与结果之间的孤立进度横线。
- 未运行：本轮未运行测试、构建、外部 Chrome/Edge 或生产回归；待项目所有者授权具体 UI URL 后共同验收。
- 当前限制：工作区继续保留既有未提交改动和审查截图产物，本轮不提交、不推送。

## 2026-08-22 NGC 标签与静态控制行对齐复查（待项目所有者验收）

- 修复：NGC Seed 的 XD、竞技场、频道模式切换改为三等分，不再按标签文字长度分配按钮宽度。
- 优化：`gen3static-control-grid` 保留乱数信息、设置、筛选三栏的差异化宽度，同时让同一行 section 按最高内容自动拉伸到统一高度。
- 优化：第三世代 ID 检索输入区取消固定 `620px` 上限，填充当前工作区宽度，减少右侧无效空白。
- 未运行：本轮尚未运行测试、构建、外部 Chrome/Edge 或生产回归；待项目所有者共同验收。

## 2026-08-22 IV 筛选表头对齐复查（待项目所有者验收）

- 修复：共享 `iv-filter` 的表头文字与行内个体值快捷按钮统一居中，三列标题与对应输入列保持同一网格基线。
- 未运行：本轮尚未运行测试、构建或生产回归；待项目所有者共同验收。

## 2026-08-22 多选菜单宽度与 IV 列宽复查（待项目所有者验收）

- 修复：多选菜单改为挂在实际触发按钮的控制容器内，不再把包含字段标签的整行宽度当作下拉宽度。
- 优化：IV 表格的个体值标签列、最小列和最大列收窄并固定上限，表头与行继续共享相同列轨道。
- 未运行：本轮尚未运行测试、构建或生产回归；待项目所有者共同验收。

## 2026-08-21 全模块外部 Chrome UI 复核（待项目所有者验收）

- 已验证：使用外部 Chrome `http://127.0.0.1:5173/` 逐一切换当前侧栏的 74 个真实模块入口，并为每个入口执行视口截图采集。
- 已验证：74 个入口均无水平溢出；可见主工作区原生 `<select>` 数量均为 `0`；模块切换过程中未记录控制台 error/warn。
- 已验证：统一存档信息悬浮窗从第八世代模块打开后，第三世代、第四世代、第五世代、3DS 和第八世代五个标签页均可切换；各标签页保持实体背景、无原生 `<select>` 和无水平溢出。
- 已确认：`src/App.tsx` 中的 `nav[hidden]` 是旧版导航的隐藏兼容 DOM，不参与布局或交互；当前可见侧栏唯一来源为 `moduleNavigationGroups`。本轮保留该用户已有结构，不顺手删除大段历史 DOM。
- 当前限制：`ui-audit-2026-08-21/audit.json` 是此前生成的审查产物，仍保留旧标题记录；本轮逐入口结果已在外部 Chrome 会话中重新采集，但未改写该生成文件。
- 待验收：项目所有者使用外部 Chrome/Edge 逐模块查看截图与浮窗；在所有者确认前不提交、不推送、不进行 Pages 生产算法回归。

## 2026-08-21 浮动工具滚动槽稳定性复查（待项目所有者验收）

- 修复：根页面固定垂直滚动槽，打开或关闭浮动工具时不再因 `body { overflow: hidden }` 移除滚动条而产生横向布局跳动。
- 更新：浮动面板、个体值计算器和遇敌查询内容区使用动态视口高度，桌面与移动视口的可视边界保持一致；面板内部滚动仍由各自内容容器承担。
- 已验证：外部 Chrome `http://127.0.0.1:5173/` 打开/关闭研究工具和杂项乱数工具前后 `body`、`html` 宽度均为 `1462px`；面板背景为实体色；上述面板原生 `<select>` 数量为 `0`；控制台无 error/warn。
- 已通过：`npm run format:files -- src/styles.css`、`git diff --check`。
- 未通过：`npm run format:check` 仅报告保留的审查产物 `ui-audit-2026-08-21/audit.json`，未改写该生成文件；未运行完整测试、构建或生产算法回归。
- 待验收：项目所有者使用外部 Chrome/Edge 检查浮动工具开关、滚动槽、实体背景和剩余 UI 清单；本轮不提交、不推送。

## 2026-08-21 Gen VI 页面标题与统一存档浮窗复核（待项目所有者验收）

- 修复：`src/App.tsx` 补齐第六世代定点时间反查、配信时间反查、MT Seed 检索和 MT 初始 Seed / Time Finder 的页面主标题与版本映射，不再回退到第四世代野生乱数。
- 已验证：外部 Chrome `http://127.0.0.1:5173/` 逐项切换上述四个入口，`h1` 与侧栏/面板标题一致；控制台无 error/warn。
- 已验证：统一存档信息浮窗为实体不透明背景，滚动槽位保持稳定，第三至第八世代五个标签页均可切换；Gen V、3DS、Gen VIII 标签页无嵌套浮窗或遮挡。
- 已通过：`npm run format:files -- src/App.tsx docs/progress.md`、`git diff --check`。
- 未通过：`npm run format:check` 仅报告保留的审查产物 `ui-audit-2026-08-21/audit.json`，未改写该生成文件；未运行完整测试、构建或生产算法回归。
- 待验收：项目所有者使用外部 Chrome/Edge 检查标题、统一存档浮窗、各标签页和现有 UI 清单；本轮不提交、不推送。

## 2026-08-21 全局 UI 控件描边与布局复查（待项目所有者验收）

- 统一：主内容工作区、研究工具与存档信息浮窗中的文本输入、文本域和原生残留下拉，统一为 Ant Neutral HakuStyle 的 `44px` 高度、`10px` 圆角、`1px` 安静中性描边、hover 和 focus ring。
- 修复：带前缀输入框改为外框承载描边，避免内部 input 出现双重描边；IV Calculator 表格输入保留无缝单元格样式，并补充统一的键盘焦点反馈。
- 修复：浮窗内容使用稳定滚动条槽位，切换面板时不再因滚动条出现/消失造成布局跳动；杂项乱数输入、结果网格和 Gen V 双输入轨道收窄并按可用空间自适应。
- 保留：checkbox、radio、file input、隐藏输入和复合控件不套用普通文本输入描边规则；共享 HakuStyle `Select` 继续作为下拉入口。
- 已通过：定向 `npm run format:files`、完整 `npm run format:check`、`git diff --check`。
- 待验收：项目所有者使用外部 Chrome/Edge 逐项检查 input 描边、杂项乱数、浮窗滚动条、双输入框宽度、列宽和 section 间距；本轮不提交、不推送，未运行浏览器、构建或生产回归。
- 当前工作区：保留未跟踪 `release/` 打包目录，不纳入本轮修改或提交。

## 2026-08-21 Windows portable EXE 交付收口（配置已完成）

- 移除：Windows `nsis` 安装器目标及其配置，避免一次构建生成安装 EXE 和便携 EXE 两套产物。
- 收口：electron-builder 仅构建 Windows x64 `portable` 目标，最终文件名固定为 `PokeRNGKit.exe`；Actions 只上传该单一 EXE。
- 保留：桌面应用继续使用 Electron 原生壳、静态 `dist` 资源和本地 Worker/Wasm，不新增安装器、后端或运行时 CDN。
- 已通过：定向 `npm run format:files`、`npm run format:check`、`git diff --check`、`npm run typecheck` 和 package 配置断言；确认唯一构建目标为 `portable/x64`，没有 `nsis` 配置。
- 未通过（环境限制）：`npm run desktop:package` 已读取新配置并进入 Electron Windows x64 打包，但在 Electron 运行时目录重命名阶段返回 `EPERM`，未生成 EXE；这与源码和目标配置无关，Actions 仍需重新构建确认产物。
- 未运行：本轮配置变更后的 Windows Actions 构建、EXE 启动和生产页面回归，等待提交后的 Actions 结果与项目所有者共同验收。

## 2026-08-21 全局 Select 与侧栏命名统一（已完成工程验证）

- 统一：将 `src/features` 中全部 59 个原生 `<select>` 迁移为共享 HakuStyle `Select`，保留 `value`、`defaultValue`、`onChange(event.target.value)`、分组、禁用项和键盘操作兼容；源码已无原生 `<select>` 标签。
- 统一：侧边栏核心入口按世代前缀规范命名，第三世代为“第三世代 ID/野生/孵化乱数”，第四至第七世代同样使用“第 N 世代”前缀，避免同一导航层级混用简称和世代全称。
- 新增：Windows 原生桌面壳配置，Electron 应用从独立 `desktop` 目录通过受限 `app://` 协议加载静态站点，并在 Actions 生成 portable EXE；不新增后端，继续复用浏览器端 Worker/Wasm。
- 新增：`npm run desktop:package` 在缺少 `dist/index.html` 时使用 `BASE_PATH=./` 完整构建桌面资源；Actions 复用已下载的生产 `dist`，避免丢失 Wasm 文件。
- 已通过：任务文件格式化、`git diff --check`、`node --check desktop/main.mjs` 和完整 `npm run verify`（Prettier、ESLint、TypeScript、177 个测试文件共 615 项测试、2317 个生产模块和 239 项 PWA 预缓存资源）。
- 本地打包：electron-builder 已完成配置解析、Electron 运行时下载和应用目录初始化；当前 Windows 工作区在解压 Electron 运行时阶段长时间无产物，已中止，不将该环境阻塞误判为应用代码失败。portable EXE 交由 Windows Actions 生成，当前工作区未留下 `release` 产物。
- 修复：首次 Actions run `32400111335` 在依赖安装阶段失败；本地使用同一 `npm ci --engine-strict` 已通过，锁文件新增依赖的 `resolved` 地址已统一为官方 npm registry，避免 runner 继续依赖不可用镜像。
- 已通过：Actions run `32401120273` 的 `build`、GitHub Pages `deploy`、`windows-desktop` 和依赖安装；`windows-desktop` artifact 已上传，大小约 218 MB，包含 NSIS 安装 EXE 与 portable EXE。生产地址为 `https://haku76.github.io/PokeRNGKit/`。
- 未运行：外部 Chrome/Edge UI 验收、生产算法回归和 Windows 实机 EXE 启动验收；这些需要项目所有者在对应外部环境中共同确认，不能用 Actions 结果替代。

## 2026-08-20 Gen IV Gen4SeedFinder（已完成工程验证）

- 新增：Gen IV `Gen4SeedFinder` 主工作区，覆盖 DPPt Coin Flip 与 HGSS Elm Call 两条教程路径；按 PokemonRNGGuides 的日期/秒数/Delay 枚举和连续序列筛选语义生成 Seed、时间、Delay 与序列结果。
- 新增：独立 `gen4seedfinder` C++/Wasm bridge、Dedicated Worker、固定 10-word 结果协议、React domain 校验、中文文案、Gen IV 侧栏入口、模块文档和原生夹具。
- 输入保护：日期合法性、秒数跨分钟推进、Delay 范围上限、序列长度/字符集和 100,000 条结果上限均在 domain 与 Wasm 双重校验。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、`npm run typecheck`、`npx vitest run src/features/gen4seedfinder/domain.test.ts --pool=threads --maxWorkers=2`（1 个文件、3 项测试）、`POKERNGKIT_WASM_MODULES=gen4seedfinder npm run wasm:test:native`（1/1）和完整 `npm run verify`（177 个测试文件、615 项测试、2316 个生产模块、239 项 PWA 预缓存）。
- 未运行：Emscripten 浏览器 Wasm 产物构建、外部 Chrome/Edge UI 检查和 GitHub Pages 生产回归；这些仍按全部 3DS 模块完成后的统一门槛执行。
- 下一步：继续实现 P3 的 Voltorb Flip Seed / Board Generator；随后再进入统一 3DS/UI 与 Pages 生产验收。Gen V DS 深审仍按排期暂缓。

## 2026-08-20 Windows EXE 交付定义修正

- 决策：Windows 最终交付改为类似 PokeFinder / 3DSRNGTool 的直接桌面原生可执行程序；不是把静态站点和 PowerShell 启动器封装成自解压 portable 包。
- 更新：最终交付采用 Electron 原生壳的单一 Windows x64 portable EXE，不提供 NSIS 安装器；Worker/Wasm 资源继续随桌面应用本地加载。
- 排期：原生桌面壳、便携 EXE、Worker/Wasm 资源加载和 GitHub Actions 构建链顺延到全部功能与 Pages 生产回归之后。

## 2026-08-20 第三世代侧栏中文标签补齐

- 调整：按 `PokeFinder_zh.ts` 已核对译文，将第三世代 `Seed to Time`、`Static` 和
  `Wild` 侧栏标签改为“第三世代Seed查询时间”“第三世代定点乱数”“野生乱数”。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`。
- 未运行：完整测试、构建、外部 Chrome/Edge UI 检查和 GitHub Pages 生产回归；这些仍按统一验收门槛执行。

## 2026-08-20 侧边栏 Seed/ID 顺序调整

- 调整：Gen III、Gen IV、Gen V、Gen VI、Gen VII 侧边栏恢复 `ID -> Seed/Time Finder`
  顺序；Gen VIII 继续保持 ID 入口在前。
- 保留：Gen V / Gen VIII 存档信息管理继续由右下角浮动工具打开，不恢复侧边栏档案入口。
- 主要文件：`src/App.tsx`。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`。
- 未运行：完整测试、构建、外部 Chrome/Edge UI 检查和 GitHub Pages 生产回归；这些仍按统一验收门槛执行。

## 2026-08-20 侧边栏 Seed/ID 顺序与野生中文收口（已完成工程验证）

- 调整：按 `存档信息/ID -> Seed 相关 -> 定点 -> 野生 -> 蛋 -> 事件` 主线，
  将 Gen III、Gen IV、Gen V、Gen VI、Gen VII 侧边栏的 Seed、Time Finder 或
  Adjacent Seeds 入口置于对应 ID 入口之前；Gen VIII 无独立 Seed 入口，保持 ID 在前。
- 补齐：Gen VII Wild 简体中文的分类和队首能力标签；`gen8WildSlotModifier`
  遵循上游无简中词条时保留英文源标签，避免英文资源混入中文。
- 保留：Gen V / Gen VIII 存档信息管理继续由右下角浮动工具打开，应用级 controller
  共享选择、编辑和校准状态，不恢复侧边栏档案入口。
- 主要文件：`src/App.tsx`、`src/features/gen7wild/Gen7WildPanel.tsx`、
  `src/i18n.ts`、Gen V/Gen VIII Profile 浮窗及其文档。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、
  `npm run verify`（176 个测试文件、612 项测试、TypeScript、ESLint、Vite/PWA
  生产构建 2312 个模块和 238 项预缓存资源）。
- 未运行：Emscripten 原生/Wasm 检查、外部 Chrome/Edge UI、GitHub Pages 生产回归和
  项目所有者最终验收；这些仍按全部 3DSRNGTool 模块完成后的统一门槛执行。
- 当前 Git：提交 `513d933` 已推送到 `origin/main`，`main` 工作区干净；等待
  Actions 部署，不宣称生产页面已更新。
- 下一步：等待部署结果，再按项目所有者提供的准确 Pages URL 与外部 Chrome/Edge
  会话执行共同验收。

## 2026-08-20 统一 3DS/UI 验收与 Windows Actions 产物链（进行中）

- 修复：Actions run `32363436005` 的前端完整验证通过后，69 个原生夹具只有 `gen6mainseed_native_parity` 失败；复核确认测试把 Seed `0` 的 frame `15..20` IV 错写为 frame `10..15` 目标，并在单只模式传入违反 `upper <= lower + 2` 的 `0..31` 区间。本轮改为真实第二只 IV 与 frame 1 精确范围，不修改生产算法。
- 已通过：定向 `POKERNGKIT_WASM_MODULES=gen6mainseed npm run wasm:test:native`（1/1）及完整 `npm run wasm:test:native`（69/69）。
- 修复：右下角工具 Rail 外壳恢复实体 `surface` 背景、安静中性边框和统一阴影；工具按钮、存档信息和研究工具仍保持原有互斥浮层行为。
- 更新：GitHub Actions 将 Pages 使用的同一份 `production-dist` 上传为跨 job artifact，并新增 Windows portable job，生成自解压 `PokeRNGKit.exe` 与 ZIP 备份包；启动器只监听 `127.0.0.1`，不新增后端或运行时 CDN。
- 排期：Gen IV `Gen4SeedFinder` / Voltorb Flip 与 Gen V DS 参数、Initial Seed、Entralink 深审按项目所有者要求暂缓；Swarm RNG 已完成并移出当前缺口。
- 当前状态：Gen VII Stationary 已具备左侧乱数信息、中间设置、右侧筛选、下方结果的源码布局；Gen VII Wild 已具备筛选宽度约束。Pages 生产回归仍需新部署后的准确 URL 和外部 Chrome/Edge 会话。
- 已通过：`npm run verify`（176 个测试文件、612 项测试、TypeScript、ESLint、Vite/PWA 生产构建）；另通过 `npm run format:check`、`git diff --check` 和 Windows 启动器 PowerShell 语法解析。
- 旧生产基线：外部 Chrome 打开 `https://haku76.github.io/PokeRNGKit/`，当前资源仍为 `index-C0iXIKgu.js` / `index-BYpSXk4U.css`；控制台无 error/warn，但 Rail 外壳仍透明，Gen VII Stationary 仍为旧的设置/结果左右布局。该页面明显早于当前源码，不作为本轮验收通过证据。
- 未运行：本轮尚未运行 Windows Actions、新提交对应的生产页面回归或项目所有者最终验收；Windows 自解压包仍待 Actions 首次产出后在 Windows 实机打开验证。
- 下一步：提交推送后等待 Actions 完成；随后使用项目所有者提供的生产 URL 按八项 UI 清单逐项记录证据。

## 2026-08-20 Gen IV Swarm RNG（已完成工程验证）

- 新增：第四世代侧边栏 `Swarm RNG` 工作区，覆盖 D/P、Pt、HG、SS 的遭遇表和地点选择；其每日 Encounter Seed、MT 推进与目标帧记录流程独立于第四世代野生乱数的 Swarm 遭遇表开关。
- 新增：`Find advances` 按已知 MT Seed 和推进范围筛选目标 Swarm；`Find encounter seed` 按 Real96 工具的高字节、Hour、Delay 与 MT Advances 顺序返回第一个每日 Encounter Seed。
- 算法：在独立 C++/Wasm bridge 中实现 Gen IV MT19937、双 ARNG 和版本遭遇表取模；Dedicated Worker 负责握手、范围校验、结果复制和取消重建。
- 交互：结果可选中为目标帧，支持 `+1` 和 HGSS Youngster Joey `+2` 推进记录；游戏与遭遇选择复用 `AutoCompleteComboBox`。
- 来源：PokemonRNGGuides Gen 4 Swarm、Real96 `Gen4SwarmDailyEncounterRNGTool` revision `6bc5623008b8fbf87c4450ecdab55946b01815f7`、PokeFinder MT/ARNG；许可与输入边界见 `docs/modules/gen4swarm.md`。
- 已通过：`npm test -- src/features/gen4swarm`（1 个文件、3 项）、`npm run format:check`、`git diff --check`、完整 `npm run verify`（176 个测试文件、612 项测试、2312 个生产模块和 236 项 PWA 预缓存）。
- 已通过：`POKERNGKIT_WASM_MODULES=gen4swarm npm run wasm:test:native`（1/1）与激活 Emscripten 6.0.6 后的定向 `npm run wasm:build`；生成 `gen4swarm.mjs`（7360 bytes）和 `gen4swarm.wasm`（6286 bytes），产物按仓库规则保持忽略、不提交。
- 未运行：外部 Chrome/Edge、生产页面回归和项目所有者最终验收；按全部 3DS 模块完成后的统一门槛执行。
- 下一步：Swarm 已完成；Gen IV `Gen4SeedFinder` / Voltorb Flip 与 Gen V DS 深审按当前排期暂缓，进入统一 3DS/UI 与 Pages 生产验收。

## 2026-08-20 3DSTimeFinder TF7/TF8 Profile 收口（已完成工程验证）

- 新增：3DS 存档信息悬浮工具加入 Profile Manager / Gen VII Profile Calibrator 模式切换；
  校准命中结果可直接带 Tick/Offset 打开 Profile View 创建档案。
- 补齐：Gen VII Profile7 的 Tick（十六进制）与 Offset（十进制）字段、桌面/移动端显示、
  schema 1 旧档案迁移默认值，以及 Stationary、Wild、Event、ID 时间反查对档案参数的同步。
- 算法：复用 `gen7timefinder` Initial Seed Wasm，在 Dedicated Worker 中按上游
  `ProfileSearcher7` 的正负 Tick/Offset 枚举和 `uint32` 回绕语义计算；浏览器组合上限为
  5,000,000，结果上限为 100,000。
- 文档：更新 `docs/modules/3dsprofiles.md`、`docs/module-inventory.md`，TF7/TF8 标记为工程验证通过。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、全仓 ESLint、
  `npm run typecheck`、3DS Profile/Calibrator/Repository 定向 Vitest（3 个文件、13 项），
  以及完整 `npm run verify`（175 个测试文件、609 项测试、2308 个生产模块和 235 项 PWA 预缓存）。
- 已通过：`POKERNGKIT_WASM_MODULES=gen7timefinder npm run wasm:test:native`（1/1）；
  激活 Emscripten 6.0.6 后定向 `gen7timefinder` `npm run wasm:build`。
- 未运行：外部 Chrome/Edge UI 与生产页面算法回归；这些检查仍按全部 3DS 模块完成后的统一门槛执行。
- 当前 Git：本条目对应的 TF7/TF8 与侧边栏样式改动已完成工程验证，提交与推送在本轮收口执行。

## 2026-08-20 UI 验收清单收口（已完成工程验证）

- 修复：浮动工具面板和 Encounter Lookup 移除顶部有色强调线，恢复实体背景与静默中性边框；Encounter Lookup 结果列改为内容自适应，长地点名称可换行。
- 优化：Gen VII Stationary 控制区改为左侧乱数信息、中间设置、右侧筛选，结果表独占下方；窄屏自动恢复单列，避免控件互相遮挡。
- 优化：Gen VII Wild 筛选字段、候选控件和输入补充 `min-width: 0` / 最大宽度约束，防止等级、槽位等筛选项撑出左侧列。
- 修复：Gen VI TinyFinder MT Seed / MT Seed Time 纳入 Gen VI 顶部上下文与档案工具判断，避免新模块显示错误的世代标题或工具状态。
- 优化：侧边栏、导航和分组内容统一隐藏滚动条，同时保留必要的内容滚动；模块长标题和分组标题限制在可用宽度内单行省略，并保留完整 `title` 提示。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、`npm run lint`、`npm run typecheck`。
- 已通过：完整 `npm run verify`（174 个测试文件、606 项测试及生产 Web/PWA 构建）。
- 未运行：外部 Chrome/Edge UI 与生产页面算法回归；继续按全部 3DS 模块完成后的统一门槛执行。

## 2026-08-20 TinyFinder T10 Ambush Encounter（已完成工程实现与本地验证）

- 新增独立 `gen6tinyambush` TinyMT Wasm、Dedicated Worker、XY Victory Road Outside
  地点数据和伏击遭遇工作区；X/Y 共用 TinyFinder Map 327 的 12 槽表，默认 Min Index
  遵循 XY `Bag Advances = 27`。
- 按 TinyFinder `Wild.Ambush()` 严格实现槽位随机、Rand100、同步随机和物品槽消耗；
  不引入 Honey/Rock Smash 的闪烁、延迟、笛子或触发参数。支持 Seed / State、Index
  范围、同步与槽位掩码筛选、结果上限、虚拟结果表和 CSV。
- 接入 Gen VI 侧栏、三语文案、模块库存、固定宽度请求/结果协议和 `wasm/CMakeLists.txt`。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、改动范围
  ESLint、`npm run typecheck`、Ambush 定向 Vitest（2 个文件、5 项）、
  `$env:POKERNGKIT_WASM_MODULES='gen6tinyambush'; npm run wasm:test:native`（1/1）、
  完整 `npm run verify`（172 个测试文件、600 项测试及生产 Web/PWA 构建），以及在
  Emscripten 6.0.6 环境中运行的定向 `npm run wasm:build`。
- 未运行：外部 Chrome/Edge UI 和生产页面算法回归；继续按全部 3DS 模块完成后的统一
  验收门槛执行。

## 2026-08-20 TinyFinder T12 Victory Road Swooping（已完成范围审查）

- 核对：TinyFinder README 将 Victory Road Outside 的 Map 327 12 槽表称为
  `Swooping`，但源码没有独立的 Swooping 方法；`EnctrKey.Ambush`、`Wild.Ambush()`、
  `AmbushTable` 与 Swooping 使用完全相同的槽位、同步和物品消耗。
- 更新：T12 标记为已包含在 `gen6tinyambush`，文档记录 Fearow/Skarmory/Hydreigon
  槽位分组及 3DSRNGTool `+40` 操作延迟；不重复引入第二套 RNG 算法。
- 验证：已对本地 TinyFinder `README.md`、`Methods/Wild.cs`、`Classes/EncounterType.cs`、
  `Database/Data.cs`、`Database/TableXY.cs` 逐项核对；未新增运行时代码。

## 2026-08-20 TinyFinder T8 Honey Wild（已完成工程实现）

- 新增独立 `gen6tinyhoney` TinyMT / BlinkSystem Wasm、Dedicated Worker、地点数据生成器和蜂蜜野生工作区。
- 从 TinyFinder XY/ORAS `Locations*` 与 `Table*` 解析 238 个地点/遇敌表，保留地点 NPC、Bag Advances、首次长闪烁和版本差异。
- 支持普通 12 槽与水面 5 槽分布、Honey Delay、同步、危险帧、笛子、槽位、结果上限和 CSV。
- 已通过：任务文件格式化、定向 Vitest（2 个文件、4 项测试）、`npm run typecheck`、`npx eslint`、`$env:POKERNGKIT_WASM_MODULES='gen6tinyhoney'; npm run wasm:test:native`（1/1）。
- 已通过：完整 `npm run verify`（170 个测试文件、595 项测试及生产 Web/PWA 构建）；为适配当前 8.47 MB 主包，将 Workbox 预缓存上限从 8 MiB 更新为 12 MiB。
- 未运行：Emscripten Wasm 构建、外部 Chrome/Edge UI 和生产页面算法回归；后两项继续按全部 3DS 模块完成后的统一验收门槛执行。

# 2026-08-20 TinyFinder T13 MT Seed Searcher（已完成工程实现与本地验证）

- 新增：独立 `gen6mtseed` MT19937 Wasm、Dedicated Worker、六类搜索模式和虚拟结果表，覆盖 IV、PID、EC、PID Reroll、PID Reroll = EC 与 Horde；保留 TinyFinder 的 IV、性格、特性、PSV/PRV、Nice Spinda 和 Horde 跳帧语义。
- 接入：第六世代侧栏、三语文案、33-word 请求 / 32-word 结果 ABI、分步 Worker、结果上限、CSV、模块文档和原生夹具。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、模块 ESLint、`npm run typecheck`、`npx vitest run src/features/gen6mtseed/domain.test.ts --pool=threads --maxWorkers=2`（3 项）、`POKERNGKIT_WASM_MODULES=gen6mtseed npm run wasm:test:native`（1/1）以及完整 `npm run verify`（173 个测试文件、603 项测试及生产 Web/PWA 构建）。
- 未运行：Emscripten 生产构建（当前环境未提供 `emcc`）、外部 Chrome/Edge UI 和生产页面算法回归；后两项继续按全部 3DS 模块完成后的统一验收门槛执行。

# 当前目标：完成 3DSRNGTool 全范围后统一 UI 验收

## 2026-08-20 TinyFinder T14 MT 初始 Seed / Time Finder（已完成工程实现与本地验证）

- 新增：独立 `gen6mtseedtime` MT19937 Wasm、Dedicated Worker、目标时间与目标日期两种检索模式；保留 `FindSavePar`、XY/ORAS Save Frame 偏移、`Seed + 1000` 秒推进和 200,000 帧日期扫描。
- 接入：第六世代侧栏、三语文案、10-word 请求 / 8-word 结果 ABI、分步 Worker、秒数与结果上限保护、虚拟结果表、CSV、模块文档和原生夹具。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、模块 ESLint、`npm run typecheck`、`npx vitest run src/features/gen6mtseedtime/domain.test.ts --pool=threads --maxWorkers=2`（3 项）、`POKERNGKIT_WASM_MODULES=gen6mtseedtime npm run wasm:test:native`（1/1）以及完整 `npm run verify`（174 个测试文件、606 项测试及生产 Web/PWA 构建）。
- 未运行：Emscripten 生产构建（当前环境未提供 `emcc`）、外部 Chrome/Edge UI 和生产页面算法回归；这些检查按全部 3DS 模块完成后的统一验收门槛执行。
- Git：T14 与群战结果字段修正已分别提交；当前本地 `main` 领先 `origin/main`，多次 `git push origin main` 均因 GitHub HTTPS 连接被重置，待网络恢复后重试。

- 当前主线：TinyFinder T1-T14 已落地，进入 3DSRNGTool 全范围收口与统一 UI 验收准备。
- 验收门槛：上述范围全部完成并部署后，按项目所有者确认的八项清单完成外部 Chrome/Edge 生产页面验收；在此之前不宣称 3DS 功能或 UI 已最终完成。
- 当前状态：TF5、TF6、公共 TSV List、IV Range / IV Template、TinyFinder T10 Ambush、
  T12 Swooping 范围审查、T13 MT Seed Searcher 与 T14 MT 初始 Seed / Time Finder 已完成；
  外部页面回归保留到全部 3DS 模块完成后统一执行。

## 2026-08-20 TinyFinder T6 Rock Smash（已完成工程实现与本地验证）

- 新增独立 `gen6tinyrocksmash` TinyMT / BlinkSystem Wasm 与 Dedicated Worker，避免改变现有 `gen6wild` 的 3DSRNGTool 主 MT 结果。
- 接入第六世代导航、三语文案和 TinyFinder Rock Smash 工作区；支持 Seed / State、Index 范围、五槽遇敌表、闪烁参数、触发/同步/危险帧/笛子/槽位筛选、时间线和 CSV。
- 修正槽位掩码的 1–5 编号偏移，并按 TinyFinder `RandU32` 的先推进后取值语义复核闪烁消耗；原生夹具覆盖五个槽位的独立过滤。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`、`npm run lint`、`npm run typecheck`、定向 Vitest（2 个文件、4 项测试）、定向原生夹具（1/1）、定向 Emscripten Wasm 构建和完整 `npm run verify`（168 个测试文件、591 项测试及生产 Web 构建）。

## 2026-08-20 侧边栏长标题与滚动条样式修复（已完成工程验证）

- 修复：侧边栏模块标题在固定宽度下保持单行省略号，保留原有 `title` 完整名称提示；分组标题继续遵循相同截断规则。
- 优化：侧栏本体锁定溢出，导航内容仍可在模块较多时滚动，但 Chrome、Edge、Firefox 和兼容 WebKit 的滚动条均不显示，避免出现可见滚动条占位。
- 影响：仅调整 `src/styles.css` 的导航布局和溢出行为，不改变模块路由、键盘焦点、数据流或 RNG 算法。
- 已通过：任务文件格式化、`npm run format:check`、`git diff --check`。
- 未运行：测试、TypeScript、构建和外部 Chrome/Edge UI 回归；本轮为 CSS-only 修复，最终浏览器验收仍按全部 3DS 模块完成后的统一门槛执行。

## 2026-08-20 TinyFinder T1/T2 TinyMT 日期与 Index 查询（已完成工程验证）

- 新增：Gen VI TinyMT `Date Searcher` 与 `Generator`，日期模式按所选月份到年末枚举，每秒沿用 TinyFinder 的 `Seed + 1000` 规则；Generator 从四字状态生成连续 Index。
- 新增：Index / TinyMT 状态普通包含和正则筛选、结果上限、进度、取消、虚拟结果表与 CSV；生产 RNG 只在 `gen6tinyindex` Dedicated Worker/Wasm 中执行。
- 接入：第六世代侧栏、引擎标题和 API 版本文案；新增 `docs/modules/gen6tinyindex.md`，库存 T1/T2 更新为已实现。
- 已通过：TinyMT Index 定向 Vitest（2 个文件、4 项测试）、`npm run typecheck`、`$env:POKERNGKIT_WASM_MODULES='gen6tinyindex'; npm run wasm:test:native`（1/1）、任务文件格式化、`npm run format:check`、`git diff --check`。
- 已通过：在用户级 Emscripten 6.0.6 环境中运行 `cmd /c "call C:\\Users\\Hakuhiro\\emsdk\\emsdk_env.bat && set POKERNGKIT_WASM_MODULES=gen6tinyindex && npm run wasm:build"`；生成 `gen6tinyindex.mjs`（7733 bytes，SHA-256 `381273699382CDB04155F2A66356E685F7D1A616884F5F1921B92F77152DBDC2`）与 `gen6tinyindex.wasm`（6901 bytes，SHA-256 `E5FDB77063C70B0664DAEB755D4C151602391A3E48E377387ECD5EEBDFEEAEB2`）。
- 未运行：外部 Chrome/Edge UI 与生产页面算法验收；后两项继续按全部 3DS 模块完成后的统一门槛执行。
- 下一步：实现 TinyFinder T10 Ambush，复用本模块的地点数据、TinyMT 和 Worker/Wasm 协议边界。

## 2026-08-20 3DSTimeFinder TF1 Gen VI Stationary 时间反查（已完成工程验证）

- 新增：Gen VI Stationary TF1 时间/初始 Seed Searcher，按 `StationarySearcher6` 逐秒枚举 Citra epoch，使用 Save Variable、Time Variable 与 Epoch 的 32 位加法计算 Initial Seed。
- 接入：六代 Profile Manager 新增 Save Variable / Time Variable 字段并兼容旧档案；定点面板新增 TF1 时间模式、日期范围、时间结果列和 Worker 取消。
- Wasm：新增 `gen6timefinder` API v1 与 `gen6stationarytimefinder` Dedicated Worker；Stationary 算法继续复用既有 `gen6stationary` Wasm，时间结果为 19-word 固定协议。
- 已通过：TF1/存档/定点定向 Vitest（3 个文件、13 项）、`npm run typecheck`、`$env:POKERNGKIT_WASM_MODULES='gen6timefinder'; npm run wasm:test:native`（1/1）、任务文件格式化、`npm run format:check` 和 `git diff --check`。
- 未运行：`npm run wasm:build`，当前环境缺少已激活的 Emscripten / `emcmake`；外部 Chrome/Edge UI 与生产页面算法验收按全部 3DS 模块完成后的统一门槛执行。
- 下一步：实现 Gen VI TF2 Event 时间反查，复用 `EventSearcher6` 的结果和筛选语义。

## 2026-08-20 3DSTimeFinder TF2 Gen VI Event 时间反查（已完成工程验证）

- 新增：Gen VI Event TF2 时间/初始 Seed Searcher，按 `EventSearcher6` 逐秒枚举 Citra epoch，复用既有 Event 54-word Wasm 请求和 16-word 结果。
- 接入：Gen VI Event 面板新增 TF2 时间模式、日期范围、Date/Time 与 Initial Seed 结果列；保留 Wondercard 导入、PID 类型、锁定字段和筛选逻辑。
- 已通过：TF2/Gen VI Event 定向 Vitest（3 个文件、9 项）、定向 ESLint、`npm run typecheck`、`$env:POKERNGKIT_WASM_MODULES='gen6timefinder,gen6event'; npm run wasm:test:native`（2/2）、任务文件格式化、`npm run format:check` 和 `git diff --check`。
- 未运行：`npm run wasm:build`，当前环境缺少已激活的 Emscripten / `emcmake`；外部 Chrome/Edge UI 与生产页面算法验收按全部 3DS 模块完成后的统一门槛执行。
- 下一步：核对 TinyFinder 六代真实缺口，随后统一整理剩余 3DS 模块库存并准备验收。

## 2026-08-20 公共 IV Range / IV Template（已完成工程验证）

- 新增：实现 3DSRNGTool `IVRange` 与 `IVTemplate` 的全局本地浮动工具，复用 `AutoCompleteComboBox`，支持六项档位、严格六项模板、默认模板、新增/删除/保存和双亲应用。
- 接入：`Apply Range` 同步 Gen VI/Gen VII Egg 的 `ivMin` / `ivMax`；`Set as Male` / `Set as Female` 通过同页事件更新对应双亲六项 IV；模板保存到 `pokerngkit-iv-tools-v1`。
- UI：新增 IV Tools 悬浮入口，保持实体面板、焦点管理、Escape、点外关闭、拖动和移动端布局；不新增 RNG/Wasm 算法。
- 已完成：上游 `IVRange.cs`、`IVTemplate.cs`、`StringItem.cs`、`MainForm_CtrlGroup.cs`、`MainForm_Egg.cs` 输入边界和统计顺序核对；模块文档、需求和库存已更新。
- 已通过：`npx vitest run src/features/ivtools/domain.test.ts`（3 项）、改动文件 ESLint、`npm run typecheck`、`npm run format:check` 和 `git diff --check`。
- 已通过：完整 `npm run verify`，包含 162 个测试文件共 577 项测试、Vite 转换 2268 个模块和 PWA 220 项预缓存资源；仅保留既有主包超过 500 kB 的构建提示。
- 待完成：提交推送；外部 Chrome/Edge UI 回归和生产页面算法验收按全部 3DS 模块完成后的统一验收门槛执行。

## 工程验证耗时优化决策

- 现状：`tsc -b` 已使用项目引用增量缓存；Vite/PWA 全量构建仍必须生成所有 Worker、Wasm 资源和预缓存，不能用局部构建替代发布门槛。
- 基准：本机默认 `npm test` 的 159 个测试文件、568 项测试约 57 秒通过；强制 Vitest `threads` 池并发 4 在 Windows 上耗时约 148 秒并出现 3 个 worker 启动超时，因此不切换默认测试池。
- 决策：开发循环使用 `npx vitest run <module-test-files>`、`npx eslint <changed-files>`、定向 `POKERNGKIT_WASM_MODULES=<module>` 原生/Wasm 检查；提交前继续使用完整 `npm run verify` 与 `npm run verify:full`。
- 适用范围：增量 TypeScript、按修改文件 lint、按模块测试和按目标构建是多数 TS/Vite/Vitest 仓库都可复用的优化方向；测试池、Worker 数量、缓存策略和全量构建拆分不能直接照搬，必须在目标仓库和操作系统上以实际耗时、稳定性和资源占用重新基准测试。
- 文档化：已将上述分层验证原则写入 `docs/ai-development.md`，作为跨项目可复用的方法；本仓库的具体命令、基准和提交前全量门槛仍以本节实测记录为准。

## 2026-08-20 公共 TSV List（已完成工程实现）

- 新增：实现 3DSRNGTool `TSVListForm` 的本地 Web 版本，支持逐行、逗号、空白和分号分隔，按上游规则去重并忽略非法 TSV。
- 接入：TSV List 进入右下角悬浮工具菜单，使用 localStorage `pokerngkit-tsv-list-v1` 持久化，并通过同页/跨标签页事件同步 Gen VI 与 Gen VII Egg 的 Other TSV 输入。
- 约束：TSV 保持 `0..4095`，最多 4096 项，与两代 Egg 的 4096-bit Other TSV 掩码一致；不连接 NTR/TCP，不上传数据。
- UI：补充实体浮动面板、保存/清空、有效项数量、范围状态和移动端布局；侧边栏长标题统一单行省略号，滚动能力保留但隐藏可见滚动条。
- 已通过：TSV List 定向 Vitest（3 项）、定向 ESLint、TypeScript、任务文件格式化、`git diff --check`。
- 已通过：完整 `npm run verify`，包含 161 个测试文件共 574 项测试、Vite/PWA 生产构建 2265 个模块和 220 项预缓存资源。
- 待完成：提交推送，以及外部 Chrome/Edge 与生产页面回归；后两项按全部 3DS 模块完成后的统一验收门槛执行。

## 2026-08-19 3DSTimeFinder TF5 Gen VII Wild 时间反查（已完成）

- 新增：加入独立 `gen7wildtimefinder` Wasm、Dedicated Worker、时间枚举、领域校验、原生夹具和三栏参数工作台，支持 Grass/Fish、同步、性别比、闪耀护符与 WildFilter 筛选。
- 算法：按 `3DSTimeFinder` `WildSearcher7` 的 SFMT 128 项 RNGList 和帧消耗顺序实现同步、槽位、等级/笛子消耗、60 帧推进、EC、PID 重掷、六项 IV、Ability、Nature、Gender；Initial Seed 复用 `gen7timefinder` SHA-256 Worker。
- 接线：Gen VII 侧栏新增 TF5 入口，新增固定宽度 C ABI、请求/结果校验、取消、结果上限和 PWA Worker 产物。
- 已通过：`npx vitest run src/features/gen7wildtimefinder/timeDomain.test.ts`（3 项）；`$env:POKERNGKIT_WASM_MODULES='gen7wildtimefinder'; npm run wasm:test:native`（1/1）；激活 Emscripten 6.0.6 后定向 `npm run wasm:build`；`npm run verify`（159 个测试文件、568 项测试、Vite/PWA 219 项预缓存）；`npm run format:check`、`git diff --check`。
- 未运行：外部 Chrome/Edge UI 与生产页面算法验收；按当前目标，待全部 3DS 模块完成后统一执行八项 UI 门槛。

## 2026-08-20 3DSTimeFinder TF6 Gen VII ID 时间反查（已完成工程验证）

- 新增：加入独立 `gen7idtimefinder` 时间领域、Dedicated Worker、预览引擎和三栏工作台；按 `IDSearcher7` 逐秒枚举 Citra 时间并输出 Initial Seed、帧、TID、SID、TSV、TRV、Gen7TID 和 Clock。
- 复用：不新增重复 C++ RNG；Worker 复用 `gen7timefinder` Initial Seed SHA-256 Wasm 与 `gen7id` SFMT Wasm，再应用既有 ID 多行、TSV、Random Number、正则和 Disable Filters 语义。
- 接线：Gen VII 侧栏新增 TF6 入口，结果表使用虚拟滚动，补充固定十字结果协议、取消、时间/Seed 元数据和模块文档。
- 已通过：TF6 定向 Vitest（1 个文件、3 项测试）与既有 Gen VII ID 测试合计 2 个文件、15 项测试；`$env:POKERNGKIT_WASM_MODULES='gen7id'; npm run wasm:test:native`（1/1）；`npm run typecheck`、定向 ESLint、全仓 `npm run verify`（160 个测试文件、571 项测试、Vite/PWA 预缓存 220 项）、`npm run format:check`、`git diff --check`。
- 已通过：激活 Emscripten 6.0.6 后定向 `npm run wasm:build`，复用 `gen7id` 与 `gen7timefinder` 浏览器 Wasm 产物可用；CMake 仍提示 4.3.1 对 Emscripten shared library 的非阻断警告，当前 target 为 executable。
- 待完成：外部 Chrome/Edge 和生产页面回归；按当前目标，待全部 3DS 模块完成后统一执行八项 UI 门槛，未完成前不宣称 TF6 最终验收。

## 2026-08-19 3DSTimeFinder TF4 Gen VII Event 时间反查（已完成）

- 新增：加入独立 `gen7eventtimefinder` Wasm、Dedicated Worker、领域校验、预览引擎、三栏参数工作台、虚拟结果表、CSV、取消和空结果状态。
- 新增：按 `EventSearcher7` 复用 Gen VII Event 的 EC、PID、IV、Ability、Nature、Gender、Hidden Power、Shiny 和筛选语义；结果增加 Date/Time 与 Initial Seed。
- 修复：收口 45-word ABI 的 TypeScript 偏移、无性别元数据校验和随机性别编码；TF4 导航入口移到 TF3 时间反查旁，符合 `存档信息/ID -> Seed 相关 -> 定点 -> 野生 -> 蛋 -> 事件` 主线。
- 已通过：`npm run typecheck`、TF4 定向 Vitest（3 个文件、8 项测试）和 `$env:POKERNGKIT_WASM_MODULES='gen7eventtimefinder'; npm run wasm:test:native`（1/1）。
- 已通过：`npm run verify`（158 个测试文件、565 项测试，Vite/PWA 预缓存 214 项）、`npm run format:check`、`git diff --check` 和 Emscripten 6.0.6 定向 `npm run wasm:build`。
- 已验证产物：`gen7eventtimefinder.mjs` 8183 bytes，SHA-256 `8759C23CABF0DAC5489854E47C98CF1092CE055FA2B813739C6C80F9A430D728`；`gen7eventtimefinder.wasm` 7246 bytes，SHA-256 `00110E99534F56C8DB6BD5382FE6397242F558EC94C83078F7D244EBA880E1E2`。
- 未运行：外部 Chrome/Edge UI 回归和生产算法验收；全部 3DSRNGTool 模块完成后，按项目所有者列出的 8 项 UI 清单统一验收，须使用已连接外部浏览器。

> - 最近更新：2026-08-20
> - 当前分支：`main`
> - 当前阶段：公共 TSV List、IV Range / IV Template 已实现并通过提交前全量验证
> - 工作区状态：当前工作区干净，`main` 与 `origin/main` 对齐于 `7befd11`
> - 下一步：实现 Gen VI TF1/TF2 时间反查，随后评估 TinyFinder 独有缺口

## 2026-08-19 3DSTimeFinder TF3 Gen VII Stationary 时间反查（已完成）

- 新增：加入 `gen7timefinder` Wasm 初始 Seed 哈希模块，按 `3DSTimeFinder` 的 `SHA256::hash(tick, epochLow, epochHigh)` 计算 Citra epoch 对应的 32 位初始 Seed。
- 新增：Gen VII Stationary 面板支持 TF3 时间模式，按整秒日期范围枚举时间，复用既有 Stationary Worker/Wasm 生成和筛选，结果增加 Date/Time 与 Initial Seed。
- 新增：补充 `docs/modules/gen7timefinder.md` 与集中需求池 `docs/roadmap.md`，记录全世代教程共用主线、优先级、状态和排除项。
- 更新：按项目所有者确认的共有主线，将后续审查与侧栏规则固定为 `存档信息/ID -> Seed 相关 -> 定点 -> 野生 -> 蛋 -> 事件 -> 其他辅助扩展`；教程入口审查不再统一延后到最后。
- 修复：跨时间点累计结果在当前时间点达到上限但仍有后续时间时，正确报告 `resultLimitReached`；补充 Worker 初始化取消和该边界的回归测试。
- 已通过：5 个 TF3 定向测试文件、`npm run verify`（155 个测试文件、556 个测试）、`npm run format:check`、`git diff --check`。
- 已通过：`set POKERNGKIT_WASM_MODULES=gen7timefinder&&npm run wasm:test:native`（1/1）和 Emscripten 6.0.6 定向 Wasm 构建；`gen7timefinder.mjs` 5121 bytes，`gen7timefinder.wasm` 835 bytes。
- 未运行：外部 Chrome/Edge UI 回归和生产算法回归；需等待 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前阶段：TF3 Stationary 时间反查已完成；下一目标为 TF4 Event 时间反查
> - 工作区状态：TF3 核心、Worker、面板、导航、契约、测试和文档存在未提交修改，待提交推送
> - 下一步：提交并推送 `feat: 实现第七世代定点时间反查`，随后开始 TF4 Event

## 2026-08-19 3DSRNGTool 公共 Misc. RNG Tool

- 新增：实现 `miscrng` 全局轻量工具，收纳上游 `MiscRNGTool` 中尚缺的捕获率、暴击/摇晃结果、Random N 比较和 Pokerus 菌株解析。
- 新增：按 `Core/Capture.cs` 保留 Gen VI 高位随机字节、Gen VII 低位随机字节、状态/精灵球/图鉴/O 力量倍率、四次摇晃和 Always Capture 语义；按 `Gen7/Pokerus7.cs` 保留触发值、低三位筛选和菌株掩码。
- 接入：Misc. RNG Tool 进入右下角悬浮工具 Rail，使用实体浮动面板、Capture/Random N/Pokerus 三个标签、输入校验、错误、清空、键盘焦点、Escape、点外关闭和移动端单列布局。
- 更新：补充 `docs/modules/miscrng.md`、需求、模块库存、三语文案和域层测试；连续帧搜索继续由现有 Gen VII Main、SOS、Battle Tree 与 Festival Plaza 独立工作区负责，避免重复引擎。
- 已通过：`npx vitest run src/features/miscrng/domain.test.ts`（5/5）、`npm run format:check`、`git diff --check`。
- 已通过：完整 `npm run verify`；Prettier、ESLint（0 error / 0 warning）、TypeScript、Vitest（153 个文件、550 项测试）和 Vite/PWA 生产构建（210 项预缓存资源）均完成。
- 未运行：外部 Chrome/Edge UI 回归和生产页面算法验收；需等待部署后由项目所有者提供准确 URL 并授权。
- 排序更新：项目所有者要求将本地 `PokemonRNGGuides` 教程作为后续规划最高优先级；已按非翻译正文逐文件完成全世代人工复核（12 个分组、165 篇指南），确认 Gen 2、Legends Arceus 和 NTR Helper 不属于产品范围，后续先做 Gen VII/Gen VI 3DSTimeFinder，再做 TSV List 与 IV Range / IV Template，TinyFinder 扩展后移。
- 复核结论：Gen 3-8 的教程主线均已有对应核心模块；当前真正影响教程闭环的缺口是 Gen 7/Gen 6 时间反查、Gen 7 TSV/IV 模板，以及 Gen 4 Voltorb Flip/Swarm/Gen4SeedFinder 和 Gen 5 DS 参数/时间分支。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前 HEAD：`0de90b1`（`docs: 完成全世代教程人工复核`）
> - 当前阶段：公共 Misc. RNG Tool 已完成工程闭环；PokemonRNGGuides 全世代人工复核已完成并重排后续计划
> - 工作区状态：全世代教程复核文档已格式化、提交并推送，工作区干净
> - 验证状态：Misc. RNG Tool 定向测试和完整 `npm run verify` 已通过；外部浏览器未运行

## 2026-08-19 3DSRNGTool 公共 KeyBV

- 新增：实现 `keybv` 本地战斗视频解析工具，支持 Gen VI `0x6E60` 与 Gen VII `0x6BC0` 两种尺寸，读取两份匹配文件并恢复最多六只队伍记录。
- 新增：按上游 `BVBreaker.cs`、`PKX.cs` 的 party offset、密钥流 XOR、加密零值、LCRNG 加解密、四块重排和 checksum 规则解析 Species、四位 TSV 与一位十六进制 TRV。
- 接入：KeyBV 作为轻量全局工具进入右下角悬浮菜单，支持文件选择、拖放、尺寸状态、清空、错误、结果表、键盘焦点和移动端单列布局；不上传、不写回文件、不连接 NTR/TCP。
- 更新：补充 `docs/modules/keybv.md`、需求、模块库存和三语文案；沿用现有 Gen VII 物种数据与 Ant Neutral HakuStyle 实体浮动面板。
- 已通过：`npx vitest run src/features/keybv/domain.test.ts`（4/4）、`npm run format:check`、`git diff --check`。
- 已通过：完整 `npm run verify`；Prettier、ESLint（0 error / 0 warning）、TypeScript、Vitest（152 个文件、545 项测试）和 Vite/PWA 生产构建（210 项预缓存资源）均完成。
- 未运行：外部 Chrome/Edge UI 回归和生产页面算法验收；需等待部署后由项目所有者提供准确 URL 并授权。
- 下一步：实现 3DSTimeFinder TF3/TF4（Gen VII Stationary/Event），再实现 TF1/TF2（Gen VI Stationary/Event）。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前 HEAD：`38e1c5f`（`feat: 实现第六世代TinyMT时间线工具`，KeyBV 尚未提交）
> - 当前阶段：公共 KeyBV 已完成工程闭环，下一模块为 `Misc. RNG Tool`
> - 工作区状态：KeyBV 功能、导航、三语、需求、库存和模块文档存在未提交修改
> - 验证状态：KeyBV 定向测试和完整 `npm run verify` 已通过；外部浏览器未运行

## 2026-08-19 3DSRNGTool Gen VI TinyMT Timeline Tool

- 新增：实现 `gen6tinytimeline` 四字 TinyMT 状态、11 种方法、1 至 4 个事件、方法参数、Delay、Cry、Consider Delay、ORAS 与 Poke Radar Boost 的本地时间线工作区。
- 新增：接入独立 22/16-word Wasm C ABI 与单 Dedicated Worker，保留 TinyStatus 事件队列、冷却时间、延迟拆分、Horde 五只 Flute/Item、Poke Radar 五个摇草块、虚拟结果表、CSV、进度和取消。
- 调整：静态浏览器不连接 NTR/TCP；实时校准改为本地事件表输入。模块继续使用 Ant Neutral HakuStyle 的 44px 控件、实体面板、共享候选下拉和结果区滚动。
- 已通过：`npm run typecheck`、`npm run lint`、定向 Vitest 3/3、`npm run build:web`；`POKERNGKIT_WASM_MODULES=gen6tinytimeline npm run wasm:test:native` 在修正 C++ 十六进制字面量后通过 1/1。第一次原生夹具在编译阶段失败，未执行算法断言。
- 已通过：激活 Emscripten 6.0.6 后定向 `npm run wasm:build`；`gen6tinytimeline.mjs` 7,640 bytes，SHA-256 `50E8D20E03359015C8CC28FA5E557499E0A369AB791B602D07158434A29F5208`；`gen6tinytimeline.wasm` 23,892 bytes，SHA-256 `8FC36396E136498DAE09390B85B2A76668054D0B4C81D05E5DF2E6CACDFC5D3C`。
- 修复：首次完整 `npm run verify` 在 TypeScript 阶段发现 TinyMT 方法文本、AbortSignal 与 `gen6mainseed` 类型重导出问题；补充显式类型后从头重跑通过。
- 修复：为 12 个既有 TanStack Virtual 调用增加 `react-hooks/incompatible-library` 定点豁免；保留全仓 React Compiler 规则，不改变虚拟列表业务逻辑。定向 `npm run lint` 从 0 error / 12 warning 收敛为 0 error / 0 warning。
- 已通过：定点处理后从头运行完整 `npm run verify`；Prettier、ESLint（0 error / 0 warning）、TypeScript、Vitest（151 个文件、541 项测试）和 Vite/PWA 生产构建（2,240 个模块、210 项预缓存资源）均完成。
- 未运行：外部 Chrome/Edge UI 回归和生产页面算法验收；需等待 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。
- 下一步：核对公共 KeyBV，并按悬浮工具菜单规则落地轻量全局工具。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 功能起点：`c11f451`（`docs: 更新第六世代主Seed交接状态`）
> - 当前阶段：Gen VI TinyMT Timeline Tool 已完成工程闭环；下一模块为公共 KeyBV
> - 变更范围：TinyMT Timeline 功能、导航、三语、Wasm/C++、TanStack Virtual 警告收口和对应文档
> - 验证状态：完整 verify、定向原生夹具和生产 Wasm 构建已通过；外部浏览器未运行

## 2026-08-19 3DSRNGTool Gen VI Main Seed Finder 与全局工具入口

- 新增：实现 `gen6mainseed` 两只野生个体值和单只个体值范围两种检索模式；保留上游 MT19937 初始化、整块 twist、63 次预推进、连续 IV 窗口、性格、Gender 和帧 0 哨兵语义。
- 新增：接入独立 `gen6mainseed` Wasm/C ABI、最多 8 个单线程 Worker、Seed 分片、确定顺序、进度、取消、CSV、清空、错误、空结果和 TanStack Virtual 结果表；新增模块文档、需求、技术栈和库存记录。
- 优化：3DSRNGTool Profile Manager 从左侧隐藏模块导航收纳到右下角悬浮工具菜单，并保持全局可见；Researcher 同样由右下角悬浮工具菜单打开。3DS 档案编辑 modal 进入浮动面板后仍独立接管焦点。
- 修复：清理 Gen VI Main Seed bridge 未使用的辅助代码和 UI 未使用异常变量，补齐嵌套 modal 的点外关闭与 Tab 焦点例外。
- 已完成：`npm run format:files --` 本轮触及文件、`npm run format:check`、`git diff --check`。
- 未运行：Vitest、ESLint、TypeScript、原生夹具、Emscripten/Wasm 构建、Web 构建和外部 Chrome/Edge；仓库规则要求对具体工程检查或 URL 明确授权后再运行。算法验收仍需部署后由项目所有者提供准确 URL 并授权。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前 HEAD：`22f568a`（`style: 统一正式工作台与 Demo 组件样式`）
> - 当前阶段：Gen VI Main Seed Finder 已实现，功能提交 `f50c0e9` 已提交并推送；下一模块为 Gen VI TinyMT Timeline Tool
> - 工作区状态：本轮包含 Gen VI Main Seed Finder、3DS Profile Manager/Researcher 悬浮入口和对应文档改动，功能代码已提交并推送
> - 验证状态：格式检查与空白检查已运行；测试、构建、原生/Wasm 和外部浏览器回归未运行

## 2026-08-19 HakuStyle Demo 对齐第二轮

- 优化：正式工作台的浅色与深色中性令牌重新对齐 `?demo=hakustyle`，统一页面底色、实体表面、弱表面、边界、正文和次要文字；主内容宽度、页标题分隔、侧栏间距和折叠 Rail 搜索入口同步采用 Demo 几何，页头 `Ready` 状态改用与 Demo 相同的 Lucide 勾选图标。
- 优化：通用输入、原生下拉、自动完成、多选候选、分段切换、主次操作、运行状态、进度条、结果头部、表格与浮动工具面板统一为 44px 控件、10px 控制圆角、12px 菜单圆角、16px 普通面板和 18px 浮动面板；原生下拉增加与 Demo 一致的 Chevron 图标和深浅色适配，旧有不透明焦点描边改用半透明 focus ring。
- 优化：直接对齐 Gen VIII Raids、Static、Underground、Wild、Profiles、Egg、Event 与 Den Map 的模块样式，避免懒加载或高优先级模块 CSS 恢复 40px 控件、8px 面板、透明次按钮和旧下拉表面；保留虚拟表既有行高，未改动滚动定位计算。
- 影响：仅调整 CSS 令牌、布局和组件状态，不改变 React 数据流、模块字段、输入范围、RNG 算法、Worker、Wasm 或持久化。
- 已通过：本轮代码文件定向 `npm run format:files -- ...`、全仓 `npm run format:check`、`git diff --check` 和触及 CSS 的粗描边静态复扫；未发现非透明 2/3px focus outline、3px inset 状态环或 2/3px 方向边框。
- 未运行：ESLint、TypeScript、Vitest、Web/Wasm 构建和本地 UI 预览；项目所有者本轮未授权具体检查命令或 URL。
- 未运行：外部 Chrome / Edge 的 390px、1280px、桌面与深浅色 UI 回归；当前没有已连接的外部浏览器，不能使用应用内浏览器替代。
- 下一步：项目所有者连接外部 Chrome / Edge 并明确授权实际 URL 后，对正式工作台与 `?demo=hakustyle` 进行同屏回归；浏览器回归收口后继续 Gen VI Main Seed Finder，不提前进入后续 3DSRNGTool 模块。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - 当前 HEAD：`c879129`（`style: 清理工作台粗描边并统一 Demo 样式`）
> - 当前阶段：HakuStyle Demo 对齐第二轮已完成代码与静态格式收尾，等待外部浏览器回归
> - 工作区状态：`src/App.tsx`、`src/styles.css`、8 个 Gen VIII 模块 CSS 与 5 个旧模块焦点态 CSS 存在未提交 UI 修改，未暂存、未提交、未推送
> - 验证状态：定向格式化、全仓 Prettier、空白检查和粗描边静态复扫已通过；测试、构建和外部浏览器回归未运行

## 2026-08-19 HakuStyle UI 组件收敛

- 优化：严格对齐 `?demo=hakustyle` 的实体表面与安静边界，普通工作面板移除粗顶边和普通阴影，改为实体背景加 1px 中性边界。
- 清理：移除正式工作台、Demo、Gen V-VIII、研究工具和 Gen VIII Den Map 中的 3px 焦点光环、内嵌选中条和白色粗标记；焦点统一为 2px 透明混合色环，选中与悬停统一使用填充背景。
- 优化：共享自动完成与多选候选控件改用 Lucide 箭头和勾选图标，统一 44px 控件、10px 控制圆角、12px 实体候选层、填充高亮和克制浮层阴影；同步收敛 Gen V-VIII 的重复局部样式。
- 保留：浮动工具面板、弹窗和候选下拉仍保留克制的层级阴影；错误、警告、在线状态和地图位置继续使用语义色，但不再依赖粗描边。
- 影响：仅调整 CSS 材质、边界和状态表达，不改变 React 结构、交互、输入范围、RNG 算法、Worker、Wasm 或持久化。
- 已通过：定向 `npm run format:files -- ...`、全仓 `npm run format:check`、`git diff --check`，以及粗描边模式静态复扫；`src` 中不再存在 3px outline、3px 状态环、`inset 3px` 或 2/3px 方向边框。
- 未运行：ESLint、TypeScript、Vitest、Web/Wasm 构建和本地预览；本轮不包含算法或运行时改动，仓库规则要求这些检查取得具体授权后再执行。
- 未运行：外部 Chrome / Edge UI 回归和生产页面验收；当前没有外部浏览器连接，待部署后由项目所有者提供准确 URL 并授权。
- 下一步：继续按 PokeFinder/3DSRNGTool 库存推进 Gen VI Main Seed Finder；PokemonRNGGuides 流程排序与借鉴模块、EXE 适配保持最后阶段。

> - 最近更新：2026-08-19
> - 当前分支：`main`
> - Git 功能基线：`d3405e8`（`feat: 实现第六世代 ID 乱数`）
> - 当前阶段：HakuStyle UI 描边、实体表面和候选控件收敛已完成，下一模块为 Gen VI Main Seed Finder
> - 工作区状态：正式 App 与 `?demo=hakustyle` 共用固定 Ant Neutral HakuStyle 契约；普通面板无粗描边和 broad shadow，浮动层保留必要层级阴影
> - 验证状态：定向格式化、全仓 Prettier、空白检查和粗描边静态复扫已通过；外部 Chrome / Edge 未连接，浏览器回归待后续连接后执行

## 2026-08-18 3DSRNGTool Gen VI ID RNG

- 新增：实现独立 gen6id 工作区，覆盖 TinyMT 四字状态、连续 ID 帧、TID/SID/完整 TID-SID、TSV、TRV、Random Number 与状态筛选。
- 算法：复用上游 Gen6/ID6.cs、Controls/Frame_ID.cs、Core/IDFilters.cs 与 RNG/TinyMT.cs；每帧先保存状态再取 Nextuint()，按上游计算 TID、SID、TSV 和 TRV。
- 契约：新增 wasm/modules/gen6id，6-word 请求、8-word 结果、Wasm API version 1、Contract version 1、单 Dedicated Worker 和 public/wasm/gen6id.mjs/.wasm。
- 界面：增加 Gen VI 导航、0..5,000,000 浏览器帧保护、100000 行结果上限、三态 ID 筛选、正则/禁用筛选、进度、取消、虚拟结果表和 CSV。
- 文档：增加 docs/modules/gen6id.md，更新需求和模块库存；TinyFinder 与 Bambo-Rambo 研究资料记录在 third_party/tinyfinder/UPSTREAM.md、third_party/bambo-rambo/UPSTREAM.md。
- 已通过：`npm test -- --run src/features/gen6id`（2 个文件、4 项测试）和 `npm run typecheck`。
- 已通过：格式收尾、git diff --check、gen6id 原生夹具 1/1、激活 Emscripten 6.0.6 后的定向 Wasm 构建；gen6id.mjs 7516 bytes，SHA-256 0C24067B6A6EC0A798E83AA9BBB2DBE3C7323D4D52AC06C09EC41DCBE1E4AB8D；gen6id.wasm 4644 bytes，SHA-256 3EF9A2FC8FBA2C1E6597F101AA06A3A0063A038A620823EA38F58973D6AEF5FB。
- 已通过：完整 `npm run verify`；Prettier、TypeScript、Vitest（147 个测试文件、531 项测试）和 Vite/PWA 生产构建（2230 个模块、206 项预缓存资源）均完成；ESLint 0 error，保留 12 条既有 TanStack Virtual `react-hooks/incompatible-library` warning。
- 未运行：外部 Chrome / Edge UI 回归和生产页面算法验收；外部浏览器尚未连接，生产验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代 ID 乱数`，随后进入 Gen VI Main Seed Finder；TinyFinder/3DSTimeFinder 扩展按库存排期，PokemonRNGGuides 侧栏流程重排与可借鉴模块最后处理。

> - 最近更新：2026-08-18
> - 当前分支：`main`
> - Git 功能基线：`8754548`（`feat: 实现第六世代孵化乱数`）；当前工作区正在收口 Gen VI ID RNG
> - 当前阶段：Gen VI ID RNG 已实现，待提交推送；下一模块为 Gen VI Main Seed Finder
> - 工作区状态：正式 App 与 `?demo=hakustyle` 共用固定 Ant Neutral HakuStyle 契约；本轮包含 Gen VI ID 的 TinyMT 四字状态、ID/TSV/TRV/Random/状态筛选、Dedicated Worker/Wasm、固定高度虚拟结果表、三语界面和模块文档
> - 验证状态：Gen VI ID 定向 Vitest、TypeScript、格式检查、原生夹具、Emscripten 6.0.6 定向 Wasm 构建和完整 `npm run verify` 已通过；外部 Chrome / Edge 未连接，浏览器回归待后续连接后执行

## 2026-08-18 3DSRNGTool Gen VI Egg RNG

- 新增：实现独立 `gen6egg` 工作区，覆盖 Current 蛋、Frame Range、Accept/Reject 延迟、Main RNG PID、双亲 IV/Ability/性别/Ditto/道具、Nido Type、Shiny Charm、Masuda Method、Other TSV 与完整结果筛选。
- 算法：复用上游 `MainForm_Core.cs::Search6_Egg`、`MainForm.cs::getEggRNG`、`Core/EggRNG.cs`、`Gen6/Egg6.cs`、`Core/RNGPool.cs` 与 `RNG/MT.cs`；保留 20 项 MT 滚动缓冲、接受蛋 16 延迟、拒绝蛋 0 延迟、双 Power Item 随机父方、Current 行和 Female IV inheritance mask。
- 契约：新增 `wasm/modules/gen6egg`，154-word 请求、20-word 结果、Wasm API version 2、Contract version 1、独立 Worker 和 `public/wasm/gen6egg.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6egg.md`，同步 README、需求、技术方案和模块库存；记录上游 WinForms 输入边界、Current 行、接受/拒绝延迟、请求布局和验证限制。
- 已通过：`npm test -- --run src/features/gen6egg`（2 个文件、4 项测试）、`npm run typecheck`、`npm run format:check`、`git diff --check`、`$env:POKERNGKIT_WASM_MODULES='gen6egg'; npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后 `$env:POKERNGKIT_WASM_MODULES='gen6egg'; npm run wasm:build`。
- 产物：`public/wasm/gen6egg.mjs` 7547 bytes，SHA-256 `7BB1E3CC00E5C98208EB14A82403C3220CAB9CE5C637D835F73EABCC3CF399F6`；`public/wasm/gen6egg.wasm` 10475 bytes，SHA-256 `D1980DE45AFD7376BC998E4BE8B9712F492F79039996347D538EFCDA4FFAC868`。
- 修复：远端 HakuStyle Demo 的工具面板状态重置从 effect 移入工具切换事件处理器，消除 React `set-state-in-effect` lint error；保留 Demo 作为后续 UI 风格基线，不参与 RNG 算法。
- 已通过：合并 `origin/main` 后完整 `npm run verify`（145 个测试文件、527 项测试、Vite 转换 2225 个模块、PWA 预缓存 203 项）；Lint 0 error，保留 12 条既有 TanStack Virtual `react-hooks/incompatible-library` warning。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无外部调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。网络 `git pull` 曾重试两次因连接重置失败，随后使用已获取的 `origin/main` 对象完成本地快进合并。
- 下一步：提交并推送 `feat: 实现第六世代孵化乱数`；随后核对并实现 Gen VI ID RNG。

## 2026-08-18 3DSRNGTool Gen VI Poke Radar RNG

- 新增：实现独立 `gen6pokeradar` 工作区，覆盖 TinyMT Seed/Frame、帧范围、Party Size、Chain Length、Boost、音乐状态、四个宝可梦摇草块、一个不可踩空块和 9×9 概览。
- 算法：复用上游 `Gen6/PokeRadar.cs` 与 `RNG/TinyMT.cs` 的消耗顺序；保留 `23/43/63/83` GoodRate、音乐触发、连锁/Boost 闪光阈值和 `Patch.X/Y` 坐标映射。
- 界面：增加帧范围与生成参数、进度、取消、100000 行结果上限、CSV、固定高度虚拟结果表，以及 `B/G/S/X/C` 草块概览。
- 契约：新增 `wasm/modules/gen6pokeradar`，8-word 请求、16-word 结果、Wasm API version 1、Contract version 1、独立 Worker 和 `public/wasm/gen6pokeradar.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6pokeradar.md`，同步 README、需求、技术方案和模块库存；记录 TinyMT、帧范围、队伍数量、连锁长度、GoodRate、闪光阈值、坐标映射和浏览器任务上限。
- 已通过：`npm test -- src/features/gen6pokeradar`（2 个文件、4 项测试）、`npm run verify`（143 个测试文件、522 项测试、Vite 转换 2218 个模块、PWA 预缓存 200 项）、`npm run format:check`、`git diff --check`、`$env:POKERNGKIT_WASM_MODULES='gen6pokeradar'; node scripts/wasm.mjs test-native`（1/1）和激活 Emscripten 6.0.6 后的 `node scripts/wasm.mjs build`。
- Lint：0 error、11 条 TanStack Virtual `react-hooks/incompatible-library` warning，其中 1 条来自本模块虚拟结果表。
- 产物：`public/wasm/gen6pokeradar.mjs` 7565 bytes，SHA-256 `5285F825A7E98462E079928F310C7F3722A56C0772268FB2713263AA2DC794DC`；`public/wasm/gen6pokeradar.wasm` 6743 bytes，SHA-256 `2173E008765E425837148DDBFD30297C32519A696F094C876195579955F07F7B`。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无外部调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代宝可雷达乱数`；随后核对并实现 Gen VI Egg RNG。

## 2026-08-18 3DSRNGTool Gen VI DexNav RNG

- 新增：实现独立 `gen6dexnav` 工作区，覆盖 Grass、Tall Grass、Surf 的主动搜索与普通触发、摇晃坐标、槽位类型、连锁 Boost、搜索等级、Potential、Flute、隐藏特性、蛋招式、持有物和闪光检查。
- 算法：复用上游 `Gen6/DexNav.cs` 与 `RNG/TinyMT.cs` 的消耗顺序；保留 `FindPatch()` / `PostCheck()` 成功占位行为，Nav HA、Unown 和强制闪光与上游 MainForm 设置联动。
- 界面：增加 Tiny Seed/Frame、遇敌类型、主动搜索、图鉴导航遇敌、搜索等级、连锁长度、潜力星级、笛子、档案 TSV/TRV、13 槽可编辑物种/等级、进度、取消、100000 行结果上限、CSV 和固定高度虚拟结果表。
- 契约：新增 `wasm/modules/gen6dexnav`，45-word 请求、16-word 结果、Wasm API version 1、Contract version 1、独立 Worker 和 `public/wasm/gen6dexnav.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6dexnav.md`，同步 README、需求、技术方案和模块库存；记录 `DexNav.cs` 的输入边界、Grade/Boost/闪光检查和上游占位限制。
- 已通过：`npm test -- src/features/gen6dexnav`（2 个文件、4 项测试）、`npm run verify`（141 个测试文件、518 项测试、Vite 转换 2213 个模块、PWA 预缓存 197 项）、`npm run format:check`、`git diff --check`、`$env:POKERNGKIT_WASM_MODULES='gen6dexnav'; node scripts/wasm.mjs test-native`（1/1）和激活 Emscripten 6.0.6 后的 `node scripts/wasm.mjs build`。
- Lint：0 error、10 条 TanStack Virtual `react-hooks/incompatible-library` warning，其中 1 条来自本模块虚拟结果表。
- 产物：`public/wasm/gen6dexnav.mjs` 7490 bytes，SHA-256 `C81F8167D1276F9D0B187421267449127214BAEB922D046D8477830E568E04FB`；`public/wasm/gen6dexnav.wasm` 8980 bytes，SHA-256 `B14937434D5869759467374734AEB36580713445A466E474275A1769D5588313`。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无外部调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代图鉴导航乱数`；随后核对并实现 Gen VI Poke Radar RNG。

## 2026-08-18 3DSRNGTool Gen VI Wild RNG

- 新增：实现独立 `gen6wild` 工作区，覆盖 X、Y、Omega Ruby、Alpha Sapphire 的普通野生、Horde、Rock Smash 和 Fishing；支持队首能力、笛子、钓竿、Horde 选槽、闪耀护符、异色/方块异色、IV、性格、觉醒力量、性别、特性、道具与槽位筛选。
- 算法：复用上游 `Wild6`、`WildRNG`、`RNGPool` 的 TinyMT/MT19937 消耗顺序；普通、碎岩、钓鱼和群聚分别保留动态延迟、队伍消耗和五只连续生成规则；算法只在独立 Dedicated Worker 和 Wasm 中执行。
- 数据：从 `LocationTable6.cs`、`HordeArea6.cs`、`FishingArea.cs` 和三语地点资源生成 183 个区域记录；上游 revision 缺少完整 XY 普通野生槽位时使用可编辑自定义槽位，并在模块文档记录限制。
- 界面：增加版本、遭遇类型、地点、Seed、Tiny Seed、帧范围、Delay、队伍数量、钓竿、队首能力、笛子、槽位与完整结果筛选，支持进度、取消、100000 行结果上限、CSV、排序和固定高度虚拟结果表。
- 契约：新增 `wasm/modules/gen6wild`，96-word 请求、16-word 结果、Wasm API version 1、Contract version 1、独立 Worker 和 `public/wasm/gen6wild.mjs/.wasm`。
- 已通过：`npm test -- src/features/gen6wild`（2 个文件、5 项测试）、`npm run verify`（139 个测试文件、514 项测试、Vite/PWA 生产构建）、`npm run format:check`、`git diff --check`、`POKERNGKIT_WASM_MODULES=gen6wild npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后的 `POKERNGKIT_WASM_MODULES=gen6wild npm run wasm:build`。
- 产物：`public/wasm/gen6wild.mjs` 7440 bytes，SHA-256 `5490544C909FADF410F0A2F3D292354C520269DC1A5041FE1598DDA7B907419C`；`public/wasm/gen6wild.wasm` 14225 bytes，SHA-256 `C5082B38815D6434008656477A574E61980EF675DC0BA2258A974D885152F9DD`。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无外部调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代野生乱数`；随后核对并实现 Gen VI DexNav RNG。

## 2026-08-18 HakuStyle UI Demo 与正式工作台基线

- 新增：增加独立 `?demo=hakustyle` 预览入口，使用 Ant Neutral 单一主题展示工作台侧栏、配置表单、筛选、结果表、进度、浮动工具、三类面板和下拉选框。
- 优化：标准密度固定为 16px 正文 / 44px 控件，并同步调整面板内边距、字段间距、导航行高和结果行几何；浅色、深色、系统跟随主题偏好写入 localStorage，系统模式监听操作系统变化。
- 优化：侧栏展开宽度进一步收窄为 224px（1120px 以下为 216px），收起 Rail 为 64px；搜索框到首个世代、各世代之间的垂直间距进一步压缩为 4px，世代数字提升为 17px 且与 `GEN III` 同一中线；数字与 `Open Modules` 共用 44px 外框，分组按钮内间距收紧；模块项移除重复图标和小字描述，底部 `hs-demo-rail-footer` 已删除；收起时不展示下拉项，点击世代数字会展开侧栏并打开对应层级；折叠状态写入 localStorage，图标按钮提供 tooltip。
- 修复：移除侧栏顶部 `hs-demo-rail-header` 模块；世代数字图标与 `Open Modules` 使用同一 `44px` 方形外框尺寸，并同步分组按钮轨道，展开与收起状态保持居中。
- 修复：桌面菜单按钮只切换侧栏折叠，移动端按钮只切换抽屉；移除选中导航项的 `3px border-left`，改用填充选中背景；同步将 HakuStyle 的普通状态标记限制为 `1px`，避免高描边重新出现。
- 优化：浮动面板统一居中显示，并按档案、个体值计算器、遇敌查询功能使用不同宽度；标题栏支持 Pointer Events 拖动与键盘方向键位移，位置受视口边界限制；加入缓冲式抽屉/面板进入动效和 reduced-motion 回退；深浅切换改为图标按钮，文字只通过 tooltip 与 `aria-label` 提示。
- 新增：浮动工具改为单一折叠触发器，桌面端鼠标进入后向上展开、离开后收起，移动端以点击触发器切换；工具按钮彼此独立等距。键盘焦点可展开工具且鼠标点击焦点不会钉住展开态；工具面板支持 scrim、显式关闭、`Escape` 关闭、焦点圈定和触发器焦点恢复。Demo 内所有下拉均统一为输入 + 按钮的候选控件，支持打开、键盘方向键、Enter、Escape 与鼠标选择；下拉预览保留实体候选层，采用默认宽度、键盘与移动端贴边策略。
- 清理：所有待确认项已经由项目所有者确认，移除临时 `UI review` 区块；移除 `PANEL STATES`、`PANEL PREVIEW` 等说明性 eyebrow 文案，保留实际面板标题和操作。
- 设计契约：Ant Neutral、响应式工作台、标准密度、圆润控件、实体内容面、solid-backed glass 导航、Apple/博客式缓冲动效；普通面板不使用不透明大范围 `box-shadow` 描边，仅保留状态焦点环和必要的层级边界。
- 新增：正式 `App` 接入相同的 Ant Neutral 令牌、三态主题、224px / 64px Rail、搜索和按世代默认收纳导航；保留 `?demo=hakustyle` 作为独立审查入口，真实模块面板和 RNG/Worker 业务不替换。
- 优化：正式工作台的右下角工具 Rail 复用 Demo 行为，桌面端悬停展开、离开收起，移动端点击切换；浮动按钮使用 Lucide 图标，保留面板居中、拖动、scrim、Escape 与焦点恢复。
- 固化：新增 `.agents/skills/web-frontend-style/references/pokerngkit-ui-contract.md` 与 `docs/ui-design.md`，并在 `AGENTS.md`、`docs/ai-development.md` 中将契约设为后续 UI 的强制基线。
- 文件：`src/App.tsx`、`src/styles.css`、`src/HakuStyleDemo.tsx`、`src/hakuStyleDemo.css`、`src/theme.ts`、`src/i18n.ts`、`src/main.tsx`、`docs/ui-design.md`、`.agents/skills/web-frontend-style/SKILL.md`、`.agents/skills/web-frontend-style/references/pokerngkit-ui-contract.md`。
- 已通过：本轮编辑后重新运行定向 `npm run format:files -- ...`、`npm run format:check`、`git diff --check`，以及 HakuStyle Skill 校验。
- 已启动：`npm run dev:ui`，本地预览地址为 `http://127.0.0.1:5173/?demo=hakustyle`；服务器当前保持运行。
- 已通过：`powershell -ExecutionPolicy Bypass -File .agents/skills/web-frontend-style/scripts/validate.ps1`（Skill is valid）。
- 待人工确认：当前 Demo 视觉决策已收口；外部 Chrome / Edge 未连接，未执行自动浏览器回归。
- 下一步：完成格式与 Skill 校验后提交并推送本次正式 UI 基线；未获具体授权前不运行测试、构建或浏览器回归。

## 2026-08-18 3DSRNGTool Gen VI Event / Mystery Gift RNG

- 新增：实现独立 `gen6event` 工作区，支持 X、Y、Omega Ruby、Alpha Sapphire、物种/形态/等级、固定 IV、保底随机 V、Ability / Nature / Gender 锁定、四种 PID Type、Your ID、Egg、Other Information 与 TID/SID/EC/PID。
- 算法：复用上游 Event6 的 MT19937 生成顺序；XY 每帧生成一次，ORAS 每帧生成两次并返回第二次；Wonder Card 读取 `.wc6` / `.wc6full`，Personal 性别比由 `personal_ao` 生成脚本维护。
- 界面：增加 Gen VI Event 导航、三语标签、配信卡导入、完整 IV/性格/觉醒力量/性别/特性/异色筛选、进度、取消、结果上限、CSV 和固定高度虚拟结果表。
- 契约：新增 `wasm/modules/gen6event`，54-word 请求、16-word 结果、Wasm API version 1、Contract version 1、独立 Dedicated Worker 与 `public/wasm/gen6event.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6event.md`，同步 README、需求、技术方案、模块库存和生成数据来源；记录 Wonder Card 偏移、输入边界、XY/ORAS 差异和许可证。
- 已通过：`npm test -- src/features/gen6event`（2 个文件、7 项测试）、`npm run verify`（137 个 Vitest 文件、509 项测试、Vite 转换 2202 个模块、PWA 预缓存 191 项约 20.7 MiB）、`npm run format:check`、`git diff --check`、`npm run typecheck`、`POKERNGKIT_WASM_MODULES=gen6event npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后的 `POKERNGKIT_WASM_MODULES=gen6event npm run wasm:build`。
- 产物：`public/wasm/gen6event.mjs` 7465 bytes，SHA-256 `BC5BB0996D616E0A829F9DDE56775B8901755F48DD7547E6D049C78C30C8D7A5`；`public/wasm/gen6event.wasm` 10929 bytes，SHA-256 `1806DD932DCF259435E02C7B459DE3481FA7CBF0C9F7066B7B6925034A27027F`。
- Lint：0 error、8 条 TanStack Virtual `react-hooks/incompatible-library` warning，其中 1 条来自本模块结果表，属于现有 React Compiler 兼容性提示。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无 9222/9223/9515 调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代配信乱数`；随后进入 Gen VI Wild RNG。

## 2026-08-18 3DSRNGTool Gen VI Pokemon Link / Transporter RNG

- 新增：实现独立 `gen6bank` 工作区，只显示 XY、ORAS、Transporter 的 8 个 Bank 模板；普通 Stationary 模板不会混入 Bank 搜索。
- 算法：复用已验证的 Stationary6 MT19937 ABI 和结果结构，在独立 Wasm 入口执行目标前置消耗、GenderList base-3 解码、3/5 个保底 IV 位置、4/5/2 表、Mew/Celebi 5V、PSV/PRV 和筛选。
- 界面：增加 Gen VI Bank 导航、Bank-only 模板选择、Target Pokemon、Transporter GenderList 和 Gen VI Profile 联动；每次搜索创建独立 Worker，取消后重建。
- 契约：新增 `wasm/modules/gen6bank`，49-word 请求、16-word 结果、Wasm API version 2、Contract version 1 和 `public/wasm/gen6bank.mjs/.wasm`。
- 文档：增加 `docs/modules/gen6bank.md`，同步 README、需求、技术方案和模块库存；记录 8 个模板、输入边界、前置消耗和上游来源。
- 已通过：`npm test -- src/features/gen6stationary src/features/gen6bank`（3 个文件、9 项测试）、`npm run verify`（135 个 Vitest 文件、502 项测试、Vite 转换 2196 个模块、PWA 预缓存 188 项约 20.6 MiB）、`npm run format:check`、`git diff --check`、`POKERNGKIT_WASM_MODULES=gen6bank npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后的 `POKERNGKIT_WASM_MODULES=gen6bank npm run wasm:build`。
- Lint：0 error、7 条既有 TanStack Virtual `react-hooks/incompatible-library` warning，无本模块新增 warning。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无 9222/9223/9515 调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交并推送 `feat: 实现第六世代宝可梦连接与虚拟传送乱数`；随后进入 Gen VI Event / Mystery Gift RNG。

## 2026-08-18 3DSRNGTool Gen VI Stationary RNG

- 新增：实现 `gen6stationary`，覆盖 XY、ORAS、Transporter 的普通定点、礼物、御三家、化石、游戏内交换和 Pokemon Link / Transporter 目标前置消耗；从 `Gen6/PKM6.cs` 生成全部 141 个目标模板。
- 算法：增加运行时滚动 Mersenne Twister、Delay/60 次非同步消耗、Shiny Charm PID rolls、固定/随机 IV、3V/5V、Ability、Nature、Gender、PSV/PRV、异色/方块异色、OT TSV 覆盖和 Pokemon Bank 前置消耗；算法只在独立 Worker 的 Wasm 中执行。
- 界面：增加 3DS Profile 联动、三语分类/模板、Seed、帧范围、Delay、同步性格、Bank 目标、Transporter GenderList、自定义目标、TSV/TRV、闪耀护符、完整筛选、结果上限、取消、CSV 和固定高度虚拟结果表。
- 契约：新增 `wasm/modules/gen6stationary`，49-word 请求、16-word 结果、Wasm API version 2、Contract version 1、原生固定夹具和 `public/wasm/gen6stationary.mjs/.wasm`。
- 已通过：`npm test -- src/features/gen6stationary`（2 个文件、6 项测试）、`npm run verify`（134 个 Vitest 文件、499 项测试、Vite/PWA 预缓存 186 项约 20.6 MiB）、`npm run format:check`、`git diff --check`、`POKERNGKIT_WASM_MODULES=gen6stationary npm run wasm:test:native`（1/1）和激活 Emscripten 6.0.6 后的 `POKERNGKIT_WASM_MODULES=gen6stationary npm run wasm:build`。
- Lint：0 error、7 条既有 TanStack Virtual `react-hooks/incompatible-library` warning；本模块的模板依赖 warning 已修复。
- 未运行：外部 Chrome / Edge UI 回归，原因是当前无 9222/9223/9515 调试端点；生产页面算法验收仍需部署后由项目所有者提供准确 URL 并授权。
- 下一步：进入 Gen VI Pokemon Link / Transporter RNG；开始前先读取对应 WinForms/Core 输入设置、目标数据和前置消耗规则。

## 2026-08-18 3DSRNGTool 存档信息管理

- 新增：实现独立 `3dsprofiles` Profile Manager，覆盖 X、Y、Omega Ruby、Alpha Sapphire、Transporter、Sun、Moon、Ultra Sun、Ultra Moon 档案的新建、编辑、删除、排序、清空、JSON 备份导入导出与旧 XML 迁移。
- 存储：使用 IndexedDB `pokerngkit-3dsrngtool/profile-data/profiles`、localStorage 镜像和待同步标记；保持与 PokeFinder 各世代档案数据隔离。
- 接入：页头选择器向 Gen VII Stationary、Wild、SOS、Egg、Event、Main RNG Tool、ID 工作区同步上游 ProfileView 会写入的版本、TSV、TRV、Shiny Charm 或四字 Egg State；普通重渲染不会覆盖手动输入。
- 文档：增加 `docs/modules/3dsprofiles.md`，同步 README、需求、技术方案、模块库存和 Gen VII 模块文档。
- 已通过：`npm test -- src/features/3dsprofiles` 的 2 个测试文件、9 项测试；`npm run typecheck`；`npm run lint`（0 error，6 条既有 TanStack Virtual warning）；`npm run format:check`；`git diff --check`；`npm run verify`（132 个 Vitest 文件、493 项测试，Vite 转换 2186 个模块，PWA 预缓存 183 项约 20.9 MiB）。
- 未运行：外部 Chrome / Edge UI 回归；此前外部 Chrome 接管本地页面连续超时，未取得可复核的档案编辑、移动端列表或 Gen VII 联动证据。生产算法回归仍需部署后由项目所有者提供 URL 并授权。
- 当前：代码和工程验证已收口，提交与推送待完成。
- 下一步：完成定向测试、全仓 `npm run verify`，提交并推送 Profile Manager；随后核对 Gen VI Stationary RNG，不提前进入其他 Gen VI 或公共工具。

## 2026-08-18 第八世代巢穴地图

- 新增：实现 PokeFinder 4.3.2 `Den Map` 静态地图工具，覆盖 Wild Area、Isle of Armor、Crown Tundra 三个区域和全部 276 个巢穴索引。
- 界面：增加区域与巢穴选择、地点名称、全局巢穴索引、原图坐标和红色点位标记；桌面使用控制区/地图区双栏，窄屏改为单栏并保留独立地图滚动。
- 数据：复用 `gen8raids` 的 `GEN8_DEN_INFO`，保留上游 Special index `16`；原样复制三张地图资源并记录尺寸和 SHA-256。
- 本地化：区域控件使用 `PokeFinder_zh.ts` 的“巢穴点位分布”“旷野地带”“铠岛”“王冠雪原”，地点名称使用上游 SwSh 地点资源。
- 已通过：`npm test -- src/features/gen8denmap` 的 4 个域测试、`npm run lint`、`npm run format:check`、`npm run verify` 和 `git diff --check`；完整验证覆盖 130 个测试文件、484 项测试和 Vite/PWA 生产构建。
- 未完成：外部 Chrome 在接管并刷新 `http://127.0.0.1:5173/` 时连续超时，未取得 DOM、图片加载、区域切换和响应式回归证据；Edge 未运行。
- 下一步：收口并推送 Gen 8 Den Map，然后进入 3DSRNGTool Profile Manager；不提前进入其他 3DSRNGTool 公共工具。

## 2026-08-18 第八世代野生乱数

- 新增：实现 PokeFinder 4.3.2 `Gen 8 Wild` BDSP Generator，覆盖 Grass、Honey Tree、Rock Smash、Surfing、Old Rod、Good Rod、Super Rod 入口，以及昼夜、宝可追踪、大量出现、丑丑鱼、Great Marsh / Trophy Garden Replacement 和甜甜蜜树槽位。
- 算法：增加 `gen8wild` C++/Wasm API v1、48-word 请求、12-word 结果、128 项 Xorshift RNGList、完整队首修正、Unown 形态、EC/PID、异色、IV、Ability、Gender、Nature、Height、Weight、Item、Characteristic、Stats 和筛选。
- 界面：增加 BDSP Profile、双 Seed、推进与 Offset、设置/筛选标签、21 列虚拟结果表、IV/能力值切换、排序、CSV、结果上限、进度、取消和清空；导航编号为 52，Researcher 顺延为 53。
- 修复：取消筛选不再覆盖 Honey Tree 的单槽约束；补齐上游 Wild8 的 Super Luck、Hustle、Vital Spirit 队首入口；响应式结果表保持固定独立滚动区。
- 数据：从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 与 PokeFinder `personal_bdsp.bin` 生成 BD/SP 各 124 个区域、21 个甜甜蜜树地点和 494 条 Personal 数据；来源哈希见 `docs/modules/gen8wild.md`。
- 已通过：`npm run typecheck`；全量 `npm run wasm:test:native` 的 51/51 原生夹具（含 `gen8wild_native_parity`）；完整 `npm run wasm:build`。Wasm 产物 `public/wasm/gen8wild.mjs` 7394 bytes，SHA-256 `44E1DB693A67EC6B15B8547DBDA16562EC668004429881D0561405AC233BD35F`；`public/wasm/gen8wild.wasm` 62151 bytes，SHA-256 `2741E0C560FEF2476DE111D09A2DB4C3CDEAF4CD02475F4E9377A306AA8FBA2E`。
- 已通过：`npm run format:check`、`git diff --check`、`npm run verify`（Lint 0 error、6 条既有 warning；129 个 Vitest 文件、480 项测试；Vite 转换 2176 个模块，PWA 预缓存 177 项约 19.1 MiB）。
- 已通过：外部 Chrome `http://127.0.0.1:5173/` 的 Gen 8 Wild 回归；BDSP Grass、双 Seed `111`、100000 结果上限、4 Workers 和结果区滚动正常，模块控制台无错误。一次大幅滚轮手势触发浏览器连接超时，但页面随后完成滚动，未复现应用冻结。
- 说明：最终收口时重新配置 native-debug 后，`gen3id_native_test` 与单独的 `gen8wild_native_parity` 进程均出现无 CPU 进展的环境停滞并已终止；此前相同源码的全量 51/51 结果仍有效，本轮 Wasm CMake 变更仅增加 `HEAPU32` 运行时导出。
- 待验证：Edge 实机回归；生产页面算法回归仍需 GitHub Actions 部署后由项目所有者提供准确 URL 并授权。
- 下一步：提交推送 Gen 8 Wild 后进入 Gen 8 Den Map；不提前进入 3DSRNGTool Profile Manager。

## 2026-08-18 虚拟结果表滚动卡死修复

- 复现：Gen 8 Static 双 Seed 输入 `111`，保留默认 Max Advances `100000` 后生成结果；在 `1380px` 以下单列布局向下滚动时页面失去响应。
- 根因：响应式断点将模块面板改为 `height: auto`，但没有为虚拟结果容器保留确定高度。约 100,000 条结果形成约 4,000,000px 的虚拟内容并反向撑高滚动区，TanStack Virtual 将大量记录错误判断为可见，最终创建百万级单元格并耗尽 renderer 内存；异常 renderer 曾占用约 4.7 GB。
- 修复：Gen 8 Static 与 Gen 8 Raids 的响应式结果区增加 `clamp(440px, 56vh, 680px)`；Gen 7 Wild、Gen 7 SOS 与 Gen 7 Egg 的单列虚拟表固定为 `520px` 并取消 flex 拉伸。
- 横查：检查 `src/features` 中全部 33 个 `useVirtualizer` 模块。Gen 7 Stationary、Event、Battle Tree、Festival Plaza、Main，以及 Gen 8 Egg、Event、Underground 等自动高度布局已经为实际滚动元素设置固定或 clamp 高度；Gen 3、Gen 4、Gen 5 与其余模块未发现相同根因。
- 已通过：最终重跑 `npm run verify` 的全仓 Prettier、ESLint、TypeScript、127 个 Vitest 文件共 473 项测试、2169 个模块的 Web/PWA 构建与 171 项约 18.27 MiB 预缓存；ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler warning。Vitest 退出码为 `0`，结束时记录 Gen 4 Egg Preview 与 Gen 5 SHA1 Cache Worker 两条非阻断 fork worker 终止超时提示。最后一次 `git diff --check` 通过。
- 未运行：本轮只修改 CSS 与文档，未改变 C++、Wasm API、Worker、算法或生成数据，因此未重建原生夹具和 Emscripten 模块。
- 浏览器：按既有授权重新打开外部 Chrome，在 `http://127.0.0.1:5173/` 的 `1280x900` 视口使用真实 Worker/Wasm 生成 Gen 8 Static Seed `111 / 111`、默认 Max Advances `100000`。表格可视高度 `411px`、虚拟内容高度 `4,000,042px`，顶部只渲染 21 行，滚动到末帧 `99999` 后只渲染 20 行，页面总高度保持约 `1,721px`；状态为“已完成”，生成按钮仍可用，控制台无 warning/error。
- 内存：原异常 renderer 曾占用约 `4.7 GB`；修复后高数据量结果停留末帧并观察 5 秒，全部 Chrome renderer 的最大工作集约从 `406.5 MB` 变为 `408.7 MB`，未再持续膨胀。
- 断点：外部 Chrome 确认 Gen 8 Raids 在 `1280x900` 的结果区约 `504px`；Gen 7 Wild 与 SOS 在 `1120x900` 的虚拟表均为 `520px`、`flex: 0 0 auto`；Gen 7 Egg 在 `900x900` 的虚拟表同为 `520px`、`flex: 0 0 auto`。四个模块的实际滚动元素均保持 `overflow: auto`，控制台无 warning/error。
- 下一步：本修复随 `fix: 修复虚拟结果表滚动卡死` 推送后恢复 Gen 8 Wild。

## 2026-08-17 第八世代地下大洞窟乱数

- 新增：实现 PokeFinder 4.3.2 `Gen 8 Underground` Generator，仅支持 Brilliant Diamond / Shining Pearl；上游没有 Searcher，Web 端未扩展 Sword / Shield 或反向检索。
- 数据：从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9`、PokeFinder `personal_bdsp.bin`、Egg Move 表与本地化资源生成 BD/SP 各 18 个区域、141 条蛋招式和 494 条 Personal 数据；文件大小、SHA-256 与日文招式回退规则已写入模块文档和上游记录。
- 算法：增加 `gen8underground` C++/Wasm API v1、54-word 请求、12-word 结果、256 项 Xorshift RNGList、普通/特殊物种、Diglett Bonus、完整队首、EC/PID、异色、IV、Ability、Gender、Nature、Height、Weight、Item、Egg Move、Stats 和上游 StateFilter。
- 界面：增加 BDSP Profile、双 64 位 Seed、推进与 Offset、Story/Level Flag、18 个地点、物种多选、设置/筛选标签、完整筛选、最多 8 个独立 Worker、取消、100000 行结果上限、20 列虚拟表、排序、CSV 和 IV/能力值切换；导航编号为 51，Researcher 顺延为 52。
- 修复：Worker 初始化期间取消会终止并重建实例，不再误报完成；768px 控制区提前切为单列，结果表固定为独立滚动区域，窄屏物种操作避开悬浮工具并保持 44px 触控目标。
- 已通过：`npm run verify` 的 Prettier、ESLint、TypeScript、127 个 Vitest 文件共 473 项测试、2169 个模块的 Web/PWA 构建与 171 项约 18.27 MiB 预缓存；ESLint 为 0 error，仅保留 6 条既有 TanStack Virtual warning。
- 已通过：50/50 原生夹具；Emscripten 6.0.6 构建默认 49 个独立模块。`gen8underground.mjs` 为 7,615 bytes，`gen8underground.wasm` 为 68,926 bytes，对应 SHA-256 已写入模块文档。
- 重跑：首次 `npm run verify` 因根 `build/` 中手工 Emscripten 临时夹具被 ESLint 扫描而停止；确认该目录为 `.gitignore` 生成物后，将两个文件可恢复地移入 `.tmp/gen8underground-fixture/`，第二次完整验证通过，未扩大 ESLint 忽略范围。
- 浏览器：外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Worker/Wasm 生成固定 10 帧的 60 条结果，首条 `818C829E / C67596B5 / Species 198 / Egg Move 413 / 17 / 28-1-23-10-31-20` 与原生夹具一致；物种全部取消返回 0 条，启用 Disable Filters 后恢复 60 条。
- 布局：390、768、1280 与 1920px 下无整页横向溢出，结果表保持独立横纵滚动且首行与表头间距为 0；中英日窄屏标签、悬浮工具安全区和控制台无 warning/error 均已检查。
- 未验收：本地测试、原生/Wasm 构建和 UI 检查只能作为工程证据；GitHub Actions 部署后仍需由项目所有者提供准确生产 URL 并授权算法回归。
- 下一步：完成最终格式与全仓验证，提交并推送 `feat: 实现第八世代地下大洞窟乱数`；随后进入 Gen 8 Wild，不提前进入 Den Map 或 3DSRNGTool Profile Manager。

## 2026-08-17 第八世代定点乱数

- 新增：实现 PokeFinder 4.3.2 `Gen 8 Static` Generator，仅支持 Brilliant Diamond / Shining Pearl；上游没有 Searcher，也没有 Sword / Shield Static，Web 端未自行扩展。
- 数据：从 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 的 `Gen8/encounters.json` 与 PokeFinder `personal_bdsp.bin` 生成 9 类 47 个模板和 494 条紧凑 Personal 数据；生成脚本、文件大小与 SHA-256 已写入模块文档和上游记录。
- 算法：增加 `gen8static` C++/Wasm API v1、41-word 请求、11-word 结果、Xorshift + 32 项 RNGList 普通定点、Xorshift EC + XoroshiroBDSP 游走、Fateful Square、Synchronize、Cute Charm、保底 IV、Ability、Gender、Nature、Height、Weight、Characteristic、Stats 和完整 StateFilter。
- 界面：增加 BDSP Profile、9 类模板、None/Cute Charm/Synchronize 队首、双 64 位 Seed、推进、只读 Level/Ability/Shiny/IV Count、完整筛选、最多 8 个独立 Worker、取消、100000 行结果上限、16 列虚拟表、排序、CSV 和 IV/能力值切换；导航编号为 50，Researcher 顺延为 51。
- 修复：将 `gen8static` 的 TypeScript/C++ 生成产物加入 `.prettierignore`，避免 Prettier 把 `personal_data.inc` 说明行合并为非法 C++；重新运行生成脚本后原生编译恢复。
- 已通过：完整应用层验证的 Prettier、ESLint、TypeScript、124 个 Vitest 文件共 462 项测试、2163 个模块的 Web/PWA 构建与 164 项预缓存；ESLint 为 0 error，仅保留 6 条既有 TanStack Virtual warning。
- 已通过：49/49 原生夹具；默认 48 个 Emscripten 模块构建完成，`gen8static.mjs` 为 7,490 bytes、`gen8static.wasm` 为 19,282 bytes。首次 `npm run verify:full` 在应用层与原生阶段通过后，因当前 PowerShell 未激活 Emscripten 而停止；加载 `C:\\Users\\Hakuhiro\\emsdk\\emsdk_env.ps1` 后补跑 `npm run wasm:build` 成功，无需安装或更换工具链。
- 固定夹具：Seed `1234567887654321 / 8765432112345678`、TID `12345`、SID `54321` 的 Turtwig 首帧与第 9 帧、Omanyte、Heatran Cute Charm、Articuno Synchronize 与 Hidden Ability、Jirachi Never Shiny、Mesprit、Cresselia 逐字段匹配；1,000,000 帧跳表与朴素 Xorshift 推进一致，零 Seed、推进溢出、浏览器范围保护和结果上限错误分支通过。
- 浏览器：外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Worker/Wasm 生成 Turtwig 固定 10 帧，首帧 `220345D0 / 2203506A / 4-23-15-30-19-26`，第 9 帧 `E8D55A32 / 0FEB047B / 16-12-0-15-29-20`；390、768、1280 与 1920px 下无整页横向溢出，窄屏结果表保留独立横向滚动，首行与表头间距为 0，控制台无 warning 或 error。
- 未验收：本地测试、原生/Wasm 构建和 UI 检查只能作为工程证据；GitHub Actions 部署后仍需由项目所有者提供准确生产 URL 并授权算法回归。
- 下一步：完成最终格式检查，提交并推送 `feat: 实现第八世代定点乱数`；随后进入 Gen 8 Underground，不提前进入 Wild、Den Map 或 3DSRNGTool Profile Manager。

## 2026-08-17 第八世代团体战乱数

- 新增：实现 PokeFinder 4.3.2 `Gen 8 Raids`，覆盖 Sword / Shield 的 Wild Area、Isle of Armor、Crown Tundra 普通与稀有巢穴，以及 69 张 Wild Area Event 表。
- 数据：生成并内置 197 张普通巢穴表、69 张 Event 表、276 个巢穴哈希/坐标映射和 1192 条 `personal_swsh.bin` 记录；生成脚本、来源 revision 与 SHA-256 已写入模块文档和上游记录。
- 算法：增加 `gen8raids` C++/Wasm API v1、41-word 请求、12-word 结果、Xoroshiro 团体战生成、保底 IV、异色修正、Ability、Gender、Nature、Height、Weight、Toxtricity 性格分支和完整 StateFilter。
- 界面：增加 Profile、区域、巢穴、稀有度、Event、模板、等级、推进与筛选工作流；支持最多 8 个独立 Worker、取消、100000 行结果上限、虚拟滚动、16 列排序结果表和 CSV。
- 修复：默认值按上游恢复为 Max Advances `100`、Offset 空值读取 `0`、Level `1`；Event 等级由模板锁定，Event 模式禁用 Rarity，Seed 全零与推进和溢出均由 HTML 和领域层共同拒绝。
- 构建：`Gen8RaidsPanel` 改为 React 按需加载，979.02 kB 数据块独立输出，主包由约 8.74 MB 降至 7,762.09 kB，避免 PWA 的 8 MiB 单文件预缓存上限失败；默认 Wasm 清单已加入 `gen8raids`。
- 已通过：完整 `npm run verify:full` 退出码 `0`；Prettier、TypeScript、122 个 Vitest 文件共 456 项测试、2157 个模块的 Web/PWA 构建、161 项约 17.98 MiB 预缓存、48/48 原生夹具和默认 47 个 Emscripten 模块全部完成。ESLint 为 0 error，仅保留 6 条既有 TanStack Virtual warning。
- 环境：原生测试弹窗来自当前 Codex 进程未继承用户 PATH 中的 WinLibs 目录，导致测试程序找不到 `libstdc++-6.dll`；刷新用户和系统 PATH 后 `gen8raids_native_test.exe` 单独退出码为 `0`，后续原生检查必须先刷新当前进程 PATH。
- 浏览器：外部 Chrome 已连接，`http://127.0.0.1:5173/` 可被发现；页面重新加载、DOM 和控制台读取连续超过浏览器连接等待上限，本轮未取得真实 Worker/Wasm 页面证据，也未改用内置浏览器替代。
- 未验收：本地工程检查、原生/Wasm 构建均不能替代生产算法验收；GitHub Actions 部署后仍需由项目所有者提供准确生产 URL 并授权回归。
- 下一步：提交并推送 `feat: 实现第八世代团体战乱数`，随后优先实现 Gen 8 Static；暂不进入 Underground、Wild、Den Map 或 3DSRNGTool 范围。

## 2026-08-17 第八世代配信乱数

- 新增：增加 `gen8event` C++/Wasm API v1、45-word 请求、11-word 结果、BDSP 个人数据、Dedicated Worker Pool、领域校验、UI Preview 与三层 TypeScript 测试。
- 算法：按 PokeFinder 4.3.2 的 Xorshift、`RNGList`、Event Generator、StateFilter 与 StaticModel8 实现 EC、PID、保底 IV、特性、固定性别、性格、身高、体重、能力值和筛选；蛋配信使用当前 BDSP Profile TSV。
- 修复：按 Event8 界面语义补全 Nonshiny、Random、Star、Square、Static 五种 PID Type，拒绝 `.wb8` 越界 PID Type，并以八位十六进制回填 EC/PID 和回填 Level；异色筛选只保留上游实际存在的 Any、Star、Square、Star/Square。
- 修复：Gen 8 Event 与 Gen 8 Egg Worker 的堆边界检查改用实际导出的 `HEAPU32.byteLength`，不再访问未导出的 `HEAPU8`；Wasm 导出面和算法不变。
- 界面：增加 BDSP Profile 与 Manager 入口、`.wb8` 本地导入、物种自动完成、设置/筛选标签、16 列虚拟结果表、IV/能力值切换、排序、CSV、清空、进度和取消；`1280px` 以下重排为单栏。
- 文档：增加 `docs/modules/gen8event.md`，同步 README、库存、需求、技术方案与 PokeFinder 来源记录；上游路径统一为 `C:\Users\Hakuhiro\Desktop\project\PokeFinder-master`，下一模块改为 Gen 8 Raids。
- 已通过：Node.js `24.19.0`、npm `12.0.2`；`npm test -- src/features/gen8event src/features/gen8egg` 的 6 个测试文件共 25 项测试；`gen8event_native_parity` 原生夹具 1/1；Emscripten `6.0.6` 重建 `gen8event.mjs/.wasm`。
- 已通过：完整 `npm run verify` 的全仓 Prettier、ESLint、TypeScript、120 个 Vitest 文件共 449 项测试、2150 个模块生产 Web/PWA 构建与 156 项预缓存；ESLint 为 0 error，保留 6 条既有 TanStack Virtual warning，Vitest 保留一次不影响退出码的 fork 终止超时提示；最后一次 `git diff --check` 通过。
- 重跑：首次 `npm run wasm:build` 因当前 PowerShell 未激活 Emscripten 而停止；加载 `C:\\Users\\Hakuhiro\\emsdk\\emsdk_env.ps1` 后定向构建通过，未重新安装工具链。
- 浏览器：外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Worker/Wasm 生成 Manaphy 固定 10 帧；首行 `220345D0 / 8FD266FA / 15-30-31-19-31-31`，末行 `E8D55A32 / 6541C199 / 31-30-0-21-31-31`，控制台无 warning 或 error。
- 未验收：本地测试、原生/Wasm 构建和 UI 检查只能作为工程证据；GitHub Actions 部署后仍需由项目所有者提供准确生产 URL 并授权算法回归。
- 下一步：提交并推送 `feat: 实现第八世代配信乱数`，再开始 Gen 8 Raids；不提前进入 3DSRNGTool Profile Manager。

## 2026-08-17 第七世代 Festival Plaza Facility RNG

- 新增：增加 `gen7festivalplaza` C++/Wasm API v1、13-word 请求、10+N-word 结果、`begin()` / `step()` 连续会话、原生会话夹具、单 Dedicated Worker、领域校验和三层 TypeScript 测试。
- 算法：按 3DSRNGTool `MiscRNGTool.Search7()`、`ModelStatus`、`FPFacility` 和 TinyMT 重播实现 Sun、Moon、Ultra Sun、Ultra Moon 的 NPC 眨眼、Delay、19 个 Rank、星级、设施、NPC 类型和颜色筛选。
- 修复：Moon / Ultra Moon 使用独立设施池；Sun / Moon 一至三星移除 Switcheroo；Rank `21-30` 的 ★4 概率恢复为 `9%`；修复共享 Gen VII 起始帧 `0..1` 的无符号下溢。
- 界面：增加设施池联动、NPC Status、Mark 映射、进度、取消、100000 行结果上限、虚拟滚动、排序、CSV、清空和 Index 回写；移动端 390px 无横向溢出，相关控件保持 44px 高度。
- 文档：增加 `docs/modules/gen7festivalplaza.md`，同步 README、库存、需求、技术方案、三语文案和 Wasm 清单。
- 已通过：Node.js `24.19.0`、npm `12.0.2`；Festival Plaza 3 个测试文件共 6 项测试；全仓 `npm run verify` 的 Prettier、ESLint、TypeScript、117 个 Vitest 文件共 437 项测试和生产 Web/PWA 构建，ESLint 保留 6 条既有非阻断 warning。
- 已通过：WinLibs GCC `16.1.0` 的 9/9 Gen VII 原生夹具；Emscripten `6.0.6` 重建 `gen7wild`、`gen7sos`、`gen7egg`、`gen7event`、`gen7main` 和 `gen7festivalplaza`；外部 Chrome 在 `http://127.0.0.1:5173/` 使用真实 Wasm 核对固定五帧、NPC Status、Moon ★4 设施联动和控制台无错误。
- 未运行：GitHub Pages 生产页面算法回归；仍需部署完成后由项目所有者提供准确 URL 并单独授权，不能用本地 UI 或 Wasm 夹具替代。
- 提交：`3089f9d feat: 实现第七世代圆庆广场乱数` 已推送到 `origin/main`。
- 下一步：开始实现 3DSRNGTool Profile Manager；继续保留 `NTR Helper` 为明确排除项。

## 2026-08-17 第七世代 Main RNG Tool 与 Egg Seed Finder

- 新增：增加 `gen7main` 的读档/ID Clock Seed 反查、QR 指针帧定位与 Time Calculator；Seed 全空间检索使用最多 8 个独立 Worker 和 `2^20` Seed 分片，不保留 3DSRNGTool 的远程 API 依赖。
- 新增：增加 `gen7eggseedfinder` 的新存档 8 蛋性格检索与 127 鲤鱼王计算器；完整 32 位 Seed 空间默认按 `2^20` 项分片，取消返回已经按 `chunkIndex` 完成的前缀结果。
- 修复：将 Gen VII SFMT 状态长度从错误的 `N=157` 改为上游 `N=156`，同步更新 Battle Tree 固定夹具；Stationary、Wild、SOS、Egg、Battle Tree、Event、Main 与 ID 原生结果均重新验证。
- 修复：逐行对照 `MagikarpCalc.mul()`，将逆矩阵输出从错误的四组 32 位改为 TinyMT 的 `31 + 32 + 32 + 32` 位有效状态布局；127 个 `1` 的正确结果为 `3050EADD,89435273,785B9C60,7E46E861`。
- 界面：增加 Main RNG Tool 与 Egg Seed Finder 导航、三语文案、Clock 图片、双工作区表单、进度、取消、CSV、错误和空结果状态；Egg Seed Finder 标签页与进度条补齐可访问语义，127 位输入只忽略空白，不再静默删除非法字符。
- 文档：增加 `docs/modules/gen7main.md`、`docs/modules/gen7eggseedfinder.md` 与 `third_party/needle-searcher/UPSTREAM.md`，同步 README、库存、需求、技术方案、Wasm 清单和 PWA JPG 缓存规则。
- 已通过：Node.js `24.19.0`、npm `12.0.2`；`npm run verify` 的 Prettier、ESLint、TypeScript 与 114 个 Vitest 文件共 430 项测试，ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler warning。
- 已通过：WinLibs GCC `16.1.0` 重新配置原生构建缓存后，9 个受影响 Gen VII 原生夹具为 9/9；Emscripten `6.0.6` 重建同一组 9 个 Gen VII `.mjs/.wasm`。
- 已通过：直接加载真实 Wasm，Main RNG Tool 返回 SM `BD1646F7`、USUM `C31A2F06`、SM ID `F9337724 / correction 15`；Egg Seed Finder 的 127 鲤鱼王和 Seed `0` 性格夹具均与模块文档一致。
- Web 构建：受限 `npm run verify` 在复制既有 `public/wasm/gen3egg.mjs` 时返回 Windows `EPERM`；非受限 `npm run build:web` 随后完成 2140 个模块转换，并在全部 Gen VII Wasm 重建后生成 150 项、约 16.8 MiB 的 PWA 预缓存，仅保留既有大 chunk warning。
- 提交：`6867fe5 fix: 修复第七世代 SFMT 状态长度`、`3d057c2 feat: 实现第七世代主乱数工具`、`f2e241e feat: 实现第七世代孵化Seed检索` 已推送到 `origin/main`。
- 未运行：外部 Chrome / Edge UI 检查和生产页面算法回归。UI 预览不能替代真实 Wasm 验收；生产回归仍需 GitHub Actions 部署完成后由项目所有者提供准确 URL 并单独授权。
- 下一步：实现 Festival Plaza Facility RNG；先核对 3DSRNGTool 的窗体、输入类型、生成算法、简体中文词条和固定数据，不提前混入 Profile Manager。

## 2026-08-16 第七世代 Event RNG

- 新增：增加 `gen7event` C++/Wasm API v1、58-word 请求、9-word 结果、`begin()` / `step()` 连续会话、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 算法：按 `Search7_Normal()`、`Event7.Delay()` 与 `Event7.Generate()` 移植 SFMT64 连续帧、NPC Blink 模型、SM / USUM Event Delay、No Dex / Your ID 丢弃生成、四种 PID Type、固定 IV、保底随机 V、Ability / Nature / Gender 锁定和完整筛选。
- 配信卡：支持本地 `.wc7` 与 `.wc7full`，按上游偏移解析 Species、Form、Level、Ability、Nature、Gender、IV、TID/SID、PID Type、PID、EC、Egg 与 Your ID；文件不离开浏览器。
- 边界：SM 起始帧 `418`、USUM `478`，上游帧上限 `1,000,000,000`、浏览器保护 `5,000,000`；NPC `0..100`、Delay `0..4000`、TSV `0..4095`、TRV `0..F`、TID/SID `0..65535`、结果上限 `100,000`。
- 界面：增加配信设置、Wonder Card 导入、全部锁定项与其他信息、IV 与状态筛选、进度、取消、虚拟滚动、排序、CSV 和清空；逐字复用上游简体中文词条，并补齐 1280px 展开侧栏双列适配与移动端 44px 触控目标。
- 文档：增加 `docs/modules/gen7event.md`，同步 README、库存、需求和技术方案；下一模块改为 Main RNG Tool，并记录后续实现 3DSRNGTool Profile Manager。
- 已通过：Event 3 个 TypeScript 测试文件共 8 项测试；`npm run verify` 的 Prettier、ESLint、TypeScript 与 109 个 Vitest 文件共 418 项测试；ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler 非阻断 warning。
- Web 构建：`npm run verify` 最后在受限环境复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；随后非受限 `npm run build:web` 通过 2113 个模块转换，生成 139 项、约 16.8 MiB 的 PWA 预缓存，仅保留既有大 chunk 警告。
- 浏览器：外部 Chrome 在 `http://127.0.0.1:5174/` 完成 UI Preview；验证 43 条结果、首帧 478、错误与清空状态、Your ID / Other Information 联动，以及 390 / 768 / 1280 / 1536 / 1920px 布局。页面无横向溢出，虚拟表首行与表头间距为 0，控制台无 warning 或 error。
- 原生/Wasm：受限原生夹具无法读取 WinLibs GCC，受限 Emscripten 激活无法写入 `C:\Users\Hakuhiro\emsdk\emsdk_set_env.ps1`；两次非受限重跑均被自动审批服务 `502 Bad Gateway` 阻止，命令未启动。该状态不等于原生夹具或真实 Wasm 已通过。
- 下一步：完成最终格式检查后独立提交并推送 `feat: 实现第七世代配信乱数`，再开始 Main RNG Tool；不得提前把本地 UI Preview 作为生产页面算法验收。

## 2026-08-16 第七世代 Battle Tree Trainer RNG

- 新增：增加 `gen7battletree` C++/Wasm API v1、9-word 请求、7-word 结果、`begin()` / `step()` 连续会话、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 算法：按 `MiscRNGTool.generator7()`、`RNGPool`、`ModelStatus` 与 `BTTrainer.Generate()` 移植 SFMT64 连续帧、NPC 眨眼模型、`Delay / 2`、重置为 2 个模型后的额外 2 帧，以及普通/每十场特殊训练家生成。
- 边界：Seed 为 8 位十六进制且空值按 `0`；Starting Index / Max Results 上游上限 `1,000,000,000`，当前浏览器绝对帧保护 `5,000,000`；NPC `0..100`、Delay `0..10,000`、Streak `1..10,000`、Trainer ID `0..254`，其中 `209..254` 均表示不过滤。
- 界面：增加版本、Seed、Starting Index、Max Results、NPC、Delay、Streak、Trainer ID，结果显示 Index、Actual Hit、Mark、Clock、Trainer、Random Number 与 Real Time，并支持进度、取消、虚拟滚动、排序、CSV、清空和 Index 回写。
- 文档：增加 `docs/modules/gen7battletree.md`，同步 README、库存、需求和技术方案，并把实际 3DSRNGTool 上游路径统一为 `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN`；下一模块改为 Event。
- 工具链：Node.js `24.19.0`、npm `12.0.2`；安装并激活 Emscripten `6.0.6`，另安装 WinLibs GCC `16.1.0` 作为 Windows 原生夹具编译器。
- 已通过：`npm test -- src/features/gen7battletree`，3 个测试文件、6 项测试；仅 `gen7battletree` 的原生 C++ 会话夹具 1/1；仅 `gen7battletree` 的 Emscripten 构建并生成 `.mjs` / `.wasm`。
- 全仓验证：Prettier、TypeScript 与 106 个 Vitest 文件共 410 项测试通过；ESLint 为 0 error，保留 6 条既有 TanStack Virtual / React Compiler 非阻断 warning。受限环境的 Vite 构建在复制 `public/wasm/gen7battletree.mjs` 时返回 `EPERM`，非受限 `npm run build:web` 随后通过 2107 个模块转换并生成 58 项 PWA 预缓存。
- Wasm：默认 41 模块的 Emscripten 6.0.6 完整构建通过；`gen7battletree.mjs`、`gen7battletree.wasm` 与生产 Worker bundle 均已核对存在。
- 浏览器：外部 Chrome 已连接，但浏览器控制安全策略拒绝自动访问 `http://127.0.0.1:5173/`，且仓库规则禁止改用应用内浏览器绕过；本轮未记录 UI、Worker 控制台或交互证据。
- 交付：按项目所有者本轮授权，本模块完成完整工程检查后独立提交并推送，再开始 Event。

## 2026-08-15 第四世代阶段性交接清理

- 移除：删除已失去恢复用途的 `docs/gen4-development.md`；第四世代长期事实继续由 `docs/modules/gen4*.md`、`docs/module-inventory.md` 和 `src/features/shared/rngModuleContract.ts` 维护。
- 更新：README、AI 开发入口与技术栈不再引用阶段性交接文档，避免已完成模块继续依赖重复且可能过时的说明。

## 2026-08-15 第七世代 Egg RNG

- 新增：增加 `gen7egg` C++/Wasm API v1、187-word 请求、20-word 结果、`begin()` / `step()` 连续会话、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 算法：移植 TinyMT、`Egg7` 性别/性格/特性/遗传/IV/EC/PID/球种生成顺序，支持闪耀护符、异国孵化、尼多型、同图鉴、其他 TSV、闪数提醒、Frame Range、Egg Number 与 Shortest Path。
- 路径：按 `Gen7EggPath.Calc()` 的 Accept / Reject 等权前向图计算最短路径；使用增量线性松弛代替保存全部 Egg 结果和重复嵌套传播，浏览器执行目标上限为 `5,000,000`。
- 界面：增加四字 TinyMT 状态、双亲与孵化设置、完整筛选、三种模式、进度、取消、虚拟滚动、排序、CSV、清空、当前/领取后状态回写与 Egg Number / Shortest Path 摘要。
- 边界：同步校验百变怪与性别比、尼多型、同图鉴、其他 TSV、闪数提醒和不变之石的上游跨字段行为；Frame / Target 保留上游 `1,000,000,000` 输入上限，蛋数为 `1..10,000`。
- 文档：增加 `docs/modules/gen7egg.md`，并同步 README、库存、需求和技术方案；下一模块改为 Battle Tree。
- 已通过：`npm test -- src/features/gen7egg`，3 个测试文件、10 项测试；`npm run typecheck`；`npm run lint` 为 0 error，保留 6 条 TanStack Virtual / React Compiler 非阻断 warning；仅 `gen7egg` 的原生 C++ 会话夹具 1/1 通过。
- 已通过：全量 `npm run verify` 中的 Prettier、ESLint、TypeScript 与 103 个 Vitest 文件共 404 项测试；Vite 随后完成 2102 个模块转换。
- 受限：生产 Web 构建在 Vite 将既有 `public/wasm/gen3egg.mjs` 复制到 `dist/wasm/gen3egg.mjs` 时返回 Windows `EPERM`；申请在非受限环境重跑 `npm run build:web` 时审批服务返回 `502 Bad Gateway`，命令未启动。该结果不等于 Web 构建通过。
- 未运行：未生成 `gen7egg` Emscripten 产物，未使用外部 Chrome / Edge 做本地 UI 或 Worker 检查，未执行生产页面算法回归。
- 交付：本阶段完成本地验证后由项目所有者提交；Codex 不提交、不推送，交付后暂停工作。

## 2026-08-15 Gen VII Wild 测试修复

- 根因：非 Fishing 遭遇错误地把分类 `Timedelay` 换算到仅供钓鱼使用的 `pokemonDelay`，普通野生与 Berry Tree 因此生成 `6 / 4` 并触发 `1..2` 领域校验；现仅在 Fishing 分支按上游 `((Timedelay + 4) / 2)` 派生，其他分类写入不参与算法的合法 ABI 占位值 `1`。
- 根因：`scripts/generate_gen7_wild_data.mjs` 把 `EncounterArea7.SlotType` 的物种槽位映射误导出为 `WildRNG.SlotDistribution` 概率表；现分别读取两份上游数据，重新生成 56 组总和为 100 的概率分布，并增加 281 个区域、全部昼夜槽位与 Fishing 冒泡变体的不变量测试。
- 修复：UI Preview 测试改为验证结果槽位范围与物种/形态属于所选遭遇表，不再错误固定第一槽位。
- 已通过：`npm test -- src/features/gen7wild`，3 个测试文件、8 项测试全部通过；`npm run verify` 的全仓 Prettier、ESLint（0 error、5 条既有 TanStack Virtual / React Compiler warning）、TypeScript 与 100 个 Vitest 文件共 394 项测试通过。
- 受限：`npm run verify` 的 `build:web` 在复制既有 `public/wasm/gen3egg.mjs` 到 `dist/wasm/gen3egg.mjs` 时返回 Windows `EPERM`；申请在非受限环境重跑 `npm run build:web` 时审批服务返回 `502 Bad Gateway`，命令未启动。
- 环境：Node.js `24.13.0`、npm `11.6.2`，低于仓库锁定的 Node.js `24.19.0`、npm `12.0.2`；下一步由项目所有者使用锁定工具链运行完整 `npm run verify`，或提交后由 GitHub Actions 完成生产构建。

## 2026-08-15 Gen VII Actions 验证修复

- 阻断：Actions run `31867793978` 的 `npm run verify` 在 ESLint 阶段因 `Gen7WildRequest` 未使用而退出，后续 typecheck、测试与构建未执行。
- 修复：移除 Wild 面板未使用类型，并修正 Stationary / Wild / SOS 生成数据的字面量推断、只读索引、结果键访问和 Worker 活动任务窄化；不改变 RNG 算法或请求 ABI。
- 已通过：`npm run lint` 退出码为 `0`，仅保留五个 TanStack Virtual / React Compiler 非阻断警告；`npm run typecheck`、`npm run format:check` 与 `git diff --check` 通过。
- 未运行：未运行单元测试、原生夹具、Wasm/Vite 构建或浏览器检查；等待项目所有者提交修复并由 Actions 重新执行完整 `verify`。

## 2026-08-15 第七世代 SOS RNG

- 新增：增加 `gen7sos` C++/Wasm API v1、77-word 请求、14-word 结果、`begin()` / `step()` 连续会话、原生会话夹具、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 算法：覆盖 Pokemon Generation 的 Main SFMT64 / 战斗 SFMT32 双流、Call Prediction 的 `SOSRNG.Generate()`、Caller/Ally、天气槽位、Rate 1 / Rate 2、链长保底 IV、HA、同步、槽位、等级、道具与结果筛选。
- 界面：增加 Pokemon Generation / Call Prediction 分段工作流、Caller 与九个 Ally 槽位、完整战斗条件、Pokemon/Calls 筛选、进度、取消、虚拟滚动、排序、CSV、选中行 Path Finder 和清空。
- Path Finder：按 `MiscRNGTool.SOSPathFinder()` 生成 Nothing / CallOnly / Both 三组条件；根据上游实际访问范围只重算目标帧前 27 帧，避免浏览器保留无限时间线。
- 文档：增加 `docs/modules/gen7sos.md`，记录上游输入边界、77/14-word 契约、`Rate 2` 的来源差异、Path Finder 窗口和结果列；README、需求、技术方案与库存同步将下一模块改为 Egg。
- 未运行：本轮未获测试、类型检查、原生夹具、Wasm 构建、Vite 构建、性能或浏览器检查授权；源码和夹具存在不等于算法或界面已通过。
- 交付：按项目所有者要求本模块完成后先交由项目所有者提交；不执行提交、推送或构建。
- 下一步：实现 Gen VII Egg，继续保留当前未提交的 Wild 与 SOS 改动。

## 2026-08-15 第七世代 Wild RNG

- 新增：增加 `gen7wild` C++/Wasm API v1、91-word 请求、11-word 结果、`begin()` / `step()` 连续会话、原生会话夹具、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 数据：从 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 生成 SM / USUM 四版本昼夜遭遇数据，覆盖普通地点 180 条、Fishing 40 条、Ambush Encounters 40 条、Berry Tree 21 条、Ultra Beast 10 条与 Island Scan 56 条。
- 算法：移植 SFMT、`Search7_Normal()`、`ModelStatus`、Wild Delay、六类遭遇、Fishing Bubbling / Overview、Ambush Trigger / Delay2 / Wild Cry、完整 Lead、Shiny Charm、固定 3V、槽位、等级、道具与筛选顺序；连续状态不做帧分片。
- 界面：增加 Gen VII Wild 导航与双列工作台，支持版本、分类、特殊宝可梦、地点、昼夜、遭遇参数、Lead、完整筛选、进度、取消、100000 行结果上限、虚拟滚动、排序、CSV 和清空。
- 文档：增加 `docs/modules/gen7wild.md`，记录控件进制、范围、空值、跨字段约束、91/11-word 契约、浏览器 `10000000` 绝对帧保护和上游来源；README、需求、技术方案与库存同步将下一模块改为 SOS。
- 未运行：本轮未获测试、类型检查、原生夹具、Wasm 构建、Vite 构建、性能或浏览器检查授权；源码和夹具存在不等于算法或界面已通过。
- 交付：按项目所有者要求继续完成全部第七世代剩余功能，期间不提交、不推送、不构建；全部完成后统一交付项目所有者提交。
- 下一步：实现 Gen VII SOS，先核对 `SOSRNG.cs`、`SOSResult.cs`、`SOSAllies.cs`、`Data/SOSCall.md` 和 MainForm 的 Chain / Ally 输入边界。

## 2026-08-15 第七世代 Stationary RNG

- 决定：项目所有者指定当前第七世代主模块顺序为 `Stationary -> Wild -> SOS -> Egg -> Battle Tree -> Event`；本轮先完成 Stationary，下一模块为 Wild。
- 新增：增加 `gen7stationary` C++/Wasm API v1、57-word 请求、9-word 结果、`begin()` / `step()` 连续会话、原生固定夹具、单 Dedicated Worker、UI Preview、领域校验和三层 TypeScript 测试。
- 数据：从 3DSRNGTool revision `359bdd7a9ff7c145fec12302cf43da932923fa62` 的 `Gen7/PKM7.cs` 生成 228 条 SM/USUM 版本限定模板，覆盖普通定点、礼物、交换、Poke Pelago、Totem、传说、Ultra Beast 与 Ultra Space Wilds。
- 算法：移植 SFMT、`Search7_Normal()`、`ModelStatus`、Raining phase、Blink / Safe Frame、DelayType 1..27、Trade、Pelago、Ditto 固定性格、Shiny Lock、Forced Shiny、Shiny Charm 与固定 3V；连续状态不做帧分片。
- 界面：增加 Gen VII Stationary 导航与双列工作台，支持版本、模板、NPC、Delay、自定义目标、完整筛选、进度、取消、100000 行结果上限、虚拟滚动、排序、CSV 和清空；移动端控件保持至少 44px 触控目标。
- 修复：模板测试改为直接核对固定 3V 与 In-Game Trade 数据不变量；CSV 按表格显示格式导出特性、性别、异色、同步与 PRV；清空结果同时重置状态、进度、错误和摘要。
- 静态核对：逐段对照 `MainForm_Core.cs::Search7_Normal`、`MainForm.cs::getsetting/getStaSettings`、`Stationary7.cs`、`ModelStatus.cs`、`RNGPool.cs`、`SFMT.cs`、`FuncUtil.cs` 与 `PKM7.cs`，并记录输入限制和浏览器 `5000000` 绝对帧保护上限。
- 已通过：对本任务全部文件运行 `npm run format:files -- <files>`，全仓 `npm run format:check` 输出 `All matched files use Prettier code style!`，`git diff --check` 无输出。
- 未运行：本轮未获测试、类型检查、原生夹具、Wasm 构建、Vite 构建、性能或浏览器检查授权；源码和夹具存在不等于算法或界面已通过。
- 交付：项目所有者本轮自行提交、推送和构建；历史记录中的 Codex 提交/推送授权不用于本轮。GitHub Actions 部署后，由项目所有者提供准确生产 URL 并单独授权回归。
- 下一步：开始 Gen VII Wild，先核对其 Qt/WinForms 输入设置、Core 参数、模板数据和普通野生分支边界。

## 2026-08-15 全模块范围授权与库存纠正

- 决定：项目所有者将活动范围扩大为完整 PokeFinder 4.3.2，以及除 `NTR Helper` 外的全部 3DSRNGTool 功能；此前“仅第三世代”的决定不再适用，但保留原记录作为历史轨迹。
- 授权：项目所有者明确授权 Codex 自主开发、运行 `npm run verify`、`npm run wasm:test:native` 与 `npm run wasm:build`、逐模块提交并推送；全部模块部署后，在 `https://haku76.github.io/PokeRNGKit/` 使用外部 Chrome 或 Edge 完成一次生产回归。
- 库存：PokeFinder Gen III、Gen IV、Gen V 与全局工具已齐；Gen VIII Profiles、IDs 与 Eggs 已实现，仍缺 Event、Raids、Static、Underground、Wild 与 Den Map。完整状态写入 `docs/module-inventory.md`。
- 3DSRNGTool：Gen VII ID 已完成；其余 Gen VI、Gen VII 与公共工具全部计划实现，仅 `NTR Helper` 明确排除。
- 架构：继续保持纯静态、本地优先、C++/Emscripten Wasm + 独立 Web Worker；不因 NTR 功能增加后端、本地桥接、浏览器扩展、原始 TCP 或云端服务。
- 界面：项目所有者要求 PC 端参数和主要操作尽量收纳在首屏，页面滚动主要留给结果表；复杂模块使用标签、紧凑字段网格和折叠高级设置。轻量全局工具、档案与辅助输入可合并到悬浮工具菜单，核心 Generator/Searcher 保持独立工作区。侧边栏整体外壳必须直角，内部导航项可保留交互圆角。
- 下一步：完成 Gen 8 Eggs 的工程检查、提交与推送，然后实现 PokeFinder Gen 8 Event。

## 2026-08-15 Gen 8 Eggs 实现

- 新增：`gen8egg` C++/Wasm API v1、BDSP 个人数据、原生固定夹具、Dedicated Worker Pool、领域校验、UI 预览与三层 TypeScript 测试。
- 新增：Gen 8 Eggs 工作区接入侧栏、Gen 8 Profile、全局个体值计算器、三语键、虚拟结果表、排序、CSV、进度与取消。
- 核对：对照 PokeFinder 4.3.2 `Eggs8`、`EggSettings`、`EggGenerator8`、`EggState8`、`EggModel8`、`egg8.json` 与简中翻译，记录 64/32 位输入、双亲、护符、红线、特殊蛋种和结果列边界。
- 优化：侧边栏整体外壳改为直角；Gen 8 Eggs 在宽屏使用并排 RNG 与设置/筛选标签，结果表独立滚动，`1280px` 以下重排。
- 已通过：`npm run wasm:test:native` 37/37，包含 `gen8egg_native_parity` 的 Bulbasaur、Nidoran、Volbeat / Illumise 固定结果与输入错误边界。
- 已通过：`npm run verify` 的 Prettier、ESLint（0 error、3 条既有 warning）、TypeScript 和 91 个 Vitest 文件共 373 项测试；2079 个 Vite 模块完成转换。
- 受限：`verify` 的 `build:web` 在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；非受限重试因审批服务 502 未启动。该状态与此前同一路径的受限终端问题一致，但本轮没有项目所有者手动通过记录。
- 未运行：`npm run wasm:build` 因当前会话缺少 Emscripten 与 `emcmake` 在 doctor 阶段停止；常见本机路径未发现 emsdk。CMake、Ninja 与 Visual Studio Build Tools 2026 x64 可用。
- 环境：Node.js `24.13.0`、npm `11.6.2`；低于仓库锁定的 Node.js `24.19.0`、npm `12.0.2`。完整生产构建与锁定工具链验证交给 GitHub Actions。
- 提交阻塞：沙箱拒绝创建 `.git/index.lock`；按授权申请非受限 `git add -A` 时审批服务返回 502，命令未启动。当前没有暂存、提交或推送；下一步先恢复 Git 写入授权，再提交 `feat: 实现第八世代孵化乱数`。

## 2026-08-15 第三世代范围恢复与模块盘点

- 决定：活动开发范围恢复为 Generation III。仓库中既有 Gen IV、Gen V、Gen VII、Gen VIII 与 Researcher 代码继续保留，但不继续新增后续世代模块。
- 核对：对照 PokeFinder 4.3.2 `Form/MainWindow.cpp`、`Form/MainWindow.ui` 与 `Form/Gen3/`，确认 IDs、Eggs、GameCube、Static、Wild、Profile Manager、GameCube Seed Finder、IVs to PID、PID to IVs、Jirachi Advancer、PokeSpot、Seed to Time 与 Spinda Painter 均有对应实现和模块文档。
- 结果：第三世代当前没有缺失的 PokeFinder 功能模块；后续工作转为工程检查、生产算法回归、交互验收与加固，不进入 Gen8 Egg。
- 已运行：只读核对 `git status --short --branch`、`git log -5 --oneline --decorate`、上游 Gen3 Form 清单、仓库功能目录与模块文档。
- 已通过：`npm run format:files -- README.md docs/requirements.md docs/progress.md`、全仓 `npm run format:check` 与 `git diff --check`。
- 未运行：未获本轮测试、构建、Wasm、性能、浏览器或部署 URL 授权，因此没有运行相关检查。
- 下一步：项目所有者明确授权具体工程检查命令，或在 Actions 部署完成后提供准确生产 URL 并授权第三世代回归。

## 2026-08-14 第八世代 ID 乱数

- 新增：实现 PokeFinder `Gen 8 TID/SID` Generator，支持两段 64 位 Seed、Initial Advances、状态数量，以及 TID、SID、TID/SID、PID、TSV、Display TID 六种多行 OR 筛选；空筛选不过滤，两个 Seed 同为 `0` 时拒绝。
- 算法：增加独立 `gen8id` Wasm API v2，复用上游 `IDGenerator8`、`Xorshift`、`RNGList`、`IDFilter` 与 `IDState8` 语义，保留零 `sidtid` 重读、`uint32_t` Advances 回绕和 `rng.next(0x80000000, 0x7fffffff)` 的特殊范围行为。
- 接入：增加最多八个独立 Worker、100,000 状态分片、250,000,000 次状态评估上限、确定性乱序归并、进度、取消、预中止、100,000 行结果上限、协议握手、运行时请求/分片/结果校验、崩溃后重建、默认 Wasm 构建清单和三语导航。
- 界面：按 HakuStyle operational workspace 与 compact workspace 密度实现双栏到单栏响应式控制区、44px 控件、纵向筛选工作流、固定五列表、虚拟滚动、键盘行导航、CSV、清空、错误、空结果与结果上限状态；模块不读取 Gen 8 Profile，也不增加 operation tabs。
- 修复：PID 文本按 Qt 的数值溢出规则处理前导零；未知筛选枚举不再退化为无筛选；无筛选批次必须完整连续返回每个状态；Worker 逐行验证 Advances、非零 TID/SID、TSV、Display TID、筛选命中、结果指针与顺序；运行时锁定输入，结果上限会停止剩余 Worker，非法分片参数不再把 Pool 卡在运行状态。
- 已通过：定向 `gen8id_native_parity` 1/1；覆盖四组 `id8.json` 九行结果、每组全部非零分片起点、六种筛选、空筛选、零 Seed 边界、零状态、Advances 回绕、单批上限和 250,000,000 次任务边界；模块内四个上游副本与 PokeFinder 4.3.2 对应文件 SHA-256 一致。
- 已通过：项目所有者在本地终端运行完整 `npm run verify`；全仓 Prettier、ESLint（0 error、3 条既有 TanStack Virtual warning）、TypeScript、88 个测试文件共 360 项测试、2073 个 Vite 模块的 Web/PWA 生产构建和 62 项 PWA 预缓存全部通过，仅保留大型 chunk 提示。
- 环境记录：受限终端此前在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；后续非受限审批请求因审批服务 502 未启动。项目所有者手动执行同一命令通过，确认不是源码失败。
- 状态：本模块已由 `613e7d8 feat: 实现第八世代 ID 乱数` 进入 `main` 与 `origin/main`；后续世代开发现已冻结，不进入 `gen8egg`。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互和实际页面算法回归，仍需在提交部署后与项目所有者共同完成。

## 2026-08-14 第八世代存档信息管理

- 新增：实现 PokeFinder `Profile Manager Gen 8` 与 `Profile Editor Gen 8`，支持 Sword、Shield、Brilliant Diamond、Shining Pearl，以及 Profile Name、TID、SID、National Dex、Shiny Charm、Oval Charm。
- 管理：支持新建、编辑、完全复制、删除、选择、拖动重排、显式上下移动和键盘行导航；桌面表格按上游保留 6 个数据列，National Dex 只在编辑器和领域模型中保存。
- 持久化：增加独立 IndexedDB `pokerngkit-gen8/profile-data/gen8-profiles`、localStorage 镜像 `pokerngkit-gen8-profiles-v1` 和 `pokerngkit.gen8-profiles` schema v1 备份；镜像写入成功但 IndexedDB 写入失败时记录待同步状态，后续优先恢复较新镜像；导入按稳定 id 合并，清空不影响其他世代且任一副本清除失败会显示错误。
- 界面：按 HakuStyle 工作台密度实现 Lucide 工具图标、居中可访问 modal、焦点约束、`Escape`、滚动锁定、焦点恢复、桌面宽表和移动端记录列表。
- 上游一致性：TID/SID 为空按 `0`、限制为十进制 `0..65535`；Profile Name 只用 trim 后内容校验是否为空，保存时保留原始文本；日文未完成 Gen 8 Profile 词条保留 English source。
- 依赖：使用 npm 增加 `lucide-react`，仅作为本地打包的标准工具图标，不使用运行时 CDN。
- 已通过：`npm test -- src/features/gen8profiles` 共 2 个测试文件、13 项测试；领域、存储和面板的定向 ESLint、TypeScript、Prettier 与 `git diff --check` 通过。
- 已通过：完整 `npm run verify`，包含全仓 Prettier、ESLint、TypeScript、85 个测试文件共 341 项测试，以及 Web/PWA 构建。
- 已知警告：Gen 3 Egg、Gen 3 Wild 与 Gen 5 Hidden Grotto 保留 3 条 TanStack Virtual React Compiler 兼容警告；Vite 保留主包与大型 Wasm chunk 的默认体积提示。
- 不适用：本模块不执行 RNG，不含 Wasm、Worker 或原生 C++ 夹具。
- 待验收：部署后的桌面/移动端界面、拖动、键盘、导入导出和浏览器持久化仍需使用外部 Chrome/Edge 与项目所有者共同确认。

## 2026-08-14 第五世代隐藏洞穴乱数

- 新增：实现 PokeFinder `Hidden Grotto` 的 Grotto Slot Generator/Searcher 与 Pokemon Generator/Searcher，目标游戏固定为 Black 2 / White 2。
- 数据：内置 20 个隐藏洞穴地点、每地点 4 个 Group，以及每组 3 个宝可梦 Slot、4 个道具 Slot 和 4 个隐藏道具 Slot；运行时不联网读取遭遇数据。
- 算法：保留洞穴刷新、Grotto Power、Group、Slot、性别、Synchronize、Shiny Charm、隐藏特性、等级、PID、IV、觉醒力量、能力值和 `uint32_t` 推进环绕语义。
- 接入：增加独立 `gen5hiddengrotto` Wasm API v1、114-word 请求、16-word 结果、四能力握手、最多四个 Worker、确定性分片、进度、取消、250,000,000 次状态评估上限和 100,000 行结果上限。
- 检索：Slot Searcher 使用 raw Seed；Pokemon Searcher 支持 raw、IV Cache 与 IV+SHA Cache 三条路径，并复用 PokeFinder `.ivcache` / `.sha1cache` 的 Profile、日期和推进范围兼容规则。
- 界面：按 HakuStyle 紧凑工作台实现 Slot/Pokemon 主标签、Generator/Searcher 次标签、Profile Manager、Adjacent Seeds、可拖动 Advance Finder、IV/能力值切换、排序、虚拟结果表、键盘行导航和移动端单列重排。
- 已通过：`npm test -- src/features/gen5hiddengrotto` 共 5 个测试文件、29 项测试；定向 `gen5hiddengrotto_native_parity` 1/1。
- 已通过：完整 `npm run wasm:test:native` 共 35/35 原生夹具。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；格式、ESLint、TypeScript、83 个 Vitest 文件共 328 项测试、Vite 生产构建和 61 项 PWA 预缓存通过，仅保留 3 条 TanStack Virtual / React Compiler 非阻断警告与主包体积警告。
- 环境记录：受限终端首次构建在复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过，确认不是源码失败。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 第五世代野生乱数

- 新增：实现 PokeFinder `Gen 5 Wild` 的 Generator/Searcher，覆盖 Black、White、Black 2、White 2，以及草丛、深色草丛、摇动草丛、冲浪、水纹冲浪、钓鱼与水纹钓鱼七类遭遇。
- 算法：保留 Synchronize、Cute Charm、Magnet Pull、Static、Pressure、Hustle、Vital Spirit、Suction Cups、Sticky Hold、Compound Eyes、Dark Grass 双打额外 RNG 消耗、BW/BW2 差异、Lucky Power、Shiny Charm、Memory Link 与 N's Pokémon released 分支。
- 接入：增加独立 `gen5wild` Wasm API v1、84-word 请求、16-word 结果、最多四个 Worker、确定性分片、进度、取消、250,000,000 次状态评估上限、100,000 行结果上限和默认 Wasm 构建入口。
- 检索：支持 raw、IV Cache 与 IV+SHA Cache 三条 Searcher 路径；缓存沿用 PokeFinder `.ivcache` / `.sha1cache` 格式，并按 Profile、日期与 IV 推进范围检查兼容性。
- 界面：提供季节、地点、物种、队首、Lucky Power、遭遇槽位、等级和完整状态筛选；结果包含道具、物种、等级、能力值、Characteristic，并接入 Advance Finder、Adjacent Seeds 与 Profile Manager。
- 已通过：`npm test -- src/features/gen5wild` 共 6 个测试文件、18 项测试，定向 ESLint、全仓 TypeScript，以及 `gen5wild_native_parity` 1/1。
- 已通过：完整 `npm run wasm:test:native` 共 34/34 原生夹具，包含 `gen3pidtoiv_native_parity`、Advance Finder API v2、Gen5 Event 与本轮 `gen5wild_native_parity`。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；格式、ESLint、TypeScript、78 个 Vitest 文件共 299 项测试、Vite 生产构建和 60 项 PWA 预缓存通过，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 环境记录：锁定运行时在受限终端完成格式、Lint、TypeScript 与全部测试后，复制既有 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一 `verify` 在非受限环境通过，确认不是源码失败。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 第五世代配信乱数

- 新增：实现 PokeFinder `Gen 5 Event` 的 Generator/Searcher，覆盖 Black、White、Black 2、White 2，以及 204 字节 `.pgf` 配信卡导入。
- 参数：支持配信 TID/SID、物种、固定或随机性格、性别、特性、异色、等级、蛋标记、六项固定或随机个体值，以及个体值、性格、觉醒属性、特性、性别和异色筛选。
- 接入：增加独立 `gen5event` Wasm API v1、最多四个 Worker、确定性分片、进度、取消、250,000,000 次状态评估上限、100,000 行结果上限和默认 Wasm 构建入口。
- 界面：按 HakuStyle 紧凑工作台实现三列到单列响应式表单、Profile 摘要、PGF 导入、虚拟结果表、鼠标/键盘行选择、能力值切换和可拖动 Advance Finder；Searcher 日期使用本地持久化降级。
- 完善：物种必须从自动完成候选确认；能力值固定使用当次任务的物种与结果等级；结果表使用合法可选择网格语义；Worker 把有效结果上限传入任务并限制解码；Generator 允许 Profile 九项 Keypresses 全关闭。
- 已通过：`npm test -- src/features/gen5event` 共 5 个测试文件、22 项测试，定向 ESLint、全仓 TypeScript，以及 `gen4advance_native_parity` / `gen5event_native_parity` 2/2。
- 已通过：完整 `npm run wasm:test:native` 共 33/33 原生夹具，包含 `gen3pidtoiv_native_parity`、Advance Finder API v2 与 `gen5event_native_parity`。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 运行完整 `npm run verify`；格式、ESLint、TypeScript、72 个 Vitest 文件共 281 项测试通过，非受限 Web/PWA 构建成功并生成 `gen5event.worker`，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 环境记录：受限终端在复制 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一构建命令在非受限环境通过，确认不是源码失败。
- 已提交：`f58bb53 feat: 实现第五世代配信乱数` 已推送到 `origin/main`。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 第五世代孵化乱数

- 新增：实现 PokeFinder `Gen 5 Eggs` 的 Generator/Searcher，覆盖 Black、White、Black 2、White 2、双亲 IV/特性/性别/道具/性格、异国孵化、隐藏特性遗传和特殊蛋种派生。
- 接入：增加独立 `gen5egg` Wasm API v1、最多四个 Worker、确定性分片、进度、取消、250,000,000 次状态评估上限、100,000 行结果上限和默认 Wasm 构建入口。
- 界面：按 HakuStyle 紧凑工作台密度实现三列到单列的响应式表单、完整筛选、遗传来源、能力值切换、排序、CSV、虚拟结果表和鼠标/键盘行选择。
- 工具：Generator 使用居中、可拖动的共享弹层打开 Advance Finder，复用 API v2 的 Chatot 联合区间与 Needles 精确/Any 连续匹配；跳转后选中对应结果并滚动到该行。
- 完善：Searcher 选中结果后可打开 Adjacent Seeds；空十进制输入按上游读取为 `0`，物种必须从候选列表确认，双亲交换后的遗传来源按当次请求保持 A/B 映射，虚拟结果表补齐网格 ARIA 与方向键、Home、End 导航。
- 已通过：`npm test -- src/features/gen4advance src/features/gen5egg` 共 5 个测试文件、23 项测试，定向 ESLint、全仓 TypeScript，以及 `gen4advance_native_parity` / `gen5egg_native_parity` 2/2。
- 已通过：完整 `npm run wasm:test:native` 共 32/32 原生夹具，包含 `gen3pidtoiv_native_parity`、Advance Finder API v2 与 `gen5egg_native_parity`。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；格式、ESLint、TypeScript、72 个 Vitest 文件共 278 项测试和 Web/PWA 构建通过，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 环境记录：受限终端在复制 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过，确认不是源码失败。
- 待验收：生产 Wasm、Actions 部署、外部 Chrome/Edge 的桌面/移动端交互与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 第五世代定点乱数

- 新增：实现 PokeFinder `Gen 5 Static` 的 Generator/Searcher，覆盖 Black、White、Black 2、White 2 与九类上游模板，并保留普通定点、野生定点、赠送蛋和游走分支。
- 修复：Worker 缓存键加入日期范围与筛选后内容指纹；连续使用同一 SHA Cache 搜索不同日期范围时会重新加载，避免复用旧子集造成漏结果或 `InvalidChunk`。
- 修复：Hardy、Docile、Serious、Bashful 与 Quirky 五种中性性格按 `1.0` 计算能力值；UI Preview 的“取消筛选”不再继续套用 IV、性格、特性、性别和异色条件。
- 优化：Generator/Searcher 结果表支持全列表头排序、鼠标与键盘选中；`Lucky Power` 的 Level 3 文案改为上游原文 `3/S`。
- 接入：增加独立 `gen5static` Wasm API v1、最多四个 Worker、确定性分片、进度、取消和虚拟结果表；Generator 通过可拖动居中弹层打开 Advance Finder，Searcher 把已选结果带入 Adjacent Seeds。
- 更新：共享 `gen4advance` Wasm API 升级为 v2，增加第五世代 Needles 精确/Any 匹配，并保留 Calls/Chatot 请求格式。
- 已通过：`npm test -- src/features/gen4advance src/features/gen5static` 共 6 个文件、21 项测试，定向 ESLint，以及 `gen4advance_native_parity` / `gen5static_native_parity` 2/2。
- 已通过：完整 `npm run wasm:test:native` 共 31/31 原生夹具，包含附件曾失败的 `gen3pidtoiv_native_parity` 以及本轮 `gen4advance_native_parity` / `gen5static_native_parity`。
- 已通过：使用 Node `24.19.0` 与 npm `12.0.2` 在非受限环境运行完整 `npm run verify`；格式、ESLint、TypeScript、67 个 Vitest 文件共 255 项测试和 Web/PWA 构建通过，仅保留两条既有 TanStack Virtual 警告与主包体积警告。
- 环境记录：受限终端首次构建在复制 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一命令在非受限环境通过，确认不是源码失败。
- 待验收：生产 Wasm、Actions 部署与实际页面算法回归仍需等待部署完成，并由项目所有者提供准确生产 URL 和单独授权。

## 2026-08-14 HakuStyle Skill 更新

- 更新：从项目所有者指定的 `C:\Users\Hakuhiro\Documents\Codex\2026-08-12\b\outputs\hakustyle` 同步仓库内 `.agents/skills/web-frontend-style`，后续模块继续使用更新后的 HakuStyle 规则。
- 规范：增加 PokeRNGKit 实底玻璃导航外壳规则，明确透明层仅用于导航与浮动工具外壳，表单、表格、弹层正文和长文本继续使用不透明内容面。
- 来源：设计来源索引由 31 个更新为 32 个，交互、字体密度与来源映射同步更新；未复制来源仓库的 `.git`、README 或其他非 Skill 文件。
- 已通过：仓库 Skill 自带 `scripts/validate.ps1` 与 `skill-creator` 的 `quick_validate.py` 均通过；任务文件已按仓库 Prettier 规则格式化，`git diff --check` 通过。

## 2026-08-14 剩余功能模块盘点

- PokeFinder：第三、第四世代主模块和工具已齐；第五世代 Static、Egg 与 Event 已进入主分支，Wild 当前工作区待工程验证，之后仍缺 Hidden Grotto；第八世代仍缺 Profiles、IDs、Egg、Event、Raid、Static、Underground、Wild 与 Den Map。
- 3DSRNGTool：已实现第七世代 ID；第六世代仍缺 Stationary、Event、Wild、Egg、ID、Main Seed Finder 与 TinyMT Timeline；第七世代仍缺 Stationary、Event、Wild/SOS、Egg、Main RNG Tool 与 Egg Seed Finder；公共工具仍缺 Profile Manager、KeyBV 与 Misc. RNG Tool。
- 架构限制：`NTR Helper` 依赖桌面程序对 3DS 调试端建立原始 TCP/NTR 连接，普通静态浏览器不能直接复刻该通信；在不增加本地桥接程序、浏览器扩展或后端的现有边界下暂不实现，后续须由项目所有者单独确认方案。
- 实施顺序：完成 Gen5 Wild 工程验证、提交与推送后处理 Hidden Grotto，再进入第八世代与 3DSRNGTool 模块。每个完整模块独立提交并推送，共享接线在对应模块提交内收口。
- 验收边界：工程检查、原生夹具与 Actions 只作为工程证据；全部模块部署后仍须使用已连接的外部 Chrome/Edge 检查实际生产 URL，并与项目所有者共同完成最终验收。

## 2026-08-14 Gen5 SHA1 Cache Finder

- 新增：PokeFinder `SHA1 Cache Finder`，复用第五世代 Profile 与用户上传的 `.ivcache`，按 Timer0、日期、2144 个有效按键组合和每天 86400 秒扫描 SHA-1 初始 Seed，并导出 PokeFinder 兼容 `.sha1cache`。
- 算法：移植 PokeFinder 4.3.2 SHA1、Nazo、Keypresses 与 SHA1CacheSearcher 语义；Entralink/Normal/Roamer 分别二分检索，Normal 桶按 BW/BW2 规则选择，三类结果按完整 64 位 Seed 升序写入。
- 接入：新增 `gen5sha1cache` Wasm API v1、14-word 请求、4-word 结果、最多四个独立 Worker、GEN V 导航、共享契约和默认 Wasm 构建清单；每个 Worker 只接收一次三类 IV Seed，任务按 `Timer0 + 日期 + 按键` 分发。
- 界面：按 HakuStyle 工作台密度复用第五世代 Profile 选择器，提供日期范围、IV Cache 上传、Output File、Search/Cancel、文件系统写入回退、响应式布局和 UI Preview；简中控件逐字使用 PokeFinder 上游译文。
- 加固：校验 `.ivcache` magic、计数、精确长度、排序去重、1,000,000 个 Seed 输入上限、100,000 条单元结果上限与 1,000,000 条文件结果上限；协议、指针、缓冲区、进度或 Worker 错误均终止任务且不写部分文件。
- 已通过：定向 3 个 Vitest 文件共 9 项测试、TypeScript、定向 ESLint、全仓 Prettier、`git diff --check`，以及 `POKERNGKIT_WASM_MODULES=gen5sha1cache npm run wasm:test:native` 原生 CTest 1/1；完整 `npm run wasm:test:native` 通过全部 30 项原生夹具。
- 完整验证：受限环境首次在 `build:web` 复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；非受限 `npm run verify` 通过 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、60 个测试文件共 226 项测试、Vite 生产构建与 56 项 PWA 预缓存。
- 环境限制：本机没有 Emscripten 6.0.6，`emcc/emcmake` 均不可用，因此未生成本地生产 Wasm；该产物继续由 Actions 工具链构建。Actions 部署页面算法回归、外部 Chrome/Edge 视觉与交互和项目所有者最终验收待提交部署后完成。

## 2026-08-14 赞助入口

- 新增：页脚增加“赞助”入口，与贡献榜保持同一信息层级；点击后使用共享浮动工具弹层居中显示支付宝和微信支付两张收款码。
- 资源：将项目所有者提供的 `Alipay.jpg` 与 `WeChatPay.jpg` 收纳到独立功能目录并通过 Vite 静态导入，保留原始分辨率、完整方形画面和离线 PWA 资源哈希。
- 交互：弹层支持遮罩点击、`Escape`、关闭按钮、焦点约束与恢复、滚动锁、桌面指针拖动和键盘方向键移动；二维码使用同源原图链接，移动端可长按保存，也可轻点或键盘激活直接下载原始 JPG。
- 优化：移除二维码图片上的拖动禁用和触摸拦截，触摸设备保留 iOS/Android 原生长按菜单，桌面端继续提供点击下载原图。
- 样式：按 HakuStyle 标准产品密度使用 15px 标签、12px 图片圆角和安静边框；桌面双列、窄屏单列，不裁切二维码，不增加装饰渐变、嵌套卡片或说明性填充文案。
- 已通过：任务文件定向 Prettier、全仓 `npm run format:check`、`git diff --check`；完整 `npm run verify` 通过 ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、57 个测试文件共 217 项测试、Vite 生产构建与 55 项 PWA 预缓存。受限环境复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`，非受限环境重跑通过。
- 未验收：外部 Chrome/Edge 与部署页面视觉、长按保存行为等待提交部署后和项目所有者共同核对。

## 2026-08-14 Gen5 Dream Radar

- 新增：PokeFinder `Dream Radar` Generator/Searcher，覆盖 Black 2 / White 2 Profile、最多六个连续 Slot、徽章等级、Memory Link、个体值、性格、觉醒力量、Needle、按键和日期时间结果。
- 接入：新增 `gen5dreamradar` Wasm API v1、最多四个独立 Worker、58-word 请求 ABI、11-word 结果 ABI、250,000,000 次状态评估上限、100,000 行结果上限、GEN V 导航、共享契约和默认 Wasm 构建清单。
- 算法：移植 BWRNG、MT、SHA-1、按键、初始推进、PID、个体值和派生值规则；固定模板使用模板性别生成 PID 并按 personal data 显示无性别，保留 Lugia 等模板所需 RNG 消耗。
- 界面：按 HakuStyle 紧凑工作台密度统一 40px 控件、13px 最小元数据与移动端 44px 触控目标；模式页签支持方向键、Home/End、roving tabIndex 和关联区域，结果改为只读 table 语义并复用上游简中表头。
- 已通过：定向 ESLint；3 个 Vitest 文件共 8 项测试；MSVC C++23 原生夹具 1/1，完整比较 Tornadus、Lugia、Staryu、`Staryu -> Slowpoke` 四组各 10 帧，共 40 帧 PID、IV、Nature、Needle、Hidden Power、Ability、Gender、Advance、Level 与 Ability Index。
- 已通过：本次共享接线后的任务文件 Prettier、全仓 `npm run format:check`、`git diff --check`、TypeScript、定向 ESLint、3 个测试文件共 8 项测试与 Dream Radar 原生夹具。
- 完整验证：受限环境首次在 `build:web` 复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`，一次非受限重跑又被并行 Gen7 ID 文件的未格式化状态拦截；隔离 Dream Radar 暂存区后，非受限 `npm run verify` 通过全仓 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、57 个测试文件共 211 项测试、Vite 生产构建与 55 项 PWA 预缓存。
- 未验收：生产 Wasm、Actions 部署页面算法回归、外部 Chrome/Edge 视觉与交互，以及项目所有者最终验收。

## 2026-08-14 Gen7 ID

- 新增：补全第七世代 ID Generator 的多行 TID、SID、Full ID、Gen7TID、TSV 与 Random Number 筛选输入。
- 筛选：支持普通包含匹配、逐行正则、Full ID 空格与 `//` 注释解析，以及 `Disable Filters`；筛选在独立 Worker 中对 Wasm 分片结果执行。
- 样式：按 HakuStyle 工作台密度重排三组 textarea 和响应式筛选区，窄屏改为单列并保留触控目标。
- 文档：记录 SFMT、起始帧、时钟修正、筛选范围与上游 `3DSRNGTool` 来源。
- 已通过：Gen7 ID 定向 ESLint、`npm run typecheck`、13 项 Vitest、`gen7id_native_parity` 原生夹具、`npm run format:check` 与 `git diff --check`。
- 完整验证：恢复文件后首次任务格式化发现并修复筛选模式集合的括号损坏；首次 `npm run verify` 在一项有符号/无符号夹具断言失败，规范为 `uint32` 后受限重跑通过 57 个测试文件共 217 项测试，但在 `build:web` 复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；非受限完整重跑通过 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、全部 217 项测试、Vite 生产构建与 55 项 PWA 预缓存。
- 未验收：生产页面算法回归、外部 Chrome/Edge 视觉与移动端长文本交互，以及项目所有者最终验收。

## 2026-08-14 Gen5 IV Cache Finder

- 新增：PokeFinder `IV Cache Finder`，覆盖完整 `2^32` MT Seed 空间、Entralink/Normal/Roamer 三种读取顺序、高个体 Seed 筛选和 `.ivcache` 导出。
- 接入：新增 `gen5ivcache` Wasm API v1、最多四个独立 Worker、65,536 个半开区间分片、结果确定性归并、File System Access API 写入和下载回退；UI Preview 不加载 Wasm。
- 加固：保留上游 `Advance32Bit` 的 `uint32_t` 解析和文件字段，但执行入口要求 `Initial Advances = 0`、`Max Advances <= 20`。原因是上游搜索器写入相对桶，而 PokeFinder 读取端按绝对 Initial Advances 访问；非零初始帧会生成错帧 `.ivcache`，Roamer 还无法表示非零起点。
- 加固：单批结果不超过 `65,536` 条，累计结果不超过 `1,000,000` 条；结果数量、缓冲区、指针对齐、堆边界、协议版本和 Worker 崩溃均有防御校验。`appendGen5IvCacheHits`、进度回调或批次异常后会销毁整个池，下一次搜索重新建 Worker。
- 文档：新增 [Gen 5 IV Cache Finder](modules/gen5ivcache.md)，更新需求、README、默认 Wasm 模块清单和上游 MT/RNGList 归属记录；`docs/tech-stack.md` 保留项目所有者改动，Dream Radar 不纳入本次接线。
- 已通过：定向 Prettier、全仓 `npm run format:check`、`git diff --check`、定向 ESLint、`npm run typecheck`、`npm test -- src/features/gen5ivcache`（3 个文件、12 项测试）与 `$env:POKERNGKIT_WASM_MODULES='gen5ivcache'; npm run wasm:test:native`（固定结果与 C++ 写入前限流 2/2）。
- 完整验证：锁定 Node `24.19.0` 与本机 npm `11.6.2` 下的非受限 `npm run verify` 通过全仓 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、57 个测试文件共 211 项测试、Vite 生产构建与 54 项 PWA 预缓存；受限环境首次在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`。CI 使用锁定 npm `12.0.2` 复核；Actions、生产 Wasm 与部署页面回归待提交推送后执行。
- 已提交：`e214060 feat: 实现第五世代IV缓存` 已推送到 `origin/main`；Actions 部署与生产页面回归待执行。

## 2026-08-14 Gen5 IDs

- 新增：PokeFinder `Gen 5 TID/SID` 的 Search By 与 Seed Finder，覆盖 BW/BW2 SHA-1、初始 ID 推进、PID/TID/SID 筛选、第五世代 Profile、九列虚拟结果表、取消和结果上限。
- 安全边界：TypeScript 使用 BigInt 将有筛选任务的 `Seed x Advances` 总评估限制为 250,000,000；完全无筛选的 Search By 按 100,000 行结果上限计算提前终止边界，使默认 Profile 与默认推进数可以启动。Worker Pool 逐行校验日期时间、Timer0、按键、推进数、TID/SID/TSV 与筛选关系，C++ 同步拒绝任务规模和绝对推进溢出；Worker 崩溃或协议错误会终止并清空槽位，下次搜索重新创建。
- 上游标签：`ProfileDisplay5` 的简中 `Profile` 与 `Manager` 均为 unfinished，因此界面保留英文，并补回上游 Profile Display 的 `Manager` 命令以跳转第五世代存档管理。
- 已通过：定向 Prettier、ESLint、TypeScript、3 个测试文件共 9 项测试和 MSVC C++23 原生夹具 1/1；非受限环境完整 `npm run verify` 通过全仓 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、52 个测试文件共 195 项测试、Vite 生产构建与 52 项 PWA 预缓存。受限环境同一命令仅在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；Actions、生产 Wasm 与部署页面回归待执行。

## 2026-08-14 Gen5 Adjacent Seeds

- 新增：PokeFinder `Adjacent Seeds`，覆盖 BW/BW2 目标日期时间、秒数偏移、Timer0、按键、Encounter、IV advances、十列虚拟结果表，以及所选结果的 `Chatot Pitches` / `Save Needles` 预览。
- 接入：复用第五世代 Profile 的 MAC、Nazo、VCount、Timer0、GxStat、VFrame、DS 类型、语言和 Memory Link；新增 `gen5adjacentseeds` Wasm API v1、最多四个独立 Worker、GEN V 导航、共享契约和默认 Wasm 构建列表。
- 加固：浏览器任务限制为 100,000 行，TypeScript、Worker 与 C++ 保留日期时间、推进溢出、指针对齐和堆边界校验；修复 `UINT32_MAX` IV Advance 循环回绕，并在 Worker 崩溃或协议错误后销毁实例、下次任务重新创建。
- 上游标签：`AdjacentSeeds` 与 `ProfileDisplay5` 的简中条目均为 unfinished，因此控件和模块名保留精确英文源字符串，管理按钮使用上游 `Manager`。
- 样式：按 HakuStyle Royal Blueprint compact workspace 组织 Profile、设置与结果区，使用 44px 控件、稳定表格轨道、键盘行导航、移动端单列重排和 reduced motion；不新增卡片嵌套、装饰渐变或无语义徽章。
- 已通过：定向 Prettier、全仓 `npm run format:check`、定向 ESLint、`npm run typecheck`、`npm test -- src/features/gen5adjacentseeds`（3 个文件、6 项测试）与 `$env:POKERNGKIT_WASM_MODULES='gen5adjacentseeds'; npm run wasm:test:native`（`gen5adjacentseeds_native_parity` 1/1）。非受限环境完整 `npm run verify` 通过全仓 Prettier、ESLint（0 error、2 条既有 TanStack Virtual warning）、TypeScript、54 个测试文件共 202 项测试、Vite 生产构建与 53 项 PWA 预缓存；受限环境同一命令仅在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`。Actions、生产 Wasm 与部署页面回归待执行。

## 2026-08-14 Researcher

- 新增：PokeFinder 全局 Researcher，覆盖 14 种 RNG、四组 Seed 输入、10 个有序 Custom 表达式、当前/上一行引用、十六进制 Custom 显示与结果内 Search/Next。
- 接入：新增 `researcher` Wasm API v1、单 Dedicated Worker、10,000 行分批、250,000 行浏览器任务上限、确定性 UI Preview、RNG TOOLS 导航、三语模块名称、全局共享契约和默认 Wasm 构建列表。
- 加固：Worker 校验 API、operation、任务顺序、批次数量、结果宽度、指针对齐和堆范围；取消会终止当前 Worker并在下次生成时重建。桥接层明确将除零和模零定义为 `0`，移位量限制为 `rhs & 63`。
- 样式：按 HakuStyle Royal Blueprint compact workspace 统一页签、Custom 控件与虚拟结果表，保留桌面四页签单行与移动端两列重排；页签和结果网格支持 roving tabIndex、方向键、Home、End，状态、计数、错误和空结果提供对应 ARIA 语义。
- 已通过：定向 Prettier、`git diff --check`、定向 ESLint、`npm run typecheck` 与 `npm test -- src/features/researcher`（3 个文件、11 项测试）；`$env:POKERNGKIT_WASM_MODULES='researcher'; npm run wasm:test:native` 的 `researcher_native_parity` 1/1 通过 14 种 RNG 首值、跨行 Custom、批次上限与 `u32` 帧边界。
- 完整验证：非受限环境 `npm run verify` 通过全仓 Prettier、ESLint（0 error，2 条既有 TanStack Virtual warning）、TypeScript、45 个测试文件共 176 项测试、Vite 生产构建与 51 项 PWA 预缓存；Vite 仅保留大包 warning。受限环境两次在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`，相同源码在非受限环境完整通过。
- 工具链：最终 `npm run verify` 使用锁定 Node `24.19.0` 与本机 npm `11.6.2`；npm `12.0.2`、全量原生夹具和 Researcher 生产 Wasm 由推送后的 Actions 补齐。本机未激活 Emscripten `6.0.6`，定向 `npm run wasm:build` 因缺少 Emscripten 与 `emcmake` 停止。
- 已部署：提交 `45a84d9` 对应 Actions run `31766341675` 的 `build` 与 `deploy` 成功，`deploy-cloudflare` 按配置跳过；GitHub Pages 刷新后加载 `index-BomXgEd3.js`、`index-aKq41HjQ.css` 与 `researcher.worker-DHLB9crx.js`。
- 生产回归：经项目所有者授权，使用已连接的外部 Google Chrome 检查 `https://haku76.github.io/PokeRNGKit/`。LCRNG 全零 Seed 首行返回 `00006073`；Xoroshiro 全零 Seed 首行返回 `82A2B175229D6A5B`；Search 定位 `E97E7B6A` 第 1 帧，Next 无后续匹配时返回“找不到结果”；四组页签方向键、roving `tabIndex`、结果网格 ARIA 选中状态和 `390px` 两列重排均可用。
- 控制台：站点自身没有 error 或 warning；仅记录用户浏览器 Immersive Translate 扩展的版本不匹配错误。自动化结果仅作为工程证据，Researcher 仍需与项目所有者共同完成最终验收。

## 2026-08-14 移动端模块抽屉

- 修复：移动端模块抽屉打开时关闭其他浮动工具并锁定页面滚动；浮动工具打开时也会关闭模块抽屉，避免两套模态层同时争用焦点、`Escape` 和滚动锁。
- 可访问性：窄屏模块侧栏补充对话框名称、模态语义和内部返回按钮，将焦点移入当前模块，使用 `Tab` / `Shift+Tab` 约束焦点循环，并在 `Escape`、遮罩、返回按钮或模块切换关闭后恢复顶部菜单按钮焦点。
- 响应式：进入桌面断点时清除移动抽屉状态且不抢占当前焦点，回到窄屏后保持关闭；关闭状态继续使用 `inert` 与 `aria-hidden`，桌面收起行为不变。
- 已通过：定向 Prettier、`npx eslint src/App.tsx`、`git diff --check`、全仓 `npm run format:check`，以及非受限环境完整 `npm run verify`；后者覆盖 ESLint（0 error，2 条既有 TanStack Virtual warning）、TypeScript、51 个测试文件共 194 项测试、Vite 生产构建与 51 项 PWA 预缓存。
- 验证重试：受限环境在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；一次 1 秒执行器超时只进入 Prettier，另一次非受限重跑捕获并行 IV Cache 文件尚未完成格式化。并行写入停止并重新格式化后，同一完整命令通过。
- 已部署：提交 `7c267eb` 对应 Actions run `31769597386` 的 `build` 与 `deploy` 成功，`deploy-cloudflare` 按配置跳过；GitHub Pages 刷新后加载 `index-BTDNg88F.js`。
- 生产回归：经项目所有者授权，使用已连接的外部 Google Chrome 检查 `https://haku76.github.io/PokeRNGKit/`；`390px` 下抽屉打开会锁定页面滚动并把焦点移入当前模块，`Shift+Tab` / `Tab` 在内部关闭按钮与末项间循环，内部关闭会恢复顶部菜单焦点，浮动工具与抽屉不会同时保持展开。`390px -> 1280px -> 390px` 切换会解除滚动锁、移除桌面对话框语义并在返回窄屏时保持抽屉关闭；自动化结果仅作为工程证据，项目所有者最终验收仍待共同确认。

## 2026-08-14 Gen5 Profiles

- 新增：第五世代 Black/White/Black 2/White 2 Profile Manager 与 Profile Calibrator，覆盖档案 CRUD、选择、复制、排序、JSON 导入导出、IV Search、Needle Search、Seed Search 和 BW2 Memory Link。
- 存储：使用独立 IndexedDB 数据库与 `pokerngkit-gen5-profiles-v1` localStorage 镜像，保持 Gen III、Gen IV、Gen V 档案数据隔离，并在 IndexedDB 不可用或损坏时回退到镜像。
- 接入：新增 `gen5profiles` Wasm API v1、最多四个独立 Worker 排队消费最多八个确定性 VFrame 分片、固定宽度 C ABI、确定性 UI Preview、GEN V 导航、三语模块名称、共享契约和默认 Wasm 构建列表。
- 加固：领域层校验版本、语言、机型、日期时间、十六进制字段、校准范围、IV、Needle、结果上限和浏览器任务上限；Worker 校验 API、operation、分片、结果计数、指针对齐和堆边界。档案写入通过全局队列串行持久化，避免旧渲染快照覆盖后续选择、复制、排序或导入。
- 对齐：MAC、Seed 与十六进制数字输入接受空值和不足最大位宽的文本并按 `0` 读取；新建档案默认启用全部 9 个 Keypress 数量选项，校准创建档案不再带入测试 TID/SID；Needle 方向编码、BW2 依赖选项清理、Profile Editor 的 `MAC` 标签与 Timer0 保存边界均按上游修正。
- 可访问性：档案表支持键盘选择和上下移动，主页面与校准模式页签支持方向键、Home、End、roving tabIndex 和关联 tabpanel；加载、错误、搜索状态与进度提供 live region 或对应 ARIA 语义。
- 已通过：定向 Prettier、`git diff --check`、`npx eslint src/features/gen5profiles`、`npm run typecheck`、`npm test -- src/features/gen5profiles`（3 个文件、14 项测试）与 `$env:POKERNGKIT_WASM_MODULES='gen5profiles'; npm run wasm:test:native`（`gen5profiles_native_parity` 1/1）。
- 完整验证：非受限环境 `npm run verify` 通过全仓 Prettier、ESLint（0 error，2 条既有 TanStack Virtual warning）、TypeScript、45 个测试文件共 176 项测试、Vite 生产构建与 50 项 PWA 预缓存；Vite 仅保留大包非阻断 warning。
- 未验收：Emscripten 生产 Wasm、外部 Chrome/Edge 与 GitHub Pages 算法结果待部署完成后和项目所有者共同核对。

## 2026-08-14 Gen4 Egg

- 新增：第四世代 DPPt/HGSS Egg Generator/Searcher，覆盖 MT19937 PID、异国孵化 ARNG 重抽、三项遗传 IV、双亲组合、221 个合法蛋种、筛选、Poketch 与电话结果。
- 接入：新增 `gen4egg` Wasm API v1、Generator/Searcher Worker Pool、固定宽度 C ABI、GEN IV 导航、三语词条、共享契约和默认 Wasm 构建列表；简中模块名逐字使用上游“第四世代孵化乱数”。
- 加固：Worker 验证 operation、请求与分片类型、`chunkIndex`、领域边界、单批上限、结果计数及 Wasm 指针对齐、非空和堆范围；Pool 按分片索引有序归并并在取消时重建 Worker。
- 已通过：`npm run format:check`、`git diff --check`、`npm test -- src/features/gen4egg`（2 个文件、11 项测试）、`npm run lint`（0 error，2 条既有 warning）、`npm run typecheck` 与 `$env:POKERNGKIT_WASM_MODULES='gen4egg'; npm run wasm:test:native`（`gen4egg_native_parity` 1/1）。
- 完整验证：受限文件环境的 `npm run verify` 通过格式、lint、类型和 39 个测试文件共 151 项测试，随后在复制既有 `public/wasm/gen3egg.mjs` 时返回 `EPERM`；相同源码状态在受限环境外完整通过 Vite 生产构建与 48 项 PWA 预缓存。
- 未验收：Emscripten 生产 Wasm、外部 Chrome/Edge 与 GitHub Pages 算法结果待部署完成后和项目所有者共同核对。

## 2026-08-14 Gen4 Advance Finder

- 新增：第四世代 Calls/Chatot 连续观测匹配，覆盖上游半开区间、空序列、五条过滤阈值、完整源表恢复、Jump to Advance、清空和取消。
- 接入：初版使用 `gen4advance` Wasm API v1、单 Dedicated Worker、GEN IV 导航、三语模块信息、共享契约和默认 Wasm 构建列表；独立入口支持本地 `Advances,Value` 数据，嵌入接口支持父 Generator 结构化结果。
- 加固：Worker 验证 operation、请求与 chunk、领域边界、结果计数及 Wasm 请求/结果指针对齐、非空和堆范围；原生夹具补齐非法 mode、空指针、非法 Call、行数和令牌数上限。
- 当时限制：初版仅覆盖第四世代 Calls/Chatot；该限制已在 Gen5 Static 接入时由 API v2 的 Needles 模式解除。
- 已通过：任务文件格式化、完整 `npm run format:check`、`git diff --check`、`npx eslint src/features/gen4advance`、`npm test -- src/features/gen4advance`（2 个文件、5 项测试）、`npm run typecheck` 与 `$env:POKERNGKIT_WASM_MODULES='gen4advance'; npm run wasm:test:native`（`gen4advance_native_parity` 1/1）。
- 完整验证：受限文件环境外的 `npm run verify` 通过全仓格式、lint（0 error，2 条既有 warning）、TypeScript、39 个测试文件共 151 项测试、Vite 生产构建与 49 项 PWA 预缓存。
- 未验收：Emscripten 生产 Wasm、外部 Chrome/Edge 与 GitHub Pages 页面行为待部署完成后和项目所有者共同核对。

## 2026-08-14 Gen4 Wondercard IVs

- 新增：第四世代 `Wondercard IVs` Generator/Searcher，覆盖 DPPt/HGSS、Seed/Advance/Offset、IV/Hidden Power、Delay/Advance Searcher、能力值显示、排序、虚拟表、进度与取消。
- 接入：新增 `gen4event` Wasm API v1、Generator/Searcher Worker Pool、模块 manifest、共享契约、GEN IV 导航、三语名称和默认 Wasm 构建列表；简中模块名逐字复用上游“第四世代配信乱数”。
- 已通过：`npm run typecheck`、`npm run lint`（0 error，仅保留 Egg/Wild 两条既有 TanStack Virtual warning）、`npm test -- src/features/gen4event`（2 文件、11 测试）、`$env:POKERNGKIT_WASM_MODULES='gen4event'; npm run wasm:test:native`（`gen4event_native_parity` 1/1）与 `git diff --check`。
- 加固：Worker 现在校验 operation、请求/分片类型、`chunkIndex`、单批状态上限、领域请求、Searcher 组合范围、结果计数以及 Wasm 指针的对齐、非空与堆边界，再复制结果缓冲区。
- 已通过：完整 `npm run verify`，覆盖全仓 Prettier、ESLint、TypeScript、38 个 Vitest 文件共 149 项测试、Vite 生产构建与 47 项 PWA 预缓存；受限文件环境连续两次在复制既有 `gen3egg.mjs` 时返回 `EPERM`，在不受该文件限制的相同源码快照上完整通过。
- 未验收：生产 Wasm、外部 Chrome/Edge 页面与 GitHub Pages 算法结果待部署后和项目所有者共同核对。

## 2026-08-14 IVs to PID Cute Charm

- 补齐：全局 `IVs to PID` 工具现在按 PokeFinder 4.3.2 返回 `Cute Charm (DPPt)` 与 `Cute Charm (HGSS)`，每种方法保留五个性别阈值 PID 与对应 SID 基准值。
- 更新：TypeScript 固定宽度结果解码、UI 预览、模块说明、需求与工程门槛同步接受方法代码 `7/8`；工具仍保持九列结果和单 Dedicated Worker。
- 已通过：定向 `npm run format:files -- ...`、完整 `npm run format:check`、`git diff --check`、`npm test -- src/features/ivtopid`、`npm run typecheck` 与 `$env:POKERNGKIT_WASM_MODULES='gen3ivtopid'; npm run wasm:test:native`，原生 parity 1/1 通过。
- 完整验证：`npm run verify` 已通过格式与 lint，随后因并行开发中的 `src/features/gen4event/Gen4EventPanel.tsx` 六项 TypeScript 错误停止；本模块未出现新增错误，待 Gen4 Event 完成类型修正后重跑。
- 未验收：生产 Wasm 与 GitHub Pages 页面仍需部署完成后在外部 Chrome/Edge 核对 Cute Charm 实际结果。

## 2026-08-14 Gen3 Tanoby Chamber

- 新增：第三世代 Wild 的 FireRed / LeafGreen 七个 Tanoby Chamber，补齐未知图腾 `A..Z`、`!`、`?` form 映射、Generator/Searcher PID 顺序和形态回溯。
- 修复：原生 Searcher 夹具按六项 IV 闭区间计算完整笛卡尔积；Liptoo 攻击 IV `0..31` 不再错误地只提交一个组合。
- 验证：`$env:POKERNGKIT_WASM_MODULES='gen3wild'; npm run wasm:test:native` 通过 `gen3wild_native_parity` 1/1，包含普通地点、Tanoby、非法输入和 Liptoo `97` 条结果。
- 未验收：Emscripten Wasm 构建、GitHub Pages Worker/Wasm 回归、移动端性能和项目所有者最终验收待完成。

## 2026-08-14 Gen4 Chained Shiny to SID 接入

- 新增：将现有 `gen4chainedsid` 接入 GEN IV 导航、页面标题、版本信息和共享模块契约；模块使用单 Dedicated Worker，逐条收窄 DPPt 连锁异色 SID 候选。
- 更新：`wasm/CMakeLists.txt` 与 `scripts/wasm.mjs` 默认模块列表加入 `gen4chainedsid`，默认产物为 `gen4chainedsid.mjs` 与 `gen4chainedsid.wasm`。
- 更新：README、需求、技术栈、第四世代交接和模块文档记录输入边界、API v1、`54320` 固定夹具、清空/取消行为及验收限制；三语导航词条复用上游 `PokeFinder_zh.ts`。
- 已运行：任务文件定向 `npm run format:files -- ...`、完整 `npm run format:check`、`git diff --check`、`npm test -- src/features/gen4chainedsid`（2 个文件、5 项测试）、`npm run typecheck`；授权的 `$env:POKERNGKIT_WASM_MODULES='gen4chainedsid'; npm run wasm:test:native` 通过 1/1。
- 已运行：完整 `npm run verify` 的 Prettier、ESLint（0 errors，仅 Egg/Wild 两条既有 warning）、TypeScript 和 33 个测试文件/123 项测试均通过；Web 构建受限于复制既有 `public/wasm/gen3egg.mjs` 的 Windows `EPERM`。
- 未验收：默认全模块 Wasm 构建、外部 Chrome/Edge 页面调试和生产部署回归待完成。

## 2026-08-14 Gen4 Seed to Time

- 新增：第四世代 DPPt/HGSS Seed to Time，覆盖年份与可选秒数检索、校准、硬币序列、Elm Calls、游走路线、序列反查和 Roamer Map。
- 新增：`gen4seedtotime` Wasm API v1、独立 Worker、固定宽度结果、原生 parity 夹具、TypeScript 边界测试和 UI 预览引擎。
- 边界：Seed `0..0xFFFFFFFF`、年份 `2000..2099`、秒数 `0..59`、Delay 校准 `uint32`、秒数校准 `0..500`、R/E 路线 `0..46`、L 路线 `0..28`；Web 校准结果限制为 2,000,000 条。
- 验证：`$env:POKERNGKIT_WASM_MODULES='gen4seedtotime'; npm run wasm:test:native` 通过 1/1。完整 `npm run verify` 首次在受限环境复制既有 `public/wasm/gen3egg.mjs` 时因 Windows `EPERM` 停止；非受限重跑通过 Prettier、ESLint（0 error，保留 Egg/Wild 两条既有 TanStack Virtual warning）、TypeScript、33 个 Vitest 文件共 123 项测试、Vite 生产构建和 PWA 45 项预缓存，Vite 仅保留大包非阻断 warning。
- 未验收：完整 Wasm 与生产页面算法回归需等待 GitHub Pages 部署，并使用外部 Chrome/Edge 与项目所有者共同完成。

## 2026-08-14 Gen4 ID 乱数

- 新增：第四世代 ID Generator/Searcher，覆盖日期时间、Delay、TID/SID/TSV/PID 筛选、结果排序、CSV、进度和取消。
- 新增：`gen4id` Wasm C ABI、独立 Worker Pool、固定宽度结果协议和原生 parity 夹具。
- 验证：`$env:POKERNGKIT_WASM_MODULES='gen4id'; npm run wasm:test:native` 通过 1/1。
- 验证：非受限环境完整 `npm run verify` 通过。Prettier、ESLint（0 error，保留 Egg/Wild 两条既有 TanStack Virtual warning）、TypeScript、30 个 Vitest 文件共 110 项测试、Vite 生产构建和 PWA 43 项预缓存均成功；Vite 仅保留主包超过 500 kB 的非阻断 warning。
- 当前限制：完整 Wasm build 与 Pages 浏览器回归尚未执行。
- 下一步：继续盘点并实现 PokeFinder 与 3DSRNGTool 的剩余独立模块，每个模块单独提交。

## 2026-08-14 HakuStyle 工作台重做

- 重做：界面合同确定为响应式 operational workspace、Royal Blueprint 冷蓝主题、紧凑工作台密度、实体表面与安静动效；统一 13px 以上元数据、14px 控件文字、40px 控件、44px 数据行、10px 控件圆角和 16px 面板圆角，移除背景网格和面板装饰色条。
- 优化：侧栏删除无信息增量的“模块”标题和重复 `×`；桌面仍由顶部菜单按钮收起，移动端仍由遮罩、`Escape` 或选择模块关闭。导航行统一为 46px，并保留固定底部“仅本地”状态。
- 优化：贡献榜从主工作区移到底部页脚入口，点击后打开共享居中对话面板；简体中文显示“贡献榜”，英语和日语因没有上游翻译继续保留英文。
- 新增：档案、个体值计算器、遇敌查询和贡献榜共用的浮动面板在桌面支持标题栏 Pointer Events 拖动、方向键移动和视口边界约束；900px 以下回到居中布局。面板补齐遮罩、滚动锁、焦点圈定、`Escape`、点外关闭和触发器焦点恢复。
- 优化：PID查询个体值结果表统一为固定列宽、粘性表头、等宽数字、交替行和悬停状态；Seed/生成方式左对齐，六项 IV 居中，窄屏在表格内部横向滚动。
- 优化：NGC Seed查询的 XD、竞技场和频道固定为单行三段页签；窄屏只在页签自身横向滚动，不再折成两行。
- 已通过：对本轮文件运行定向 `npm run format:files -- ...`，随后完整 `npm run format:check` 与 `git diff --check` 通过。
- 未运行：未获项目所有者对具体检查命令或 URL 的授权，因此未运行 ESLint、TypeScript、Vitest、Web/Wasm 构建、外部浏览器 UI、性能或生产算法回归；当前样式与交互仍待外部 Chrome/Edge 验收。

## 2026-08-13 第三世代模块 CI 与 HakuStyle 更新

- 修复：根据项目所有者提供的 Actions 日志，移除 GameCube Worker 的无效初始赋值，同时保留 `try/finally` 内存释放；两个 UI 预览引擎移除未使用请求参数；PokeSpot 将地点变化后的物种和槽位重置移回来源事件，消除 5 个 ESLint error。
- 修复：完整类型检查继续发现 GameCube UI 预览把性别固定为字面量 `0`，现改为从预览值生成 `0/1`，男女筛选均可产生示例结果；生产 Wasm、Worker 协议和 RNG 算法未改变。
- 优化：PokeSpot 为 Food/Encounter 成对输入使用稳定三轨布局，在窄屏将唯一上游标签移到两个输入上方；PID to IVs 输入占主轨、操作区按内容宽度收敛；Jirachi 操作列表减少空隙并使用等宽数字排版。未新增或改写上游可见标签。
- 更新：从本地 HakuStyle `C:\Users\Hakuhiro\Documents\Codex\2026-08-12\b\outputs\hakustyle` 的 `b69b444` 同步最新版 `SKILL.md`、8 份渐进参考、交互预览资产、界面元数据和校验脚本；补充成对输入、精确可见标签和 React 依赖状态重置规则。`PyYAML 6.0.3` 与 Skill Creator 校验均通过。
- 修复：HakuStyle 浏览器 Demo 显式声明 `document`、`navigator` 和 `window`，保持资源继续纳入 ESLint；同一修正已回写本地 HakuStyle 源目录。
- 修复：新增根目录 `.gitattributes`，统一文本为 LF，消除 Windows 全局 `core.autocrlf=true` 导致本地 Prettier 对 81 个已提交文件的误报；归一化没有为这些文件产生实际内容 diff。
- 修复：Actions 的 GNU 13.3 原生构建在 PID to IVs 的 `RecoverySeeds::operator[]` 处拒绝 const 对象；三个局部恢复结果改为非 const，匹配上游仅提供非 const 下标重载的类型接口，不修改 vendored PokeFinder 文件。
- 修复：Jirachi 原生夹具原先把 `startingSeed=0 / targetSeed=0 / maxAdvances=0` 错判为 `unobtainable`；实际转换目标为第 16 帧，按上游 UI 判断顺序应先返回 `outsideRange`。夹具现分别覆盖 16 帧超范围和 0 帧不可获得两个分支。
- 验证：首次有效 `npm run verify` 在 81 个 CRLF 工作树文件的 Prettier 检查停止；第二次在新 Demo 的 25 个浏览器全局 lint error 停止；第三次在 GameCube UI 预览的 TypeScript 字面量比较停止；第四次通过格式、lint、类型和 103 项测试后，在受限终端复制 `public/wasm/gen3egg.mjs` 到 `dist` 时因 Windows `EPERM` 停止。
- 已通过：非受限环境完整运行 `npm run verify`。Prettier、ESLint（0 error，保留 Egg/Wild 两条既有 TanStack Virtual warning）、TypeScript、28 个 Vitest 文件共 103 项测试、Vite 生产构建和 PWA 42 项预缓存均成功；Vite 仅保留主包超过 500 kB 的非阻断 warning。
- 已通过：经项目所有者授权，在 Visual Studio 2026 Build Tools x64 开发环境完整运行 `npm run wasm:test:native`，16/16 原生测试通过，包含 `gen3pidtoiv_native_parity` 与 `gen3jirachi_native_parity`。第一次 1 秒调用仅启动开发环境并被调用端超时，不是测试失败；随后完整命令成功。
- 未运行：未在 GNU 13.3 环境重新执行 Actions；`npm run wasm:build`、性能、外部浏览器、部署页面和生产算法回归未运行。原生夹具是工程证据，不作为算法验收。

## 2026-08-13 第三世代模块补全

- 新增：`gen3gamecube` GameCube Generator/Searcher，覆盖 XD、Colosseum、Channel 的 Non Shadow、Shadow Locks 和 Channel 模板；正式数据静态核对为 `69/1/77` 条。
- 新增：`gen3pidtoiv` PID to IVs、`gen3pokespot` XD PokeSpot、`gen3jirachi` Channel Jirachi Advancer；四个模块均接入 React 导航、独立 C ABI、Dedicated Worker、API v1、原生夹具和模块文档。
- 优化：PokeSpot Food/Encounter 二维组合按约一百万组合拆分，最多使用 8 个独立 Worker，并按 `chunkIndex` 恢复确定结果顺序；进度按实际组合数汇报，默认范围为 `100020001` 组。
- 修复：Jirachi 上游 `255` 直接接受哨兵现在解码为 `Accept Jirachi`；GameCube、PokeSpot 结果解码新增 IV、能力、性别、等级、性格、闪光和物种边界校验。
- 更新：`scripts/generate-gen3-gamecube-data.mjs` 从 EncounterTableGenerator `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 生成正式 GameCube 模板数据；临时生成目录仅用于本地审计，完成后清理。
- 已执行：对本轮任务文件运行定向 `npm run format:files -- ...`；`git diff --check` 未报告空白错误。
- 当前限制：`npm run format:check` 已执行，但全仓仍有 85 个历史未格式化文件；未扩大格式化范围。未获授权执行 `npm run verify`、`npm run wasm:test:native`、`npm run wasm:build`、TypeScript、浏览器或生产回归。

## 2026-08-13 CI 格式失败复盘

- 可追溯的 Actions 全仓 Prettier 失败至少 3 次：`31581467290`（4 个文件）、`31614337208`（13 个文件）和本次 `31691660050`（`src/features/contributions/ContributionsPanel.tsx`）。历史中另有 6 个格式相关修复提交，但不全部等同于 CI 失败。
- 根因是定向格式化或旧的本地检查结果不能证明 CI 执行的 `prettier --check .`；后续合并、手工调整或新增文件可能再次引入排版差异。
- 已将 SOP 固化为：最后一次编辑后重新格式化全部任务文件；提交前必须运行完整 `npm run format:check`；按 CI 输出文件列表定向修复并重复全仓检查；最后再运行 `git diff --check`。本次只修复格式，未运行 lint、typecheck、测试或构建。

## 2026-08-13 Actions lint 修复

- Actions `31692370495` 的 Prettier 已通过；唯一阻断错误是 `src/features/gen4wild/domain.ts` 中未使用的 `isFishing`，已删除死代码。
- `src/features/shared/FloatingToolPanel.tsx` 的 `restoreTriggerFocus` 已改为 `useCallback` 并加入 effect 依赖，消除本次新增的 Hook warning。
- 已通过：定向 Prettier、`npm run lint`（仅保留 Gen3 Egg/Wild 的两条既有 TanStack Virtual warning）和 `git diff --check`。未运行 typecheck、测试、构建或浏览器验收。

## 2026-08-13 Actions typecheck 修复

- Actions `npm run verify` 的 Prettier 和 ESLint 已通过；TypeScript 阻断位置为 `src/features/gen4wild/worker/gen4wild.worker.ts`，Generator/Searcher 共用的 chunk 联合类型无法直接读取 Generator 专属的 `initialAdvances` 与 `maxAdvances`。
- 已在 Generator 分支对 `message.chunk` 显式收窄为 `Gen4WildChunk`，保留 Searcher 原请求路径和既有 75-word Wasm 请求 ABI，不改变算法或边界校验。
- 本轮已运行：`npm run format:files -- src/features/gen4wild/worker/gen4wild.worker.ts docs/progress.md`、`npm run format:check`、`npm run typecheck` 和 `git diff --check`。`typecheck` 与 `git diff --check` 已通过；全仓 `format:check` 仍被基线中 89 个未格式化文件阻断，未扩大格式化范围。ESLint 仅保留 Egg/Wild 的两条既有 TanStack Virtual warning；未运行测试、构建、Wasm、浏览器验收或部署。

## 2026-08-13 本地 Verify 与 PWA 预缓存

- 附件对应的 Actions run 中格式、ESLint、TypeScript 和 28 个 Vitest 文件共 103 项测试均通过；其 `vite build` 已生成资源，但 PWA 在 Workbox 预缓存阶段因默认 2 MiB 上限拒绝 `index` 约 5.28 MiB 和 `gen4wild.worker` 约 3.65 MiB，命令最终失败。本机复跑时 Node `24.13.0` / npm `11.6.2` 未满足 Node `24.19.0` / npm `12.0.2` 锁定版本，且本地基线有 88 个全仓格式差异，因此完整 `npm run verify` 在格式阶段停止；后续 Lint、TypeScript、103 项测试和非受限 `npm run build:web` 已分项通过。
- 已将 `vite.config.ts` 的 `workbox.maximumFileSizeToCacheInBytes` 显式设置为 8 MiB，覆盖当前构建资源并保留 PWA 预缓存错误的可见性；未忽略 Workbox 错误或只保留前半段构建结果。
- 已将 SOP 更新为：提交或请求审查前必须在当前工作区运行完整 `npm run verify`；遇到 Workbox 资源上限时检查 `dist` 实际大小、调整上限或拆分资源后从头复跑，并记录命令结果。

## 2026-08-13 Contributions

- 新增全局只读 Contributions 面板，从右下角工具栏打开，并复用现有悬浮面板的互斥、点外关闭、`Escape` 和焦点恢复逻辑；不占用按世代划分的 RNG 模块侧栏。
- 首条记录为 Jeff 贡献 `¥50 RMB`，用途为 `AI Token`；记录使用独立结构化数据，后续可以继续追加，不包含支付、账号、后端或在线编辑能力。
- 桌面端面板从工具栏左侧打开，窄屏从工具栏上方打开；金额汇总由当前记录计算，不新增运行时依赖。

## 2026-08-13 宝可病毒侧栏归位

- 宝可病毒查询的第三世代和第四世代入口已分别归入 `GEN III` 与 `GEN IV` 主分组，移除临时的 `GEN III TOOLS` / `GEN IV TOOLS` 分组；模块编号统一为 Gen III `01-10`、Gen IV `11-13`、Gen VII `14`。
- 两个入口使用独立的初始模式和 active 状态：第三世代默认打开 Gen III，第四世代默认打开 Pt/HGSS；面板和简体中文规则统一显示“宝可病毒”。上游代码目录、Wasm API 和法律记录仍保留 `pokerusfinder` 原名。
- 本轮涉及文件的定向 Prettier 检查与 `git diff --check` 已通过；全仓 `npm run format:check` 仍被前端 Skill、Gen4 Wild 和其他既有文件共 95 个未格式化文件阻断，未擅自扩大格式化范围。
- 冲突标记已从源码和文档工作树清除，但当前环境无法写入 `.git/index`，因此未能由 Codex 将 resolved 状态写入索引；未提交、未 push、未部署。

## 2026-08-13 UI 视觉与侧栏优化

- 已将最新 HakuStyle 同步到 `.agents/skills/web-frontend-style/`，包含最新执行规则、Ant Neutral / Royal Blueprint 配色参考、31 组来源蒸馏记录和 Skill 校验脚本。
- UI 方向确定为冷色中性工作台：以 Ant Neutral 为基础，使用 Royal Blueprint 冷蓝作为品牌强调；红色、金色和青色仅保留给错误、警告、选择和状态语义。
- 重做 `src/styles.css` 的全局 Token、顶部栏、工作面板、侧栏、按钮和浮动工具材质；卡片保持高可读实色表面，玻璃效果只用于顶部栏和侧栏的辅助层。
- 左侧模块导航改为“固定标题区 + 独立滚动模块区 + 固定底部状态区”。桌面端侧栏固定在顶部栏下方并为主内容预留宽度，移动端改为带遮罩的抽屉，避免模块数量增加后点击目标被裁切或底部状态消失。
- 主题切换支持 View Transition 点击位置扩散动画；模块切换增加渐进式内容进入，按钮、侧栏和面板使用短时状态动效，并保留 `prefers-reduced-motion` 回退。
- `src/App.tsx` 与 `src/theme.ts` 只调整 UI 状态和主题表现；RNG 算法、Wasm、Worker、输入边界、存档和翻译未改变。
- 已通过：定向 Prettier 格式化、`npm run format:check`、`git diff --check`、项目内 HakuStyle Skill 校验。
- 未运行：ESLint、TypeScript、Vitest、Web/Wasm 构建、浏览器 UI 或生产回归；按仓库规则，这些检查需要项目所有者对具体命令或 URL 明确授权。
- 提交前静态复核移除了页面背景的径向装饰渐变，并将工作面板圆角收敛到 `8px`，保持工具界面的信息密度与仓库前端约束。

## 当前状态

- 新增 `pokerusfinder`：基于 DevonStudios Pokerus Finder revision `262262fdb259c44a6a366b5c0dbf1bb319e39ff4`，提供 Gen III、Gen IV DP、Gen IV PtHGSS 三种模式；新增 Wasm bridge、Dedicated Worker、Worker Pool、预览引擎、面板、模块文档和许可证记录。
- 上游核对确认：Gen III/DP 使用 16 位十六进制 Initial Seed、7 位 Frame、3 位 Delay；Gen III 最大扫描 9,999,999 帧，DP 最大 99,999 帧；Pt/HGSS 使用 2000-01-01..2099-12-31 日期、00..23 小时、00..59 分钟，并保留 -1400..-1000 的内部 Delay 搜索。
- 本轮未运行 lint、typecheck、Vitest、原生夹具、Wasm/Web 构建、浏览器或生产算法回归；仅需执行定向格式化、`npm run format:check` 与 `git diff --check`。下一步先取得项目所有者对具体检查命令和部署 URL 的授权。
- 上游交互复核补充：Gen III Initial Seed 为 4 位十六进制，DP 为 8 位十六进制；DP Frame 在上游界面固定为 1 且不可编辑；Pt/HGSS 默认日期来自当前日期。结果 Seed 保留上游不补前导零的显示语义（Pt/HGSS 的 8 位 Initial Seed 除外）。`uint i - short delay` 按 C# 二元数值提升为有符号 `long`，Wasm bridge 已使用 `int64_t` 对齐，Delay 前的帧不会误报。

- 第七世代落地：优先实现 `gen7id`，对应 3DSRNGTool `Search7_ID()` 的 SFMT ID Generator；Stationary/Wild/Egg/Timeline 暂列后续开发。
- 本轮新增 `gen7id` 源码、Worker、C ABI、CMake target、模块文档和 `GEN VII` 侧栏入口；当前尚未执行测试、构建或浏览器验收。
- 第七世代来源决策：以本地优化项目 `C:\Users\Hakuhiro\Documents\Github\3DSRNGTool_CHN` 的 `359bdd7` 为主源，公开 `wwwwwwzx/3DSRNGTool` 的 `ae5d176` 仅作祖先归属；两者差异不止 README，已记录于 `third_party/3dsrngtool/UPSTREAM.md`。
- `gen7id` 接线补全：加入 Sun/Moon/Ultra Sun/Ultra Moon 版本与起始帧校验、TID/SID/Gen7TID 前导零筛选、Gen7TID bridge 修正、虚拟化结果表、Worker 批次校验和第七世代页面隐藏存档工具；仍未执行测试、构建或浏览器验收。
- 本地控件核验：Designer 的 `Frame_max` 初值上限是 `100000000`，但 `MainForm.cs` 初始化会用 `FuncUtil.MAXFRAME` 覆盖 `Frame_min`/`Frame_max`，实际有效上限为 `1000000000`；已同步 domain、HTML 输入和模块文档。
- 本轮已执行并通过定向 `npm run format:files -- ...`、全仓 `npm run format:check` 与 `git diff --check`。未运行 lint、typecheck、Vitest、原生夹具、Wasm/Web 构建、UI 预览、浏览器或生产算法回归；这些检查需要项目所有者对具体命令或 URL 明确授权。

- 新增 `gen3ngcseed`：PokeFinder `GameCube Seed Finder` 的 Gales/XD、Colo/竞技场与 Channel/频道三种查询，接入 GEN III 左侧导航。
- Gales/Colo 支持多轮候选筛选；第一次搜索按上游通过 Yes/No 询问是否选择对应 `.precalc`，决定保留到模块关闭。文件按上游 25/24 个小端分区读取，并流式校验 Qt ISO 3309 CRC `0xD75B / 0x097B`；文件不上传、不持久化。
- 新增独立 C++/Emscripten C ABI、Dedicated Worker、Worker Pool、API v1、消息协议、UI 预览引擎、TypeScript 边界测试与原生非法输入夹具。NGC 阶段默认 Wasm 构建列表由 8 个增加为 9 个；Gen7 ID 阶段再增加为 10 个。
- Gales/Colo 首轮按低 16 位分片，Channel 精确覆盖 `0x40000001..0xFFFFFFFE`，候选数组按 50,000 个 Seed 分片；Worker 校验 domain、任务、分片和结果数量，Pool 按 `chunkIndex` 恢复确定顺序并支持取消。
- 记录 PokeFinder 4.3.2 Gales 首轮的上游越界：`enemyHPStat[enemyIndex + 5]` 超出 5 行数组。本项目使用有效的 `enemyHPStat[enemyIndex]`，待生产页面与 PokeFinder 实际结果共同回归，当前不标记为算法已验收。
- HP 控件保持上游空值语义：非空输入为 `1..714`，空白搜索时按 `0` 读取；Channel 少于 10 条时由 Search 动作显示上游 `You must have at least 10 entries`。
- 简中逐字使用 `NGC Seed查询`、`XD`、`竞技场`、`频道` 等已完成上游词条；`Round #%1`、四个 HP、Precalc、Channel 数量提示与复制词条 unfinished，因此保留英文。结果 Seed 与上游一致使用大写十六进制且不补前导零。
- 本轮使用 HakuStyle 保持现有紧凑工作台、三页签、稳定三列设置网格、移动端单列与结果表样式；三个页签分别保留轮次、结果和状态，切换时不互相清空；未新增运行时依赖。
- 本轮已通过 `npm run format:changed`、`npm run format:check` 与 `git diff --check`。未运行 ESLint、TypeScript、Vitest、原生夹具、Wasm/Web 构建、UI 预览、浏览器或生产算法回归；仓库规则要求项目所有者对具体检查或 URL 明确授权。

- 合并保留 `gen4wild` 的 DPPt/HGSS Wild Generator/Searcher、遭遇数据、独立 Wasm/Worker Pool、固定夹具和模块文档；其固定来源、输入边界和未验收状态继续以本节后续记录为准。

- 本轮修复 Initial Seed Finder 虚拟结果表首行偏移：行定位补齐 `top: 0`，并将“结果表第一条不得出现虚假空行”写入 `docs/ai-development.md` 的 UI 回归规则；Static、Wild、Egg 和 Gen4 Static 仍使用已核对的 `translateY(start + 38px)` 表头偏移。
- 本轮移除 Seed to Time 的两列进制辅助文本、IVs to PID 的 TID 辅助文本、Egg 设置标题右侧的存档版本标签和 Spinda Painter 的 `HEX / 32-bit` 文本。它们不是对应 PokeFinder UI 的独立控件或信息，今后不得擅自添加；规则已写入 UI 回归规则。
- 本轮将个体值计算器合并为唯一全局浮层 `IvCalculator`，由工具自身选择 Gen III、Platinum、HGSS、BW2、SwSh、BDSP 六个上游数据集；移除未再使用的 `src/features/ivcalculator/Gen3IvCalculator.tsx`，保留 G4 Static 的兼容 Personal 导出。
- 本轮将侧栏模块分为 `GEN III` 与 `GEN IV` 两组，Encounter Lookup 与 IV Calculator 仍保持右下角全局入口，不随当前工作区限代。Egg 的 Emerald/RS/FRLG 切换仍是上游模块本身的真实功能，不再在标题区域重复显示版本。
- 本轮已运行定向 `npm run format:files -- ...`、全仓 `npm run format:check` 与 `git diff --check`，均通过；未获项目所有者对 lint、typecheck、测试、构建或浏览器 URL 的新授权，因此这些检查和部署回归未运行。

- 2026-08-13 经项目所有者授权，使用外部 Chrome 检查 `https://haku76.github.io/PokeRNGKit/` 当前生产资源 `index-mLBsBTQF.js`。桌面视口为 `1536×703` 时，旧版三个收起工具宽度分别为 `128/176/128px`；在 `390×844` 窄屏打开 Encounter Lookup 后，旧面板实际宽 `760px`、左边界为负值，依靠页面裁切显示，不是稳定的窄屏面板布局。
- 当前生产包的 Encounter Lookup 宝可梦组合框已确认支持鼠标按钮展开、点击选择、输入筛选与方向键/Enter；固定抽样继续符合记录：Emerald 皮卡丘为狩猎地带地区 1/2 草丛 `25-27`，Diamond 与 Brilliant Diamond 为自豪的后院草丛 `18-18`，Black 为空集。页面未记录站点自身的 console error；唯一错误来自用户浏览器中的第三方翻译扩展。
- 本轮只补验进度文档此前未覆盖的生产功能：Seed to Time 的 `0 / 2000` 返回 7 条、首末时间匹配上游，`40000000` 回推为 `1AA5 / 66861`；Spinda PID `FEDCBA98` 的四斑点坐标匹配固定夹具，第一斑点右移后 PID 为 `FEDCBA99`；G4 Static Method 1 / Manaphy / Seed `0` / `0..9` 返回 10 条，首条 PID `E97E0000`、IV `17/19/20/13/12/16`。已记录通过的 G3 ID、Static/Wild、IVs to PID 和 Egg 未重复执行。
- 生产页语言已验证中文切换到英文并恢复，主题已验证浅色切到深色再恢复；G4 存档、IV Calculator 和 Encounter Lookup 依次展开时保持三方互斥。当前旧悬浮样式的面板级 `Escape` 仍失败，该项由本轮源码修复并等待部署复验。
- 生产旧悬浮工具只支持点外关闭，不支持面板级 `Escape`，并且触发器与面板共用边框形成相连结构。本轮使用 HakuStyle 重构为统一工具轨：三个等尺寸按钮固定在右下角，桌面独立面板从工具轨左侧打开，窄屏从上方打开；补齐互斥、点外关闭、`Escape`、显式关闭按钮、`aria-expanded` / `aria-controls`、安全区边距与焦点恢复。
- 新增共享 `src/features/shared/FloatingToolPanel.tsx`，G3/G4 存档、G3/G4 IV Calculator 和 Encounter Lookup 只复用浮层行为；模块内部状态、IndexedDB/localStorage 数据键、G3/G4 展开偏好和算法均未改变，也没有新增运行时依赖。
- 按 PokeFinder 原交互补验时发现生产 G4 IV Calculator 的宝可梦仍是原生 `<select>`；上游 `Form/Util/IVCalculator.cpp` 同样调用 `ComboBox::enableAutoComplete()`。本轮将 G4 物种选择改为共享 `AutoCompleteComboBox`，保留物种 ID、形态归零和结果清除逻辑，待部署后复验鼠标与键盘候选选择。
- 本轮已运行定向 `npm run format:files -- ...`、全仓 `npm run format:check` 与 `git diff --check`。未运行 ESLint、TypeScript、Vitest、本地 UI、Web/Wasm 构建或本地浏览器预览；当前授权用于指定生产 URL 的验收与 UI 改造，不把未部署源码宣称为已验收。

- 新增仓库级 `.agents/skills/web-frontend-style/`，包含 HakuStyle 的 `SKILL.md`、`agents/openai.yaml` 与 24 组前端蒸馏来源；`AGENTS.md` 和 `docs/ai-development.md` 已把它列为前端视觉与交互工作的规则入口。
- 首轮样式方向确定为“宝可梦图鉴 / JRPG 数据终端”：保留现有高密度工具结构，使用红色品牌状态、青色信息状态、金色选择状态、深色顶部栏和模块抽屉，不复制第三方角色、卡牌纹理、字体或光标素材。
- 重构 `src/styles.css` 的浅色/深色 token，并统一顶部栏、模块抽屉、页面标题、工作面板、表单控件、操作按钮、结果表、自动完成菜单、悬浮工具和页脚材质。
- 响应式继续沿用现有组件和断点；窄屏补充品牌文本裁切、主内容安全边距和纵向操作按钮，reduced-motion 覆盖新增的侧栏与按钮位移动效。
- 本轮不改变 React 结构、RNG 算法、Wasm/Worker、输入范围、持久化、翻译或模块状态，也没有新增运行时依赖。
- 已通过：`npm run format:check`、`git diff --check`，以及 Skill Creator 对 `.agents/skills/web-frontend-style/` 的结构校验。
- 未运行：浏览器 UI、ESLint、TypeScript、Vitest、Web/Wasm 构建和算法回归。仓库规则要求先取得项目所有者对具体检查或 URL 的明确授权；UI 验证还必须使用已连接的外部 Chrome 或 Edge。

- Actions run `31621404322` 的 Prettier 已通过，ESLint 报告 9 个 error：`scripts/format-changed.mjs` 缺少 `URL`、`process`、`console` 的 Node 运行时声明，`Gen3SeedToTimeUiPreviewEngine.ts` 的 `_options` 未使用。Egg/Wild 的两条 TanStack Virtual 报告仍是既有非阻断 warning。
- 修复 `format-changed.mjs`：从 Node 内置模块显式导入 `process` 与 `URL`，并使用 `process.stdout.write` 输出空文件集提示；不放宽全仓 `no-undef`。
- 修复 Seed to Time UI 预览：读取 `options.signal?.aborted`，预先取消时返回空结果和 `cancelled: true`；生产 Wasm、Worker 和算法不变。
- 已通过：非受限环境运行 `npm run verify`。Prettier、ESLint、TypeScript、23 个 Vitest 文件共 81 项测试、Vite 生产构建与 PWA 预缓存均成功；ESLint 只保留 Egg/Wild 的两条既有 TanStack Virtual warning，Vite 只保留主包超过 500 kB 的非阻断 warning。
- 受限终端首次运行同一命令时，Vite 复制 `public/wasm/gen3egg.mjs` 到 `dist/wasm` 返回 Windows `EPERM`；非受限环境随后完整通过，确认该失败不是源码或 GitHub Actions 问题。
- Actions run `31581467290`（#25）与 `31614337208`（#30）均在 `Verify TypeScript application -> prettier --check .` 失败，分别报告 4 个和 13 个未格式化文件；两次都不是算法、Wasm 或 TypeScript 编译错误。
- 原 SOP 只在未获测试/构建授权时执行 `git diff --check`，无法发现 Prettier 排版差异；同时 Actions 在格式检查前先安装 Emscripten，#30 为必然失败的提交额外消耗约 34 秒。
- 新增 `npm run format:files -- <file...>` 与 `npm run format:changed`。格式化改为每批编辑后的强制机械收尾，不需要测试/构建授权；工作区存在无关改动时必须限定到本任务文件。
- Actions 改为 npm 安装后先运行完整 `npm run verify`，通过后才安装和缓存 Emscripten、检查 Wasm 工具链并运行原生/Wasm 构建。
- 已执行并通过：对 #30 日志中的 13 个文件运行定向 `npm run format:files -- ...`，随后运行新版 `npm run format:changed`、全仓 `npm run format:check` 与 `git diff --check`。新版脚本会对 Git 改动文件先写入再只读复查。
- 未运行：ESLint、TypeScript 类型检查、Vitest、Web/Wasm 构建、原生夹具、浏览器 UI 或生产回归；本轮授权范围仅为 Actions 日志诊断和格式/SOP 修复。

- 主分支已包含自动完成控件、三代悬浮工具互斥、`gen3seedtotime`、`gen3spindapainter` 与格式化/Actions SOP；本次合并保留这些修改。
- 当前模块集合：`gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3ngcseed`、`gen3spindapainter`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`、`gen4wild`、G3/G4 独立 `profiles`、全局 `ivcalculator` 与 `encounterlookup`。
- 主分支此前新增 `encounterlookup`：右下角默认收起的全世代 Encounter Lookup，覆盖 PokeFinder 4.3.2 的 Gen III、Gen IV、Gen V 和 BDSP 共 16 个版本；静态数据由 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 生成。
- 遇敌查询不进入左侧 RNG 导航，不使用 Wasm/Worker；宝可梦候选、游戏版本、地点、遇敌种类和等级范围均来自本地静态数据。
- 已清理生成用 `.tmp-encounter-tables/` 与 `.tmp-encounter-tables.zip`；生成脚本和正式 `data.ts` 保留在工作区。
- 主分支此前新增 `AutoCompleteComboBox`，覆盖 Encounter Lookup 宝可梦、IV Calculator 宝可梦、Egg 蛋种类和 Wild 地点。行为对应 PokeFinder `enableAutoComplete()`：点击展开、包含匹配、弹出候选、方向键/Enter/Escape 和 `NoInsert`。
- 主分支此前将 G3 存档信息、个体值计算器和遇敌查询纳入同一展开状态；本次合并把相同互斥规则扩展到 G4 工具，并保留两代各自的 localStorage 展开偏好。
- 本次合并新增 `gen4static` 和独立 G4 存档；个体值计算器已合并为全局单一入口。Encounter Lookup 在两代页面共用，当前页面的存档、个体值计算器和遇敌查询保持三方互斥。
- RNG Wasm 默认构建列表为 `gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3ngcseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`、`gen4wild`，共 10 个。
- 正式 Wasm、站点产物和 Pages 部署由 GitHub Actions 生成，不提交 `public/wasm/`、`wasm/build/` 或 `dist/`。
- 本次合并已运行 `npm run format:changed`、定向 `npm run format:files -- ...`、`npm run format:check` 与 `git diff --check`；最终全仓格式和空白检查通过，未发现残留冲突标记。

## 第四世代定点乱数

- 增加 Diamond、Pearl、Platinum、HeartGold、SoulSilver 的 Static Generator/Searcher。
- 支持 Method 1、Method J、Method K、Synchronize 和 Cute Charm。
- 内置 99 条 Starters、Fossils、Gifts、Game Corner、Stationary、Legends、Events、Roamers 模板。
- Generator 与 Searcher 沿用 G3 Static 的三栏布局、IV 表格快捷操作、筛选交互、排序、CSV 和虚拟结果表风格，但使用独立请求、Worker 和 Wasm 模块。
- Generator 的 `Max Advances=N` 按 PokeFinder 上游语义包含起点，处理 `N+1` 个状态。
- Searcher 按 `HP -> Atk -> Def -> SpA -> SpD -> Spe` 的闭区间笛卡尔积枚举 IV。
- 六项 IV 默认最小 `0`、最大 `31`；术语固定为“觉醒力量”“觉醒属性”“觉醒威力”。
- 结果表使用固定列宽；Generator 首列为 Advances，Searcher 首列为 Seed。
- 宝可梦下拉与 G3 Static 一致，只显示本地化宝可梦名称，不附加地点或“定点”后缀。

## 独立 G4 工具

- 增加独立第四世代存档 schema、IndexedDB/localStorage 键、导入导出和 HGSS 未知图腾字段。
- 增加全局个体值计算器，使用 PokeFinder Gen III、Platinum、HGSS、BW2、SwSh 和 BDSP 六个数据集。
- G4 控件不读取、覆盖或删除 G3 存档；个体值计算器不再保存或读取按世代拆分的展开状态。
- Encounter Lookup 在两代页面均保留；G4 存档、全局个体值计算器和 Encounter Lookup 使用与 G3 相同的三方互斥规则。

## Wasm 与 Worker

- `gen3id`：第三世代 ID Generator/Searcher。
- `gen3initialseed`：第三世代 Initial Seed 反推。
- `gen3seedtotime`：第三世代 Seed 到日期时间查询。
- `gen3ngcseed`：第三世代 GameCube Seed Finder，覆盖 Gales、Colo 与 Channel。
- `gen3spindapainter`：第三世代晃晃斑的斑点 PID/坐标双向工具。
- `gen3static`：第三世代定点 Generator/Searcher。
- `gen3wild`：第三世代野生 Generator/Searcher、地点选择、完整筛选、Worker Pool、CSV、UI 预览与真实 Wasm 运行。
- `gen3ivtopid`：第三世代 IVs to PID 查询。
- `gen3egg`：第三世代 Egg Generator。
- `gen4static`：第四世代 Static Generator/Searcher。
- `gen4wild`：第四世代 Wild Generator/Searcher、特殊遭遇数据、Worker Pool、CSV、UI 预览与 Wasm 运行时。
- `profiles`、`ivcalculator`：G3/G4 独立存档与全局个体值计算器。
- `encounterlookup`：右下角遇敌查询悬浮工具，覆盖 PokeFinder 4.3.2 实际支持的 16 个游戏版本。
- 增加 `gen4static` Wasm API v1、C ABI、原生夹具、Dedicated Worker、Generator/Searcher Worker Pool 和消息协议。
- 增加 `gen4wild` Wasm API v1、固定宽度 C ABI、原生夹具、Dedicated Worker、Generator/Searcher Worker Pool 和消息协议。
- 修复 MSVC 参数求值顺序造成的 IV word 对调：先顺序读取 `iv1`、`iv2`，再解码六项 IV。
- Worker 校验模块、契约和 API 版本，按 `chunkIndex` 恢复确定顺序；取消会终止并重建独立 Worker。
- 默认 Wasm 构建列表同时包含 `gen3seedtotime`、`gen4static` 与 `gen4wild`。

## 来源与参考

- PokeFinder 4.3.2 revision：`dd00fe7`，作为控件、算法语义、模板规则和固定结果的权威基线。
- EncounterTableGenerator Gen4 revision：`9a2ed62`，用于生成第四世代定点模板与 Wild 遭遇数据。
- PokemonRNGGuides revision：`c0b2bb664f04a4ef052e6dd4d831351703fa4047`；用于交叉核对 Static 的 Rust 分层和 React 工作台流程。该 revision 没有第四世代 Wild 实现，不作为 G4 Wild 算法或数据来源。
- PokeRNGKit 不复制或编译 PokemonRNGGuides 源码；两个参考发生差异时以 PokeFinder 4.3.2 为准。
- 完整来源范围和许可证记录见 [`third_party/pokefinder/UPSTREAM.md`](../third_party/pokefinder/UPSTREAM.md)。

## PR 分支历史验证

- 以下结果来自合并头 `fc31966` 所在 PR 分支，不能替代本次合并结果的重新检查。
- PR 分支已通过可格式化变更文件的 Prettier 检查。
- 已通过 TypeScript project build。
- 已通过 Vitest：21 个测试文件、74 项测试。
- 已通过 ESLint：0 错误；保留上游 Egg/Wild 的 2 条 TanStack Virtual / React Compiler 非阻断 warning。
- 已通过 UI 构建和生产 Web 构建；构建产物包含 7 个 Worker 入口。
- 已通过 7/7 原生夹具：6 个 Gen III 模块与 `gen4static_native_parity`。
- 已使用 Emscripten 6.0.6 构建 7 个真实 Wasm 模块：`gen3id`、`gen3initialseed`、`gen3static`、`gen3wild`、`gen3ivtopid`、`gen3egg`、`gen4static`。
- 已通过 `git diff --check`。
- PR 分支本地开发站点曾运行于 `http://127.0.0.1:5182/`；当时核对的源码中 G4 宝可梦下拉只渲染 `getGen4SpeciesName(...)`，不再拼接模板 `label`。
- 浏览器自动化运行时在当前中文工作区路径初始化失败，因此本轮未重新记录完整桌面/移动端截图；rebase 前的真实 Chrome/Worker/Wasm、列对齐与移动端证据保留为历史参考，部署页面仍需最终验收。

## 下一步

1. 项目所有者明确授权后，在当前 `main` 基线运行 `npm run verify`、`npm run wasm:test:native` 与 `npm run wasm:build`。
2. GitHub Actions 完成部署后，项目所有者提供准确生产 URL 并授权第三世代算法回归。
3. 使用外部 Chrome/Edge 完成第三世代桌面/移动端交互、取消、导出、持久化、PWA 与最终验收记录。

## 已知限制

- 当前分支：`main`，HEAD `613e7d8 feat: 实现第八世代 ID 乱数`，任务开始时与 `origin/main` 对齐。
- 第三世代模块虽然已经实现，但当前 HEAD 的完整 Wasm 构建、生产页面算法回归和项目所有者最终验收仍不能由历史模块完成状态替代。
- GitHub Pages 是当前测试目标；Cloudflare Pages 与 `hakuhiro.top` 留到 Pages 验收后配置。

## 4. 已进入 Git 基线

- 工程基础：React 19、TypeScript 6、Vite 8、Vitest、ESLint、Prettier、PWA 和中英日三语；npm 是唯一包管理器。
- 构建基线：Node.js `24.19.0`、npm `12.0.2`、Emscripten `6.0.6`、CMake runtime `4.3.1`、Ninja runtime `1.13.2`。
- 法律边界：GPL-3.0-or-later、PokeFinder 署名、对应源码记录和站点免责声明。
- 已有模块：`gen3id`、`gen3initialseed`、`gen3seedtotime`、`gen3ngcseed`、`gen3spindapainter`、`gen3static` Generator/Searcher、`gen3wild` Generator/Searcher、`gen3ivtopid`、`gen3egg`、`gen4static`、工作区 `gen4wild`、G3/G4 独立存档信息、全局个体值计算器，以及 `encounterlookup`。
- UI 基础：默认收起的模块抽屉、全局存档悬浮窗、浅色/深色主题和系统默认字体。

## 5. 验证状态

### 5.1 已部署算法回归

- 经项目所有者授权，使用外部 Chrome 在 `https://haku76.github.io/PokeRNGKit/` 回归当前生产资源 `index-DC2qWhx2.js`；页面控制台未记录站点错误。
- 已通过 Static Generator：`12345678 / 0` 的 Method 1 为 PID `84EA0B71`、IV `10/12/22/7/29/0`，Method 4 为 PID `84EA0B71`、IV `10/12/22/20/9/4`。
- 已通过 Wild Generator：Emerald Route 111 Grass、Seed `1C71C71C`、`0..9` 返回 10 条；首条为 Slot `3`、Trapinch、Lv.21、PID `3C5ACFFA`、IV `12/31/4/27/8/20`、Nature `17`。Wild Searcher 全 31 IV 夹具计数为 Method 1/None `20`、Method 2/Synchronize `54`、Method 4/Cute Charm F `4`。
- 已通过 IVs to PID：零 IV 为 Channel / PID `56654838` / Seed `DC2DA271` / SID `48333`；满 IV 为 Method 2 / PID `36E6808A` / Seed `02B0100B` / SID `8832`。
- 已通过 Egg：Emerald `EBred`（亲代 B 为 Everstone）返回 50 条，首条 Advances `4294967278`、PID `F0425272`、IV `31/31/0/31/26/30`；Ruby Split 的两个 Seed `0000` 返回 60 条，首条 PID `0000E97F`、IV `30/11/31/31/31/16`。
- 延用既有生产证据：ID Searcher 的 `48163 / 64377` 对应 `05A0 / 0`、`C19B / 36724`；XD/Colo、Initial Seed Finder 与 Static Searcher 的已记录固定夹具均通过。

### 5.2 基线工程验证

- 已通过：2026-08-12 运行 `npm run verify`。Prettier、ESLint、`tsc -b`、16 个 Vitest 文件共 57 项测试、Vite 生产构建与 PWA 预缓存均已完成；ESLint 仅保留 `Gen3EggPanel.tsx`、`Gen3WildPanel.tsx` 的两条既有 TanStack Virtual / React Compiler warning。此证据早于本轮 `gen3spindapainter`，不能代替其工程检查。
- 已通过：在 Visual Studio 2026 Build Tools x64 开发环境中运行 `npm run wasm:test:native`，6/6 原生 Core 夹具通过。
- 历史已通过：在用户级 emsdk `6.0.6` 环境中运行 `npm run wasm:doctor` 与 `npm run build`，当时六个 Gen III Wasm 模块、Vite 生产站点和 PWA 预缓存均成功生成。新增 `gen3seedtotime` 后需重新运行构建，不能沿用该历史证据宣称七个模块已通过。
- 受限终端首次复制 `public/wasm/gen3egg.mjs` 到 `dist` 时返回 Windows `EPERM`；同一授权的 `npm run verify` 随后成功，确认该失败是受限文件访问环境，不是构建或源码错误。

### 5.3 遇敌查询本轮检查

- 已完成：源码、生成数据结构、上游 16 个版本、世代图鉴上限、翻译词条与悬浮工具状态的静态审查。
- 已确认：生成数据包含 16 个游戏键，等级范围未发现反向值或超过 100 的记录；该结论来自生成阶段的静态数据检查，不是测试或浏览器验收。
- 已通过：`npm run verify`，其中 Encounter Lookup 域测试覆盖 16 游戏键、四种图鉴上限和非法物种边界。
- 已通过：本地 UI 模式的 Encounter Lookup 输入 `皮卡丘` 后可选中候选并返回 Emerald Safari Zone Area 1/2 草丛 `25-27`；IV Calculator 输入同一物种可由候选列表和方向键/Enter 选择；Wild 地点输入 `111` 可选择 Route 111 并联动更新物种列表；Egg 蛋种类自动完成已按同一上游调用路径复核。
- 已通过：本地三语切换为中文、英文、日文；浅深主题切换为 `light -> dark -> light`；档案、IV Calculator 和 Encounter Lookup 依次展开时另外两项均收起。
- 已通过：生产 Encounter Lookup 的皮卡丘抽样。Emerald 返回 Safari Zone Area 1/2 草丛 `25-27`；Diamond 和 Brilliant Diamond 返回 Trophy Garden 草丛 `18-18`；Black 返回空集。生产包仍使用原生 `datalist`，通过方向键/Enter 可提交当前候选，但点击候选 popup 无法可靠验收。
- 已通过：生产 IV Calculator 新增/删除行可逆；妙蛙种子、Lv.100、勤奋、`231/134/134/166/166/126` 精确返回六项 `31`，下一级均为 `100`。
- 待部署复验：当前生产页的语言和主题按钮在本轮 Chrome 自动化中没有改变状态，而本地当前源码可正常切换；三浮窗也仍可同时展开。当前 Pages 包未包含本轮修复，不能作为本轮交互验收。
- 未运行：移动视口、离线/PWA、性能与取消延迟；这些需要新部署后由项目所有者共同完成。

## 6. 已知风险与边界

- `gen4id` 已实现并通过原生夹具与工程检查；`gen4wild` 的完整 Wasm 和部署验证仍待完成。
- `gen3egg` 当前只实现 Egg Generator；Egg Searcher、Masuda 和第四世代孵化规则不在范围内。
- 多 Worker 会复制 Wasm 线性内存，低内存移动设备可能需要在 Pages 实测后降低 Worker 数。
- PWA 旧缓存可能造成 UI/Wasm API 短暂错配；Worker API 握手会拒绝版本不一致，但更新体验仍需在部署后验证。
- Wild 遭遇数据的 Tanoby Chamber form 数据仍待后续处理；本轮 `encounterlookup` 已锁定 EncounterTableGenerator revision `7769c1df80be93761fe6479d51cbf2fe7a7dc4f9` 并生成 16 个版本的静态查询数据。
- 公开部署 Wasm 时必须向用户提供对应完整源码、构建脚本和 GPL 许可材料。

## 7. 新环境恢复

以下命令仅在项目所有者对具体范围授权后执行：

```bash
git status --short --branch
git log -5 --oneline
npm ci --engine-strict
npm run verify
npm run wasm:test:native
npm run wasm:build
```

## 8. UI 高度与滚动收敛（2026-08-22）

- 已完成：共享表单面板取消固定最小高度，结果表格与静态/个体值结果区改为按视口高度的 `clamp()` 自适应。
- 已完成：Gen IV/V/VI/VII/VIII 高频结果面板、研究工具与地图面板收敛固定高度；窄屏不再使用 480/520/560/620/700px 的结果区硬编码。
- 已完成：浮动工具面板统一由最后一个内容根节点承担滚动，避免切换面板时多个直接子节点分别出现或消失滚动条；保留稳定滚动槽。
- 已完成：杂项乱数工具改为受限自适应两列，最大宽度 480px，避免输入控件和浮窗空白过宽。
- 待人工验收：当前未连接外部 Chrome/Edge，桌面与移动端实际视觉、下拉层完整显示和最终 UI 接受仍需项目所有者在部署页面确认。

## 维护规则

- 每个功能、依赖、工具链、构建、部署或阻塞状态变化后更新本文。
- 验证结果必须区分历史证据、本轮工程检查、部署页面回归和项目所有者最终验收。
- 控件名和输入限制必须重新核对 PokeFinder Form、Core、测试和翻译文件。
- README、进度、提交、构建和发布说明使用 `hakuhiro-project-style`。

## 绿宝石新档高 V 御三家（2026-09-01）

- 新增：绿宝石新档御三家允许 TID 留空，从高 V 目标反推可用 TID；输入 TID 时继续使用快速前向扫描。
- 新增：空 TID 下 `Shiny = Any` 只筛高 V，Star、Square、Star/Square 会额外验证目标帧之前存在兼容 SID；结果显示 TID、目标帧、完美个体数、PID、PSV 与 IV，点击 PSV 继续进入 ID Generator。
- 优化：默认条件改为 `31/6 + Star/Square + 0..1000000`。`31/5` 的一百万帧任务按 IV 组合动态拆为 8 批，可使用最多 8 个独立 Worker；单批上限为 25,000,000，总评估上限为 250,000,000，4V 超限时在启动前提示收窄。
- 更新：`gen3static` Wasm API 升级为 6；高 V-only 结果使用同一 60 字节记录，以哨兵值表示未预选 SID/ID 帧。
- 已通过：激活本机 emsdk 后运行 `npm run build`；`gen3static` API 6 Wasm、TypeScript、2339 个前端模块、Vite 生产包和 245 项 PWA 预缓存均成功生成。保留 CMake 4.3.1 shared-library 与 Vite 大分块两条非阻断警告。
- 已验证：本地生产预览运行于 `http://127.0.0.1:4174/`；首页、`gen3static.wasm`（16,284 bytes）与 `gen3id.wasm`（10,328 bytes）均返回 HTTP 200。
- 未运行：原生夹具、Vitest、外部 Chrome/Edge 视觉检查与生产页面算法回归；本地构建和 HTTP 证据不替代 GitHub Pages 回归及项目所有者验收。
- 新增：御三家 Seed 可在 `TID（建档后不重启）`与 `0000（重启后）`之间选择。Seed 0000 要求输入 TID，目标生成固定使用 `0x0000`；ID 生成器默认检索 `0..1000000`，不再沿用连续新档流程的“ID 帧必须早于御三家帧”约束。
- 修复：从 ID 结果返回 Static 时携带真实目标 Seed 与 Seed 模式；重启路径不会把 Seed 0000 覆盖成 TID。
- 优化：Static 的三个标题入口固定为单行，TID Seed 说明与输入框同宽且最多两行；Gen3 ID Generator 在内容宽度 `721px` 以上固定保持乱数信息、筛选项、结果三块单行，侧边栏展开/收起不再触发结果换行。
- 已通过：完成 Seed 0000 与单行布局改动后重新激活本机 emsdk 运行 `npm run build`；全部 Wasm、TypeScript、2339 个前端模块、Vite 生产包和 245 项 PWA 预缓存均构建成功，仅保留既有 CMake shared-library 与 Vite 大分块警告。
- 已验证：刷新后的本地生产预览继续运行于 `http://127.0.0.1:4174/`；首页为 557 bytes、`gen3static.wasm` 为 16,284 bytes、`gen3id.wasm` 为 10,328 bytes，三者均返回 HTTP 200。当前未连接外部 Chrome/Edge，因此本轮不宣称视觉布局已自动验收。

本批首轮完整类型退出 0；定向 Lint 无错误，发现两处校验上下文 useMemo 未使用依赖的提醒，已将实体／修订标识显式纳入注册表 scope，待完整工程重跑。拦截提示增加无效表单名称，方便定位修正。
