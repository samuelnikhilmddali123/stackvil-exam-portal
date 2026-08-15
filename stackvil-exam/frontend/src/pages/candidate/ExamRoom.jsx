import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
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
  Code,
  Monitor,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Components
import ProctorCamera from '../../components/ProctorCamera';
import ProctorScreenShare from '../../components/ProctorScreenShare';
import QuestionPalette from '../../components/QuestionPalette';
import WarningModal from '../../components/WarningModal';
import CodeEditor from '../../components/CodeEditor';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import Round3VSCodeView from '../../components/vscode/Round3VSCodeView';
import { useAuth } from '../../context/AuthContext';

const ExamRoom = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const proctorRef = useRef(null);
  const screenShareRef = useRef(null);
  // Persisted across all rounds — stream is never destroyed when switching Round 1 → 2 → 3
  const persistedScreenStreamRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());
  const globalExamStartRef = useRef(null);

  // Exam state
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // { qId: answerVal }
  const [questionTimes, setQuestionTimes] = useState({}); // { qId: secondsSpent }
  const [reviewLater, setReviewLater] = useState([]); // [qIds]
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-round state tracking
  const [currentRound, setCurrentRound] = useState(1); // 1, 'success1', 2, 'success2', 3
  const currentRoundRef = useRef(currentRound);
  useEffect(() => {
    currentRoundRef.current = currentRound;
  }, [currentRound]);
  const [round1Stats, setRound1Stats] = useState(null);
  const [round2Stats, setRound2Stats] = useState(null);
  const [screenShareActive, setScreenShareActive] = useState(false);

  // Round 3 workspace state
  const [round3Files, setRound3Files] = useState({});
  const [activeFile, setActiveFile] = useState('backend/controller.js');
  const [terminalLogs, setTerminalLogs] = useState([
    { type: 'system', text: '$ npm run start' }
  ]);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [isExamActive, setIsExamActive] = useState(false);

  // Network State
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data && (e.data.type === 'terminal-log' || e.data.type === 'terminal-error')) {
        setTerminalLogs(prev => [
          ...prev,
          {
            type: e.data.type === 'terminal-error' ? 'error' : 'log',
            text: e.data.text
          }
        ]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Autosave for Round 3
  useEffect(() => {
    if (currentRound !== 3 || !isExamActive) return;
    const saveInterval = setInterval(async () => {
      try {
        const totalTimeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
        await axios.post(`/api/candidate/exams/${examId}/round/3/save`, {
          files: round3Files,
          totalTimeTaken
        });
      } catch (err) {
        console.error('Autosave failed:', err);
      }
    }, 10000);
    return () => clearInterval(saveInterval);
  }, [currentRound, round3Files, isExamActive, examId]);

  // Proctoring Warnings
  const [warningsCount, setWarningsCount] = useState(0);
  const [warningModal, setWarningModal] = useState({ isOpen: false, title: '', message: '' });
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    initializeActiveSession();
    setupAntiCheatingListeners();
    enterFullscreen();

    return () => {
      cleanupAntiCheatingListeners();
      exitFullscreen();
    };
  }, []);

  const initializeActiveSession = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/candidate/exams/${examId}/active-session`);
      if (res.data.success) {
        const { activeRound, completed, timeLeft: dbTimeLeft } = res.data;
        
        if (completed) {
          toast.success('Exam already completed.');
          navigate('/candidate/profile');
          return;
        }

        // Set remaining countdown timer for active round
        setTimeLeft(dbTimeLeft);
        globalExamStartRef.current = Date.now() - (((res.data.duration || 30) * 60 - dbTimeLeft) * 1000);

        // Fetch round questions/files without resetting the global clock
        await fetchRound(activeRound, true);
      }
    } catch (err) {
      console.error('Session initialization error:', err);
      fetchRound(1, false);
    } finally {
      setLoading(false);
    }
  };

  // Update timer every second
  useEffect(() => {
    // Timer only runs if exam is active
    // Round 1 & 2: require screen share to be active (anti-cheat gate)
    // Round 3: timer starts immediately on round load (Round 3 has its own internal checklist)
    const isScreenShareRequired = (currentRound === 1 || currentRound === 2);
    const isReady = isExamActive && (!isScreenShareRequired || screenShareActive);

    if (!isReady || timeLeft <= 0) {
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
  }, [isExamActive, timeLeft, currentIdx, questions, screenShareActive, currentRound]);

  // Sync state to localstorage for auto save
  useEffect(() => {
    if (Object.keys(answers).length > 0 && (currentRound === 1 || currentRound === 2)) {
      localStorage.setItem(`exam_${examId}_round${currentRound}_answers`, JSON.stringify(answers));
    }
  }, [answers, currentRound]);

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

  const fetchRound = async (roundNum, isResuming = false) => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/candidate/exams/${examId}/round/${roundNum}`);
      if (res.data.success) {
        setExam({ title: res.data.examTitle });

        if (roundNum === 3) {
          setRound3Files(res.data.files || {});
          setActiveFile('backend/controller.js');
          setTerminalLogs([
            { type: 'system', text: '$ npm run start' }
          ]);
        } else {
          setQuestions(res.data.questions || []);
          setCurrentIdx(0);

          // Recover answers from local storage specific to this round
          const saved = localStorage.getItem(`exam_${examId}_round${roundNum}_answers`);
          if (saved) {
            setAnswers(JSON.parse(saved));
            toast.success(`Restored previous saved responses for Round ${roundNum}.`);
          } else {
            setAnswers({});
          }

          setReviewLater([]);
          setQuestionTimes({});
        }

        // Set the round-specific remaining time from the backend
        setTimeLeft(res.data.timeLeft);
        globalExamStartRef.current = Date.now() - (((res.data.duration || 30) * 60 - res.data.timeLeft) * 1000);

        setCurrentRound(roundNum);
        setIsExamActive(true);
        startTimeRef.current = Date.now();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to start Round ${roundNum}.`);
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

  const preventDefault = (e) => {
    if (currentRoundRef.current !== 3) {
      e.preventDefault();
    }
  };

  const handleKeyBlock = (e) => {
    if (currentRoundRef.current === 3) return;
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
    if (document.hidden && currentRoundRef.current !== 3) {
      triggerViolation('Tab Switch Violation');
    }
  };

  const handleFullscreenChange = () => {
    const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
    setIsFullscreen(isFull);
    if (!isFull && isExamActive && currentRoundRef.current !== 3) {
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
      el.requestFullscreen().catch(() => { });
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen().catch(() => { });
    }
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => { });
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen().catch(() => { });
    }
  };

  const triggerViolation = (type) => {
    if (currentRoundRef.current === 3) return;
    // 1. Immediately log warning locally for instant visual feedback
    setWarningsCount(prev => {
      const next = prev + 1;
      handleWarningLogged(next, type);
      return next;
    });

    // 2. Report to backend and capture frame silently in background
    if (proctorRef.current) {
      proctorRef.current.captureViolation(type, true);
    }
  };

  const handleWarningLogged = (count, type) => {
    const cappedCount = Math.min(5, count);
    setWarningsCount(cappedCount);

    if (count >= 5) {
      toast.error('You are out of the exam due to multiple warning violations');
      handleDisqualificationAutoSubmit(cappedCount);
    } else {
      setWarningModal({
        isOpen: true,
        title: type,
        message: `Your actions triggered a security warning. Please focus on the screen. Warnings issued: ${cappedCount}/5`,
      });
    }
  };

  const handleDisqualificationAutoSubmit = async (count = 5) => {
    try {
      setIsSubmitting(true);
      setIsExamActive(false);
      exitFullscreen();

      const totalTimeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
      const payload = {
        responses: questions.map((q) => ({
          questionId: q._id,
          answer: answers[q._id] !== undefined ? answers[q._id] : '',
          timeSpent: questionTimes[q._id] || 0,
        })),
        totalTimeTaken,
        warningsCount: 5
      };

      await axios.post(`/api/candidate/exams/${examId}/round/${currentRound}/submit`, payload).catch(() => { });
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.clear();
      logout();
      toast.error('You are out of the exam due to multiple warning violations');
      navigate('/login', { replace: true });
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
    const unanswered = questions.length - Object.keys(answers).length;
    let message = `Are you sure you want to finish and submit Round ${currentRound}?`;
    if (unanswered > 0) {
      message = `You have ${unanswered} unanswered questions. Are you sure you want to finish and submit Round ${currentRound}?`;
    }
    if (window.confirm(message)) {
      performRoundSubmission();
    }
  };

  const handleAutoSubmit = (warnings = warningsCount) => {
    performRoundSubmission(warnings);
  };

  const handleCodeChange = (newVal) => {
    setRound3Files(prev => ({
      ...prev,
      [activeFile]: newVal
    }));
  };

  const getPreviewSrcDoc = () => {
    const html = round3Files['frontend/index.html'] || '';
    const css = round3Files['frontend/style.css'] || '';
    const js = round3Files['frontend/script.js'] || '';
    const controller = round3Files['backend/controller.js'] || '';

    const runtimeScript = `
      <script>
        const _log = console.log;
        const _error = console.error;
        
        console.log = function(...args) {
          _log(...args);
          window.parent.postMessage({ type: 'terminal-log', text: args.join(' ') }, '*');
        };
        console.error = function(...args) {
          _error(...args);
          window.parent.postMessage({ type: 'terminal-error', text: args.join(' ') }, '*');
        };

        window.onerror = function(message, source, lineno, colno, error) {
          window.parent.postMessage({ type: 'terminal-error', text: 'Runtime Error: ' + message + ' (line ' + lineno + ')' }, '*');
        };

        if (!window.__mockDb) {
          window.__mockDb = [
            { id: '1', name: 'Nikhil Samuel', email: 'nikhil@example.com', department: 'Engineering', salary: 6500 },
            { id: '2', name: 'John Doe', email: 'john@example.com', department: 'Marketing', salary: 5000 }
          ];
        }

        const mockDbPool = {
          query: async (sql, params) => {
            const lower = sql.toLowerCase().trim();
            if (lower.startsWith('select')) {
              return [window.__mockDb, null];
            }
            if (lower.startsWith('insert')) {
              const newEmp = {
                id: String(window.__mockDb.length + 1),
                name: params[0],
                email: params[1],
                department: params[2],
                salary: Number(params[3])
              };
              window.__mockDb.push(newEmp);
              return [{ insertId: newEmp.id }, null];
            }
            if (lower.startsWith('update')) {
              const id = params[params.length - 1];
              const emp = window.__mockDb.find(e => e.id === String(id));
              if (emp) {
                emp.name = params[0];
                emp.email = params[1];
                emp.department = params[2];
                emp.salary = Number(params[3]);
              }
              return [{ affectedRows: 1 }, null];
            }
            if (lower.startsWith('delete')) {
              const id = params[0];
              window.__mockDb = window.__mockDb.filter(e => e.id !== String(id));
              return [{ affectedRows: 1 }, null];
            }
            return [[], null];
          }
        };

        let controllerInstance = {};
        try {
          const controllerCode = \`${controller.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
          const cleanedCode = controllerCode.replace(/const\\s+pool\\s*=\\s*require\\s*\\([^\\)]+\\)/g, 'const pool = mockDbPool');
          const module = { exports: {} };
          const run = new Function('module', 'exports', 'pool', cleanedCode + '\\nreturn module.exports;');
          controllerInstance = run(module, module.exports, mockDbPool);
          console.log('[Express Server] Node server.js listening on port 3000');
        } catch(err) {
          console.error('Compilation Error in backend/controller.js: ' + err.message);
        }

        const originalFetch = window.fetch;
        window.fetch = async (url, options = {}) => {
          const method = (options.method || 'GET').toUpperCase();
          if (url.startsWith('/api/employees')) {
            console.log('[Express Router] ' + method + ' ' + url);
            let resData = null;
            const resMock = {
              json: (data) => { resData = data; }
            };

            try {
              if (url === '/api/employees') {
                if (method === 'GET' && controllerInstance.getEmployees) {
                  await controllerInstance.getEmployees({}, resMock);
                } else if (method === 'POST' && controllerInstance.createEmployee) {
                  const body = JSON.parse(options.body || '{}');
                  await controllerInstance.createEmployee({ body }, resMock);
                }
              } else {
                const parts = url.split('/');
                const id = parts[parts.length - 1];
                if (method === 'PUT' && controllerInstance.updateEmployee) {
                  const body = JSON.parse(options.body || '{}');
                  await controllerInstance.updateEmployee({ params: { id }, body }, resMock);
                } else if (method === 'DELETE' && controllerInstance.deleteEmployee) {
                  await controllerInstance.deleteEmployee({ params: { id } }, resMock);
                }
              }
            } catch (err) {
              console.error('[Express Handler Error] ' + err.message);
            }

            return {
              ok: true,
              json: async () => resData || { success: false, message: 'API handler failed or not found' }
            };
          }
          return originalFetch(url, options);
        };
      </script>
    `;

    let doc = html;
    doc = doc.replace('<head>', '<head>' + runtimeScript);
    doc = doc.replace('</head>', '<style>' + css + '</style></head>');
    doc = doc.replace('</body>', '<script>' + js + '</script></body>');
    return doc;
  };

  const performRoundSubmission = async (warns = warningsCount, customFiles = null) => {
    try {
      setIsSubmitting(true);
      setIsExamActive(false);
      const totalTimeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);

      const payload = currentRound === 3 ? {
        files: customFiles || round3Files,
        totalTimeTaken,
        warningsCount: warns
      } : {
        responses: questions.map((q) => ({
          questionId: q._id,
          answer: answers[q._id] !== undefined ? answers[q._id] : '',
          timeSpent: questionTimes[q._id] || 0,
        })),
        totalTimeTaken,
        warningsCount: warns
      };

      const res = await axios.post(`/api/candidate/exams/${examId}/round/${currentRound}/submit`, payload);

      if (warns >= 5 || res.data.isDisqualified) {
        exitFullscreen();
        localStorage.clear();
        logout();
        toast.error('You are out of the exam due to multiple warning violations');
        navigate('/login', { replace: true });
        return;
      }

      if (res.data.success) {
        localStorage.removeItem(`exam_${examId}_round${currentRound}_answers`);

        if (currentRound === 1) {
          toast.success('Round 1 submitted successfully! Transitioning to Round 2...');
          fetchRound(2);
        } else if (currentRound === 2) {
          toast.success('Round 2 submitted successfully! Transitioning to Round 3...');
          localStorage.removeItem('round3_camera_activated');
          // Stop camera and screen share streams before fetching Round 3
          if (screenShareRef.current && screenShareRef.current.stopScreenShare) {
            screenShareRef.current.stopScreenShare();
          }
          if (proctorRef.current && proctorRef.current.stopMedia) {
            proctorRef.current.stopMedia();
          }
          if (persistedScreenStreamRef.current) {
            persistedScreenStreamRef.current.getTracks().forEach(t => t.stop());
            persistedScreenStreamRef.current = null;
          }
          fetchRound(3);
        } else {
          exitFullscreen();
          toast.success('Round 3 submitted successfully! Assessment complete.');
          navigate(`/candidate/result/${res.data.result.id}`);
        }
      }
    } catch (error) {
      if (error.response?.status === 403 || error.response?.data?.isDisqualified) {
        exitFullscreen();
        localStorage.clear();
        logout();
        toast.error('You are out of the exam due to multiple warning violations');
        navigate('/login', { replace: true });
        return;
      }
      toast.error(error.response?.data?.message || 'Failed to submit round answers.');
      setIsExamActive(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 text-white">
        <LoadingSkeleton type="page" />
      </div>
    );
  }



  const startCamera = () => {
    if (proctorRef.current && proctorRef.current.startMedia) {
      proctorRef.current.startMedia();
    }
  };

  if (currentRound === 3) {
    return (
      <Round3VSCodeView
        examId={examId}
        files={round3Files}
        onSubmitProject={(submittedFiles) => performRoundSubmission(warningsCount, submittedFiles)}
        examTitle={exam?.title || 'Coding Assessment'}
        durationMinutes={120}
        timeLeftSeconds={timeLeft}
        isSubmitting={isSubmitting}
        persistedStreamRef={persistedScreenStreamRef}
        onScreenShareStateChange={(sharing) => setScreenShareActive(sharing)}
        onStartCamera={startCamera}
        proctorComponent={
          <ProctorCamera
            ref={proctorRef}
            examId={examId}
            autoStart={localStorage.getItem('round3_camera_activated') === 'true'}
            onPermissionGranted={() => {
              localStorage.setItem('round3_camera_activated', 'true');
              if (window.setRound3CameraActive) window.setRound3CameraActive(true);
            }}
            onPermissionDenied={() => {
              localStorage.removeItem('round3_camera_activated');
              if (window.setRound3CameraActive) window.setRound3CameraActive(false);
            }}
            onWarningLogged={handleWarningLogged}
          />
        }
      />
    );
  }

  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;

  // Format Countdown Timer (H:MM:SS or MM:SS)
  const formatTime = (secs) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = secs % 60;
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-white flex flex-col overflow-hidden no-select select-none pb-14">

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
          <div className="flex items-center space-x-2.5 px-3.5 py-1.5 bg-slate-800 border border-slate-700/60 rounded-xl">
            <Clock className="h-4 w-4 text-brand-400" />
            <span className="font-mono text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              ROUND {currentRound} TIME REMAINING:
            </span>
            <span className="font-mono text-sm font-black text-white tracking-wider">
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Submit */}
          <button
            onClick={handleManualSubmit}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/10 transition cursor-pointer"
          >
            Submit Round {currentRound}
          </button>
        </div>
      </div>

      {/* Screen Sharing Proctoring Modal Overlay for Round 1 & Round 2 */}
      {!screenShareActive && (currentRound === 1 || currentRound === 2) && (
        <div className="fixed inset-0 bg-slate-950/98 z-[9999] flex flex-col items-center justify-center p-6 text-center backdrop-blur-md">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 space-y-6 shadow-2xl shadow-brand-500/10">
            {/* Glowing screen share icon */}
            <div className="relative mx-auto h-20 w-20 bg-brand-500/10 text-brand-400 rounded-2xl flex items-center justify-center border border-brand-500/20 shadow-lg shadow-brand-500/5">
              <div className="absolute inset-0 bg-brand-500/20 rounded-2xl blur-lg animate-pulse" />
              <Monitor className="relative h-10 w-10 text-brand-400" />
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-xl font-black text-white tracking-tight">Screen Sharing Required</h2>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                To maintain the integrity of this proctored assessment, you are required to share your <strong>Entire Screen</strong>. Single tabs or application windows are not allowed.
              </p>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-left flex items-start space-x-3 text-[11px] text-amber-300">
              <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <span>
                The exam timer is currently <strong>paused</strong>. Once you authorize entire screen sharing, the questions will unlock and the countdown will commence.
              </span>
            </div>

            <button
              onClick={() => {
                if (screenShareRef.current && screenShareRef.current.startScreenShare) {
                  screenShareRef.current.startScreenShare();
                }
              }}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all duration-300 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Monitor className="h-4 w-4" />
              <span>Share Entire Screen Now</span>
            </button>
          </div>
        </div>
      )}

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
                    src={`${API_BASE_URL}${currentQ.imageUrl}`}
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
                      className={`w-full flex items-center space-x-3.5 px-5 py-3.5 rounded-2xl border text-left text-sm font-semibold transition ${answers[currentQ._id] === opt
                          ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/5'
                          : 'bg-slate-900 border-slate-800/80 text-slate-350 hover:bg-slate-800/60 hover:text-white'
                        }`}
                    >
                      <span className={`h-5 w-5 rounded-full border flex items-center justify-center font-bold text-[10px] uppercase shrink-0 ${answers[currentQ._id] === opt ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-700'
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
                        className={`w-full flex items-center space-x-3.5 px-5 py-3.5 rounded-2xl border text-left text-sm font-semibold transition ${isChecked
                            ? 'bg-brand-600/20 border-brand-500 text-white shadow-lg shadow-brand-500/5'
                            : 'bg-slate-900 border-slate-800/80 text-slate-350 hover:bg-slate-800/60 hover:text-white'
                          }`}
                      >
                        <span className={`h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 ${isChecked ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-700'
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
                      className={`w-1/2 py-4 rounded-2xl border text-center text-sm font-bold transition ${answers[currentQ._id] === opt
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
              className={`px-5 py-2.5 rounded-xl border text-xs font-semibold transition ${reviewLater.includes(currentQ?._id)
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
        <div className="w-80 shrink-0 bg-slate-900 border-l border-slate-800 flex flex-col p-6 space-y-6 hidden lg:flex overflow-y-auto">

          {/* Interactive Question selection Palette */}
          <QuestionPalette
            questions={questions}
            currentQuestionIndex={currentIdx}
            answers={answers}
            reviewLater={reviewLater}
            onSelectQuestion={(idx) => setCurrentIdx(idx)}
          />

          {/* Warnings Log indicator */}
          <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-2xl flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-450">
              <AlertTriangle className="h-4.5 w-4.5 text-rose-500 shrink-0 animate-pulse" />
              <span>Warning Count:</span>
            </div>
            <span className={`px-2 py-0.5 rounded font-bold text-xs ${warningsCount >= 4 ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-200'
              }`}>
              {warningsCount} / 5
            </span>
          </div>

          {/* Proctoring camera & screen feeds */}
          <div className="space-y-4 shrink-0">
            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Webcam Audit</h4>
              <ProctorCamera
                ref={proctorRef}
                examId={examId}
                onPermissionGranted={() => {
                  toast.success('Webcam connected & live proctoring active.');
                }}
                onPermissionDenied={(reason) => {
                  console.warn('Proctor camera notice:', reason);
                  toast.error('Webcam access is required for live proctoring. Please click "Retry Permission" on the camera feed if blocked.', { id: 'camDenied', duration: 5000 });
                }}
                onWarningLogged={handleWarningLogged}
              />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Screen Audit</h4>
              <ProctorScreenShare
                ref={screenShareRef}
                examId={examId}
                onWarningLogged={handleWarningLogged}
                persistedStreamRef={persistedScreenStreamRef}
                onScreenShareStateChange={(sharing, isEntire) => {
                  setScreenShareActive(sharing && isEntire);
                  // Keep banner hidden if stream was already active from a previous round
                  if (persistedScreenStreamRef.current && sharing) {
                    setScreenShareActive(true);
                  }
                }}
              />
            </div>
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
