import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  BookOpen, 
  Calendar, 
  Clock, 
  CheckSquare, 
  Square,
  Users, 
  Trash2, 
  Edit3, 
  X, 
  Loader2, 
  AlertCircle,
  Award
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const Exams = () => {
  const [exams, setExams] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);

  // Form parameters
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(30);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [passingScore, setPassingScore] = useState(50);
  const [status, setStatus] = useState('Draft');
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  
  // Selected lists
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchQuestionsAndCandidates();
  }, []);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/exams');
      if (res.data.success) {
        setExams(res.data.exams);
      }
    } catch (err) {
      toast.error('Failed to load exams list.');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestionsAndCandidates = async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        axios.get('/api/exams/questions/all'),
        axios.get('/api/admin/candidates')
      ]);
      if (qRes.data.success) setQuestions(qRes.data.questions);
      if (cRes.data.success) setCandidates(cRes.data.candidates);
    } catch (err) {
      console.error('Error fetching questions/candidates for dropdowns:', err);
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) {
      toast.error('Please assign at least one question to the exam.');
      return;
    }
    
    try {
      setSubmitting(true);
      const payload = {
        title,
        description,
        duration: parseInt(duration),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        passingScore: parseInt(passingScore),
        status,
        randomizeQuestions,
        shuffleOptions,
        questions: selectedQuestions,
        assignedCandidates: selectedCandidates,
      };

      let res;
      if (editingExam) {
        res = await axios.put(`/api/exams/${editingExam._id}`, payload);
      } else {
        res = await axios.post('/api/exams', payload);
      }

      if (res.data.success) {
        toast.success(editingExam ? 'Exam updated successfully.' : 'New exam scheduled successfully.');
        setIsModalOpen(false);
        clearForm();
        fetchExams();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save exam configurations.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this exam schedule? All candidate results associated with this exam will be deleted.')) return;
    try {
      const res = await axios.delete(`/api/exams/${id}`);
      if (res.data.success) {
        toast.success('Exam schedule deleted successfully.');
        fetchExams();
      }
    } catch (err) {
      toast.error('Could not delete exam.');
    }
  };

  const openAdd = () => {
    clearForm();
    setIsModalOpen(true);
  };

  const openEdit = (exam) => {
    setEditingExam(exam);
    setTitle(exam.title);
    setDescription(exam.description || '');
    setDuration(exam.duration);
    
    // Format dates for inputs
    const start = new Date(exam.startDate);
    start.setMinutes(start.getMinutes() - start.getTimezoneOffset());
    setStartDate(start.toISOString().slice(0, 16));

    const end = new Date(exam.endDate);
    end.setMinutes(end.getMinutes() - end.getTimezoneOffset());
    setEndDate(end.toISOString().slice(0, 16));

    setPassingScore(exam.passingScore);
    setStatus(exam.status);
    setRandomizeQuestions(exam.randomizeQuestions);
    setShuffleOptions(exam.shuffleOptions);
    
    setSelectedQuestions(exam.questions.map(q => q._id));
    setSelectedCandidates(exam.assignedCandidates.map(c => c._id));
    
    setIsModalOpen(true);
  };

  const toggleQuestionSelection = (id) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const toggleCandidateSelection = (id) => {
    setSelectedCandidates(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const clearForm = () => {
    setEditingExam(null);
    setTitle('');
    setDescription('');
    setDuration(30);
    setStartDate('');
    setEndDate('');
    setPassingScore(50);
    setStatus('Draft');
    setRandomizeQuestions(false);
    setShuffleOptions(false);
    setSelectedQuestions([]);
    setSelectedCandidates([]);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Exam Orchestration</h2>
          <p className="text-sm text-slate-400">Schedule examinations, assign question blocks, and candidate logs</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-500/20 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Schedule Exam</span>
        </button>
      </div>

      {/* Main content grid (cards) */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.length > 0 ? (
            exams.map((exam) => (
              <div 
                key={exam._id} 
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm p-6 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  {/* Title and status */}
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      exam.status === 'Active' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                        : exam.status === 'Completed'
                        ? 'bg-slate-100 dark:bg-slate-750 text-slate-600 dark:text-slate-400'
                        : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                    }`}>
                      {exam.status}
                    </span>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEdit(exam)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(exam._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-slate-800 dark:text-white line-clamp-1 mb-2">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                    {exam.description || 'No description provided.'}
                  </p>

                  {/* Metas */}
                  <div className="space-y-2.5 text-xs text-slate-500 dark:text-slate-400 pt-4 border-t border-slate-50 dark:border-slate-700/60">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Duration: <strong>{exam.duration} minutes</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        Starts: {new Date(exam.startDate).toLocaleDateString()} at {new Date(exam.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Questions count: <strong>{exam.questions?.length || 0} questions</strong></span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>Candidates count: <strong>{exam.assignedCandidates?.length || 0} profiles</strong></span>
                    </div>
                  </div>
                </div>

                {/* Score Tag */}
                <div className="mt-5 pt-3 border-t border-slate-50 dark:border-slate-700/65 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Passing Cutoff</span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-750 text-slate-700 dark:text-slate-300 rounded font-bold">
                    {exam.passingScore}%
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-slate-400 text-sm">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <span>No examinations scheduled yet. Click "Schedule Exam" to start.</span>
            </div>
          )}
        </div>
      )}

      {/* Main Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 border border-slate-100 dark:border-slate-700/50 space-y-6 max-h-[90vh] overflow-y-auto my-8">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-brand-600" />
                <span>{editingExam ? 'Update Exam Schedule' : 'Schedule New Exam'}</span>
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); clearForm(); }} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateOrUpdate} className="space-y-6">
              
              {/* Layout grid for parameters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Title */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Exam Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. JavaScript Assessment"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write instructions or description for candidates..."
                    rows={2}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* Duration */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* Passing score */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Passing Score (%)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={passingScore}
                    onChange={(e) => setPassingScore(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Start Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">End Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                  />
                </div>

                {/* Status selection */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Publishing Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Active">Active (Publish immediately)</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Anti Cheating randomization toggles */}
                <div className="md:col-span-2 py-2 flex flex-col sm:flex-row gap-4 border-y border-slate-50 dark:border-slate-700 mt-2">
                  <button
                    type="button"
                    onClick={() => setRandomizeQuestions(!randomizeQuestions)}
                    className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-350"
                  >
                    {randomizeQuestions ? <CheckSquare className="h-5 w-5 text-brand-600" /> : <Square className="h-5 w-5" />}
                    <span>Randomize Questions order per candidate</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShuffleOptions(!shuffleOptions)}
                    className="flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-350"
                  >
                    {shuffleOptions ? <CheckSquare className="h-5 w-5 text-brand-600" /> : <Square className="h-5 w-5" />}
                    <span>Shuffle MCQ options sequence</span>
                  </button>
                </div>

              </div>

              {/* Assignment Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Questions Checklist */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase flex items-center justify-between">
                    <span>Select Questions ({selectedQuestions.length} chosen)</span>
                    <span className="text-[10px] text-brand-600 dark:text-brand-400 capitalize">Required</span>
                  </label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl h-[180px] overflow-y-auto bg-slate-50 dark:bg-slate-900/60 p-4 space-y-2">
                    {questions.length > 0 ? (
                      questions.map(q => (
                        <button
                          key={q._id}
                          type="button"
                          onClick={() => toggleQuestionSelection(q._id)}
                          className={`w-full flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs transition ${
                            selectedQuestions.includes(q._id)
                              ? 'bg-brand-50 border-brand-200 text-brand-900 dark:bg-brand-950/20 dark:border-brand-900/60 dark:text-brand-350'
                              : 'bg-white border-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700/60'
                          }`}
                        >
                          {selectedQuestions.includes(q._id) ? <CheckSquare className="h-4 w-4 shrink-0 text-brand-600" /> : <Square className="h-4 w-4 shrink-0" />}
                          <span className="line-clamp-1 flex-1 font-semibold">{q.text}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded capitalize">{q.type}</span>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-10">No questions available. Add to Question Bank first.</p>
                    )}
                  </div>
                </div>

                {/* Candidates Checklist */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Assign Candidates ({selectedCandidates.length} assigned)
                  </label>
                  <div className="border border-slate-200 dark:border-slate-700 rounded-2xl h-[180px] overflow-y-auto bg-slate-50 dark:bg-slate-900/60 p-4 space-y-2">
                    {candidates.length > 0 ? (
                      candidates.map(c => (
                        <button
                          key={c._id}
                          type="button"
                          onClick={() => toggleCandidateSelection(c._id)}
                          className={`w-full flex items-center space-x-2 p-2.5 rounded-xl border text-left text-xs transition ${
                            selectedCandidates.includes(c._id)
                              ? 'bg-brand-50 border-brand-200 text-brand-900 dark:bg-brand-950/20 dark:border-brand-900/60 dark:text-brand-350'
                              : 'bg-white border-slate-100 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700/60'
                          }`}
                        >
                          {selectedCandidates.includes(c._id) ? <CheckSquare className="h-4 w-4 shrink-0 text-brand-600" /> : <Square className="h-4 w-4 shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">{c.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{c.email}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 text-center py-10">No candidates registered. Create profiles first.</p>
                    )}
                  </div>
                </div>

              </div>

              {/* Submit panel */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setIsModalOpen(false); clearForm(); }}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center space-x-1"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>{editingExam ? 'Save Changes' : 'Schedule Exam'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Exams;
