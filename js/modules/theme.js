window.PhantomTheme = {
  SUN_ICON: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z"/></svg>`,
  MOON_ICON: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M11.3805 2.01977C9.91572 3.38768 9 5.33708 9 7.5C9 11.6421 12.3579 15 16.5 15C18.6629 15 20.6123 14.0843 21.9802 12.6195C21.6613 17.8537 17.3149 22 12 22C6.47715 22 2 17.5228 2 12C2 6.68514 6.14629 2.33871 11.3805 2.01977Z"/></svg>`,
  applyTheme(theme) {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) return;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeBtn.innerHTML = window.PhantomTheme.SUN_ICON;
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeBtn.innerHTML = window.PhantomTheme.MOON_ICON;
    }
  },
  initTheme() {
    const themeBtn = document.getElementById('themeToggle');
    if (!themeBtn) return;
    let savedTheme = 'light';
    try {
      savedTheme = localStorage.getItem('phantom-theme') || 'light';
    } catch (e) { }
    window.PhantomTheme.applyTheme(savedTheme);
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const nextTheme = isDark ? 'light' : 'dark';
      window.PhantomTheme.applyTheme(nextTheme);
      try {
        localStorage.setItem('phantom-theme', nextTheme);
      } catch (e) { }
    });
  }
};
