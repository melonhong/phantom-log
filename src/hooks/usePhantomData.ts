import { useState, useEffect, useCallback } from 'react';
import { AppState, Post, Todo, Category, Goal } from '../types';

interface CloudStorage {
  get(key: string, flag: boolean): Promise<{ value: string } | null>;
  set(key: string, value: string, flag: boolean): Promise<{ value: string }>;
}

declare global {
  interface Window {
    storage?: CloudStorage;
  }
}

// UUID 생성 헬퍼
const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // fallback: 구형 환경
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
};

const STORE_KEY = 'diary-app-data';
const CATS_DEFAULT: Category[] = [{ key: '일상', color: '#5865f2' }];

const initialData: AppState = {
  posts: [],
  todos: [],
  monthly: {},
  categories: []
};

export const usePhantomData = () => {
  const [data, setData] = useState<AppState>(initialData);
  const [storageMode, setStorageMode] = useState<'cloud' | 'local'>('local');
  const [loading, setLoading] = useState(true);

  // storage mode 결정
  const getStorageMode = useCallback((): 'cloud' | 'local' => {
    return (typeof window.storage !== 'undefined' && window.storage && typeof window.storage.get === 'function')
      ? 'cloud'
      : 'local';
  }, []);

  // storageGet 구현
  const storageGet = useCallback(async (key: string): Promise<{ value: string } | null> => {
    const mode = getStorageMode();
    if (mode === 'cloud' && window.storage) {
      try {
        return await window.storage.get(key, false);
      } catch (e) {
        return null;
      }
    }
    const raw = localStorage.getItem(key);
    return raw ? { value: raw } : null;
  }, [getStorageMode]);

  // storageSet 구현
  const storageSet = useCallback(async (key: string, value: string): Promise<{ value: string }> => {
    const mode = getStorageMode();
    if (mode === 'cloud' && window.storage) {
      try {
        return await window.storage.set(key, value, false);
      } catch (e) {
        setStorageMode('local');
        localStorage.setItem(key, value);
        return { value };
      }
    }
    localStorage.setItem(key, value);
    return { value };
  }, [getStorageMode]);

  // 데이터 로드
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      const mode = getStorageMode();
      setStorageMode(mode);

      try {
        const res = await storageGet(STORE_KEY);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setData({
            posts: (parsed.posts || []).map((p: any) => ({
              parentId: null,
              isDeleted: false,
              bookmarked: false,
              updatedAt: p.createdAt || new Date().toISOString(),
              ...p,
            })),
            todos: (parsed.todos || []).map((t: any) => ({
              updatedAt: t.updatedAt || t.createdAt || new Date().toISOString(),
              ...t,
            })),
            monthly: Object.fromEntries(
              Object.entries(parsed.monthly || {}).map(([k, v]: [string, any]) => [
                k,
                {
                  ...v,
                  goals: (v.goals || []).map((g: any) => ({
                    updatedAt: g.updatedAt || new Date().toISOString(),
                    ...g,
                  })),
                },
              ])
            ),
            categories: (parsed.categories && parsed.categories.length)
              ? parsed.categories
              : JSON.parse(JSON.stringify(CATS_DEFAULT))
          });
        } else {
          setData(prev => ({
            ...prev,
            categories: JSON.parse(JSON.stringify(CATS_DEFAULT))
          }));
        }
      } catch (e) {
        setData(prev => ({
          ...prev,
          categories: JSON.parse(JSON.stringify(CATS_DEFAULT))
        }));
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [storageGet]);

  // 데이터 통합 저장 함수
  const saveData = useCallback(async (nextState: AppState) => {
    setData(nextState);
    try {
      await storageSet(STORE_KEY, JSON.stringify(nextState));
    } catch (e) {
      console.error('저장에 실패했어요.', e);
    }
  }, [storageSet]);

  const defaultCatKey = useCallback((currentData: AppState) => {
    const categories = currentData.categories;
    return (categories && categories[0]) ? categories[0].key : '일상';
  }, []);

  // -- API Actions --

  // 1. 일지 로드 (백업 가져오기 시 수동 데이터 변경용)
  const importData = useCallback(async (imported: AppState) => {
    const prepared: AppState = {
      posts: imported.posts || [],
      todos: imported.todos || [],
      monthly: imported.monthly || {},
      categories: (imported.categories && imported.categories.length)
        ? imported.categories
        : JSON.parse(JSON.stringify(CATS_DEFAULT))
    };
    await saveData(prepared);
  }, [saveData]);

  // 2. 일지 게시
  const addPost = useCallback((content: string, date: string, category: string, images: string[]) => {
    const now = new Date().toISOString();
    const newPost: Post = {
      id: generateId(),
      parentId: null,
      content,
      date,
      category: category || defaultCatKey(data),
      images: [...images],
      image: images[0] || null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      bookmarked: false,
    };

    const nextState = {
      ...data,
      posts: [newPost, ...data.posts]
    };
    saveData(nextState);
  }, [data, saveData, defaultCatKey]);

  // 3. 답글 추가
  const addReply = useCallback((parentId: string, content: string) => {
    const parentPost = data.posts.find(x => x.id === parentId);
    const now = new Date().toISOString();
    const newPost: Post = {
      id: generateId(),
      parentId,
      content,
      date: parentPost ? parentPost.date : new Date().toISOString().split('T')[0],
      category: parentPost ? parentPost.category : defaultCatKey(data),
      images: [],
      image: null,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      bookmarked: false,
    };

    const nextState = {
      ...data,
      posts: [...data.posts, newPost] // 답글은 아래에 붙임
    };
    saveData(nextState);
  }, [data, saveData, defaultCatKey]);

  // 4. 일지 및 하위 답글 삭제 (Soft Delete)
  const deletePostAndReplies = useCallback((postId: string) => {
    const idsToDelete = new Set<string>([postId]);
    let added = true;
    while (added) {
      added = false;
      data.posts.forEach(p => {
        if (p.parentId && idsToDelete.has(p.parentId) && !idsToDelete.has(p.id)) {
          idsToDelete.add(p.id);
          added = true;
        }
      });
    }

    const now = new Date().toISOString();
    const nextState = {
      ...data,
      posts: data.posts.map(p =>
        idsToDelete.has(p.id)
          ? { ...p, isDeleted: true, updatedAt: now }
          : p
      )
    };
    saveData(nextState);
  }, [data, saveData]);

  // 5. 할 일 추가
  const addTodo = useCallback((content: string, date: string, time: string) => {
    const now = new Date().toISOString();
    const newTodo: Todo = {
      id: generateId(),
      content,
      date,
      time,
      done: false,
      reminded: false,
      updatedAt: now,
    };

    const nextState = {
      ...data,
      todos: [...data.todos, newTodo]
    };
    saveData(nextState);
  }, [data, saveData]);

  // 6. 할 일 토글
  const toggleTodo = useCallback((todoId: string, done: boolean) => {
    const nextState = {
      ...data,
      todos: data.todos.map(t =>
        t.id === todoId ? { ...t, done, updatedAt: new Date().toISOString() } : t
      )
    };
    saveData(nextState);
  }, [data, saveData]);

  // 7. 할 일 삭제
  const deleteTodo = useCallback((todoId: string) => {
    const nextState = {
      ...data,
      todos: data.todos.filter(t => t.id !== todoId)
    };
    saveData(nextState);
  }, [data, saveData]);

  // 8. 할 일 알림 완료 표시
  const markTodoReminded = useCallback((todoId: string) => {
    const nextState = {
      ...data,
      todos: data.todos.map(t =>
        t.id === todoId ? { ...t, reminded: true, updatedAt: new Date().toISOString() } : t
      )
    };
    saveData(nextState);
  }, [data, saveData]);

  // 9. 카테고리 추가
  const addCategory = useCallback((name: string): boolean => {
    if (data.categories.some(c => c.key === name)) {
      return false; // 이미 존재하는 카테고리
    }
    const nextState = {
      ...data,
      categories: [...data.categories, { key: name, color: '#5865f2' }]
    };
    saveData(nextState);
    return true;
  }, [data, saveData]);

  // 10. 카테고리 삭제
  const deleteCategory = useCallback((key: string) => {
    const updatedCats = data.categories.filter(c => c.key !== key);
    const fallback = updatedCats[0] ? updatedCats[0].key : '일상';

    const updatedPosts = data.posts.map(p => {
      if (p.category === key) {
        return { ...p, category: fallback };
      }
      return p;
    });

    const nextState = {
      ...data,
      categories: updatedCats,
      posts: updatedPosts
    };
    saveData(nextState);
  }, [data, saveData]);

  // 11. 목표 추가
  const addGoal = useCallback((monthKey: string, text: string) => {
    const now = new Date().toISOString();
    const newGoal: Goal = {
      id: generateId(),
      text,
      done: false,
      updatedAt: now,
    };

    const monthData = data.monthly[monthKey] || { goals: [], retro: '' };
    const updatedMonthData = {
      ...monthData,
      goals: [...monthData.goals, newGoal]
    };

    const nextState = {
      ...data,
      monthly: {
        ...data.monthly,
        [monthKey]: updatedMonthData
      }
    };
    saveData(nextState);
  }, [data, saveData]);

  // 12. 목표 완료 토글
  const toggleGoal = useCallback((monthKey: string, goalId: string, done: boolean) => {
    const monthData = data.monthly[monthKey];
    if (!monthData) return;

    const updatedGoals = monthData.goals.map(g =>
      g.id === goalId ? { ...g, done, updatedAt: new Date().toISOString() } : g
    );
    const updatedMonthData = { ...monthData, goals: updatedGoals };

    const nextState = {
      ...data,
      monthly: {
        ...data.monthly,
        [monthKey]: updatedMonthData
      }
    };
    saveData(nextState);
  }, [data, saveData]);

  // 13. 목표 삭제
  const deleteGoal = useCallback((monthKey: string, goalId: string) => {
    const monthData = data.monthly[monthKey];
    if (!monthData) return;

    const updatedGoals = monthData.goals.filter(g => g.id !== goalId);
    const updatedMonthData = { ...monthData, goals: updatedGoals };

    const nextState = {
      ...data,
      monthly: {
        ...data.monthly,
        [monthKey]: updatedMonthData
      }
    };
    saveData(nextState);
  }, [data, saveData]);

  // 15. 북마크 토글
  const toggleBookmark = useCallback((postId: string) => {
    const nextState = {
      ...data,
      posts: data.posts.map(p =>
        p.id === postId
          ? { ...p, bookmarked: !p.bookmarked, updatedAt: new Date().toISOString() }
          : p
      )
    };
    saveData(nextState);
  }, [data, saveData]);

  // 16. 일지 수정 (내용 + 카테고리 업데이트)
  const updatePost = useCallback((postId: string, content: string, category: string) => {
    const nextState = {
      ...data,
      posts: data.posts.map(p =>
        p.id === postId
          ? { ...p, content, category, updatedAt: new Date().toISOString() }
          : p
      )
    };
    saveData(nextState);
  }, [data, saveData]);

  // 14. 회고 내용 저장
  const saveRetro = useCallback((monthKey: string, retroText: string) => {
    const monthData = data.monthly[monthKey] || { goals: [], retro: '' };
    const updatedMonthData = { ...monthData, retro: retroText };

    const nextState = {
      ...data,
      monthly: {
        ...data.monthly,
        [monthKey]: updatedMonthData
      }
    };
    saveData(nextState);
  }, [data, saveData]);

  return {
    data: {
      ...data,
      posts: data.posts.filter(p => !p.isDeleted) // Soft Delete: UI에는 isDeleted=false인 것만 노출
    },
    rawData: data, // Soft Delete 포함 전체 데이터 (복구 등에 사용)
    loading,
    storageMode,
    importData,
    addPost,
    addReply,
    deletePostAndReplies,
    updatePost,
    toggleBookmark,
    addTodo,
    toggleTodo,
    deleteTodo,
    markTodoReminded,
    addCategory,
    deleteCategory,
    addGoal,
    toggleGoal,
    deleteGoal,
    saveRetro,
    defaultCatKey: () => defaultCatKey(data)
  };
};
