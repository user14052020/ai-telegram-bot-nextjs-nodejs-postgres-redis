'use client';

import { useCallback, useState } from 'react';
import type { AnalysisResult } from './types';

export const useUserAnalysis = () => {
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(async () => {
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
  }, [username]);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return {
    username,
    setUsername,
    result,
    error,
    loading,
    analyze,
    reset
  };
};
