import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldCheck, 
  Camera, 
  Video, 
  Mic, 
  AlertCircle, 
  ArrowLeft,
  ChevronRight,
  Maximize
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

const Instructions = () => {
  const { user } = useAuth();
  const { examId } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agree, setAgree] = useState(false);
  
  // Media status
  const [cameraStatus, setCameraStatus] = useState('checking'); // checking, ok, fail
  const [stream, setStream] = useState(null);

  useEffect(() => {
    fetchExamDetails();
    checkDevices();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const fetchExamDetails = async () => {
    try {
      setLoading(true);
      // Retrieve metadata
      const res = await axios.get(`/api/exams/${examId}`);
      if (res.data.success) {
        setExam(res.data.exam);
      }
    } catch (err) {
      toast.error('Could not fetch exam details.');
      navigate('/candidate/profile');
    } finally {
      setLoading(false);
    }
  };

  const checkDevices = async () => {
    try {
      setCameraStatus('checking');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      setCameraStatus('ok');
    } catch (err) {
      console.error(err);
      setCameraStatus('fail');
      toast.error('Webcam and Microphone permissions are mandatory.');
    }
  };

  const handleStart = () => {
    if (cameraStatus !== 'ok') {
      toast.error('Please authorize webcam and microphone devices first.');
      return;
    }
    if (!agree) {
      toast.error('You must agree to the examination terms before starting.');
      return;
    }

    // Redirect to exam screen
    navigate(`/candidate/exam/${examId}`);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-left max-w-4xl mx-auto pb-12">
      {/* Return button */}
      <div>
        <button
          onClick={() => navigate('/candidate/profile')}
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </button>
      </div>

      {/* Main card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-750">
        
        {/* Rules & guidelines pane */}
        <div className="p-8 md:col-span-3 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-1">
              Assessment Instructions
            </h2>
            <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              Please review your details and the security guidelines before beginning.
            </p>
          </div>

          {/* Candidate & Exam Metadata Grid */}
          <div className="bg-slate-50 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs font-semibold">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Candidate Name</span>
              <span className="text-slate-805 dark:text-slate-200">{user?.name || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Candidate ID</span>
              <span className="text-slate-805 dark:text-slate-200">{user?.email || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Exam Name</span>
              <span className="text-slate-850 dark:text-slate-100">{exam?.title || 'Loading...'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Duration</span>
              <span className="text-slate-805 dark:text-slate-200">{exam?.duration || 0} Minutes</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Question Count</span>
              <span className="text-slate-805 dark:text-slate-200">{exam?.questions?.length || 0} Questions</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Passing Score</span>
              <span className="text-slate-805 dark:text-slate-200">{exam?.passingScore || 40}% Score</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Negative Marking</span>
              <span className="text-slate-805 dark:text-slate-200">No Negative Marks</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Allowed Browser</span>
              <span className="text-slate-805 dark:text-slate-200">Chrome, Edge, Firefox, Safari</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Schedule Windows</span>
              <span className="text-slate-805 dark:text-slate-200 text-[10px]">
                {exam?.startDate ? new Date(exam.startDate).toLocaleDateString() : 'N/A'} - {exam?.endDate ? new Date(exam.endDate).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>

          {/* Security alerts list */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              Proctoring & Security Rules
            </h3>
            
            <div className="space-y-3.5 text-xs text-slate-650 dark:text-slate-350 font-medium">
              <div className="flex items-start space-x-3">
                <ShieldCheck className="h-4.5 w-4.5 text-brand-500 shrink-0 mt-0.5" />
                <p><strong>Mandatory Fullscreen:</strong> Exiting fullscreen mode triggers security alerts. Ensure all system updates or popups are closed before commencing.</p>
              </div>

              <div className="flex items-start space-x-3">
                <AlertCircle className="h-4.5 w-4.5 text-brand-500 shrink-0 mt-0.5" />
                <p><strong>Tab/Browser Switches:</strong> Navigating away from the exam tab or minimizing the window is recorded. Visual screenshots are captured immediately upon violation.</p>
              </div>

              <div className="flex items-start space-x-3">
                <AlertCircle className="h-4.5 w-4.5 text-brand-500 shrink-0 mt-0.5" />
                <p><strong>Shortcut Restrictions:</strong> Print Screen, Developer tools (F12, Ctrl+Shift+I), copying (Ctrl+C), and pasting (Ctrl+V) are strictly blocked.</p>
              </div>

              <div className="flex items-start space-x-3">
                <AlertCircle className="h-4.5 w-4.5 text-brand-500 shrink-0 mt-0.5" />
                <p><strong>Face Tracking logs:</strong> The webcam logs continuous captures. Moving away from the screen or multiple face presence creates warnings.</p>
              </div>

              <div className="flex items-start space-x-3">
                <ShieldCheck className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                <p><strong>Warning Limit:</strong> Exceeding <strong>5 warning notices</strong> results in automatic grading and submission of your answers.</p>
              </div>
            </div>
          </div>

          {/* Accept checkbox */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-700/60">
            <button
              onClick={() => setAgree(!agree)}
              className="flex items-start space-x-3 text-xs text-slate-650 dark:text-slate-300 font-bold text-left transition"
            >
              <input
                type="checkbox"
                checked={agree}
                readOnly
                className="h-4.5 w-4.5 accent-brand-600 rounded mt-0.5 shrink-0"
              />
              <span>I certify that I will complete this examination honestly without receiving assistance from any person or external resource.</span>
            </button>
          </div>

          {/* Start button */}
          <button
            onClick={handleStart}
            disabled={!agree || cameraStatus !== 'ok'}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-slate-200 dark:disabled:bg-slate-750 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl shadow-lg hover:scale-[1.01] transition flex items-center justify-center space-x-2"
          >
            <span>Start Exam</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Device test pane */}
        <div className="p-8 md:col-span-2 space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Device & Camera Check</h3>
            <p className="text-xs text-slate-450">Authorize hardware components to verify system compliance</p>
          </div>

          {/* Camera box */}
          <div className="aspect-[4/3] w-full rounded-2xl bg-slate-900 overflow-hidden relative border border-slate-750 flex items-center justify-center">
            {cameraStatus === 'ok' && stream ? (
              <video
                ref={el => { if (el) el.srcObject = stream; }}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : cameraStatus === 'checking' ? (
              <div className="text-center space-y-2 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-slate-400 mx-auto"></div>
                <p className="text-[10px]">Testing webcam status...</p>
              </div>
            ) : (
              <div className="text-center p-4 text-rose-500 space-y-2">
                <AlertCircle className="h-10 w-10 mx-auto" />
                <p className="text-xs font-bold">Hardware Check Failed</p>
              </div>
            )}
          </div>

          {/* Device logs details */}
          <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Video className="h-4 w-4" />
                <span>Webcam Capture</span>
              </span>
              <span className={`px-2 py-0.5 rounded font-semibold ${
                cameraStatus === 'ok' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
              }`}>
                {cameraStatus === 'ok' ? 'Active' : 'Blocked'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <Mic className="h-4 w-4" />
                <span>Audio Feed check</span>
              </span>
              <span className={`px-2 py-0.5 rounded font-semibold ${
                cameraStatus === 'ok' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
              }`}>
                {cameraStatus === 'ok' ? 'Connected' : 'Error'}
              </span>
            </div>
          </div>

          {cameraStatus === 'fail' && (
            <button
              onClick={checkDevices}
              className="py-2.5 w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-white font-semibold text-xs rounded-xl transition"
            >
              Recheck Permissions
            </button>
          )}

        </div>

      </div>
    </div>
  );
};

export default Instructions;
