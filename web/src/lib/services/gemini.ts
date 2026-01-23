import { config } from '@/lib/config';

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

export const generateWithGemini = async (prompt: string): Promise<string> => {
  if (!config.gemini.apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const buildEndpoint = (apiVersion: string) =>
    `https://generativelanguage.googleapis.com/${apiVersion}/models/${config.gemini.model}:generateContent?key=${config.gemini.apiKey}`;

  const request = async (apiVersion: string) =>
    fetch(buildEndpoint(apiVersion), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

  let response = await request(config.gemini.apiVersion);
  if (!response.ok && response.status === 404 && config.gemini.fallbackApiVersion) {
    response = await request(config.gemini.fallbackApiVersion);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini error: ${response.status} ${errorText}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  return text || 'Gemini не вернул текст.';
};
