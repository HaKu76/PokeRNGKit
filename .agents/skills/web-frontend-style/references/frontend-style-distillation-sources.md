# Frontend Style Distillation Sources

这份文档记录前端风格 Skill 的蒸馏来源、观察范围和可迁移结论。它与最终 Skill 分开维护：Skill 保存可执行规则，本文件保存规则的出处和证据，便于回溯与继续迭代。

当前状态：已完成 31 组样本的第一轮证据记录与第二轮交叉蒸馏。本文保留来源、观察证据、平台标签和许可边界；归一化后的字体、圆角、布局、交互、主题和反 AI 规则分别维护在同目录的专项文档中，后续样本可继续追加。

## 1. Leonus 右下角悬浮菜单

来源：

- https://blog.leonus.cn/2022/rightside.html

观察范围：页面实际 DOM、右下角菜单 CSS、菜单分组和移动端断点。

蒸馏结论：

- 使用固定在右下角的紧凑操作轨道。
- 主操作列保持稳定，低频操作放入独立次级列。
- 次级列沿垂直页面边缘的反方向横向展开，不引起文档重排。
- 统一按钮几何：38px 可见圆形、5px 垂直间距、统一图标尺寸和表面。
- 使用短时平移/透明度动效，`translateX(45px)` 收起，约 400ms 展开。
- 在 900px 以下按上下文替换桌面布局操作为移动端目录操作。
- 以图标、无障碍名称、焦点态和工具提示共同表达动作。

## 2. rhargreaves/ff7-ui

来源：

- https://github.com/rhargreaves/ff7-ui

观察范围：`assets/css/ff7-ui.css`、`demo.html`、`ff7-examples.html` 的窗口、对话框、选项菜单和选择态。

蒸馏结论：

- 使用深海军蓝底色、方向性高光和暗角叠层构建窗口材质。
- 用 1px/2px 多层硬阴影形成像素时代的金属框体。
- 使用小圆角、冷白文字和硬质深色文字阴影。
- 为选择光标保留固定前导空间，避免选项切换时文字位移。
- 把对话框和嵌套菜单建模为显式状态机。
- 复古反馈需要现代化：用可访问的焦点态和 250–500ms 级别的提示替代高速闪烁。

## 3. 纸鹿摸鱼处 / Clarity 主题

来源：

- 博客主页：https://blog.zhilu.site/
- 主题说明：https://blog.zhilu.site/theme
- 主题仓库：https://github.com/L33Z22L11/blog-v3

观察范围：主页布局、文章页结构、主题特性说明、字体和深色模式策略。

蒸馏结论：

- 阅读优先：左侧固定导航、受限阅读宽度、文章页目录，不依赖顶部 Hero 大图。
- 宽屏提高空间效率：精选文章横向滚动、文章封面侧置、列表分页便于扫描。
- 显式提供浅色、跟随系统、深色三种模式。
- 通过字体实际指标管理排版：字体回退、`lang`、字重合成、基线、字距、行高和换行都需要主动验证。
- 代码块是工具而非装饰：显示语言、复制、横向滚动或自动换行应有明确控制。
- 文章内容采用“问题 → 最小示例 → 取舍/坑点 → 一手文档 → 建议”的技术表达结构。
- 减少持续装饰动效，把注意力留给正文。

## 4. 纸鹿摸鱼处的前端文章

### 《前端字体二三事》

来源：https://blog.zhilu.site/2025/font-tips

记录的可迁移主题：

- 控制 `font-synthesis`，避免浏览器合成粗体/斜体破坏字形。
- 同时检查字距、行高、基线、中文西文混排和 `text-wrap: balance`。
- 正文优先可读字体，艺术字体只用于标题或短标签。
- 用 `lang`、字体回退链、可变字体和本地/网络字体策略控制一致性与性能。
- 处理 `text-autospace`、`text-size-adjust`、连字、等宽数字和网络字体子集化。
- 不要用 `font-smooth` 等看似精细的属性掩盖字体选择问题。

### 《深色模式开发的最佳实践》

来源：https://blog.zhilu.site/2025/dark-mode-guide

记录的可迁移主题：

- 基础样式先于深色覆盖，采用渐进增强。
- 用 CSS 变量维护调色盘，而不是重复大段选择器。
- 用 `color-scheme` 约束浏览器原生控件和自动深色行为。
- 在 `<head>` 中同步解析主题，避免页面初载闪白。
- 将 `system` 在运行时解析为确定的 light/dark 状态，监听 `matchMedia` 变化。
- 长文阅读避免纯黑纯白的过高对比度。

## 5. anzhiyu-c/anheyu-app-frontend

来源：

- 仓库：https://github.com/anzhiyu-c/anheyu-app-frontend
- 在线界面：https://anheyu.com/zh-CN/

观察范围：在线首页首屏、导航、Hero、Feature 卡片和指标区；仓库技术栈和近期前端提交。

蒸馏结论：

- 产品介绍页使用透明固定顶栏、近黑背景、克制导航、主题切换、语言切换和单一主 CTA。
- Hero 占约 90vh，使用小型眉题、超大响应式产品名、短价值说明、主次按钮和滚动提示。
- 背景只提供低干扰的噪点/径向氛围，主要文字和按钮保持实心清晰。
- 功能使用三列重复卡片，低透明边框、轻微模糊、圆角和悬停提升表达层级。
- 用四列指标区承接功能卖点，在窄屏转为紧凑网格。
- 大标题使用 `clamp()`，动效主要控制颜色、透明度和轻微缩放。

适用边界：这是产品介绍页的模式，不应直接套入博客正文、后台或高密度工具界面。

## 6. Haku76.github.io 本地主题

来源：`C:\Users\Hakuhiro\Documents\GitHub\Haku76.github.io`

观察范围：VitePress 配置、主题入口、`var.css`、`vitepress.css`、`navbar.css`、`font.css`、`Home.vue`、`Overview.vue`、`RightMenu.vue` 和数据文件。

蒸馏结论：

- 在 VitePress 默认文档模型上叠加一套可复用的 FF 窗口 token，而不是重写内容系统。
- 浅色模式使用半透明蓝灰面板和 `blur(10px) saturate(130%)`；深色模式切换为不透明皇家蓝窗口和更深外轮廓。
- 统一使用银白/金色边框、青色标签、金色选中态、硬文字阴影、辉光和焦点环。
- 使用 `fusion-pixel-12px-monospaced-zh_hans`，WOFF2 优先、TTF 回退；长文仍需测试回退字体的可读性。
- 导航、侧栏、搜索、分页、时间线、功能清单、链接卡片和页脚共享同一窗口几何。
- 主题切换以点击位置为圆心做约 500ms View Transition，并为 reduced-motion 提供 CSS 回退。
- 首页采用 1200px、25/75 两栏布局；个人卡片、固定十行文章列表、占位行、分页和 768px 以下的移动端堆叠共同保证布局稳定。
- 动态站点信息使用固定高度翻转卡片，避免状态切换造成页面抖动。

适用边界：像素字体、定制光标、音频、粒子和彩虹背景都是增强项，应以可读性和 reduced-motion 为优先级约束。

## 7. 無名小栈个性化配置与右键菜单

来源：https://blog.imsyy.top/

观察范围：个性化配置面板、全局字体/字号、背景模式、Banner 高度、信息位置、页面右键菜单与内嵌播放器。

蒸馏结论：

- 个性化配置按阅读、壁纸、首页结构、杂项布局分组，用字体选择、步进器、分段选项等匹配具体设置。
- 设置面板保留页面作为即时预览背景；每组设置需要持久化、默认值与重置路径。
- 右键菜单按历史操作、站内导航、页面工具、外观和媒体分组，并复用已有命令。
- 菜单包含后退、前进、刷新、返回顶部、随机文章、分类、标签、协议、复制地址、主题切换和迷你播放器。
- 自定义右键菜单不能成为动作的唯一入口，也不应劫持输入框、可编辑内容、选中文本或辅助技术需要的原生菜单。

