import React, { useEffect, useRef, useState } from 'react';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex ?? 0);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const isOpen = initialIndex !== null && images.length > 0;

  // initialIndex가 바뀌면 (새 이미지 열릴 때) 동기화
  useEffect(() => {
    if (initialIndex !== null) {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex]);

  const goNext = () => setCurrentIndex((i) => (i + 1) % images.length);
  const goPrev = () => setCurrentIndex((i) => (i - 1 + images.length) % images.length);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, images.length]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    // 수평 스와이프만 인식 (수직 대비 수평이 더 클 때)
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const hasMultiple = images.length > 1;

  return (
    <div
      className="overlay image-modal-overlay show"
      onClick={handleOverlayClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="image-modal-content">
        <button
          type="button"
          className="image-modal-close"
          onClick={onClose}
          title="닫기"
        >
          ✕
        </button>

        {hasMultiple && (
          <button
            type="button"
            className="image-modal-nav image-modal-prev"
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            title="이전 이미지"
          >
            ‹
          </button>
        )}

        <img
          src={images[currentIndex]}
          alt={`이미지 ${currentIndex + 1} / ${images.length}`}
          key={currentIndex}
        />

        {hasMultiple && (
          <button
            type="button"
            className="image-modal-nav image-modal-next"
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            title="다음 이미지"
          >
            ›
          </button>
        )}

        {hasMultiple && (
          <div className="image-modal-dots">
            {images.map((_, i) => (
              <span
                key={i}
                className={`image-modal-dot${i === currentIndex ? ' active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
