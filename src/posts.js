import { createPostCatalog, selectPosts } from './post-catalog.js';

export { categories } from './post-catalog.js';

const sources = import.meta.glob('/content/posts/*.md', { query: '?raw', import: 'default', eager: true });
export const posts = createPostCatalog(sources);

// 页面共享同一份原稿目录，筛选规则由可独立测试的内容模型处理。
export function getVisiblePosts(selection = 'recent') {
  return selectPosts(posts, selection);
}
