export const FORGOT_PASSWORD_COOLDOWN_KEY = 'auth.forgotPassword.cooldownUntil';

let fallbackDeadline = 0;

function storage() {
  try { return globalThis.sessionStorage ?? null; } catch { return null; }
}
function validDeadline(value, now) {
  return Number.isSafeInteger(value) && value > now;
}

export function readForgotPasswordCooldownUntil(now = Date.now()) {
  const store = storage();
  if (!store) return validDeadline(fallbackDeadline, now) ? fallbackDeadline : 0;
  let raw;
  try { raw = store.getItem(FORGOT_PASSWORD_COOLDOWN_KEY); } catch { return validDeadline(fallbackDeadline, now) ? fallbackDeadline : 0; }
  if (raw === null) return validDeadline(fallbackDeadline, now) ? fallbackDeadline : 0;
  const deadline = Number(raw);
  if (validDeadline(deadline, now)) {
    fallbackDeadline = deadline;
    return deadline;
  }
  try { store.removeItem(FORGOT_PASSWORD_COOLDOWN_KEY); } catch { /* Storage may be blocked. */ }
  fallbackDeadline = 0;
  return 0;
}

export function startForgotPasswordCooldown(durationMs, now = Date.now()) {
  const duration = Number(durationMs);
  if (!Number.isFinite(duration) || duration < 0) return 0;
  const deadline = now + Math.round(duration);
  if (!Number.isSafeInteger(deadline)) return 0;
  fallbackDeadline = deadline;
  const store = storage();
  try { store?.setItem(FORGOT_PASSWORD_COOLDOWN_KEY, String(deadline)); } catch { /* The in-memory fallback remains active. */ }
  return deadline;
}

export function clearForgotPasswordCooldown() {
  fallbackDeadline = 0;
  try { globalThis.sessionStorage?.removeItem(FORGOT_PASSWORD_COOLDOWN_KEY); } catch { /* Storage may be blocked. */ }
}

export function cooldownSecondsRemaining(deadline, now = Date.now()) {
  if (!validDeadline(Number(deadline), now)) return 0;
  return Math.max(0, Math.ceil((Number(deadline) - now) / 1000));
}

export function formatCooldown(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}
