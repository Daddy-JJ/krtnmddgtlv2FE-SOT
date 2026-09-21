const TEXT_LIMITS = {
  pastedResumeText: 30_000,
  pastedJobDescription: 20_000,
  additionalAchievements: 10_000,
  certifications: 10_000,
};
const OPTIONAL_LIMITS = {
  currentOrganization: 200,
  targetCompany: 200,
  linkedinUrl: 2048,
};

export function buildResumeRequestInput(values) {
  const value = Object.fromEntries(
    Object.entries(values).map(([key, item]) => [key, typeof item === 'string' ? item.trim() : item]),
  );
  const consentAccepted = value.combinedConsent === 'on';
  const experienceYears = value.experienceYears === '' || value.experienceYears == null
    ? null
    : Number(value.experienceYears);

  delete value.combinedConsent;
  for (const field of Object.keys(OPTIONAL_LIMITS)) {
    if (value[field] === '') value[field] = null;
  }
  for (const field of Object.keys(TEXT_LIMITS)) {
    if (value[field] === '') value[field] = null;
  }
  value.experienceYears = experienceYears;
  value.consents = {
    accurate: consentAccepted,
    specialistAccess: consentAccepted,
    noFiction: consentAccepted,
    userReview: consentAccepted,
    retention: consentAccepted,
  };
  return value;
}

export function validateResumeRequestInput(input) {
  const errors = {};
  required(input.beneficiaryName, 'Nama penerima manfaat', errors, 'beneficiaryName');
  required(input.whatsappNumber, 'Nomor WhatsApp', errors, 'whatsappNumber');
  required(input.currentJobTitle, 'Jabatan saat ini', errors, 'currentJobTitle');
  required(input.targetRole, 'Target peran', errors, 'targetRole');
  required(input.targetIndustry, 'Industri target', errors, 'targetIndustry');
  required(input.targetCountry, 'Negara target', errors, 'targetCountry');
  required(input.careerLevel, 'Career level', errors, 'careerLevel');
  required(input.resumeLanguage, 'Bahasa CV', errors, 'resumeLanguage');
  required(input.resumeStyle, 'Pendekatan CV', errors, 'resumeStyle');

  if (input.whatsappNumber && !/^[+0-9().\-\s]{6,32}$/u.test(input.whatsappNumber)) {
    errors.whatsappNumber = 'Masukkan nomor WhatsApp yang valid.';
  }
  if (input.experienceYears != null && (!Number.isFinite(input.experienceYears) || input.experienceYears < 0 || input.experienceYears > 80)) {
    errors.experienceYears = 'Pengalaman kerja harus berupa angka 0-80 tahun.';
  }
  for (const [field, limit] of Object.entries(TEXT_LIMITS)) {
    if (input[field] && input[field].length > limit) errors[field] = `Teks terlalu panjang; maksimum ${limit.toLocaleString('id-ID')} karakter.`;
  }
  for (const [field, limit] of Object.entries(OPTIONAL_LIMITS)) {
    if (input[field] && input[field].length > limit) errors[field] = `Nilai maksimal ${limit.toLocaleString('id-ID')} karakter.`;
  }
  if (input.linkedinUrl) {
    try {
      const url = new URL(input.linkedinUrl);
      if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('invalid protocol');
    } catch {
      errors.linkedinUrl = 'LinkedIn harus berupa URL HTTP(S) yang valid.';
    }
  }
  if (!Object.values(input.consents ?? {}).every(Boolean)) {
    errors.combinedConsent = 'Persetujuan wajib diberikan sebelum melanjutkan.';
  }
  return errors;
}

function required(value, label, errors, field) {
  if (!String(value ?? '').trim()) errors[field] = `${label} wajib diisi.`;
}
