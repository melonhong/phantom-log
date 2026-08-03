import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { usePhantomData } from './hooks/usePhantomData';
import { CalendarView } from './components/CalendarView';
import { FeedView } from './components/FeedView';
import { GoalsView } from './components/GoalsView';
import { ImageLightbox } from './components/ImageLightbox';

export const App: React.FC = () => {
  const {
    data,
    loading,
    storageMode,
    importData,
    addPost,
    addReply,
    deletePostAndReplies,
    addTodo,
    toggleTodo,
    deleteTodo,
    markTodoReminded,
    addCategory,
    deleteCategory,
    addGoal,
    toggleGoal,
    deleteGoal,
    saveRetro
  } = usePhantomData();

  const [activeTab, setActiveTab] = useState<'cal' | 'feed' | 'goals'>('cal');
  const [searchPostId, setSearchPostId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // 토스트 상태
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 테마 상태
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMsg(null);
    }, 2200);
  };

  // 초기 테마 세팅
  useEffect(() => {
    const saved = localStorage.getItem('phantom-theme') as 'light' | 'dark' | null;
    const initialTheme = saved || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, []);

  // 알림 루프 설정 (20초마다 검사)
  useEffect(() => {
    const checkReminders = () => {
      if (loading) return;
      const now = new Date();
      const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const nowHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      let changed = false;
      data.todos.forEach(t => {
        if (!t.reminded && !t.done && t.date === nowStr && t.time && t.time <= nowHM) {
          markTodoReminded(t.id);
          changed = true;
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('팬텀 노트 할 일 알림', { body: t.content });
          }
          showToast(t.content);
        }
      });
    };

    const timer = setInterval(checkReminders, 20000);
    return () => clearInterval(timer);
  }, [data.todos, loading, markTodoReminded]);

  // 언마운트 시 토스트 타이머 클린업
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('phantom-theme', next);
    if (next === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  // 백업하기 (.zip)
  const handleExport = async () => {
    try {
      const jsonStr = JSON.stringify(data, null, 2);
      const zip = new JSZip();
      zip.file('backup.json', jsonStr);

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const getTodayStr = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      };
      const defaultFileName = `기록장-백업-${getTodayStr()}.zip`;

      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: defaultFileName,
            types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(zipBlob);
          await writable.close();
          showToast('ZIP 백업 파일로 저장했어요.');
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            showToast('파일 저장 중 오류가 발생했습니다.');
          }
        }
      } else {
        const url = URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultFileName;
        a.click();
        URL.revokeObjectURL(url);
        showToast('ZIP 백업 파일로 저장했어요.');
      }
    } catch (e) {
      console.error(e);
      showToast('백업 생성 중 오류가 발생했습니다.');
    }
  };

  // 불러오기 (.zip / .json)
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let jsonText = '';
      if (file.name.endsWith('.zip') || file.type === 'application/zip' || file.type === 'application/x-zip-compressed') {
        const zip = await JSZip.loadAsync(file);
        const jsonFile = zip.file('backup.json') || Object.values(zip.files).find(f => !f.dir && f.name.endsWith('.json'));
        if (!jsonFile) {
          throw new Error('ZIP 내에서 백업 JSON 파일을 찾을 수 없습니다.');
        }
        jsonText = await jsonFile.async('text');
      } else {
        jsonText = await file.text();
      }

      const parsed = JSON.parse(jsonText);
      await importData(parsed);
      showToast('데이터를 성공적으로 불러왔어요.');
    } catch (err) {
      console.error(err);
      showToast('파일을 읽을 수 없어요. 유효한 백업 파일인지 확인해주세요.');
    }
    e.target.value = '';
  };

  // 알림 켜기
  const handleNotifToggle = async () => {
    if (!('Notification' in window)) {
      showToast('이 브라우저는 알림을 지원하지 않아요.');
      return;
    }
    const perm = await Notification.requestPermission();
    showToast(perm === 'granted' ? '알림이 켜졌어요.' : '알림 권한이 거부됐어요.');
  };

  // 특정 포스트 위치로 이동
  const handleGoToPost = (postId: string) => {
    setSearchPostId(postId);
    setActiveTab('feed');
  };

  // 오늘 날짜 라벨
  const todayLabelText = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });

  return (
    <>
      {/* 헤더 */}
      <header className="top">
        <a href="#" className="header-logo" title="팬텀 노트" onClick={(e) => e.preventDefault()}>
          <svg fill="currentColor" viewBox="45 45 110 90">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M89.1138 112.613C83.1715 121.719 73.2139 133.243 59.9641 133.243C53.7005 133.243 47.6777 130.665 47.6775 119.464C47.677 90.9369 86.6235 46.777 122.76 46.7764C143.317 46.776 151.509 61.0389 151.509 77.2361C151.509 98.0264 138.018 121.799 124.608 121.799C120.352 121.799 118.264 119.462 118.264 115.756C118.264 114.789 118.424 113.741 118.746 112.613C114.168 120.429 105.335 127.683 97.0638 127.683C91.0411 127.683 87.9898 123.895 87.9897 118.576C87.9897 116.642 88.3912 114.628 89.1138 112.613ZM115.936 68.7103C112.665 68.7161 110.435 71.4952 110.442 75.4598C110.449 79.4244 112.689 82.275 115.96 82.2693C119.152 82.2636 121.381 79.4052 121.374 75.4405C121.367 71.4759 119.128 68.7047 115.936 68.7103ZM133.287 68.6914C130.016 68.6972 127.786 71.4763 127.793 75.4409C127.8 79.4055 130.039 82.2561 133.311 82.2504C136.503 82.2448 138.732 79.3863 138.725 75.4216C138.718 71.457 136.479 68.6858 133.287 68.6914Z">
            </path>
          </svg>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="today" id="todayLabel">{todayLabelText}</div>
          <button className="theme-toggle-btn" id="themeToggle" onClick={toggleTheme} title="테마 전환">
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18ZM11 1H13V4H11V1ZM11 20H13V23H11V20ZM3.51472 4.92893L4.92893 3.51472L7.05025 5.63604L5.63604 7.05025L3.51472 4.92893ZM16.9497 18.364L18.364 16.9497L20.4853 19.0711L19.0711 20.4853L16.9497 18.364ZM19.0711 3.51472L20.4853 4.92893L18.364 7.05025L16.9497 5.63604L19.0711 3.51472ZM5.63604 16.9497L7.05025 18.364L4.92893 20.4853L3.51472 19.0711L5.63604 16.9497ZM23 11V13H20V11H23ZM4 11V13H1V11H4Z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.3805 2.01977C9.91572 3.38768 9 5.33708 9 7.5C9 11.6421 12.3579 15 16.5 15C18.6629 15 20.6123 14.0843 21.9802 12.6195C21.6613 17.8537 17.3149 22 12 22C6.47715 22 2 17.5228 2 12C2 6.68514 6.14629 2.33871 11.3805 2.01977Z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="tabs">
        <button
          className={activeTab === 'cal' ? 'active' : ''}
          onClick={() => setActiveTab('cal')}
        >
          캘린더
        </button>
        <button
          className={activeTab === 'feed' ? 'active' : ''}
          onClick={() => setActiveTab('feed')}
        >
          피드
        </button>
        <button
          className={activeTab === 'goals' ? 'active' : ''}
          onClick={() => setActiveTab('goals')}
        >
          목표 &amp; 회고
        </button>
      </nav>

      {/* 뷰 렌더링 영역 */}
      <main>
        {activeTab === 'cal' && (
          <CalendarView
            data={data}
            addTodo={addTodo}
            toggleTodo={toggleTodo}
            deleteTodo={deleteTodo}
            deletePostAndReplies={deletePostAndReplies}
            onGoToPost={handleGoToPost}
            showToast={showToast}
          />
        )}

        {activeTab === 'feed' && (
          <FeedView
            data={data}
            addPost={addPost}
            addReply={addReply}
            deletePostAndReplies={deletePostAndReplies}
            addCategory={addCategory}
            deleteCategory={deleteCategory}
            searchPostId={searchPostId}
            clearSearchPostId={() => setSearchPostId(null)}
            onImageClick={setLightboxSrc}
            showToast={showToast}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsView
            data={data}
            addGoal={addGoal}
            toggleGoal={toggleGoal}
            deleteGoal={deleteGoal}
            saveRetro={saveRetro}
          />
        )}
      </main>

      {/* 하단 유틸 */}
      <footer className="util">
        <button onClick={handleExport}>백업하기 (.zip)</button>
        <button onClick={handleImportClick}>불러오기</button>
        <button onClick={handleNotifToggle}>알림 켜기</button>
      </footer>

      {/* 숨겨진 불러오기 input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFileChange}
        accept="application/json, .zip"
        style={{ display: 'none' }}
      />

      <div id="storageNotice" className="storage-notice">
        {loading ? (
          '로딩 중...'
        ) : storageMode === 'cloud' ? (
          '클라우드에 저장 중'
        ) : (
          '이 브라우저(파일)에 로컬 저장 중 · 정기적으로 백업을 권장해요'
        )}
      </div>

      {/* 이미지 라이트박스 */}
      <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />

      {/* 토스트 알림 */}
      <div id="toast" className={toastMsg ? 'show' : ''}>
        {toastMsg}
      </div>
    </>
  );
};
