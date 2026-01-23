'use client';

import { useState } from 'react';

interface AnalysisResult {
  analysis: string;
  messageCount: number;
  displayName: string;
  lookbackDays: number;
}

export default function HomePage() {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = username.trim();
    if (!value) {
      setError('Введите @username.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: value })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error ?? 'Ошибка анализа');
        return;
      }
      setResult({
        analysis: data.analysis,
        messageCount: data.messageCount,
        displayName: data.displayName,
        lookbackDays: data.lookbackDays
      });
    } catch {
      setError('Не удалось связаться с сервером.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="panel">
        <header className="header">
          <p className="eyebrow">Chat Intelligence</p>
          <h1>Анализ пользователей чата</h1>
          <p className="subtitle">
            Введите @username, чтобы получить краткий разбор стиля общения, тем и активности.
          </p>
        </header>

        <form className="form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              placeholder="@john_doe"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Анализируем...' : 'Анализировать'}
          </button>
        </form>

        {error && <p className="error">{error}</p>}

        {result && (
          <section className="result">
            <div className="result-header">
              <h2>Анализ пользователя {result.displayName}</h2>
              <span>
                {result.messageCount} сообщений за {result.lookbackDays} дней
              </span>
            </div>
            <pre>{result.analysis}</pre>
          </section>
        )}
      </section>
      <footer className="footer">Telegram Analytics · Gemini API</footer>
    </main>
  );
}
