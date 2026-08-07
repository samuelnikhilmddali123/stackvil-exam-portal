import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  CheckCircle2, 
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

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
      const res = await axios.get('/api/candidate/results');
      if (res.data.success) {
        const found = res.data.results.find(r => r._id === resultId);
        if (found) {
          setResult(found);
        } else {
          toast.error('Result record not found.');
          navigate('/candidate/profile');
        }
      }
    } catch (err) {
      toast.error('Failed to load assessment status.');
      navigate('/candidate/profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-brand-500"></div>
      </div>
    );
  }

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

      {/* Main confirmation card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-xl overflow-hidden p-8 space-y-6 text-center">
        {/* Success Icon */}
        <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full shadow-lg relative bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500">
          <CheckCircle2 className="h-12 w-12 text-emerald-500" />
        </div>

        {/* Brand details */}
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">
            Assessment Submitted Successfully
          </h2>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            {result?.exam ? result.exam.title : 'Examination Portal'}
          </p>
        </div>

        {/* Confidential Evaluation Notice */}
        <div className="p-6 bg-slate-50 dark:bg-slate-900/60 rounded-3xl max-w-md mx-auto space-y-2 text-xs text-slate-600 dark:text-slate-300">
          <p className="font-bold text-slate-800 dark:text-white text-sm">Thank you for completing your assessment.</p>
          <p className="leading-relaxed">
            Your responses, proctoring audit log, and coding project submission have been received intact. Evaluation results are processed confidentially by the examination board.
          </p>
        </div>

        <div className="pt-4">
          <button
            onClick={() => navigate('/candidate/profile')}
            className="px-6 py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-2xl shadow-lg transition cursor-pointer"
          >
            Return to Candidate Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
