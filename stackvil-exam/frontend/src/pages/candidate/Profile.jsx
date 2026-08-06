import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  FileText, 
  Award, 
  Calendar, 
  Clock, 
  CheckCircle,
  FileCheck2,
  ChevronRight,
  TrendingUp,
  User,
  GraduationCap
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useAuth } from '../../context/AuthContext';

const Profile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfileData(true);
    // Auto-poll for newly assigned exams every 4 seconds
    const interval = setInterval(() => {
      fetchProfileData(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const fetchProfileData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [exRes, resRes] = await Promise.all([
        axios.get('/api/candidate/exams'),
        axios.get('/api/candidate/results')
      ]);

      if (exRes.data.success) {
        const newExams = exRes.data.exams || [];
        setExams(prev => {
          if (!isInitial && prev.length === 0 && newExams.length > 0) {
            toast.success('🎉 New examination has been assigned to you!', { duration: 5000 });
          }
          return newExams;
        });
      }
      if (resRes.data.success) setResults(resRes.data.results);
    } catch (err) {
      if (isInitial) toast.error('Failed to load portal updates.');
      console.error(err);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  const downloadResultPDF = async (resultId, examTitle) => {
    try {
      const response = await axios.get(`/api/reports/results/${resultId}/download-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${examTitle.replace(/\s+/g, '_')}_Result.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Performance certificate downloaded.');
    } catch (err) {
      toast.error('Failed to export PDF.');
    }
  };

  if (loading) {
    return <LoadingSkeleton type="table" />;
  }

  // Filter exams into categories
  const pendingExams = exams.filter(e => !e.isCompleted);
  const completedExams = results;

  if (pendingExams.length === 0) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 animate-fadeIn">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 p-8 shadow-xl space-y-6">
          <div className="mx-auto h-12 w-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400">
            <Calendar className="h-6 w-6 text-brand-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Exam not scheduled</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* Welcome Card layout */}
      <div className="bg-gradient-to-r from-brand-700 to-brand-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-lg shadow-brand-900/10">
        <div className="absolute right-0 bottom-0 translate-x-10 translate-y-10 opacity-10">
          <GraduationCap className="h-64 w-64" />
        </div>
        <div className="relative z-10 space-y-4">
          <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider">
            Evaluation Center
          </span>
          <div className="space-y-1">
            <h2 className="text-3xl font-extrabold tracking-tight">Welcome, {user?.name}</h2>
            <p className="text-white/80 text-sm font-medium">Account: Candidate</p>
          </div>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Active assigned Exams */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-brand-650" />
            <span>Assigned Examinations</span>
          </h3>

          {pendingExams.length > 0 ? (
            <div className="space-y-4">
              {pendingExams.map((exam) => (
                <div 
                  key={exam._id} 
                  className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition"
                >
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-800 dark:text-white text-base">
                      {exam.title}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg line-clamp-2">
                      {exam.description || 'Pre-employment evaluation schedule.'}
                    </p>
                    
                    {/* Metas */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-450 pt-2 font-medium">
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4 shrink-0" />
                        <span>{exam.duration} Minutes</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>Deadline: {new Date(exam.endDate).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  {/* Start Button */}
                  <button
                    onClick={() => navigate(`/candidate/instructions/${exam._id}`)}
                    className="w-full md:w-auto px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-500/20 hover:scale-[1.01] transition shrink-0 flex items-center justify-center space-x-2"
                  >
                    <span>Start Exam</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/55 text-slate-400 text-sm font-semibold">
              Exam not scheduled
            </div>
          )}
        </div>

        {/* Right column: Results overview / certificates */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
            <Award className="h-5 w-5 text-emerald-500" />
            <span>Completed Examinations</span>
          </h3>

          {completedExams.length > 0 ? (
            <div className="space-y-4">
              {completedExams.map((res) => (
                <div 
                  key={res._id} 
                  className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm line-clamp-1">
                        {res.exam ? res.exam.title : 'Deleted Exam'}
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        Completed: {new Date(res.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      res.status === 'Pass' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                    }`}>
                      {res.status}
                    </span>
                  </div>

                  {/* Scores breakdown */}
                  <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-50 dark:border-slate-750 text-xs">
                    <div>
                      <span className="text-slate-400">Score Obtained</span>
                      <p className="font-bold text-slate-800 dark:text-white">{res.score} Marks</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Percentage</span>
                      <p className="font-bold text-slate-800 dark:text-white">{res.percentage.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Certificate Download Action */}
                  <button
                    onClick={() => downloadResultPDF(res._id, res.exam ? res.exam.title : 'Assessment')}
                    className="w-full py-2 bg-slate-100 dark:bg-slate-700 hover:bg-brand-50 hover:text-brand-700 dark:hover:bg-brand-950/20 dark:hover:text-brand-300 text-slate-700 dark:text-white font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-2"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Download PDF Certificate</span>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/55 text-slate-400 text-sm">
              No exam results logged yet.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Profile;
