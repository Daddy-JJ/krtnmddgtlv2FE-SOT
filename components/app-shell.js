import { authService } from '../services/auth-service.js';
import { apiErrorMessage } from '../utils/api-error-message.js';

const links = [
  ['/app/', 'Ringkasan'],
  ['/app/card/identity/', 'Kartu Nama'],
  ['/app/card/design/', 'Desain'],
  ['/app/card/settings/', 'Pengaturan & QR'],
  ['/app/card/social/', 'Media Sosial'],
  ['/app/card/catalog/', 'Katalog'],
  ['/app/resume-enhancement/', 'Perbaikan CV'],
  ['/app/billing/', 'Langganan'],
  ['/app/account/', 'Akun'],
  ['/app/feedback/', 'Masukan'],
];

const main = document.querySelector('main#main');
if (main) mountShell(main);
let navigationController = null;
let navigationSequence = 0;
let hasUnsavedChanges = false;
let currentDocumentUrl = location.href;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function mountShell(content) {
  document.body.classList.add('dashboard-shell', 'app-shell-page');
  document.body.classList.remove('bg-slate-100', 'text-slate-900');
  document.body.querySelector(':scope > header')?.remove();

  const oldParent = content.parentElement;
  oldParent?.querySelector(':scope > aside')?.remove();

  const header = element('header', 'dashboard-header app-shell__header sticky top-0 z-40');
  const headerNav = element('nav', 'app-shell__header-nav');
  headerNav.setAttribute('aria-label', 'Navigasi aplikasi');
  const brand = element('a', 'app-shell__brand mono-brand');
  brand.href = '/app/';
  brand.setAttribute('aria-label', 'KartuNamaDigital.id, dashboard');
  const mark = element('span', 'mono-brand__mark');
  mark.setAttribute('aria-hidden', 'true');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('focusable', 'false');
  const iconParts = [
    ['rect', { x: '3', y: '2.5', width: '18', height: '19', rx: '3' }],
    ['circle', { cx: '9', cy: '9', r: '2' }],
    ['path', { d: 'M6.5 15c.7-2.2 4.3-2.2 5 0M14 8h4M14 12h4M14 16h3' }],
  ];
  for (const [tag, attributes] of iconParts) {
    const part = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [name, value] of Object.entries(attributes)) part.setAttribute(name, value);
    icon.append(part);
  }
  mark.append(icon);
  const brandText = element('span');
  brandText.append(document.createTextNode('KARTUNAMA'), document.createElement('br'));
  brandText.append(element('small', '', 'DIGITAL.ID'));
  brand.append(mark, brandText);

  const menuButton = element('button', 'app-shell__menu-button fdn-button--secondary', 'Menu');
  menuButton.type = 'button';
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-controls', 'app-sidebar');
  const logout = element('button', 'app-shell__logout fdn-button--secondary', 'Keluar');
  logout.type = 'button';
  const logoutStatus = element('p', 'app-shell__logout-status');
  logoutStatus.hidden = true;
  logoutStatus.setAttribute('role', 'status');
  logoutStatus.setAttribute('aria-live', 'polite');
  logoutStatus.setAttribute('aria-atomic', 'true');
  headerNav.append(brand, menuButton, logout, logoutStatus);
  header.append(headerNav);

  const layout = element('div', 'app-shell__layout');
  const aside = element('aside', 'dashboard-panel app-shell__sidebar');
  aside.id = 'app-sidebar';
  aside.setAttribute('aria-label', 'Menu workspace');
  aside.append(element('p', 'app-shell__nav-label', 'Workspace'));
  const nav = element('nav', 'app-shell__nav');
  nav.setAttribute('aria-label', 'Halaman user');
  const currentPath = normalizePath(location.pathname);
  for (const [href, label] of links) {
    const link = element('a', 'dashboard-link', label);
    link.href = href;
    link.dataset.appLink = '';
    if (isActivePath(currentPath, href)) {
      link.classList.add('dashboard-link--active');
      link.setAttribute('aria-current', 'page');
    }
    nav.append(link);
  }
  aside.append(nav);
  const mobileLogout = element('button', 'app-shell__sidebar-logout', 'Keluar');
  mobileLogout.type = 'button';
  aside.append(mobileLogout);

  content.classList.add('app-shell__main');
  layout.append(aside, content);
  document.body.insertBefore(header, document.body.querySelector('.skip-link')?.nextSibling ?? document.body.firstChild);
  document.body.append(layout);
  if (oldParent && oldParent !== document.body && oldParent.childElementCount === 0) oldParent.remove();

  menuButton.addEventListener('click', () => {
    const open = document.body.classList.toggle('app-shell--menu-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  const handleLogout = async () => {
    if (logout.disabled || mobileLogout.disabled) return;
    logout.disabled = true;
    mobileLogout.disabled = true;
    logoutStatus.hidden = false;
    logoutStatus.textContent = 'Keluar dari akun...';
    try {
      await authService.logout();
      location.replace('/login/');
    } catch (error) {
      if (error?.status === 401 && error?.code === 'AUTH_REQUIRED') {
        location.replace('/login/');
        return;
      }
      logoutStatus.textContent = logoutFailureMessage(error);
      logout.disabled = false;
      mobileLogout.disabled = false;
    }
  };
  logout.addEventListener('click', handleLogout);
  mobileLogout.addEventListener('click', handleLogout);
  bindUnsavedChanges();
  bindPageNavigation();
  requestAnimationFrame(() => document.body.classList.add('app-shell--ready'));
}

function bindPageNavigation() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href]');
    if (!isAppNavigation(event, link)) return;
    const destination = new URL(link.href, location.href);
    event.preventDefault();
    if (destination.href === location.href) return;
    navigate(destination, true);
  });
  addEventListener('popstate', () => {
    const destination = new URL(location.href);
    if (!confirmDiscardChanges()) {
      history.pushState({}, '', currentDocumentUrl);
      return;
    }
    navigate(destination, false, true);
  });
}

