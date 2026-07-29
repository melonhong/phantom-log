window.PhantomStorage = {
  STORE_KEY: 'diary-app-data',
  CATS_DEFAULT: [{ key: '일상', color: '#5865f2' }],
  state: {
    data: { posts: [], todos: [], monthly: {}, categories: [] },
    storageMode: (typeof window.storage !== 'undefined' && window.storage && typeof window.storage.get === 'function') ? 'cloud' : 'local'
  },
  defaultCatKey() {
    const categories = window.PhantomStorage.state.data.categories;
    return (categories && categories[0]) ? categories[0].key : '일상';
  },
  async storageGet(key) {
    if (window.PhantomStorage.state.storageMode === 'cloud') {
      try { return await window.storage.get(key, false); } catch (e) { return null; }
    }
    const raw = localStorage.getItem(key);
    return raw ? { value: raw } : null;
  },
  async storageSet(key, value) {
    if (window.PhantomStorage.state.storageMode === 'cloud') {
      try {
        return await window.storage.set(key, value, false);
      } catch (e) {
        window.PhantomStorage.state.storageMode = 'local';
        localStorage.setItem(key, value);
        return { value };
      }
    }
    localStorage.setItem(key, value);
    return { value };
  },
  async loadData() {
    const { STORE_KEY, CATS_DEFAULT } = window.PhantomStorage;
    try {
      const res = await window.PhantomStorage.storageGet(STORE_KEY);
      if (res && res.value) {
        window.PhantomStorage.state.data = JSON.parse(res.value);
        window.PhantomStorage.state.data.posts = window.PhantomStorage.state.data.posts || [];
        window.PhantomStorage.state.data.todos = window.PhantomStorage.state.data.todos || [];
        window.PhantomStorage.state.data.monthly = window.PhantomStorage.state.data.monthly || {};
        window.PhantomStorage.state.data.categories = (window.PhantomStorage.state.data.categories && window.PhantomStorage.state.data.categories.length)
          ? window.PhantomStorage.state.data.categories
          : JSON.parse(JSON.stringify(CATS_DEFAULT));
      } else {
        window.PhantomStorage.state.data.categories = JSON.parse(JSON.stringify(CATS_DEFAULT));
      }
    } catch (e) {
      window.PhantomStorage.state.data.categories = JSON.parse(JSON.stringify(CATS_DEFAULT));
    }
  },
  async saveData() {
    try {
      await window.PhantomStorage.storageSet(window.PhantomStorage.STORE_KEY, JSON.stringify(window.PhantomStorage.state.data));
    } catch (e) {
      window.PhantomUtils.toast('저장에 실패했어요.');
    }
  }
};
