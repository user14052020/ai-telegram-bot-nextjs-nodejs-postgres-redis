export interface UserRecord {
  id: number;
  tg_id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
}

export interface UserNameLike {
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}
