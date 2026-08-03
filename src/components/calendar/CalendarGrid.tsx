import React from 'react';
import { AppState, Post, Todo } from '../../types';
import { googleCalendarLink } from '../../utils/calendarUtils';

interface CalendarGridProps {
  data: AppState;
  calCursor: Date;
  selectedDate: string | null;
  todayStr: string;
  onChangeMonth: (offset: number) => void;
  onSelectDay: (dateStr: string) => void;
  onOpenTodoModal: (dateStr: string) => void;
  onGoToPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
  onToggleTodo: (todoId: string, done: boolean) => void;
  onDeleteTodo: (todoId: string) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  data,
  calCursor,
  selectedDate,
  todayStr,
  onChangeMonth,
  onSelectDay,
  onOpenTodoModal,
  onGoToPost,
  onDeletePost,
  onToggleTodo,
  onDeleteTodo,
}) => {
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const emptyCells = Array.from({ length: firstDay });
  const daysArray = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);

  const selectedD = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const selectedDateLabel = selectedD
    ? `${selectedD.getFullYear()}년 ${selectedD.getMonth() + 1}월 ${selectedD.getDate()}일`
    : '-';

  const selectedPosts: Post[] = selectedDate
    ? data.posts.filter((p) => p.date === selectedDate)
    : [];
  const selectedTodos: Todo[] = selectedDate
    ? data.todos.filter((t) => t.date === selectedDate)
    : [];

  return (
    <div className="sub-view active" id="sub-grid">
      {/* 달력 헤더 */}
      <div className="cal-head">
        <button className="nav-btn" onClick={() => onChangeMonth(-1)}>
          ‹
        </button>
        <h2 id="calTitle">
          {y}년 {m + 1}월
        </h2>
        <button className="nav-btn" onClick={() => onChangeMonth(1)}>
          ›
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="weekdays">
        <span>일</span>
        <span>월</span>
        <span>화</span>
        <span>수</span>
        <span>목</span>
        <span>금</span>
        <span>토</span>
      </div>

      {/* 달력 그리드 */}
      <div className="grid" id="calGrid">
        {emptyCells.map((_, idx) => (
          <div className="day empty" key={`empty-${idx}`} />
        ))}
        {daysArray.map((d) => {
          const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const hasPost = data.posts.some((p) => p.date === dateStr);
          const hasTodo = data.todos.some((t) => t.date === dateStr);
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDate;

          return (
            <div
              className={`day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
              key={`day-${d}`}
              onClick={() => onSelectDay(dateStr)}
            >
              <div className="num">{d}</div>
              {(hasPost || hasTodo) && (
                <div className="blots">
                  {hasPost && <div className="blot post" />}
                  {hasTodo && <div className="blot todo" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 일별 패널 */}
      {selectedDate && (
        <div className="day-panel" id="dayPanel" style={{ display: 'block' }}>
          <div className="dp-head">
            <span id="dpDate">{selectedDateLabel}</span>
          </div>
          <div className="choice-row">
            <button
              className="choice-btn todo"
              onClick={() => onOpenTodoModal(selectedDate)}
            >
              할 일 만들기
            </button>
          </div>
          <div id="dpEntries">
            {/* 선택된 날짜의 포스트(일지) 목록 */}
            {selectedPosts.map((p) => {
              const timeLabel = p.createdAt
                ? new Date(p.createdAt).toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '';
              const photoCount = p.images?.length || (p.image ? 1 : 0);
              const photoBadge =
                photoCount > 0 ? (
                  <span
                    className="tag post"
                    style={{ background: 'var(--primary)', color: '#fff', marginRight: '4px' }}
                  >
                    📷 사진{photoCount > 1 ? ` (${photoCount})` : ''}
                  </span>
                ) : null;
              const contentText = p.content
                ? p.content.slice(0, 50) + (p.content.length > 50 ? '…' : '')
                : '';

              return (
                <div
                  className="entry-mini post-entry"
                  key={`entry-post-${p.id}`}
                  onClick={() => onGoToPost(p.id)}
                >
                  <div className="row">
                    <div>
                      {timeLabel && <span className="tag post">{timeLabel}</span>}
                      {photoBadge}
                      {contentText}
                    </div>
                    <button
                      className="del"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePost(p.id);
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}

            {/* 선택된 날짜의 할 일 목록 */}
            {selectedTodos.map((t) => (
              <div
                className={`entry-mini ${t.done ? 'done' : ''}`}
                key={`entry-todo-${t.id}`}
              >
                <div className="row">
                  <div>
                    <input
                      type="checkbox"
                      className="todo-check"
                      checked={t.done}
                      onChange={(e) => onToggleTodo(t.id, e.target.checked)}
                    />
                    {t.time ? `[${t.time}] ` : ''}
                    <span className="todo-content">{t.content}</span>
                    <a
                      className="gcal-link"
                      href={googleCalendarLink(t)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      캘린더 추가
                    </a>
                  </div>
                  <button className="del" onClick={() => onDeleteTodo(t.id)}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
