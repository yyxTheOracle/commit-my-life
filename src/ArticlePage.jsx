import { useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import { ArrowLeft, ArrowUpRight, Check, Copy, List, CaretDown, Clock } from "@phosphor-icons/react";
import hljs from "highlight.js/lib/core";
import go from "highlight.js/lib/languages/go";
import javascript from "highlight.js/lib/languages/javascript";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import { getArticleMeta, getHeadingId } from "./article-data.js";
import { markdownSchema, getVideoEmbed } from "./markdown-policy.js";
import MermaidDiagram from "./MermaidDiagram.jsx";
import "./article.css";

hljs.registerLanguage("go", go);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("css", css);
hljs.registerLanguage("xml", xml);
const languageAliases = { js: "javascript", jsx: "javascript" };
const rehypePlugins = [rehypeRaw, [rehypeSanitize, markdownSchema]];

// 只为已注册语言高亮，未知代码仍安全显示；复制失败时可手动选择。
function CodeBlock({ source, language }) {
  const [copyState, setCopyState] = useState("idle");
  const highlightLanguage = languageAliases[language] || language;
  const label = language || "TEXT";
  useEffect(() => {
    if (copyState === "idle") return;
    const timer = window.setTimeout(() => setCopyState("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  // 剪贴板写入由用户点击触发，成功后再显示确认状态。
  async function copyCode() {
    try { await navigator.clipboard.writeText(source); setCopyState("copied"); }
    catch { setCopyState("failed"); }
  }

  return <figure className="code-figure">
    <figcaption className="code-toolbar"><span><b>{label.toUpperCase()}</b><span className="code-lines">{source.split("\n").length} 行</span></span>
      <button onClick={copyCode} aria-label={`复制 ${label} 代码`}>{copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}<span aria-live="polite">{copyState === "copied" ? "已复制" : copyState === "failed" ? "请手动选择复制" : "复制代码"}</span></button>
    </figcaption>
    <pre tabIndex={0} aria-label={`${label} 示例代码，可滚动查看`}>{hljs.getLanguage(highlightLanguage)
      ? <code dangerouslySetInnerHTML={{ __html: hljs.highlight(source, { language: highlightLanguage }).value }} />
      : <code>{source}</code>}</pre>
  </figure>;
}

// 保留原图和 GIF 地址及指定宽度，加载失败时给读者一个可打开的原图链接。
function ArticleImage({ src, alt, width }) {
  const [failed, setFailed] = useState(false);
  const description = alt || "文章配图";
  const knownSize = src?.endsWith("redbook_report_api_screenshot.png") ? { width: 2756, height: 1498 }
    : src === "/images/2026-05-21/e2e_prompt.jpg" ? { width: 2386, height: 1920 }
    : src === "/images/2026-05-21/GPT-5.5-prompt-guidance.png" ? { width: 2292, height: 924 } : {};
  return <a className={failed ? "article-image-fallback" : "article-image-link"} href={src} target="_blank" rel="noreferrer" aria-label={`打开原图：${description}`}>
    {failed ? <>配图暂时无法加载，查看原图 <ArrowUpRight size={16} /></>
      : <img src={src} alt={description} {...knownSize} style={width ? { width: `${Number(width)}px` } : undefined} loading="lazy" onError={() => setFailed(true)} />}
  </a>;
}

// 原稿只嵌入 B 站视频；受控播放器不执行原 HTML 中的样式或脚本。
function ArticleVideo({ src }) {
  const embed = getVideoEmbed(src);
  if (!embed) return <p className="media-note">此视频地址暂不支持嵌入。</p>;
  return <div className="article-video"><iframe src={embed} title="文章中的 B 站视频" loading="lazy" allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" allow="fullscreen; picture-in-picture" /></div>;
}

// 从 pre 的语法树读取围栏代码，避免把没有语言标记的代码误当成行内文字。
function MarkdownPre({ node }) {
  const code = node.children.find((child) => child.tagName === "code");
  const source = (code?.children ?? node.children).map((child) => child.value ?? "").join("").replace(/\n$/, "");
  const language = code?.properties?.className?.find((name) => name.startsWith("language-"))?.slice(9) || "";
  if (language === "mermaid") return <MermaidDiagram source={source} caption={source.startsWith("graph LR") ? "任务从队列分发给 Worker，再汇总处理结果" : "从初始化通道到收集结果的执行流程"} />;
  return <CodeBlock source={source} language={language} />;
}

// 外部链接另开页面，站内链接与锚点保留浏览器原生导航。
function ArticleLink({ children, href }) {
  const external = /^https?:\/\//.test(href || "");
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined}>{children}</a>;
}

// 所有文章复用阅读版式，元信息和正文直接来自本地 Markdown。
export default function ArticlePage({ post }) {
  const { sections, readingMinutes, headingDepth } = useMemo(() => getArticleMeta(post.markdown), [post.markdown]);
  const showToc = post.toc !== false && sections.length > 0;
  const [activeSection, setActiveSection] = useState(sections[0]?.id);
  const [tocOpen, setTocOpen] = useState(() => window.innerWidth > 960);
  const titleParts = post.title.split("丨");
  const isWorkerPool = post.id === "12e2a8de";

  // 保持标题组件身份稳定，目录高亮更新时不重建被滚动监听引用的 DOM。
  const markdownComponents = useMemo(() => {
    // 正文最浅的标题统一从 h2 开始，页面只保留一个文章主标题。
    function SectionHeading({ node, children }) {
      const Heading = `h${Math.min(6, Number(node.tagName.slice(1)) - headingDepth + 2)}`;
      return <Heading id={getHeadingId(node.position.start.line)}>{children}</Heading>;
    }
    return { h1: SectionHeading, h2: SectionHeading, h3: SectionHeading, h4: SectionHeading, h5: SectionHeading, h6: SectionHeading, pre: MarkdownPre, img: ArticleImage, iframe: ArticleVideo, a: ArticleLink };
  }, [headingDepth]);

  useEffect(() => {
    const hash = window.location.hash;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;
    const intentEvents = ["wheel", "touchstart", "pointerdown", "keydown", "hashchange"];
    // 异步图片与图表展开时保持深链接位置，读者开始操作后停止校正。
    const observer = new ResizeObserver(() => {
      if (window.location.hash === hash) target.scrollIntoView({ behavior: "instant" });
      else stopRestoring();
    });
    // 主动阅读和离开页面时移除监听，避免把用户拉回旧章节。
    function stopRestoring() {
      observer.disconnect();
      intentEvents.forEach((type) => window.removeEventListener(type, stopRestoring));
    }
    observer.observe(document.getElementById("article-body"));
    intentEvents.forEach((type) => window.addEventListener(type, stopRestoring, { once: true, passive: true }));
    return stopRestoring;
  }, [post.id]);
  useEffect(() => {
    if (!showToc) return;
    const headings = sections.map((section) => document.getElementById(section.id));
    // 用文档位置判断当前章节，向上滚动也能准确更新目录。
    function updateActiveSection() {
      const current = headings.filter((heading) => heading && heading.getBoundingClientRect().top <= 140).at(-1);
      setActiveSection(current?.id || sections[0]?.id);
    }
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, [sections, showToc]);

  return <article className="article-page">
    <a className="article-back" href="/?category=all#articles"><ArrowLeft size={17} />全部文章</a>
    <header className="article-masthead">
      <div>
        <p className="article-kicker">{post.category}{post.tags.filter((tag) => tag !== post.category).slice(0, 2).map((tag) => <span className="article-tag" key={tag}>/ {tag}</span>)}</p>
        <h1 className="article-title">{isWorkerPool ? <>Go 并发利器<br /><span>Worker Pool 实践</span></> : <>{titleParts[0]}{titleParts.length > 1 && <><br /><span>{titleParts.slice(1).join("丨")}</span></>}</>}</h1>
        {isWorkerPool && <p className="article-deck">{post.summary}</p>}
        <div className="article-byline"><span className="article-author">Victor</span><span aria-hidden="true">·</span><time dateTime={post.isoDate}>{post.date}</time><span className="reading-time"><Clock size={16} />约 {readingMinutes} 分钟</span></div>
      </div>
      <img className="article-illustration" src="/assets/curiosity-hero.png" alt="" width="1426" height="1103" />
    </header>
    <div className="reading-layout">
      {showToc && <aside className="article-toc" aria-label="文章目录">
        <details open={tocOpen} onToggle={(event) => setTocOpen(event.currentTarget.open)}>
          <summary><span><List size={18} />本文目录</span><CaretDown className="toc-caret" size={16} /></summary>
          <nav aria-label="文章章节"><ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`} aria-current={activeSection === section.id ? "location" : undefined} onClick={() => { if (window.innerWidth <= 960) setTocOpen(false); }}><span className="toc-number">{String(index + 1).padStart(2, "0")}</span><span>{section.title}</span></a></li>)}</ol></nav>
        </details>
        <p className="toc-note">把摸索过的过程记下来，<br />留给未来的自己。</p>
      </aside>}
      <div id="article-body" className="article-body">
        <Markdown rehypePlugins={rehypePlugins} components={markdownComponents}>{post.markdown}</Markdown>
        <footer className="article-ending"><span className="article-end-label">感谢读到这里。</span><p>继续保持好奇，下篇文章见。</p><div><a className="text-link" href="/?category=all#articles"><ArrowLeft size={17} />返回文章列表</a>{post.url && <a className="article-original" href={post.url} target="_blank" rel="noreferrer">原博客版本 <ArrowUpRight size={16} /></a>}</div></footer>
      </div>
    </div>
  </article>;
}
