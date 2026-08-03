import React, { useState } from 'react';
import { Category } from '../types';

interface CategoryModalProps {
  isOpen: boolean;
  categories: Category[];
  onClose: () => void;
  onAdd: (name: string) => boolean;
  onDelete: (key: string) => void;
  showToast: (msg: string) => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  categories,
  onClose,
  onAdd,
  onDelete,
  showToast
}) => {
  const [newCatName, setNewCatName] = useState('');

  if (!isOpen) return null;

  const handleAdd = () => {
    const name = newCatName.trim();
    if (!name) return;

    const success = onAdd(name);
    if (success) {
      setNewCatName('');
    } else {
      showToast('이미 있는 카테고리예요.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const isLast = categories.length === 1;

  return (
    <div className="overlay show" onClick={handleOverlayClick}>
      <div className="modal">
        <h3>카테고리 관리</h3>
        <div style={{ marginBottom: '14px' }}>
          {categories.length === 0 ? (
            <div className="empty-state" style={{ padding: '10px 0' }}>
              카테고리가 없어요. 새로 추가해보세요.
            </div>
          ) : (
            categories.map((c) => (
              <div className="cat-manage-row" key={c.key}>
                <span>{c.key}</span>
                <button
                  className="del"
                  disabled={isLast}
                  onClick={() => onDelete(c.key)}
                >
                  삭제
                </button>
              </div>
            ))
          )}
        </div>
        <div className="add-goal">
          <input
            type="text"
            placeholder="새 카테고리 이름"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleAdd}>추가</button>
        </div>
        <div className="btn-row">
          <button className="btn-cancel" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
};
