import '@/app/globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Chat Analytics',
  description: 'Аналитика пользователей чата через Gemini'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
