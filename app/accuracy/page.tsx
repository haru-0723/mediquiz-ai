import Link from 'next/link';

export default function AccuracyPage() {
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
        <h1 className="text-3xl font-semibold text-gray-900 mb-3">AIの正確性・免責について</h1>
        <p className="text-sm text-gray-400 mb-10">AI生成コンテンツの品質・限界・推奨する使い方</p>

        <div className="space-y-10 text-gray-600 text-sm leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">使用しているAI</h2>
            <p>
              MediQuiz AIでは、Anthropic社が開発したAI「Claude」を使用して問題・解説を生成しています。
              生成された問題は本サービスのサーバー上で管理され、学習支援のみを目的として提供しています。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">品質向上への取り組み</h2>
            <p className="mb-4">
              生成の質を高めるため、各国家試験の出題基準・学会ガイドラインに基づいて出題するよう設計しています。
              具体的には以下の資料を参照するようAIに指示しています。
            </p>
            <div className="space-y-3">
              {[
                {
                  label: '医師国家試験',
                  sources: '医師国家試験出題基準（厚生労働省）、医学教育モデル・コアカリキュラム（文部科学省）、各診療科学会の診療ガイドライン',
                },
                {
                  label: '薬剤師国家試験',
                  sources: '薬剤師国家試験出題基準（厚生労働省）、薬学教育モデル・コアカリキュラム（文部科学省）、日本薬局方、日本薬学会・各学会のガイドライン',
                },
                {
                  label: '看護師国家試験',
                  sources: '看護師国家試験出題基準（厚生労働省）、看護学教育モデル・コアカリキュラム（文部科学省）、日本看護協会のガイドライン',
                },
                {
                  label: '理学療法士国家試験',
                  sources: '理学療法士国家試験出題基準（厚生労働省）、理学療法士養成施設カリキュラム、日本理学療法士協会のガイドライン',
                },
                {
                  label: '作業療法士国家試験',
                  sources: '作業療法士国家試験出題基準（厚生労働省）、作業療法士養成施設カリキュラム、日本作業療法士協会のガイドライン',
                },
                {
                  label: '言語聴覚士国家試験',
                  sources: '言語聴覚士国家試験出題基準（厚生労働省）、言語聴覚士養成施設カリキュラム、日本言語聴覚士協会のガイドライン',
                },
                {
                  label: '歯科医師国家試験',
                  sources: '歯科医師国家試験出題基準（厚生労働省）、歯科医学教育モデル・コアカリキュラム（文部科学省）、日本歯科医学会・各学会の最新ガイドライン',
                },
              ].map(({ label, sources }) => (
                <div key={label} className="bg-gray-50 rounded-xl p-4">
                  <p className="font-medium text-gray-800 mb-1">{label}</p>
                  <p className="text-gray-500 text-xs leading-relaxed">{sources}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">ハルシネーション抑制への取り組み</h2>
            <p>
              AIが不正確な情報を生成してしまう現象（ハルシネーション）を最小化するため、
              「確信が持てない情報は出題しない」「曖昧な内容や見解が分かれる内容は避ける」
              という指示をAIに与えています。
              また、解説には「正解の理由」だけでなく「他の選択肢が誤りである理由」も含めるよう設計しています。
            </p>
          </section>

          <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="text-base font-semibold text-amber-800 mb-2">⚠️ ご利用にあたっての注意</h2>
            <p className="text-amber-700 text-sm leading-relaxed">
              上記の取り組みにより精度の向上を図っていますが、AIの性質上、まれに不正確な情報が含まれる可能性をゼロにすることはできません。
              <strong className="font-semibold">解説の内容は必ず教科書・公式テキスト・学会ガイドラインと照らし合わせてご確認ください。</strong>
              本サービスは学習支援を目的としており、医療行為の判断や診断に使用することはできません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">推奨する使い方</h2>
            <ul className="space-y-2">
              {[
                '教科書・参考書で基礎を学んだあと、理解度を確認するために使う',
                '解説を読んで疑問が生じた場合は、公式の出題基準や教科書で必ず確認する',
                '模試・過去問と並行して補助的な演習ツールとして活用する',
                '解説の内容を丸暗記するのではなく、理解の足がかりとして使う',
              ].map((text) => (
                <li key={text} className="flex items-start gap-2">
                  <span className="text-green-500 font-bold flex-shrink-0 mt-0.5">✓</span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">誤りを発見した場合</h2>
            <p>
              問題・解説に誤りを発見した場合は、問題ページの「報告」ボタンからご連絡ください。
              いただいた報告は管理者が確認し、内容の修正または削除を行います。
              ご協力いただくことで、他のユーザーの学習環境の改善につながります。
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t flex flex-wrap gap-4">
          <Link href="/terms" className="text-sm text-green-600 hover:underline">利用規約</Link>
          <Link href="/privacy" className="text-sm text-green-600 hover:underline">プライバシーポリシー</Link>
          <Link href="/" className="text-sm text-gray-500 hover:underline">トップページへ戻る</Link>
        </div>
      </div>
    </div>
  );
}
