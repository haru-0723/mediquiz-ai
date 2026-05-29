import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MediQuiz AI — 医療系大学生のAI問題生成アプリ',
  description: '授業スライドをアップロードするだけでAIが問題を自動生成。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5060063469296808"
     crossorigin="anonymous"></script>"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