许可/归属：页面内容标注 CC BY-NC-SA 4.0；网站前端实现与素材许可需按站点或对应仓库的实际声明核对，不直接复制整段实现。

## 8. 微光档案右下角侧边栏

来源：https://archive.bikari.top/

观察范围：`.z-toolbar` 的定位、按钮尺寸、折叠状态、滚动进度和指针事件处理。

蒸馏结论：

- 工具栏固定于 `right: 24px; bottom: 32px; z-index: 64`，按钮约 36px 方形、6px 圆角、8px 间距。
- 蓝色主题表面、白色图标和轻柔阴影形成一致的操作轨道。
- 折叠时把次要按钮移出屏幕右侧，只保留一个可发现的展开按钮。
- 返回顶部按钮可显示滚动百分比；优先采用渐进增强并准备普通图标回退。
- 外层使用 `pointer-events: none`，仅对子按钮恢复交互，避免空白浮层遮挡正文。

许可/归属：以在线界面作为设计观察来源；源码和素材许可未在本轮确认，最终 Skill 仅保留通用规则。

## 9. Uiverse 翻转揭示卡片

来源：https://uiverse.io/gharsh11032000/selfish-owl-57

观察范围：卡片尺寸、3D 透视、正反面切换、悬停缩放、标题与说明排版。

蒸馏结论：

- 舞台约 300×200px、10px 圆角，以 `perspective: 1000px` 建立深度。
- 内容面从 `rotateX(-90deg)` 绕底边翻入，图标同步退场，约 600ms 带回弹曲线。
- 卡片整体仅轻微放大到约 1.05，布局尺寸保持固定。
- 必须补充键盘焦点、触屏触发和 reduced-motion 的淡入回退，重要内容不能只放在隐藏面。

许可/归属：组件页面标注 MIT License；保留作者 `gharsh11032000` 与原始页面链接。

## 10. Uiverse 动态边框搜索框

来源：https://uiverse.io/Lakshay-art/curvy-earwig-22

观察范围：多层 conic-gradient、遮罩、模糊层、输入框与左右操作按钮。

蒸馏结论：

- 内层输入约 301×56px、黑色表面、10px 圆角，并为左右图标预留固定内边距。
- `.white`、`.border`、`.darkBorderBg`、`.glow` 等独立绝对层叠加不同模糊强度，形成发光边框材质。
- hover 旋转渐变边框，`:focus-within` 调整动画节奏；装饰层必须 `pointer-events: none`。
- 搜索、清除、过滤仍需语义化、可聚焦、可命名，并提供静态边框与 reduced-motion 回退。

许可/归属：组件页面标注 MIT License；保留作者 `Lakshay-art` 与原始页面链接。

## 11. Uiverse 分组右键菜单

来源：https://uiverse.io/Na3ar-17/terrible-gecko-91

观察范围：菜单表面、分组分隔、普通/危险/特殊操作颜色与交互状态。

蒸馏结论：

- 菜单约 200px 宽，深色渐变背景、10px 圆角，组间使用约 1.5px 分隔线。
- 菜单项使用紧凑内边距和 6px 圆角；hover 为蓝底白字并做极轻微位移，active 略微缩放。
- 删除操作独立使用红色语义，特殊末组可使用另一强调色，但颜色必须与命令语义一致。
- 所有 hover 必须配套 focus-visible、disabled、selected 与触屏状态；危险操作应独立分组并按风险确认。

许可/归属：组件页面标注 MIT License；保留作者 `Na3ar-17` 与原始页面链接。

## 12. Uiverse 紧凑音乐播放器

来源：https://uiverse.io/csozidev/rare-quail-42

观察范围：播放器卡片、曲目信息、进度、播放控制、音量和播放状态动画。

蒸馏结论：

- 卡片约 250×120px，`#191414` 近黑表面、10px 圆角、10px 内边距。
- 40px 封面/头像、25px 粗标题、12px 副标题、6px 进度条和居中传输控制构成紧凑状态面板。
- 音量是次级控制，但不能只在 hover 时可用；键盘和触屏必须能打开和调整。
- 五根绿色竖线只在播放时表达状态，暂停和 reduced-motion 下停止。

许可/归属：组件页面标注 MIT License；保留作者 `csozidev` 与原始页面链接。

## 13. React Bits Balatro 背景

来源：https://www.reactbits.dev/backgrounds/balatro

观察范围：OGL/WebGL shader、颜色与旋转参数、鼠标交互、resize 和生命周期清理。

蒸馏结论：

- 使用铺满容器的 canvas 和 fragment shader 生成像素化、旋转、色彩混合、对比度与光照效果。
- 将旋转、速度、偏移、三色、对比度、光照、旋量、像素过滤、缓动、鼠标交互等暴露为参数。
- resize 更新 renderer，动画由 `requestAnimationFrame` 管理；卸载时取消动画、移除监听并释放 WebGL context。
- 高成本背景必须有 reduced-motion、离屏暂停、DPR 上限、WebGL 失败与静态图/渐变回退。

许可/归属：保留 React Bits 页面与项目归属；实际复用代码前应再次核对其仓库当前许可证。

## 14. React Bits 透视轮播

来源：https://www.reactbits.dev/components/carousel

观察范围：拖拽判定、`rotateY` 透视、spring、循环克隆、自动播放、指示器和可访问性。

蒸馏结论：

- 默认舞台约 300px，16px 内边距/卡片间距，用 `rotateY` 解释前后卡片方向。
- 结合拖拽 offset 与 velocity 判定翻页，以 stiffness 300、damping 30 左右的 spring 归位。
- loop 通过首尾克隆实现，但对外状态、播报和指示器只暴露真实索引。
- 拖拽、前后按钮、键盘、圆点指示器共享一个状态模型；自动播放在 hover、focus、页面隐藏和 reduced-motion 时暂停。

许可/归属：保留 React Bits 页面与项目归属；实际复用代码前应再次核对其仓库当前许可证。

## 15. pokemon-cards-css 交互材质卡片

来源：https://github.com/simeydotme/pokemon-cards-css

观察范围：卡片倾斜、激活居中、glare/shine、mask/foil/texture、不同稀有度材质与移动端叠放。

蒸馏结论：

- 把鼠标位置归一化后同时驱动 `rotateX/rotateY`、高光位置、眩光位置和纹理偏移，再用 spring 平滑。
- 材质管线由底图、mask、纹理、shine、glare、稀有度配方和交互状态组成。
- 不同稀有度采用独立渐变、混合模式和纹理配方，而不是统一覆盖彩虹层。
- 只对激活卡片启用高成本合成；限制旋转、缩放、模糊、纹理分辨率，并为键盘、触屏、低功耗和 reduced-motion 提供平面状态。

许可/归属：仓库使用 GPL-3.0；卡牌图像、宝可梦品牌与额外纹理仍归各自权利人，必须保留仓库中的素材归属说明，不把品牌资产打包进通用 Skill。

## 16. vitepress-theme-bluearchive

来源：

- 仓库：https://github.com/Alittfre/vitepress-theme-bluearchive
- 在线预览：https://vitepress-theme-bluearchive.vercel.app/

观察范围：`Navbar/index.vue`、`Search-Button.vue`、`Search-Dialog.vue`、`Dropdown-Menu.vue`、`Footer.vue`、`styles/vars.less` 与在线页面。

蒸馏结论：

