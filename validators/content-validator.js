const platforms = new Set(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x', 'other']);

export function buildSocialInput(values) {
  return {
    platform: String(values.platform ?? 'other'),
    url: clean(values.url),
    sortOrder: number(values.sortOrder),
  };
}

export function validateSocialInput(input) {
  return compact({
    platform: platforms.has(input.platform) ? '' : 'Platform tidak valid.',
    url: http(input.url, 'Link sosial'),
    sortOrder: input.sortOrder < 0 || input.sortOrder > 100000 ? 'Urutan harus 0-100000.' : '',
  });
}

export function buildCatalogInput(values) {
  return {
    title: clean(values.title),
    description: clean(values.description) || null,
    targetUrl: clean(values.targetUrl) || null,
    sortOrder: number(values.sortOrder),
    isPublished: values.isPublished === 'on' || values.isPublished === true,
  };
}

export function validateCatalogInput(input) {
  return compact({
    title: input.title ? (input.title.length > 150 ? 'Judul maksimal 150 karakter.' : '') : 'Judul wajib diisi.',
    description: input.description && input.description.length > 2000 ? 'Deskripsi maksimal 2000 karakter.' : '',
    targetUrl: input.targetUrl ? http(input.targetUrl, 'Link tujuan') : '',
    sortOrder: input.sortOrder < 0 || input.sortOrder > 100000 ? 'Urutan harus 0-100000.' : '',
  });
}

function clean(value) {
  return String(value ?? '').trim();
}

function number(value) {
  const parsed = Number(value ?? 0);
  return Number.isInteger(parsed) ? parsed : 0;
}

function http(value, label) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? '' : `${label} wajib HTTP(S).`;
  } catch {
    return `${label} wajib URL valid.`;
  }
}

function compact(errors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message));
}
