/**
 * Runs inside the page. Finds every form control a person could fill in, works out its question text,
 * and tags it with data-ja-id so it can be addressed afterwards.
 */
export function collectFields() {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
  };
  const text = (el) => (el ? (el.innerText ?? el.textContent ?? '').replace(/\s+/g, ' ').trim() : '');
  const labelOf = (el) => {
    const parts = [];
    const ids = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
    for (const id of ids) parts.push(text(document.getElementById(id)));
    if (el.id) { try { parts.push(text(document.querySelector(`label[for="${CSS.escape(el.id)}"]`))); } catch { /* odd id */ } }
    parts.push(text(el.closest('label')));
    parts.push(el.getAttribute('aria-label') ?? '');
    const first = parts.find((p) => p);
    if (first) return first;
    // Fall back to the nearest block that contains exactly this control and some text.
    let node = el.parentElement;
    for (let i = 0; i < 4 && node; i++, node = node.parentElement) {
      const controls = node.querySelectorAll('input:not([type=hidden]), textarea, select, [role=combobox]');
      const t = text(node);
      if (t && controls.length <= 1 && t.length < 300) return t;
      if (controls.length > 1) break;
    }
    return el.getAttribute('placeholder') ?? el.getAttribute('name') ?? '';
  };
  const groupLabel = (el) => {
    const fs = el.closest('fieldset');
    if (fs) { const lg = fs.querySelector('legend'); if (lg && text(lg)) return text(lg); }
    const grp = el.closest('[role=radiogroup],[role=group]');
    if (grp) {
      const ids = (grp.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
      const t = ids.map((id) => text(document.getElementById(id))).join(' ').trim() || grp.getAttribute('aria-label');
      if (t) return t;
    }
    // Otherwise climb while the surrounding block still holds only this group's own controls.
    const name = el.getAttribute('name');
    let node = el.parentElement;
    for (let i = 0; i < 5 && node; i++, node = node.parentElement) {
      const foreign = [...node.querySelectorAll('input:not([type=hidden]), textarea, select')].some((c) => c !== el && (!name || c.getAttribute('name') !== name));
      if (foreign) break;
      const lab = node.querySelector(':scope > label, :scope > legend, :scope > .label, :scope > p, :scope > div > label');
      if (lab && !lab.contains(el) && text(lab)) return text(lab);
    }
    return '';
  };
  const isRequired = (el, label) => el.required || el.getAttribute('aria-required') === 'true' || /\*\s*$|\(required\)/i.test(label) || Boolean(el.closest('.required, [data-required="true"]'));

  // The counter lives on window so ids stay unique when the form is scanned again after it changes.
  const tag = (el) => { if (!el.dataset.jaId) { window.__jaSeq = (window.__jaSeq ?? 0) + 1; el.dataset.jaId = String(window.__jaSeq); } return el.dataset.jaId; };
  const fields = [];
  const groups = new Map();

  for (const el of document.querySelectorAll('input, textarea, select, [role=combobox]')) {
    if (el.disabled || el.readOnly && el.getAttribute('role') !== 'combobox') continue;
    const tagName = el.tagName.toLowerCase();
    const type = tagName === 'input' ? (el.getAttribute('type') ?? 'text').toLowerCase() : tagName;
    if (['hidden', 'submit', 'button', 'reset', 'image', 'search'].includes(type)) continue;
    if (el.closest('[aria-hidden="true"]') && type !== 'file') continue;

    if (type === 'file') { // file inputs are usually visually hidden behind a button
      const label = labelOf(el) || groupLabel(el);
      fields.push({ id: tag(el), kind: 'file', label, required: isRequired(el, label), accept: el.getAttribute('accept') ?? '', files: [...(el.files ?? [])].map((f) => f.name) });
      continue;
    }
    if (type === 'radio' || type === 'checkbox') {
      const name = el.getAttribute('name') || `__solo_${tag(el)}`;
      const gkey = `${type}:${name}`;
      const optLabel = labelOf(el);
      if (!visible(el) && !visible(el.closest('label') ?? el.parentElement ?? el)) continue;
      if (!groups.has(gkey)) {
        const g = { id: tag(el), kind: type, label: '', required: false, options: [], name };
        groups.set(gkey, g); fields.push(g);
        g.label = groupLabel(el);
      }
      const g = groups.get(gkey);
      g.options.push({ id: tag(el), label: optLabel, checked: el.checked });
      g.required = g.required || isRequired(el, g.label);
      continue;
    }
    if (!visible(el)) continue;
    const label = labelOf(el);
    const isCombo = el.getAttribute('role') === 'combobox' || el.getAttribute('aria-autocomplete') === 'list' || el.hasAttribute('aria-haspopup');
    if (tagName === 'select') {
      fields.push({ id: tag(el), kind: 'select', label, required: isRequired(el, label), value: el.value, selectedText: el.selectedIndex >= 0 ? el.options[el.selectedIndex].textContent.trim() : '',
        options: [...el.options].filter((o) => o.value !== '' && !o.disabled).map((o) => ({ label: o.textContent.trim(), value: o.value })) });
    } else if (isCombo) {
      fields.push({ id: tag(el), kind: 'combobox', label, required: isRequired(el, label), value: el.value ?? '' });
    } else {
      fields.push({ id: tag(el), kind: tagName === 'textarea' ? 'textarea' : 'text', inputType: type, label, required: isRequired(el, label),
        value: el.value ?? '', maxLength: el.maxLength > 0 ? el.maxLength : null, autocomplete: el.getAttribute('autocomplete') ?? '', name: el.getAttribute('name') ?? '' });
    }
  }
  // A lone checkbox is a yes/no (usually a consent tick); its question is its own label.
  for (const g of groups.values()) {
    if (g.kind === 'checkbox' && g.options.length === 1) { g.single = true; g.label = g.options[0].label || g.label; }
  }
  return fields;
}
