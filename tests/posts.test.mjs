import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { categories, createPostCatalog, selectPosts } from '../src/post-catalog.js';

const projectRoot = new URL('../', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('migration-manifest.json', projectRoot), 'utf8'));
const sources = Object.fromEntries(manifest.posts.map((entry) => [entry.sourceFile, readFileSync(new URL(entry.path, projectRoot), 'utf8')]));
const posts = createPostCatalog(sources);
const validSource = '---\ntitle: 测试文章\nabbrlink: abcdef12\ndate: 2024-02-29 23:59:59\n---\n\n正文摘要。<!-- more -->\n后续正文';

test('迁入全部十三篇文章和两份本地图片，文件字节与原目录的迁移清单一致', () => {
  assert.equal(manifest.posts.length, 13);
  assert.equal(manifest.assets.length, 2);
  // 迁移清单只约束原稿；以后新增文章也须通过元数据与唯一编号校验。
  const currentSources = Object.fromEntries(readdirSync(new URL('content/posts/', projectRoot)).filter((file) => file.endsWith('.md')).map((file) => [file, readFileSync(new URL(`content/posts/${file}`, projectRoot), 'utf8')]));
  assert.ok(createPostCatalog(currentSources).length >= manifest.posts.length);
  for (const entry of [...manifest.posts, ...manifest.assets]) {
    const actualHash = createHash('sha256').update(readFileSync(new URL(entry.path, projectRoot))).digest('hex');
    assert.equal(actualHash, entry.sha256, entry.path);
  }
  assert.equal(posts.length, 13);
  assert.equal(new Set(posts.map((post) => post.id)).size, 13);
});

test('内容模型保留原稿正文、旧链接和本地路由，校庆文章不生成线上地址', () => {
  for (const post of posts) {
    const raw = sources[post.sourceFile];
    const bodyStart = raw.indexOf('\n---\n', 4) + '\n---\n'.length;
    assert.equal(post.markdown, raw.slice(bodyStart));
    assert.equal(post.localPath, `/post/${post.id}.html`);
    assert.equal(post.date, post.isoDate.replaceAll('-', '.'));
    assert.equal(post.url, post.id === '310ea7d9' ? null : `https://yyx-the-oracle-github-io-g1lc.vercel.app/post/${post.id}.html`);
  }
  assert.equal(posts.find((post) => post.id === '12e2a8de').displayTitle, 'Go 并发利器 Worker Pool 实践');
  assert.equal(posts.find((post) => post.id === '12e2a8de').summary, '让并发任务有序运行的一次实践记录。');
  assert.equal(posts.find((post) => post.id === '2a798ab5').displayTitle, '究竟什么是 Event Loop');
});

test('兼容 tag/tags 标量数组、目录开关和置顶标记', () => {
  const setback = posts.find((post) => post.id === '7709adb1');
  assert.deepEqual(setback.tags, ['随笔']);
  assert.deepEqual(setback.categories, ['随笔']);
  assert.equal(setback.toc, false);
  assert.equal(setback.top, false);
  assert.equal(posts.find((post) => post.id === '435e2644').top, true);
  assert.deepEqual(posts.find((post) => post.id === '12e2a8de').tags, ['后端开发', 'Go']);
  assert.equal(posts.find((post) => post.id === '12e2a8de').toc, true);
});

test('最近三篇按日期排列，全部文章置顶优先，分类筛选不修改原数组', () => {
  const originalPosts = structuredClone(posts);
  assert.deepEqual(posts.slice(0, 3).map((post) => post.id), ['310ea7d9', '2979ee1c', '12e2a8de']);
  assert.deepEqual(selectPosts(posts).map((post) => post.id), ['310ea7d9', '2979ee1c', '12e2a8de']);
  const all = selectPosts(posts, 'all');
  assert.equal(all.length, 13);
  assert.deepEqual(all.slice(0, 4).map((post) => post.id), ['435e2644', '310ea7d9', '2979ee1c', '12e2a8de']);
  assert.deepEqual(all.slice(1).map((post) => post.isoDate), all.slice(1).map((post) => post.isoDate).sort().reverse());
  assert.deepEqual(categories, ['Go', 'JavaScript', 'AI 工具', '生活随笔']);
  for (const [category, count] of [['Go', 1], ['JavaScript', 6], ['AI 工具', 1], ['生活随笔', 5]]) {
    const visible = selectPosts(posts, category);
    assert.equal(visible.length, count);
    assert.ok(visible.every((post) => post.category === category));
    visible.pop();
  }
  assert.deepEqual(selectPosts(posts, '未知分类'), []);
  all.pop();
  assert.deepEqual(posts, originalPosts);
});

test('必填字段、重复路由与无效日历日期会明确报错', () => {
  assert.throws(() => createPostCatalog({ 'missing-title.md': validSource.replace('title: 测试文章\n', '') }), /title 必填/);
  assert.throws(() => createPostCatalog({ 'missing-date.md': validSource.replace('date: 2024-02-29 23:59:59\n', '') }), /date 必须是有效日期/);
  assert.throws(() => createPostCatalog({ 'invalid-date.md': validSource.replace('2024-02-29', '2023-02-29') }), /date 必须是有效日期/);
  assert.throws(() => createPostCatalog({ 'invalid-month.md': validSource.replace('2024-02-29', '2024-13-29') }), /date 必须是有效日期/);
  assert.throws(() => createPostCatalog({ 'invalid-time.md': validSource.replace('23:59:59', '25:59:59') }), /date 必须是有效日期/);
  assert.throws(() => createPostCatalog({ 'one.md': validSource, 'two.md': validSource }), /重复 abbrlink abcdef12/);
  assert.throws(() => createPostCatalog({ 'invalid-id.md': validSource.replace('abcdef12', '../other') }), /abbrlink 必须/);
  const [post] = createPostCatalog({ 'valid.md': validSource });
  assert.equal(post.isoDate, '2024-02-29');
  assert.equal(post.date, '2024.02.29');
  assert.equal(post.url, null);
  assert.equal(createPostCatalog({ 'slug.md': validSource.replace('abcdef12', 'my-new-post') })[0].id, 'my-new-post');
});

test('摘要提取首段可读文字，忽略标题、链接地址和 more 后的正文', () => {
  const source = validSource.replace('正文摘要。', '# 标题\n\n正文 **加粗**、`行内代码` 与 [链接](https://example.com)。');
  const [post] = createPostCatalog({ '/content/posts/summary.md': source });
  assert.equal(post.summary, '正文 加粗、行内代码 与 链接。');
  assert.equal(post.sourceFile, 'summary.md');
});
