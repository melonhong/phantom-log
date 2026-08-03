import React from 'react';
import { Todo } from '../../types';
import { googleCalendarLink } from '../../utils/calendarUtils';

interface TodayTodoListProps {
  todos: Todo[];
  onOpenTodoModal: () => void;
  onToggleTodo: (todoId: string, done: boolean) => void;
  onDeleteTodo: (todoId: string) => void;
}

export const TodayTodoList: React.FC<TodayTodoListProps> = ({
  todos,
  onOpenTodoModal,
  onToggleTodo,
  onDeleteTodo,
}) => {
  return (
    <div className="sub-view active" id="sub-today">
      <div className="cal-head" style={{ marginBottom: '14px' }}>
        <h2 id="todayTabTitle">오늘 할 일</h2>
        <button className="nav-btn" onClick={onOpenTodoModal} title="오늘 할 일 추가">
          ＋
        </button>
      </div>
      <div id="todayTodoList">
        {todos.length === 0 ? (
          <div className="empty-state">오늘 등록된 할 일이 없어요.</div>
        ) : (
          todos.map((t) => (
            <div
              className={`today-todo-row ${t.done ? 'done' : ''}`}
              key={`today-todo-${t.id}`}
            >
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => onToggleTodo(t.id, e.target.checked)}
              />
              <div className="info">
                {t.time && <span className="time">{t.time}</span>}
                <span className="content">{t.content}</span>
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
          ))
        )}
      </div>
    </div>
  );
};
