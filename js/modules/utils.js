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
  },
  compressImage(file, maxWidth = 1000, maxHeight = 1000, quality = 0.75) {
    return new Promise((resolve) => {
      if (!file || !file.type.startsWith('image/')) return resolve(null);
      const reader = new FileReader();
      reader.onerror = () => resolve(null);
      reader.onload = e => {
        const img = new Image();
        img.onerror = () => resolve(null);
        img.onload = () => {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/webp', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },
  openImageModal(src) {
    const overlay = document.getElementById('imgModalOverlay');
    const img = document.getElementById('imgModalImg');
    if (!overlay || !img) return;
    img.src = src;
    overlay.classList.add('show');
  },
  closeImageModal() {
    const overlay = document.getElementById('imgModalOverlay');
    const img = document.getElementById('imgModalImg');
    if (!overlay) return;
    overlay.classList.remove('show');
    if (img) img.src = '';
  },
  initImageModal() {
    const overlay = document.getElementById('imgModalOverlay');
    const closeBtn = document.getElementById('imgModalClose');
    if (closeBtn) closeBtn.addEventListener('click', () => window.PhantomUtils.closeImageModal());
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) window.PhantomUtils.closeImageModal();
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.PhantomUtils.closeImageModal();
    });
  }
};
