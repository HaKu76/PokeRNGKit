/* global document, navigator, window */

const defaults = {
  shell: "workspace",
  theme: "ant-neutral",
  density: "standard",
  shape: "rounded",
  material: "solid",
  motion: "smooth",
  effect: "none",
  mode: "light",
  viewport: "desktop",
};

const state = { ...defaults };

const labels = {
  shell: {
    workspace: "工作台",
    reading: "阅读 / 文档",
    profile: "个人档案 / 收藏",
    mobile: "移动控制台",
  },
  theme: {
    "ant-neutral": "Ant Neutral",
    "royal-blueprint": "Royal Blueprint",
    "hakudex-azure": "HakuDex Azure",
    "indigo-night": "Indigo Night",
    "frosted-lilac": "Frosted Lilac",
    "blue-archive": "Blue Archive Dual",
    "sakura-mist": "Sakura Mist",
  },
  density: {
    compact: "紧凑（15px 正文 / 40px 控件）",
    standard: "标准（16px 正文 / 44px 控件）",
    comfortable: "舒适（17px 正文 / 48px 控件）",
  },
  shape: {
    standard: "标准圆角（10px 控件 / 16px 卡片）",
    rounded: "圆润（12px 控件 / 18px 卡片）",
    themed: "主题硬朗（仅局部复古/JRPG 配方）",
  },
  material: {
    solid: "实体表面",
    glass: "轻玻璃（高不透明，可关闭背景）",
    themed: "主题材质（重点边界与内高光）",
  },
  motion: {
    quiet: "安静（约 130ms 控件反馈）",
    smooth: "顺滑（约 220ms 状态转换）",
    vivid: "鲜明（约 340ms，仍限制持续动画）",
  },
  effect: {
    none: "无额外特效",
    jrpg: "一处 JRPG 重点框",
    foil: "一处收藏卡牌材质",
    ambient: "一处低速动态背景",
  },
  mode: {
    light: "浅色",
    dark: "深色",
  },
};

const shellDetails = {
  workspace: {
    foundation: "现有组件系统 + Ant Design 状态与反馈模型",
    archetype: "Lunora 式固定分组侧栏 + 连续主工作区",
    components: "侧栏、搜索、任务进度、记录列表、收藏预览",
  },
  reading: {
    foundation: "语义文章结构 + Clarity 字体与主题工程",
    archetype: "受限阅读列 + 可选目录 + 稳定顶部导航",
    components: "文章标题、元数据、正文、提示块、页内目录",
  },
  profile: {
    foundation: "响应式 Grid + 语义卡片状态",
    archetype: "Hurt-in-dream / CRWeb 式编辑型 Bento 档案",
    components: "身份主卡、进度摘要、时间、收藏和导航",
  },
  mobile: {
    foundation: "移动优先语义控件 + 安全区处理",
    archetype: "Home Assistant 式摘要、单任务卡和底部快捷栏",
    components: "状态摘要、主要计数动作、快捷操作和底部导航",
  },
};

const exclusions = [
  "全局低透明玻璃",
  "无意义圆球、光斑和装饰胶囊",
  "普通状态下描边与文字使用同一饱和强调色",
  "卡片嵌套卡片和平均分配的模块",
  "小于 13px 的有效信息",
  "transition: all 和每个区块统一淡入上移",
];

const demoViewport = document.getElementById("demoViewport");
const previewTitle = document.getElementById("previewTitle");
const effectSelect = document.getElementById("effectSelect");
const modeToggle = document.getElementById("modeToggle");
const contractDialog = document.getElementById("contractDialog");
const contractOutput = document.getElementById("contractOutput");
const toast = document.getElementById("toast");

function selectButton(group, value) {
  const container = document.querySelector(`[data-choice-group="${group}"]`);
  if (!container) return;
  container.querySelectorAll("[data-value]").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.value === value);
    button.setAttribute("aria-pressed", String(button.dataset.value === value));
  });
}

