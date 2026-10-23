import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { getVideoEmbed, markdownSchema } from '../src/markdown-policy.js';

const rehypePlugins = [rehypeRaw, [rehypeSanitize, markdownSchema]];

// 测试真实组件边界：即使 schema 保留 src，也只绘制受信任的播放器。
function VideoEmbed({ src }) {
  const embed = getVideoEmbed(src);
  return embed ? createElement('iframe', { src: embed, title: '文章视频' })
    : createElement('p', null, '视频来源无效');
}

// 使用与文章相同的 Markdown、原始 HTML、净化及组件替换顺序，避免只测规则对象。
function renderMarkdown(source) {
  return renderToStaticMarkup(createElement(Markdown, {
    rehypePlugins,
    components: { iframe: VideoEmbed },
  }, source));
}

test('原始图片的地址、替代文本与尺寸，以及 center 中的正文均保留', () => {
  const html = renderMarkdown('<center><img src="https://example.com/photo.png" width="640" height="360" alt="旅途照片"><p>保留这段居中说明。</p></center>');
  assert.match(html, /<center>/);
  assert.match(html, /<img[^>]*src="https:\/\/example\.com\/photo\.png"/);
  assert.match(html, /width="640"/);
  assert.match(html, /height="360"/);
  assert.match(html, /alt="旅途照片"/);
  assert.match(html, /保留这段居中说明。/);
});

test('原始 HTML 的脚本、样式、事件处理器与 javascript 地址不能进入输出', () => {
  const html = renderMarkdown('<script>alert("script-marker")</script><style>body{color:red}</style><center style="color:red" onclick="alert(1)">安全正文<img src="javascript:alert(1)" onerror="alert(2)" style="position:fixed" alt="说明"><a href="javascript:alert(3)" onmouseover="alert(4)">链接文字</a></center>');
  assert.match(html, /安全正文/);
  assert.match(html, /链接文字/);
  assert.doesNotMatch(html, /script-marker|<script|<style|style=|onerror|onclick|onmouseover|javascript:|body\{color/);
});

test('通用净化层仅为 iframe 保留 src，不继承默认共享属性', () => {
  const source = '<iframe src="https://example.com/embed" width="800" height="600" title="不保留" name="frame" style="border:0" onload="alert(1)" srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;"></iframe>';
  const html = renderToStaticMarkup(createElement(Markdown, { rehypePlugins }, source));
  assert.equal(html, '<iframe src="https://example.com/embed"></iframe>');
});

test('受信任视频保留参数并强制关闭自动播放', () => {
  const embed = getVideoEmbed('https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&page=2&autoplay=1');
  const url = new URL(embed);
  assert.equal(url.searchParams.get('bvid'), 'BV1xx411c7mD');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(url.searchParams.get('autoplay'), '0');
  const html = renderMarkdown('<iframe src="https://player.bilibili.com/player.html?bvid=BV1xx411c7mD"></iframe>');
  assert.match(html, /<iframe src="https:\/\/player\.bilibili\.com\/player\.html\?bvid=BV1xx411c7mD&amp;autoplay=0"/);
});

test('非法播放器来源与视频标识被 helper 和实际 Markdown 渲染共同阻止', () => {
  const invalidSources = [
    'https://evil.example/player.html?bvid=BV1xx411c7mD',
    'https://player.bilibili.com.evil.example/player.html?bvid=BV1xx411c7mD',
    'https://player.bilibili.com@evil.example/player.html?bvid=BV1xx411c7mD',
    'https://user:password@player.bilibili.com/player.html?bvid=BV1xx411c7mD',
    'http://player.bilibili.com/player.html?bvid=BV1xx411c7mD',
    '//player.bilibili.com/player.html?bvid=BV1xx411c7mD',
    'https://player.bilibili.com:444/player.html?bvid=BV1xx411c7mD',
    'https://player.bilibili.com/other.html?bvid=BV1xx411c7mD',
    'https://player.bilibili.com/player.html',
    'https://player.bilibili.com/player.html?bvid=BV1234',
    'https://player.bilibili.com/player.html?bvid=BV1xx411c7m-',
    'https://player.bilibili.com/player.html?bvid=BV1xx411c7mD&bvid=BV1xx411c7mD',
    'javascript:alert(1)',
    'data:text/html,unsafe',
  ];
  for (const src of invalidSources) {
    assert.equal(getVideoEmbed(src), null, src);
    const html = renderMarkdown(`<iframe src="${src}"></iframe>`);
    assert.doesNotMatch(html, /<iframe/, src);
    assert.match(html, /视频来源无效/, src);
  }
  assert.equal(getVideoEmbed(undefined), null);
  assert.equal(getVideoEmbed(''), null);
});
