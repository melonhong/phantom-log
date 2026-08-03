import React from 'react';
import { Category } from '../../types';

interface FeedFilterProps {
  categories: Category[];
  searchQuery: string;
  searchDate: string;
  activeCategory: string | null;
  onSearchQueryChange: (q: string) => void;
  onSearchDateChange: (d: string) => void;
  onActiveCategoryChange: (c: string | null) => void;
  onManageCategories: () => void;
}

export const FeedFilter: React.FC<FeedFilterProps> = ({
  categories,
  searchQuery,
  searchDate,
  activeCategory,
  onSearchQueryChange,
  onSearchDateChange,
  onActiveCategoryChange,
  onManageCategories,
}) => {
  return (
    <>
      {/* 검색 및 필터 바 */}
      <div className="search-row">
        <div className="search-box">
          <span className="icon">⌕</span>
          <input
            type="text"
            placeholder="내가 쓴 글 검색..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>
        <div className="search-date-wrap">
          <input
            type="date"
            title="날짜별 글 검색"
            value={searchDate}
            onChange={(e) => onSearchDateChange(e.target.value)}
          />
          {searchDate && (
            <button
              type="button"
              className="clear-date-btn"
              onClick={() => onSearchDateChange('')}
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
          onClick={() => onActiveCategoryChange(null)}
        >
          전체
        </button>
        {categories.map((c) => (
          <button
            className={`cat-chip ${activeCategory === c.key ? 'active' : ''}`}
            key={`chip-${c.key}`}
            onClick={() => onActiveCategoryChange(activeCategory === c.key ? null : c.key)}
          >
            {c.key}
          </button>
        ))}
      </div>
      <button className="manage-btn" onClick={onManageCategories}>
        카테고리 관리
      </button>
    </>
  );
};
