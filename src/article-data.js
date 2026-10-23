import { unified } from 'unified';
import remarkParse from 'remark-parse';

// 用源文件行号生成锚点，让重名标题也能与渲染后的章节一一对应。
export function getHeadingId(line) {
  return `section-${line}`;
}

// 保留标题中的文字与行内代码，移除强调、链接等 Markdown 展示标记。
function getHeadingText(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return (node.children ?? []).map(getHeadingText).join('');
}

// 从 Markdown AST 提取最浅层级目录，并按每分钟 350 字词、20 行代码估算阅读时间。
export function getArticleMeta(markdown) {
  const tree = unified().use(remarkParse).parse(markdown);
  const sections = [];
  const text = [];
  let headingDepth = Infinity;
  let codeLines = 0;

  // 按正文顺序收集标题和阅读量；代码块整体计行，内部的 # 不会成为目录项。
  function visit(node) {
    if (node.type === 'heading' && node.depth <= headingDepth) {
      // 后文出现更浅的标题时，前面收集的深层标题不再作为主目录。
      if (node.depth < headingDepth) sections.length = 0;
      headingDepth = node.depth;
      sections.push({ id: getHeadingId(node.position.start.line), title: getHeadingText(node) });
    }
    if (node.type === 'text' || node.type === 'inlineCode') text.push(node.value);
    if (node.type === 'code') codeLines += node.value.split('\n').filter((line) => line.trim()).length;
    for (const child of node.children ?? []) visit(child);
  }

  visit(tree);
  const prose = text.join(' ');
  const chineseCharacters = prose.match(/\p{Script=Han}/gu)?.length ?? 0;
  const englishWords = prose.match(/[A-Za-z]+/g)?.length ?? 0;
  const readingMinutes = Math.max(1, Math.ceil((chineseCharacters + englishWords) / 350 + codeLines / 20));
  return { sections, readingMinutes, headingDepth: sections.length ? headingDepth : 1 };
}
