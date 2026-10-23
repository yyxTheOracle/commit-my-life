import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getArticleMeta, getHeadingId } from '../src/article-data.js';

test('真实文章包含七个一级章节，并保留行内代码中的标题文字', () => {
  const source = readFileSync(new URL('../content/posts/2026-01-11-对接小红书海量数据丨Go 并发利器 Worker Pool 实践.md', import.meta.url), 'utf8');
  const markdown = source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const metadata = getArticleMeta(markdown);
  assert.deepEqual(metadata.sections, [
    { id: 'section-2', title: '背景' },
    { id: 'section-12', title: 'Worker Pool 的核心思想' },
    { id: 'section-20', title: '为什么需要 Worker Pool？' },
    { id: 'section-30', title: '核心结构' },
    { id: 'section-63', title: 'Talk is cheap, show me the code!' },
    { id: 'section-164', title: 'FAQ' },
    { id: 'section-201', title: 'TODO' },
  ]);
  assert.equal(metadata.headingDepth, 1);
  assert.ok(metadata.readingMinutes >= 1);
});

test('重复标题按源行号生成独立锚点，行内标记不进入标题', () => {
  const markdown = '# 重复标题\n\n# 重复标题\n\n# **认识** `Worker Pool` 与 [Channel](https://example.com)\n';
  const { sections } = getArticleMeta(markdown);
  assert.deepEqual(sections, [
    { id: 'section-1', title: '重复标题' },
    { id: 'section-3', title: '重复标题' },
    { id: 'section-5', title: '认识 Worker Pool 与 Channel' },
  ]);
  assert.equal(new Set(sections.map((section) => section.id)).size, 3);
  assert.equal(getHeadingId(5), 'section-5');
});

test('代码中的井号与二级标题不会进入一级目录', () => {
  const markdown = '# 正文\n\n```sh\n# 围栏代码里的注释\n```\n\n    # 缩进代码里的注释\n\n## 二级标题\n\n# 结束\n';
  assert.deepEqual(getArticleMeta(markdown).sections, [
    { id: 'section-1', title: '正文' },
    { id: 'section-11', title: '结束' },
  ]);
});

test('没有一级标题时使用二级目录，并移除之前遇到的更深标题', () => {
  const markdown = '### 开篇补充\n\n## 第一章\n\n### 细节\n\n## 第二章\n';
  const metadata = getArticleMeta(markdown);
  assert.equal(metadata.headingDepth, 2);
  assert.deepEqual(metadata.sections, [
    { id: 'section-3', title: '第一章' },
    { id: 'section-7', title: '第二章' },
  ]);
});

test('无标题正文和代码注释返回空目录，默认标题层级为一', () => {
  for (const markdown of ['', '只有正文，没有标题。', '```sh\n# 围栏代码注释\n```\n\n    # 缩进代码注释\n']) {
    const metadata = getArticleMeta(markdown);
    assert.deepEqual(metadata.sections, []);
    assert.equal(metadata.headingDepth, 1);
  }
});

test('短文至少估算一分钟，正文和非空代码行都会增加阅读时间', () => {
  assert.deepEqual(getArticleMeta(''), { sections: [], readingMinutes: 1, headingDepth: 1 });
  assert.equal(getArticleMeta('你好 world').readingMinutes, 1);
  assert.equal(getArticleMeta('字'.repeat(351)).readingMinutes, 2);
  assert.equal(getArticleMeta('word '.repeat(351)).readingMinutes, 2);
  assert.equal(getArticleMeta(`\`\`\`go\n${'fmt.Println("hello")\n\n'.repeat(21)}\`\`\``).readingMinutes, 2);
});
