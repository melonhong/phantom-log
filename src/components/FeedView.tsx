import React, { useState, useEffect, useRef } from 'react';
import { AppState, Post, Category } from '../types';
import { CategoryModal } from './CategoryModal';

interface FeedViewProps {
  data: AppState;
  addPost: (content: string, date: string, category: string, images: string[]) => void;
  addReply: (parentId: string, content: string) => void;
  deletePostAndReplies: (postId: string) => void;
  addCategory: (name: string) => boolean;
  deleteCategory: (key: string) => void;
  searchPostId: string | null;
  clearSearchPostId: () => void;
  onImageClick: (src: string) => void;
}

const PAGE_SIZE = 50;

const compressImage = (file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) return resolve(null);
    const reader = new FileReader();
    reader.onerror = () => resolve(null);
    reader.onload = e => {
      const img = new Image();
      img.onerror = () => resolve(null);
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      if (e.target?.result) img.src = e.target.result as string;
    };
    reader.readAsDataURL(file);
  });
};

const escapeHtml = (s: string) => {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c] || c));
};

const highlightText = (text: string, q: string) => {
  const esc = escapeHtml(text);
  if (!q.trim()) return esc;
  const escQ = escapeHtml(q.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return esc.replace(new RegExp(escQ, 'gi'), m => `<mark>${m}</mark>`);
};

export const FeedView: React.FC<FeedViewProps> = ({
  data,
  addPost,
  addReply,
  deletePostAndReplies,
  addCategory,
  deleteCategory,
  searchPostId,
  clearSearchPostId,
  onImageClick
}) => {
  const [composeText, setComposeText] = useState('');
  const [composeDate, setComposeDate] = useState('');
  const [composeCategory, setComposeCategory] = useState('');
  const [currentBase64Images, setCurrentBase64Images] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [loadedLimit, setLoadedLimit] = useState(PAGE_SIZE);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // 각 답글 입력창 상태 관리 (postId -> content)
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  // 답글 입력창 토글 상태 관리 (postId -> boolean)
  const [replyToggles, setReplyToggles] = useState<Record<string, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 초기 날짜 및 카테고리 값 바인딩
  useEffect(() => {
    setComposeDate(new Date().toISOString().split('T')[0]);
    if (data.categories.length > 0) {
      setComposeCategory(data.categories[0].key);
    }
  }, [data.categories]);

  // 외부 스크롤 트리거 처리 (searchPostId가 활성화되었을 때)
  useEffect(() => {
    if (!searchPostId) return;

    // 1. 필터 초기화
    setSearchQuery('');
    setSearchDate('');
    setActiveCategory(null);

    // 2. 해당 포스트가 노출될 때까지 한도(Limit) 늘리기
    const allPosts = data.posts;
    const post = allPosts.find(p => p.id === searchPostId);
    if (!post) {
      clearSearchPostId();
      return;
    }

    // 루트 포스트 또는 자손인지 찾기
    const findRootPost = (pId: string): Post | undefined => {
      const cur = allPosts.find(x => x.id === pId);
      if (!cur) return undefined;
      if (!cur.parentId || !allPosts.some(x => x.id === cur.parentId)) return cur;
      return findRootPost(cur.parentId);
    };

    const root = findRootPost(searchPostId);
    if (!root) {
      clearSearchPostId();
      return;
    }

    // 루트 포스트가 필터링된 배열에서 몇 번째 인덱스인지 계산
    // 필터가 해제된 정렬 순서대로 정렬
    const rootPosts = allPosts.filter(p => !p.parentId || !allPosts.some(x => x.id === p.parentId)).sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const targetIdx = rootPosts.findIndex(r => r.id === root.id);
    if (targetIdx !== -1) {
      // 타겟 인덱스가 포함되도록 한도 상향
      if (targetIdx >= loadedLimit) {
        setLoadedLimit(Math.ceil((targetIdx + 1) / PAGE_SIZE) * PAGE_SIZE);
      }
    }

    // 3. 렌더링된 요소로 스크롤 이동 및 flash 하이라이트 효과 적용
    const timer = setTimeout(() => {
      const cardEl = document.getElementById(`post-${searchPostId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.classList.remove('highlight-flash');
        // trigger reflow
        void cardEl.offsetWidth;
        cardEl.classList.add('highlight-flash');
        setTimeout(() => {
          cardEl.classList.remove('highlight-flash');
        }, 2000);
      }
      clearSearchPostId();
    }, 150);

    return () => clearTimeout(timer);
  }, [searchPostId, data.posts, loadedLimit, clearSearchPostId]);

  // 무한 스크롤 이벤트 바인딩
  useEffect(() => {
    const handleScroll = () => {
      const feedView = document.getElementById('view-feed');
      if (!feedView || !feedView.classList.contains('active')) return;
      if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 300) {
        setLoadedLimit(prev => prev + PAGE_SIZE);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 이미지 업로드 체인지 핸들러
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainSpace = 5 - currentBase64Images.length;
    if (remainSpace <= 0) {
      alert('이미지는 최대 5장까지 첨부할 수 있습니다.');
      e.target.value = '';
      return;
    }

    setIsCompressing(true);
    const selectedFiles = files.slice(0, remainSpace);
    try {
      const compressedList = await Promise.all(
        selectedFiles.map(file => compressImage(file))
      );
      const validCompressed = compressedList.filter((src): src is string => src !== null);
      if (validCompressed.length) {
        setCurrentBase64Images(prev => [...prev, ...validCompressed]);
      } else {
        alert('이미지를 처리하지 못했어요.');
      }
    } catch (err) {
      alert('이미지 압축 중 오류가 발생했습니다.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setCurrentBase64Images(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePost = () => {
    const content = composeText.trim();
    if (!content && currentBase64Images.length === 0) return;

    addPost(
      content,
      composeDate || new Date().toISOString().split('T')[0],
      composeCategory || (data.categories[0] ? data.categories[0].key : '일상'),
      currentBase64Images
    );

    // 초기화
    setComposeText('');
    setCurrentBase64Images([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    alert('게시했어요.');
  };

  // 답글 게시 핸들러
  const handleReplySubmit = (parentId: string) => {
    const content = (replyInputs[parentId] || '').trim();
    if (!content) {
      alert('답글 내용을 입력해주세요.');
      return;
    }
    addReply(parentId, content);
    setReplyInputs(prev => ({ ...prev, [parentId]: '' }));
    setReplyToggles(prev => ({ ...prev, [parentId]: false }));
    alert('답글을 게시했어요.');
  };

  // 답글 입력 취소
  const handleReplyCancel = (parentId: string) => {
    setReplyInputs(prev => ({ ...prev, [parentId]: '' }));
    setReplyToggles(prev => ({ ...prev, [parentId]: false }));
  };

  // 필터링 및 스레드 목록 연산
  const defaultCatKey = data.categories[0] ? data.categories[0].key : '일상';

  const matchesFilter = (p: Post) => {
    if (searchDate && p.date !== searchDate) return false;
    if (searchQuery.trim() && !p.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeCategory && (p.category || defaultCatKey) !== activeCategory) return false;
    return true;
  };

  // 특정 포스트의 하위 자손 중 하나라도 필터에 매칭되는지 확인
  const hasMatchingDescendant = (post: Post, allPosts: Post[]): boolean => {
    const children = allPosts.filter(r => r.parentId === post.id);
    for (const child of children) {
      if (matchesFilter(child)) return true;
      if (hasMatchingDescendant(child, allPosts)) return true;
    }
    return false;
  };

  const getThreadReplies = (rootPost: Post, allPosts: Post[]) => {
    const list: { post: Post; depth: number }[] = [];
    const traverse = (post: Post, depth: number) => {
      const children = allPosts
        .filter(r => r.parentId === post.id)
        .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      for (const child of children) {
        list.push({ post: child, depth });
        traverse(child, depth + 1);
      }
    };
    traverse(rootPost, 1);
    return list;
  };

  const allPosts = data.posts;
  // 루트 포스트 필터링 및 날짜순 정렬
  let rootPosts = allPosts.filter(p => !p.parentId || !allPosts.some(x => x.id === p.parentId)).sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  // 필터 활성화 시 필터링 처리
  if (searchDate || searchQuery.trim() || activeCategory) {
    rootPosts = rootPosts.filter(root => {
      if (matchesFilter(root)) return true;
      return hasMatchingDescendant(root, allPosts);
    });
  }

  // 무한 스크롤 슬라이스
  const visibleRootPosts = rootPosts.slice(0, loadedLimit);

  return (
    <section className="view active" id="view-feed">
      {/* 글 작성 영역 */}
      <div className="compose">
        <textarea
          placeholder="무슨 생각을 하고 있나요?"
          value={composeText}
          onChange={(e) => setComposeText(e.target.value)}
        />
        {currentBase64Images.length > 0 && (
          <div className="image-preview-wrap" style={{ display: 'block' }}>
            <div className="image-preview-list">
              {currentBase64Images.map((src, idx) => (
                <div className="image-preview-item" key={`preview-${idx}`}>
                  <img src={src} alt={`미리보기 ${idx + 1}`} onClick={() => onImageClick(src)} />
                  <button
                    type="button"
                    className="remove-img-btn"
                    onClick={() => removeImage(idx)}
                    title="사진 삭제"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="foot">
          <div className="foot-row">
            <input
              type="date"
              value={composeDate}
              onChange={(e) => setComposeDate(e.target.value)}
            />
            <select
              value={composeCategory}
              onChange={(e) => setComposeCategory(e.target.value)}
            >
              {data.categories.map((c) => (
                <option value={c.key} key={`opt-${c.key}`}>
                  {c.key}
                </option>
              ))}
            </select>
            <label htmlFor="composeImageInput" className="img-upload-btn" title="사진 첨부">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </label>
            <input
              type="file"
              id="composeImageInput"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleImageChange}
              style={{ display: 'none' }}
            />
            {isCompressing && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>압축 중...</span>}
          </div>
          <div className="foot-row">
            <span className="char">{composeText.length}</span>
            <button className="post-btn" onClick={handlePost}>
              게시
            </button>
          </div>
        </div>
      </div>

      {/* 검색 및 필터 바 */}
      <div className="search-row">
        <div className="search-box">
          <span className="icon">⌕</span>
          <input
            type="text"
            placeholder="내가 쓴 글 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="search-date-wrap">
          <input
            type="date"
            title="날짜별 글 검색"
            value={searchDate}
            onChange={(e) => setSearchDate(e.target.value)}
          />
          {searchDate && (
            <button
              type="button"
              className="clear-date-btn"
              onClick={() => setSearchDate('')}
              title="날짜 필터 초기화"
              style={{ display: 'inline-flex' }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 카테고리 칩 목록 */}
      <div className="cat-chips">
        <button
          className={`cat-chip ${activeCategory === null ? 'active' : ''}`}
          onClick={() => setActiveCategory(null)}
        >
          전체
        </button>
        {data.categories.map((c) => (
          <button
            className={`cat-chip ${activeCategory === c.key ? 'active' : ''}`}
            key={`chip-${c.key}`}
            onClick={() => setActiveCategory(prev => prev === c.key ? null : c.key)}
          >
            {c.key}
          </button>
        ))}
      </div>
      <button className="manage-btn" onClick={() => setIsCategoryModalOpen(true)}>
        카테고리 관리
      </button>

      {/* 피드 목록 */}
      <div id="feedList">
        {rootPosts.length === 0 ? (
          <div className="empty-state">
            {searchQuery || searchDate || activeCategory
              ? '해당하는 글이 없어요.'
              : '아직 쓴 글이 없어요. 오늘의 생각을 남겨보세요.'}
          </div>
        ) : (
          visibleRootPosts.map((rootPost) => {
            const replies = getThreadReplies(rootPost, allPosts);

            // 카드 단일 렌더러 함수
            const renderCard = (p: Post, isReply = false, depth = 0) => {
              const d = new Date(p.date + 'T00:00:00');
              const cat = p.category || '일상';
              const timeLabel = p.createdAt
                ? new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                : '';
              const imgs = p.images || (p.image ? [p.image] : []);

              const visualDepthClass = isReply ? ` depth-${Math.min(depth, 2)}` : '';
              const isReplyOpen = !!replyToggles[p.id];
              const replyVal = replyInputs[p.id] || '';

              return (
                <div
                  className={`post-card${isReply ? ' reply-card' + visualDepthClass : ''}`}
                  id={`post-${p.id}`}
                  key={`card-${p.id}`}
                >
                  <div className="meta">
                    <span className="date">
                      {d.getFullYear()}년 {d.getMonth() + 1}월 {d.getDate()}일
                      {timeLabel && ` · ${timeLabel}`}
                    </span>
                    <span className="cat-badge">{cat}</span>
                  </div>
                  {p.content && (
                    <div
                      className="text"
                      dangerouslySetInnerHTML={{
                        __html: highlightText(p.content, searchQuery)
                      }}
                    />
                  )}
                  {imgs.length === 1 && (
                    <div className="post-img-wrap">
                      <img src={imgs[0]} alt="첨부 이미지" onClick={() => onImageClick(imgs[0])} />
                    </div>
                  )}
                  {imgs.length > 1 && (
                    <div className="post-img-grid">
                      {imgs.map((src, i) => (
                        <img
                          src={src}
                          alt={`첨부 이미지 ${i + 1}`}
                          key={`img-${p.id}-${i}`}
                          onClick={() => onImageClick(src)}
                        />
                      ))}
                    </div>
                  )}
                  <div className="actions">
                    <button
                      type="button"
                      className="reply-btn"
                      onClick={() => setReplyToggles(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                    >
                      답글
                    </button>
                    <button
                      type="button"
                      className="del-btn"
                      onClick={() => {
                        if (confirm('정말 삭제하시겠습니까?')) {
                          deletePostAndReplies(p.id);
                        }
                      }}
                    >
                      삭제
                    </button>
                  </div>

                  {isReplyOpen && (
                    <div className="reply-form" style={{ display: 'block' }}>
                      <textarea
                        className="reply-input"
                        placeholder="답글을 입력하세요..."
                        value={replyVal}
                        onChange={(e) => setReplyInputs(prev => ({ ...prev, [p.id]: e.target.value }))}
                      />
                      <div className="reply-form-actions">
                        <button
                          type="button"
                          className="reply-cancel-btn"
                          onClick={() => handleReplyCancel(p.id)}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          className="reply-submit-btn"
                          onClick={() => handleReplySubmit(p.id)}
                        >
                          게시
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            };

            const rootHtml = renderCard(rootPost, false, 0);

            if (replies.length === 0) {
              return <div key={`thread-group-${rootPost.id}`}>{rootHtml}</div>;
            }

            return (
              <div className="thread-group" key={`thread-group-${rootPost.id}`}>
                {rootHtml}
                <div className="replies-container">
                  {replies.map(item => renderCard(item.post, true, item.depth))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 카테고리 관리 모달 */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        categories={data.categories}
        onClose={() => setIsCategoryModalOpen(false)}
        onAdd={addCategory}
        onDelete={deleteCategory}
      />
    </section>
  );
};
