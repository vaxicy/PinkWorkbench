# 粉红工作台（PinkWorkbench）项目交接文档

> 用途：为接手开发者（CodeBuddy + VS Code）提供完整上下文，可直接上手改代码 / 部署。
> 版本：v4（功能完整版，含 PWA 与 Cloudflare Pages 部署）
> 最后更新：2026-07-30

---

## 1. 项目概述

一个**纯前端、单文件的少女奶油粉风格「数字工作台」PWA 网页 App**，给用户的闺蜜使用。
灵感来自抖音上「WorkBuddy 电子手帐工作台」的截图，复刻并扩展为可交互、可本地保存的全功能看板。

**特点**
- 零后端、零构建步骤，纯静态 HTML（内联 CSS + 原生 JS），开箱即用。
- 所有用户数据存在浏览器 `localStorage`，刷新不丢。
- 已上架 Cloudflare Pages，iPhone Safari「添加到主屏幕」可当 App 用（全屏、可离线）。

**当前包含 6 个模块**：
每日计划 / 英语学习 / 运动打卡 / 记账 / 经期记录 / 小树洞（每日新闻已按用户要求移除）。

---

## 2. 技术栈

| 项 | 说明 |
|----|------|
| 语言 | HTML + CSS + 原生 JavaScript（ES6，无框架） |
| 存储 | `localStorage`，key 为 `pinkWorkbench_v4` |
| 样式 | 单文件内联 `<style>`，CSS 变量驱动主题 |
| 图标 | emoji + 自绘 SVG（无图标库） |
| PWA | `manifest.json` + `sw.js`（Service Worker 离线缓存） |
| 部署 | Cloudflare Pages（wrangler CLI） |
| 新闻 API | 暂未接入（用户选择保留按日期伪随机生成） |

---

## 3. 文件结构

```
D:\迅雷下载\vibe coding\Workbuddy\PinkWorkbench\
├── index.html      ← 主文件（1112 行，HTML+CSS+JS 全部内联，唯一需要改的文件）
├── manifest.json   ← PWA 清单（名称、图标、theme_color）
├── sw.js           ← Service Worker（离线缓存，缓存名 xiaomei-workbench-v1）
├── icon.png        ← 192×192 猫咪粉色图标（apple-touch-icon）
└── .wrangler\      ← wrangler 登录态缓存（本机已 OAuth 登录，无需重新授权）
```

> ⚠️ **唯一入口必须是 `index.html`**，Cloudflare Pages 默认只认这个名字，改名会导致根路径 404（历史踩坑）。

---

## 4. 本地运行

```bash
# 任选其一，在该目录起一个静态服务器
cd "D:\迅雷下载\vibe coding\Workbuddy\PinkWorkbench"
python3 -m http.server 8080
# 浏览器打开 http://localhost:8080
```
直接双击 `index.html` 也能开，但 Service Worker 和某些 fetch 行为在 `file://` 下受限，建议用本地服务器。

---

## 5. 部署到 Cloudflare Pages

本机 wrangler 已登录（OAuth token 缓存在 `.wrangler`），改完代码直接跑：

```bash
cd "D:\迅雷下载\vibe coding\Workbuddy\PinkWorkbench"
npx wrangler@3.99.0 pages deploy "D:\迅雷下载\vibe coding\Workbuddy\PinkWorkbench" --project-name pink-workbench
```

- Cloudflare Pages 项目名：`pink-workbench`
- 生产网址：**https://pink-workbench.pages.dev**
- 若换机器/未登录：先 `npx wrangler@3.99.0 login`（浏览器 OAuth 授权一次）。

**iOS 添加到主屏幕**：iPhone Safari 打开生产网址 → 分享 → 添加到主屏幕。

---

## 6. 设计系统（配色 / 主题）

所有颜色在 `index.html` 顶部 `:root` 用 CSS 变量定义，改主题只动这里：

