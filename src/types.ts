export interface Post {
  id: string;
  parentId: string | null;
  content: string;
  date: string; // YYYY-MM-DD
  category: string;
  images: string[];
  image: string | null;
  createdAt: string; // ISOString
}

export interface Todo {
  id: string;
  content: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  done: boolean;
  reminded: boolean;
}

export interface Category {
  key: string;
  color: string;
}

export interface Goal {
  id: string;
  text: string;
  done: boolean;
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
