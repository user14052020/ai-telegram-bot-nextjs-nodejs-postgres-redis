export interface TimeRange {
  start?: Date | null;
  end?: Date | null;
}

export interface UserMessageCount {
  user_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  message_count: number;
}

export interface UserStats {
  message_count: number;
  first_message: Date | null;
  last_message: Date | null;
}

export interface MessageRecord {
  text: string;
  sent_at: Date;
}