function isAppNavigation(event, link) {
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey
    || event.shiftKey || event.altKey || link.target || link.hasAttribute('download')) return false;
  const destination = new URL(link.href, location.href);
  return destination.origin === location.origin && destination.pathname.startsWith('/app/');
}

async function navigate(destination, pushHistory, discardConfirmed = false) {
  if (!discardConfirmed && !confirmDiscardChanges()) return;
  hasUnsavedChanges = false;
  navigationController?.abort();
  navigationController = new AbortController();
  const sequence = ++navigationSequence;
  document.body.classList.add('app-shell--navigating');
  document.querySelector('main#main')?.setAttribute('aria-busy', 'true');

  try {
    const response = await fetch(destination.href, {
      headers: { Accept: 'text/html' },
      credentials: 'same-origin',
      signal: navigationController.signal,
    });
    if (!response.ok) throw new Error(`Navigation failed with ${response.status}.`);
    const page = new DOMParser().parseFromString(await response.text(), 'text/html');
    const sourceMain = page.querySelector('main#main');
    if (!sourceMain) throw new Error('Destination does not expose the application main region.');
    const nextMain = document.importNode(sourceMain, true);
    nextMain.classList.add('app-shell__main');
    nextMain.tabIndex = -1;
    const moduleSources = [...page.querySelectorAll('script[type="module"][src]')]
      .map((script) => new URL(script.getAttribute('src'), destination).href)
      .filter((source) => !source.endsWith('/components/app-shell.js'));

    const update = () => {
      document.querySelector('main#main')?.replaceWith(nextMain);
      document.title = page.title;
      if (pushHistory) history.pushState({}, '', destination);
      currentDocumentUrl = destination.href;
      updateActiveLink(destination.pathname);
      scrollTo({ top: 0, behavior: 'auto' });
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduced) {
      await document.startViewTransition(update).updateCallbackDone;
    } else {
      update();
    }
    if (sequence !== navigationSequence) return;
    await Promise.all(moduleSources.map((source) => import(`${source}?navigation=${sequence}`)));
    nextMain.focus({ preventScroll: true });
  } catch (error) {
    if (error.name !== 'AbortError') location.assign(destination.href);
  } finally {
    if (sequence === navigationSequence) {
      document.body.classList.remove('app-shell--navigating', 'app-shell--menu-open');
      document.querySelector('main#main')?.removeAttribute('aria-busy');
      document.querySelector('.app-shell__menu-button')?.setAttribute('aria-expanded', 'false');
    }
  }
}

function updateActiveLink(pathname) {
  const currentPath = normalizePath(pathname);
  document.querySelectorAll('[data-app-link]').forEach((link) => {
    const active = isActivePath(currentPath, new URL(link.href, location.href).pathname);
    link.classList.toggle('dashboard-link--active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

function isActivePath(currentPath, href) {
  const targetPath = normalizePath(href);
  if (targetPath === '/app/') return currentPath === targetPath;
  return currentPath === targetPath || currentPath.startsWith(targetPath);
}

function normalizePath(path) {
  return path.endsWith('/') ? path : `${path}/`;
}

function bindUnsavedChanges() {
  document.addEventListener('input', (event) => {
    const field = event.target;
    if (!(field instanceof HTMLElement) || !field.closest('main#main form')) return;
    if (field.matches('[readonly], [disabled], [data-ignore-dirty]')) return;
    hasUnsavedChanges = true;
  });
  document.addEventListener('reset', () => {
    queueMicrotask(() => { hasUnsavedChanges = false; });
  });
  for (const eventName of ['card:saved', 'slug:saved', 'app:changes-saved']) {
    document.addEventListener(eventName, () => { hasUnsavedChanges = false; });
  }
  addEventListener('beforeunload', (event) => {
    if (!hasUnsavedChanges || document.querySelector('main#main form[aria-busy=true]')) return;
    event.preventDefault();
    event.returnValue = '';
  });
}

function confirmDiscardChanges() {
  if (!hasUnsavedChanges) return true;
  return window.confirm('Perubahan belum disimpan. Tinggalkan halaman ini?');
}

function logoutFailureMessage(error) {
  if (error?.code === 'CSRF_INVALID') {
    return 'Sesi keamanan tidak sinkron. Muat ulang halaman, lalu coba keluar kembali.';
  }
  if (error?.code === 'REQUEST_TIMEOUT' || error?.name === 'TypeError') {
    return 'Tidak dapat menghubungi server. Periksa koneksi, lalu coba keluar kembali.';
  }
  return apiErrorMessage(error, 'Logout gagal. Sesi Anda masih aktif; silakan coba lagi.');
}
