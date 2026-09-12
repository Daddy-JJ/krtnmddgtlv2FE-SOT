import { buildApiUrl } from './api-client.js';
import { safeHttpUrl } from '../utils/safe-url.js';

const slugPattern = /^[A-Za-z0-9][A-Za-z0-9-]{1,98}[A-Za-z0-9]$/;

export function publicSlugFromPath(pathname) {
  if (typeof pathname !== 'string') return null;
  const match = pathname.match(/^\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    const slug = decodeURIComponent(match[1]);
    return slugPattern.test(slug) ? slug : null;
  } catch {
    return null;
  }
}

export function publicCardViewModel(card) {
  const contact = card?.contact ?? {};
  return Object.freeze({
    fullName: contact.fullName ?? '',
    jobTitle: contact.jobTitle ?? '',
    organization: contact.organization ?? '',
    officePhone: contact.officePhone ?? '',
    mobilePhone: contact.mobilePhone ?? '',
    email: contact.email ?? '',
    websiteUrl: contact.websiteUrl ?? '',
    addressText: contact.addressText ?? '',
    mapsUrl: contact.mapsUrl ?? '',
    logoUrl: card?.logoUrl ?? '',
    canonicalUrl: card?.canonicalUrl ?? '',
    qrUrl: card?.qrImageUrl ?? '',
    socialLinks: Array.isArray(card?.socialLinks) ? card.socialLinks : [],
  });
}

/** Accept only the backend-derived official Indonesian WhatsApp shortlink. */
export function safeWhatsAppUrl(value) {
  const safe = safeHttpUrl(value);
  if (!safe) return '';
  const url = new URL(safe);
  return url.protocol === 'https:' && url.hostname === 'wa.me' && /^\/628\d{7,12}$/.test(url.pathname)
    ? url.href
    : '';
}

export function publicAssetLinks(slug) {
  const encoded = encodeURIComponent(slug);
  return Object.freeze({
    vcard: buildApiUrl(`/public/cards/${encoded}/vcard`),
    qrDownload: buildApiUrl(`/public/cards/${encoded}/qr?download=true`),
  });
}
