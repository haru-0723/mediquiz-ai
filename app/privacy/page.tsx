import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold">MediQuiz AI</span>
        </Link>
      </nav>

      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">プライバシーポリシー</h1>
        <p className="text-sm text-gray-400 mb-8">最終更新日：2026年5月28日</p>

        <div className="space-y-8 text-gray-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第1条（個人情報の収集）</h2>
            <p>本サービスでは、以下の個人情報を収集します。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>メールアドレス</li>
              <li>お名前</li>
              <li>学習履歴・演習結果</li>
              <li>アップロードされた教材ファイル</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第2条（個人情報の利用目的）</h2>
            <p>収集した個人情報は以下の目的で利用します。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>本サービスの提供・運営</li>
              <li>ユーザーへのお問い合わせ対応</li>
              <li>サービス改善のための分析</li>
              <li>重要なお知らせの送信</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第3条（第三者への提供）</h2>
            <p>運営者は、以下の場合を除き、個人情報を第三者に提供しません。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第4条（利用するサービス）</h2>
            <p>本サービスでは以下の外部サービスを利用しています。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Supabase（データベース・認証）</li>
              <li>Vercel（ホスティング）</li>
              <li>Anthropic（AI問題生成）</li>
            </ul>
            <p className="mt-2">各サービスのプライバシーポリシーについては、各社のウェブサイトをご確認ください。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第5条（個人情報の管理）</h2>
            <p>運営者は、個人情報の漏洩・滅失・毀損を防止するため、適切なセキュリティ対策を講じます。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第6条（個人情報の開示・訂正・削除）</h2>
            <p>ユーザーは、自身の個人情報の開示・訂正・削除を請求できます。お問い合わせフォームよりご連絡ください。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第7条（プライバシーポリシーの変更）</h2>
            <p>本ポリシーの内容は、法令の変更やサービスの改善に伴い変更することがあります。変更後のポリシーは本ページに掲載した時点で効力を生じます。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第8条（お問い合わせ）</h2>
            <p>本ポリシーに関するお問い合わせは、サービス内のお問い合わせフォームよりご連絡ください。</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link href="/terms" className="text-sm text-green-600 hover:underline mr-6">利用規約</Link>
          <Link href="/" className="text-sm text-gray-500 hover:underline">トップページへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
