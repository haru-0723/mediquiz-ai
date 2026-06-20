'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import Navbar from '@/components/Navbar';
import { getDepartmentType } from '@/lib/departmentUtils';
import ErrorBanner from '@/components/ErrorBanner';
import ExplainButton from '@/components/ExplainButton';

type Question = {
  id: string;
  subject: string | null;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  answer: string;
  explanation: string | null;
  difficulty: string;
};

type Answer = {
  questionId: string;
  selected: string | null;
  isCorrect: boolean;
};

const PHARMACY_SUBJECTS = [
  'すべて', '物理系薬学', '化学系薬学', '生物系薬学', '薬理・薬物治療系',
  '薬剤系', '情報系', '衛生薬学', '薬学臨床', '薬学と社会', '基本事項',
];

const MEDICAL_SUBJECTS = [
  'すべて', '基礎医学', '社会医学', '内科系', '外科系',
  'その他診療科', '医療面接・臨床推論', 'CBTでよく出るテーマ',
];

const NURSING_SUBJECTS = [
  'すべて', '人体の構造と機能', '疾病の成り立ちと回復の促進', '健康支援と社会保障制度',
  '基礎看護学', '成人看護学', '老年看護学', '小児看護学', '母性看護学',
  '精神看護学', '地域在宅看護学', '看護の統合と実践',
];

const PT_SUBJECTS = [
  'すべて', '解剖学', '生理学', '運動学', '理学療法評価学', '理学療法治療学',
  '地域理学療法学', 'リハビリテーション医学', '臨床医学',
];

const OT_SUBJECTS = [
  'すべて', '解剖学', '生理学', '運動学', '作業療法評価学', '作業療法治療学',
  '地域作業療法学', 'リハビリテーション医学', '臨床医学',
];

const ST_SUBJECTS = [
  'すべて', '基礎医学', '臨床医学', '臨床歯科医学', '音声言語聴覚医学', '心理学',
  '音声言語学', '社会福祉教育', '言語聴覚障害学総論', '失語高次脳機能障害学',
  '言語発達障害学', '発声発語嚥下障害学', '聴覚障害学',
];

const DENTAL_SUBJECTS = [
  'すべて', '基礎歯学', '歯科保存学', '歯周病学', '歯科補綴学', '口腔外科学',
  '小児歯科学', '歯科矯正学', '口腔衛生学', '歯科放射線学', '社会歯科学',
];