function render() {
  demoViewport.dataset.theme = state.theme;
  demoViewport.dataset.mode = state.mode;
  demoViewport.dataset.density = state.density;
  demoViewport.dataset.shape = state.shape;
  demoViewport.dataset.material = state.material;
  demoViewport.dataset.motion = state.motion;
  demoViewport.dataset.effect = state.effect;

  demoViewport.classList.toggle("viewport-tablet", state.viewport === "tablet");
  demoViewport.classList.toggle("viewport-phone", state.viewport === "phone");

  document.querySelectorAll(".demo-view").forEach((view) => {
    const active = view.dataset.view === state.shell;
    view.classList.toggle("is-active", active);
    view.setAttribute("aria-hidden", String(!active));
  });

  previewTitle.textContent = `${labels.shell[state.shell]} · ${labels.theme[state.theme]}`;
  modeToggle.setAttribute(
    "aria-label",
    state.mode === "light" ? "切换到深色模式" : "切换到浅色模式",
  );
  modeToggle.title = modeToggle.getAttribute("aria-label");
  document.body.classList.toggle("is-dark", state.mode === "dark");
}

function buildContract() {
  const detail = shellDetails[state.shell];
  const modeText = `${labels.mode[state.mode]}预览，产品实现支持 light / dark / system`;
  return [
    `平台：响应式 Web，${state.shell === "mobile" ? "手机主用，平板与桌面增强" : "桌面主用，手机支持"}`,
    `产品类型：${labels.shell[state.shell]}`,
    `基础系统：${detail.foundation}`,
    `页面原型：${detail.archetype}`,
    `排版密度：${labels.density[state.density]}`,
    `形状：${labels.shape[state.shape]}`,
    `主题：${labels.theme[state.theme]}，${modeText}`,
    `材质：${labels.material[state.material]}`,
    `动效：${labels.motion[state.motion]}`,
    `主要组件：${detail.components}`,
    `单一特效：${labels.effect[state.effect]}`,
    `排除：${exclusions.join("；")}`,
  ].join("\n");
}

document.querySelectorAll("[data-choice-group]").forEach((container) => {
  container.addEventListener("click", (event) => {
    const button = event.target.closest("[data-value]");
    if (!button) return;
    const group = container.dataset.choiceGroup;
    state[group] = button.dataset.value;
    selectButton(group, state[group]);
    render();
  });
});

document.querySelectorAll("[data-viewport]").forEach((button) => {
  button.addEventListener("click", () => {
    state.viewport = button.dataset.viewport;
    document.querySelectorAll("[data-viewport]").forEach((item) => {
      item.classList.toggle("is-selected", item === button);
      item.setAttribute("aria-pressed", String(item === button));
    });
    render();
  });
});

effectSelect.addEventListener("change", () => {
  state.effect = effectSelect.value;
  render();
});

modeToggle.addEventListener("click", () => {
  state.mode = state.mode === "light" ? "dark" : "light";
  render();
});

document.getElementById("resetButton").addEventListener("click", () => {
  Object.assign(state, defaults);
  ["shell", "theme", "density", "shape", "material", "motion"].forEach(
    (group) => {
      selectButton(group, state[group]);
    },
  );
  effectSelect.value = state.effect;
  document.querySelectorAll("[data-viewport]").forEach((button) => {
    button.classList.toggle(
      "is-selected",
      button.dataset.viewport === state.viewport,
    );
  });
  render();
});

function openContract() {
  contractOutput.textContent = buildContract();
  contractDialog.showModal();
}

function closeContract() {
  contractDialog.close();
}

document
  .getElementById("contractButton")
  .addEventListener("click", openContract);
document.getElementById("closeDialog").addEventListener("click", closeContract);
document
  .getElementById("dialogCloseButton")
  .addEventListener("click", closeContract);

contractDialog.addEventListener("click", (event) => {
  if (event.target === contractDialog) closeContract();
});

document.getElementById("copyContract").addEventListener("click", async () => {
  const contract = buildContract();
  try {
    await navigator.clipboard.writeText(contract);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = contract;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();
    document.execCommand("copy");
    textArea.remove();
  }
  toast.classList.add("is-visible");
  window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
});

["shell", "theme", "density", "shape", "material", "motion"].forEach(
  (group) => {
    selectButton(group, state[group]);
  },
);
document.querySelectorAll("[data-viewport]").forEach((button) => {
  button.setAttribute(
    "aria-pressed",
    String(button.dataset.viewport === state.viewport),
  );
});
render();
