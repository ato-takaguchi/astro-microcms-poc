const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = import.meta.env.MICROCMS_API_KEY;
const endpointName = import.meta.env.MICROCMS_ENDPOINT || 'case-gallery';

function getEndpointUrl() {
  if (!serviceDomain || !apiKey) {
    throw new Error('環境変数 MICROCMS_SERVICE_DOMAIN / MICROCMS_API_KEY が未設定です。');
  }
  return `https://${serviceDomain}.microcms.io/api/v1/${endpointName}`;
}

async function microcmsFetch(query = '') {
  const endpoint = getEndpointUrl();
  const url = query ? `${endpoint}?${query}` : endpoint;
  const response = await fetch(url, {
    headers: { 'X-MICROCMS-API-KEY': apiKey }
  });
  if (!response.ok) {
    throw new Error(`microCMS API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getAllContents() {
  const limit = 100;
  let offset = 0;
  const contents = [];

  while (true) {
    const data = await microcmsFetch(`limit=${limit}&offset=${offset}`);
    const chunk = Array.isArray(data.contents) ? data.contents : [];
    contents.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }

  return contents;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeCaseItem(item) {
  const title = firstNonEmpty(item.title, item.name, item.id) || item.id;
  const body = firstNonEmpty(item.body, item.content, item.html);
  const plainText = stripHtml(body);
  const description = firstNonEmpty(
    item.description,
    plainText.slice(0, 120),
    `導入事例「${title}」のご紹介ページです。`
  );

  return {
    id: item.id,
    title,
    body,
    metaTitle: firstNonEmpty(item.metaTitle, `${title} | 導入事例 | 三菱電機ビルソリューションズ株式会社`),
    description,
    canonicalUrl: `https://www.mebs.co.jp/cases/elevator/gallery/${item.id}.html`,
    ogImage: 'https://www.mebs.co.jp/common/img/ogp.png',
    publishedAt: item.publishedAt || item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || item.revisedAt || item.publishedAt || item.createdAt || new Date().toISOString()
  };
}
