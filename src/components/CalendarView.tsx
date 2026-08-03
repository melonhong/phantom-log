import React, { useState, useEffect } from 'react';
import { Post, Todo, AppState } from '../types';
import { TodoModal } from './TodoModal';

interface CalendarViewProps {
  data: AppState;
  addTodo: (content: string, date: string, time: string) => void;
  toggleTodo: (todoId: string, done: boolean) => void;
  deleteTodo: (todoId: string) => void;
  deletePostAndReplies: (postId: string) => void;
  onGoToPost: (postId: string) => void;
}

interface Quote {
  quote: string;
  author: string;
}

const dummyQuotes: Quote[] = [
  { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { quote: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { quote: "The best way to predict the future is to create it.", author: "Peter Drucker" }
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  data,
  addTodo,
  toggleTodo,
  deleteTodo,
  deletePostAndReplies,
  onGoToPost
}) => {
  const [subTab, setSubTab] = useState<'grid' | 'today'>('grid');
  const [calCursor, setCalCursor] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote>({ quote: '', author: '' });
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [todoModalDate, setTodoModalDate] = useState('');

  // 명언 불러오기
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        if (window.location.protocol === 'file:') {
          throw new Error('Local file protocol');
        }
        const targetUrl = encodeURIComponent('https://zenquotes.io/api/today');
        const res = await fetch(`https://api.allorigins.win/raw?url=${targetUrl}`);
        if (!res.ok) throw new Error('API request failed');
        const parsed = await res.json();
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].q) {
          setQuote({ quote: parsed[0].q, author: parsed[0].a });
          return;
        }
      } catch (e) {
        // Fail fallback
      }
      const todayIdx = new Date().getDate() % dummyQuotes.length;
      setQuote(dummyQuotes[todayIdx]);
    };
    fetchQuote();
  }, []);

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const changeMonth = (offset: number) => {
    const nextDate = new Date(calCursor);
    nextDate.setMonth(nextDate.getMonth() + offset);
    setCalCursor(nextDate);
  };

  const handleSelectDay = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  const openTodoModal = (dateStr?: string) => {
    setTodoModalDate(dateStr || getTodayStr());
    setIsTodoModalOpen(true);
  };

  const googleCalendarLink = (todo: Todo) => {
    const [h, m] = (todo.time || '09:00').split(':');
    const start = todo.date.replace(/-/g, '') + 'T' + h + m + '00';
    const end = todo.date.replace(/-/g, '') + 'T' + String((+h + 1) % 24).padStart(2, '0') + m + '00';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: todo.content,
      dates: `${start}/${end}`
    });
    return `https://www.google.com/calendar/render?${params.toString()}`;
  };

  // 달력 렌더링 정보 계산
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();
  const todayStr = getTodayStr();

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  // 이전 달 빈 셀들
  const emptyCells = Array.from({ length: firstDay });
  // 이번 달 일수들
  const daysArray = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);

  // 선택된 날짜 정보
  const selectedD = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const selectedDateLabel = selectedD
    ? `${selectedD.getFullYear()}년 ${selectedD.getMonth() + 1}월 ${selectedD.getDate()}일`
    : '-';

  const selectedPosts = selectedDate ? data.posts.filter(p => p.date === selectedDate) : [];
  const selectedTodos = selectedDate ? data.todos.filter(t => t.date === selectedDate) : [];

  // 오늘 할 일 목록
  const todayTodos = data.todos
    .filter(t => t.date === todayStr)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  return (
    <section className="view active" id="view-cal">
      {/* 명언 배너 */}
      <div className="quote-banner" id="quoteBanner">
        <div className="quote-content">
          <span className="quote-mark">“</span>
          <div className="quote-text-group">
            <p className="quote-text" id="quoteText">{quote.quote || '성공은 매일 반복한 작은 노력들의 합이다.'}</p>
            <span className="quote-author" id="quoteAuthor">- {quote.author || '로버트 콜리어'}</span>
          </div>
        </div>
      </div>

      {/* 서브 탭 */}
      <div className="subtabs">
        <button
          className={`subtab ${subTab === 'grid' ? 'active' : ''}`}
          onClick={() => setSubTab('grid')}
        >
          달력
        </button>
        <button
          className={`subtab ${subTab === 'today' ? 'active' : ''}`}
          onClick={() => setSubTab('today')}
        >
          오늘 할 일
        </button>
      </div>

      {/* 달력 서브 뷰 */}
      {subTab === 'grid' && (
        <div className="sub-view active" id="sub-grid">
          <div className="cal-head">
            <button className="nav-btn" onClick={() => changeMonth(-1)}>‹</button>
            <h2 id="calTitle">{y}년 {m + 1}월</h2>
            <button className="nav-btn" onClick={() => changeMonth(1)}>›</button>
          </div>
          <div className="weekdays">
            <span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>
          </div>
          <div className="grid" id="calGrid">
            {emptyCells.map((_, idx) => (
              <div className="day empty" key={`empty-${idx}`}></div>
            ))}
            {daysArray.map((d) => {
              const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const hasPost = data.posts.some(p => p.date === dateStr);
              const hasTodo = data.todos.some(t => t.date === dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;

              return (
                <div
                  className={`day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                  key={`day-${d}`}
                  onClick={() => handleSelectDay(dateStr)}
                >
                  <div className="num">{d}</div>
                  {(hasPost || hasTodo) && (
                    <div className="blots">
                      {hasPost && <div className="blot post"></div>}
                      {hasTodo && <div className="blot todo"></div>}
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
                <button className="choice-btn todo" onClick={() => openTodoModal(selectedDate)}>
                  할 일 만들기
                </button>
              </div>
              <div id="dpEntries">
                {/* 선택된 날짜의 포스트(일지) 목록 */}
                {selectedPosts.map((p) => {
                  const timeLabel = p.createdAt
                    ? new Date(p.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : '';
                  const photoCount = p.images?.length || (p.image ? 1 : 0);
                  const photoBadge = photoCount > 0 ? (
                    <span className="tag post" style={{ background: 'var(--primary)', color: '#fff', marginRight: '4px' }}>
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
                            deletePostAndReplies(p.id);
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
                  <div className={`entry-mini ${t.done ? 'done' : ''}`} key={`entry-todo-${t.id}`}>
                    <div className="row">
                      <div>
                        <input
                          type="checkbox"
                          className="todo-check"
                          checked={t.done}
                          onChange={(e) => toggleTodo(t.id, e.target.checked)}
                        />
                        {t.time ? `[${t.time}] ` : ''}
                        <span className="todo-content">{t.content}</span>
                        <a className="gcal-link" href={googleCalendarLink(t)} target="_blank" rel="noopener noreferrer">
                          캘린더 추가
                        </a>
                      </div>
                      <button className="del" onClick={() => deleteTodo(t.id)}>
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 오늘 할 일 서브 뷰 */}
      {subTab === 'today' && (
        <div className="sub-view active" id="sub-today">
          <div className="cal-head" style={{ marginBottom: '14px' }}>
            <h2 id="todayTabTitle">오늘 할 일</h2>
            <button className="nav-btn" onClick={() => openTodoModal()} title="오늘 할 일 추가">＋</button>
          </div>
          <div id="todayTodoList">
            {todayTodos.length === 0 ? (
              <div className="empty-state">오늘 등록된 할 일이 없어요.</div>
            ) : (
              todayTodos.map((t) => (
                <div className={`today-todo-row ${t.done ? 'done' : ''}`} key={`today-todo-${t.id}`}>
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={(e) => toggleTodo(t.id, e.target.checked)}
                  />
                  <div className="info">
                    {t.time && <span className="time">{t.time}</span>}
                    <span className="content">{t.content}</span>
                    <a className="gcal-link" href={googleCalendarLink(t)} target="_blank" rel="noopener noreferrer">
                      캘린더 추가
                    </a>
                  </div>
                  <button className="del" onClick={() => deleteTodo(t.id)}>삭제</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 할 일 만들기 모달 */}
      <TodoModal
        isOpen={isTodoModalOpen}
        onClose={() => setIsTodoModalOpen(false)}
        onSave={addTodo}
        defaultDate={todoModalDate}
      />
    </section>
  );
};
