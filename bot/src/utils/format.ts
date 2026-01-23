import type { UserNameLike } from '@/types/user.js';
export type { UserNameLike } from '@/types/user.js';

export const formatUserLabel = (user: UserNameLike): string => {
  if (user.username) {
    return `@${user.username}`;
  }
  const first = user.first_name ?? '';
  const last = user.last_name ?? '';
  const name = `${first} ${last}`.trim();
  return name || 'Пользователь без имени';
};

export const formatCount = (value: number): string => {
  return value.toLocaleString('ru-RU');
};
