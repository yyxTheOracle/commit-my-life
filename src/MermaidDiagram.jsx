import { useEffect, useId, useRef, useState } from "react";

// 按需绘制原稿中的 Mermaid 图，失败时保留源码，确保文章内容仍可阅读。
export default function MermaidDiagram({ source, caption }) {
  const id = useId();
  const renderAttempt = useRef(0);
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    // StrictMode 会重复执行 effect，每轮使用独立 ID，避免临时 SVG 相互覆盖。
    const renderId = `diagram-${id.replace(/[^a-zA-Z0-9_-]/g, "")}-${++renderAttempt.current}`;
    setSvg("");
    setFailed(false);

    // 图表库只在文章需要时加载，卸载后的异步结果不再写入组件状态。
    async function renderDiagram() {
      try {
        const { default: mermaid } = await import("mermaid");
        if (!active) return;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "neutral",
          htmlLabels: false,
          suppressErrorRendering: true,
        });
        const result = await mermaid.render(renderId, source);
        if (active) setSvg(result.svg);
      } catch {
        if (active) setFailed(true);
      }
    }

    renderDiagram();
    return () => { active = false; };
  }, [id, source]);

  const isHorizontal = source.startsWith("graph LR");
  return <figure className={`diagram-figure${isHorizontal ? " horizontal-diagram" : ""}`} aria-busy={!svg && !failed}>
    {svg ? <div className="diagram-scroll" role="img" tabIndex={0}
      aria-label={caption || "文章流程图"} dangerouslySetInnerHTML={{ __html: svg }} />
      : failed ? <>
        <p className="diagram-status" role="status">图表暂时无法绘制，以下保留原始源码。</p>
        <pre className="diagram-scroll" tabIndex={0}><code>{source}</code></pre>
      </> : <p className="diagram-status" role="status">正在绘制图表…</p>}
    {caption && <figcaption>{caption}{isHorizontal && <span className="diagram-hint">可左右滚动查看完整流程</span>}</figcaption>}
  </figure>;
}
