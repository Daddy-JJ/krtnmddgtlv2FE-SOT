import { cardService } from '../../services/card-service.js';
import { loadCardThemePreviewCatalog, mountCardThemePreview } from '../../components/card-live-preview.js';
import { filterThemes, validateThemeCode } from '../../validators/theme-validator.js';
import { showStatus } from '../../components/forms/form-utils.js';

const SAMPLE_CARD = Object.freeze({
  fullName: 'Begitu Indah, SE',
  jobTitle: 'Digital Marketer & Social Media Specialist',
  organization: 'KartuNamaDigital.id',
  officePhone: '(021) 555-0188',
  mobilePhone: '0812-3456-7890',
  email: 'begitu.indah@kartunamadigital.id',
  websiteUrl: 'https://kartunamadigital.id',
  addressText: 'Jl. Ninja no 99, Konohagakure.',
  mapsUrl: 'https://maps.google.com/',
  canonicalUrl: 'https://kartunamadigital.id/begitu-indah',
  logoUrl: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 96"><rect width="240" height="96" rx="14" fill="#f8fafc"/><rect x="14" y="14" width="68" height="68" rx="12" fill="#e2e8f0"/><path d="M32 30h32v36H32zm8 8v20h16V38z" fill="#334155" fill-rule="evenodd"/><text x="96" y="48" fill="#0f172a" font-family="Arial,sans-serif" font-size="18" font-weight="700">LOGO</text><text x="96" y="69" fill="#64748b" font-family="Arial,sans-serif" font-size="13">PERUSAHAAN</text></svg>'),
  qrUrl: svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="white"/><g fill="#020617"><path d="M10 10h32v32H10zm8 8v16h16V18zM78 10h32v32H78zm8 8v16h16V18zM10 78h32v32H10zm8 8v16h16V86z" fill-rule="evenodd"/><path d="M52 10h10v10H52zm14 0h10v20H66zM52 26h10v16H52zm0 26h12v10H52zm18-12h10v22H70zm16 10h10v12H86zm14 0h10v10h-10zM46 66h14v10H46zm20 2h10v10H66zm14 0h12v12H80zm18 0h12v18H98zM50 84h18v10H50zm0 14h10v12H50zm16-2h12v14H66zm18-10h10v24H84zm14 8h12v16H98z"/></g></svg>'),
  socialLinks: Object.freeze([
    Object.freeze({ platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/' }),
    Object.freeze({ platform: 'instagram', label: 'Instagram', url: 'https://www.instagram.com/' }),
  ]),
});

const state = {
  card: null,
  themes: [],
  themeStyles: '',
  selectedCode: '',
  previewCode: '',
  orientation: 'all',
  availabilityKnown: false,
};
const nodes = {
  status: document.querySelector('[data-form-status]'),
  gallery: document.querySelector('[data-theme-gallery]'),
  previewStage: document.querySelector('[data-theme-preview-stage]'),
  previewName: document.querySelector('[data-theme-preview-name]'),
  save: document.querySelector('[data-save-theme]'),
  filters: document.querySelectorAll('[data-orientation-filter]'),
};
const mountedPreviews = new Set();

init();

function init() {
  load();
  nodes.save?.addEventListener('click', saveTheme);
  nodes.filters.forEach((button) => button.addEventListener('click', () => {
    state.orientation = button.dataset.orientationFilter ?? 'all';
    render();
  }));
}

async function load() {
  showStatus(nodes.status, 'Memuat varian desain...', 'info');
  try {
    const catalog = await loadCardThemePreviewCatalog();
    state.themes = catalog.themes;
    state.themeStyles = catalog.stylesheet;
    state.previewCode = state.themes[0]?.code ?? '';
    render();
  } catch {
    showStatus(nodes.status, 'Katalog desain belum dapat dimuat.', 'error');
  }

  try {
    const cards = await cardService.list();
    const first = Array.isArray(cards) ? cards[0] : null;
    if (!first) {
      showStatus(nodes.status, 'Pilih desain untuk melihat preview.', 'info');
      return;
    }
    state.card = await cardService.get(first.publicId);
    const entitledThemes = await cardService.themes(state.card.publicId);
    state.themes = mergeEntitlements(state.themes, entitledThemes);
    state.availabilityKnown = true;
    state.selectedCode = state.card.themeCode;
    state.previewCode = state.card.themeCode;
    render();
    showStatus(nodes.status, `${state.themes.length} varian desain siap dipreview.`, 'success');
  } catch (error) {
    if (error.status === 401) {
      location.assign('/login/');
      return;
    }
    render();
    showStatus(nodes.status, 'Desain tetap dapat Anda lihat. Silakan masuk kembali untuk menyimpan pilihan.', 'error');
  }
}

function svgDataUri(source) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(source)}`;
}

function previewCardData() {
  const contact = state.card?.contact;
  if (!contact) return SAMPLE_CARD;
  const canonicalUrl = state.card.slug
    ? `${location.origin}/${encodeURIComponent(state.card.slug)}`
    : SAMPLE_CARD.canonicalUrl;
  return {
    ...SAMPLE_CARD,
    ...contact,
    canonicalUrl,
  };
}

function mountThemePreview(stage, theme) {
  stage.replaceChildren();
  stage.className = `theme-option__preview theme-option__preview--${theme.orientation}`;
  stage.hidden = false;
  try {
    mountedPreviews.add(mountCardThemePreview(stage, theme, state.themeStyles, previewCardData()));
  } catch {
    mountPreviewFallback(stage, theme);
  }
}

function mountPreviewFallback(stage, theme) {
  const image = document.createElement('img');
  image.className = 'theme-option__image';
  image.src = theme.previewPath;
  image.alt = '';
  stage.append(image);
}

function resetPreviewMounts() {
  for (const preview of mountedPreviews) preview.destroy();
  mountedPreviews.clear();
}

function mergeEntitlements(catalog, entitledThemes) {
  const access = new Map((Array.isArray(entitledThemes) ? entitledThemes : [])
    .map((theme) => [theme.code, theme]));
  return catalog.map((theme) => ({
    ...theme,
    ...(access.get(theme.code) ?? {}),
    name: theme.name,
    previewPath: theme.previewPath || access.get(theme.code)?.previewPath,
    templateMarkup: theme.templateMarkup,
    minimumPlan: theme.minimumPlan,
  }));
}

function render() {
  resetPreviewMounts();
  nodes.gallery.replaceChildren();
  for (const theme of filterThemes(state.themes, state.orientation)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-option';
    button.setAttribute('aria-pressed', String(theme.code === state.previewCode));
    button.dataset.themeCode = theme.code;
    button.dataset.available = String(theme.isAvailable);
    const stage = document.createElement('span');
    mountThemePreview(stage, theme);
    const name = document.createElement('span');
    name.className = 'theme-option__name';
    name.textContent = theme.name;
    const meta = document.createElement('span');
    meta.className = 'theme-option__meta';
    meta.textContent = themeMeta(theme);
    button.append(stage, name, meta);
    button.addEventListener('click', () => previewTheme(theme.code));
    nodes.gallery.append(button);
  }
  const previewed = state.themes.find((theme) => theme.code === state.previewCode);
  if (previewed) {
    mountThemePreview(nodes.previewStage, previewed);
    nodes.previewName.textContent = previewed.name;
  }
  const canSave = Boolean(state.card && previewed?.isAvailable);
  nodes.save.disabled = !canSave;
  nodes.save.textContent = canSave
    ? 'Gunakan desain ini'
    : state.availabilityKnown && previewed
      ? `Tersedia mulai paket ${planLabel(previewed.minimumPlan)}`
      : 'Memuat akses desain...';
  nodes.filters.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.orientationFilter === state.orientation));
  });
}

function previewTheme(code) {
  const theme = state.themes.find((item) => item.code === code);
  if (!theme) return;
  state.previewCode = code;
  if (theme.isAvailable) {
    state.selectedCode = code;
    document.dispatchEvent(new CustomEvent('theme:selected', { detail: { themeCode: code } }));
  } else if (state.availabilityKnown) {
    document.dispatchEvent(new CustomEvent('theme:locked-selected', { detail: { themeCode: code } }));
  }
  render();
}

async function saveTheme() {
  if (!state.card) return;
  const selected = state.themes.find((theme) => theme.code === state.previewCode);
  if (!selected?.isAvailable) {
    showStatus(nodes.status, `Desain ini tersedia mulai paket ${planLabel(selected?.minimumPlan)}.`, 'error');
    return;
  }
  const message = validateThemeCode(state.previewCode);
  if (message) {
    showStatus(nodes.status, message, 'error');
    return;
  }
  nodes.save.disabled = true;
  showStatus(nodes.status, 'Menyimpan tema...', 'info');
  try {
    state.card = await cardService.updateTheme(state.card.publicId, state.previewCode);
    state.selectedCode = state.card.themeCode;
    document.dispatchEvent(new CustomEvent('theme:saved', { detail: { themeCode: state.card.themeCode } }));
    showStatus(nodes.status, 'Tema tersimpan.', 'success');
  } catch (error) {
    showStatus(nodes.status, error.message, 'error');
  } finally {
    nodes.save.disabled = false;
  }
}

function themeMeta(theme) {
  const orientation = theme.orientation === 'portrait' ? 'Vertikal' : 'Landscape';
  if (!state.availabilityKnown) return `${orientation} · Preview`;
  return theme.isAvailable
    ? `${orientation} · Tersedia`
    : `${orientation} · Mulai ${planLabel(theme.minimumPlan)}`;
}

function planLabel(plan) {
  return ({ starter: 'Starter', basic: 'Basic', pro: 'Pro' })[plan] ?? 'Pro';
}
