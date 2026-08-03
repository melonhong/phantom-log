export const escapeHtml = (s: string): string => {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] || c));
};

export const highlightText = (text: string, q: string): string => {
  const esc = escapeHtml(text);
  if (!q.trim()) return esc;
  const escQ = escapeHtml(q.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return esc.replace(new RegExp(escQ, 'gi'), (m) => `<mark>${m}</mark>`);
};
