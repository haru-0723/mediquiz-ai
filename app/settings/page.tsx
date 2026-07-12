'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getEffectivePlan, getPlanExpiry } from '@/lib/planUtils';
import Navbar from '@/components/Navbar';

export default function SettingsPage() {
  const supabase = createClient();
  const [plan, setPlan] = useState('free');
  const [isTrial, setIsTrial] = useState(false);
  const [planExpiresAt, setPlanExpiresAt] = useState<string | null>(null);
  const [planCredits, setPlanCredits] = useState<number | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [grade, setGrade] = useState('');
  const [targetExam, setTargetExam] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      setName(user.user_metadata?.name ?? '');
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setPlan(getEffectivePlan(profile));
        setIsTrial(!!profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date());
        setPlanExpiresAt(getPlanExpiry(profile));
        setPlanCredits(typeof profile.generate_credits === 'number' ? profile.generate_credits : null);
        setStripeCustomerId(profile.stripe_customer_id ?? null);
        setUniversity(profile.university ?? '');
        setDepartment(profile.department ?? '');
        setGrade(profile.grade ? String(profile.grade) : '');
        setTargetExam(profile.target_exam ?? '');
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSaveProfile() {
    setSaving(true);
    setSaved(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 名前をauth.usersに更新
      await supabase.auth.updateUser({ data: { name } });

      // プロフィールをprofilesテーブルに更新
      await supabase.from('profiles').update({
        name,
        university: university || null,
        department: department || null,
        grade: grade ? parseInt(grade) : null,
        target_exam: targetExam || null,
      }).eq('id', user.id);

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('本当にアカウントを削除しますか？\nすべてのデータが失われます。この操作は取り消せません。')) return;
    if (!confirm('最終確認：本当に削除してよいですか？')) return;
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (res.ok) {
        await supabase.auth.signOut();
        window.location.href = '/';
      } else {
        alert('削除に失敗しました。しばらくしてからお試しください。');
      }
    } catch {
      alert('エラーが発生しました。');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-xl mx-auto p-8 space-y-6">
        <h1 className="text-2xl font-semibold text-slate-900">設定</h1>

        {/* プロフィール編集 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">プロフィール編集</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">お名前</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="田中 さくら" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">メールアドレス</label>
              <p className="text-sm text-slate-900 px-4 py-2.5 bg-slate-50 rounded-xl">{email}</p>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">大学名</label>
              <input type="text" value={university} onChange={e => setUniversity(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="例：○○大学" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">学部・学科</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="例：医学部医学科" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">目指している国試</label>
              <select value={targetExam} onChange={e => setTargetExam(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">選択してください</option>
                <option value="medical">医師国家試験</option>
                <option value="pharmacy">薬剤師国家試験</option>
                <option value="nursing">看護師国家試験</option>
                <option value="pt">理学療法士国家試験</option>
                <option value="ot">作業療法士国家試験</option>
                <option value="st">言語聴覚士国家試験</option>
                <option value="dental">歯科医師国家試験</option>
                <option value="other">その他</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">学年</label>
              <select value={grade} onChange={e => setGrade(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">選択してください</option>
                <option value="1">1年生</option>
                <option value="2">2年生</option>
                <option value="3">3年生</option>
                <option value="4">4年生</option>
                <option value="5">5年生</option>
                <option value="6">6年生</option>
              </select>
            </div>
            <button onClick={handleSaveProfile} disabled={saving}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
              {saving ? '保存中...' : saved ? '✅ 保存しました！' : 'プロフィールを保存'}
            </button>
          </div>
        </div>

        {/* プラン */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">プラン</h2>
          <div className={`p-4 rounded-xl mb-4 ${plan === 'premium' ? 'bg-purple-50 border border-purple-200' : plan === 'standard' ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50'}`}>
            <p className="text-sm font-semibold text-slate-900">
              {plan === 'premium' ? '👑 プレミアムプラン' : plan === 'standard' ? '⭐ 有料プラン' : '無料プラン'}
              {isTrial && <span className="ml-2 text-xs font-medium text-emerald-600">無料トライアル中</span>}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {isTrial
                ? '1ヶ月間、有料プランを無料でご利用中です'
                : (plan === 'standard' || plan === 'premium')
                  ? (planExpiresAt
                      ? `有効期限：${new Date(planExpiresAt).toLocaleDateString('ja-JP')} まで（買い切り・自動更新なし）`
                      : '有料プランをご利用中です')
                  : '一部機能に制限あり'}
            </p>
            {planExpiresAt && planCredits !== null && (
              <p className="text-xs text-slate-500 mt-1">
                AI生成の残り教材クレジット：<span className="font-medium text-slate-700">{planCredits}件</span>
              </p>
            )}
          </div>
          {isTrial ? (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-xs text-emerald-700">
              🎁 トライアル終了後は自動的に無料プランに戻ります（自動課金はされません）。引き続きご利用の場合はプランをご購入ください。
            </div>
          ) : (plan === 'standard' || plan === 'premium') && planExpiresAt ? (
            <div className="space-y-3">
              <div className="bg-sky-50 border border-sky-100 rounded-xl px-4 py-3 text-xs text-sky-700">
                💡 買い切りプランです。<span className="font-medium">自動更新（自動課金）はありません</span>。期限が切れると無料プランに戻ります。期間はいつでも買い足せます。
              </div>
              <Link href="/pricing"
                className="block w-full text-center bg-emerald-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-emerald-700 transition-colors">
                プランを買い足す / 更新する
              </Link>
            </div>
          ) : (
            <Link href="/pricing"
              className="block w-full text-center bg-emerald-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-emerald-700 transition-colors">
              有料プランを購入する
            </Link>
          )}
        </div>

        {/* パスワード変更 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">パスワード変更</h2>
          <Link href="/auth/reset"
            className="block w-full text-center border border-slate-200 rounded-xl py-3 text-sm text-slate-600 hover:border-slate-300 transition-colors">
            パスワードをリセットする
          </Link>
        </div>

{/* 危険な操作 */}
        <div className="bg-white rounded-2xl border border-rose-100 p-6">
          <h2 className="font-semibold text-rose-600 mb-4">アカウント削除</h2>
          <p className="text-sm text-slate-500 mb-4">アカウントを削除すると、すべてのデータが失われます。この操作は取り消せません。</p>
          <button onClick={handleDeleteAccount}
            className="w-full border border-rose-200 text-rose-400 rounded-xl py-3 text-sm hover:border-rose-400 hover:text-rose-600 transition-colors">
            アカウントを削除する
          </button>
        </div>
      </div>
    </div>
  );
}
