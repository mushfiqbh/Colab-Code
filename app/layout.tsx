import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { MonacoPreloader } from '@/components/monaco-preloader';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Colab Code - Share Proejct Codes Instantly',
  description: 'Create, edit, and share code snippets without login. Perfect for collaboration and code reviews.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MonacoPreloader />
        {children}
      </body>
    </html>
  );
}
