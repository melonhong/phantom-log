window.PhantomCalendar = {
  calCursor: new Date(),
  selectedDate: null,
  renderFeedRef: null,

  setRenderFeedCallback(fn) {
    window.PhantomCalendar.renderFeedRef = fn;
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
      const e = document.createElement('div');
      e.className = 'day empty';
      calGrid.appendChild(e);
    }

    const { state } = window.PhantomStorage;
    const { pad } = window.PhantomUtils;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${pad(m + 1)}-${pad(d)}`;
      const cell = document.createElement('div');
      cell.className = 'day';
      if (dateStr === todayStr) cell.classList.add('today');
      if (dateStr === window.PhantomCalendar.selectedDate) cell.classList.add('selected');

      const num = document.createElement('div');
      num.className = 'num';
      num.textContent = d;
      cell.appendChild(num);

      const hasPost = state.data.posts.some(p => p.date === dateStr);
      const hasTodo = state.data.todos.some(t => t.date === dateStr);

      if (hasPost || hasTodo) {
        const blots = document.createElement('div');
        blots.className = 'blots';
        if (hasPost) {
          const b = document.createElement('div');
          b.className = 'blot post';
          blots.appendChild(b);
        }
        if (hasTodo) {
          const b = document.createElement('div');
          b.className = 'blot todo';
          blots.appendChild(b);
        }
        cell.appendChild(blots);
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

  renderDayEntries(dateStr) {
    const wrap = document.getElementById('dpEntries');
    if (!wrap) return;
    wrap.innerHTML = '';
    const { state, saveData } = window.PhantomStorage;
    const { escapeHtml, googleCalendarLink } = window.PhantomUtils;

    const posts = state.data.posts.filter(p => p.date === dateStr);
    const todos = state.data.todos.filter(t => t.date === dateStr);

    posts.forEach(p => {
      const timeLabel = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
      const el = document.createElement('div');
      el.className = 'entry-mini';
      el.innerHTML = `
        <div class="row">
          <div><span class="tag post">글${timeLabel ? (' · ' + timeLabel) : ''}</span>${escapeHtml(p.content).slice(0, 60)}${p.content.length > 60 ? '…' : ''}</div>
          <button class="del">삭제</button>
        </div>`;
      el.querySelector('.del').addEventListener('click', () => {
        state.data.posts = state.data.posts.filter(x => x.id !== p.id);
        saveData();
        window.PhantomCalendar.renderCalendar();
        window.PhantomCalendar.renderDayEntries(dateStr);
        if (window.PhantomCalendar.renderFeedRef) window.PhantomCalendar.renderFeedRef();
      });
      wrap.appendChild(el);
    });

    todos.forEach(t => {
      const el = document.createElement('div');
      el.className = 'entry-mini';
      el.innerHTML = `
        <div class="row">
          <div><span class="tag todo">할일</span>${t.time ? ('[' + t.time + '] ') : ''}${escapeHtml(t.content)}
          <a class="gcal-link" href="${googleCalendarLink(t)}" target="_blank" rel="noopener">캘린더 추가</a></div>
          <button class="del">삭제</button>
        </div>`;
      el.querySelector('.del').addEventListener('click', () => {
        state.data.todos = state.data.todos.filter(x => x.id !== t.id);
        saveData();
        window.PhantomCalendar.renderCalendar();
        window.PhantomCalendar.renderDayEntries(dateStr);
      });
      wrap.appendChild(el);
    });
  },

  renderTodayTab() {
    const wrap = document.getElementById('todayTodoList');
    if (!wrap) return;
    wrap.innerHTML = '';

    const { state, saveData } = window.PhantomStorage;
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
      row.className = 'today-todo-row' + (t.done ? ' done' : '');
      row.innerHTML = `
        <input type="checkbox" ${t.done ? 'checked' : ''}>
        <div class="info">
          ${t.time ? `<span class="time">${t.time}</span>` : ''}
          <span class="content">${escapeHtml(t.content)}</span>
          <a class="gcal-link" href="${googleCalendarLink(t)}" target="_blank" rel="noopener">캘린더 추가</a>
        </div>
        <button class="del">삭제</button>`;

      row.querySelector('input').addEventListener('change', e => {
        t.done = e.target.checked;
        saveData();
        row.classList.toggle('done', t.done);
      });

      row.querySelector('.del').addEventListener('click', () => {
        state.data.todos = state.data.todos.filter(x => x.id !== t.id);
        saveData();
        window.PhantomCalendar.renderTodayTab();
        window.PhantomCalendar.renderCalendar();
        if (window.PhantomCalendar.selectedDate === todayStr) window.PhantomCalendar.renderDayEntries(todayStr);
      });

      wrap.appendChild(row);
    });
  },

  initCalendar() {
    const { getTodayStr, uid, toast } = window.PhantomUtils;
    const { state, saveData } = window.PhantomStorage;

    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    if (prevMonthBtn) prevMonthBtn.addEventListener('click', () => { window.PhantomCalendar.calCursor.setMonth(window.PhantomCalendar.calCursor.getMonth() - 1); window.PhantomCalendar.renderCalendar(); });
    if (nextMonthBtn) nextMonthBtn.addEventListener('click', () => { window.PhantomCalendar.calCursor.setMonth(window.PhantomCalendar.calCursor.getMonth() + 1); window.PhantomCalendar.renderCalendar(); });

    const quickAddBtn = document.getElementById('quickAddTodoBtn');
    if (quickAddBtn) {
      quickAddBtn.addEventListener('click', () => {
        document.getElementById('todoDate').value = getTodayStr();
        document.getElementById('todoContent').value = '';
        document.getElementById('todoTime').value = '';
        document.getElementById('todoOverlay').classList.add('show');
      });
    }

    const btnGoTodo = document.getElementById('btnGoTodo');
    if (btnGoTodo) {
      btnGoTodo.addEventListener('click', () => {
        document.getElementById('todoDate').value = window.PhantomCalendar.selectedDate || getTodayStr();
        document.getElementById('todoContent').value = '';
        document.getElementById('todoTime').value = '';
        document.getElementById('todoOverlay').classList.add('show');
      });
    }

    const todoCancel = document.getElementById('todoCancel');
    if (todoCancel) todoCancel.addEventListener('click', () => document.getElementById('todoOverlay').classList.remove('show'));

    const todoOverlay = document.getElementById('todoOverlay');
    if (todoOverlay) {
      todoOverlay.addEventListener('click', (e) => {
        if (e.target.id === 'todoOverlay') e.currentTarget.classList.remove('show');
      });
    }

    const todoSave = document.getElementById('todoSave');
    if (todoSave) {
      todoSave.addEventListener('click', () => {
        const content = document.getElementById('todoContent').value.trim();
        const date = document.getElementById('todoDate').value;
        const time = document.getElementById('todoTime').value;

        if (!content || !date) {
          toast('내용과 날짜를 입력해주세요.');
          return;
        }

        state.data.todos.push({ id: uid(), content, date, time, done: false, reminded: false });
        saveData();
        document.getElementById('todoOverlay').classList.remove('show');
        window.PhantomCalendar.renderCalendar();

        const todayStr = getTodayStr();
        if (window.PhantomCalendar.selectedDate === date) window.PhantomCalendar.renderDayEntries(date);
        if (date === todayStr) window.PhantomCalendar.renderTodayTab();

        toast('할 일이 추가됐어요.');
      });
    }
  }
};
