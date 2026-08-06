import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Award,
  Search,
  Filter,
  Layers,
  ChevronLeft,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import VSCodeDiffViewer from '../../components/vscode/VSCodeDiffViewer';

const ResultDetails = () => {
  const { candidateId, examId } = useParams();
  const navigate = useNavigate();
  
  const [result, setResult] = useState(null);
  const [proctorLog, setProctorLog] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [activeRound, setActiveRound] = useState('round1'); // 'round1', 'round2' or 'round3'
  const [filter, setFilter] = useState('all'); // 'all', 'correct', 'wrong', 'skipped'
  const [searchQuery, setSearchQuery] = useState('');
  const [adminSelectedFile, setAdminSelectedFile] = useState('backend/controller.js');

  useEffect(() => {
    fetchResultDetails();
  }, [candidateId, examId]);

  const fetchResultDetails = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/reports/candidate/${candidateId}/exam/${examId}`);
      if (res.data.success) {
        setResult(res.data.result);
        setProctorLog(res.data.proctorLog);
      }
    } catch (err) {
      toast.error('Failed to load candidate exam result details.');
      navigate('/admin/reports');
    } finally {
      setLoading(false);
    }
  };

  // Helper to split exam questions into Round 1 (Aptitude) and Round 2 (Technical)
  const splitQuestions = (questions) => {
    if (!questions) return { round1: [], round2: [] };
    const aptitudeQ = questions.filter(q => q.category === 'Aptitude');
    const technicalOrOtherQ = questions.filter(q => q.category !== 'Aptitude');

    if (aptitudeQ.length > 0 && technicalOrOtherQ.length > 0) {
      return { round1: aptitudeQ, round2: technicalOrOtherQ };
    }

    if (questions.length === 60) {
      return { round1: questions.slice(0, 30), round2: questions.slice(30, 60) };
    }

    const mid = Math.ceil(questions.length / 2);
    return { round1: questions.slice(0, mid), round2: questions.slice(mid) };
  };

  if (loading) {
    return <LoadingSkeleton type="page" />;
  }

  const examQuestions = result?.exam?.questions || [];
  const { round1, round2 } = splitQuestions(examQuestions);

  // Active round state resolution
  const activeQuestions = activeRound === 'round1' ? round1 : round2;
  const activeResponses = activeRound === 'round1' ? (result?.round1?.responses || []) : (result?.round2?.responses || []);
  const activeRoundMeta = activeRound === 'round1' ? result?.round1 : result?.round2;
  const activeRoundName = activeRound === 'round1' ? 'Aptitude Assessment' : 'Technical Assessment';

  // Join questions with responses
  const questionsWithAnswers = activeQuestions.map((q, idx) => {
    const resp = activeResponses.find(r => r.questionId.toString() === q._id.toString());
    const isSkipped = !resp || resp.answer === undefined || resp.answer === null || resp.answer === '';
    return {
      questionNumber: idx + 1,
      globalQuestionNumber: activeRound === 'round1' ? idx + 1 : round1.length + idx + 1,
      question: q,
      response: resp,
      isSkipped,
      isCorrect: resp?.isCorrect || false,
    };
  });

  // Apply filters and searches
  const filteredQuestions = questionsWithAnswers.filter(item => {
    // 1. Filter checks
    if (filter === 'correct' && !item.isCorrect) return false;
    if (filter === 'wrong' && (item.isCorrect || item.isSkipped)) return false;
    if (filter === 'skipped' && !item.isSkipped) return false;

    // 2. Search check (question number search or text search)
    if (searchQuery.trim() !== '') {
      const qNumSearch = parseInt(searchQuery);
      if (!isNaN(qNumSearch)) {
        return item.questionNumber === qNumSearch;
      }
      return item.question.text.toLowerCase().includes(searchQuery.toLowerCase());
    }

    return true;
  });

  const scrollToQuestion = (qNum) => {
    const element = document.getElementById(`question-card-${qNum}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Helper stats for active round
  const activeCorrectCount = activeResponses.filter(r => r.isCorrect).length;
  const activeWrongCount = activeResponses.filter(r => !r.isCorrect && r.answer !== undefined && r.answer !== null && r.answer !== '').length;
  const activeSkippedCount = activeQuestions.length - activeCorrectCount - activeWrongCount;

  return (
    <div className="space-y-8 animate-fadeIn pb-16 text-left max-w-6xl mx-auto">
      {/* Return button */}
      <div>
        <button
          onClick={() => navigate('/admin/reports')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Performance Sheet</span>
        </button>
      </div>

      {/* Candidate Profile Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Candidate Examination Answer Sheet</h2>
          <p className="text-xs text-slate-400 mt-1 uppercase font-semibold tracking-wider">Official Proctor Audit & Response Evaluation</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-xs font-semibold">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase mb-1">Candidate Name</span>
            <span className="text-slate-800 dark:text-slate-200 text-sm font-bold">{result?.candidate?.name || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase mb-1">Candidate Email</span>
            <span className="text-slate-800 dark:text-slate-200 text-sm font-bold">{result?.candidate?.email || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase mb-1">Department</span>
            <span className="text-slate-800 dark:text-slate-200 text-sm font-bold">{result?.candidate?.department || 'General'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase mb-1">Exam Assigned</span>
            <span className="text-slate-800 dark:text-slate-200 text-sm font-bold">{result?.exam?.title || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase mb-1">Overall Percentage</span>
            <span className={`text-sm font-black ${result?.status === 'Pass' ? 'text-emerald-500' : 'text-rose-500'}`}>
              {result?.percentage?.toFixed(1)}% ({result?.status})
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase mb-1">Total Score Obtained</span>
            <span className="text-slate-800 dark:text-slate-200 text-sm font-bold">{result?.score} Marks</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase mb-1">Proctor Warnings</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
              result?.warningsCount >= 4 ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
            }`}>
              {result?.warningsCount} / 5
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase mb-1">Total Time Taken</span>
            <span className="text-slate-800 dark:text-slate-200 text-sm font-bold">
              {Math.floor((result?.totalTimeTaken || 0) / 60)}m {(result?.totalTimeTaken || 0) % 60}s
            </span>
          </div>
        </div>
      </div>

      {/* Rounds Selector Tabs */}
      <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/80 max-w-lg">
        <button
          onClick={() => { setActiveRound('round1'); setFilter('all'); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeRound === 'round1' 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10' 
              : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Round 1: Aptitude</span>
        </button>
        <button
          onClick={() => { setActiveRound('round2'); setFilter('all'); }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeRound === 'round2' 
              ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10' 
              : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Round 2: Technical</span>
        </button>
        {result?.round3?.completed && (
          <button
            onClick={() => { setActiveRound('round3'); }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
              activeRound === 'round3' 
                ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10' 
                : 'text-slate-500 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Round 3: Workspace</span>
          </button>
        )}
      </div>

      {/* Round Specific Score Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 text-xs font-bold text-slate-500">
        <div className="space-y-1">
          <span className="block uppercase text-[10px] text-slate-400">Round Title</span>
          <span className="text-slate-800 dark:text-white text-sm">{activeRoundName}</span>
        </div>
        <div className="space-y-1">
          <span className="block uppercase text-[10px] text-slate-400">Round Status</span>
          <span className={`px-2 py-0.5 rounded text-[10px] inline-block font-extrabold ${
            activeRoundMeta?.status === 'Pass' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
          }`}>
            {activeRoundMeta?.completed ? activeRoundMeta.status.toUpperCase() : 'LOCKED'}
          </span>
        </div>
        <div className="space-y-1">
          <span className="block uppercase text-[10px] text-slate-400">Score & Percentage</span>
          <span className="text-slate-800 dark:text-white text-sm">
            {activeRoundMeta?.score || 0} Marks ({activeRoundMeta?.percentage?.toFixed(1) || 0}%)
          </span>
        </div>
        <div className="space-y-1">
          <span className="block uppercase text-[10px] text-slate-400">Duration Taken</span>
          <span className="text-slate-800 dark:text-white text-sm">
            {Math.floor((activeRoundMeta?.totalTimeTaken || 0) / 60)}m {(activeRoundMeta?.totalTimeTaken || 0) % 60}s
          </span>
        </div>
      </div>

      {activeRound === 'round3' ? (
        <div className="space-y-6">
          <VSCodeDiffViewer
            submittedFiles={
              result?.round3?.files instanceof Map
                ? Object.fromEntries(result.round3.files)
                : (result?.round3?.files || {})
            }
            originalFiles={
              result?.exam?.codingProject?.files instanceof Map
                ? Object.fromEntries(result.exam.codingProject.files)
                : (result?.exam?.codingProject?.files || {})
            }
            candidateName={result?.candidate?.name || 'Candidate'}
            examTitle={result?.exam?.title || 'Coding Assessment'}
          />
        </div>
      ) : (
        <>
          {/* Sticky Question Navigator Box */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/50 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-xs font-extrabold uppercase text-slate-450 tracking-wider">
              <BookOpen className="h-4.5 w-4.5 text-brand-500" />
              <span>Sticky Answer Navigator</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {questionsWithAnswers.map((item) => {
                let colorClass = 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-750 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-350';
                if (item.isCorrect) {
                  colorClass = 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20';
                } else if (!item.isSkipped && !item.isCorrect) {
                  colorClass = 'bg-rose-500 text-white shadow-sm shadow-rose-500/20';
                } else if (item.isSkipped) {
                  colorClass = 'bg-amber-500 text-white shadow-sm shadow-amber-500/20';
                }

                return (
                  <button
                    key={item.questionNumber}
                    onClick={() => scrollToQuestion(item.questionNumber)}
                    className={`h-9 w-9 flex items-center justify-center rounded-xl font-bold text-xs transition duration-200 ${colorClass}`}
                    title={`Question ${item.questionNumber}`}
                  >
                    {item.questionNumber}
                  </button>
                );
              })}
            </div>
            
            {/* Color guidelines legend */}
            <div className="flex items-center space-x-6 text-[10px] font-bold text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-700/60 uppercase">
              <span className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Correct</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <span>Wrong</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Skipped</span>
              </span>
            </div>
          </div>

          {/* Control Actions: Search and Filters */}
          <div className="flex flex-col md:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
            
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by question number (e.g. 5) or question text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-white"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/60 dark:border-slate-750 shrink-0">
              {[
                { id: 'all', label: 'All' },
                { id: 'correct', label: `Correct (${activeCorrectCount})` },
                { id: 'wrong', label: `Wrong (${activeWrongCount})` },
                { id: 'skipped', label: `Skipped (${activeSkippedCount})` }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition ${
                    filter === opt.id 
                      ? 'bg-slate-800 text-white shadow-sm dark:bg-slate-700' 
                      : 'text-slate-550 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Questions list Cards */}
          <div className="space-y-6">
            {filteredQuestions.length > 0 ? (
              filteredQuestions.map((item) => {
                const q = item.question;
                const resp = item.response;
                const isSkipped = item.isSkipped;
                const isCorrect = item.isCorrect;
                
                // Color theme for cards
                let cardBorderColor = 'border-slate-150 dark:border-slate-700/60';
                let cardBgColor = 'bg-white dark:bg-slate-800';
                let statusBadge = (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-200 dark:border-amber-900/40 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>⚠ Skipped</span>
                  </span>
                );

                if (isCorrect) {
                  cardBorderColor = 'border-emerald-500/50';
                  cardBgColor = 'bg-emerald-50/15 dark:bg-emerald-950/5';
                  statusBadge = (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-450 border border-emerald-200 dark:border-emerald-900/40 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3 shrink-0" />
                      <span>✅ Correct</span>
                    </span>
                  );
                } else if (!isSkipped && !isCorrect) {
                  cardBorderColor = 'border-rose-500/50';
                  cardBgColor = 'bg-rose-50/15 dark:bg-rose-950/5';
                  statusBadge = (
                    <span className="px-2.5 py-1 bg-rose-50 text-rose-600 dark:bg-rose-950/25 dark:text-rose-450 border border-rose-200 dark:border-rose-900/40 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center space-x-1">
                      <XCircle className="h-3 w-3 shrink-0" />
                      <span>❌ Wrong</span>
                    </span>
                  );
                }

                return (
                  <div 
                    id={`question-card-${item.questionNumber}`}
                    key={q._id} 
                    className={`rounded-3xl border-2 p-6 md:p-8 space-y-6 shadow-sm transition-all duration-300 ${cardBgColor} ${cardBorderColor}`}
                  >
                    {/* Card header */}
                    <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-100 dark:border-slate-750">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-400 block uppercase">Question {item.questionNumber} (Global Q{item.globalQuestionNumber})</span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                          Category: {q.category}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3.5">
                        {/* Time Taken */}
                        <div className="flex items-center space-x-1 text-xs text-slate-450 font-bold bg-slate-50 dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-100 dark:border-slate-850">
                          <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>{resp?.timeSpent || 0} Seconds</span>
                        </div>

                        {statusBadge}
                      </div>
                    </div>

                    {/* Question Text */}
                    <h3 className="text-base font-bold text-slate-800 dark:text-white leading-relaxed">
                      {q.text}
                    </h3>

                    {/* Renders image context if available */}
                    {q.type === 'Image' && q.imageUrl && (
                      <div className="max-w-md w-full border border-slate-100 dark:border-slate-750 rounded-2xl overflow-hidden bg-slate-950 p-2">
                        <img 
                          src={`${import.meta.env.VITE_API_URL || window.location.origin}${q.imageUrl}`} 
                          alt="Question Context Visual" 
                          className="max-h-[220px] object-contain rounded-xl mx-auto"
                        />
                      </div>
                    )}

                    {/* Question Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="space-y-3 max-w-3xl">
                        {q.options.map((opt, idx) => {
                          const letter = String.fromCharCode(65 + idx);
                          const isCorrectAnswer = q.correctAnswer === opt || (Array.isArray(q.correctAnswer) && q.correctAnswer.includes(opt));
                          const isCandidateSelected = resp?.answer === opt || (Array.isArray(resp?.answer) && resp.answer.includes(opt));

                          let optClass = 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-350 border-slate-200 dark:border-slate-800';
                          let label = '';
                          
                          if (isCorrectAnswer) {
                            // Green option highlighting
                            optClass = 'bg-emerald-500/10 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border-emerald-500';
                            label = '✅ Correct Answer';
                          } else if (isCandidateSelected && !isCorrect) {
                            // Red candidate selected option highlighting
                            optClass = 'bg-rose-550/10 dark:bg-rose-950/20 text-rose-500 dark:text-rose-450 border-rose-500 border-2';
                            label = '👤 Candidate Selected';
                          }

                          return (
                            <div 
                              key={idx}
                              className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl border text-sm font-semibold transition ${optClass}`}
                            >
                              <div className="flex items-center space-x-3.5">
                                <span className={`h-5 w-5 rounded-full border flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${
                                  isCorrectAnswer ? 'border-emerald-500 bg-emerald-500 text-white' : 
                                  isCandidateSelected && !isCorrect ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-300 dark:border-slate-700'
                                }`}>
                                  {letter}
                                </span>
                                <span>{opt}</span>
                              </div>
                              
                              {label && (
                                <span className="text-[10px] font-black uppercase tracking-wider block pr-2">
                                  {label}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Candidate text response / Coding details */}
                    {q.type === 'Paragraph' && (
                      <div className="space-y-2 max-w-3xl">
                        <span className="text-xs font-bold text-slate-400 block uppercase">Candidate Narrative Response</span>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-750 dark:text-slate-250 text-xs font-semibold whitespace-pre-wrap leading-relaxed">
                          {resp?.answer || 'Not Attempted'}
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl text-[11px] font-bold text-emerald-600 dark:text-emerald-450 border border-emerald-100 dark:border-emerald-950">
                          <strong>Target Correct Solution Match:</strong> {q.correctAnswer}
                        </div>
                      </div>
                    )}

                    {q.type === 'Coding' && (
                      <div className="space-y-4 max-w-4xl text-xs font-semibold">
                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-400 block uppercase">Candidate Submitted Code Solution</span>
                          <pre className="p-4 bg-slate-950 border border-slate-900 rounded-2xl text-emerald-400 font-mono overflow-x-auto whitespace-pre leading-relaxed text-[11px]">
                            {resp?.answer || '// Not Attempted'}
                          </pre>
                        </div>

                        <div className="space-y-2">
                          <span className="text-xs font-bold text-slate-400 block uppercase">Expected Correct Template</span>
                          <pre className="p-4 bg-slate-950 border border-slate-900 rounded-2xl text-slate-450 font-mono overflow-x-auto whitespace-pre leading-relaxed text-[11px]">
                            {q.correctAnswer || '// No template configuration'}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Summary footer */}
                    <div className="flex items-center space-x-6 text-[11px] font-black uppercase text-slate-450 pt-4 border-t border-slate-100 dark:border-slate-750/60">
                      <span>Marks Scored: <strong className={isCorrect ? 'text-emerald-500' : 'text-rose-500'}>{resp?.marksObtained || 0} / {q.marks}</strong></span>
                      <span className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                      <span>Difficulty: {q.difficulty}</span>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="py-24 text-center bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/50 rounded-3xl text-slate-400 text-xs flex flex-col items-center justify-center space-y-2 shadow-xs">
                <BookOpen className="h-8 w-8 text-slate-350" />
                <span>No questions matched the active filters or search parameters.</span>
              </div>
            )}
          </div>
        </>
      )}

    </div>
  );
};

export default ResultDetails;
