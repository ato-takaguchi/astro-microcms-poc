const serviceDomain = import.meta.env.MICROCMS_SERVICE_DOMAIN;
const apiKey = import.meta.env.MICROCMS_API_KEY;
const endpointName = import.meta.env.MICROCMS_ENDPOINT || 'case-gallery';

function getEndpointUrl(contentId = '') {
  if (!serviceDomain || !apiKey) {
    throw new Error('MICROCMS_SERVICE_DOMAIN または MICROCMS_API_KEY が設定されていません。');
  }

  const suffix = contentId ? `/${encodeURIComponent(contentId)}` : '';
  return `https://${serviceDomain}.microcms.io/api/v1/${endpointName}${suffix}`;
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.set(key, String(value));
  }

  return searchParams.toString();
}

async function microcmsFetch({ contentId = '', query = {} } = {}) {
  const endpoint = getEndpointUrl(contentId);
  const queryString = buildQuery(query);
  const url = queryString ? `${endpoint}?${queryString}` : endpoint;

  const response = await fetch(url, {
    headers: { 'X-MICROCMS-API-KEY': apiKey },
  });

  if (response.status === 404) {
    return null;
  }

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
    const data = await microcmsFetch({
      query: { limit, offset },
    });
    const chunk = Array.isArray(data?.contents) ? data.contents : [];
    contents.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }

  return contents;
}

export async function getContentById(id, { draftKey } = {}) {
  if (!id) return null;

  return microcmsFetch({
    contentId: id,
    query: { draftKey },
  });
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
  const title = firstNonEmpty(item?.title, item?.name, item?.id) || item?.id || '事例詳細';
  const body = firstNonEmpty(item?.body, item?.content, item?.html);
  const plainText = stripHtml(body);
  const description = firstNonEmpty(
    item?.description,
    plainText.slice(0, 120),
    `${title} の導入事例ページです。`,
  );

  return {
    id: item?.id ?? '',
    title,
    body,
    metaTitle: firstNonEmpty(item?.metaTitle, `${title} | 導入事例`),
    description,
    canonicalUrl: firstNonEmpty(
      item?.canonicalUrl,
      `https://www.mebs.co.jp/cases/elevator/gallery/${item?.id ?? ''}.html`,
    ),
    ogImage: firstNonEmpty(item?.ogImage, 'https://www.mebs.co.jp/common/img/ogp.png'),
    publishedAt:
      item?.publishedAt || item?.createdAt || new Date().toISOString(),
    updatedAt:
      item?.updatedAt ||
      item?.revisedAt ||
      item?.publishedAt ||
      item?.createdAt ||
      new Date().toISOString(),
  };
}
