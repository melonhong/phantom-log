window.PhantomCalendar = {
  calCursor: new Date(),
  selectedDate: null,
  renderFeedRef: null,

  setRenderFeedCallback(fn) {
    window.PhantomCalendar.renderFeedRef = fn;
  },

  changeMonth(offset) {
    window.PhantomCalendar.calCursor.setMonth(window.PhantomCalendar.calCursor.getMonth() + offset);
    window.PhantomCalendar.renderCalendar();
  },

  toggleModal(show, defaultDate) {
    if (show) {
      document.getElementById('todoDate').value = defaultDate || window.PhantomUtils.getTodayStr();
      document.getElementById('todoContent').value = '';
      document.getElementById('todoTime').value = '';
    }
    document.getElementById('todoOverlay')?.classList.toggle('show', show);
  },

  bindTodoEvents(el, todo, targetDate) {
    const chk = el.querySelector('input[type="checkbox"]');
    if (chk) chk.onchange = e => { todo.done = e.target.checked; window.PhantomCalendar.refreshUI(targetDate); };
    el.querySelector('.del')?.addEventListener('click', () => {
      window.PhantomStorage.state.data.todos = window.PhantomStorage.state.data.todos.filter(x => x.id !== todo.id);
      window.PhantomCalendar.refreshUI(targetDate);
    });
  },

  renderCalendar() {
    const calTitle = document.getElementById('calTitle');
    const calGrid = document.getElementById('calGrid');
    if (!calTitle || !calGrid) return;

    const y = window.PhantomCalendar.calCursor.getFullYear(), m = window.PhantomCalendar.calCursor.getMonth();
    const todayStr = window.PhantomUtils.getTodayStr();
    calTitle.textContent = `${y}년 ${m + 1}월`;
    calGrid.innerHTML = '';

    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
      calGrid.insertAdjacentHTML('beforeend', '<div class="day empty"></div>');
    }

    const { state } = window.PhantomStorage;
    const { pad } = window.PhantomUtils;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`;
      const cell = document.createElement('div');
      cell.className = `day${dateStr === todayStr ? ' today' : ''}${dateStr === window.PhantomCalendar.selectedDate ? ' selected' : ''}`;
      cell.innerHTML = `<div class="num">${d}</div>`;

      const hasPost = state.data.posts.some(p => p.date === dateStr);
      const hasTodo = state.data.todos.some(t => t.date === dateStr);

      if (hasPost || hasTodo) {
        const blotsHtml = `${hasPost ? '<div class="blot post"></div>' : ''}${hasTodo ? '<div class="blot todo"></div>' : ''}`;
        cell.insertAdjacentHTML('beforeend', `<div class="blots">${blotsHtml}</div>`);
      }

      cell.addEventListener('click', () => window.PhantomCalendar.selectDay(dateStr));
      calGrid.appendChild(cell);
    }
  },

  selectDay(dateStr) {
    window.PhantomCalendar.selectedDate = dateStr;
    window.PhantomCalendar.renderCalendar();
    const panel = document.getElementById('dayPanel');
    if (panel) panel.style.display = 'block';
    const d = new Date(dateStr + 'T00:00:00');
    const dpDate = document.getElementById('dpDate');
    if (dpDate) dpDate.textContent = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
    window.PhantomCalendar.renderDayEntries(dateStr);
  },

  refreshUI(dateStr) {
    window.PhantomStorage.saveData();
    window.PhantomCalendar.renderCalendar();
    const targetDate = window.PhantomCalendar.selectedDate || dateStr;
    if (targetDate) window.PhantomCalendar.renderDayEntries(targetDate);
    if (window.PhantomCalendar.renderTodayTab) window.PhantomCalendar.renderTodayTab();
    if (window.PhantomCalendar.renderFeedRef) window.PhantomCalendar.renderFeedRef();
  },

  renderDayEntries(dateStr) {
    const wrap = document.getElementById('dpEntries');
    if (!wrap) return;
    wrap.innerHTML = '';

    const { state } = window.PhantomStorage;
    const { escapeHtml, googleCalendarLink } = window.PhantomUtils;

    const posts = state.data.posts.filter(p => p.date === dateStr);
    const todos = state.data.todos.filter(t => t.date === dateStr);

    posts.forEach(p => {
      const timeLabel = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
      const photoCount = (p.images && p.images.length) || (p.image ? 1 : 0);
      const photoBadge = photoCount ? `<span class="tag post" style="background:var(--primary); color:#fff; margin-right:4px;">📷 사진${photoCount > 1 ? ` (${photoCount})` : ''}</span>` : '';
      const contentText = p.content ? escapeHtml(p.content).slice(0, 50) + (p.content.length > 50 ? '…' : '') : '';
      const el = document.createElement('div');
      el.className = 'entry-mini post-entry';
      el.innerHTML = `
        <div class="row">
          <div>${timeLabel ? `<span class="tag post">${timeLabel}</span>` : ''}${photoBadge}${contentText}</div>
          <button class="del">삭제</button>
        </div>`;

      el.addEventListener('click', () => {
        window.PhantomFeed.scrollToPost(p.id);
      });

      el.querySelector('.del').onclick = (e) => {
        e.stopPropagation();
        state.data.posts = state.data.posts.filter(x => x.id !== p.id);
        window.PhantomCalendar.refreshUI(dateStr);
      };
      wrap.appendChild(el);
    });

    todos.forEach(t => {
      const el = document.createElement('div');
      el.className = `entry-mini ${t.done ? 'done' : ''}`;
      el.innerHTML = `
        <div class="row">
          <div>
            <input type="checkbox" class="todo-check" ${t.done ? 'checked' : ''}>
            ${t.time ? `[${t.time}] ` : ''}
            <span class="todo-content">${escapeHtml(t.content)}</span>
            <a class="gcal-link" href="${googleCalendarLink(t)}" target="_blank" rel="noopener">캘린더 추가</a>
          </div>
          <button class="del">삭제</button>
        </div>`;

      window.PhantomCalendar.bindTodoEvents(el, t, dateStr);
      wrap.appendChild(el);
    });
  },

  renderTodayTab() {
    const wrap = document.getElementById('todayTodoList');
    if (!wrap) return;
    wrap.innerHTML = '';

    const { state } = window.PhantomStorage;
    const { getTodayStr, escapeHtml, googleCalendarLink } = window.PhantomUtils;
    const todayStr = getTodayStr();

    const todos = state.data.todos
      .filter(t => t.date === todayStr)
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

    if (todos.length === 0) {
      wrap.innerHTML = `<div class="empty-state">오늘 등록된 할 일이 없어요.</div>`;
      return;
    }

    todos.forEach(t => {
      const row = document.createElement('div');
      row.className = `today-todo-row ${t.done ? 'done' : ''}`;
      row.innerHTML = `
        <input type="checkbox" ${t.done ? 'checked' : ''}>
        <div class="info">
          ${t.time ? `<span class="time">${t.time}</span>` : ''}
          <span class="content">${escapeHtml(t.content)}</span>
          <a class="gcal-link" href="${googleCalendarLink(t)}" target="_blank" rel="noopener">캘린더 추가</a>
        </div>
        <button class="del">삭제</button>`;

      window.PhantomCalendar.bindTodoEvents(row, t, todayStr);
      wrap.appendChild(row);
    });
  },

  initCalendar() {
    const { getTodayStr, uid, toast } = window.PhantomUtils;
    const { state, saveData } = window.PhantomStorage;

    document.getElementById('prevMonth')?.addEventListener('click', () => window.PhantomCalendar.changeMonth(-1));
    document.getElementById('nextMonth')?.addEventListener('click', () => window.PhantomCalendar.changeMonth(1));
    document.getElementById('quickAddTodoBtn')?.addEventListener('click', () => window.PhantomCalendar.toggleModal(true));
    document.getElementById('btnGoTodo')?.addEventListener('click', () => window.PhantomCalendar.toggleModal(true, window.PhantomCalendar.selectedDate));
    document.getElementById('todoCancel')?.addEventListener('click', () => window.PhantomCalendar.toggleModal(false));
    document.getElementById('todoOverlay')?.addEventListener('click', (e) => e.target.id === 'todoOverlay' && window.PhantomCalendar.toggleModal(false));

    document.getElementById('todoSave')?.addEventListener('click', () => {
      const content = document.getElementById('todoContent').value.trim();
      const date = document.getElementById('todoDate').value;
      const time = document.getElementById('todoTime').value;

      if (!content || !date) {
        toast('내용과 날짜를 입력해주세요.');
        return;
      }

      state.data.todos.push({ id: uid(), content, date, time, done: false, reminded: false });
      saveData();
      window.PhantomCalendar.toggleModal(false);
      window.PhantomCalendar.renderCalendar();

      const todayStr = getTodayStr();
      if (window.PhantomCalendar.selectedDate === date) window.PhantomCalendar.renderDayEntries(date);
      if (date === todayStr) window.PhantomCalendar.renderTodayTab();

      toast('할 일이 추가됐어요.');
    });
  }
};
