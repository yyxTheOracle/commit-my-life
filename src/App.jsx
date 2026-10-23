import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Sun, Moon, X } from "@phosphor-icons/react";
import { categories, getVisiblePosts, posts } from "./posts.js";

const ArticlePage = lazy(() => import("./ArticlePage.jsx"));
const currentArticle = posts.find((post) => post.localPath === window.location.pathname);
const isHome = window.location.pathname === "/";

// 站内跳转也沿用本次会话的配色；禁用存储时仍可正常阅读和切换。
function readTheme() {
  try { return sessionStorage.getItem("blog-theme") === "light" ? "light" : "dark"; }
  catch { return "dark"; }
}

// 原生对话框约束焦点并支持 Escape 关闭，让关于页也可用键盘操作。
function ReadingDialog({ content, onClose }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    if (!content) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [content]);
  return (
    <dialog ref={dialogRef} className="reading-dialog" aria-labelledby="dialog-title"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {content && <div className="dialog-content">
        <div className="dialog-toolbar">
          <span className="eyebrow">A LITTLE ABOUT ME</span>
          <button className="icon-button close-button" onClick={onClose} aria-label="关闭关于" autoFocus><X size={24} weight="light" aria-hidden="true" /></button>
        </div>
        <h2 id="dialog-title">你好，我是 Victor。</h2>
        <div className="reading-copy">
          <>
            <p>欢迎来到我的自留地。这里写技术实践，也留下一些生活里的回忆与思考。</p>
            <p>从 JavaScript 的 Event Loop，到 Go 的并发任务，再到 AI 工具带来的新体验：把摸索过的过程记下来，留给未来的自己，也分享给路过的你。</p>
            <p className="about-motto">Code Clarity &gt; Code Brevity</p>
          </>
        </div>
        <div className="dialog-footer">
          <a className="text-link" href="https://github.com/yyxTheOracle" target="_blank" rel="noreferrer">在 GitHub 找到我 <ArrowUpRight size={18} aria-hidden="true" /></a>
          <button className="text-link muted-link" onClick={onClose}>返回首页</button>
        </div>
      </div>}
    </dialog>
  );
}

