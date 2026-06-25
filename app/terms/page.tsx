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
              <li>1つのアカウントを複数人で共有する行為</li>
              <li>本サービスを利用して生成した問題・解説を第三者に配布・販売する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">第3条の2（著作物のアップロードに関する注意）</h2>
            <p>ユーザーは、教科書・参考書・講義資料等の著作物をアップロードする場合、著作権法上の私的複製（個人の学習目的）の範囲内でのみ利用できます。以下の行為は著作権法に違反するおそれがあるため禁止します。</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>著作権者の許諾なく、第三者と共有することを目的としたアップロード</li>
              <li>アップロードした著作物をもとに生成した問題を、サークル・学校・塾・予備校等で不特定多数に配布する行為</li>
              <li>私的利用の範囲を超えた複製・利用</li>
            </ul>
            <p className="mt-3">本サービスは個人の学習支援を目的としており、アップロードされた著作物の適法性についてはユーザー自身が責任を負うものとします。</p>
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
            <p className="mt-3">本サービスのAIが生成した問題・解説は学習支援を目的としており、内容の正確性・完全性を保証するものではありません。医療行為の判断には使用しないでください。</p>
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

        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4">
          <Link href="/privacy" className="text-sm text-green-600 hover:underline">プライバシーポリシー</Link>
          <Link href="/accuracy" className="text-sm text-green-600 hover:underline">AIの正確性・免責について</Link>
          <Link href="/" className="text-sm text-gray-500 hover:underline">トップページへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
