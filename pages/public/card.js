import { api } from '../../services/api-client.js';
import { renderCardTheme } from '../../services/card-theme-renderer.js';
import { publicAssetLinks, publicCardViewModel, publicSlugFromPath, safeWhatsAppUrl } from '../../services/public-card-presenter.js';
import { safeHttpUrl } from '../../utils/safe-url.js';

const nodes = {
  loading: document.querySelector('[data-public-loading]'),
  error: document.querySelector('[data-public-error]'),
  errorTitle: document.querySelector('[data-public-error-title]'),
  errorMessage: document.querySelector('[data-public-error-message]'),
  retry: document.querySelector('[data-public-retry]'),
  content: document.querySelector('[data-public-content]'),
  themeRoot: document.querySelector('[data-theme-root]'),
  vcard: document.querySelector('[data-vcard-link]'),
  qr: document.querySelector('[data-qr-link]'),
  bookmark: document.querySelector('[data-bookmark-link]'),
  bookmarkStatus: document.querySelector('[data-bookmark-status]'),
  whatsapp: document.querySelector('[data-whatsapp-link]'),
  catalogSection: document.querySelector('[data-catalog-section]'),
  catalogList: document.querySelector('[data-catalog-list]'),
  detailsSection: document.querySelector('[data-full-details-section]'),
  detailsList: document.querySelector('[data-full-details-list]'),
  copyStatus: document.querySelector('[data-copy-status]'),
  canonical: document.querySelector('link[rel="canonical"]'),
  description: document.querySelector('meta[name="description"]'),
  robots: document.querySelector('meta[name="robots"]'),
};

const slug = publicSlugFromPath(location.pathname);
nodes.retry?.addEventListener('click', () => loadCard());
nodes.bookmark?.addEventListener('click', saveBookmark);
init();

async function init() {
  if (!slug) {
    showNotFound();
    return;
  }
  await loadCard();
}

async function loadCard() {
  showLoading();
  try {
    const card = await api.get(`/public/cards/${encodeURIComponent(slug)}`, { skipRefresh: true });
    const theme = await resolveTheme(card.themeCode);
    const template = await loadThemeTemplate(theme);
    nodes.themeRoot.replaceChildren(template);
    const viewModel = publicCardViewModel(card);
    renderCardTheme(nodes.themeRoot, viewModel);
    renderMeta(card, theme.name);
    renderActions(card, slug);
    renderFullDetails(viewModel);
    renderCatalog(card.catalogItems);
    nodes.loading.hidden = true;
    nodes.content.hidden = false;
  } catch (error) {
    if (error?.status === 404) showNotFound();
    else showFailure();
  }
}

async function resolveTheme(themeCode) {
  const response = await fetchResource('/config/theme-registry.json', 'application/json');
  if (!response.ok) throw new Error('Theme registry unavailable.');
  const registry = await response.json();
  const theme = registry?.themes?.find((item) => item.code === themeCode && item.active === true);
  if (!theme || !/^\/components\/card-themes\/[a-z0-9-]+\.html$/.test(theme.template)) {
    throw new Error('Theme unavailable.');
  }
  return theme;
}

async function loadThemeTemplate(theme) {
  const response = await fetchResource(theme.template, 'text/html');
  if (!response.ok) throw new Error('Theme template unavailable.');
  const parsed = new DOMParser().parseFromString(await response.text(), 'text/html');
  const template = parsed.body.firstElementChild;
  if (!template || template.tagName !== 'ARTICLE' || template.dataset.themeCode !== theme.code
      || template.querySelector('script, iframe, object, embed')) {
    throw new Error('Theme template invalid.');
  }
  return document.importNode(template, true);
}