- 顶栏为 sticky，桌面 72px、移动端 64px，使用 2px 结构边框、下部 32px 圆角、三角纹理、15px 模糊和蓝色边缘辉光。
- 桌面导航保持宽间距，hover 为金色文字/表面和轻微上移；移动端使用汉堡按钮与独立下拉控制面板。
- 搜索是 `z-index: 200` 的全屏遮罩弹层，面板 90% 宽、最大 768px、16px 圆角，从 `scale(0.9)` 和透明状态进入。
- 搜索头部/关闭按钮 56px，输入 48px；MiniSearch 搜索标题和正文，500ms debounce、fuzzy 0.3、最多五条，并区分搜索中、结果、空状态。
- 页脚与顶栏构成镜像框架：72px 高、上部 32px 圆角、同一纹理/边框/辉光体系，移动端缩小文字和 logo。
- 浅色与深色不是简单反色，而是分别定义蓝白与紫黑材质、搜索表面、图片亮度和阴影 token。
- 仓库 `vars.less` 的浅色核心为 `#EAEFF5` 页面、白色表面、`#128AFA` 主蓝与 `#466398` 图标蓝；暗色核心为 `#0F0F16` 页面、`#1F1F2C` 表面、`#9D7CD8` 图标紫与 `#705781` 主紫。迁移时应保留“日间清亮蓝、夜间柔和紫”的模式差异，而不是把暗色机械地压暗成深蓝。
- 上游浅色的亮黄只适合作为极少量游戏化点睛；在通用 Web 中需限制为徽标、奖励或精选标记，不用于白底小字或默认按钮。

许可/归属：本轮未在仓库根目录观察到独立 LICENSE 文件。最终 Skill 仅蒸馏通用布局与设计规则；Blue Archive 名称、Logo、字体、角色、Spine 与其他素材不复制，并保留原项目及其感谢列表归属。

## 17. LyraVoid/Mizuki

来源：

- 仓库：https://github.com/LyraVoid/Mizuki
- 在线演示：https://mizuki.mysqil.com/

观察范围：在线首页和显示设置、`src/styles/variables.styl`、`main.css`、`banner.css`、`layout-responsive.css`、README 与许可文件。

蒸馏结论：

- 以桌面导航、分组下拉、搜索、可配置左右侧栏、Banner 轮播、文章列表、信息组件、音乐播放器和底部工具条组成模块化博客壳。
- 显示设置覆盖 OKLCH 色相、壁纸模式、Banner 标题/波浪、列表/网格和超宽屏文章布局，并为每组提供重置。
- 用单一 hue 生成 light/dark 主色、按钮、选择、链接、代码、TOC 和提示框角色，但警告/危险等语义色需要独立验证。
- 壁纸、卡片透明度、模糊是可独立组合的状态；正文仍有阅读宽度上限，超宽布局只在 1920/3200px 以上有计划地扩展。
- 移动端 768px 以下强制稳定单列文章列表并折叠次要组件；桌面才开放列表/网格切换。
- View Transition 期间暂时禁用高成本代码块、浮层和复杂过渡，使用 `contain`/隔离降低重绘。

许可/归属：仓库标注 Apache-2.0，并包含 `LICENSE.MIT` 与 `THIRD_PARTY_NOTICES.md`；复用时保留相应版权、许可证和第三方声明。

## 18. mirai-mamori/Sakurairo

来源：

- 仓库：https://github.com/mirai-mamori/Sakurairo
- 展示与文档：https://docs.fuukei.org/demo/

观察范围：README、`style.css`、`css/sakura_header.css`、`dark.css`、`responsive.css`、主题展示页与许可说明。

蒸馏结论：

- 桌面固定透明顶栏约 60px，滚动/hover 后变为 80% 不透明的毛玻璃表面与细边框；移动端约 50px。
- 桌面导航使用下划线生长、紧凑图标与下拉；移动端改为全宽折叠菜单、集成搜索、嵌套子菜单、用户/目录面板与自动隐藏顶栏。
- 首页/文章使用大图或视频封面、底部暗化渐变、居中身份信息或下置文章标题元数据。
- 文章列表使用约 300px 高的半透明卡片、10px 圆角和柔和阴影，768/860px 以下转为更紧凑结构。
- 主题皮肤色和文章高亮色贯穿链接、卡片辉光、TOC 与控件；深色模式使用 `#333/#1a1a1a` 中性层、低透明边框和专用输入/搜索/播放器表面。
- 评论、AI 辅助阅读、音乐、视频背景和画廊都是可选模块，应分别控制性能、隐私与可访问性。
- 源码中的全局 `transition: all` 只作为视觉观察，不应被通用 Skill 推荐；实现时限定具体属性。

许可/归属：仓库使用 GPL-2.0，并基于 Sakura V3 Series；流畅/沐氢图标、Codestar Framework、Plugin Update Checker、Kirki 与未明确许可的互联网特效需保留原始归属并逐项核对。

## 19. uselunora.com Dashboard 左侧边栏

来源：

- https://www.uselunora.com/dashboard

观察范围：Chrome 登录态下的 Dashboard 页面；桌面 1536×647、折叠态、移动 390×844；侧栏 DOM、布局计算、悬停样式和抽屉状态。

蒸馏结论：

- 桌面侧栏固定宽度约 `256px`，背景 `rgb(11, 9, 7)`，右侧约 `1px` 暖灰边框，填满视口高度。
- 侧栏由 `64px` 品牌头、可滚动导航区和底部工具区组成；底部工具区 `margin-top: auto`，顶部有细分隔线和约 `12px` 内边距。
- 导航区左右 `12px`、上下 `16px` 内边距；菜单项约 `44px` 高、`12px` 圆角、`10px 14px 10px 17px` 内边距、`12px` 图标文字间距、14px/500 字体。
- API、账单、帮助、其他等分组用 12px/600 标签与 1px 低对比度横线划分，分组有明显留白但不过度切碎列表。
- 普通项使用暖灰文字与透明背景；当前项使用低透明陶土棕背景和桃色文字。
- 充值商城使用暖色对角渐变、内高光、低透明边框和深阴影，hover 时约 `translateY(-1px)`；抽奖、签到等活动入口拥有轻微的专属强调色。
- 桌面收起将侧栏从 `256px` 变为 `72px`，宽度与 `300ms cubic-bezier(0.4, 0, 0.2, 1)` 同步；标签以宽度归零、透明度降低和轻微左移退场，图标与 `44px` 点击高度保持稳定，主内容同步扩宽。
- 移动端默认侧栏为 `translateX(-100%)` 的完整 `256px` 抽屉，由顶栏菜单按钮滑入到 `translateX(0)`；顶栏收缩为菜单、通知、语言/账户等必要控制。

许可/归属：本轮仅以用户授权访问的在线页面作为视觉观察来源；未复制站点源码、图标、Logo、账户数据或其他私有内容。该站点的源码和素材许可需在实际复用前单独核对。

## 20. Dogument pixel typography

Sources:

- https://dogument.github.io/pages/template.html
- https://github.com/dogument/dogument.github.io

Observed evidence:

- The template registers `../dtmmono.ttf` as `Determination Mono` with `@font-face` and applies it to the body. The glyph outlines create the pixel appearance.
- `image-rendering: pixelated` is set on `html`, but it affects scaled raster images such as the GIF background and icon, not ordinary text.
- The served TTF is about 4.47 MiB. Its internal family is `Determination Mono`, Version 1, with 7,688 glyphs, 1000 units per em, ascent 975, descent -225, and line gap 0.
- Tested Latin, Han, and full-width punctuation are present in the font rather than browser fallback. Latin letters and digits advance 600 units; common Han and full-width punctuation advance 1000 units. The family name therefore does not imply one shared mixed-script grid.
- The font reports `fsType = 8`. Its internal record credits 8-bit Operator / Grand Chaos Productions, a Leafia_Barrett spritesheet, theFIZZYnator modifications, and Undertale-related rights.

Distilled rules:

- Use a real pixel-outline font. Do not rely on `image-rendering`, `text-shadow`, or smoothing properties to manufacture pixel glyphs.
- Prefer a clearly licensed WOFF2. Declare weight, style, format, and `font-display`; preload only a face used above the fold.
- Check cmap coverage and real advance widths for Latin, CJK, full-width punctuation, and symbols before defining fallback or claiming monospace behavior.
- Use the design grid or integer multiples for sizing, keep `letter-spacing: 0`, set explicit line height, and use `font-synthesis: none`.
- Test system rasterizers, 1x/2x DPR, browser zoom, mobile, loading fallback, baseline, synthetic bold/italic requests, and mixed-language wrapping.
- Control font payload, retain compatible fallback metrics, and subset only when the license and real content set allow it. Reserve expressive pixel faces for headings, navigation, labels, dialogue, or short copy unless body readability has been verified.

