const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const geminiApiVersion = process.env.GEMINI_API_VERSION ?? 'v1';
const geminiFallbackVersion =
  process.env.GEMINI_FALLBACK_API_VERSION ?? (geminiApiVersion === 'v1' ? 'v1beta' : 'v1');

export const config = {
  databaseUrl: process.env.DATABASE_URL,
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: parseNumber(process.env.POSTGRES_PORT, 5432),
    user: process.env.POSTGRES_USER ?? 'app',
    password: process.env.POSTGRES_PASSWORD ?? 'app_password',
    database: process.env.POSTGRES_DB ?? 'chat_analytics'
  },
  analyzeMessageLimit: parseNumber(process.env.ANALYZE_MESSAGE_LIMIT, 80),
  analyzeLookbackDays: parseNumber(process.env.ANALYZE_LOOKBACK_DAYS, 30),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? '',
    model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
    apiVersion: geminiApiVersion,
    fallbackApiVersion: geminiFallbackVersion
  }
};
