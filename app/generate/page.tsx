'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';

type Folder = { id: string; name: string; };
type Material = { id: string; title: string; subject: string | null; folder_id: string | null; };
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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: folderData } = await supabase.from('folders').select('*').eq('user_id', user.id).order('created_at');
      if (folderData) setFolders(folderData);
      const { data: materialData } = await supabase.from('materials').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
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
    const selected = materials.filter(m => selectedIds.includes(m.id));
    setSelectedMaterials(selected);

    try {
      const results = await Promise.all(
        selectedIds.map(id =>
          fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ materialId: id, count }),
          }).then(res => res.json())
        )
      );

      for (const data of results) {
        if (data.upgrade) {
          setError(data.error);
          setGenerating(false);
          return;
        }
        if (data.error) throw new Error(data.error);
      }

      setProgress(100);
      const allQuestions: Question[] = results.flatMap(data => data.questions);
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

      for (const q of questions) {
        await supabase.from('questions').insert({
          user_id: user.id,
          subject: selectedMaterials[0]?.subject ?? null,
          question: q.question,
          option_a: q.options[0]?.slice(3) ?? '',
          option_b: q.options[1]?.slice(3) ?? '',
          option_c: q.options[2]?.slice(3) ?? '',
          option_d: q.options[3]?.slice(3) ?? '',
          answer: q.answer,
          explanation: q.explanation,
          difficulty: q.difficulty,
          folder_id: folderId,
        });
      }
      setSaved(true);
    } catch (e) {
      console.error(e);
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

  function handleNext() {
    const q = questions[current];
    const isCorrect = selected?.charAt(0) === q.answer;
    const newResults = [...results, { correct: isCorrect }];
    setResults(newResults);
    setShowReportForm(false);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setPhase('result');
    }
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm w-full px-8">
          <div style={{ width: 48, height: 48, border: '3px solid #16a34a', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 0.8s linear infinite' }} />
          <p className="text-gray-900 font-semibold text-lg mb-2">問題を生成中...</p>
          <p className="text-green-600 text-sm font-medium mb-6 min-h-[20px]">{progressMessage}</p>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-green-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-gray-400">{selectedIds.length}件の教材を処理中</p>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl border p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">{isPerfect ? '🎉' : '🏆'}</div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">{isPerfect ? '全問正解！' : '演習完了！'}</h2>
          <p className="text-5xl font-bold text-green-600 mb-2">{accuracy}%</p>
          <p className="text-gray-500 mb-6">{results.length}問中 {correct}問正解</p>
          {!isPerfect && (
            <button onClick={handleReviewWrong}
              className="w-full bg-orange-500 text-white rounded-xl py-3 text-sm font-medium hover:bg-orange-600 mb-4">
              🔁 間違えた問題を復習する（{wrongCount}問）
            </button>
          )}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            {saved ? (
              <p className="text-sm text-green-600 font-medium">✅ {questions.length}問を保存しました！</p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">この問題を問題一覧に保存しますか？</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">保存先フォルダ（任意）</label>
                  <select value={saveFolderId} onChange={e => setSaveFolderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
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
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                )}
                <button onClick={handleSaveAll} disabled={saving}
                  className="w-full bg-green-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
                  {saving ? '保存中...' : `${questions.length}問を保存する`}
                </button>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 text-center">
              ダッシュボードへ
            </Link>
            <button onClick={() => { setPhase('select'); setQuestions([]); setSaved(false); }}
              className="flex-1 bg-green-600 text-white rounded-xl py-3 text-sm font-medium">
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
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto p-8">
          <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
            <span>{current + 1} / {questions.length}問</span>
            <span>正解率 {accuracy}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mb-8 overflow-hidden">
            <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${(current / questions.length) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400 mb-3">⚠️ AI生成問題のため、内容の正確性を保証しません</p>
          <div className="bg-white rounded-2xl border p-6 mb-4">
            <div className="flex gap-2 mb-4">
              <span className="bg-green-50 text-green-700 text-xs px-3 py-1 rounded-full font-medium">AI生成問題</span>
              <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">{q.difficulty === 'easy' ? '基礎' : q.difficulty === 'hard' ? '応用' : '標準'}</span>
            </div>
            <p className="text-base font-medium text-gray-900 leading-relaxed mb-6">{q.question}</p>
            <div className="space-y-3">
              {q.options.map(opt => {
                const letter = opt.charAt(0);
                const isCorrect = letter === q.answer;
                const isSelected = selected?.charAt(0) === letter;
                let cls = 'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ';
                if (!answered) cls += 'border-gray-200 hover:border-gray-300';
                else if (isCorrect) cls += 'border-green-500 bg-green-50';
                else if (isSelected) cls += 'border-red-400 bg-red-50';
                else cls += 'border-gray-100 opacity-60';
                return (
                  <div key={opt} className={cls} onClick={() => handleAnswer(opt)}>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${answered && isCorrect ? 'bg-green-600 border-green-600 text-white' : answered && isSelected ? 'bg-red-400 border-red-400 text-white' : 'border-gray-300 text-gray-500'}`}>
                      {letter}
                    </div>
                    <span className="text-sm text-gray-700">{opt.slice(3)}</span>
                  </div>
                );
              })}
            </div>
            {answered && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border-l-4 border-green-500">
                <p className="text-xs font-medium text-green-600 mb-2">💡 解説</p>
                <p className="text-sm text-gray-600 leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            {reportedSet.has(current) ? (
              <span className="text-xs text-green-600">✅ 報告しました</span>
            ) : showReportForm ? (
              <div className="flex items-center gap-2 flex-wrap">
                <select value={reportReason} onChange={e => setReportReason(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none">
                  <option>内容が間違っている</option>
                  <option>問題文がおかしい</option>
                  <option>解説が不正確</option>
                  <option>その他</option>
                </select>
                <button onClick={handleReport} disabled={submittingReport}
                  className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-60">
                  {submittingReport ? '送信中...' : '送信'}
                </button>
                <button onClick={() => setShowReportForm(false)}
                  className="text-xs text-gray-400 hover:text-gray-600">
                  キャンセル
                </button>
              </div>
            ) : (
              <button onClick={() => setShowReportForm(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                🚩 問題を報告する
              </button>
            )}
            {answered && (
              <button onClick={handleNext} className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-green-700">
                {current + 1 < questions.length ? '次の問題 →' : '結果を見る'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">AI問題生成</h1>
        <p className="text-gray-500 text-sm mb-8">複数の教材を選んで一気に問題を生成できます。</p>
        <div className="bg-white rounded-2xl border p-8 space-y-5">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">フォルダで絞り込み</label>
            <div className="flex flex-wrap gap-2">
              {['すべて', 'なし', ...folders.map(f => f.name)].map((name, i) => {
                const folderId = i === 0 ? 'すべて' : i === 1 ? 'なし' : folders[i - 2]?.id;
                return (
                  <button key={name} onClick={() => setSelectedFolder(folderId)}
                    className={`px-3 py-1.5 rounded-xl text-xs border transition-colors ${selectedFolder === folderId ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    📁 {name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">教材を選択（複数可）</label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-green-600 hover:underline">全選択</button>
                <button onClick={clearAll} className="text-xs text-gray-400 hover:underline">解除</button>
              </div>
            </div>
            {filteredMaterials.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-500 text-center">
                教材がありません。<Link href="/upload" className="text-green-600 hover:underline">アップロード</Link>してください。
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {filteredMaterials.map(m => (
                  <button key={m.id} onClick={() => toggleMaterial(m.id)}
                    className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors ${selectedIds.includes(m.id) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${selectedIds.includes(m.id) ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}>
                      {selectedIds.includes(m.id) && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{m.title}</p>
                      {m.subject && <p className="text-xs text-gray-400">{m.subject}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedIds.length > 0 && (
              <p className="text-xs text-green-600 mt-2 font-medium">{selectedIds.length}件選択中</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">教材1件あたりの問題数：{count}問</label>
            <input type="range" min={3} max={10} value={count} onChange={e => setCount(Number(e.target.value))} className="w-full accent-green-600" />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>3問</span>
              <span>合計 {selectedIds.length * count}問生成</span>
              <span>10問</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl">
              <p>{error}</p>
              <a href="/pricing" className="underline font-medium mt-1 inline-block">プランをアップグレードする →</a>
            </div>
          )}

          <button onClick={handleGenerate} disabled={selectedIds.length === 0 || generating}
            className="w-full bg-green-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-60">
            ✨ {selectedIds.length > 0 ? `${selectedIds.length}件の教材から問題を生成する` : '教材を選択してください'}
          </button>
        </div>
      </div>
    </div>
  );
}
