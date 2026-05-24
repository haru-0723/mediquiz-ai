import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold">MediQuiz AI</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/auth/login" className="text-sm">ログイン</Link>
          <Link href="/auth/signup" className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg">
            無料で始める
          </Link>
        </div>
      </nav>

      <section className="max-w-3xl mx-auto text-center px-8 py-24">
        <h1 className="text-5xl font-semibold mb-6">
          授業スライドをアップロードするだけで<br />
          <span className="text-green-600">AIが問題を自動生成</span>
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          看護・医学・薬学・リハビリ系の大学生向け。
        </p>
        <Link href="/auth/signup" className="inline-block bg-green-600 text-white px-8 py-3 rounded-xl font-medium">
          無料で始める
        </Link>
      </section>
    </div>
  );
}
