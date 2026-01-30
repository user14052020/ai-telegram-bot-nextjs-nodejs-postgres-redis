'use client';

import type { ReactNode } from 'react';
import { MantineProvider } from '@mantine/core';

export const Providers = ({ children }: { children: ReactNode }) => {
  return <MantineProvider>{children}</MantineProvider>;
};