async function fetchResource(url, accept) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), 12_000);
  try {
    return await fetch(url, {
      headers: { Accept: accept },
      credentials: 'same-origin',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function renderMeta(card, themeName) {
  const title = `${card.contact?.fullName || 'Kartu Nama Digital'} | KartuNamaDigital.id`;
  const description = [card.contact?.jobTitle, card.contact?.organization].filter(Boolean).join(' · ')
    || 'Kartu nama digital profesional.';
  document.title = title;
  nodes.description?.setAttribute('content', description);
  const canonicalUrl = safeHttpUrl(card.canonicalUrl);
  if (canonicalUrl) nodes.canonical?.setAttribute('href', canonicalUrl);
  else nodes.canonical?.removeAttribute('href');
  nodes.themeRoot.setAttribute('aria-label', `${themeName}: ${card.contact?.fullName || 'Kartu nama digital'}`);
}

function renderActions(card, slug) {
  const links = publicAssetLinks(slug);
  nodes.vcard.href = links.vcard;
  nodes.qr.href = links.qrDownload;
  nodes.whatsapp.hidden = true;
  nodes.whatsapp.removeAttribute('href');
  nodes.whatsapp.parentElement?.classList.remove('public-card-actions--with-whatsapp');
  const whatsappUrl = safeWhatsAppUrl(card.whatsappUrl);
  if (whatsappUrl) {
    nodes.whatsapp.href = whatsappUrl;
    nodes.whatsapp.hidden = false;
    nodes.whatsapp.parentElement?.classList.add('public-card-actions--with-whatsapp');
  }
}

function renderFullDetails(card) {
  const fields = [
    ['Nama', card.fullName],
    ['Jabatan', card.jobTitle],
    ['Perusahaan', card.organization],
    ['Telepon kantor', card.officePhone],
    ['Nomor mobile', card.mobilePhone],
    ['Email', card.email],
    ['Website', card.websiteUrl],
    ['Alamat', card.addressText],
  ].filter(([, value]) => String(value ?? '').trim());

  nodes.detailsList.replaceChildren();
  for (const [label, rawValue] of fields) {
    const value = String(rawValue).trim();
    const row = document.createElement('div');
    row.className = 'public-card-details__row';
    const term = document.createElement('dt');
    term.textContent = label;
    const description = document.createElement('dd');
    description.textContent = value;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = 'Salin';
    copy.setAttribute('aria-label', `Salin ${label}`);
    copy.addEventListener('click', () => copyDetail(value, label));
    row.append(term, description, copy);
    nodes.detailsList.append(row);
  }
  nodes.detailsSection.hidden = fields.length === 0;
}

async function copyDetail(value, label) {
  try {
    await copyText(value);
    nodes.copyStatus.textContent = `${label} berhasil disalin.`;
  } catch {
    nodes.copyStatus.textContent = `Tidak dapat menyalin ${label}.`;
  }
}

async function saveBookmark() {
  const url = nodes.canonical?.href || location.href;
  try {
    await copyText(url);
    nodes.bookmarkStatus.textContent = 'Link disalin. Tekan Ctrl/Cmd+D untuk menyimpan bookmark.';
    nodes.bookmark.textContent = '✓ Link disalin';
  } catch {
    nodes.bookmarkStatus.textContent = 'Tekan Ctrl+D (Windows/Linux) atau Cmd+D (Mac) untuk menyimpan bookmark.';
  }
  window.setTimeout(() => {
    nodes.bookmark.textContent = '☆ Simpan link';
  }, 2500);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.className = 'public-card-copy-fallback';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Copy unavailable.');
}

function renderCatalog(items) {
  nodes.catalogList.replaceChildren();
  if (!Array.isArray(items) || items.length === 0) return;
  for (const item of items) {
    const article = document.createElement('article');
    article.className = 'public-card-catalog__item';
    const title = document.createElement('h3');
    title.textContent = item.title;
    article.append(title);
    if (item.description) {
      const description = document.createElement('p');
      description.textContent = item.description;
      article.append(description);
    }
    const targetUrl = safeHttpUrl(item.targetUrl);
    if (targetUrl) {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Lihat detail';
      article.append(link);
    }
    nodes.catalogList.append(article);
  }
  nodes.catalogSection.hidden = false;
}

function showNotFound() {
  document.title = 'Kartu tidak ditemukan | KartuNamaDigital.id';
  nodes.robots?.setAttribute('content', 'noindex, nofollow');
  nodes.loading.hidden = true;
  nodes.content.hidden = true;
  nodes.retry.hidden = true;
  nodes.error.hidden = false;
}

function showFailure() {
  document.title = 'Kartu belum dapat dimuat | KartuNamaDigital.id';
  nodes.robots?.setAttribute('content', 'noindex, nofollow');
  nodes.errorTitle.textContent = 'Kartu belum dapat dimuat';
  nodes.errorMessage.textContent = 'Terjadi gangguan sementara. Silakan coba kembali beberapa saat lagi.';
  nodes.loading.hidden = true;
  nodes.content.hidden = true;
  nodes.retry.hidden = false;
  nodes.error.hidden = false;
}

function showLoading() {
  nodes.error.hidden = true;
  nodes.retry.hidden = true;
  nodes.content.hidden = true;
  nodes.loading.hidden = false;
}
