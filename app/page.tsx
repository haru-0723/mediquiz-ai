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
          資料をアップロードするだけで<br />
          <span className="text-green-600">AIが問題を自動生成</span>
        </h1>
        <p className="text-lg text-gray-600 mb-10">
          看護・医学・薬学・リハビリ系の大学生向け。
        </p>
       <Link href="/auth/signup" className="inline-block bg-green-600 text-white px-8 py-3 rounded-xl font-medium">
          無料で始める
        </Link>
      </section>

      <section className="max-w-3xl mx-auto px-8 pb-24">
        <h2 className="text-center text-2xl font-semibold text-gray-900 mb-12">使い方はかんたん3ステップ</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">📂</div>
            <div className="text-xs font-semibold text-green-600 mb-2">STEP 1</div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">資料をアップロード</h3>
            <p className="text-sm text-gray-500 leading-relaxed">授業スライドやノートをそのままアップロードするだけ。</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <div className="text-xs font-semibold text-green-600 mb-2">STEP 2</div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">AIが問題を自動生成</h3>
            <p className="text-sm text-gray-500 leading-relaxed">AIが内容を読み取り、試験に出やすい問題を自動で作成。</p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <div className="text-xs font-semibold text-green-600 mb-2">STEP 3</div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">演習して実力アップ</h3>
            <p className="text-sm text-gray-500 leading-relaxed">解説付きの問題を繰り返し解いて、確実に定着させよう。</p>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 px-8 flex justify-between items-center text-sm text-gray-400">
        <span>© 2026 MediQuiz AI</span>
        <div className="flex gap-6">
          <Link href="/terms" className="hover:text-gray-600">利用規約</Link>
          <Link href="/privacy" className="hover:text-gray-600">プライバシーポリシー</Link>
          <Link href="/tokushoho" className="hover:text-gray-600">特定商取引法</Link>
        </div>
      </footer>
    </div>
  );
}
