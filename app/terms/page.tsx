import Link from 'next/link';

export default function TermsPage() {
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
        <h1 className="text-3xl font-semibold text-gray-900 mb-8">利用規約</h1>
        <p className="text-sm text-gray-400 mb-8">最終更新日：2026年5月28日</p>

        <div className="space-y-8 text-gray-600 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第1条（適用）</h2>
            <p>本規約は、MediQuiz AI（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーの皆さまには本規約に同意の上、本サービスをご利用いただきます。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第2条（利用登録）</h2>
            <p>登録希望者が所定の方法によって利用登録を申請し、運営者がこれを承認することによって、利用登録が完了します。未成年者が利用する場合は、保護者の同意が必要です。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第3条（禁止事項）</h2>
            <p>ユーザーは以下の行為をしてはなりません。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>本サービスのサーバーやネットワークに過度な負荷をかける行為</li>
              <li>他のユーザーの個人情報を収集・蓄積する行為</li>
              <li>不正アクセスをし、またはこれを試みる行為</li>
              <li>本サービスを商業目的で無断利用する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第4条（本サービスの提供の停止等）</h2>
            <p>運営者は、以下の場合に事前通知なく本サービスの提供を停止・中断することがあります。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>本サービスにかかるシステムの保守・点検を行う場合</li>
              <li>地震・落雷・火災・停電などの不可抗力により、本サービスの提供が困難な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第5条（免責事項）</h2>
            <p>本サービスで提供する問題・解説は学習支援を目的としており、医療行為の正確性を保証するものではありません。運営者は本サービスの利用によって生じた損害について、一切の責任を負いません。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第6条（サービス内容の変更等）</h2>
            <p>運営者は、ユーザーへの事前通知なく本サービスの内容を変更・停止することができます。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第7条（準拠法・裁判管轄）</h2>
            <p>本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、運営者の所在地を管轄する裁判所を専属的合意管轄とします。</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link href="/privacy" className="text-sm text-green-600 hover:underline mr-6">プライバシーポリシー</Link>
          <Link href="/" className="text-sm text-gray-500 hover:underline">トップページへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