```css
--bg:#fff5f7; --bg-dot:#ffe3eb; --panel:#fff9fb; --cream:#fff0f3;
--pink-1:#ffd6e0; --pink-2:#ffb3c6; --pink-3:#ff8fab; --pink-4:#ff7096;
--brown:#8a6268; --brown-light:#b39299;
--green:#7cc09c; --blue:#8ecae6; --purple:#c9a0dc;
--shadow:0 6px 18px rgba(255,143,171,.15);
--radius-lg:24px; --radius:16px; --radius-sm:12px;
--font:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",-apple-system,sans-serif;
```

- 背景：奶油粉底 + 粉色圆点纹理（`radial-gradient`）
- 主色：`--pink-3`；强调：`--pink-4`
- 圆角层级：大卡片 24px / 卡片 16px / 控件 12px / 胶囊 999px
- 文字主色 `--brown`，次要 `--brown-light`

---

## 7. 数据模型（state 结构）

`defaultState()` 返回初始空数据（所有模块初始化为空，用户自行添加）：

```js
{
  profile: { name:'小美的工作台', avatarType:'emoji'|'custom', avatar:'🐱', customAvatar:null },
  plan: {
    tab:'todo'|'schedule',
    activeCat:'all'|分类id,
    categories:[ {id, icon, name} ... ],   // 可用户自定义增删
    todos:[ {id, text, cat, time, done} ... ],
    schedule:[ {id, text, cat, time, done} ... ]
  },
  english: { tab:'words'|'sentences' },
  sport: { tab:'today'|'week', items:[ {id, name, dur, done} ... ], week:[0..7个分钟数] },
  money: { tab:'today'|'month', records:[ {id, type:'expense'|'income', cat, amt, note, date} ... ] },
  period: {
    tab:'calendar'|'stats', viewDate:'YYYY-MM-DD', selectedDay:'YYYY-MM-DD',
    currentStart:null|'YYYY-MM-DD',   // 正在进行的经期起点（toggle 控制）
    records:[ {startDate, endDate} ... ],
    feelings:{ 'YYYY-MM-DD': {mood, pain, symptoms[], flow, color} }
  },
  tree: { entries:[ {id, text, mood, date, time} ... ] }
}
```

- `loadState()` 会调用 `ensureState()` 自动补全缺失字段，旧版本数据不会崩。
- `saveState()` 有 try-catch，localStorage 写满时弹自定义提示（头像过大常见）。

---

## 8. 模块与核心函数索引

代码按注释分块（`/* ===== 模块名 ===== */`），按模块找最快。

| 模块 | 渲染函数 | 关键交互函数 |
|------|---------|------------|
| 路由 | `render()` `switchPage()` | `currentPage` |
| 个人资料 | `renderProfile()` | `handleAvatar()`（上传→压缩 120×120 base64） |
| 每日计划 | `renderPlan()` | `renderPlanTasks()` `renderCustomSelect()` `openTimePicker()`（居中弹窗时间选择器） |
| 英语学习 | `renderEnglish()` | 数据池 `wordsPool` `sentencePool`，用 `pickByDate()` 按日取 |
| 运动打卡 | `renderSport()` | 今日勾选 + 周柱状图 + 完成率圆环（SVG） |
| 记账 | `renderMoney()` | `addMoney()` `delMoney()` `editMoney()` `renderMoneyChart()`（月支出柱状图） |
| 经期记录 | `renderPeriod()` | `renderPeriodCalendar()` `togglePeriod()`（开关经期）`savePeriodFeel()` `renderPeriodStats()` |
| 小树洞 | `renderTree()` | `addTreeEntry()` `delTree()` `editTree()` |
| 弹窗 | `showModal()` `showConfirm()` | 替代原生 alert/confirm/prompt |
| 数据备份 | —— | 侧边栏导出/导入/清空（导出 JSON、导入恢复、清空） |

---

## 9. 可复用工具函数（改代码前先了解）

