window.PhantomGoals = {
  goalsCursor: new Date(),

  monthKey(d) {
    const { pad } = window.PhantomUtils;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  },

  ensureMonth(key) {
    const { state } = window.PhantomStorage;
    if (!state.data.monthly[key]) state.data.monthly[key] = { goals: [], retro: '' };
    return state.data.monthly[key];
  },

  getCurrentMonthData() {
    const key = window.PhantomGoals.monthKey(window.PhantomGoals.goalsCursor);
    return window.PhantomGoals.ensureMonth(key);
  },

  changeMonth(offset) {
    window.PhantomGoals.goalsCursor.setMonth(window.PhantomGoals.goalsCursor.getMonth() + offset);
    window.PhantomGoals.renderGoals();
  },

  renderGoals() {
    const goalsTitle = document.getElementById('goalsTitle');
    const list = document.getElementById('goalsList');
    const retroText = document.getElementById('retroText');
    if (!goalsTitle || !list) return;

    const y = window.PhantomGoals.goalsCursor.getFullYear(), m = window.PhantomGoals.goalsCursor.getMonth();
    goalsTitle.textContent = `${y}년 ${m + 1}월`;

    const md = window.PhantomGoals.getCurrentMonthData();
    const { escapeHtml } = window.PhantomUtils;

    if (md.goals.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:16px 0;">이번 달 목표를 추가해보세요.</div>`;
    } else {
      list.innerHTML = md.goals.map(g => `
        <div class="goal-row${g.done ? ' done' : ''}">
          <input type="checkbox" data-id="${g.id}" ${g.done ? 'checked' : ''}>
          <span>${escapeHtml(g.text)}</span>
          <button class="del" data-id="${g.id}">✕</button>
        </div>`
      ).join('');
    }

    if (retroText) retroText.value = md.retro || '';
  },

  addGoal() {
    const input = document.getElementById('newGoalInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const { uid } = window.PhantomUtils;
    const { saveData } = window.PhantomStorage;
    const md = window.PhantomGoals.getCurrentMonthData();

    md.goals.push({ id: uid(), text, done: false });
    saveData();
    input.value = '';
    window.PhantomGoals.renderGoals();
  },

  initGoals() {
    const { saveData } = window.PhantomStorage;

    document.getElementById('addGoalBtn')?.addEventListener('click', window.PhantomGoals.addGoal);
    document.getElementById('newGoalInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.PhantomGoals.addGoal(); });
    document.getElementById('prevMonthG')?.addEventListener('click', () => window.PhantomGoals.changeMonth(-1));
    document.getElementById('nextMonthG')?.addEventListener('click', () => window.PhantomGoals.changeMonth(1));

    const list = document.getElementById('goalsList');
    if (list) {
      list.addEventListener('click', e => {
        const delBtn = e.target.closest('.del[data-id]');
        if (!delBtn) return;
        const md = window.PhantomGoals.getCurrentMonthData();
        md.goals = md.goals.filter(x => x.id !== delBtn.dataset.id);
        saveData();
        window.PhantomGoals.renderGoals();
      });

      list.addEventListener('change', e => {
        if (e.target.type !== 'checkbox') return;
        const md = window.PhantomGoals.getCurrentMonthData();
        const goal = md.goals.find(x => x.id === e.target.dataset.id);
        if (goal) {
          goal.done = e.target.checked;
          saveData();
          window.PhantomGoals.renderGoals();
        }
      });
    }

    let retroTimer;
    document.getElementById('retroText')?.addEventListener('input', e => {
      const md = window.PhantomGoals.getCurrentMonthData();
      md.retro = e.target.value;

      clearTimeout(retroTimer);
      const hint = document.getElementById('retroSaved');
      if (hint) hint.textContent = '저장 중...';

      retroTimer = setTimeout(() => {
        saveData();
        if (hint) hint.textContent = '자동 저장됨 · ' + new Date().toLocaleTimeString('ko-KR');
      }, 700);
    });
  }
};
