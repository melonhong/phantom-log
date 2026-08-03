import React, { useState } from 'react';
import { Post } from '../../types';
import { highlightText } from '../../utils/textUtils';

interface PostCardProps {
  post: Post;
  isReply?: boolean;
  depth?: number;
  searchQuery: string;
  onReplySubmit: (parentId: string, content: string) => void;
  onDelete: (postId: string) => void;
  onImageClick: (src: string) => void;
  showToast: (msg: string) => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post: p,
  isReply = false,
  depth = 0,
  searchQuery,
  onReplySubmit,
  onDelete,
  onImageClick,
  showToast,
}) => {
  const [isReplyOpen, setIsReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  const d = new Date(p.date + 'T00:00:00');
  const cat = p.category || '일상';
  const timeLabel = p.createdAt
    ? new Date(p.createdAt).toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const imgs = p.images || (p.image ? [p.image] : []);
  const visualDepthClass = isReply ? ` depth-${Math.min(depth, 2)}` : '';

  const handleReplySubmit = () => {
    const content = replyText.trim();
    if (!content) {
      showToast('답글 내용을 입력해주세요.');
      return;
    }
    onReplySubmit(p.id, content);
    setReplyText('');
    setIsReplyOpen(false);
    showToast('답글을 게시했어요.');
  };

  const handleReplyCancel = () => {
    setReplyText('');
    setIsReplyOpen(false);
  };

  return (
    <div
      className={`post-card${isReply ? ' reply-card' + visualDepthClass : ''}`}
      id={`post-${p.id}`}
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
          dangerouslySetInnerHTML={{ __html: highlightText(p.content, searchQuery) }}
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
          onClick={() => setIsReplyOpen((prev) => !prev)}
        >
          답글
        </button>
        <button
          type="button"
          className="del-btn"
          onClick={() => {
            if (confirm('정말 삭제하시겠습니까?')) {
              onDelete(p.id);
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
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
          />
          <div className="reply-form-actions">
            <button type="button" className="reply-cancel-btn" onClick={handleReplyCancel}>
              취소
            </button>
            <button type="button" className="reply-submit-btn" onClick={handleReplySubmit}>
              게시
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