License boundary: the Dogument repository is marked CC0-1.0, but that does not automatically clear the font's separate copyright, embedding restriction, or Undertale-related rights. HakuStyle records evidence and reusable rules only; it does not copy, convert, subset, or distribute `dtmmono.ttf`.

## 21. Gaoice / gaoice.run 类 Windows 系统 UI

来源：

- 在线页面：https://gaoice.run/
- 依赖/风格来源：7.css v0.21.0（页面直接引用 `7.css`）

观察范围：登录屏、桌面背景层、Aero 玻璃窗口、Win7 标题栏/控件、任务栏、窗口最小化/关闭/激活、拖拽与右下角缩放、天气/音乐窗口、自适应布局和移动端抽屉菜单。

蒸馏结论：

- 把页面建模为两个顶层状态：登录屏和桌面。登录按钮进入约 5 秒的代码打字/进度状态，再经过约 300ms 渐暗、约 350ms 缓冲和约 800ms 桌面渐显；显示桌面前先设置黑色 body 背景，避免隐藏登录层时白闪。
- 桌面由 fixed 背景照片、半透明暗色可读性遮罩、天气/星光等独立 effect layer、窗口层和任务栏组成。背景图片用 `background-size: cover`、`background-position: center`、轻微 `scale(1.01)` 和约 `1.5s` 图片切换；特效层必须可关闭、可暂停并提供静态回退。
- 窗口采用 `position: absolute` 的自由画布，默认 `display:flex; flex-direction:column`；标题栏固定约 30px，body 用 `flex:1; min-height:0`，status bar 放在底部。窗口激活时提高 z-index、标题栏对比度和阴影，激活窗口与任务栏按钮共享同一状态。
- 玻璃表面使用低透明深色背景（约 `rgba(0,0,0,.12)`）、`backdrop-filter: blur(4px)`、细亮边框和柔和阴影；任务栏约 `48px` 高、`position:fixed; bottom:0; z-index:999`，使用更强的 `blur(12px)` 和低透明蓝灰表面。玻璃只是材质层，正文仍需通过遮罩、间距和对比度保证可读。
- 窗口布局不是依赖偶然重叠：初始化脚本按 viewport 测量窗口尺寸，把中心“关于我”窗口居中，项目/联系/音乐/天气/博客/待办分别放到周边，并在 resize 后重新计算；为窗口预留稳定的最大宽度、最小高度和安全边距。
- 标题栏按钮使用 7.css 的 Win7 语义控件和 `aria-label`，任务栏按钮是窗口的第二入口。关闭、最小化、恢复、激活、点击外部和 Escape 等状态必须可由键盘/触控完成；自定义拖拽只绑定标题栏，不要阻塞正文选择。
- 拖拽使用 pointer/mouse 起点与窗口原始 `left/top` 差值，移动时限制在桌面安全区域；右下角 resize handle 用 `min-width`/`min-height` 约束，音乐等内容窗口在 resize 后同步内部滚动区域，避免列表或播放器溢出。
- 桌面端任务栏承载窗口切换、背景模式、归属信息、登录动画开关、语言、链接和时钟；移动端在约 `768px` 以下隐藏任务栏，把窗口改为单列自然流，改用约 `48px` 的悬浮 Menu 按钮、遮罩和抽屉面板。移动端窗口不再自由定位和 resize，标题栏与内容点击区域增大。
- 7.css 提供的渐变按钮、焦点虚线/内描边、fieldset、checkbox、progressbar 和滚动条是可复用的控件层；实际项目应锁定版本、核对许可证，并覆盖 `focus-visible`、disabled、reduced-motion、强制颜色和无 backdrop-filter 浏览器。

适用边界：这是高密度个人主页/交互档案的桌面隐喻，不适合默认套用于长文博客、后台工作台或移动优先表单。背景天气、音乐和第三方数据属于可选模块，必须与核心窗口状态解耦。

许可/归属：页面直接引用 7.css v0.21.0，并包含 APlayer/MetingJS、图片、字体和第三方数据服务。HakuStyle 只记录可迁移的窗口/任务栏规则，不复制页面源码、Logo、头像、背景、音乐或第三方服务配置；实际复用前分别核对 7.css、APlayer/MetingJS 和素材许可。

## 22. xlrt.top `content-container` 卡片

来源：

- https://xlrt.top/

观察范围：公开首页的 DOM、computed style、内容层级、链接网格、底部切换条，以及 1280×720、1536×900 和 390×844 视口。

蒸馏结论：

- 页面把视觉身份层与右侧内容层分开；内容层在桌面约占右半区域，卡片本身保持稳定的 `320px × 400px`，不随背景图或宽屏拉伸。
- `.content-container` 是白色实体表面，不使用玻璃透明；无边框、`3px` 圆角、`overflow: hidden`，阴影约为 `4px 4px 5px rgba(0, 0, 0, .5)`，形成轻微右下方向性。
- 卡片由约 `336px` 的内容视口和 `64px` 底部切换条组成；三个 `.self-content` 面板按卡片宽度横向排列，用绝对定位和约 `0.2s` 过渡切换。
- 链接面板用两行三列的等宽网格；每项约 `33.3%` 宽、`10px 0` 内边距、`5px` 圆角，hover 使用 `rgba(0, 0, 0, .05)` 内填充，图标使用统一粉色强调而标签保持深中性色。
- 底部切换条为整宽粉色带，三个等宽 `64px` 控件共享一组几何；选中项将图标放大到约 `2.5em` 并下移 `0.1em`，文字淡出，非选中项保留约 `12px` 标签，hover 叠加低透明白色表面。
- `390px` 移动视口仍保留 `320px × 400px` 卡片并居中，约 `35px` 两侧安全边距；背景与身份内容独立重排，卡片和底部控件不被压缩到不可读尺寸。
- 页面用 `body { overflow-x: hidden; }` 裁切横向面板，避免文档级横向滚动；这也意味着实现时必须显式处理焦点可见性和非活动面板的可访问状态。

蒸馏规则：

1. 为紧凑身份卡保留稳定实体外壳，例如 `320px × 400px`，把它居中放入更大的构图层；不要让装饰背景决定可读宽度。
2. 卡片叠在繁杂图像上时优先使用不透明表面；小圆角、无边框、单一方向性阴影和裁切溢出已经足够表达层级。
3. 把可切换卡片建模为固定内容视口加独立底部状态条；每个面板保持同一轨道宽度，只变换 `transform/opacity`，避免切换时邻近控件重排。
4. 链接或操作集合使用等宽网格、稳定的图标/标签纵向堆叠和足够的垂直节奏；hover/focus 表面必须留在命中区域内。
5. 选中项应是状态变化而非布局变化：预留图标和标签空间，在预留空间内淡出文字或缩放图标。
6. 窄屏保留可用的最小卡片宽度并使用安全的行内边距居中，不要为了塞进视口而把文字和控件缩到触控不可用。
7. 被裁切的非活动面板要使用 roving tabindex 或 `aria-hidden`/`inert`，加入清晰的 `:focus-visible`，确保键盘焦点不会消失在裁切区域。
8. 在 `prefers-reduced-motion` 下移除面板滑动和选中图标位移动效，但保留选中颜色和标签状态。

适用边界：这是高密度个人主页/身份卡的卡片配方，不应直接套用于长文阅读、后台工作台或需要自适应宽度的表单面板。

许可/归属：本轮只把公开页面作为视觉和 computed-style 观察来源，未复制源代码、动漫图像、头像、Logo、图标或其他素材；实际复用前需单独核对站点条款与素材许可。

## 23. soki.moe 首页图片墙

