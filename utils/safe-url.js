const CONTROL_OR_WHITESPACE = /[\u0000-\u001f\u007f\s]/;
const EMAIL_PATTERN = /^[a-z0-9.!#$%&'*+/=_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;
const PHONE_PATTERN = /^[+0-9().\-\s]{1,32}$/;

export function safeHttpUrl(value) {
  const candidate = String(value ?? '').trim();
  if (!candidate || CONTROL_OR_WHITESPACE.test(candidate)) return '';
  try {
    const url = new URL(candidate);
    const protocolAllowed = url.protocol === 'http:' || url.protocol === 'https:';
    return protocolAllowed && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

export function safeImageUrl(value, baseUrl = globalThis.location?.origin) {
  const candidate = String(value ?? '').trim();
  if (!candidate || CONTROL_OR_WHITESPACE.test(candidate)) return '';
  if (/^data:image\/(?:png|jpe?g|gif|webp|svg\+xml|bmp|avif|ico);/i.test(candidate)) return candidate;
  if (candidate.startsWith('/') && !candidate.startsWith('//') && !candidate.includes('\\')) {
    try {
      return safeHttpUrl(new URL(candidate, baseUrl).href);
    } catch {
      return '';
    }
  }
  return safeHttpUrl(candidate);
}

export function safeMailtoHref(value) {
  const email = String(value ?? '').trim().toLowerCase();
  return email.length <= 190 && EMAIL_PATTERN.test(email) ? `mailto:${email}` : '';
}

export function safeTelHref(value) {
  const phone = String(value ?? '').trim();
  if (!PHONE_PATTERN.test(phone) || !/\d/.test(phone)) return '';
  return `tel:${phone.replace(/\s+/g, '')}`;
}
