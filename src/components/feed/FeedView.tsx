import React, { useState, useEffect } from 'react';
import { AppState, Post } from '../../types';
import { CategoryModal } from '../CategoryModal';
import { ComposeBox } from './ComposeBox';
import { FeedFilter } from './FeedFilter';
import { PostCard } from './PostCard';

interface FeedViewProps {
  data: AppState;
  addPost: (content: string, date: string, category: string, images: string[]) => void;
  addReply: (parentId: string, content: string) => void;
  deletePostAndReplies: (postId: string) => void;
  addCategory: (name: string) => boolean;
  deleteCategory: (key: string) => void;
  searchPostId: string | null;
  clearSearchPostId: () => void;
  onImageClick: (images: string[], index: number) => void;
  showToast: (msg: string) => void;
}

const PAGE_SIZE = 50;

export const FeedView: React.FC<FeedViewProps> = ({
  data,
  addPost,
  addReply,
  deletePostAndReplies,
  addCategory,
  deleteCategory,
  searchPostId,
  clearSearchPostId,
  onImageClick,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loadedLimit, setLoadedLimit] = useState(PAGE_SIZE);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // 외부 스크롤 트리거 처리 (searchPostId가 활성화되었을 때)
  useEffect(() => {
    if (!searchPostId) return;

    // 1. 필터 초기화
    setSearchQuery('');
    setSearchDate('');
    setActiveCategory(null);

    // 2. 해당 포스트가 노출될 때까지 한도(Limit) 늘리기
    const allPosts = data.posts;
    const post = allPosts.find((p) => p.id === searchPostId);
    if (!post) {
      clearSearchPostId();
      return;
    }

    // 루트 포스트 또는 자손인지 찾기
    const findRootPost = (pId: string): Post | undefined => {
      const cur = allPosts.find((x) => x.id === pId);
      if (!cur) return undefined;
      if (!cur.parentId || !allPosts.some((x) => x.id === cur.parentId)) return cur;
      return findRootPost(cur.parentId);
    };

    const root = findRootPost(searchPostId);
    if (!root) {
      clearSearchPostId();
      return;
    }

    // 루트 포스트의 정렬 순서 기준 인덱스 계산
    const rootPosts = allPosts
      .filter((p) => !p.parentId || !allPosts.some((x) => x.id === p.parentId))
      .sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });

    const targetIdx = rootPosts.findIndex((r) => r.id === root.id);
    if (targetIdx !== -1 && targetIdx >= loadedLimit) {
      setLoadedLimit(Math.ceil((targetIdx + 1) / PAGE_SIZE) * PAGE_SIZE);
    }

    // 3. 렌더링된 요소로 스크롤 이동 및 flash 하이라이트 효과 적용
    const timer = setTimeout(() => {
      const cardEl = document.getElementById(`post-${searchPostId}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        cardEl.classList.remove('highlight-flash');
        void cardEl.offsetWidth; // trigger reflow
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
        setLoadedLimit((prev) => prev + PAGE_SIZE);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ---- 필터링 및 스레드 목록 연산 ----

  const defaultCatKey = data.categories[0]?.key ?? '일상';

  const matchesFilter = (p: Post) => {
    if (searchDate && p.date !== searchDate) return false;
    if (searchQuery.trim() && !p.content.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    if (activeCategory && (p.category || defaultCatKey) !== activeCategory) return false;
    return true;
  };

  const hasMatchingDescendant = (post: Post, allPosts: Post[]): boolean => {
    const children = allPosts.filter((r) => r.parentId === post.id);
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
        .filter((r) => r.parentId === post.id)
        .sort(
          (a, b) =>
            new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
        );
      for (const child of children) {
        list.push({ post: child, depth });
        traverse(child, depth + 1);
      }
    };
    traverse(rootPost, 1);
    return list;
  };

  const allPosts = data.posts;
  let rootPosts = allPosts
    .filter((p) => !p.parentId || !allPosts.some((x) => x.id === p.parentId))
    .sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  if (searchDate || searchQuery.trim() || activeCategory) {
    rootPosts = rootPosts.filter(
      (root) => matchesFilter(root) || hasMatchingDescendant(root, allPosts)
    );
  }

  const visibleRootPosts = rootPosts.slice(0, loadedLimit);

  return (
    <section className="view active" id="view-feed">
      {/* 글 작성 영역 */}
      <ComposeBox
        categories={data.categories}
        onPost={addPost}
        onImageClick={onImageClick}
        showToast={showToast}
      />

      {/* 검색 + 카테고리 필터 */}
      <FeedFilter
        categories={data.categories}
        searchQuery={searchQuery}
        searchDate={searchDate}
        activeCategory={activeCategory}
        onSearchQueryChange={setSearchQuery}
        onSearchDateChange={setSearchDate}
        onActiveCategoryChange={setActiveCategory}
        onManageCategories={() => setIsCategoryModalOpen(true)}
      />

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

            const rootCard = (
              <PostCard
                key={`card-${rootPost.id}`}
                post={rootPost}
                searchQuery={searchQuery}
                onReplySubmit={addReply}
                onDelete={deletePostAndReplies}
                onImageClick={onImageClick}
                showToast={showToast}
              />
            );

            if (replies.length === 0) {
              return <div key={`thread-group-${rootPost.id}`}>{rootCard}</div>;
            }

            return (
              <div className="thread-group" key={`thread-group-${rootPost.id}`}>
                {rootCard}
                <div className="replies-container">
                  {replies.map((item) => (
                    <PostCard
                      key={`card-${item.post.id}`}
                      post={item.post}
                      isReply
                      depth={item.depth}
                      searchQuery={searchQuery}
                      onReplySubmit={addReply}
                      onDelete={deletePostAndReplies}
                      onImageClick={onImageClick}
                      showToast={showToast}
                    />
                  ))}
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
        showToast={showToast}
      />
    </section>
  );
};
