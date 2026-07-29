window.PhantomFeed = {
  activeCategory: null,
  filteredPosts: [],
  currentLoadedCount: 0,
  currentBase64Image: null,
  PAGE_SIZE: 50,

  populateComposeCategory() {
    const composeCategory = document.getElementById('composeCategory');
    if (!composeCategory) return;
    const { state } = window.PhantomStorage;
    const prev = composeCategory.value;
    composeCategory.innerHTML = '';
    state.data.categories.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.key;
      opt.textContent = c.key;
      composeCategory.appendChild(opt);
    });
    if (state.data.categories.some(c => c.key === prev)) composeCategory.value = prev;
  },

  renderCatChips() {
    const wrap = document.getElementById('catChips');
    if (!wrap) return;
    wrap.innerHTML = '';
    const { state } = window.PhantomStorage;

    const all = document.createElement('button');
    all.className = 'cat-chip' + (window.PhantomFeed.activeCategory === null ? ' active' : '');
    all.textContent = '전체';
    all.addEventListener('click', () => { window.PhantomFeed.activeCategory = null; window.PhantomFeed.renderCatChips(); window.PhantomFeed.renderFeed(); });
    wrap.appendChild(all);

    state.data.categories.forEach(c => {
      const chip = document.createElement('button');
      chip.className = 'cat-chip' + (window.PhantomFeed.activeCategory === c.key ? ' active' : '');
      chip.textContent = c.key;
      chip.addEventListener('click', () => {
        window.PhantomFeed.activeCategory = (window.PhantomFeed.activeCategory === c.key ? null : c.key);
        window.PhantomFeed.renderCatChips();
        window.PhantomFeed.renderFeed();
      });
      wrap.appendChild(chip);
    });
  },

  renderCatManageList() {
    const wrap = document.getElementById('catManageList');
    if (!wrap) return;
    wrap.innerHTML = '';
    const { state } = window.PhantomStorage;
    const { escapeHtml } = window.PhantomUtils;

    if (state.data.categories.length === 0) {
      wrap.innerHTML = `<div class="empty-state" style="padding:10px 0;">카테고리가 없어요. 새로 추가해보세요.</div>`;
      return;
    }

    state.data.categories.forEach(c => {
      const row = document.createElement('div');
      row.className = 'cat-manage-row';
      const isLast = state.data.categories.length === 1;
      row.innerHTML = `<span>${escapeHtml(c.key)}</span><button class="del" ${isLast ? 'disabled' : ''}>삭제</button>`;

      row.querySelector('.del').addEventListener('click', () => {
        if (state.data.categories.length <= 1) return;
        window.PhantomFeed.deleteCategory(c.key);
      });
      wrap.appendChild(row);
    });
  },

  addCategory() {
    const input = document.getElementById('newCatInput');
    if (!input) return;
    const name = input.value.trim();
    if (!name) return;

    const { state, saveData } = window.PhantomStorage;
    const { toast } = window.PhantomUtils;

    if (state.data.categories.some(c => c.key === name)) {
      toast('이미 있는 카테고리예요.');
      return;
    }

    state.data.categories.push({ key: name, color: '#5865f2' });
    saveData();
    input.value = '';

    window.PhantomFeed.renderCatManageList();
    window.PhantomFeed.populateComposeCategory();
    window.PhantomFeed.renderCatChips();
    window.PhantomFeed.renderFeed();
    toast('카테고리를 추가했어요.');
  },

  deleteCategory(key) {
    const { state, defaultCatKey, saveData } = window.PhantomStorage;
    const { toast } = window.PhantomUtils;

    state.data.categories = state.data.categories.filter(c => c.key !== key);
    const fallback = defaultCatKey();

    state.data.posts.forEach(p => {
      if (p.category === key) p.category = fallback;
    });

    if (window.PhantomFeed.activeCategory === key) window.PhantomFeed.activeCategory = null;

    saveData();
    window.PhantomFeed.renderCatManageList();
    window.PhantomFeed.populateComposeCategory();
    window.PhantomFeed.renderCatChips();
    window.PhantomFeed.renderFeed();
    toast('카테고리를 삭제했어요.');
  },

  renderFeed() {
    const searchInput = document.getElementById('searchInput');
    const list = document.getElementById('feedList');
    if (!searchInput || !list) return;

    const { state, defaultCatKey } = window.PhantomStorage;
    const q = searchInput.value.trim();

    let posts = [...state.data.posts].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    if (q) posts = posts.filter(p => p.content.toLowerCase().includes(q.toLowerCase()));
    if (window.PhantomFeed.activeCategory) posts = posts.filter(p => (p.category || defaultCatKey()) === window.PhantomFeed.activeCategory);

    window.PhantomFeed.filteredPosts = posts;
    window.PhantomFeed.currentLoadedCount = 0;
    list.innerHTML = '';

    if (window.PhantomFeed.filteredPosts.length === 0) {
      list.innerHTML = `<div class="empty-state">${q || window.PhantomFeed.activeCategory ? '해당하는 글이 없어요.' : '아직 쓴 글이 없어요. 오늘의 생각을 남겨보세요.'}</div>`;
      return;
    }

    window.PhantomFeed.loadMorePosts();
  },

  loadMorePosts() {
    const list = document.getElementById('feedList');
    const searchInput = document.getElementById('searchInput');
    if (!list || !searchInput) return;

    const { state, saveData } = window.PhantomStorage;
    const { highlight } = window.PhantomUtils;
    const q = searchInput.value.trim();

    if (window.PhantomFeed.currentLoadedCount >= window.PhantomFeed.filteredPosts.length) return;

    const nextBatch = window.PhantomFeed.filteredPosts.slice(window.PhantomFeed.currentLoadedCount, window.PhantomFeed.currentLoadedCount + window.PhantomFeed.PAGE_SIZE);

    nextBatch.forEach(p => {
      const d = new Date(p.date + 'T00:00:00');
      const cat = p.category || '일상';
      const timeLabel = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
      const imgHtml = p.image ? `<div class="post-img-wrap"><img src="${p.image}" alt="첨부 이미지"></div>` : '';
      const el = document.createElement('div');
      el.className = 'post-card';
      el.innerHTML = `
        <div class="meta">
          <span class="date">${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일${timeLabel ? (' · ' + timeLabel) : ''}</span>
          <span class="cat-badge">${cat}</span>
        </div>
        ${p.content ? `<div class="text">${highlight(p.content, q)}</div>` : ''}
        ${imgHtml}
        <div class="actions"><button data-id="${p.id}">삭제</button></div>`;

      el.querySelector('.actions button').addEventListener('click', () => {
        state.data.posts = state.data.posts.filter(x => x.id !== p.id);
        saveData();
        window.PhantomFeed.renderFeed();
        window.PhantomCalendar.renderCalendar();
      });
      list.appendChild(el);
    });

    window.PhantomFeed.currentLoadedCount += nextBatch.length;
  },

  initFeed() {
    const { getTodayStr, uid, toast } = window.PhantomUtils;
    const { state, defaultCatKey, saveData } = window.PhantomStorage;

    const composeText = document.getElementById('composeText');
    const composeDate = document.getElementById('composeDate');
    const composeCategory = document.getElementById('composeCategory');
    const charCount = document.getElementById('charCount');
    const composeImageInput = document.getElementById('composeImageInput');
    const imagePreviewWrap = document.getElementById('imagePreviewWrap');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.getElementById('removeImageBtn');

    if (composeDate) composeDate.value = getTodayStr();

    if (composeText && charCount) {
      composeText.addEventListener('input', () => {
        charCount.textContent = composeText.value.length;
      });
    }

    const clearImagePreview = () => {
      window.PhantomFeed.currentBase64Image = null;
      if (composeImageInput) composeImageInput.value = '';
      if (imagePreview) imagePreview.src = '';
      if (imagePreviewWrap) imagePreviewWrap.style.display = 'none';
    };

    if (composeImageInput) {
      composeImageInput.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const base64 = await window.PhantomUtils.compressImage(file);
        if (base64) {
          window.PhantomFeed.currentBase64Image = base64;
          if (imagePreview) imagePreview.src = base64;
          if (imagePreviewWrap) imagePreviewWrap.style.display = 'inline-block';
        } else {
          toast('이미지를 처리하지 못했어요.');
        }
      });
    }

    if (removeImageBtn) {
      removeImageBtn.addEventListener('click', clearImagePreview);
    }

    const postBtn = document.getElementById('postBtn');
    if (postBtn) {
      postBtn.addEventListener('click', () => {
        const content = composeText.value.trim();
        const image = window.PhantomFeed.currentBase64Image;
        if (!content && !image) return;

        const date = composeDate.value || getTodayStr();
        const category = composeCategory.value || defaultCatKey();

        state.data.posts.unshift({
          id: uid(),
          content,
          date,
          category,
          image,
          createdAt: new Date().toISOString()
        });
        saveData();

        composeText.value = '';
        charCount.textContent = '0';
        clearImagePreview();
        window.PhantomFeed.renderFeed();
        window.PhantomCalendar.renderCalendar();
        toast('게시했어요.');
      });
    }

    const manageCatsBtn = document.getElementById('manageCatsBtn');
    if (manageCatsBtn) {
      manageCatsBtn.addEventListener('click', () => {
        window.PhantomFeed.renderCatManageList();
        document.getElementById('catOverlay').classList.add('show');
      });
    }

    const catClose = document.getElementById('catClose');
    if (catClose) catClose.addEventListener('click', () => document.getElementById('catOverlay').classList.remove('show'));

    const catOverlay = document.getElementById('catOverlay');
    if (catOverlay) {
      catOverlay.addEventListener('click', e => {
        if (e.target.id === 'catOverlay') e.currentTarget.classList.remove('show');
      });
    }

    const addCatBtn = document.getElementById('addCatBtn');
    if (addCatBtn) addCatBtn.addEventListener('click', window.PhantomFeed.addCategory);

    const newCatInput = document.getElementById('newCatInput');
    if (newCatInput) {
      newCatInput.addEventListener('keydown', e => { if (e.key === 'Enter') window.PhantomFeed.addCategory(); });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', window.PhantomFeed.renderFeed);
    }

    window.addEventListener('scroll', () => {
      const feedView = document.getElementById('view-feed');
      if (!feedView || !feedView.classList.contains('active')) return;
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
        window.PhantomFeed.loadMorePosts();
      }
    });
  }
};
