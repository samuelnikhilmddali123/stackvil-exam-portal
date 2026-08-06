import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, 
  Loader2, 
  UploadCloud, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Code,
  ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProjectFolderPicker from '../../components/vscode/ProjectFolderPicker';

const CreateCustomExam = () => {
  const { candidateId } = useParams();
  const navigate = useNavigate();

  // Candidate info
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [aptitudeFile, setAptitudeFile] = useState(null);
  const [technicalFile, setTechnicalFile] = useState(null);
  const [codingProjectFiles, setCodingProjectFiles] = useState({});

  const [savedExam, setSavedExam] = useState(null);
  const [scheduling, setScheduling] = useState(false);

  useEffect(() => {
    fetchCandidateInfo();
  }, [candidateId]);

  const fetchCandidateInfo = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/candidates');
      if (res.data.success) {
        const found = res.data.candidates.find(c => c._id === candidateId);
        if (found) {
          setCandidate(found);
          setTitle(`${found.name}'s Multi-Round Assessment`);
        } else {
          toast.error('Candidate not found.');
          navigate('/admin/candidates');
        }
      }
    } catch (err) {
      toast.error('Failed to load candidate information.');
      navigate('/admin/candidates');
    } finally {
      setLoading(false);
    }
  };

  const saveExamRounds = async () => {
    const hasCodingFiles = Object.keys(codingProjectFiles).length > 0;
    if (!aptitudeFile && !technicalFile && !hasCodingFiles) {
      toast.error('Please upload at least one round (Aptitude PDF, Technical PDF, or Coding Project Folder).');
      return null;
    }

    try {
      setSubmitting(true);

      const now = new Date();
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days window

      const formData = new FormData();
      formData.append('title', title);
      formData.append('duration', duration);
      formData.append('startDate', now.toISOString());
      formData.append('endDate', future.toISOString());

      if (aptitudeFile) {
        formData.append('aptitudePdf', aptitudeFile);
      }
      if (technicalFile) {
        formData.append('technicalPdf', technicalFile);
      }
      if (hasCodingFiles) {
        formData.append('codingProjectFiles', JSON.stringify(codingProjectFiles));
      }

      const res = await axios.post(`/api/admin/candidates/${candidateId}/create-custom-exam`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success && res.data.exam) {
        setSavedExam(res.data.exam);
        toast.success('Rounds uploaded & saved as draft! Click "Schedule Exam" to activate.');
        return res.data.exam;
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save custom assessment.');
      return null;
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    await saveExamRounds();
  };

  const handleScheduleExam = async () => {
    try {
      setScheduling(true);
      let targetExam = savedExam;

      if (!targetExam) {
        targetExam = await saveExamRounds();
        if (!targetExam) return;
      }

      const res = await axios.put(`/api/admin/exams/${targetExam._id}/schedule`);
      if (res.data.success) {
        toast.success(`Exam "${targetExam.title}" scheduled & activated live!`);
        navigate('/admin/candidates');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule exam.');
    } finally {
      setScheduling(false);
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
    <div className="max-w-5xl mx-auto space-y-6 text-left animate-fadeIn pb-12">
      {/* Back button */}
      <div>
        <Link
          to="/admin/candidates"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Candidates</span>
        </Link>
      </div>

      {/* Banner Card */}
      <div className="bg-gradient-to-r from-brand-700 to-indigo-800 text-white rounded-3xl p-6 sm:p-8 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Create Custom Assessment</h2>
          <p className="text-xs text-brand-100 font-medium">
            Schedule a real-time multi-round assessment for candidate: <strong className="text-white underline">{candidate?.name}</strong>
          </p>
        </div>
        <div className="px-4 py-1.5 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-[10px] font-black uppercase tracking-wider">
          Multi-Round Mode Active
        </div>
      </div>

      {/* Configuration Form */}
      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* Core Settings Card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 sm:p-8 space-y-6">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-slate-700">
            General Settings
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase block">Assessment Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Samuel's Fullstack Dev Evaluation"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase block">Duration per MCQ Round (Minutes)</label>
              <input
                type="number"
                required
                min={15}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Multi-Round Cards Grid */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest block">
            Assessment Rounds Layout
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Round 1 Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                    Round 1: Aptitude
                  </span>
                  <BookOpen className="h-4 w-4 text-brand-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Aptitude Assessment</h4>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Upload PDF list of questions. Validates candidate's logical, analytical, and critical reasoning ability.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-750">
                <label className="flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                  <UploadCloud className="h-6 w-6 text-slate-450 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {aptitudeFile ? 'Change PDF' : 'Select PDF File'}
                  </span>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setAptitudeFile(e.target.files[0])} 
                    className="hidden" 
                  />
                </label>
                {aptitudeFile && (
                  <div className="flex items-center space-x-2 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{aptitudeFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Round 2 Card */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="px-2.5 py-1 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                    Round 2: Technical
                  </span>
                  <Clock className="h-4 w-4 text-brand-500" />
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white">Technical Core MCQs</h4>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Upload PDF list of questions. Evaluates domain knowledge, language syntax, algorithms, and core design principles.
                </p>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-50 dark:border-slate-750">
                <label className="flex flex-col items-center justify-center px-4 py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition">
                  <UploadCloud className="h-6 w-6 text-slate-450 mb-1" />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    {technicalFile ? 'Change PDF' : 'Select PDF File'}
                  </span>
                  <input 
                    type="file" 
                    accept=".pdf" 
                    onChange={(e) => setTechnicalFile(e.target.files[0])} 
                    className="hidden" 
                  />
                </label>
                {technicalFile && (
                  <div className="flex items-center space-x-2 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                    <span className="truncate">{technicalFile.name}</span>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Round 3: Full Project Folder Upload Picker Card */}
          <div className="pt-4">
            <ProjectFolderPicker
              title="Round 3: VS Code Coding Project Folder Setup"
              filesMap={codingProjectFiles}
              onFilesChange={(filesMap) => setCodingProjectFiles(filesMap)}
            />
          </div>

        </div>

        {/* Draft Saved Status Banner */}
        {savedExam && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-xs font-bold text-emerald-800 dark:text-emerald-200">
                  Assessment Saved as Draft
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  ID: <code className="font-mono">{savedExam._id}</code> — Ready to be scheduled live.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded-full text-[10px] font-black uppercase">
              Draft Mode
            </span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/admin/candidates')}
            className="w-full sm:w-1/3 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-2xl transition text-center"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-1/3 py-3.5 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow transition flex items-center justify-center space-x-2 cursor-pointer"
          >
            {submitting && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
            <span>{savedExam ? 'Update Saved Draft' : 'Save Assessment (Draft)'}</span>
          </button>

          <button
            type="button"
            onClick={handleScheduleExam}
            disabled={submitting || scheduling}
            className={`w-full sm:w-1/3 py-3.5 ${
              savedExam 
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 animate-pulse' 
                : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
            } disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-lg hover:scale-[1.01] transition flex items-center justify-center space-x-2 cursor-pointer`}
          >
            {scheduling && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
            <span>Schedule Exam Now</span>
          </button>
        </div>

      </form>
    </div>
  );
};

export default CreateCustomExam;