来源：

- https://www.soki.moe/

观察范围：首页 `.cyber-world-wall`、图片按钮、桌面与 `760px` 移动断点、大图预览对话框，以及 1280px/390px 构图行为。

蒸馏结论：

- 桌面图片墙是艺术指导型 CSS Grid 拼贴，不是自动 masonry：六条等宽轨道、`12px` gap、前三行各三张图，最后一行两张宽图；前九张跨两列，最后两张跨三列。
- 墙体高度为 `clamp(760px, 60vw, 940px)`；1280px 下约 `1110px × 768px`。外层是接近不透明的白色面板、`24px` 圆角和约 `34px` 内边距。
- 图片按钮使用 `16px` 圆角、裁切溢出和 `0 11px 30px rgba(33,31,51,.12)` 阴影；图片 `object-fit: cover`、懒加载，hover/focus 只做受限的 transform/filter 过渡。
- `760px` 以下主动切换为横向 flex 画廊：隐藏滚动条、`scroll-snap-type: x mandatory`，单卡 `aspect-ratio: 16 / 10`、宽度 `min(82vw, 520px)`，并保留下一张的可见边缘。
- 图片使用语义化按钮、`zoom-in` 提示和清晰 `:focus-visible`；点击后打开命名的大图对话框，提供全屏遮罩、contained 图片、关闭按钮、图片描述、Escape/焦点与 body 滚动管理。

蒸馏规则：

1. 区分艺术指导型拼贴与真正 masonry：构图固定时使用显式 Grid spans，内容高度任意且顺序动态时才考虑 masonry。
2. 为桌面构图明确轨道、间距与行比例，由内容编辑决定宽图位置；不要根据图片原始尺寸随机改变重要性。
3. 窄屏切换交互模型，不要把六轨拼贴强行压小；横向 snap 画廊应保持图片尺度并露出下一张作为滚动提示。
4. 图片预览使用真实按钮与真实 dialog，补齐 focus-visible、触屏、Escape、焦点恢复、描述和滚动锁定。
5. 为图片预留 aspect-ratio、懒加载非关键资源，并在 reduced-motion 下移除 zoom/位移动效。

适用边界：适合少量精选图片、作品集或游戏截图的编辑型构图；动态数量、不可控顺序或内容高度驱动的场景应使用普通 Grid 或真正 masonry。

许可/归属：本轮只以公开页面作为视觉和 computed-style 观察来源；不复制站点摄影、文案、品牌、图标或源代码，实际复用前需核对站点条款及每张图片的权利。

## 24. crweb.ccwu.cc 整体页面、动效与光标

来源：

- https://crweb.ccwu.cc/

观察范围：首屏品牌舞台、内容双栏、移动端重排、面板/卡片材质、进入视口揭示、悬停/呼吸动效、Lenis 平滑滚动、双画布背景和自定义光标。

蒸馏结论：

- 首屏使用 `100vh` 品牌舞台；下方档案内容最大约 `1200px`，桌面约 `768px` 主栏、`368px` 信息栏与 `24px` gap，外层约 `40px 20px 60px`。
- 390px 手机采用 `column-reverse`，先显示个人资料、音乐与状态，再显示项目/留言；内部网格从桌面约四列、平板约两列降为手机单列。
- 固定背景由浅蓝、粉白、淡紫组成；主面板约 `rgba(255,255,255,.55)`、亚像素白边、`12px` 圆角和 `0 2px 12px rgba(150,170,190,.12)` 阴影。内部卡片使用透明底、约 `1.6px` 边框与紧凑内边距。
- Logo 约 `1.5s` 淡入后进入 `4s` 呼吸，标语约 `1s` 淡入；内容面板初始 `opacity: 0; translateY(24px)`，进入视口后添加 `.reveal`，过渡约 `2s`。
- 卡片 hover 上移约 `4px`，增加白色半透明表面、蓝色边框、柔和阴影与周期性边框颜色；头像和页脚光环也持续 glow。通用实现必须统一限制持续动画数量。
- `#spectrum-container` 与 `#baspark-canvas` 是 fixed 全屏、`pointer-events: none` 的画布层，移动端仍启用；通用实现只保留一个主要画布、限制 DPR、暂停隐藏页、移动降级并准备静态回退。
- 普通/链接状态使用不同 PNG 光标与热点，并用 `image-set(... 3dppx)` 加系统 fallback；可迁移实现仅在 `@media (pointer: fine)` 中启用，不覆盖文本、resize、disabled 或 drag 光标。
- 未观察到完整 `:focus-visible` 或 reduced-motion 分支，并存在 `transition: all`；这些是需修正的审计证据，不是推荐实现。

蒸馏规则：

1. 个人档案可使用全视口身份舞台加受限双栏内容壳；信息侧栏应窄于活动主栏，并显式定义手机内容顺序。
2. 半透明材质由 surface、border、shadow、contrast token 共同控制；blur 是可选增强，不能用来替代文字对比度。
3. 滚动揭示使用 `IntersectionObserver` 添加单一显式状态，完成后 unobserve；无 JS 或 reduced-motion 时直接显示内容。
4. Logo、头像、边框、光环等持续动画共享同一预算；默认至多保留一个持续身份动效，并在隐藏页、低功耗、移动端和 reduced-motion 下停止或简化。
5. 全屏 canvas 至多选择一个主效果，必须 `pointer-events: none`、限制 DPR、处理 resize/visibility/context loss、清理 RAF/监听并提供静态回退。
6. 自定义位图光标只用于 fine pointer，保留系统 fallback 和全部语义光标；不把来源站的 PNG 光标打包进 Skill。
7. 避免 `transition: all`，补齐 focus-visible、键盘等价路径和 reduced-motion，再采用悬停、揭示与呼吸配方。

适用边界：适合个人档案、作品归档或轻内容社区首页。高密度后台、长文阅读与低功耗移动场景应缩短首屏、削减持续动效、平滑滚动和画布效果。

许可/归属：本轮只以公开页面、DOM 与 computed style 作为观察来源；不复制 Logo、光标位图、图片、音乐、文案、画布实现或源代码，实际复用前需核对站点条款和所有第三方依赖。

## 25. ant-design/ant-design

来源：

- 仓库：https://github.com/ant-design/ant-design
- 设计价值观：https://ant.design/docs/spec/values
- 主题与 Design Token：https://ant.design/docs/react/customize-theme
- ConfigProvider：https://ant.design/components/config-provider
- Form：https://ant.design/components/form
- Table：https://ant.design/components/table

平台标签：

- 主适配：桌面优先的企业级响应式 Web、现代浏览器、SSR、Electron。
- 可迁移：移动 Web 的表单/反馈/数据模式，需缩小密度并改造导航。
- 不适用：直接当作原生 Android/iOS 组件或把 React API 搬进非 React 项目。

观察范围：GitHub README/LICENSE、官方设计价值观、主题文档、ConfigProvider、Form 和 Table 文档。

蒸馏结论：

- 设计价值以 Natural、Certain、Meaningful、Growing 为判断框架：降低认知成本，建立一致和可预测的规则，围绕任务提供即时反馈，并让系统随用户能力成长。
- Design Token 使用 Seed -> Map -> Alias 三层派生关系；基础色、基础圆角等少量 Seed 经算法生成色阶、密度与圆角，再由语义 Alias 和组件 Token 控制局部用途。
- 默认、dark、compact 算法可组合；主题支持动态切换、嵌套作用域、组件级覆盖、CSS 变量/静态样式提取和关闭动效。主题变更应保持组件结构与内容稳定。
- 组件按 General、Layout、Navigation、Data Entry、Data Display、Feedback、Other 分类组织，形成从按钮/输入到表格/分页/弹窗/通知的完整企业工作流。
- Form 需要稳定的标签、布局、必填标记、帮助文本、校验触发、错误列表、动态字段和提交反馈；Table 需要排序、筛选、搜索、选择、分页、展开、固定列、虚拟滚动、响应式和空/加载状态。
- ConfigProvider 统一方向、语言、尺寸、禁用状态、主题、popup 容器、空状态与 CSP；Modal/Message/Notification 等 imperative overlay 若脱离 Provider 会丢失上下文，应使用有上下文的实例/holder。
- Feedback 应按风险和持续时间分层：字段反馈/Alert、Message、Notification、Popconfirm、Modal/Drawer、Result；Skeleton、Spin、Progress 和 Empty 分别表达结构占位、短时未知进度、可测进度和无数据。
- 组件实现应保留 default、hover、active、focus-visible、selected、disabled、loading、warning、error、success、empty 等状态矩阵，并共享 z-index、Portal、焦点和滚动锁定规则。

