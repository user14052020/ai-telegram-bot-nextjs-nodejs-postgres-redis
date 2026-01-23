export const formatDateKey = (value?: Date | null): string => {
  if (!value) return 'none';
  return value.toISOString().slice(0, 10);
};

export const buildStatsCacheKey = (params: {
  scope: 'top' | 'user' | 'keywords';
  chatId: number;
  rangeKey?: string | null;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
  userId?: number | null;
}): string => {
  const rangeKey = params.rangeKey ?? 'custom';
  const start = formatDateKey(params.rangeStart);
  const end = formatDateKey(params.rangeEnd);
  const user = params.userId ? `:user:${params.userId}` : '';
  return `stats:${params.scope}:${params.chatId}${user}:${rangeKey}:${start}:${end}`;
};
