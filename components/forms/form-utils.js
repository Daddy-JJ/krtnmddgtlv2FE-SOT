export function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function setBusy(form, busy) {
  form.querySelectorAll('button,input,textarea,select').forEach((element) => {
    element.disabled = busy;
  });
  form.setAttribute('aria-busy', String(busy));
}

export function showStatus(target, message, tone = 'info') {
  if (!target) return;
  target.textContent = message;
  target.dataset.tone = tone;
  target.setAttribute('role', tone === 'error' ? 'alert' : 'status');
  target.setAttribute('aria-live', tone === 'error' ? 'assertive' : 'polite');
  target.setAttribute('aria-atomic', 'true');
}

export function clearStatus(target) {
  if (!target) return;
  target.textContent = '';
  delete target.dataset.tone;
  target.removeAttribute('role');
  target.removeAttribute('aria-live');
  target.removeAttribute('aria-atomic');
}

export function clearFieldErrors(form) {
  form.querySelectorAll('[data-field-error]').forEach((element) => {
    element.textContent = '';
  });
  form.querySelectorAll('[aria-invalid="true"]').forEach((element) => {
    element.removeAttribute('aria-invalid');
  });
}

export function showFieldErrors(form, errors) {
  clearFieldErrors(form);
  const firstField = Object.keys(errors)[0];
  for (const [field, message] of Object.entries(errors)) {
    const input = form.elements[field];
    const error = form.querySelector(`[data-field-error="${field}"]`);
    if (input) input.setAttribute('aria-invalid', 'true');
    if (error) {
      const id = error.id || `${field}-error`;
      error.id = id;
      error.setAttribute('role', 'alert');
      error.textContent = message;
      if (input) {
        const describedBy = new Set(String(input.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
        describedBy.add(id);
        input.setAttribute('aria-describedby', [...describedBy].join(' '));
      }
    }
  }
  if (firstField && form.elements[firstField]) form.elements[firstField].focus();
}

export function mapApiFieldErrors(details) {
  if (!Array.isArray(details)) return {};
  return Object.fromEntries(details.map((item) => [String(item.field ?? '').replace(/^contact\./, ''), item.message]).filter(([field]) => field));
}
