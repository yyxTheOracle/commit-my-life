import { defaultSchema } from 'rehype-sanitize';

// 将共享属性落实到原有标签，避免 iframe 继承宽泛的全局属性；其目标地址仍须组件校验。
export const markdownSchema = {
  ...defaultSchema,
  tagNames: [...defaultSchema.tagNames, 'center', 'iframe'],
  strip: [...defaultSchema.strip, 'style'],
  attributes: {
    ...Object.fromEntries(defaultSchema.tagNames.map((tag) => [
      tag, [...(defaultSchema.attributes[tag] ?? []), ...defaultSchema.attributes['*']],
    ])),
    center: [],
    img: ['src', 'alt', 'width', 'height'],
    iframe: ['src'],
  },
};

// 仅接受固定播放器与有效 BV 号，并关闭自动播放，防止原稿嵌入任意外部页面。
export function getVideoEmbed(src) {
  if (typeof src !== 'string') return null;
  try {
    const url = new URL(src);
    const videoIds = url.searchParams.getAll('bvid');
    if (url.origin !== 'https://player.bilibili.com' || url.pathname !== '/player.html'
      || url.username || url.password || videoIds.length !== 1
      || !/^BV[a-zA-Z0-9]{10}$/.test(videoIds[0])) return null;
    url.searchParams.set('autoplay', '0');
    return url.href;
  } catch {
    return null;
  }
}
