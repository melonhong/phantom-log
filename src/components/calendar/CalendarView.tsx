import React, { useState, useEffect } from 'react';
import { AppState } from '../../types';
import { TodoModal } from '../TodoModal';
import { CalendarGrid } from './CalendarGrid';
import { TodayTodoList } from './TodayTodoList';
import { getTodayStr } from '../../utils/calendarUtils';

interface CalendarViewProps {
  data: AppState;
  addTodo: (content: string, date: string, time: string) => void;
  toggleTodo: (todoId: string, done: boolean) => void;
  deleteTodo: (todoId: string) => void;
  deletePostAndReplies: (postId: string) => void;
  onGoToPost: (postId: string) => void;
  showToast: (msg: string) => void;
}

interface Quote {
  quote: string;
  author: string;
}

const dummyQuotes: Quote[] = [
  {
    quote: 'Success is the sum of small efforts, repeated day in and day out.',
    author: 'Robert Collier',
  },
  { quote: 'Action is the foundational key to all success.', author: 'Pablo Picasso' },
  {
    quote: 'The best way to predict the future is to create it.',
    author: 'Peter Drucker',
  },
];

export const CalendarView: React.FC<CalendarViewProps> = ({
  data,
  addTodo,
  toggleTodo,
  deleteTodo,
  deletePostAndReplies,
  onGoToPost,
  showToast,
}) => {
  const [subTab, setSubTab] = useState<'grid' | 'today'>('grid');
  const [calCursor, setCalCursor] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote>({ quote: '', author: '' });
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [todoModalDate, setTodoModalDate] = useState('');

  // 명언 불러오기 (3초 타임아웃 적용으로 408 에러 방지)
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const fetchQuote = async () => {
      try {
        if (window.location.protocol === 'file:') {
          throw new Error('Local file protocol');
        }
        const targetUrl = encodeURIComponent('https://zenquotes.io/api/today');
        const res = await fetch(`https://api.allorigins.win/raw?url=${targetUrl}`, {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error('API request failed');
        const parsed = await res.json();
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].q) {
          setQuote({ quote: parsed[0].q, author: parsed[0].a });
          return;
        }
      } catch {
        // Fail fallback silently to dummy quote
      }
      const todayIdx = new Date().getDate() % dummyQuotes.length;
      setQuote(dummyQuotes[todayIdx]);
    };

    fetchQuote();
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const todayStr = getTodayStr();

  const changeMonth = (offset: number) => {
    const nextDate = new Date(calCursor);
    nextDate.setMonth(nextDate.getMonth() + offset);
    setCalCursor(nextDate);
  };

  const openTodoModal = (dateStr?: string) => {
    setTodoModalDate(dateStr || todayStr);
    setIsTodoModalOpen(true);
  };

  // 오늘 할 일 목록 (시간순 정렬)
  const todayTodos = data.todos
    .filter((t) => t.date === todayStr)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));

  return (
    <section className="view active" id="view-cal">
      {/* 명언 배너 */}
      <div className="quote-banner" id="quoteBanner">
        <div className="quote-content">
          <span className="quote-mark">"</span>
          <div className="quote-text-group">
            <p className="quote-text" id="quoteText">
              {quote.quote || '성공은 매일 반복한 작은 노력들의 합이다.'}
            </p>
            <span className="quote-author" id="quoteAuthor">
              - {quote.author || '로버트 콜리어'}
            </span>
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

      {subTab === 'grid' && (
        <CalendarGrid
          data={data}
          calCursor={calCursor}
          selectedDate={selectedDate}
          todayStr={todayStr}
          onChangeMonth={changeMonth}
          onSelectDay={setSelectedDate}
          onOpenTodoModal={openTodoModal}
          onGoToPost={onGoToPost}
          onDeletePost={deletePostAndReplies}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
        />
      )}

      {subTab === 'today' && (
        <TodayTodoList
          todos={todayTodos}
          onOpenTodoModal={() => openTodoModal()}
          onToggleTodo={toggleTodo}
          onDeleteTodo={deleteTodo}
        />
      )}

      {/* 할 일 만들기 모달 */}
      <TodoModal
        isOpen={isTodoModalOpen}
        onClose={() => setIsTodoModalOpen(false)}
        onSave={addTodo}
        defaultDate={todoModalDate}
        showToast={showToast}
      />
    </section>
  );
};
