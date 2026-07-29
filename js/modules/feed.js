window.PhantomFeed = {
  activeCategory: null,
  filteredPosts: [],
  currentLoadedCount: 0,
  currentBase64Image: null,
  PAGE_SIZE: 50,

  refreshCategoryUI(msg) {
    window.PhantomFeed.renderCatManageList();
    window.PhantomFeed.populateComposeCategory();
    window.PhantomFeed.renderCatChips();
    window.PhantomFeed.renderFeed();
    if (msg) window.PhantomUtils.toast(msg);
  },

  populateComposeCategory() {
    const composeCategory = document.getElementById('composeCategory');
    if (!composeCategory) return;
    const { state } = window.PhantomStorage;
    const prev = composeCategory.value;
    composeCategory.innerHTML = state.data.categories.map(c => `<option value="${c.key}">${c.key}</option>`).join('');
    if (state.data.categories.some(c => c.key === prev)) composeCategory.value = prev;
  },

  renderCatChips() {
    const wrap = document.getElementById('catChips');
    if (!wrap) return;
    const { state } = window.PhantomStorage;
    const active = window.PhantomFeed.activeCategory;

    const chips = [{ key: '', label: '전체' }, ...state.data.categories.map(c => ({ key: c.key, label: c.key }))];
    wrap.innerHTML = chips.map(c =>
      `<button class="cat-chip${(c.key === '' && active === null) || active === c.key ? ' active' : ''}" data-key="${c.key}">${c.label}</button>`
    ).join('');
  },

  renderCatManageList() {
    const wrap = document.getElementById('catManageList');
    if (!wrap) return;
    const { state } = window.PhantomStorage;
    const { escapeHtml } = window.PhantomUtils;

    if (state.data.categories.length === 0) {
      wrap.innerHTML = `<div class="empty-state" style="padding:10px 0;">카테고리가 없어요. 새로 추가해보세요.</div>`;
      return;
    }

    const isLast = state.data.categories.length === 1;
    wrap.innerHTML = state.data.categories.map(c =>
      `<div class="cat-manage-row">
        <span>${escapeHtml(c.key)}</span>
        <button class="del" data-key="${escapeHtml(c.key)}" ${isLast ? 'disabled' : ''}>삭제</button>
      </div>`
    ).join('');
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
    window.PhantomFeed.refreshCategoryUI('카테고리를 추가했어요.');
  },

  deleteCategory(key) {
    const { state, defaultCatKey, saveData } = window.PhantomStorage;

    state.data.categories = state.data.categories.filter(c => c.key !== key);
    const fallback = defaultCatKey();

    state.data.posts.forEach(p => {
      if (p.category === key) p.category = fallback;
    });

    if (window.PhantomFeed.activeCategory === key) window.PhantomFeed.activeCategory = null;

    saveData();
    window.PhantomFeed.refreshCategoryUI('카테고리를 삭제했어요.');
  },

  renderFeed() {
    const searchInput = document.getElementById('searchInput');
    const list = document.getElementById('feedList');
    if (!searchInput || !list) return;

    const { state, defaultCatKey } = window.PhantomStorage;
    const q = searchInput.value.trim().toLowerCase();

    let posts = [...state.data.posts].sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    if (q) posts = posts.filter(p => p.content.toLowerCase().includes(q));
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

    const { highlight } = window.PhantomUtils;
    const q = searchInput.value.trim();

    if (window.PhantomFeed.currentLoadedCount >= window.PhantomFeed.filteredPosts.length) return;

    const nextBatch = window.PhantomFeed.filteredPosts.slice(window.PhantomFeed.currentLoadedCount, window.PhantomFeed.currentLoadedCount + window.PhantomFeed.PAGE_SIZE);

    const html = nextBatch.map(p => {
      const d = new Date(p.date + 'T00:00:00');
      const cat = p.category || '일상';
      const timeLabel = p.createdAt ? new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';
      const imgHtml = p.image ? `<div class="post-img-wrap"><img src="${p.image}" alt="첨부 이미지"></div>` : '';
      return `
        <div class="post-card">
          <div class="meta">
            <span class="date">${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일${timeLabel ? (' · ' + timeLabel) : ''}</span>
            <span class="cat-badge">${cat}</span>
          </div>
          ${p.content ? `<div class="text">${highlight(p.content, q)}</div>` : ''}
          ${imgHtml}
          <div class="actions"><button data-id="${p.id}">삭제</button></div>
        </div>`;
    }).join('');

    list.insertAdjacentHTML('beforeend', html);
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

    if (composeDate) composeDate.value = getTodayStr();

    composeText?.addEventListener('input', () => {
      if (charCount) charCount.textContent = composeText.value.length;
    });

    const clearImagePreview = () => {
      window.PhantomFeed.currentBase64Image = null;
      if (composeImageInput) composeImageInput.value = '';
      if (imagePreview) imagePreview.src = '';
      if (imagePreviewWrap) imagePreviewWrap.style.display = 'none';
    };

    composeImageInput?.addEventListener('change', async (e) => {
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

    document.getElementById('removeImageBtn')?.addEventListener('click', clearImagePreview);

    document.getElementById('postBtn')?.addEventListener('click', () => {
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
      if (charCount) charCount.textContent = '0';
      clearImagePreview();
      window.PhantomFeed.renderFeed();
      window.PhantomCalendar.renderCalendar();
      toast('게시했어요.');
    });

    // 이벤트 위임: 피드 포스트 삭제 버튼
    document.getElementById('feedList')?.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.actions button[data-id]');
      if (!delBtn) return;
      const id = delBtn.dataset.id;
      state.data.posts = state.data.posts.filter(x => x.id !== id);
      saveData();
      window.PhantomFeed.renderFeed();
      window.PhantomCalendar.renderCalendar();
    });

    // 이벤트 위임: 카테고리 칩 선택
    document.getElementById('catChips')?.addEventListener('click', (e) => {
      const chip = e.target.closest('.cat-chip');
      if (!chip) return;
      const rawKey = chip.dataset.key;
      const key = (rawKey === '' || rawKey === undefined) ? null : rawKey;
      window.PhantomFeed.activeCategory = (window.PhantomFeed.activeCategory === key ? null : key);
      window.PhantomFeed.renderCatChips();
      window.PhantomFeed.renderFeed();
    });

    // 이벤트 위임: 카테고리 관리 삭제 버튼
    document.getElementById('catManageList')?.addEventListener('click', (e) => {
      const delBtn = e.target.closest('.del[data-key]');
      if (!delBtn || delBtn.disabled) return;
      if (state.data.categories.length <= 1) return;
      window.PhantomFeed.deleteCategory(delBtn.dataset.key);
    });

    document.getElementById('manageCatsBtn')?.addEventListener('click', () => {
      window.PhantomFeed.renderCatManageList();
      document.getElementById('catOverlay')?.classList.add('show');
    });

    document.getElementById('catClose')?.addEventListener('click', () => document.getElementById('catOverlay')?.classList.remove('show'));
    document.getElementById('catOverlay')?.addEventListener('click', e => {
      if (e.target.id === 'catOverlay') e.currentTarget.classList.remove('show');
    });

    document.getElementById('addCatBtn')?.addEventListener('click', window.PhantomFeed.addCategory);
    document.getElementById('newCatInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') window.PhantomFeed.addCategory(); });
    document.getElementById('searchInput')?.addEventListener('input', window.PhantomFeed.renderFeed);

    window.addEventListener('scroll', () => {
      const feedView = document.getElementById('view-feed');
      if (!feedView || !feedView.classList.contains('active')) return;
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
        window.PhantomFeed.loadMorePosts();
      }
    });
  }
};
