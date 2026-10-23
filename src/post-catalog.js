import { parse } from 'yaml';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

export const categories = ['Go', 'JavaScript', 'AI 工具', '生活随笔'];
const publishedIds = new Set([
  '6308cf93', '47e794c4', 'd87f7e0c', '30ad5bee', '7709adb1', 'ba9d0ab6',
  '11426bbe', '435e2644', '9e1be607', '2a798ab5', '12e2a8de', '2979ee1c',
]);
const displayTitles = {
  '12e2a8de': 'Go 并发利器 Worker Pool 实践',
  '2a798ab5': '究竟什么是 Event Loop',
};
const displayCategories = { 前端开发: 'JavaScript', AI: 'AI 工具', 随笔: '生活随笔' };

// 兼容 Hexo 的标量和数组写法，保留原始分类与标签文字。
function normalizeLabels(value, sourceFile) {
  const labels = value == null ? [] : Array.isArray(value) ? value : [value];
  if (labels.some((label) => typeof label !== 'string')) throw new Error(`${sourceFile}: 分类或标签必须为文字`);
  return labels;
}

// 用 UTC 仅校验日历日期，输出仍沿用原文日期，避免本地时区造成跨日。
function getLocalDate(value, sourceFile) {
  const match = typeof value === 'string' && value.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d)?$/);
  const date = new Date(`${match?.[1]}T00:00:00Z`);
  if (!match || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== match[1]) {
    throw new Error(`${sourceFile}: date 必须是有效日期`);
  }
  return match[1];
}

// 提取文字和行内代码，摘要中不显示链接地址、图片或 HTML 标记。
function getPlainText(node) {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return (node.children ?? []).map(getPlainText).join('');
}

// 摘要取 more 分隔符前的首个正文段落，适度截短且不截断 emoji 的代理对。
function getSummary(markdown) {
  const introduction = markdown.split(/<!--\s*more\s*-->/i)[0];
  const paragraph = unified().use(remarkParse).parse(introduction).children.find((node) => node.type === 'paragraph');
  const summary = paragraph ? getPlainText(paragraph).replace(/\s+/g, ' ').trim() : '';
  const characters = [...summary];
  return characters.length > 96 ? `${characters.slice(0, 96).join('')}…` : summary;
}

// 导入完整原稿，校验路由所需字段，并将正文与原始分类保留在内容模型中。
export function createPostCatalog(sources) {
  const ids = new Set();
  const posts = Object.entries(sources).map(([filename, rawMarkdown]) => {
    const sourceFile = filename.split('/').at(-1);
    const frontmatter = rawMarkdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontmatter) throw new Error(`${sourceFile}: 缺少 frontmatter`);
    const metadata = parse(frontmatter[1]);
    if (typeof metadata?.title !== 'string' || !metadata.title.trim()) throw new Error(`${sourceFile}: title 必填`);
    const id = metadata.abbrlink;
    if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error(`${sourceFile}: abbrlink 必须为小写字母、数字及连字符组成的字符串`);
    if (ids.has(id)) throw new Error(`${sourceFile}: 重复 abbrlink ${id}`);
    ids.add(id);
    const isoDate = getLocalDate(metadata.date, sourceFile);
    const originalCategories = normalizeLabels(metadata.categories, sourceFile);
    const tags = normalizeLabels(metadata.tags ?? metadata.tag, sourceFile);
    const category = originalCategories.includes('后端开发') && tags.includes('Go')
      ? 'Go' : displayCategories[originalCategories[0]] ?? originalCategories[0] ?? '未分类';
    const markdown = rawMarkdown.slice(frontmatter[0].length);
    return {
      id,
      title: metadata.title,
      displayTitle: displayTitles[id] ?? metadata.title,
      date: isoDate.replaceAll('-', '.'),
      isoDate,
      categories: originalCategories,
      tags,
      category,
      top: metadata.top === true,
      toc: metadata.toc !== false && metadata.no_toc !== true,
      markdown,
      sourceFile,
      localPath: `/post/${id}.html`,
      url: publishedIds.has(id) ? `https://yyx-the-oracle-github-io-g1lc.vercel.app/post/${id}.html` : null,
      summary: id === '12e2a8de' ? '让并发任务有序运行的一次实践记录。' : getSummary(markdown),
    };
  });
  return posts.sort((a, b) => b.isoDate.localeCompare(a.isoDate));
}

// 最近文章只按日期选择；完整列表优先置顶，所有筛选都保持输入数组不变。
export function selectPosts(posts, selection = 'recent') {
  const ordered = [...posts].sort((a, b) => b.isoDate.localeCompare(a.isoDate));
  if (selection === 'recent') return ordered.slice(0, 3);
  if (selection === 'all') return ordered.sort((a, b) => Number(b.top) - Number(a.top));
  return ordered.filter((post) => post.category === selection);
}
