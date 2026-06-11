import type { Metadata, Viewport } from 'next';
import './globals.css';
import VersionChecker from '@/components/VersionChecker';

export const metadata: Metadata = {
  title: 'MediQuiz AI — 医療系大学生のAI問題生成アプリ',
  description: '授業スライドをアップロードするだけでAIが問題を自動生成。',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'MediQuiz AI',
  },
};

export const viewport: Viewport = {
  themeColor: '#16a34a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5060063469296808"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <VersionChecker />
        {children}
      </body>
    </html>
  );
}
