window.PhantomNav = {
  initNavigation(renderTodayTabCallback) {
    document.querySelectorAll('nav.tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('nav.tabs button').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('section.view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        const targetView = document.getElementById('view-' + btn.dataset.view);
        if (targetView) targetView.classList.add('active');
      });
    });

    document.querySelectorAll('.subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sub-view').forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        const targetSub = document.getElementById('sub-' + btn.dataset.sub);
        if (targetSub) targetSub.classList.add('active');
        if (btn.dataset.sub === 'today' && typeof renderTodayTabCallback === 'function') {
          renderTodayTabCallback();
        }
      });
    });
  }
};
