window.PhantomNav = {
  // 탭 전환 공통 처리 헬퍼 (버튼 셀렉터, 뷰 셀렉터, dataset 키, 뷰 ID 접두사, 콜백)
  setupTabSwitch(btnSelector, viewSelector, dataKey, prefix, onTabChange) {
    const buttons = document.querySelectorAll(btnSelector);
    const views = document.querySelectorAll(viewSelector);
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        btn.classList.add('active');
        const val = btn.dataset[dataKey];
        document.getElementById(prefix + val)?.classList.add('active');
        if (typeof onTabChange === 'function') onTabChange(val);
      });
    });
  },

  initNavigation(onTabChange) {
    this.setupTabSwitch('nav.tabs button', 'section.view', 'view', 'view-', onTabChange);
    this.setupTabSwitch('.subtab', '.sub-view', 'sub', 'sub-', onTabChange);
  }
};