适用边界：适合管理台、数据录入、配置页、工作台和复杂反馈流程；个人博客或沉浸式首页只借用 Token/表单/反馈规律，不整套搬用企业密度。

许可/归属：Ant Design 仓库与组件实现为 MIT；图标、Logo、品牌和第三方内容仍需单独核对。HakuStyle 只记录设计规律，不复制 React 源码或素材。

## 26. saadeghi/daisyui

来源：

- 仓库：https://github.com/saadeghi/daisyui
- 主题文档：https://daisyui.com/docs/themes/
- 配置文档：https://daisyui.com/docs/config/
- Button：https://daisyui.com/components/button/

平台标签：

- 主适配：Tailwind CSS 驱动的响应式 Web、静态 HTML、React/Vue/Svelte 等 Web 框架。
- 可迁移：非 Tailwind 项目可借用语义类、CSS 变量和主题作用域，但需自行建立构建与命名约束。
- 不适用：原生移动组件或仅依赖设计稿、不允许 CSS 构建的运行时环境。

观察范围：GitHub README/LICENSE、主题列表、主题配置、颜色变量、组件类名和 Button 文档。

蒸馏结论：

- 以语义组件类表达意图，使用 `btn`、`input` 等基类配合 `primary`、`outline`、`ghost`、`loading`、`disabled`、尺寸和形状修饰；组件结构与视觉变体分离。
- 主题是 CSS 变量集合，可通过 `data-theme` 在根节点或任意子树作用域切换；默认主题与 prefers-dark 主题可独立声明，主题可以嵌套。
- 主题变量同时定义 surface/content 配对、primary/secondary/accent、info/success/warning/error，以及 selector/field/box 半径、尺寸、边框、depth/noise 等材质参数。
- 配置支持只包含所需组件、排除组件、前缀命名、根作用域和关闭日志；蒸馏到 Web 项目时应保持样式按需、避免全局类名冲突。
- 组件变体优先用类组合而不是复制组件；按钮状态、尺寸、块级/方形/圆形比例都应保持命中区域和语义可访问。
- 35 个内置主题说明“主题是可替换数据”，不是让一页同时堆多套视觉；产品应选择少量兼容主题并核对对比度、焦点和状态色。

适用边界：适合快速搭建、原型和多主题 Web 产品；复杂企业流程仍需补齐 Form/Table 的校验、数据状态和反馈语义，不能只靠视觉类名。

许可/归属：daisyUI 仓库为 MIT。HakuStyle 只蒸馏语义类、变量主题和组合方式，不复制源码、Logo 或站点素材。

## 27. vueComponent/ant-design-vue

来源：

- 仓库：https://github.com/vueComponent/ant-design-vue
- 官方文档：https://antdv.com/docs/vue/introduce
- ConfigProvider：https://antdv.com/components/config-provider

平台标签：

- 主适配：Vue 2/Vue 3 的桌面优先企业级响应式 Web、SSR、Electron。
- 可迁移：Vue WebView/PWA 的组件状态和主题边界；跨框架只迁移设计契约。
- 不适用：把 Vue 的 `provide/inject`、插槽或 `v-model` API 直接用于 React/原生项目。

观察范围：GitHub README/LICENSE、介绍文档、组件分类、按需导入/Tree shaking、ConfigProvider 的 locale、size、direction、theme、popup 和 CSP 配置。

蒸馏结论：

- 与 Ant Design 共享设计资源、HTML/CSS 结构和尽可能一致的组件 API，但将配置传递落到 Vue 的 `provide/inject`，适合在 Vue 应用树内统一主题和上下文。
- 使用模板、组件注册、插槽和 `v-model` 时仍要保持受控状态、事件回传、键盘语义和焦点管理；不要把组件内部响应式状态当作业务数据源。
- 支持按需导入/Tree shaking，避免把整个组件包和所有样式载入；全局 `prefixCls`、locale、componentSize、direction、theme、popup container、empty rendering 与 CSP 应处于同一配置边界。
- ConfigProvider 的 imperative Modal/Message/Notification 可能创建独立 Vue 实例而脱离原上下文；为主题、语言和前缀一致性优先使用能继承上下文的调用方式，并为 popup 容器处理 null/SSR 情况。
- 平台默认偏桌面工作台，但 Vue 组件可响应式降级；在手机上应优先重排表单与表格、增大触控命中区、减少悬浮操作，不能只缩放桌面密度。

适用边界：适合 Vue 管理台、后台、配置页和数据密集工作流；博客与游戏化页面只借用组件状态、表单反馈、主题上下文和按需加载原则。

许可/归属：ant-design-vue 仓库声明 MIT。Ant Design 共享设计资源、图标和第三方内容仍需按各自许可证核对；不复制 Vue 源码或品牌素材。

## 28. nordtheme/termite

来源：

- 仓库：https://github.com/nordtheme/termite
- Nord 调色板：https://www.nordtheme.com/docs/colors-and-palettes/

平台标签：

- 主适配：Termite/Linux 终端与代码阅读场景。
- 可迁移：暗色 Web、开发者工具、代码块、仪表盘状态 Token。
- 不适用：把终端 16 色当作完整品牌系统，或在移动 Web 上直接使用小字号/低触控密度。

观察范围：仓库 README、`src/config`、MIT 许可证和 Nord 官方 Colors and Palettes 文档。

蒸馏结论：

- Nord 由 16 个低饱和、偏冷的 dimmed pastel 颜色组成，分为 Polar Night、Snow Storm、Frost、Aurora 四组，强调清晰、简洁、扁平和不打断阅读。
- Polar Night (`#2E3440` 到 `#4C566A`) 适合暗色背景、面板、边框和次级文本；Snow Storm (`#D8DEE9` 到 `#ECEFF4`) 适合正文、浅色表面和高可读文字。
- Frost (`#8FBCBB`、`#88C0D0`、`#81A1C1`、`#5E81AC`) 依次承担主、次、三级强调；Aurora 中红/橙/黄/绿/紫分别承载错误、危险/特殊、警告、成功和不常规状态。
- Termite 映射给出背景/前景、选中高亮、光标和 ANSI 0–15 色的明确角色；迁移到 Web 时应把这些角色转为 semantic surface/content/accent/status，而不是只抄十六进制。
- 暗色界面要保证正文与代码的层级，避免纯黑底和纯白字；状态色需要同时有图标/文本/边框等非颜色信号。

适用边界：适合代码、终端、开发者工具和克制的暗色 Web；摄影博客、儿童/游戏首页或高情绪品牌需要另外的主视觉方案。

许可/归属：`nordtheme/termite` 与 Nord 资料声明 MIT/对应项目许可；Nord 名称、Logo 和具体端口仍需保留归属并核对当前条款。HakuStyle 只记录调色规律，不分发 Termite 配置文件。

## 29. khang-nd/7.css

来源：

- 仓库：https://github.com/khang-nd/7.css
- 文档与演示：https://khang-nd.github.io/7.css/

平台标签：

- 主适配：PC 浏览器的桌面优先 Web，尤其是键鼠操作和固定窗口画布。
- 可迁移：响应式 Web 的语义控件、焦点环、对话框、表格、下拉和 CSS-only 组件；移动端需改为自然流布局。
- 不适用：安卓/iOS 原生界面、触控优先页面，或把 Windows 7 品牌材质当作通用默认主题。

