import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  AlertTriangle,
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle,
  Camera,
  Wifi,
  WifiOff,
  Maximize,
  HelpCircle,
  Code
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Components
import ProctorCamera from '../../components/ProctorCamera';
import QuestionPalette from '../../components/QuestionPalette';
import WarningModal from '../../components/WarningModal';
import CodeEditor from '../../components/CodeEditor';

const ExamRoom = () => {
  const { examId } = useParams();
  const navigate = useNavigate();

  const proctorRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  // Exam state
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { qId: answerVal }
  const [questionTimes, setQuestionTimes] = useState({}); // { qId: secondsSpent }
  const [reviewLater, setReviewLater] = useState([]); // [qIds]
  const [loading, setLoading] = useState(true);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isExamActive, setIsExamActive] = useState(false);

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Proctoring Warnings
  const [warningsCount, setWarningsCount] = useState(0);
  const [warningModal, setWarningModal] = useState({ isOpen: false, title: '', message: '' });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchExam();
    setupAntiCheatingListeners();
    enterFullscreen();

    // LocalStorage recovery checklist
    const saved = localStorage.getItem(`exam_${examId}_answers`);
    if (saved) {
      setAnswers(JSON.parse(saved));
      toast.success('Restored previous saved responses.');
    }

    return () => {
      cleanupAntiCheatingListeners();
      exitFullscreen();
    };
  }, []);

  // Update timer every second
  useEffect(() => {
    if (!isExamActive || timeLeft <= 0) {
      if (isExamActive && timeLeft === 0) {
        toast.error('Time is up! Submitting exam automatically.');
        handleAutoSubmit();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
      
      // Update time spent on current question
      const currentQId = questions[currentIdx]?._id;
      if (currentQId) {
        setQuestionTimes(prev => ({
          ...prev,
          [currentQId]: (prev[currentQId] || 0) + 1
        }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isExamActive, timeLeft, currentIdx, questions]);

  // Sync state to localstorage for auto save
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      localStorage.setItem(`exam_${examId}_answers`, JSON.stringify(answers));
    }
  }, [answers]);

  const [runningCode, setRunningCode] = useState(false);
  const [runResults, setRunResults] = useState(null);

  // Clear running results when changing questions
  useEffect(() => {
    setRunResults(null);
  }, [currentIdx]);

  const handleRunCode = async () => {
    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    const userCode = answers[currentQ._id] || currentQ.codeTemplates?.[0]?.template || '';

    try {
      setRunningCode(true);
      setRunResults(null);

      const res = await axios.post(`/api/candidate/exams/${examId}/run-code`, {
        questionId: currentQ._id,
        code: userCode,
        language: 'javascript'
      });

      if (res.data.success) {
        setRunResults(res.data);
        if (res.data.allPassed) {
          toast.success('All test cases passed successfully!');
        } else {
          toast.error('Some test cases failed. Review code output.');
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error executing code sandbox.');
    } finally {
      setRunningCode(false);
    }
  };

  const fetchExam = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/candidate/exams/${examId}/start`);
      if (res.data.success) {
        const data = res.data.exam;
        setExam(data);
        setQuestions(data.questions || []);
        setTimeLeft(data.duration * 60);
        setIsExamActive(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Access Denied.');
      navigate('/candidate/profile');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // ANTI-CHEATING SECURITY CONTROLS
  // ==========================================

  const setupAntiCheatingListeners = () => {
    // 1. Right Click blocking
    document.addEventListener('contextmenu', preventDefault);

    // 2. Copy/Paste/Cut/Text selection blocking
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('selectstart', preventDefault);

    // 3. Shortcuts blocking (F12, DevTools)
    window.addEventListener('keydown', handleKeyBlock);

    // 4. Tab switching/Visibility checks
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 5. Fullscreen event changes
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    // 6. Network status changes
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 7. Prevent refresh or close tab
    window.addEventListener('beforeunload', handleBeforeUnload);
  };

  const cleanupAntiCheatingListeners = () => {
    document.removeEventListener('contextmenu', preventDefault);
    document.removeEventListener('copy', preventDefault);
    document.removeEventListener('paste', preventDefault);
    document.removeEventListener('cut', preventDefault);
    document.removeEventListener('selectstart', preventDefault);
    window.removeEventListener('keydown', handleKeyBlock);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };

  const preventDefault = (e) => e.preventDefault();

  const handleKeyBlock = (e) => {
    // Block F12
    if (e.keyCode === 123) {
      e.preventDefault();
      triggerViolation('F12 Developer Tools Attempt');
    }
    // Block Ctrl+Shift+I, J, C, U
    if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) {
      e.preventDefault();
      triggerViolation('Developer Tools Shortcut Attempt');
    }
    if (e.ctrlKey && e.keyCode === 85) { // Ctrl+U (view source)
      e.preventDefault();
      triggerViolation('View Source code Attempt');
    }
    if (e.ctrlKey && e.keyCode === 80) { // Ctrl+P (print screen)
      e.preventDefault();
      triggerViolation('Print Screen Attempt');
    }
    if (e.ctrlKey && e.keyCode === 83) { // Ctrl+S (save file)
      e.preventDefault();
      triggerViolation('Save Page Attempt');
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      triggerViolation('Tab Switch Violation');
    }
  };

  const handleFullscreenChange = () => {
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
    setIsFullscreen(isFull);
    if (!isFull && isExamActive) {
      triggerViolation('Fullscreen Mode Exit');
    }
  };

  const handleOnline = () => {
    setIsOnline(true);
    toast.success('Internet connection restored. Synchronizing answers.');
  };

  const handleOffline = () => {
    setIsOnline(false);
    toast.error('Internet connection lost. Local backup enabled.', { duration: 6000 });
  };

  const handleBeforeUnload = (e) => {
    if (isExamActive) {
      const msg = 'Do you want to leave? Your exam progress is still active.';
      e.returnValue = msg;
      return msg;
    }
  };

  const enterFullscreen = () => {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen().catch(() => {});
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen().catch(() => {});
    }
  };

  const triggerViolation = (type) => {
    if (proctorRef.current) {
      proctorRef.current.captureViolation(type);
    } else {
      // Fallback update warnings count manually if webcam not loaded
      setWarningsCount(prev => {
        const next = prev + 1;
        handleWarningLogged(next, type);
        return next;
      });
    }
  };

  const handleWarningLogged = (count, type) => {
    setWarningsCount(count);
    
    if (count >= 5) {
      toast.error('Violation warning limit exceeded. Submitting examination.');
      handleAutoSubmit(count);
    } else {
      setWarningModal({
        isOpen: true,
        title: type,
        message: `Your actions triggered a security warning. Please focus on the screen. Warnings issued: ${count}/5`,
      });
    }
  };

  const handleDismissWarning = () => {
    setWarningModal({ isOpen: false, title: '', message: '' });
    // Force relocking fullscreen
    enterFullscreen();
  };

  // ==========================================
  // ANSWERS & NAVIGATION ORCHESTRATION
  // ==========================================

  const handleAnswerSelect = (val) => {
    const qId = questions[currentIdx]?._id;
    setAnswers(prev => ({
      ...prev,
      [qId]: val
    }));
  };

  const handleCheckboxToggle = (val) => {
    const qId = questions[currentIdx]?._id;
    const currentAns = answers[qId] || [];
    let nextAns;

    if (currentAns.includes(val)) {
      nextAns = currentAns.filter(item => item !== val);
    } else {
      nextAns = [...currentAns, val];
    }

    setAnswers(prev => ({
      ...prev,
      [qId]: nextAns
    }));
  };

  const toggleReviewLater = () => {
    const qId = questions[currentIdx]?._id;
    setReviewLater(prev => 
      prev.includes(qId) ? prev.filter(id => id !== qId) : [...prev, qId]
    );
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  // ==========================================
  // SUBMISSION LOGIC
  // ==========================================

  const handleManualSubmit = () => {
    if (window.confirm('Are you sure you want to finish and submit your exam?')) {
      performFinalSubmission();
    }
  };

  const handleAutoSubmit = (warnings = warningsCount) => {
    performFinalSubmission(warnings);
  };

  const performFinalSubmission = async (warns = warningsCount) => {
    try {
      setIsExamActive(false);
      
      // Calculate total duration
      const totalTimeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

      // Build responses array
      const responsePayload = questions.map((q) => ({
        questionId: q._id,
        answer: answers[q._id] !== undefined ? answers[q._id] : '',
        timeSpent: questionTimes[q._id] || 0,
      }));

      const res = await axios.post(`/api/candidate/exams/${examId}/submit`, {
        responses: responsePayload,
        totalTimeTaken,
        warningsCount: warns,
      });

      if (res.data.success) {
        // Clear local storage backups
        localStorage.removeItem(`exam_${examId}_answers`);
        exitFullscreen();
        toast.success('Exam submitted successfully.');
        navigate(`/candidate/result/${res.data.result.id}`);
      }
    } catch (error) {
      toast.error('Failed to submit exam payload.');
      setIsExamActive(true); // Re-activate if error occurs
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;
  
  // Format Countdown Timer (MM:SS)
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden no-select select-none">
      
      {/* Header stats bar */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center space-x-3">
          <span className="font-extrabold text-base tracking-tight text-white">{exam?.title}</span>
          <span className="h-4 w-px bg-slate-800"></span>
          <span className="text-xs text-slate-400 font-semibold">
            Question {currentIdx + 1} of {totalQuestions}
          </span>
        </div>

        {/* Status markers & Timer */}
        <div className="flex items-center space-x-6">
          {/* Network checker */}
          <div className="flex items-center space-x-1.5 text-xs font-semibold">
            {isOnline ? (
              <>
                <Wifi className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-500 hidden sm:inline">Auto-Save Active</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-rose-500 animate-pulse" />
                <span className="text-rose-500">Offline (Locally Saved)</span>
              </>
            )}
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-slate-800 border border-slate-700/60 rounded-xl">
            <Clock className="h-4.5 w-4.5 text-brand-400" />
            <span className="font-mono text-sm font-bold text-white tracking-wider w-[52px]">
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={handleManualSubmit}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/10 transition"
          >
            Submit Exam
          </button>
        </div>
      </div>

      {/* Main split dashboard pane */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Pane: Question Text & Answer selection layout */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 flex flex-col justify-between">
          
          <div className="space-y-6">
            {/* Question title & header */}
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-base md:text-lg font-bold text-white leading-relaxed">
                Q{currentIdx + 1}. {currentQ?.text}
              </h2>
              <span className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-brand-400 shrink-0">
                {currentQ?.marks} Marks
              </span>
            </div>

            {/* Render question inputs depending on type */}
            <motion.div 
              key={currentIdx}
              initial={{ x: 10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Image box if type is Image */}
              {currentQ?.type === 'Image' && currentQ.imageUrl && (
                <div className="max-w-md w-full border border-slate-800 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center p-2 mb-4">
                  <img 
                    src={`${import.meta.env.VITE_API_URL || window.location.origin}${currentQ.imageUrl}`} 
                    alt="Question visual layout" 
                    className="max-h-[220px] object-contain rounded-xl" 
                  />
                </div>
              )}

              {/* MCQ (Single selection) */}
              {(currentQ?.type === 'MCQ' || currentQ?.type === 'Image') && currentQ.options && (
                <div className="space-y-3 max-w-2xl">
                  {currentQ.options.map((opt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswerSelect(opt)}
                      className={`w-full flex items-center space-x-3.5 px-5 py-3.5 rounded-2xl border text-left text-sm font-semibold transition ${
                        answers[currentQ._id] === opt
                          ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/5'
                          : 'bg-slate-900 border-slate-800/80 text-slate-350 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      <span className={`h-5 w-5 rounded-full border flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${
                        answers[currentQ._id] === opt ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-700'
                      }`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Checkbox (Multi-select) */}
              {currentQ?.type === 'Checkbox' && currentQ.options && (
                <div className="space-y-3 max-w-2xl">
                  {currentQ.options.map((opt, idx) => {
                    const isChecked = (answers[currentQ._id] || []).includes(opt);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleCheckboxToggle(opt)}
                        className={`w-full flex items-center space-x-3.5 px-5 py-3.5 rounded-2xl border text-left text-sm font-semibold transition ${
                          isChecked
                            ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/5'
                            : 'bg-slate-900 border-slate-800/80 text-slate-350 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <span className={`h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 ${
                          isChecked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-700'
                        }`}>
                          {isChecked && '✓'}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* True/False selection */}
              {currentQ?.type === 'True/False' && (
                <div className="flex space-x-4 max-w-md">
                  {['True', 'False'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswerSelect(opt)}
                      className={`w-1/2 py-4 rounded-2xl border text-center text-sm font-bold transition ${
                        answers[currentQ._id] === opt
                          ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/5'
                          : 'bg-slate-900 border-slate-800/80 text-slate-350 hover:bg-slate-800/60 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Paragraph text response */}
              {currentQ?.type === 'Paragraph' && (
                <textarea
                  value={answers[currentQ._id] || ''}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  placeholder="Type your complete open-ended essay answer here..."
                  rows={8}
                  className="w-full max-w-3xl px-4 py-3 bg-slate-900 border border-slate-800 text-white rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              )}

              {/* Code Editor (Monaco integration) */}
              {currentQ?.type === 'Coding' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center space-x-2">
                      <Code className="h-4 w-4 text-brand-400" />
                      <span>Language: <strong>JavaScript (Sandbox Grader Enabled)</strong></span>
                    </div>
                    <button
                      type="button"
                      disabled={runningCode}
                      onClick={handleRunCode}
                      className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-lg shadow-md transition flex items-center space-x-1.5"
                    >
                      {runningCode ? (
                        <>
                          <div className="h-3 w-3 rounded-full border border-t-transparent border-slate-200 animate-spin" />
                          <span>Running...</span>
                        </>
                      ) : (
                        <span>Run Code</span>
                      )}
                    </button>
                  </div>
                  
                  <CodeEditor
                    language="javascript"
                    value={answers[currentQ._id] || currentQ.codeTemplates?.[0]?.template || ''}
                    onChange={handleAnswerSelect}
                    theme="dark"
                  />

                  {/* Sandboxed Test Case Output Results */}
                  {runResults && (
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3 font-semibold text-xs text-left animate-fadeIn">
                      <h4 className="text-slate-400 uppercase tracking-wider text-[10px] flex items-center justify-between">
                        <span>Console Output / Test Results</span>
                        <span className={runResults.allPassed ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                          {runResults.allPassed ? '✔ ALL PASSED' : '✖ SOME FAILED'}
                        </span>
                      </h4>

                      <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                        {runResults.results.map((tr, index) => (
                          <div key={index} className="p-3 bg-slate-950 border border-slate-850/60 rounded-lg flex flex-col space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-slate-450">Test Case #{tr.testCaseIndex}</span>
                              <span className={tr.passed ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                                {tr.passed ? 'PASSED' : 'FAILED'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px] text-slate-350">
                              <div>
                                <span className="block text-[8px] uppercase text-slate-500">Input</span>
                                <span className="text-white bg-slate-900 px-1 py-0.5 rounded">{tr.input}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase text-slate-500">Expected</span>
                                <span className="text-emerald-400 bg-slate-900 px-1 py-0.5 rounded">{tr.expectedOutput}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] uppercase text-slate-500">Actual</span>
                                <span className={tr.passed ? 'text-emerald-450 bg-slate-900 px-1 py-0.5 rounded' : 'text-rose-455 bg-slate-900 px-1 py-0.5 rounded'}>
                                  {tr.error ? `Error: ${tr.error}` : tr.actualOutput || 'undefined'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
          </div>

          {/* Navigation Controls toolbar */}
          <div className="pt-6 border-t border-slate-900 flex justify-between items-center shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentIdx === 0}
              className="flex items-center space-x-2 px-5 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 rounded-xl transition"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
              <span>Previous</span>
            </button>

            {/* Review later toggle */}
            <button
              onClick={toggleReviewLater}
              className={`px-5 py-2.5 rounded-xl border text-xs font-semibold transition ${
                reviewLater.includes(currentQ?._id)
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-450 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {reviewLater.includes(currentQ?._id) ? 'Review List Active' : 'Mark for Review Later'}
            </button>

            {currentIdx < totalQuestions - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center space-x-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl shadow-md shadow-brand-500/10 transition"
              >
                <span>Next</span>
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            ) : (
              <button
                onClick={handleManualSubmit}
                className="flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-500/10 transition"
              >
                <span>Finish Submit</span>
                <CheckCircle className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Pane: Camera monitor and Question Palette */}
        <div className="w-80 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col p-6 space-y-6 hidden lg:flex">
          
          {/* Proctoring camera feeds */}
          <div className="space-y-2">
            <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Webcam audit</h4>
            <ProctorCamera
              ref={proctorRef}
              examId={examId}
              onPermissionDenied={() => {
                triggerViolation('Camera Permission Denied');
              }}
              onWarningLogged={handleWarningLogged}
            />
          </div>

          {/* Warnings Log indicator */}
          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-450">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 animate-pulse" />
              <span>Warning Count:</span>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold text-xs ${
              warningsCount >= 4 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'
            }`}>
              {warningsCount} / 5
            </span>
          </div>

          {/* Interactive Question selection Palette */}
          <div className="flex-1 overflow-y-auto">
            <QuestionPalette
              questions={questions}
              currentQuestionIndex={currentIdx}
              answers={answers}
              reviewLater={reviewLater}
              onSelectQuestion={(idx) => setCurrentIdx(idx)}
            />
          </div>

        </div>

      </div>

      {/* Warning popup Modal overlay */}
      <WarningModal
        isOpen={warningModal.isOpen}
        title={warningModal.title}
        message={warningModal.message}
        warningCount={warningsCount}
        onConfirm={handleDismissWarning}
      />

    </div>
  );
};

export default ExamRoom;
