# Commit My Life · Victor 的自留地

独立的 React / Vite 博客，沿用已确认的深蓝、薄荷绿和复古电脑插画风格。现有 Hexo 的 **13 篇文章已完整迁入**，包含尚未发布的雅典园校庆文章。代码维护于 [yyxTheOracle/commit-my-life](https://github.com/yyxTheOracle/commit-my-life)，目前只提供本地预览，尚未部署网站。

## 本地开发

```sh
git clone https://github.com/yyxTheOracle/commit-my-life.git
cd commit-my-life
npm ci
npm run dev
```

默认打开 `http://127.0.0.1:4173/`。开发服务只监听本机；如果端口被占用会明确报错。克隆到任意本地目录即可开发。

```sh
npm test
npm run build
npm run test:sites
```

内容与渲染规则测试无需构建；`test:sites` 需要先构建。构建过程只生成本地文件，不会发布。`npm run preview -- --host 127.0.0.1 --port 4175` 可检查构建产物。

## 写文章

原始 Markdown 是唯一正文来源，位于 `content/posts/`。修改文件保存后，本地页面会自动更新；新增一篇 `.md` 也会自动进入列表，不用手动修改文章数组。

```yaml
---
title: 一篇新文章
date: 2026-10-24 12:00:00
abbrlink: my-new-post
categories:
  - 随笔
tags:
  - 随笔
---
第一段同时可以用作首页摘要。

<!-- more -->

## 一个章节
正文从这里继续。
```

已有文章的 `abbrlink` 保持不变，对应 `/post/<abbrlink>.html`；新编号使用小写字母、数字或连字符，并且不可重复。兼容原 Hexo 的 `tag` / `tags`、数组与单个分类、`top: true`、`toc: false`。日期按原稿的本地日期显示，不做时区转换。

首页「最近写下的」显示日期最新的三篇；「全部文章」先显示置顶文章，再按日期倒序。原有分类和标签保存在文件中，展示主题对应为 Go、JavaScript、AI 工具、生活随笔。

本地图片放在 `public/images/`，正文引用 `/images/文件名`。支持原稿中的图片 HTML、图注、GIF、Go / JavaScript / JSX / CSS 代码、Mermaid 图和 B 站视频；HTML 会过滤脚本和事件属性，视频限制为 B 站播放器且不自动播放。没有章节的文章不显示目录。

## 迁移记录与边界

当前 `main` 从这份博客代码重新开始，不沿用原模板提交历史。旧模板的 GitHub Pages 自动部署工作流已移除。

- `migration-manifest.json` 保存迁移时 13 篇原稿与 2 张本地图片的 SHA-256，可核对原样复制；未来正常编辑文章时，对应迁移基线测试也需有意更新。
- 旧 Hexo 仓库没有改动；其未提交文件也已纳入这次拷贝。
- 47 个不同的远程图片地址仍引用原图床。外链需要联网，失效时页面提供原图链接；B 站播放器也依赖外部服务。
- 校庆原稿提到照片 p1，但没有图片地址，因此没有补造图片。
- 本轮迁移文章与其本地图片；旧站的音乐、相册、主题插件不在本轮范围内。
- 当前为浏览器渲染的本地版本。正式上线前再确定静态生成、SEO、站点域名和部署配置。

原创插画与本地 Noto Sans SC 展示字体位于 `public/assets/`，字体许可同目录保存；视觉参照为 `design/reference.png`。保留的 Sites 构建适配文件只供以后选用，不会自动上线。