观察范围：README、MIT 许可、官方组件文档、semantic HTML 要求、scoped stylesheet 与 tree-shaking 说明。

蒸馏结论：

- 7.css 是不含 JavaScript、依赖语义 HTML 的 CSS 框架，可在任意 Web 框架中使用；`button`、`label`、`fieldset`、`details/summary`、表格和 ARIA role 共同构成可访问的控件骨架。
- Windows 7 视觉由细腻渐变、内外高光、凹陷/凸起边框、玻璃标题栏和稳定的窗口几何表达；这类材质应只服务于桌面隐喻，不能替代内容层级。
- 文档覆盖 balloon/tooltip、button、checkbox、collapse、combobox、dropdown、groupbox、listbox、table、menu、progress、searchbox、tabs、textbox、treeview、window 等完整控件族。
- `7.scoped.css` 允许在 `.win7` 范围内共存；独立组件 CSS 支持按需导入/tree-shaking。迁移时应保留命名作用域并锁定版本，避免全局 reset 与其他设计系统冲突。
- Button 明确区分 default、hover、active、disabled、focus 和默认提交按钮；焦点使用内置点状边框，触控/键盘实现必须保留清晰命中区和语义属性。
- CSS-only 不等于行为完整：窗口拖拽、菜单开关、焦点陷阱、Escape、滚动锁定、响应式重排和状态持久化仍需由应用逻辑负责。

适用边界：适合复古桌面、个人档案、模拟系统界面和 PC 端工具；博客正文、移动优先控制台和低功耗触屏设备应只借用语义控件规则。

许可/归属：7.css 仓库为 MIT，并基于 XP.css/98.css 的设计脉络。HakuStyle 不复制 CSS 源码、Windows 商标、图标或演示素材；实际依赖时需保留许可证与上游归属。

## 30. Clooos/Home-Assistant-Mobile-First

来源：

- 仓库：https://github.com/Clooos/Home-Assistant-Mobile-First

平台标签：

- 主适配：移动优先 Web/PWA/WebView 的家庭控制、状态监控和快速操作。
- 可迁移：响应式 Web 仪表盘、触控设备控制面板、平板增强布局。
- 不适用：以鼠标悬停为主的桌面工具、长文阅读、需要通用品牌组件库的页面。

观察范围：README、截图/功能说明、Noctis 主题、Lovelace card-mod、button-card、sticky footer、房间/实体卡和依赖列表。该仓库 README 已标注项目不再维护，新增实现需核对依赖现状。

蒸馏结论：

- 移动优先不是把桌面缩小，而是先确定单手操作的主路径：顶部天气/日期/环境摘要，中部按房间或任务分组的实体卡，底部 sticky 快捷栏承载静音、遮阳、视图切换等低摩擦动作。
- 卡片优先表达“当前状态 + 一个常用动作”，复杂调节才进入独立控件；灯光、温度、媒体、摄像头、日历、能耗图等模块共享同一表面和间距，但保留各自状态语义。
- 触控命中区、底部安全区和 sticky footer 必须稳定，使用 `env(safe-area-inset-bottom)`，避免底栏覆盖最后一张卡；键盘/鼠标 Web 仍需有 focus-visible 和 hover 的非触控增强。
- 使用深色、低干扰背景和高对比状态色；在线/活动/警告/关闭状态不能只依赖颜色，应配合图标、文字、数值或边框。
- 通过模板和可复用卡片配置减少重复；业务实体、卡片样式和主题变量分离，允许用户按房间/视图重排，而不把数据绑定硬编码进视觉组件。
- 桌面/平板渐进增强：在更宽视口增加列数、摘要图表和侧边导航，但不破坏手机上顺序清晰、按钮靠近拇指和快速完成任务的路径。

适用边界：适合移动控制台、家庭自动化、设备状态与快捷操作；不要直接复制 Home Assistant YAML、实体 ID、第三方卡片代码、图标、背景或主题文件。

许可/归属：本轮以公开 GitHub README 和项目说明作为观察来源；仓库未在目标路径确认独立 LICENSE 页面，且项目声明不再维护。HakuStyle 只记录移动优先信息架构和交互规律，复用任何仓库代码或依赖前必须重新核对许可证、维护状态和第三方声明。

## 31. Hurt-in-dream 个人信息 Bento 页面

来源：

- 网站：https://hurtindream.de/

平台标签：

- 主适配：桌面优先、响应式 Web 的个人主页、状态面板和档案页。
- 可迁移：平板/手机单列个人主页、轻量 PWA/WebView 档案页。
- 不适用：需要高可读长文的文章正文、低端设备上的全屏模糊墙纸、依赖鼠标才能操作的装饰角色。

观察范围：首页公开 DOM、桌面视口截图、390px 窄屏布局、卡片 computed style、`#live2d` canvas 与滚轮反馈。页面使用四列 Bento Grid；身份卡中的 Live2D canvas 在卡片内部独立渲染，画布默认 `cursor: grab`，滚轮可按指针位置缩放，身份卡在移动端进入单列并缩小画布。

蒸馏结论：

- **Bento 信息架构**：以 `max-width: 1100px` 左右的容器承载四列网格，主身份卡跨两列/两行，状态、时间和设备卡承担高密度摘要，媒体/一言与导航卡放在下方；这是编辑型信息编排，应使用显式 Grid span，不要把它误写成任意 masonry。
- **玻璃材质**：卡片使用约 `rgba(255,255,255,.035)` 的低透明表面、`backdrop-filter: blur(28px)`、约 `rgba(255,255,255,.07)` 细边框、24px 圆角、深色柔和阴影和 1px 内侧高光；悬停只做轻微上移/放大，并提高表面和边框不透明度。正文文字和交互控件必须使用不透明或高对比前景，玻璃层不能承担唯一的分组线索。
- **壁纸与内容层分离**：背景图/渐变/遮罩固定在内容下方，内容卡片仍保持稳定宽度与阅读层级；应允许关闭壁纸、降低透明度或切换到实色面板，不能把动态背景当作信息本身。
- **可抓取装饰角色**：把角色/模型封装成独立的 `canvas` 或替代 DOM 层，默认 `grab`、按住时 `grabbing`；拖拽只更新角色层的平移，不得劫持卡片文字选择、滚动或链接点击。缩放以指针/触点为锚点，设置最小/最大比例、卡片边界和失焦收尾，避免模型跑出视口。
- **输入与降级**：鼠标拖拽和滚轮缩放必须补充触控 `pointer` 手势；为键盘和无指针用户提供“放大/缩小/重置位置”按钮或等价命令，并用 `aria-label`/状态文本说明当前比例。`prefers-reduced-motion` 下停用漂浮、跟随和自动呼吸，仅保留静态角色或静态占位图。
- **响应式**：桌面使用跨列编排，约 768px 以下切成单列自然流，保留主身份卡优先级；不要只按比例缩小桌面四列。窄屏画布需要固定 `aspect-ratio`/最大高度、触控安全边距和足够文字空间，页脚与浮动控件要避开 safe area。
- **性能与可访问性**：`backdrop-filter`、大图和 canvas 都要有实色/无滤镜回退；限制 DPR、暂停隐藏页面或离屏 canvas、清理事件与动画帧。玻璃卡片的焦点环、状态文字和边界必须在高对比模式、键盘导航和无背景图片时仍可见。

适用边界：适合个人档案、作品集、状态摘要和游戏化主页的玻璃 Bento 壳；不要把 28px 模糊、全屏壁纸、Live2D 或自定义光标作为所有页面的默认层，也不要复制原站的角色、图片、字体、光标、Logo 或脚本。

许可/归属：本轮仅以公开页面的可见布局、样式和交互行为作为设计观察；HakuStyle 只记录可迁移规律，不打包原站素材或代码。实际复用任何依赖、模型或媒体前，需重新核对其许可证、来源和维护状态。

