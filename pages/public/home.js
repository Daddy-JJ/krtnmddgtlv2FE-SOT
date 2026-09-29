if (location.pathname === '/preview/') {
  document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, nofollow');
  if (window.self === window.top) location.replace('/');
}

const menuButton = document.querySelector('[data-mobile-menu-button]');
const mobileMenu = document.querySelector('[data-mobile-menu]');

function setMenu(open) {
  if (!(menuButton instanceof HTMLButtonElement) || !(mobileMenu instanceof HTMLElement)) return;
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Tutup menu navigasi' : 'Buka menu navigasi');
  mobileMenu.hidden = !open;
}

if (menuButton instanceof HTMLButtonElement && mobileMenu instanceof HTMLElement) {
  menuButton.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });

  mobileMenu.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) setMenu(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });

  window.matchMedia('(min-width: 48rem)').addEventListener('change', (event) => {
    if (event.matches) setMenu(false);
  });
}

async function hydrateLandingContent() {
  try {
    const content = await api.get('/public/content/landing', { skipRefresh: true });
    for (const [key, value] of Object.entries(content)) {
      if (typeof value !== 'string') continue;
      document.querySelectorAll(`[data-landing-content="${key}"]`).forEach((element) => { element.textContent = value; });
    }
  } catch {
    // The server-rendered wording remains the safe public fallback.
  }
}

void hydrateLandingContent();
import { api } from '../../services/api-client.js';
