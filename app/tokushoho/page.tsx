import Link from 'next/link';

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="flex items-center justify-between px-8 py-4 border-b">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-green-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-bold text-gray-900">MediQuiz AI</span>
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">特定商取引法に基づく表記</h1>
        <p className="text-sm text-gray-500 mb-10">最終更新日：2026年6月25日</p>

        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top w-40">販売業者</td>
              <td className="py-4 text-gray-600">
                MediQuiz AI 運営者<br />
                ※プロバイダ責任制限法に基づく開示請求があった場合のみ、本名を開示します。
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">所在地</td>
              <td className="py-4 text-gray-600">
                開示請求があった場合のみ開示します。
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">連絡先</td>
              <td className="py-4 text-gray-600">
                メールアドレス：<a href="mailto:harumaru0723@yahoo.co.jp" className="text-blue-600 underline">harumaru0723@yahoo.co.jp</a><br />
                ※メールにてお問い合わせください。電話番号は開示請求があった場合のみ開示します。
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">サービス名</td>
              <td className="py-4 text-gray-600">MediQuiz AI</td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">販売価格</td>
              <td className="py-4 text-gray-600">
                スタンダードプラン：¥1,980／月（税込）<br />
                プレミアムプラン：¥3,480／月（税込）<br />
                ※価格は予告なく変更する場合があります。変更前に本サービス上でお知らせします。
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">支払方法</td>
              <td className="py-4 text-gray-600">
                クレジットカード（Visa・Mastercard・JCB・American Express 等）<br />
                ※決済はStripeを通じて処理されます。カード情報は当サービスのサーバーには保存されません。
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">支払時期</td>
              <td className="py-4 text-gray-600">
                サブスクリプション登録時に初回課金が発生し、以降は毎月同日に自動更新されます。
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">サービス提供時期</td>
              <td className="py-4 text-gray-600">
                決済完了後、即時にご利用いただけます。
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">返品・キャンセル</td>
              <td className="py-4 text-gray-600">
                デジタルコンテンツの性質上、原則として返金には応じておりません。<br />
                解約はアカウント設定ページからいつでも行えます。解約後は当月末日までサービスをご利用いただけます。<br />
                解約後の日割り返金は行っておりません。
              </td>
            </tr>
            <tr className="border-t border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">動作環境</td>
              <td className="py-4 text-gray-600">
                インターネット接続環境が必要です。推奨ブラウザ：Google Chrome、Safari、Firefox、Edge の最新版。
              </td>
            </tr>
            <tr className="border-t border-b border-gray-200">
              <td className="py-4 pr-6 font-medium text-gray-700 align-top">その他</td>
              <td className="py-4 text-gray-600">
                本サービスはAIが生成した問題を提供するものであり、医療的アドバイスや正確性を保証するものではありません。詳細は<Link href="/terms" className="text-blue-600 underline">利用規約</Link>をご確認ください。
              </td>
            </tr>
          </tbody>
        </table>
      </main>
    </div>
  );
}
