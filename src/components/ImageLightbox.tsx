import React, { useEffect } from 'react';

interface ImageLightboxProps {
  src: string | null;
  onClose: () => void;
}

export const ImageLightbox: React.FC<ImageLightboxProps> = ({ src, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (src) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [src, onClose]);

  if (!src) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="overlay image-modal-overlay show" onClick={handleOverlayClick}>
      <div className="image-modal-content">
        <button
          type="button"
          className="image-modal-close"
          onClick={onClose}
          title="닫기"
        >
          ✕
        </button>
        <img src={src} alt="확대 이미지" />
      </div>
    </div>
  );
};