## 32. 平台适配矩阵

| 编号与来源                      | 主适配平台                | 可迁移方向                      | 明确边界                                                     |
| ------------------------------- | ------------------------- | ------------------------------- | ------------------------------------------------------------ |
| 1 Leonus 浮动菜单               | 响应式 Web、桌面博客      | PWA、WebView                    | 触控需放大命中区，不能遮挡正文                               |
| 2 FF7 UI                        | PC 浏览器、桌面游戏化 Web | 平板 Web                        | 不是原生游戏 UI；手机只保留平面化窗口                        |
| 3 Clarity 博客主题              | 桌面优先响应式博客        | 平板/手机阅读                   | 不套高密度后台或沉浸式游戏壳                                 |
| 4 纸鹿前端文章                  | 长文 Web、技术文档        | PWA、平板阅读                   | 这是排版/主题工程规则，不是独立视觉皮肤                      |
| 5 Anheyu                        | 桌面优先产品介绍 Web      | 响应式营销页                    | 不用于长文、后台或移动原生工具                               |
| 6 Haku76 主题                   | 桌面优先 VitePress/博客   | 平板/手机 Web                   | 像素字体和特效必须降级，不当原生 JRPG UI                     |
| 7 Imsyy 设置/右键菜单           | 桌面博客、响应式 Web      | PWA/WebView                     | 手机不依赖右键；设置需传统入口                               |
| 8 Bikari 浮动栏                 | 响应式 Web                | PWA/WebView                     | 触控需安全区与大命中区                                       |
| 9 Uiverse 翻转卡                | 桌面交互 Web              | 平板/手机点击切换               | 不把 hover 作为唯一入口                                      |
| 10 Uiverse 搜索框               | 桌面交互 Web              | PWA/手机 Web                    | 动态渐变需静态、低功耗回退                                   |
| 11 Uiverse 右键菜单             | PC 浏览器                 | 长按/更多菜单的移动改造         | 不替代输入、选区与系统菜单                                   |
| 12 Uiverse 播放器               | 响应式媒体 Web            | PWA/WebView                     | 音量/队列不能 hover-only                                     |
| 13 React Bits Balatro           | GPU 可用的桌面 Web        | 平板/高端手机降级               | shader 不是核心内容，需静态回退                              |
| 14 React Bits Carousel          | 响应式交互 Web            | 触控 PWA/平板                   | 3D 和 autoplay 必须可关闭                                    |
| 15 Pokemon Cards CSS            | 桌面收藏/展示 Web         | 平板触控、手机平面卡            | 品牌素材不复用；高成本材质只给活动卡                         |
| 16 Blue Archive VitePress       | 桌面优先博客/文档         | 平板/手机 Web                   | 不当原生手游 UI；角色素材不复用                              |
| 17 Mizuki                       | 桌面优先响应式博客        | 超宽屏与手机 Web                | 配置很多但每页仍只选一个主方向                               |
| 18 Sakurairo                    | 桌面优先 WordPress 博客   | 响应式移动博客                  | 大图/音乐/视频是可选增强                                     |
| 19 Lunora 侧栏                  | PC 浏览器 SaaS/后台       | 手机抽屉                        | 移动端不能只显示无标签图标轨                                 |
| 20 Dogument 字体                | 桌面复古 Web、短文案      | 移动短标签                      | 不默认用于长文；字体权利需单查                               |
| 21 Gaoice                       | PC 浏览器桌面隐喻         | 大屏 Web、手机自然流回退        | 不用于移动优先或原生 Android/iOS                             |
| 22 xlrt 卡片                    | PC/手机个人主页 Web       | PWA/WebView                     | 固定卡片不用于长表单和数据后台                               |
| 23 Soki 图片墙                  | 桌面作品集 Web            | 手机横向 snap 画廊              | 动态任意数据不套固定拼贴                                     |
| 24 CRWeb 档案页                 | 桌面沉浸式个人 Web        | 手机单列降级                    | 画布、光标与持续动效不能成为必需                             |
| 25 Ant Design                   | 企业级桌面优先响应式 Web  | 移动 Web、Electron              | React 组件 API 不跨框架搬运                                  |
| 26 daisyUI                      | Tailwind 响应式 Web       | React/Vue/Svelte/Web Components | 需要 CSS 构建与命名作用域                                    |
| 27 Ant Design Vue               | Vue 桌面优先响应式 Web    | Vue PWA/WebView                 | `provide/inject`、slot、`v-model` 只在 Vue 语境适用          |
| 28 Nord Termite                 | Linux 终端                | 暗色开发者 Web、代码块          | 不是完整品牌组件库                                           |
| 29 7.css                        | PC 浏览器桌面隐喻         | 大屏 Web、语义控件              | 不用于移动优先或原生 Android/iOS                             |
| 30 Home Assistant Mobile First  | 移动 Web/PWA/WebView      | 平板、响应式 Web                | 不以 hover 为必需交互，不照搬旧依赖                          |
| 31 Hurt-in-dream Bento 玻璃档案 | 桌面优先响应式 Web        | 平板/手机单列、PWA/WebView      | 玻璃需实色回退；角色拖拽缩放不可成为唯一操作；不复制原站素材 |

## 33. 交叉规则

- 本 Skill 面向 Web，优先使用语义化 HTML、CSS、JavaScript、响应式设计、浏览器能力检测、可访问性和性能约束，不绑定 Vue、React、Astro、VitePress 或 WordPress。
- 先确认平台和产品密度，再从来源档案按主适配标签筛选 1 个主配方与至多 1 个辅助配方；只有在说明迁移理由后才跨平台借用。
- 先建立设计 token，再把 token 应用到导航、内容面板、代码块、分页、弹窗和焦点态。
- 以稳定的阅读/工作表面为基础，在层级和状态边界使用强烈视觉签名。
- 主流程保持可见，低频操作渐进披露；自定义菜单、浮动工具和个性化面板必须有传统入口和键盘路径。
- 动效必须解释状态变化，并支持 `prefers-reduced-motion`；WebGL、混合模式和多层模糊必须有低成本回退。
- 每个页面选择一个主视觉语言和至多一个辅助特效，避免把 FF 边框、BA 顶栏、霓虹搜索框、玻璃壁纸、宝可梦闪膜、樱花封面、Win7 窗口和移动控制底栏同时堆叠。
- 只蒸馏可迁移规律，不把原项目源码、字体、角色、Logo、图片、纹理或音频素材直接打包进 Skill。

## 34. 第二次蒸馏产物

- `typography-density-system.md`：将来源中的字号、控件高度、圆角、间距、边框、透明度与装饰规律归一为 HakuStyle 基线。
- `layout-archetypes.md`：将来源重新组织为工作台、阅读页、个人档案、编辑型画廊、移动控制台和桌面/JRPG 窗口六类页面原型。
- `interaction-motion-system.md`：将菜单、搜索、侧栏、卡片、轮播、拖拽、主题和反馈整理为状态机与时序预算。
- `theme-selection-matrix.md`：把用户确认的配色偏好映射到产品类型、材质和特效边界。
- `anti-ai-ui-checklist.md`：针对小字号、平均卡片、过度透明、无意义圆球、同色描边与文字、泛滥动效等生成式 UI 痕迹建立验收门槛。
- `source-contribution-index.md`：逐项说明全部 31 个来源在第二次蒸馏中承担的具体职责，保证来源被吸收但不会在单一页面中无条件堆叠。

## 当前项目状态

- 已记录用户目前提供的全部 31 组来源，并完成平台适配标签和第二次交叉蒸馏。
- 项目暂定名为 `HakuStyle`，仓库 slug 为 `hakustyle`。
- 正式 Skill 已初始化，目录为 `outputs/hakustyle/`；后续样本可继续追加。
- Skill 已包含 `SKILL.md`、`agents/openai.yaml`、专项 `references/` 和 README；第二次蒸馏已通过 Skill Creator 校验。
