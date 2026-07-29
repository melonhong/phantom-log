window.PhantomUtils = {
  pad(n) { return String(n).padStart(2, '0'); },
  fmtDate(d) { return `${d.getFullYear()}-${window.PhantomUtils.pad(d.getMonth() + 1)}-${window.PhantomUtils.pad(d.getDate())}`; },
  getTodayStr() { return window.PhantomUtils.fmtDate(new Date()); },
  uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); },
  toast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2200);
  },
  escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  highlight(text, q) {
    if (!q) return window.PhantomUtils.escapeHtml(text);
    const esc = window.PhantomUtils.escapeHtml(text);
    const escQ = window.PhantomUtils.escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return esc.replace(new RegExp(escQ, 'gi'), m => `<mark>${m}</mark>`);
  },
  googleCalendarLink(todo) {
    const [h, m] = (todo.time || '09:00').split(':');
    const start = todo.date.replace(/-/g, '') + 'T' + h + m + '00';
    const end = todo.date.replace(/-/g, '') + 'T' + window.PhantomUtils.pad((+h + 1) % 24) + m + '00';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: todo.content,
      dates: `${start}/${end}`
    });
    return `https://www.google.com/calendar/render?${params.toString()}`;
  }
};
