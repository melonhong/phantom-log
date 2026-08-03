import React, { useState, useRef, useEffect } from 'react';
import { Category } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface ComposeBoxProps {
  categories: Category[];
  onPost: (content: string, date: string, category: string, images: string[]) => void;
  onImageClick: (images: string[], index: number) => void;
  showToast: (msg: string) => void;
}

export const ComposeBox: React.FC<ComposeBoxProps> = ({
  categories,
  onPost,
  onImageClick,
  showToast,
}) => {
  const [composeText, setComposeText] = useState('');
  const [composeDate, setComposeDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
  const [composeCategory, setComposeCategory] = useState('');
  const [currentBase64Images, setCurrentBase64Images] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 초기 카테고리 값 바인딩
  useEffect(() => {
    if (categories.length > 0 && !composeCategory) {
      setComposeCategory(categories[0].key);
    }
  }, [categories]);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainSpace = 5 - currentBase64Images.length;
    if (remainSpace <= 0) {
      showToast('이미지는 최대 5장까지 첨부할 수 있습니다.');
      e.target.value = '';
      return;
    }

    setIsCompressing(true);
    const selectedFiles = files.slice(0, remainSpace);
    try {
      const compressedList = await Promise.all(selectedFiles.map((file) => compressImage(file)));
      const validCompressed = compressedList.filter((src): src is string => src !== null);
      if (validCompressed.length) {
        setCurrentBase64Images((prev) => [...prev, ...validCompressed]);
      } else {
        showToast('이미지를 처리하지 못했어요.');
      }
    } catch {
      showToast('이미지 압축 중 오류가 발생했습니다.');
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setCurrentBase64Images((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePost = () => {
    const content = composeText.trim();
    if (!content && currentBase64Images.length === 0) return;

    onPost(
      content,
      composeDate || new Date().toISOString().split('T')[0],
      composeCategory || (categories[0]?.key ?? '일상'),
      currentBase64Images
    );

    setComposeText('');
    setCurrentBase64Images([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('게시했어요.');
  };

  return (
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
                <img src={src} alt={`미리보기 ${idx + 1}`} onClick={() => onImageClick(currentBase64Images, idx)} />
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
            {categories.map((c) => (
              <option value={c.key} key={`opt-${c.key}`}>
                {c.key}
              </option>
            ))}
          </select>
          <label htmlFor="composeImageInput" className="img-upload-btn" title="사진 첨부">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
          {isCompressing && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>압축 중...</span>
          )}
        </div>
        <div className="foot-row">
          <span className="char">{composeText.length}</span>
          <button className="post-btn" onClick={handlePost}>
            게시
          </button>
        </div>
      </div>
    </div>
  );
};
