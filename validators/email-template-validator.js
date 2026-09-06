const hexColor = /^#[0-9a-f]{6}$/i;

export function validateEmailTemplateContent(content, detail, { complete = true } = {}) {
  const errors = [];
  const limits = detail?.limits ?? {};
  checkText(errors, 'subject', content?.subject, limits.subject ?? 160, true);
  checkText(errors, 'preheader', content?.preheader, limits.preheader ?? 200);
  checkText(errors, 'heading', content?.heading, limits.heading ?? 160);
  checkText(errors, 'footer', content?.footer, limits.footer ?? 1000, false, true);
  if (content?.schemaVersion !== 1 || content?.locale !== 'id') errors.push('Versi schema atau locale template tidak didukung.');
  for (const [field, value] of Object.entries({ backgroundColor: content?.style?.backgroundColor, textColor: content?.style?.textColor, accentColor: content?.style?.accentColor })) {
    if (!hexColor.test(String(value ?? ''))) errors.push(`${field} harus berupa warna hex enam digit.`);
  }
  checkText(errors, 'teks alternatif logo', content?.style?.logoAlt, 160);
  if (content?.style?.logoAssetKey && !String(content.style.logoAlt ?? '').trim()) errors.push('Teks alternatif logo wajib diisi saat logo digunakan.');

  const blocks = Array.isArray(content?.blocks) ? content.blocks : [];
  if (blocks.length > (limits.blocks ?? 30)) errors.push('Jumlah blok melebihi batas.');
  const allowedActions = new Set(detail?.actions ?? []);
  const allowedSystems = new Set(detail?.systems ?? []);
  const allowedVariables = new Set((detail?.variables ?? []).map(item => item.name));
  const foundActions = new Set(), foundSystems = new Set();
  for (const block of blocks) {
    if (block?.type === 'paragraph') {
      if (!Array.isArray(block.parts) || block.parts.length === 0) errors.push('Paragraf harus memiliki isi.');
      if ((block.parts?.length ?? 0) > (limits.parts ?? 100)) errors.push('Bagian paragraf melebihi batas.');
      let length = 0;
      for (const part of block.parts ?? []) {
        if (Object.hasOwn(part, 'text')) {
          length += String(part.text).length;
          checkText(errors, 'teks paragraf', part.text, limits.paragraph ?? 2000, false, true);
        }
        else if (!allowedVariables.has(part.variable)) errors.push(`Variabel ${part.variable ?? '-'} tidak diizinkan.`);
        if (!['normal', 'strong', 'em'].includes(part.emphasis)) errors.push('Format penekanan tidak valid.');
      }
      if (length > (limits.paragraph ?? 2000)) errors.push('Teks paragraf melebihi batas.');
      continue;
    }
    if (block?.type === 'action') {
      if (!allowedActions.has(block.targetVariable) || foundActions.has(block.targetVariable)) errors.push('Blok aksi tidak diizinkan atau duplikat.');
      foundActions.add(block.targetVariable);
      checkText(errors, 'label tombol', block.label, limits.label ?? 80, true);
      continue;
    }
    if (block?.type === 'system') {
      if (!allowedSystems.has(block.key) || foundSystems.has(block.key)) errors.push('Blok keamanan tidak diizinkan atau duplikat.');
      foundSystems.add(block.key);
      continue;
    }
    errors.push('Jenis blok tidak dikenal.');
  }
  if (complete) {
    for (const action of allowedActions) if (!foundActions.has(action)) errors.push(`Blok aksi wajib ${action} belum ada.`);
    for (const system of allowedSystems) if (!foundSystems.has(system)) errors.push(`Blok keamanan wajib ${system} belum ada.`);
  }
  return { valid: errors.length === 0, errors };
}

function checkText(errors, label, value, max, required = false, multiline = false) {
  if (typeof value !== 'string') { errors.push(`${label} tidak valid.`); return; }
  if (required && !value.trim()) errors.push(`${label} wajib diisi.`);
  if (value.length > max) errors.push(`${label} melebihi ${max} karakter.`);
  const unsafe = multiline ? /[<>\u0000-\u0008\u000b-\u001f\u007f]/ : /[<>\u0000-\u001f\u007f]/;
  if (unsafe.test(value)) errors.push(`${label} mengandung karakter yang tidak diizinkan.`);
}
