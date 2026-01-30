import '@mantine/core/styles.css';
import '@/app/globals.css';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Providers } from '@/app/providers';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Chat Analytics',
  description: 'Аналитика пользователей чата через Gemini'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
