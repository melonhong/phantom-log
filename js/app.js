function renderAll() {
  window.PhantomFeed.populateComposeCategory();
  window.PhantomCalendar.renderCalendar();
  window.PhantomFeed.renderCatChips();
  window.PhantomFeed.renderFeed();
  window.PhantomGoals.renderGoals();
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1. 테마 초기화
  window.PhantomTheme.initTheme();

  // 2. 렌더 순환 모듈 바인딩
  window.PhantomCalendar.setRenderFeedCallback(window.PhantomFeed.renderFeed);

  // 3. 각 모듈 이벤트 등록
  window.PhantomNav.initNavigation(window.PhantomCalendar.renderTodayTab);
  window.PhantomCalendar.initCalendar();
  window.PhantomFeed.initFeed();
  window.PhantomGoals.initGoals();
  window.PhantomBackup.initBackup(renderAll);
  window.PhantomNotification.initNotification();

  // 4. 레이블 및 기본 안내 문구 설정
  const todayLabel = document.getElementById('todayLabel');
  if (todayLabel) {
    todayLabel.textContent = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short'
    });
  }

  // 5. 데이터 로드 및 초기 렌더링
  await window.PhantomStorage.loadData();

  const storageNotice = document.getElementById('storageNotice');
  if (storageNotice) {
    storageNotice.textContent = window.PhantomStorage.state.storageMode === 'cloud'
      ? '클라우드에 저장 중'
      : '이 브라우저(파일)에 로컬 저장 중 · 정기적으로 백업을 권장해요';
  }

  renderAll();
});
