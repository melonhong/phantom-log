import React, { useState, useEffect, useRef } from 'react';
import { AppState } from '../types';

interface GoalsViewProps {
  data: AppState;
  addGoal: (monthKey: string, text: string) => void;
  toggleGoal: (monthKey: string, goalId: string, done: boolean) => void;
  deleteGoal: (monthKey: string, goalId: string) => void;
  saveRetro: (monthKey: string, retroText: string) => void;
}

export const GoalsView: React.FC<GoalsViewProps> = ({
  data,
  addGoal,
  toggleGoal,
  deleteGoal,
  saveRetro
}) => {
  const [goalsCursor, setGoalsCursor] = useState<Date>(new Date());
  const [newGoalInput, setNewGoalInput] = useState('');
  const [retroText, setRetroText] = useState('');
  const [hintText, setHintText] = useState('자동 저장됨');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getMonthKey = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const monthKey = getMonthKey(goalsCursor);
  const monthData = data.monthly[monthKey] || { goals: [], retro: '' };

  const changeMonth = (offset: number) => {
    const nextDate = new Date(goalsCursor);
    nextDate.setMonth(nextDate.getMonth() + offset);
    setGoalsCursor(nextDate);
  };

  // 월이 바뀔 때 로컬 상태 동기화 및 이전 타이머 클리어
  useEffect(() => {
    setRetroText(monthData.retro || '');
    setHintText('자동 저장됨');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, [monthKey, monthData.retro]);

  // 언마운트 시 타이머 클리어
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleAddGoal = () => {
    const text = newGoalInput.trim();
    if (!text) return;

    addGoal(monthKey, text);
    setNewGoalInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddGoal();
    }
  };

  const handleRetroChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRetroText(val);
    setHintText('저장 중...');

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveRetro(monthKey, val);
      setHintText(`자동 저장됨 · ${new Date().toLocaleTimeString('ko-KR')}`);
    }, 700);
  };

  const y = goalsCursor.getFullYear();
  const m = goalsCursor.getMonth();

  return (
    <section className="view active" id="view-goals">
      {/* 월 선택부 */}
      <div className="month-select">
        <button className="nav-btn" onClick={() => changeMonth(-1)}>‹</button>
        <h2 id="goalsTitle">{y}년 {m + 1}월</h2>
        <button className="nav-btn" onClick={() => changeMonth(1)}>›</button>
      </div>

      {/* 이번 달 목표 카드 */}
      <div className="card">
        <h3>이번 달 목표</h3>
        <div id="goalsList">
          {monthData.goals.length === 0 ? (
            <div className="empty-state" style={{ padding: '16px 0' }}>
              이번 달 목표를 추가해보세요.
            </div>
          ) : (
            monthData.goals.map((g) => (
              <div className={`goal-row ${g.done ? 'done' : ''}`} key={`goal-${g.id}`}>
                <input
                  type="checkbox"
                  checked={g.done}
                  onChange={(e) => toggleGoal(monthKey, g.id, e.target.checked)}
                />
                <span>{g.text}</span>
                <button className="del" onClick={() => deleteGoal(monthKey, g.id)}>✕</button>
              </div>
            ))
          )}
        </div>
        <div className="add-goal">
          <input
            type="text"
            placeholder="새 목표 입력..."
            value={newGoalInput}
            onChange={(e) => setNewGoalInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleAddGoal}>추가</button>
        </div>
      </div>

      {/* 이번 달 회고 카드 */}
      <div className="card">
        <h3>이번 달 회고</h3>
        <textarea
          className="retro"
          placeholder="이번 달은 어땠나요? 잘한 점, 아쉬운 점을 적어보세요."
          value={retroText}
          onChange={handleRetroChange}
        />
        <div className="save-hint" id="retroSaved">{hintText}</div>
      </div>
    </section>
  );
};
