import React, { useState, useEffect } from 'react';

interface TodoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (content: string, date: string, time: string) => void;
  defaultDate: string;
  showToast: (msg: string) => void;
}

export const TodoModal: React.FC<TodoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultDate,
  showToast
}) => {
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');

  // 모달이 열릴 때 초기값 설정
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setDate(defaultDate || new Date().toISOString().split('T')[0]);
      setTime('');
    }
  }, [isOpen, defaultDate]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!content.trim() || !date) {
      showToast('내용과 날짜를 입력해주세요.');
      return;
    }
    onSave(content.trim(), date, time);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="overlay show" onClick={handleOverlayClick}>
      <div className="modal">
        <h3>할 일 만들기</h3>
        <div className="field">
          <label>내용</label>
          <input
            type="text"
            placeholder="예: 병원 예약 확인하기"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <div className="field">
          <label>날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label>시간 (알림)</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <div className="btn-row">
          <button className="btn-cancel" onClick={onClose}>취소</button>
          <button className="btn-save" onClick={handleSave}>저장</button>
        </div>
      </div>
    </div>
  );
};
