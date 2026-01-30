import type { UserNameLike } from '@/entities/user/model/types';
export type { UserNameLike } from '@/entities/user/model/types';

export const formatUserLabel = (user: UserNameLike): string => {
  if (user.username) {
    return `@${user.username}`;
  }
  const first = user.first_name ?? '';
  const last = user.last_name ?? '';
  const name = `${first} ${last}`.trim();
  return name || 'Пользователь без имени';
};
