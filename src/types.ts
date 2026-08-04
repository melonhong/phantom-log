export interface Post {
  id: string;
  parentId: string | null;
  content: string;
  date: string; // YYYY-MM-DD
  category: string;
  images: string[];
  image: string | null;
  createdAt: string; // ISOString
  updatedAt: string; // ISOString
  isDeleted: boolean; // Soft Delete 플래그
  bookmarked: boolean; // 북마크 표시
}

export interface Todo {
  id: string;
  content: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  done: boolean;
  reminded: boolean;
  updatedAt: string; // ISOString
}

export interface Category {
  key: string;
  color: string;
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
  updatedAt: string; // ISOString
}

export interface MonthlyData {
  goals: Goal[];
  retro: string;
}

export interface AppState {
  posts: Post[];
  todos: Todo[];
  monthly: Record<string, MonthlyData>;
  categories: Category[];
}
