# PokeRNGKit UI 设计契约

PokeRNGKit 的正式 UI 固定采用 Ant Neutral HakuStyle 工作台。该契约适用于所有
产品模块、全局工具和后续界面改动，不作为可选主题或临时 Demo 风格。

唯一完整规范见
[`PokeRNGKit Fixed UI Contract`](../.agents/skills/web-frontend-style/references/pokerngkit-ui-contract.md)。

实现基线：`src/styles.css` 的语义令牌与工作台外壳、`src/App.tsx` 的可搜索分组
侧栏、三态主题和右下角工具 Rail。`?demo=hakustyle` 保留为独立设计预览，不替代
真实 RNG 模块。

变更前必须读取 HakuStyle 契约；任何偏离 Ant Neutral、标准密度、224px / 64px
侧栏、无编号面板、候选控件和桌面悬停工具 Rail 的修改，必须先取得项目所有者的
明确决定。
