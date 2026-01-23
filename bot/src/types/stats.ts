import type { UserMessageCount } from '@/types/message.js';

export interface TopUsersStats {
  users: UserMessageCount[];
  totals: { messages: number; users: number };
}
