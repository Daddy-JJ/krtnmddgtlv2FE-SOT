import { renderCardTheme } from '../services/card-theme-renderer.js';

const PREVIEW_SIZES = Object.freeze({
  landscape: Object.freeze({ width: 980, height: 980 * 54 / 85 }),
  portrait: Object.freeze({ width: 460, height: 460 * 85 / 54 }),
});
const previewFrames = new WeakMap();
const previewObserver = typeof ResizeObserver === 'function'
  ? new ResizeObserver((entries) => entries.forEach(({ target }) => fitPreview(target)))
  : null;

export async function loadCardThemePreviewCatalog() {
  const [registryResponse, stylesheetResponse] = await Promise.all([
    fetch('/config/theme-registry.json', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
      cache: 'no-cache',
    }),
    fetch('/assets/css/card-themes.css', {
      headers: { Accept: 'text/css' },
      credentials: 'same-origin',
      cache: 'no-cache',
    }).catch(() => null),
  ]);
  if (!registryResponse.ok) throw new Error('Theme catalog unavailable.');

  const registry = await registryResponse.json();
  const version = String(registry?.version ?? 'current');
  const themes = (Array.isArray(registry?.themes) ? registry.themes : [])
    .filter((theme) => theme.active === true)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const hydratedThemes = await Promise.all(themes.map(async (theme) => ({
    code: theme.code,
    name: theme.name,
    orientation: theme.orientation,
    previewPath: versionedAsset(theme.previewImage, version),
    templateMarkup: await loadTemplateMarkup(theme.template),
    displayOrder: theme.displayOrder,
    minimumPlan: theme.minimumPlan,
    isAvailable: false,
  })));

  return Object.freeze({
    themes: hydratedThemes,
    stylesheet: stylesheetResponse?.ok ? await stylesheetResponse.text() : '',
  });
}

export function mountCardThemePreview(stage, theme, stylesheet, initialCard) {
  if (!(stage instanceof HTMLElement)) throw new TypeError('Preview stage is required.');
  const root = parseThemeCard(theme);
  if (!root || !stylesheet) throw new Error('Preview template unavailable.');

  const host = document.createElement('span');
  host.className = 'card-theme-preview__host';
  host.setAttribute('aria-hidden', 'true');
  host.inert = true;
  const shadow = host.attachShadow({ mode: 'closed' });
  const styles = document.createElement('style');
  styles.textContent = isolatedThemeStyles(stylesheet);
  shadow.append(styles, root);
  stage.replaceChildren(host);
  stage.dataset.previewOrientation = theme.orientation;
  stage.hidden = false;

  previewFrames.set(stage, { root, orientation: theme.orientation });
  previewObserver?.observe(stage);
  requestAnimationFrame(() => fitPreview(stage));
  renderCardTheme(root, initialCard);
  root.querySelectorAll('a').forEach((link) => link.setAttribute('tabindex', '-1'));

  return Object.freeze({
    update(card) {
      renderCardTheme(root, card);
      requestAnimationFrame(() => fitPreview(stage));
    },
    destroy() {
      previewObserver?.unobserve(stage);
      previewFrames.delete(stage);
      stage.replaceChildren();
      stage.hidden = true;
    },
  });
}

export async function mountCardLivePreview(stage, themeCode, initialCard) {
  const catalog = await loadCardThemePreviewCatalog();
  const theme = catalog.themes.find((item) => item.code === themeCode)
    ?? catalog.themes.find((item) => item.code === 'starter-clean');
  if (!theme) throw new Error('Preview theme unavailable.');
  return mountCardThemePreview(stage, theme, catalog.stylesheet, initialCard);
}

async function loadTemplateMarkup(path) {
  if (!isTrustedTemplatePath(path)) return '';
  try {
    const response = await fetch(path, {
      headers: { Accept: 'text/html' },
      credentials: 'same-origin',
      cache: 'no-cache',
    });
    return response.ok ? response.text() : '';
  } catch {
    return '';
  }
}

function isTrustedTemplatePath(value) {
  return typeof value === 'string'
    && /^\/components\/card-themes\/[a-z0-9-]+\.html$/.test(value);
}

function versionedAsset(path, version) {
  if (typeof path !== 'string' || !path.startsWith('/assets/images/themes/')) return '';
  return `${path}?v=${encodeURIComponent(version)}`;
}

function parseThemeCard(theme) {
  const parsed = new DOMParser().parseFromString(theme.templateMarkup, 'text/html');
  const root = parsed.body.firstElementChild;
  if (
    root?.tagName !== 'ARTICLE'
    || root.dataset.themeCode !== theme.code
    || root.dataset.orientation !== theme.orientation
    || root.querySelector('script, iframe, object, embed')
  ) return null;
  return document.importNode(root, true);
}

function isolatedThemeStyles(source) {
  return source
    .replace(':root {', ':host {')
    .replace('@media (max-width: 620px)', '@media (max-width: 0px)');
}

function fitPreview(stage) {
  const frame = previewFrames.get(stage);
  const size = PREVIEW_SIZES[frame?.orientation];
  if (!frame || !size || !stage.clientWidth || !stage.clientHeight) return;
  const scale = Math.min(stage.clientWidth / size.width, stage.clientHeight / size.height);
  Object.assign(frame.root.style, {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: `${size.width}px`,
    maxWidth: 'none',
    margin: '0',
    pointerEvents: 'none',
    transform: `translate(-50%, -50%) scale(${scale})`,
    transformOrigin: 'center',
  });
}
