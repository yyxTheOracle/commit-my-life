# Blog Project Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## 已确认的设计决定

- 用户已选择方案 1：深蓝背景、薄荷绿强调色与复古电脑插画；后续视觉调整以 `design/reference.png` 为真值。
- 代码仓库为 `yyxTheOracle/commit-my-life`，范围是独立 React / Vite 首页及全部 13 篇文章；用户已授权同步 GitHub，并部署到 Vercel 默认域名进行线上预览。原 Hexo 仓库保持只读。
- 正文唯一来源为 `content/posts/` 中带原 Hexo frontmatter 的 Markdown；`public/images/` 保存本地配图。不得继续使用旧的单篇正文副本。
- 保留原 `/post/<abbrlink>.html` 路径、原文、分类标签、置顶和禁用目录设置；最近三篇按日期排序，完整列表优先置顶。
- 首页和详情共用主题；支持原稿 HTML 图文、JS/JSX/CSS/Go 代码、Mermaid 和受控 B 站视频。远程配图仍依赖原图床。
- 新增或重构函数用中文语义注释，保持改动最小。提交前运行 `npm test`、`npm run build` 和 `npm run test:sites`；`migration-qa.md` 为可选的本地验收记录，不提交。
- 插画与展示字体从 `public/assets/` 本地加载；插画为本原型原创的 AI 生成素材，字体许可与字体文件同目录保存。
