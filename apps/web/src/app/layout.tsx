import type { Metadata } from 'next';
import { Epilogue, Geist } from 'next/font/google';

import { AuthGate } from '@/components/layout/auth-gate';
import { Toaster } from '@/components/ui/sonner';
import { APP_DESCRIPTION, APP_NAME } from '@/lib/env';
import { cn } from '@/lib/utils';
import { AuthProvider } from '@/providers/auth-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';

import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const epilogue = Epilogue({ subsets: ['latin'], variable: '--font-epilogue' });

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn('font-sans', geist.variable, epilogue.variable)}
    >
      <body className="antialiased">
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <AuthGate>{children}</AuthGate>
              <Toaster position="bottom-right" richColors closeButton />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
