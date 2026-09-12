const PREFIXES = Object.freeze({ mr: 'Mr', mrs: 'Mrs', ms: 'Ms' });

export function normalizeNamePrefix(value) {
  const key = String(value ?? '').trim().toLowerCase();
  return PREFIXES[key] ?? '';
}

export function splitName(value) {
  const tokens = String(value ?? '').trim().replace(/\s+/g, ' ').split(' ').filter(Boolean);
  const prefix = normalizeNamePrefix(tokens[0]);
  const nameTokens = prefix ? tokens.slice(1) : tokens;
  const firstName = nameTokens.shift() ?? '';
  return {
    prefix,
    firstName,
    lastName: nameTokens.join(' '),
    displayName: [firstName, ...nameTokens].filter(Boolean).join(' '),
    genderSymbol: prefix === 'Mr' ? '\u2642' : prefix ? '\u2640' : '',
  };
}

export function formatCardDisplayName(value) {
  const parsed = splitName(value);
  const genderMarker = parsed.genderSymbol ? `(${parsed.genderSymbol})` : '';
  return [parsed.displayName, genderMarker].filter(Boolean).join(' ');
}
