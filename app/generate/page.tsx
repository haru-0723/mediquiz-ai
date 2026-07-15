'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import ErrorBanner from '@/components/ErrorBanner';
import ExplainButton from '@/components/ExplainButton';

type Folder = { id: string; name: string; };
type Material = { id: string; title: string; subject: string | null; folder_id: string | null; unit_id: string | null; };
type Question = { question: string; options: string[]; answer: string; explanation: string; difficulty: string; };

export default function GeneratePage() {
  const supabase = createClient();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('すべて');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([]);
  const [count, setCount] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState('');
  const [limitedNotice, setLimitedNotice] = useState('');
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ correct: boolean }[]>([]);
  const [phase, setPhase] = useState<'select' | 'quiz' | 'result'>('select');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [saveFolderId, setSaveFolderId] = useState('');
  const [newSaveFolderName, setNewSaveFolderName] = useState('');
  const [showNewSaveFolder, setShowNewSaveFolder] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('内容が間違っている');
  const [reportedSet, setReportedSet] = useState<Set<number>>(new Set<number>());
  const [submittingReport, setSubmittingReport] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showCheckDialog, setShowCheckDialog] = useState(false);
  const [checkIssues, setCheckIssues] = useState('');
  const [supplementText, setSupplementText] = useState('');
  const [format, setFormat] = useState<'4択' | '○×' | '穴埋め'>('4択');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: folderData }, { data: materialData }] = await Promise.all([
        supabase.from('folders').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      if (folderData) setFolders(folderData);
      if (materialData) setMaterials(materialData);
    }
    load();
  }, []);

  const filteredMaterials = selectedFolder === 'すべて'
    ? materials
    : selectedFolder === 'なし'
    ? materials.filter(m => !m.folder_id)
    : materials.filter(m => m.folder_id === selectedFolder);

  function toggleMaterial(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedIds(filteredMaterials.map(m => m.id));
  }

  function clearAll() {
    setSelectedIds([]);
  }

  async function handleGenerate() {
    if (selectedIds.length === 0) return;
    setError('');
    setChecking(true);
    try {
      const checkResults = await Promise.all(
        selectedIds.map(id =>
          fetch('/api/generate/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ materialId: id }),
          }).then(res => res.json())
        )
      );
      setChecking(false);
      const issuesList = checkResults.filter(r => r.hasIssues).map(r => r.issues).filter(Boolean);
      if (issuesList.length > 0) {
        setCheckIssues(issuesList.join('\n'));
        setShowCheckDialog(true);
      } else {
        await executeGenerate(supplementText);
      }
    } catch {
      setChecking(false);
      await executeGenerate('');
    }
  }

  async function executeGenerate(supplement: string) {
    setShowCheckDialog(false);
    setGenerating(true);
    setError('');
    setProgress(0);
    setProgressMessage('教材を読み込んでいます...');

    const messages = [
      '教材を読み込んでいます...',
      'AIが画像を認識しています...',
      '問題を作成しています...',
      '選択肢を生成しています...',
      '解説を作成しています...',
      'もうすぐ完成です...',
    ];
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % messages.length;
      setProgressMessage(messages[msgIndex]);
    }, 2000);
    const selectedMats = materials.filter(m => selectedIds.includes(m.id));
    setSelectedMaterials(selectedMats);

    try {
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ materialId: id, count, supplementText: supplement, format }),
          }).then(res => res.json())
        )
      );

      // 成功したもの・上限に達したもの・その他エラーを分ける（並列生成で一部だけ上限に当たる場合に、
      // 成功ぶんを捨ててクレジットを無駄にしないため）
      const succeeded = results.filter(d => Array.isArray(d.questions) && d.questions.length > 0);
      const limited = results.filter(d => d.upgrade);
      const hardError = results.find(d => d.error && !d.upgrade && !(Array.isArray(d.questions) && d.questions.length > 0));
      if (hardError) throw new Error(hardError.error);

      if (succeeded.length === 0) {
        // 全部が上限だった場合のみエラー表示
        setError(limited[0]?.error ?? '問題を生成できませんでした');
        setGenerating(false);
        return;
      }

      // 一部が上限で生成できなかった場合は、成功ぶんで進めつつ知らせる
      setLimitedNotice(limited.length > 0
        ? `${limited.length}件の教材は生成上限（クレジット不足）のため生成できませんでした。`
        : '');

      setProgress(100);
      const allQuestions: Question[] = succeeded.flatMap(data => data.questions);
      setQuestions(allQuestions);
      setCurrent(0);
      setResults([]);
      setSelected(null);
      setAnswered(false);
      setSaved(false);
      setPhase('quiz');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '問題生成に失敗しました');
    } finally {
      setGenerating(false);
      clearInterval(msgInterval);
    }
  }

  async function handleSaveAll() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('ログインが必要です');

      let folderId = saveFolderId || null;

      if (showNewSaveFolder && newSaveFolderName.trim()) {
        const { data: newFolder } = await supabase.from('folders').insert({
          user_id: user.id,
          name: newSaveFolderName.trim(),
        }).select().single();
        if (newFolder) {
          folderId = newFolder.id;
          setFolders(prev => [...prev, newFolder]);
        }
      }

      const { error: insertError } = await supabase.from('questions').insert(
        questions.map(q => ({
          user_id: user.id,
          subject: selectedMaterials[0]?.subject ?? null,
          unit_id: selectedMaterials[0]?.unit_id ?? null,
          question: q.question,
          option_a: q.options[0]?.replace(/^[A-D○×]\. /, '') ?? '',
          option_b: q.options[1]?.replace(/^[A-D○×]\. /, '') ?? '',
          option_c: q.options[2]?.replace(/^[A-D○×]\. /, '') ?? null,
          option_d: q.options[3]?.replace(/^[A-D○×]\. /, '') ?? null,
          answer: q.answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          folder_id: folderId,
        }))
      );
      if (insertError) {
        if (insertError.message.includes('FREE_QUESTION_LIMIT')) {
          throw new Error('無料プランの保存上限（30問）に達しました。有料プランにアップグレードすると無制限に保存できます。');
        }
        throw new Error(insertError.message);
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function handleReport() {
    setSubmittingReport(true);
    try {
      const q = questions[current];
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_data: {
            question: q.question,
            option_a: q.options[0]?.slice(3) ?? '',
            option_b: q.options[1]?.slice(3) ?? '',
            option_c: q.options[2]?.slice(3) ?? '',
            option_d: q.options[3]?.slice(3) ?? '',
            answer: q.answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            subject: selectedMaterials[0]?.subject ?? null,
          },
          reason: reportReason,
        }),
      });
      setReportedSet(prev => { const next = new Set<number>(prev); next.add(current); return next; });
      setShowReportForm(false);
    } finally {
      setSubmittingReport(false);
    }
  }

  function handleReviewWrong() {
    const wrong = questions.filter((_, i) => !results[i]?.correct);
    setQuestions(wrong.sort(() => Math.random() - 0.5));
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setResults([]);
    setPhase('quiz');
  }

  function handleAnswer(opt: string) {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
  }

  async function handleNext() {
    const q = questions[current];
    const selectedKey = format === '○×' ? selected?.charAt(0) : selected?.charAt(0);
    const isCorrect = selectedKey === q.answer;
    const newResults = [...results, { correct: isCorrect }];
    setResults(newResults);
    setShowReportForm(false);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      window.scrollTo(0, 0);
      const correct = newResults.filter(r => r.correct).length;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('quiz_sessions').insert({
          user_id: user.id,
          subject: 'AI生成問題',
          total_questions: newResults.length,
          correct_count: correct,
        });

        // 教材に単元が紐づいていれば、その単元の学習記録（正答率）にも反映する
        const unitId = selectedMaterials[0]?.unit_id;
        if (unitId) {
          fetch('/api/diagnostic-submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ results: [{ unitId, correct, total: newResults.length }] }),
          }).catch(() => {});
        }
      }
      setPhase('result');
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div style={{ width: 40, height: 40, border: '3px solid #059669', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 20px', animation: 'spin 0.8s linear infinite' }} />
          <p className="text-slate-600 font-medium">画像を確認しています...</p>
          <p className="text-sm text-slate-400 mt-2">読み取り品質をチェック中</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (showCheckDialog) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center p-8 min-h-[calc(100vh-60px)]">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full">
            <div className="text-4xl mb-4 text-center">⚠️</div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2 text-center">読み取りにくい部分があります</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-amber-800">{checkIssues}</p>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">補足テキストを入力（任意）</label>
              <textarea
                value={supplementText}
                onChange={e => setSupplementText(e.target.value)}
                placeholder="読み取れなかった部分の内容を補足入力してください..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                rows={3}
              />
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => executeGenerate(supplementText)}
                disabled={!supplementText.trim()}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-40"
              >
                補足を追加して生成する
              </button>
              <button
                onClick={() => executeGenerate('')}
                className="w-full border border-slate-200 text-slate-600 py-3 rounded-xl text-sm font-medium hover:border-slate-300 hover:bg-slate-50"
              >
                このまま生成する
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center max-w-sm w-full px-8">
          <div style={{ width: 48, height: 48, border: '3px solid #059669', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 0.8s linear infinite' }} />
          <p className="text-slate-900 font-semibold text-lg mb-2">問題を生成中...</p>
          <p className="text-emerald-600 text-sm font-medium mb-6 min-h-[20px]">{progressMessage}</p>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-emerald-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-amber-600 mb-2">⏳ 教材を読み取って正確な問題を生成しています。1〜2分ほどお待ちください。</p>
          <p className="text-xs text-slate-400">{selectedIds.length}件の教材を処理中</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (phase === 'result') {
    const correct = results.filter(r => r.correct).length;
    const accuracy = Math.round((correct / results.length) * 100);
    const wrongCount = results.length - correct;
    const isPerfect = wrongCount === 0;
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">{isPerfect ? '🎉' : '🏆'}</div>
          <h2 className="text-2xl font-semibold text-slate-900 mb-2">{isPerfect ? '全問正解！' : '演習完了！'}</h2>
          <p className="text-5xl font-bold text-emerald-600 mb-2">{accuracy}%</p>
          <p className="text-slate-500 mb-6">{results.length}問中 {correct}問正解</p>
          {!isPerfect && (
            <button onClick={handleReviewWrong}
              className="w-full bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600 mb-4">
              🔁 間違えた問題を復習する（{wrongCount}問）
            </button>
          )}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            {saved ? (
              <p className="text-sm text-emerald-600 font-medium">✅ {questions.length}問を保存しました！</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">この問題を問題一覧に保存しますか？</p>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">保存先フォルダ（任意）</label>
                  <select value={saveFolderId} onChange={e => setSaveFolderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="">フォルダなし</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                    <option value="__new__">+ 新しいフォルダを作成</option>
                  </select>
                </div>
                {(saveFolderId === '__new__' || showNewSaveFolder) && (
                  <input
                    type="text"
                    value={newSaveFolderName}
                    onChange={e => { setNewSaveFolderName(e.target.value); setShowNewSaveFolder(true); }}
                    placeholder="新しいフォルダ名を入力"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                )}
                <button onClick={handleSaveAll} disabled={saving}
                  className="w-full bg-emerald-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
                  {saving ? '保存中...' : `${questions.length}問を保存する`}
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 border border-slate-200 rounded-xl py-3 text-sm text-slate-600 text-center">
              ダッシュボードへ
            </Link>
            <button onClick={() => { setPhase('select'); setQuestions([]); setSaved(false); }}
              className="flex-1 bg-emerald-600 text-white rounded-xl py-3 text-sm font-medium">
              もう一度生成
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    const q = questions[current];
    const accuracy = results.length > 0 ? Math.round((results.filter(r => r.correct).length / results.length) * 100) : 0;
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-2xl mx-auto p-8">
          <div className="flex justify-between items-center mb-2 text-sm text-slate-500">
            <span>{current + 1} / {questions.length}問</span>
            <span>正解率 {accuracy}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-emerald-600 rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
          </div>
          <p className="text-xs text-slate-400 mb-3">⚠️ AI生成問題のため、内容の正確性を保証しません</p>
          {limitedNotice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3 flex items-center justify-between gap-3">
              <p className="text-xs text-amber-800">{limitedNotice}</p>
              <Link href="/pricing" className="text-xs font-medium text-emerald-600 hover:underline flex-shrink-0">
                教材を追加 →
              </Link>
            </div>
          )}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
            <div className="flex gap-2 mb-4">
              <span className="bg-emerald-50 text-emerald-700 text-xs px-3 py-1 rounded-full font-medium">AI生成問題</span>
              <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1 rounded-full">{q.difficulty === 'easy' ? '基礎' : q.difficulty === 'hard' ? '応用' : '標準'}</span>
            </div>
            <p className="text-base font-medium text-slate-900 leading-relaxed mb-6">{q.question}</p>
            {format === '○×' ? (
              <div className="grid grid-cols-2 gap-4">
                {q.options.map(opt => {
                  const symbol = opt.charAt(0);
                  const isCorrect = symbol === q.answer;
                  const isSelected = selected?.charAt(0) === symbol;
                  let cls = 'flex flex-col items-center justify-center py-8 rounded-xl border-2 cursor-pointer transition-all text-4xl font-bold ';
                  if (!answered) cls += 'border-slate-200 hover:border-slate-300';
                  else if (isCorrect) cls += 'border-emerald-500 bg-emerald-50';
                  else if (isSelected) cls += 'border-rose-400 bg-rose-50';
                  else cls += 'border-slate-100 opacity-40';
                  return (
                    <div key={opt} className={cls} onClick={() => handleAnswer(opt)}>
                      <span className={symbol === '○' ? 'text-emerald-600' : 'text-rose-500'}>{symbol}</span>
                      <span className="text-xs font-normal text-slate-500 mt-2">{opt.slice(3)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {q.options.map(opt => {
                  const letter = opt.charAt(0);
                  const isCorrect = letter === q.answer;
                  const isSelected = selected?.charAt(0) === letter;
                  let cls = 'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ';
                  if (!answered) cls += 'border-slate-200 hover:border-slate-300';
                  else if (isCorrect) cls += 'border-emerald-500 bg-emerald-50';
                  else if (isSelected) cls += 'border-rose-400 bg-rose-50';
                  else cls += 'border-slate-100 opacity-60';
                  return (
                    <div key={opt} className={cls} onClick={() => handleAnswer(opt)}>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${answered && isCorrect ? 'bg-emerald-600 border-emerald-600 text-white' : answered && isSelected ? 'bg-rose-400 border-rose-400 text-white' : 'border-slate-300 text-slate-500'}`}>
                        {letter}
                      </div>
                      <span className="text-sm text-slate-700">{opt.slice(3)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {answered && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border-l-4 border-emerald-500">
                <p className="text-xs font-medium text-emerald-600 mb-2">💡 解説</p>
                <p className="text-sm text-slate-600 leading-relaxed">{q.explanation}</p>
                <ExplainButton
                  question={q.question}
                  answer={q.answer}
                  explanation={q.explanation}
                  subject={selectedMaterials[0]?.subject ?? null}
                  accentColor="green"
                />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            {reportedSet.has(current) ? (
              <span className="text-xs text-emerald-600">✅ 報告しました</span>
            ) : showReportForm ? (
              <div className="flex items-center gap-2 flex-wrap">
                <select value={reportReason} onChange={e => setReportReason(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 focus:outline-none">
                  <option>内容が間違っている</option>
                  <option>問題文がおかしい</option>
                  <option>解説が不正確</option>
                  <option>その他</option>
                </select>
                <button onClick={handleReport} disabled={submittingReport}
                  className="text-xs bg-rose-500 text-white px-3 py-1.5 rounded-lg hover:bg-rose-600 disabled:opacity-60">
                  {submittingReport ? '送信中...' : '送信'}
                </button>
                <button onClick={() => setShowReportForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600">
                  キャンセル
                </button>
              </div>
            ) : (
              <button onClick={() => setShowReportForm(true)}
                className="text-xs text-slate-400 hover:text-rose-500 transition-colors">
                🚩 問題を報告する
              </button>
            )}
            {answered && (
              <button onClick={handleNext} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-700">
                {current + 1 < questions.length ? '次の問題 →' : '結果を見る'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">AI問題生成</h1>
        <p className="text-slate-500 text-sm mb-8">複数の教材を選んで一気に問題を生成できます。</p>
        <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-5">

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">フォルダで絞り込み</label>
            <div className="flex flex-wrap gap-2">
              {['すべて', 'なし', ...folders.map(f => f.name)].map((name, i) => {
                const folderId = i === 0 ? 'すべて' : i === 1 ? 'なし' : folders[i - 2]?.id;
                return (
                  <button key={name} onClick={() => setSelectedFolder(folderId)}
                    className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${selectedFolder === folderId ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    📁 {name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">教材を選択（複数可）</label>
              <div className="flex items-center gap-3">
                {materials.length > 0 && (
                  <Link href="/upload" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">
                    + 教材を追加
                  </Link>
                )}
                <button onClick={selectAll} className="text-xs text-emerald-600 hover:underline">全選択</button>
                <button onClick={clearAll} className="text-xs text-slate-400 hover:underline">解除</button>
              </div>
            </div>
            {filteredMaterials.length === 0 ? (
              materials.length === 0 ? (
                <div className="p-6 bg-slate-50 rounded-xl text-center border-2 border-dashed border-slate-200">
                  <div className="text-3xl mb-3">📤</div>
                  <p className="text-sm font-medium text-slate-700 mb-1">教材がまだありません</p>
                  <p className="text-xs text-slate-400 mb-4">PDFや画像をアップロードして問題を生成しましょう</p>
                  <Link href="/upload"
                    className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors">
                    + 教材をアップロードする
                  </Link>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl text-sm text-slate-500 text-center">
                  このフォルダに教材がありません。
                </div>
              )
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredMaterials.map(m => (
                  <button key={m.id} onClick={() => toggleMaterial(m.id)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors ${selectedIds.includes(m.id) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${selectedIds.includes(m.id) ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                      {selectedIds.includes(m.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{m.title}</p>
                      {m.subject && <p className="text-xs text-slate-400">{m.subject}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedIds.length > 0 && (
              <p className="text-xs text-emerald-600 mt-2 font-medium">{selectedIds.length}件選択中</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">出題形式</label>
            <div className="flex gap-3">
              {(['4択', '○×', '穴埋め'] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-colors ${format === f ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {f === '4択' ? '4択問題' : f === '○×' ? '○×問題' : '穴埋め問題'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">教材1件あたりの問題数：{count}問</label>
            <input type="range" min={3} max={10} value={count} onChange={e => setCount(Number(e.target.value))} className="w-full accent-emerald-600" />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>3問</span>
              <span>合計 {selectedIds.length * count}問生成</span>
              <span>10問</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">出題の指示（任意）</label>
            <textarea
              value={supplementText}
              onChange={e => setSupplementText(e.target.value)}
              placeholder="例：呈色反応をメインに出題して　/ テストで聞かれそうな知識問題　/ 基礎的な部分だけ"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              rows={2}
            />
          </div>

          {error && <ErrorBanner message={error} />}

          <button onClick={handleGenerate} disabled={selectedIds.length === 0 || generating}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 disabled:opacity-60">
            ✨ {selectedIds.length > 0 ? `${selectedIds.length}件の教材から問題を生成する` : '教材を選択してください'}
          </button>

          <p className="text-center text-xs text-slate-400">
            生成できる教材数が足りないときは{' '}
            <Link href="/pricing" className="text-emerald-600 hover:underline font-medium">教材クレジットを追加購入</Link>
            {' '}できます
          </p>
        </div>
      </div>
    </div>
  );
}
