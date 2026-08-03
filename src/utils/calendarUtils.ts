import { Todo } from '../types';

export const googleCalendarLink = (todo: Todo): string => {
  const [h, m] = (todo.time || '09:00').split(':');
  const start = todo.date.replace(/-/g, '') + 'T' + h + m + '00';
  const end =
    todo.date.replace(/-/g, '') +
    'T' +
    String((+h + 1) % 24).padStart(2, '0') +
    m +
    '00';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: todo.content,
    dates: `${start}/${end}`,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
};

export const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
