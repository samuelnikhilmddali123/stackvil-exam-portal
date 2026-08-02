import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Award, 
  Clock, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  ChevronRight,
  HelpCircle,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const ResultPage = () => {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResultDetails();
  }, [resultId]);

  const fetchResultDetails = async () => {
    try {
      setLoading(true);
      // Retrieve candidate report details (which candidate controller allows if authenticated user matches result owner!)
      // Wait, in reportController, downloadResultPDF handles authentication. And getCandidateReport retrieves detail.
      // But wait! Is there a simple endpoint to fetch result details directly?
      // In reportRoutes: GET /api/reports/candidate/:candidateId/exam/:examId is available.
      // But here we have resultId. How does a candidate load their result?
      // In candidateRoutes, we have GET /api/candidate/results which lists results. We can filter or look for it.
      // To make it super robust, we can add a specific result detail fetch endpoint or call reports directly since reports has `downloadResultPDF` and `getCandidateReport`.
      // Let's check how getCandidateReport works: it takes candidateId and examId.
      // To make it easy, let's create a custom result detail endpoint in reports or candidate, or fetch from candidate history.
      // Wait, let's fetch candidate results history list using GET /api/candidate/results, then find the record matching resultId in frontend!
      // This is extremely robust and does not require creating another endpoint, as they already have permission to access their own list!
      // Let's implement that logic! That's very clever and secure because candidate history is pre-authorized!
      
      const res = await axios.get('/api/candidate/results');
      if (res.data.success) {
        const found = res.data.results.find(r => r._id === resultId);
        if (found) {
          setResult(found);
        } else {
          toast.error('Result sheet not found.');
          navigate('/candidate/profile');
        }
      }
    } catch (err) {
      toast.error('Failed to load result details.');
      navigate('/candidate/profile');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await axios.get(`/api/reports/results/${resultId}/download-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${result.exam?.title.replace(/\s+/g, '_')}_Result.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Certificate PDF downloaded.');
    } catch (err) {
      toast.error('Failed to download PDF.');
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500"></div>
      </div>
    );
  }

  const isPassed = result?.status === 'Pass';
  const correctCount = result?.responses?.filter(r => r.isCorrect).length || 0;
  const totalCount = result?.responses?.length || 0;
  const wrongCount = result?.responses?.filter(r => !r.isCorrect && r.answer !== '').length || 0;
  const skippedCount = totalCount - correctCount - wrongCount;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fadeIn pb-12 text-left">
      {/* Return link */}
      <div>
        <Link
          to="/candidate/profile"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>

      {/* Main certificate display card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-xl overflow-hidden p-8 space-y-6 text-center">
        
        {/* Pass/Fail Icon */}
        <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full shadow-lg relative">
          {isPassed ? (
            <div className="h-full w-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12" />
            </div>
          ) : (
            <div className="h-full w-full bg-rose-50 dark:bg-rose-950/20 text-rose-500 rounded-full flex items-center justify-center">
              <XCircle className="h-12 w-12" />
            </div>
          )}
        </div>

        {/* Brand details */}
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {isPassed ? 'Congratulations!' : 'Evaluation Completed'}
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {result?.exam ? result.exam.title : 'Assessment'}
          </p>
        </div>

        {/* Score Ring / Badge */}
        <div className="py-6 bg-slate-50 dark:bg-slate-900/60 rounded-3xl max-w-sm mx-auto space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Score</span>
          <h3 className={`text-4xl font-extrabold ${isPassed ? 'text-emerald-500' : 'text-rose-500'}`}>
            {result?.percentage.toFixed(1)}%
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Target Cutoff: <strong>{result?.exam ? result.exam.passingScore : 50}%</strong> | Status:{' '}
            <strong className={isPassed ? 'text-emerald-600' : 'text-rose-600'}>{result?.status}</strong>
          </p>
        </div>

        {/* Performance metrics breakdown */}
        <div className="grid grid-cols-3 gap-4 py-4 border-y border-slate-100 dark:border-slate-700/60 text-xs">
          
          <div className="space-y-1">
            <span className="text-slate-400 block">Correct responses</span>
            <p className="text-base font-bold text-emerald-500">{correctCount}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block">Incorrect answers</span>
            <p className="text-base font-bold text-rose-500">{wrongCount}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 block">Skipped items</span>
            <p className="text-base font-bold text-slate-500">{skippedCount}</p>
          </div>

        </div>

        {/* Detailed audit stats */}
        <div className="space-y-3.5 pt-2 text-xs text-slate-650 dark:text-slate-350 max-w-sm mx-auto font-medium">
          
          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <Clock className="h-4 w-4" />
              <span>Time Spent</span>
            </span>
            <span className="font-bold text-slate-800 dark:text-white">
              {Math.floor(result?.totalTimeTaken / 60)}m {result?.totalTimeTaken % 60}s
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400 flex items-center space-x-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span>Warnings Logged</span>
            </span>
            <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
              result?.warningsCount >= 4 ? 'bg-rose-50 text-rose-650' : 'bg-slate-100 dark:bg-slate-700 text-slate-600'
            }`}>
              {result?.warningsCount} / 5
            </span>
          </div>

        </div>

        {/* Download Action button */}
        <div className="pt-6 flex flex-col gap-3">
          <button
            onClick={downloadPDF}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 hover:scale-[1.01] transition flex items-center justify-center space-x-2"
          >
            <FileText className="h-5 w-5" />
            <span>Download Result PDF Certificate</span>
          </button>
          
          <Link
            to="/candidate/profile"
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-white font-semibold text-xs rounded-xl transition text-center"
          >
            Return to Profile Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ResultPage;
