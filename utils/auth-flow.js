const allowedIntents = new Set(['basic', 'pro']);
const pendingStarterClaimKey = 'knd.pendingStarterClaim';
const starterPublicIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function safeReturnTo(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '';
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return '';

  const rawPath = value.split(/[?#]/, 1)[0];
  if (/%(?:2f|5c)/i.test(rawPath)) return '';

  try {
    const base = new URL(globalThis.location?.origin ?? 'http://localhost');
    const target = new URL(value, base);
    if (target.origin !== base.origin) return '';
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return '';
  }
}

export function starterPublicIdFromReturnTo(returnTo) {
  const safe = safeReturnTo(returnTo);
  if (!safe) return '';
  const target = new URL(safe, globalThis.location?.origin ?? 'http://localhost');
  const publicId = target.pathname === '/starter/manage/' ? target.searchParams.get('publicId') ?? '' : '';
  return starterPublicIdPattern.test(publicId) ? publicId : '';
}

export function rememberStarterClaim(publicId) {
  if (!starterPublicIdPattern.test(publicId)) return;
  try { globalThis.sessionStorage?.setItem(pendingStarterClaimKey, publicId); } catch { /* Private browsing may deny storage. */ }
}

export function pendingStarterClaim() {
  try {
    const publicId = globalThis.sessionStorage?.getItem(pendingStarterClaimKey) ?? '';
    return starterPublicIdPattern.test(publicId) ? publicId : '';
  } catch { return ''; }
}

export function forgetStarterClaim() {
  try { globalThis.sessionStorage?.removeItem(pendingStarterClaimKey); } catch { /* Nothing to clean up. */ }
}

export function safeMembershipIntent(value) {
  return allowedIntents.has(value) ? value : '';
}

export function postLoginDestination(roles, { intent = '' } = {}) {
  const assignedRoles = new Set(
    (Array.isArray(roles) ? roles : [roles]).filter((role) => typeof role === 'string'),
  );

  if (assignedRoles.has('super_admin')) return '/admin/';
  if (assignedRoles.has('resume_service_admin')) return '/admin/resume-services/';
  if (assignedRoles.has('resume_quality_reviewer')) return '/admin/resume-services/?view=quality-review';
  if (assignedRoles.has('cv_specialist')) return '/specialist/';

  const safeIntent = safeMembershipIntent(intent);
  return safeIntent ? `/app/billing/?intent=${encodeURIComponent(safeIntent)}` : '/app/';
}

export function withAuthContext(path, { returnTo = '', intent = '' } = {}) {
  const target = new URL(path, globalThis.location?.origin ?? 'http://localhost');
  const safePath = safeReturnTo(returnTo);
  const safeIntent = safeMembershipIntent(intent);
  if (safePath) target.searchParams.set('returnTo', safePath);
  if (safeIntent) target.searchParams.set('intent', safeIntent);
  return `${target.pathname}${target.search}`;
}

export function authErrorMessage(error, fallback = 'Kami belum dapat memproses permintaan ini. Silakan coba lagi.') {
  const code = String(error?.code ?? '');
  const messages = {
    INTERNAL_SERVER_ERROR: 'Layanan sedang mengalami kendala. Coba lagi beberapa menit lagi.',
    EMAIL_DELIVERY_UNAVAILABLE: 'Email belum dapat dikirim. Tunggu beberapa menit lalu coba lagi.',
    NETWORK_ERROR: 'Koneksi ke layanan terputus. Periksa internet Anda lalu coba lagi.',
    REQUEST_TIMEOUT: 'Permintaan terlalu lama. Silakan coba lagi.',
  };
  const message = messages[code] ?? error?.message ?? fallback;
  return error?.requestId ? `${message} Referensi: ${error.requestId}.` : message;
}