export default function CBTPage() {
  const supabase = createClient();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [phase, setPhase] = useState<'select' | 'quiz' | 'result'>('select');
  const [questionCount, setQuestionCount] = useState(10);
  const [timeLimit, setTimeLimit] = useState(10);
  const [selectedSubject, setSelectedSubject] = useState('すべて');
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState('');
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportReason, setReportReason] = useState('内容が間違っている');
  const [reportedSet, setReportedSet] = useState<Set<number>>(new Set<number>());
  const [submittingReport, setSubmittingReport] = useState(false);
  const [department, setDepartment] = useState('');
  const [targetExam, setTargetExam] = useState<string | null>(null);
  const [useManualSubjectList, setUseManualSubjectList] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('department, target_exam')
          .eq('id', user.id)
          .single();
        const dept = profileData?.department ?? '';
        if (dept) setDepartment(dept);
        const exam = profileData?.target_exam ?? null;
        setTargetExam(exam);

        const deptType = getDepartmentType(dept, exam);
        if (deptType !== 'other') {
          const { data } = await supabase
            .from('questions')
            .select('*')
            .eq('is_cbt', true)
            .eq('department_type', deptType)
            .order('created_at', { ascending: false });
          if (data) setAllQuestions(data);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleFinish = useCallback(async (currentAnswers: Answer[], currentQuestions: Question[]) => {
    const remaining = currentQuestions.slice(currentAnswers.length);
    const finalAnswers = [
      ...currentAnswers,
      ...remaining.map(q => ({ questionId: q.id, selected: null, isCorrect: false }))
    ];
    setAnswers(finalAnswers);
    window.scrollTo(0, 0);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const answerMap = new Map(finalAnswers.map(a => [a.questionId, a]));
      const subjectMap: Record<string, { correct: number; total: number }> = {};
      for (const q of currentQuestions) {
        const subj = q.subject ?? 'その他';
        if (!subjectMap[subj]) subjectMap[subj] = { correct: 0, total: 0 };
        subjectMap[subj].total++;
        if (answerMap.get(q.id)?.isCorrect) subjectMap[subj].correct++;
      }
      await supabase.from('quiz_sessions').insert(
        Object.entries(subjectMap).map(([subject, { correct, total }]) => ({
          user_id: user.id,
          subject,
          correct_count: correct,
          total_questions: total,
          mode: 'cbt',
        }))
      );
    }
    setPhase('result');
  }, [supabase]);

  useEffect(() => {
    if (phase !== 'quiz') return;
    if (timeLeft <= 0) {
      handleFinish(answers, questions);
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, timeLeft, answers, questions, handleFinish]);

async function handleStart() {
  setError('');

  // プラン制限チェック
  const checkRes = await fetch('/api/cbt-check', { method: 'POST' });
  const checkData = await checkRes.json();
  if (!checkData.allowed) {
    setError(checkData.error);
    return;
  }

  setGenerating(true);
  setProgress(0);
  setProgressMessage('問題を準備しています...');

  const cbtMessages = [
    '問題を準備しています...',
    'AIが問題を生成しています...',
    '科目別に問題を作成中...',
    '選択肢を調整しています...',
    'ストック問題と合わせています...',
    'もうすぐ完成です...',
  ];
  let msgIndex = 0;
  const msgInterval = setInterval(() => {
    msgIndex = (msgIndex + 1) % cbtMessages.length;
    setProgressMessage(cbtMessages[msgIndex]);
    setProgress(prev => Math.min(prev + 15, 90));
  }, 2000);

  try {
    // 60%は新しくAIで生成
    const newCount = Math.ceil(questionCount * 0.6);
    // 40%はストックから出題
    const stockCount = questionCount - newCount;

    // AIで新しい問題を生成
    const generateRes = await fetch('/api/cbt-generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: selectedSubject, count: newCount }),
    });
    const generateData = await generateRes.json();
    if (!generateRes.ok) throw new Error(generateData.error);
    const newQuestions = generateData.questions;

    // ストックから出題（新しく生成した問題以外）
    const newIds = new Set(newQuestions.map((q: Question) => q.id));
    const filtered = selectedSubject === 'すべて'
      ? allQuestions.filter(q => !newIds.has(q.id))
      : allQuestions.filter(q => (q.subject ?? 'その他') === selectedSubject && !newIds.has(q.id));
    const stockQuestions = [...filtered]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(stockCount, filtered.length));

    // 合わせてシャッフル
    const finalQuestions = [...newQuestions, ...stockQuestions]
      .sort(() => Math.random() - 0.5);

    // allQuestionsを更新（重複IDは除外）
    setAllQuestions(prev => {
      const existingIds = new Set(prev.map(q => q.id));
      const fresh = newQuestions.filter((q: Question) => !existingIds.has(q.id));
      return [...prev, ...fresh];
    });

    setProgress(100);
    setQuestions(finalQuestions);
    setAnswers([]);
    setCurrent(0);
    setSelected(null);
    setTimeLeft(timeLimit * 60);
    setShowResult(false);
    setPhase('quiz');
  } catch (e: unknown) {
    setError(e instanceof Error ? e.message : '問題生成に失敗しました');
  } finally {
    clearInterval(msgInterval);
    setGenerating(false);
  }
}

  async function handleReport() {
    setSubmittingReport(true);
    try {
      const q = questions[current];
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: q.id, reason: reportReason }),
      });
      setReportedSet(prev => { const next = new Set<number>(prev); next.add(current); return next; });
      setShowReportForm(false);
    } finally {
      setSubmittingReport(false);
    }
  }

  function handleAnswer(letter: string) {
    setSelected(letter);
  }

  function handleNext() {
    const q = questions[current];
    const isCorrect = selected === q.answer;
    const newAnswers = [...answers, { questionId: q.id, selected, isCorrect }];
    setAnswers(newAnswers);
    setShowReportForm(false);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      handleFinish(newAnswers, questions);
    }
  }

  function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  const activeDeptType = getDepartmentType(department, targetExam);
  const deptSubjects: string[] = (() => {
    if (activeDeptType === 'pharmacy') return PHARMACY_SUBJECTS;
    if (activeDeptType === 'medical') return MEDICAL_SUBJECTS;
    if (activeDeptType === 'nursing') return NURSING_SUBJECTS;
    if (activeDeptType === 'pt') return PT_SUBJECTS;
    if (activeDeptType === 'ot') return OT_SUBJECTS;
    if (activeDeptType === 'st') return ST_SUBJECTS;
    if (activeDeptType === 'dental') return DENTAL_SUBJECTS;
    return ['すべて', ...PHARMACY_SUBJECTS.slice(1), ...MEDICAL_SUBJECTS.slice(1), ...NURSING_SUBJECTS.slice(1)];
  })();
  const subjects = useManualSubjectList
    ? ['すべて', ...Array.from(new Set(allQuestions.map(q => q.subject ?? 'その他')))]
    : deptSubjects;


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const CBT_ALLOWED = ['medical', 'pharmacy', 'nursing', 'dental'];
  const isCbtAllowed = CBT_ALLOWED.includes(activeDeptType);

  if (!isCbtAllowed) {
    const isRehabOrOther = ['pt', 'ot', 'st', 'other'].includes(activeDeptType);
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">CBTモード</h1>
          <div className="bg-white rounded-2xl border p-10 text-center">
            <div className="text-4xl mb-4">🎓</div>
            <p className="text-gray-700 font-medium mb-2">このモードは医学部・薬学部・看護学部向けです</p>
            {isRehabOrOther ? (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  PT・OT・ST向けの国家試験対策は国試モードをご利用ください。
                </p>
                <Link href="/kokushi"
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors">
                  国試モードへ →
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  プロフィールで「目指している国試」を設定してください。
                </p>
                <Link href="/settings"
                  className="inline-block bg-green-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
                  プロフィールを設定する →
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm w-full px-8">
          <div style={{ width: 48, height: 48, border: '3px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 24px', animation: 'spin 0.8s linear infinite' }} />
          <p className="text-gray-900 font-semibold text-lg mb-2">問題を生成中...</p>
          <p className="text-blue-600 text-sm font-medium mb-6 min-h-[20px]">{progressMessage}</p>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-yellow-600 mb-2">⏳ CBTレベルの正確な問題を生成しています。1〜2分ほどお待ちください。</p>
          <p className="text-xs text-gray-400">AIが{questionCount}問を準備しています</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (phase === 'result') {
    const correct = answers.filter(a => a.isCorrect).length;
    const accuracy = Math.round((correct / answers.length) * 100);
    const answerMap = new Map(answers.map(a => [a.questionId, a]));
    const subjectStats = questions.reduce((acc, q) => {
      const subject = q.subject ?? 'その他';
      const answer = answerMap.get(q.id);
      if (!answer) return acc;
      if (!acc[subject]) acc[subject] = { correct: 0, total: 0 };
      acc[subject].total++;
      if (answer.isCorrect) acc[subject].correct++;
      return acc;
    }, {} as Record<string, { correct: number; total: number }>);

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-white rounded-2xl border p-8 text-center mb-6">
            <div className="text-5xl mb-4">📊</div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">模試結果</h2>
            <p className="text-5xl font-bold text-blue-600 mb-2">{accuracy}%</p>
            <p className="text-gray-500 mb-2">{answers.length}問中 {correct}問正解</p>
            <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mt-2 ${accuracy >= 80 ? 'bg-green-100 text-green-700' : accuracy >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
              {accuracy >= 80 ? '🎉 優秀！合格圏内です' : accuracy >= 60 ? '📚 もう少し頑張りましょう' : '💪 基礎から復習しましょう'}
            </div>
          </div>

          {Object.keys(subjectStats).length > 0 && (
            <div className="bg-white rounded-2xl border p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">📊 苦手分野分析</h3>
              <div className="space-y-3">
                {Object.entries(subjectStats)
                  .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
                  .map(([subject, stat]) => {
                    const pct = Math.round((stat.correct / stat.total) * 100);
                    const isWeak = pct <= 60;
                    const isReview = pct > 60 && pct <= 80;
                    return (
                      <div key={subject} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm text-gray-700 truncate">{subject}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${isWeak ? 'bg-red-100 text-red-600' : isReview ? 'bg-yellow-100 text-yellow-600' : 'bg-green-100 text-green-600'}`}>
                              {isWeak ? '苦手' : isReview ? '要復習' : '得意'}
                            </span>
                            <span className={`text-sm font-medium flex-shrink-0 ${isWeak ? 'text-red-500' : isReview ? 'text-yellow-600' : 'text-green-600'}`}>{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${isWeak ? 'bg-red-400' : isReview ? 'bg-yellow-400' : 'bg-green-500'}`}
                              style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{stat.total}問中{stat.correct}問正解</p>
                        </div>
                        <Link href={`/review?subject=${encodeURIComponent(subject)}`}
                          className="flex-shrink-0 text-xs text-green-600 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-50">
                          復習する
                        </Link>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border p-6 mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">📝 問題別結果</h3>
            <div className="space-y-3">
              {questions.map((q, i) => {
                const answer = answers[i];
                return (
                  <div key={q.id} className={`p-4 rounded-xl border ${answer?.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-lg flex-shrink-0">{answer?.isCorrect ? '✅' : '❌'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 mb-1">Q{i + 1}. {q.question}</p>
                        <p className="text-xs text-gray-500">正解：{q.answer}　あなた：{answer?.selected ?? '未回答'}</p>
                        {!answer?.isCorrect && q.explanation && (
                          <p className="text-xs text-gray-600 mt-2 p-2 bg-white rounded-lg">💡 {q.explanation}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <Link href="/dashboard" className="flex-1 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 text-center">
              ダッシュボードへ
            </Link>
            <button onClick={() => setPhase('select')}
              className="flex-1 bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700">
              もう一度挑戦
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'quiz') {
    const q = questions[current];
    const options = [
      { label: 'A', text: q.option_a },
      { label: 'B', text: q.option_b },
      { label: 'C', text: q.option_c },
      { label: 'D', text: q.option_d },
    ];
    const isUrgent = timeLeft <= 60;

    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="bg-white border-b px-4 sm:px-8 py-2 flex items-center justify-end gap-3">
          <span className={`text-sm font-semibold px-3 py-1 rounded-full ${isUrgent ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            ⏱ {formatTime(timeLeft)}
          </span>
          <button onClick={() => handleFinish(answers, questions)}
            className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1 rounded-lg">
            終了
          </button>
        </div>

        <div className="max-w-2xl mx-auto p-8">
          <div className="flex justify-between items-center mb-2 text-sm text-gray-500">
            <span>{current + 1} / {questions.length}問</span>
            <span>{Math.round((answers.filter(a => a.isCorrect).length / Math.max(answers.length, 1)) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all"
              style={{ width: `${(current / questions.length) * 100}%` }} />
          </div>

          <p className="text-xs text-gray-400 mb-3">⚠️ AI生成問題のため、内容の正確性を保証しません</p>

          <div className="bg-white rounded-2xl border p-6 mb-4">
            <div className="flex gap-2 mb-4">
              {q.subject && <span className="bg-blue-50 text-blue-700 text-xs px-3 py-1 rounded-full font-medium">{q.subject}</span>}
              <span className="bg-gray-100 text-gray-500 text-xs px-3 py-1 rounded-full">
                {q.difficulty === 'easy' ? '基礎' : q.difficulty === 'hard' ? '応用' : '標準'}
              </span>
            </div>
            <p className="text-base font-medium text-gray-900 leading-relaxed mb-6">{q.question}</p>
            <div className="space-y-3">
              {options.map(({ label, text }) => {
                const isSelected = selected === label;
                const isCorrect = label === q.answer;
                let cls = 'flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ';
                if (!showResult) {
                  cls += isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300';
                } else {
                  if (isCorrect) cls += 'border-green-500 bg-green-50';
                  else if (isSelected) cls += 'border-red-400 bg-red-50';
                  else cls += 'border-gray-100 opacity-60';
                }
                return (
                  <div key={label} className={cls} onClick={() => !showResult && handleAnswer(label)}>
                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0
                      ${showResult && isCorrect ? 'bg-green-600 border-green-600 text-white' :
                        showResult && isSelected ? 'bg-red-400 border-red-400 text-white' :
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' :
                        'border-gray-300 text-gray-500'}`}>
                      {label}
                    </div>
                    <span className="text-sm text-gray-700">{text}</span>
                  </div>
                );
              })}
            </div>
            {showResult && q.explanation && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl border-l-4 border-blue-500">
                <p className="text-xs font-medium text-blue-600 mb-2">💡 解説</p>
                <p className="text-sm text-gray-600 leading-relaxed">{q.explanation}</p>
              </div>
            )}
            {showResult && (
              <ExplainButton key={q.id} question={q.question} answer={q.answer} explanation={q.explanation} subject={q.subject} accentColor="blue" />
            )}
          </div>

          <div className="flex items-center mb-3">
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
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">{answers.length}問回答済み</span>
            <div className="flex gap-3">
              {!showResult && selected && (
                <button onClick={() => setShowResult(true)}
                  className="border border-blue-300 text-blue-600 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-50">
                  解説を見る
                </button>
              )}
              {selected && (
                <button onClick={handleNext}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-blue-700">
                  {current + 1 < questions.length ? '次の問題 →' : '結果を見る'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">CBTモード</h1>
        <p className="text-gray-500 text-sm mb-8">本番さながらの模試形式で実力を試しましょう。</p>

        <div className="bg-white rounded-2xl border p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">出題範囲</label>
              <button
                onClick={() => { setUseManualSubjectList(v => !v); setSelectedSubject('すべて'); }}
                className="text-xs text-blue-500 hover:underline"
              >
                {useManualSubjectList ? '学部別に表示' : '既存の問題から選ぶ'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {subjects.map(s => (
                <button key={s} onClick={() => setSelectedSubject(s)}
                  className={`px-4 py-2 rounded-xl text-sm border transition-colors ${selectedSubject === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {s}
                </button>
              ))}
            </div>
            {!useManualSubjectList && (
              <p className="text-xs text-gray-400 mt-2">
                {activeDeptType === 'pharmacy' ? '薬学部' : activeDeptType === 'medical' ? '医学部' : activeDeptType === 'nursing' ? '看護学部' : activeDeptType === 'pt' ? '理学療法士' : activeDeptType === 'ot' ? '作業療法士' : activeDeptType === 'st' ? '言語聴覚士' : '薬学部・医学部・看護学部'}の科目リストを表示中
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">問題数</label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 50].map(n => (
                <button key={n} onClick={() => setQuestionCount(n)}
                  className={`py-2.5 rounded-xl text-sm border transition-colors ${questionCount === n ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {n}問
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">制限時間</label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 20, 30, 60].map(t => (
                <button key={t} onClick={() => setTimeLimit(t)}
                  className={`py-2.5 rounded-xl text-sm border transition-colors ${timeLimit === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {t}分
                </button>
              ))}
            </div>
          </div>

          {error && <ErrorBanner message={error} />}

          <button onClick={handleStart}
            className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-medium hover:bg-blue-700">
            🎯 模試を開始する
          </button>
        </div>
      </div>
    </div>
  );
}
