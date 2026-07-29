window.PhantomFeed = {
  activeCategory: null,
  filteredPosts: [],
  currentLoadedCount: 0,
  currentBase64Images: [],
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
      const imgs = p.images || (p.image ? [p.image] : []);
      let imgHtml = '';
      if (imgs.length === 1) {
        imgHtml = `<div class="post-img-wrap"><img src="${imgs[0]}" alt="첨부 이미지"></div>`;
      } else if (imgs.length > 1) {
        imgHtml = `<div class="post-img-grid">${imgs.map((src, i) => `<img src="${src}" alt="첨부 이미지 ${i + 1}">`).join('')}</div>`;
      }
      return `
        <div class="post-card" id="post-${p.id}" data-id="${p.id}">
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

  scrollToPost(postId) {
    const feedTabBtn = document.querySelector('nav.tabs button[data-view="feed"]');
    if (feedTabBtn) feedTabBtn.click();

    const { state } = window.PhantomStorage;
    const post = state.data.posts.find(p => p.id === postId);
    if (!post) return;

    const searchInput = document.getElementById('searchInput');
    let needRender = false;
    if (searchInput && searchInput.value.trim() !== '') {
      searchInput.value = '';
      needRender = true;
    }
    if (window.PhantomFeed.activeCategory && post.category !== window.PhantomFeed.activeCategory) {
      window.PhantomFeed.activeCategory = null;
      window.PhantomFeed.renderCatChips();
      needRender = true;
    }

    if (needRender || !window.PhantomFeed.filteredPosts.some(p => p.id === postId)) {
      window.PhantomFeed.renderFeed();
    }

    const targetIdx = window.PhantomFeed.filteredPosts.findIndex(p => p.id === postId);
    if (targetIdx !== -1) {
      while (targetIdx >= window.PhantomFeed.currentLoadedCount && window.PhantomFeed.currentLoadedCount < window.PhantomFeed.filteredPosts.length) {
        window.PhantomFeed.loadMorePosts();
      }
    }

    setTimeout(() => {
      const cardEl = document.getElementById(`post-${postId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.classList.remove('highlight-flash');
        void cardEl.offsetWidth;
        cardEl.classList.add('highlight-flash');
        setTimeout(() => cardEl.classList.remove('highlight-flash'), 2000);
      }
    }, 100);
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
    const imagePreviewList = document.getElementById('imagePreviewList');

    if (composeDate) composeDate.value = getTodayStr();

    composeText?.addEventListener('input', () => {
      if (charCount) charCount.textContent = composeText.value.length;
    });

    const renderPreviewList = () => {
      const imgs = window.PhantomFeed.currentBase64Images || [];
      if (!imgs.length) {
        if (imagePreviewWrap) imagePreviewWrap.style.display = 'none';
        if (imagePreviewList) imagePreviewList.innerHTML = '';
        return;
      }
      if (imagePreviewWrap) imagePreviewWrap.style.display = 'block';
      if (imagePreviewList) {
        imagePreviewList.innerHTML = imgs.map((src, idx) => `
          <div class="image-preview-item">
            <img src="${src}" alt="미리보기 ${idx + 1}">
            <button type="button" class="remove-img-btn" data-index="${idx}" title="사진 삭제">✕</button>
          </div>
        `).join('');
      }
    };

    const clearImagePreview = () => {
      window.PhantomFeed.currentBase64Images = [];
      if (composeImageInput) composeImageInput.value = '';
      renderPreviewList();
    };

    composeImageInput?.addEventListener('change', async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      const current = window.PhantomFeed.currentBase64Images || [];
      const remainSpace = 5 - current.length;
      if (remainSpace <= 0) {
        toast('이미지는 최대 5장까지 첨부할 수 있습니다.');
        if (composeImageInput) composeImageInput.value = '';
        return;
      }

      const selectedFiles = files.slice(0, remainSpace);
      const compressedList = await Promise.all(
        selectedFiles.map(file => window.PhantomUtils.compressImage(file))
      );

      const validCompressed = compressedList.filter(Boolean);
      if (validCompressed.length) {
        window.PhantomFeed.currentBase64Images = [...current, ...validCompressed];
        renderPreviewList();
      } else {
        toast('이미지를 처리하지 못했어요.');
      }
      if (composeImageInput) composeImageInput.value = '';
    });

    imagePreviewList?.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-img-btn');
      if (btn) {
        const idx = parseInt(btn.dataset.index, 10);
        if (!isNaN(idx)) {
          window.PhantomFeed.currentBase64Images.splice(idx, 1);
          renderPreviewList();
        }
        return;
      }
      const img = e.target.closest('.image-preview-item img');
      if (img && img.src) {
        window.PhantomUtils.openImageModal(img.src);
      }
    });

    document.getElementById('postBtn')?.addEventListener('click', () => {
      const content = composeText.value.trim();
      const images = window.PhantomFeed.currentBase64Images || [];
      if (!content && !images.length) return;

      const date = composeDate.value || getTodayStr();
      const category = composeCategory.value || defaultCatKey();

      state.data.posts.unshift({
        id: uid(),
        content,
        date,
        category,
        images: [...images],
        image: images[0] || null,
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

    // 이벤트 위임: 피드 포스트 (이미지 클릭 및 삭제 버튼)
    document.getElementById('feedList')?.addEventListener('click', (e) => {
      const img = e.target.closest('.post-img-wrap img, .post-img-grid img');
      if (img && img.src) {
        window.PhantomUtils.openImageModal(img.src);
        return;
      }
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
