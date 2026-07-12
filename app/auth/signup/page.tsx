'use client';

import type React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Target, BarChart3, FolderClosed, User, Mail, Lock, Ticket, ArrowRight, Loader2, MailCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/brand/Logo';

const FEATURES = [
  { icon: Sparkles, title: 'AIが問題を自動生成', desc: '授業スライドをアップロードするだけで4択問題が完成' },
  { icon: Target, title: 'CBT・国試モード', desc: '本番さながらの模試で実力を測れる' },
  { icon: BarChart3, title: '苦手分野を自動分析', desc: '正解率から苦手科目を特定して効率的に復習' },
  { icon: FolderClosed, title: '問題をフォルダ管理', desc: '科目ごとに整理してPDFで印刷も可能' },
];

const INPUT_CLASS = 'w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-900 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

export default function SignupPage() {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');
  const [trialApplied, setTrialApplied] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!ageConfirmed) {
      setError('13歳以上であることを確認してください');
      return;
    }
    setLoading(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (partnerCode.trim() && data.user) {
      try {
        const res = await fetch('/api/auth/apply-partner-trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: data.user.id, code: partnerCode.trim() }),
        });
        if (res.ok) setTrialApplied(true);
        else {
          const json = await res.json();
          setError(json.error ?? '招待コードが無効です');
          setLoading(false);
          return;
        }
      } catch {
        setError('招待コードの確認中にエラーが発生しました');
        setLoading(false);
        return;
      }
    }

    setDone(true);
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <MailCheck className="h-7 w-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">確認メールを送信しました</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {email} に確認メールを送りました。
            <br />
            メール内のリンクをクリックしてアカウントを有効化してください。
          </p>
          {trialApplied && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              招待コードが適用されました。アカウント有効化後、1ヶ月間、有料プランの機能を無料でお使いいただけます。
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen">
      {/* 左パネル（PCのみ） */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-emerald-600 p-12 text-white lg:flex lg:w-[52%]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_55%)]" />
        <div className="relative">
          <Logo href="/" variant="onColor" />
          <p className="mt-16 text-sm font-medium tracking-widest text-white/70">FOR MEDICAL STUDENTS</p>
          <h2 className="mt-3 text-4xl font-bold leading-tight">
            国試合格への
            <br />
            最短ルート
          </h2>
          <p className="mt-4 max-w-sm text-base leading-relaxed text-white/80">
            看護・医学・薬学系の大学生向け。AIが教材から問題を自動生成し、あなたの合格を全力でサポートします。
          </p>

          <div className="mt-12 grid gap-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-[18px] w-[18px] text-white" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{f.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/70">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="relative mt-8 text-xs text-white/40">© 2026 MediQuiz AI</p>
      </div>

      {/* 右パネル：登録フォーム */}
      <div className="flex flex-1 items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">アカウント作成</h1>
            <p className="mt-1 text-sm text-slate-500">無料で今すぐ始められます</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleSignup} className="space-y-5">
              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <Field label="お名前" icon={User}>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={INPUT_CLASS} placeholder="田中 さくら" />
              </Field>

              <Field label="メールアドレス" icon={Mail}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT_CLASS} placeholder="example@university.ac.jp" />
              </Field>

              <Field label="パスワード" icon={Lock}>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className={INPUT_CLASS} placeholder="6文字以上" />
              </Field>

              <Field label="招待コード（任意）" icon={Ticket}>
                <input type="text" value={partnerCode} onChange={(e) => setPartnerCode(e.target.value)} className={`${INPUT_CLASS} uppercase placeholder:normal-case`} placeholder="塾や学校から配布されたコード" />
              </Field>

              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  checked={ageConfirmed}
                  onChange={(e) => setAgeConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 flex-shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-xs leading-relaxed text-slate-500">私は13歳以上です</span>
              </label>

              <button
                type="submit"
                disabled={loading || !ageConfirmed}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    処理中...
                  </>
                ) : (
                  <>
                    無料で始める
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/auth/login" className="font-medium text-emerald-600 hover:underline">
              ログイン
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-slate-400">
            登録することで
            <Link href="/terms" className="mx-1 underline hover:text-slate-600">利用規約</Link>
            および
            <Link href="/privacy" className="mx-1 underline hover:text-slate-600">プライバシーポリシー</Link>
            に同意したものとみなされます。
          </p>
        </div>
      </div>
    </main>
  );
}

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </div>
  );
}
