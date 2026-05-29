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

export function normalizeCaseItem(item) {
  const title = item?.facilityName || item?.id || '事例詳細';

  const description = firstNonEmpty(
    item?.metaDescription,
    item?.listSummary,
    `${title} の導入事例ページです。`,
  );

  const productTags = Array.isArray(item?.productTags) ? item.productTags : [];
  const buildingTags = Array.isArray(item?.buildingTags) ? item.buildingTags : [];
  const serviceTags = Array.isArray(item?.serviceTags) ? item.serviceTags : [];

  const gallery = Array.isArray(item?.gallery)
    ? item.gallery.map((g) => ({
        image: g?.image?.url ?? '',
        imageAlt: g?.imageAlt ?? '',
        caption: g?.caption ?? '',
      }))
    : [];

  const specs = Array.isArray(item?.specs)
    ? item.specs.map((s) => ({
        specTitle: s?.specTitle ?? '',
        specBody: s?.specBody ?? '',
        specImagePc: s?.specImagePc?.url ?? '',
        specImageSp: s?.specImageSp?.url ?? '',
        specImageAlt: s?.specImageAlt ?? '',
      }))
    : [];

  return {
    id: item?.id ?? '',
    title,
    companyName: item?.companyName ?? '',
    description,
    externalUrl: item?.externalUrl ?? '',
    listImage: item?.listImage?.url ?? '',
    listImageAlt: item?.listImageAlt ?? '',
    listSummary: item?.listSummary ?? '',
    mainVisual: item?.mainVisual?.url ?? '',
    mainVisualAlt: item?.mainVisualAlt ?? '',
    mainVisualCaption: item?.mainVisualCaption ?? '',
    overviewBody: item?.overviewBody ?? '',
    overviewImage: item?.overviewImage?.url ?? '',
    overviewImageAlt: item?.overviewImageAlt ?? '',
    galleryBody: item?.galleryBody ?? '',
    gallery,
    specs,
    productTags,
    buildingTags,
    serviceTags,
    metaTitle: firstNonEmpty(item?.metaTitle, `${title} | 導入事例`),
    canonicalUrl: firstNonEmpty(
      item?.canonicalUrl,
      `https://www.mebs.co.jp/cases/elevator/gallery/${item?.id ?? ''}.html`,
    ),
    ogImage: item?.listImage?.url || 'https://www.mebs.co.jp/common/img/ogp.png',
    publishedAt: item?.publishedAt || item?.createdAt || new Date().toISOString(),
    updatedAt:
      item?.updatedAt ||
      item?.revisedAt ||
      item?.publishedAt ||
      item?.createdAt ||
      new Date().toISOString(),
  };
}

// ─── カタログ用 ───────────────────────────────────────────────

async function catalogApiFetch(endpoint, query = {}) {
  if (!serviceDomain || !apiKey) {
    throw new Error('MICROCMS_SERVICE_DOMAIN または MICROCMS_API_KEY が設定されていません。');
  }
  const queryString = buildQuery(query);
  const url = `https://${serviceDomain}.microcms.io/api/v1/${endpoint}${queryString ? '?' + queryString : ''}`;
  const response = await fetch(url, {
    headers: { 'X-MICROCMS-API-KEY': apiKey },
  });
  if (!response.ok) throw new Error(`microCMS API error: ${response.status}`);
  return response.json();
}

async function fetchAllPages(endpoint) {
  const limit = 100;
  let offset = 0;
  const items = [];
  while (true) {
    const data = await catalogApiFetch(endpoint, { limit, offset, orders: 'order' });
    const chunk = Array.isArray(data?.contents) ? data.contents : [];
    items.push(...chunk);
    if (chunk.length < limit) break;
    offset += limit;
  }
  return items;
}

export async function getCatalogData() {
  const [rawCategories, rawItems] = await Promise.all([
    fetchAllPages('catalog-categories'),
    fetchAllPages('catalog'),
  ]);

  const categoryMap = Object.fromEntries(
    rawCategories.map((c) => [c.id, { ...c, children: [], items: [] }])
  );

  const roots = [];
  for (const cat of rawCategories) {
    const node = categoryMap[cat.id];
    if (cat.parent?.id && categoryMap[cat.parent.id]) {
      categoryMap[cat.parent.id].children.push(node);
    } else {
      roots.push(node);
    }
  }

  for (const item of rawItems) {
    const catId = item.category?.id;
    if (catId && categoryMap[catId]) {
      categoryMap[catId].items.push(item);
    }
  }

  return roots;
}
