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

  renderGoals() {
    const goalsTitle = document.getElementById('goalsTitle');
    const list = document.getElementById('goalsList');
    const retroText = document.getElementById('retroText');
    if (!goalsTitle || !list) return;

    const y = window.PhantomGoals.goalsCursor.getFullYear(), m = window.PhantomGoals.goalsCursor.getMonth();
    goalsTitle.textContent = `${y}년 ${m + 1}월`;
    const key = window.PhantomGoals.monthKey(window.PhantomGoals.goalsCursor);
    const md = window.PhantomGoals.ensureMonth(key);

    const { state, saveData } = window.PhantomStorage;
    const { escapeHtml } = window.PhantomUtils;

    list.innerHTML = '';

    if (md.goals.length === 0) {
      list.innerHTML = `<div class="empty-state" style="padding:16px 0;">이번 달 목표를 추가해보세요.</div>`;
    }

    md.goals.forEach(g => {
      const row = document.createElement('div');
      row.className = 'goal-row' + (g.done ? ' done' : '');
      row.innerHTML = `
        <input type="checkbox" ${g.done ? 'checked' : ''}>
        <span>${escapeHtml(g.text)}</span>
        <button class="del">✕</button>`;

      row.querySelector('input').addEventListener('change', e => {
        g.done = e.target.checked;
        saveData();
        window.PhantomGoals.renderGoals();
      });

      row.querySelector('.del').addEventListener('click', () => {
        md.goals = md.goals.filter(x => x.id !== g.id);
        saveData();
        window.PhantomGoals.renderGoals();
      });
      list.appendChild(row);
    });

    if (retroText) retroText.value = md.retro || '';
  },

  addGoal() {
    const input = document.getElementById('newGoalInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const { uid } = window.PhantomUtils;
    const { saveData } = window.PhantomStorage;

    const key = window.PhantomGoals.monthKey(window.PhantomGoals.goalsCursor);
    const md = window.PhantomGoals.ensureMonth(key);

    md.goals.push({ id: uid(), text, done: false });
    saveData();
    input.value = '';
    window.PhantomGoals.renderGoals();
  },

  initGoals() {
    const { saveData } = window.PhantomStorage;

    const addGoalBtn = document.getElementById('addGoalBtn');
    if (addGoalBtn) addGoalBtn.addEventListener('click', window.PhantomGoals.addGoal);

    const newGoalInput = document.getElementById('newGoalInput');
    if (newGoalInput) {
      newGoalInput.addEventListener('keydown', e => { if (e.key === 'Enter') window.PhantomGoals.addGoal(); });
    }

    let retroTimer;
    const retroText = document.getElementById('retroText');
    if (retroText) {
      retroText.addEventListener('input', e => {
        const key = window.PhantomGoals.monthKey(window.PhantomGoals.goalsCursor);
        const md = window.PhantomGoals.ensureMonth(key);
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

    const prevMonthG = document.getElementById('prevMonthG');
    if (prevMonthG) prevMonthG.addEventListener('click', () => { window.PhantomGoals.goalsCursor.setMonth(window.PhantomGoals.goalsCursor.getMonth() - 1); window.PhantomGoals.renderGoals(); });

    const nextMonthG = document.getElementById('nextMonthG');
    if (nextMonthG) nextMonthG.addEventListener('click', () => { window.PhantomGoals.goalsCursor.setMonth(window.PhantomGoals.goalsCursor.getMonth() + 1); window.PhantomGoals.renderGoals(); });
  }
};
