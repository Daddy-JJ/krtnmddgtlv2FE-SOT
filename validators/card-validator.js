import { buildStarterInput, validateStarterInput } from './starter-validator.js';

export function buildCardInput(values, currentCard, locale = 'id') {
  const structuredAddress = [
    values.addressStreet,
    values.addressCity,
    values.addressProvince,
    values.addressPostalCode,
    values.addressCountry,
  ].map((value) => String(value ?? '').trim());
  const addressText = structuredAddress.slice(0, 4).some(Boolean)
    ? structuredAddress.join('\n')
    : values.addressText;
  const merged = {
    ...currentCard?.contact,
    ...values,
    addressText,
  };
  const input = buildStarterInput(merged, currentCard?.locale ?? locale);
  const mapsUrl = Object.hasOwn(values, 'mapsUrl')
    ? String(values.mapsUrl ?? '').trim()
    : currentCard?.contact?.mapsUrl;
  input.contact.mapsUrl = mapsUrl || null;
  return input;
}

export function validateCardInput(input, fields) {
  const mapsUrl = String(input?.contact?.mapsUrl ?? '').trim();
  const errors = {
    ...validateStarterInput(input),
    ...(mapsUrl && (mapsUrl.length > 500 || !/^https?:\/\/[^\s]+$/i.test(mapsUrl))
      ? { mapsUrl: 'Link Google Maps wajib memakai URL http atau https.' }
      : {}),
  };
  if (!fields) return errors;
  return Object.fromEntries(Object.entries(errors).filter(([field]) => fields.includes(field)));
}
