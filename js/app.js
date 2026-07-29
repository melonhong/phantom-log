function renderAll() {
  window.PhantomFeed.populateComposeCategory();
  window.PhantomCalendar.renderCalendar();
  window.PhantomFeed.renderCatChips();
  window.PhantomFeed.renderFeed();
  window.PhantomGoals.renderGoals();
}

document.addEventListener('DOMContentLoaded', async () => {
  window.PhantomTheme.initTheme();
  window.PhantomCalendar.setRenderFeedCallback(window.PhantomFeed.renderFeed);

  window.PhantomNav.initNavigation(subOrView => {
    if (subOrView === 'today') {
      window.PhantomCalendar.renderTodayTab();
    } else if (subOrView === 'grid' || subOrView === 'cal') {
      window.PhantomCalendar.renderCalendar();
      if (window.PhantomCalendar.selectedDate) {
        window.PhantomCalendar.renderDayEntries(window.PhantomCalendar.selectedDate);
      }
    }
  });

  window.PhantomCalendar.initCalendar();
  window.PhantomFeed.initFeed();
  window.PhantomGoals.initGoals();
  window.PhantomBackup.initBackup(renderAll);
  window.PhantomNotification.initNotification();

  const todayLabel = document.getElementById('todayLabel');
  if (todayLabel) {
    todayLabel.textContent = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  }

  await window.PhantomStorage.loadData();

  const storageNotice = document.getElementById('storageNotice');
  if (storageNotice) {
    storageNotice.textContent = window.PhantomStorage.state.storageMode === 'cloud'
      ? '클라우드에 저장 중'
      : '이 브라우저(파일)에 로컬 저장 중 · 정기적으로 백업을 권장해요';
  }

  renderAll();
});
