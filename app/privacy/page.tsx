import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-2xl items-center px-8">
          <Logo href="/" />
        </nav>
      </header>

      <div className="max-w-2xl mx-auto px-8 py-12">
        <h1 className="text-3xl font-semibold text-slate-900 mb-8">プライバシーポリシー</h1>
        <p className="text-sm text-slate-400 mb-8">最終更新日：2026年6月25日</p>

        <div className="space-y-8 text-slate-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第1条（個人情報の収集）</h2>
            <p>本サービスでは、以下の個人情報を収集します。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>メールアドレス</li>
              <li>お名前</li>
              <li>学習履歴・演習結果</li>
              <li>アップロードされた教材ファイル</li>
              <li>アクセスログ・利用状況（IPアドレス、ブラウザ情報、操作履歴等）</li>
              <li>Cookie等の識別情報</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第2条（個人情報の利用目的）</h2>
            <p>収集した個人情報は以下の目的で利用します。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>本サービスの提供・運営</li>
              <li>ユーザーへのお問い合わせ対応</li>
              <li>サービス改善のための分析</li>
              <li>重要なお知らせの送信</li>
              <li>不正利用の検知・防止</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第3条（Cookieの使用）</h2>
            <p>本サービスでは、ログイン状態の維持やサービス改善のためにCookieを使用しています。ブラウザの設定によりCookieを無効にすることができますが、その場合、一部機能が正常に動作しない場合があります。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第4条（第三者への提供）</h2>
            <p>運営者は、以下の場合を除き、個人情報を第三者に提供しません。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命・身体・財産の保護のために必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第5条（利用する外部サービス）</h2>
            <p>本サービスでは以下の外部サービスを利用しており、サービスの性質上、必要な情報が各社に提供される場合があります。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Supabase（データベース・認証）</li>
              <li>Vercel（ホスティング）</li>
              <li>Anthropic（AI問題生成 ※アップロードされた教材画像・テキストが送信されます）</li>
              <li>Stripe, Inc.（決済処理 ※クレジットカード情報はStripeが管理し、運営者のサーバーには保存されません）</li>
            </ul>
            <p className="mt-2">各サービスのプライバシーポリシーについては、各社のウェブサイトをご確認ください。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第6条（個人情報の保存期間）</h2>
            <p>収集した個人情報は、利用目的の達成に必要な期間保存します。アカウント削除後は、法令上の保存義務がある場合を除き、速やかに削除します。なお、アップロードされた教材ファイルはアカウント削除時に合わせて削除されます。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第7条（個人情報の管理）</h2>
            <p>運営者は、個人情報の漏洩・滅失・毀損を防止するため、適切なセキュリティ対策を講じます。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第8条（個人情報の開示・訂正・削除）</h2>
            <p>ユーザーは、自身の個人情報の開示・訂正・削除を請求できます。下記お問い合わせ先よりご連絡ください。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第9条（プライバシーポリシーの変更）</h2>
            <p>本ポリシーの内容は、法令の変更やサービスの改善に伴い変更することがあります。変更後のポリシーは本ページに掲載した時点で効力を生じます。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-900 mb-3">第10条（お問い合わせ）</h2>
            <p>本ポリシーに関するお問い合わせは下記までご連絡ください。<br />メールアドレス：harumaru0723@yahoo.co.jp</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4">
          <Link href="/terms" className="text-sm text-emerald-600 hover:underline">利用規約</Link>
          <Link href="/accuracy" className="text-sm text-emerald-600 hover:underline">AIの正確性・免責について</Link>
          <Link href="/" className="text-sm text-slate-500 hover:underline">トップページへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
