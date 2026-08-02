import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  HelpCircle, 
  FileUp, 
  X, 
  Loader2, 
  AlertCircle,
  Tag,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const Questions = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Form Fields
  const [text, setText] = useState('');
  const [type, setType] = useState('MCQ');
  const [category, setCategory] = useState('General');
  const [difficulty, setDifficulty] = useState('Medium');
  const [marks, setMarks] = useState(1);
  const [imageUrl, setImageUrl] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [checkboxCorrect, setCheckboxCorrect] = useState([]); // For Checkbox answers

  // Coding specific
  const [codeTemplate, setCodeTemplate] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [testCases, setTestCases] = useState([{ input: '', output: '' }]);

  // Upload progress
  const [importing, setImporting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, [categoryFilter, difficultyFilter, typeFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryFilter) params.category = categoryFilter;
      if (difficultyFilter) params.difficulty = difficultyFilter;
      if (typeFilter) params.type = typeFilter;

      const res = await axios.get('/api/exams/questions/all', { params });
      if (res.data.success) {
        setQuestions(res.data.questions);
      }
    } catch (err) {
      toast.error('Failed to load questions from database.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOption = () => {
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) return;
    const newOptions = [...options];
    newOptions.splice(index, 1);
    setOptions(newOptions);
  };

  const handleOptionChange = (value, index) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleAddTestCase = () => {
    setTestCases([...testCases, { input: '', output: '' }]);
  };

  const handleRemoveTestCase = (index) => {
    if (testCases.length <= 1) return;
    const newCases = [...testCases];
    newCases.splice(index, 1);
    setTestCases(newCases);
  };

  const handleTestCaseChange = (field, value, index) => {
    const newCases = [...testCases];
    newCases[index][field] = value;
    setTestCases(newCases);
  };

  const handleCheckboxToggle = (val) => {
    setCheckboxCorrect(prev =>
      prev.includes(val) ? prev.filter(item => item !== val) : [...prev, val]
    );
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excel', file);

    try {
      setImporting(true);
      const res = await axios.post('/api/exams/questions/import-excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchQuestions();
      }
    } catch (err) {
      toast.error('Excel format mismatch. Required cols: Question Text, Type, Correct Answer');
    } finally {
      setImporting(false);
      e.target.value = null;
    }
  };

  const handlePDFImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      setImporting(true);
      const res = await axios.post('/api/exams/questions/import-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data.success) {
        toast.success(res.data.message);
        fetchQuestions();
      }
    } catch (err) {
      toast.error('Failed to import PDF questions.');
    } finally {
      setImporting(false);
      e.target.value = null;
    }
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      let correctAnsPayload = correctAnswer;
      if (type === 'Checkbox') {
        correctAnsPayload = checkboxCorrect;
        if (correctAnsPayload.length === 0) {
          toast.error('Select at least one correct checkbox answer.');
          return;
        }
      }

      const payload = {
        text,
        type,
        category,
        difficulty,
        marks: parseInt(marks),
        correctAnswer: correctAnsPayload,
      };

      if (type === 'MCQ' || type === 'Checkbox') {
        // filter empty options
        const filteredOptions = options.filter(opt => opt.trim() !== '');
        if (filteredOptions.length < 2) {
          toast.error('MCQ/Checkbox questions must have at least 2 options.');
          return;
        }
        payload.options = filteredOptions;
      }

      if (type === 'True/False') {
        payload.options = ['True', 'False'];
      }

      if (type === 'Image') {
        payload.imageUrl = imageUrl;
        if (!imageUrl) {
          toast.error('Image based questions require an image path/URL.');
          return;
        }
      }

      if (type === 'Coding') {
        payload.codeTemplates = [
          {
            language: codeLanguage,
            template: codeTemplate,
            testCases: testCases.filter(tc => tc.input !== '' && tc.output !== ''),
          }
        ];
        // Correct answer holds function template/body matching
        payload.correctAnswer = codeTemplate;
      }

      let res;
      if (editingQuestion) {
        res = await axios.put(`/api/exams/questions/all/${editingQuestion._id}`, payload);
      } else {
        res = await axios.post('/api/exams/questions/all', payload);
      }

      if (res.data.success) {
        toast.success(editingQuestion ? 'Question updated.' : 'Question created in bank.');
        setIsModalOpen(false);
        clearForm();
        fetchQuestions();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save question.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question? It will be removed from all assigned exams.')) return;
    try {
      const res = await axios.delete(`/api/exams/questions/all/${id}`);
      if (res.data.success) {
        toast.success('Question removed.');
        fetchQuestions();
      }
    } catch (err) {
      toast.error('Could not remove question.');
    }
  };

  const openAdd = () => {
    clearForm();
    setIsModalOpen(true);
  };

  const openEdit = (q) => {
    setEditingQuestion(q);
    setText(q.text);
    setType(q.type);
    setCategory(q.category);
    setDifficulty(q.difficulty);
    setMarks(q.marks);
    setImageUrl(q.imageUrl || '');
    setOptions(q.options?.length > 0 ? [...q.options, '', '', '', ''].slice(0, 4) : ['', '', '', '']);
    
    if (q.type === 'Checkbox') {
      setCheckboxCorrect(q.correctAnswer || []);
    } else {
      setCorrectAnswer(q.correctAnswer || '');
    }

    if (q.type === 'Coding' && q.codeTemplates?.length > 0) {
      const templateItem = q.codeTemplates[0];
      setCodeLanguage(templateItem.language);
      setCodeTemplate(templateItem.template);
      setTestCases(templateItem.testCases?.length > 0 ? templateItem.testCases : [{ input: '', output: '' }]);
    } else {
      setCodeLanguage('javascript');
      setCodeTemplate('');
      setTestCases([{ input: '', output: '' }]);
    }

    setIsModalOpen(true);
  };

  const clearForm = () => {
    setEditingQuestion(null);
    setText('');
    setType('MCQ');
    setCategory('General');
    setDifficulty('Medium');
    setMarks(1);
    setImageUrl('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setCheckboxCorrect([]);
    setCodeTemplate('');
    setCodeLanguage('javascript');
    setTestCases([{ input: '', output: '' }]);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Question Bank</h2>
          <p className="text-sm text-slate-400">Add, parse, or upload questions for examinations</p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl cursor-pointer transition">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            <span>Upload Excel</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" disabled={importing} />
          </label>

          <label className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl cursor-pointer transition">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4 text-emerald-600" />}
            <span>Upload Question PDF</span>
            <input type="file" accept=".pdf" onChange={handlePDFImport} className="hidden" disabled={importing} />
          </label>

          <button
            onClick={openAdd}
            className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Create Question</span>
          </button>
        </div>
      </div>

      {/* Filters Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-wrap items-center gap-4">
        
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
        >
          <option value="">All Question Types</option>
          <option value="MCQ">MCQ</option>
          <option value="Checkbox">Checkbox</option>
          <option value="True/False">True/False</option>
          <option value="Paragraph">Paragraph</option>
          <option value="Image">Image Based</option>
          <option value="Coding">Coding Sandbox</option>
        </select>

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
        >
          <option value="">All Difficulties</option>
          <option value="Easy">Easy</option>
          <option value="Medium">Medium</option>
          <option value="Hard">Hard</option>
        </select>

        <input
          type="text"
          placeholder="Filter by category..."
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="py-2 px-3 bg-slate-50 dark:bg-slate-900 text-slate-805 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Database List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {questions.length > 0 ? (
            questions.map((q) => (
              <div 
                key={q._id} 
                className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold uppercase">
                      {q.type}
                    </span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEdit(q)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(q._id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-slate-850 dark:text-slate-150 font-semibold text-sm line-clamp-3 mb-4 leading-relaxed">
                    {q.text}
                  </h3>
                </div>

                <div className="pt-4 border-t border-slate-50 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center space-x-2.5">
                    <span className="flex items-center space-x-1">
                      <Tag className="h-3.5 w-3.5" />
                      <span>{q.category}</span>
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      q.difficulty === 'Easy' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' :
                      q.difficulty === 'Medium' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                      'bg-rose-50 text-rose-600 dark:bg-rose-950/20'
                    }`}>{q.difficulty}</span>
                  </div>
                  <span className="font-bold text-slate-600 dark:text-slate-400">
                    {q.marks} Mark{q.marks > 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center text-slate-400">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-slate-350" />
              <span>No questions registered. Add manual question or upload templates.</span>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Question Modal Layout */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 border border-slate-100 dark:border-slate-700/50 space-y-6 max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <HelpCircle className="h-5 w-5 text-brand-600" />
                <span>{editingQuestion ? 'Edit Question Details' : 'Create Question'}</span>
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); clearForm(); }} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateOrUpdate} className="space-y-4 text-left">
              
              {/* Type Selection */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Question Type</label>
                <select
                  value={type}
                  onChange={(e) => { setType(e.target.value); setCorrectAnswer(''); }}
                  className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                >
                  <option value="MCQ">MCQ (Single Choice)</option>
                  <option value="Checkbox">Checkbox (Multiple Choice)</option>
                  <option value="True/False">True / False</option>
                  <option value="Paragraph">Paragraph (Written Answer)</option>
                  <option value="Image">Image Based MCQ</option>
                  <option value="Coding">Coding Sandbox</option>
                </select>
              </div>

              {/* Text */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Question Text</label>
                <textarea
                  required
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Enter the complete question here..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                />
              </div>

              {/* Category, Difficulty, Marks */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Marks</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                  />
                </div>
              </div>

              {/* Image URL (Only if type is Image) */}
              {type === 'Image' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Image Asset Path / URL</label>
                  <input
                    type="text"
                    required
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="e.g. /uploads/images/logo.png"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                  />
                </div>
              )}

              {/* Options lists: Show for MCQ / Checkbox / Image */}
              {(type === 'MCQ' || type === 'Checkbox' || type === 'Image') && (
                <div className="space-y-3 pt-2 animate-fadeIn">
                  <label className="text-xs font-bold text-slate-500 uppercase">Options Details (Option A, B, C, D)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Option A</label>
                      <input
                        type="text"
                        required
                        value={options[0] || ''}
                        onChange={(e) => handleOptionChange(e.target.value, 0)}
                        placeholder="Option A text"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-950 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Option B</label>
                      <input
                        type="text"
                        required
                        value={options[1] || ''}
                        onChange={(e) => handleOptionChange(e.target.value, 1)}
                        placeholder="Option B text"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Option C</label>
                      <input
                        type="text"
                        required
                        value={options[2] || ''}
                        onChange={(e) => handleOptionChange(e.target.value, 2)}
                        placeholder="Option C text"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Option D</label>
                      <input
                        type="text"
                        required
                        value={options[3] || ''}
                        onChange={(e) => handleOptionChange(e.target.value, 3)}
                        placeholder="Option D text"
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Correct Answer Value</label>
                    {type === 'Checkbox' ? (
                      <input
                        type="text"
                        required
                        value={Array.isArray(checkboxCorrect) ? checkboxCorrect.join(', ') : checkboxCorrect}
                        onChange={(e) => setCheckboxCorrect(e.target.value.split(',').map(s => s.trim()))}
                        placeholder="Type correct answers exactly, e.g. London, Paris"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    ) : (
                      <input
                        type="text"
                        required
                        value={correctAnswer}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        placeholder="Type the correct answer text exactly matching one of the options"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-955 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Correct answer input fields for True/False & Paragraph */}
              {type === 'True/False' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Correct Response</label>
                  <select
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none animate-fadeIn"
                  >
                    <option value="">Select Option</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                </div>
              )}

              {type === 'Paragraph' && (
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Key Grading Keywords (Comma separated)</label>
                  <input
                    type="text"
                    required
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="e.g. reconciliation, DOM, virtual"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
                  />
                </div>
              )}

              {/* Coding Question Section */}
              {type === 'Coding' && (
                <div className="space-y-4 border-t border-slate-50 dark:border-slate-700 pt-3">
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase">Coding Editor Templates</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Language</label>
                      <select
                        value={codeLanguage}
                        onChange={(e) => setCodeLanguage(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                      >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                      </select>
                    </div>
                  </div>

                  {/* Monaco template placeholder */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Starting Code Template</label>
                    <textarea
                      required
                      value={codeTemplate}
                      onChange={(e) => setCodeTemplate(e.target.value)}
                      placeholder="e.g. function add(a, b) { \n  // write code \n}"
                      rows={4}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none"
                    />
                  </div>

                  {/* Test Cases List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-500 uppercase">Assigned Unit Test Cases</label>
                      <button
                        type="button"
                        onClick={handleAddTestCase}
                        className="flex items-center space-x-1 text-xs text-brand-600 font-semibold"
                      >
                        <PlusCircle className="h-4 w-4" />
                        <span>Add Testcase</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {testCases.map((tc, idx) => (
                        <div key={idx} className="flex items-center space-x-2 gap-2">
                          <input
                            type="text"
                            required
                            placeholder="Input args e.g. 2, 5"
                            value={tc.input}
                            onChange={(e) => handleTestCaseChange('input', e.target.value, idx)}
                            className="w-1/2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Expected output e.g. 7"
                            value={tc.output}
                            onChange={(e) => handleTestCaseChange('output', e.target.value, idx)}
                            className="w-1/2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                          />
                          {testCases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTestCase(idx)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <MinusCircle className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-4">
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
                  <span>{editingQuestion ? 'Save Changes' : 'Create Question'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Questions;