// 首页和文章共用导航与配色，文章渲染组件按需加载，原博客仍保持独立。
export function App() {
  const [theme, setTheme] = useState(readTheme);
  const [selection, setSelection] = useState(() => {
    const category = new URLSearchParams(window.location.search).get("category");
    return category === "all" || categories.includes(category) ? category : "recent";
  });
  const [dialog, setDialog] = useState(null);
  const articleSection = useRef(null);
  const visiblePosts = getVisiblePosts(selection);
  const sectionTitle = selection === "recent" ? "最近写下的" : selection === "all" ? "全部文章" : selection;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#0e1c2c" : "#f5f5ee";
    try { sessionStorage.setItem("blog-theme", theme); } catch { /* 存储被禁用时只保留当前页面的主题。 */ }
  }, [theme]);
  useEffect(() => {
    document.title = currentArticle ? `${currentArticle.title} · Victor 的自留地` : isHome ? "Victor 的自留地 · 保持好奇" : "文章未找到 · Victor 的自留地";
    // 首次加载时锚点可能早于 React 正文出现，返回列表后补齐滚动位置。
    if (isHome && window.location.hash === "#articles") articleSection.current?.scrollIntoView({ block: "start" });
  }, []);

  // 导航切换分类后展示结果区，保持阅读过程在同一页面内完成。
  function browseArticles(nextSelection) {
    if (!isHome) {
      window.location.href = `/?category=${encodeURIComponent(nextSelection)}#articles`;
      return;
    }
    setSelection(nextSelection);
    articleSection.current?.scrollIntoView({ block: "start" });
  }

  return <>
    <a className="skip-link" href={currentArticle ? "#article-body" : isHome ? "#articles" : "#main"}>{currentArticle ? "跳到正文" : isHome ? "跳到文章列表" : "跳到主要内容"}</a>
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href={isHome ? "#" : "/"} aria-label="Victor 的自留地，首页" onClick={() => setSelection("recent")}>victor<span>.</span></a>
        <nav className="site-nav" aria-label="主要导航">
          <button onClick={() => browseArticles("all")} aria-pressed={selection === "all"}>文章</button>
          <button onClick={() => browseArticles("生活随笔")} aria-pressed={selection === "生活随笔"}>随笔</button>
          <button onClick={() => setDialog("about")}>关于</button>
          <span className="nav-divider" aria-hidden="true" />
          <button className="icon-button theme-button" aria-label={theme === "dark" ? "切换到浅色模式" : "切换到深色模式"} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
            {theme === "dark" ? <Sun size={27} weight="light" aria-hidden="true" /> : <Moon size={25} weight="light" aria-hidden="true" />}
          </button>
        </nav>
      </header>
      <main id="main">
        {currentArticle ? <Suspense fallback={<p className="article-loading" role="status">正在打开文章…</p>}><ArticlePage post={currentArticle} /></Suspense> : !isHome ? <section className="not-found"><p className="eyebrow">404</p><h1>没有找到这篇文章</h1><p>这个地址可能有误，去文章列表看看吧。</p><a className="primary-link" href="/?category=all#articles">返回全部文章 <ArrowRight size={20} /></a></section> : <>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow">HELLO, I'M VICTOR</p>
            <h1 id="hero-title">保持好奇，<br />把想法<br /><span>变成现实。</span></h1>
            <p className="hero-description">写代码，也记录生活。这里收藏技术探索、<br className="desktop-break" />灵感，以及值得记住的瞬间。</p>
            <a className="primary-link" href="#articles" onClick={() => setSelection("recent")}>开始阅读 <ArrowUpRight size={23} aria-hidden="true" /></a>
          </div>
          <div className="hero-art"><img src="/assets/curiosity-hero.png" alt="复古电脑、薄荷绿星球、书本与植物构成的好奇心实验室" width="1426" height="1103" fetchPriority="high" draggable="false" /></div>
        </section>
        <section id="articles" className="writing-section" ref={articleSection} aria-labelledby="writing-heading">
          <div className="article-column">
            <div className="section-heading">
              <h2 id="writing-heading" aria-live="polite">{sectionTitle}</h2>
              <button className="text-link" onClick={() => setSelection(selection === "all" ? "recent" : "all")}>{selection === "all" ? "最近文章" : "全部文章"}<ArrowUpRight size={18} aria-hidden="true" /></button>
            </div>
            <ul className="article-list">{visiblePosts.map((post) => {
              return <li key={post.id}>
              <a className="article-row" href={post.localPath} aria-label={`阅读文章：${post.title}`}>
                <span className="article-text">
                  <span className="post-meta">{selection !== "recent" && post.top && <span className="pinned-label">置顶 · </span>}<span>{post.category}</span><span aria-hidden="true">·</span><time dateTime={post.date.replaceAll(".", "-")}>{post.date}</time></span>
                  <span className="post-title">{post.displayTitle || post.title}</span>
                  {post.summary && <span className="post-summary">{post.summary}</span>}
                </span>
                <ArrowRight className="article-arrow" size={21} weight="light" aria-hidden="true" />
              </a>
            </li>; })}</ul>
          </div>
          <aside className="topics" aria-labelledby="topics-title">
            <h2 id="topics-title">探索主题</h2>
            <ul>{categories.map((category) => <li key={category}>
              <button aria-pressed={selection === category} onClick={() => browseArticles(selection === category ? "recent" : category)}><span>{category}</span><ArrowRight size={20} weight="light" aria-hidden="true" /></button>
            </li>)}</ul>
          </aside>
        </section>
        </>}
      </main>
      <footer className="site-footer"><span>记录探索，也记录日常。</span><span>Victor 的自留地 <span className="footer-divider" aria-hidden="true">/</span> 保持好奇</span></footer>
    </div>
    <ReadingDialog content={dialog} onClose={() => setDialog(null)} />
  </>;
}