- `todayKey()` → `'YYYY-MM-DD'`（本地时区，靠 `toISOString` 注意 UTC 偏移，目前未见问题）。
- `nowTime()` → `'HH:MM'`，添加记录自动填当前时间，无需用户选。
- `pickByDate(arr, n, offset)` → 用当天日期做种子洗牌，返回前 n 项。**同一天内容固定、跨天自动换**（英语每日更新靠它）。
- `esc(s)` → HTML 转义，所有用户文本渲染前必须过一遍（防 XSS / 破坏布局）。
- `div(cls)` → 快捷创建 `<div>`。
- `renderCustomSelect(container, options, value, placeholder)` + `getCustomSelectValue(container)` → 奶油粉下拉框（替代原生 select），记账分类、计划分类都用它。
- `openTimePicker(currentValue, onDone, allowEmpty)` → **居中 modal 弹窗**时间选择器（非下拉），日程用。
- `showModal({title, body, input, noCancel, render})` 返回 Promise；`showConfirm(body)` 返回 Promise<boolean>，删除类操作统一用它。

---

## 10. PWA / 离线说明

- `manifest.json`：`display:standalone`、`theme_color:#ff8fab`、图标 `icon.png`。
- `sw.js`：缓存 `./`、`index.html`、`manifest.json`、`icon.png`；fetch 走 cache-first，离线可用。
- **改完代码部署后**，若用户反映页面没更新，多半是 Service Worker 旧缓存 → 需改 `sw.js` 的 `CACHE_NAME`（如 `v2`）强制刷新，或让用户清站点数据。

---

## 11. 已知问题 & 待办（后续可做的优化）

按优先级 / 用户提过的：

1. **真实新闻 API 接入**（用户暂未要，路线已备好）
   - 路线 A：聚合数据「新闻头条」+「财经新闻」+ Cloudflare Worker 免费代理（中文体验最佳，热点/财经真不同源）。
   - 路线 B：纯前端直连 GNews（CORS 友好，但偏国际英文）。
2. **数据云同步**：目前纯 localStorage，换设备/清缓存数据丢失；可接 Cloudflare KV / Workers / LeanCloud。
3. **图表增强**：记账分类饼图、体重/体温曲线、运动圆环已做但可更精细。
4. **深色模式 / 多主题切换**。
5. **浏览器通知提醒**（Notion 类番茄钟/喝水提醒）。
6. **角标/未读**：各模块可加小红点提示。

---

## 12. 给接手者的上手建议

- **先本地起服务器看一遍**再改，熟悉 6 个模块交互。
- 改 UI 先改 `:root` 变量和对应 class，别硬编码颜色。
- 任何新增「用户输入」渲染，记得 `esc()`。
- 新增模块：在 `defaultState()` 加字段 → 写 `renderXxx(box)` → 在 `render()` 的 switch 加 case → 侧边栏 `nav-item` 加 `data-page`，导航/标题表 `pageIcons`/`pageTitles` 加项。
- 部署前用 `node --check` 校验内嵌 JS（提取 `<script>` 内容），避免语法错误上线白屏。
- localStorage key 升级时记得 +1（当前 `pinkWorkbench_v4`），并在 `ensureState` 兜底。

---

## 13. 关键坑（历史踩过的雷）

- ❌ 主文件用 `workbench.html` 导致 Cloudflare Pages 根路径 404 → 已改名 `index.html`，`manifest.json`/`sw.js` 引用同步改。
- ❌ 头像过大写爆 localStorage → 已压缩到 120×120 JPEG 再存，并加 try-catch 提示。
- ❌ `renderProfile` 访问 `nameEl.tagName` 时 `profileName` 已被替换成 input 导致 null 崩溃 → 已加空值判断。
- ❌ 原生 `alert/confirm/prompt` 在 PWA 里体验差 → 全部用自定义 modal。
- ❌ `toISOString()` 是 UTC，跨时区日期可能偏移，关键日期计算已用本地构造 `new Date(str+'T00:00:00')`。
