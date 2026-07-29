window.PhantomNotification = {
  checkReminders() {
    const { fmtDate, pad, toast } = window.PhantomUtils;
    const { state, saveData } = window.PhantomStorage;

    const now = new Date();
    const nowStr = fmtDate(now);
    const nowHM = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    let changed = false;

    state.data.todos.forEach(t => {
      if (!t.reminded && !t.done && t.date === nowStr && t.time && t.time <= nowHM) {
        t.reminded = true;
        changed = true;
        const msg = `${t.content}`;
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('팬텀 노트 할 일 알림', { body: t.content });
        }
        toast(msg);
      }
    });
    if (changed) saveData();
  },

  initNotification() {
    const { toast } = window.PhantomUtils;

    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) {
      notifBtn.addEventListener('click', async () => {
        if (!('Notification' in window)) {
          toast('이 브라우저는 알림을 지원하지 않아요.');
          return;
        }
        const perm = await Notification.requestPermission();
        toast(perm === 'granted' ? '알림이 켜졌어요.' : '알림 권한이 거부됐어요.');
      });
    }

    setInterval(window.PhantomNotification.checkReminders, 20000);
  }
};
