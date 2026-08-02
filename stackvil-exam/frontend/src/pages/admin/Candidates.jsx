import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  FileDown, 
  FileUp, 
  X, 
  Loader2, 
  UserPlus, 
  CheckCircle,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import { useNavigate } from 'react-router-dom';

const Candidates = () => {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState(null);

  // Form inputs state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('active');
  const [formPassword, setFormPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Excel Import
  const [importing, setImporting] = useState(false);

  // Profile modal and exams mapping
  const [allExams, setAllExams] = useState([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileCandidate, setProfileCandidate] = useState(null);

  // Assign Exam modal mapping
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [candidateToAssign, setCandidateToAssign] = useState(null);
  const [selectedExamId, setSelectedExamId] = useState('');

  useEffect(() => {
    fetchCandidates();
    fetchExams();
  }, [searchTerm, deptFilter, statusFilter]);

  const fetchExams = async () => {
    try {
      const res = await axios.get('/api/exams');
      if (res.data.success) {
        setAllExams(res.data.exams);
      }
    } catch (err) {
      console.error('Error loading exams:', err);
    }
  };

  const openProfileModal = (cand) => {
    setProfileCandidate(cand);
    setIsProfileModalOpen(true);
  };

  // Custom Exam Form Hooks
  const [customTitle, setCustomTitle] = useState('');
  const [customDuration, setCustomDuration] = useState(60);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [aptitudeFile, setAptitudeFile] = useState(null);
  const [technicalFile, setTechnicalFile] = useState(null);
  const [customCodingTitle, setCustomCodingTitle] = useState('');
  const [customCodingTemplate, setCustomCodingTemplate] = useState('');
  const [customCodingInput, setCustomCodingInput] = useState('');
  const [customCodingOutput, setCustomCodingOutput] = useState('');

  const openAssignModal = (cand) => {
    setCandidateToAssign(cand);
    
    // Initialize default dates
    const now = new Date();
    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    // Format to datetime-local inputs: YYYY-MM-DDTHH:MM
    const formatDate = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setCustomTitle(`${cand.name}'s Custom Assessment`);
    setCustomDuration(60);
    setCustomStartDate(formatDate(now));
    setCustomEndDate(formatDate(future));
    
    setAptitudeFile(null);
    setTechnicalFile(null);
    setCustomCodingTitle('');
    setCustomCodingTemplate(`function solution(n) {\n  // Write code here\n}`);
    setCustomCodingInput('');
    setCustomCodingOutput('');
    
    setIsAssignModalOpen(true);
  };

  const clearCustomExamForm = () => {
    setCustomTitle('');
    setCustomDuration(60);
    setCustomStartDate('');
    setCustomEndDate('');
    setAptitudeFile(null);
    setTechnicalFile(null);
    setCustomCodingTitle('');
    setCustomCodingTemplate('');
    setCustomCodingInput('');
    setCustomCodingOutput('');
  };

  const handleCustomExamSubmit = async (e) => {
    e.preventDefault();

    if (!aptitudeFile && !technicalFile) {
      toast.error('Add at least one round (Aptitude PDF or Technical PDF)');
      return;
    }

    try {
      setSubmitting(true);

      const now = new Date();
      const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

      const formData = new FormData();
      formData.append('title', customTitle);
      formData.append('duration', customDuration);
      formData.append('startDate', now.toISOString());
      formData.append('endDate', future.toISOString());

      if (aptitudeFile) {
        formData.append('aptitudePdf', aptitudeFile);
      }
      if (technicalFile) {
        formData.append('technicalPdf', technicalFile);
      }



      const res = await axios.post(`/api/admin/candidates/${candidateToAssign._id}/create-custom-exam`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success(res.data.message || 'Custom Exam scheduled successfully!');
        setIsAssignModalOpen(false);
        setCandidateToAssign(null);
        clearCustomExamForm();
        fetchExams();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to schedule custom exam.');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (deptFilter) params.department = deptFilter;
      if (statusFilter) params.status = statusFilter;

      const response = await axios.get('/api/admin/candidates', { params });
      if (response.data.success) {
        setCandidates(response.data.candidates);
      }
    } catch (error) {
      toast.error('Failed to reload candidates database.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: formName,
        email: formEmail,
        password: formPassword || undefined,
      };

      const res = await axios.post('/api/admin/candidates', payload);
      if (res.data.success) {
        toast.success('Candidate profile added and credentials emailed.');
        setIsAddModalOpen(false);
        clearForm();
        fetchCandidates();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create candidate user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        name: formName,
        email: formEmail,
        status: formStatus,
      };
      if (formPassword) payload.password = formPassword;

      const res = await axios.put(`/api/admin/candidates/${currentCandidate._id}`, payload);
      if (res.data.success) {
        toast.success('Candidate details updated.');
        setIsEditModalOpen(false);
        clearForm();
        fetchCandidates();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update candidate details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this candidate? All their exam history and logs will be permanently deleted.')) return;
    try {
      const res = await axios.delete(`/api/admin/candidates/${id}`);
      if (res.data.success) {
        toast.success('Candidate profile deleted successfully.');
        fetchCandidates();
      }
    } catch (err) {
      toast.error('Could not delete candidate.');
    }
  };

  const handleExcelImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('excel', file);

    try {
      setImporting(true);
      const res = await axios.post('/api/admin/candidates/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success(res.data.message);
        fetchCandidates();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Excel import failed. Check column headers (Name, Email, Department)');
    } finally {
      setImporting(false);
      e.target.value = null; // Reset file input
    }
  };

  const handleExcelExport = async () => {
    try {
      const response = await axios.get('/api/admin/candidates/export', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Candidates_Export.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Candidates list downloaded.');
    } catch (err) {
      toast.error('Failed to export candidates.');
    }
  };

  const openEdit = (cand) => {
    setCurrentCandidate(cand);
    setFormName(cand.name);
    setFormEmail(cand.email);
    setFormStatus(cand.status);
    setFormPassword('');
    setIsEditModalOpen(true);
  };

  const clearForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormStatus('active');
    setCurrentCandidate(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Candidate Database</h2>
          <p className="text-sm text-slate-400">Manage exam participants and credentials distribution</p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Import Button */}
          <label className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl cursor-pointer transition">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            <span>Import Excel</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" disabled={importing} />
          </label>

          {/* Export Button */}
          <button
            onClick={handleExcelExport}
            className="flex items-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl transition"
          >
            <FileDown className="h-4 w-4" />
            <span>Export Database</span>
          </button>

          {/* Add Manual Button */}
          <button
            onClick={() => { clearForm(); setIsAddModalOpen(true); }}
            className="flex items-center space-x-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-brand-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Candidate</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Box Card */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400">
            <Filter className="h-4 w-4" />
            <span>Filters:</span>
          </div>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Product Development">Product Development</option>
            <option value="General">General</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Main Database Table Card */}
      {loading ? (
        <LoadingSkeleton type="table" />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-sm">
                {candidates.length > 0 ? (
                  candidates.map((cand) => (
                    <tr key={cand._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                      {/* Name */}
                      <td className="px-6 py-4 font-semibold text-slate-850 dark:text-slate-150">
                        <button
                          type="button"
                          onClick={() => openProfileModal(cand)}
                          className="hover:text-brand-600 hover:underline transition text-left focus:outline-none"
                        >
                          {cand.name}
                        </button>
                      </td>
                      {/* Email */}
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                        {cand.email}
                      </td>
                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                          cand.status === 'active' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            cand.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}></span>
                          <span className="capitalize">{cand.status}</span>
                        </span>
                      </td>
                      {/* Actions */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => openAssignModal(cand)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-semibold text-xs rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 transition shadow-xs"
                            title="Schedule Custom Exam"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Schedule</span>
                          </button>
                          <button
                            onClick={() => openEdit(cand)}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
                            title="Edit Candidate"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cand._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
                            title="Delete Candidate"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-xs text-slate-400">
                      No candidates found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modals Code Layout */}
      {(isAddModalOpen || isEditModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-100 dark:border-slate-700/50 space-y-5 animate-scaleUp">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-brand-600" />
                <span>{isAddModalOpen ? 'Add Candidate Profile' : 'Update Candidate Details'}</span>
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); clearForm(); }} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={isAddModalOpen ? handleAddSubmit : handleEditSubmit} className="space-y-4" autoComplete="off">
              {/* Dummy fields to trap and isolate browser autofill */}
              <input type="text" name="dummy_email" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />
              <input type="password" name="dummy_password" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. John Doe"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="off"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>

              {/* Password Override */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  {isAddModalOpen ? 'Set Password (Optional)' : 'Update Password (Optional)'}
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder={isAddModalOpen ? 'Auto-generated if empty' : 'Leave blank to keep same'}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                />
              </div>

              {/* Status */}
              {isEditModalOpen && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Account Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); clearForm(); }}
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
                  <span>{isAddModalOpen ? 'Save Candidate' : 'Apply Updates'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Candidate Profile Modal */}
      {isProfileModalOpen && profileCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl p-6 border border-slate-100 dark:border-slate-700/50 space-y-6">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Candidate Profile
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileModalOpen(false);
                    openAssignModal(profileCandidate);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition shadow-sm"
                  title="Schedule Exam for this candidate"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Schedule
                </button>
                <button 
                  onClick={() => { setIsProfileModalOpen(false); setProfileCandidate(null); }} 
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-4 text-left">
              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-bold">Name</span>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{profileCandidate.name}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-450 uppercase block font-bold">Email ID</span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-350">{profileCandidate.email}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-550 uppercase block mb-3">Assigned Examinations</span>
                
                {(() => {
                  const candidateExams = allExams.filter(exam => 
                    exam.assignedCandidates?.some(cId => 
                      (typeof cId === 'object' ? cId._id : cId) === profileCandidate._id
                    )
                  );

                  if (candidateExams.length === 0) {
                    return (
                      <div className="p-6 text-center bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-dashed border-slate-200 dark:border-slate-750/85 space-y-3">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Exam not scheduled</p>
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileModalOpen(false);
                            openAssignModal(profileCandidate);
                          }}
                          className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-[11px] font-bold shadow-md shadow-brand-500/10 transition"
                        >
                          Assign Exam
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                      {candidateExams.map(ex => (
                        <div key={ex._id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-800">
                          <div>
                            <p className="font-bold text-xs text-slate-800 dark:text-white">{ex.title}</p>
                            <p className="text-[10px] text-slate-400">Duration: {ex.duration} Mins</p>
                          </div>
                          <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 rounded text-[9px] font-bold uppercase">
                            {ex.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => { setIsProfileModalOpen(false); setProfileCandidate(null); }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Custom Exam Modal */}
      {isAssignModalOpen && candidateToAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-xl shadow-2xl p-6 border border-slate-100 dark:border-slate-700/50 space-y-6 max-h-[90vh] overflow-y-auto animate-fadeIn">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-805 dark:text-white">
                  Schedule Custom Assessment
                </h3>
                <p className="text-[11px] text-slate-400">For Candidate: <strong className="text-brand-600">{candidateToAssign.name}</strong></p>
              </div>
              <button 
                onClick={() => { setIsAssignModalOpen(false); setCandidateToAssign(null); clearCustomExamForm(); }} 
                className="p-1 text-slate-400 hover:text-slate-655 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCustomExamSubmit} className="space-y-4 text-left">
              
              {/* Exam Title & Duration */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Assessment Title</label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Dileep's Custom Evaluation"
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Duration (Minutes)</label>
                  <input
                    type="number"
                    required
                    min={15}
                    value={customDuration}
                    onChange={(e) => setCustomDuration(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 text-slate-850 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>



              <hr className="border-slate-100 dark:border-slate-700" />

              {/* Rounds */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wider">Assessment Rounds Setup</h4>

                {/* Round 1: Aptitude PDF */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-750/80 space-y-2">
                  <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 rounded text-[9px] font-bold uppercase">
                    Round 1: Aptitude Section
                  </span>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Upload Aptitude PDF Questions</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setAptitudeFile(e.target.files[0])}
                      className="text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 dark:file:bg-slate-800 dark:file:text-slate-350 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Round 2: Technical PDF */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-750/80 space-y-2">
                  <span className="px-2 py-0.5 bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-400 rounded text-[9px] font-bold uppercase">
                    Round 2: Technical Section
                  </span>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Upload Technical PDF Questions</label>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setTechnicalFile(e.target.files[0])}
                      className="text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 dark:file:bg-slate-800 dark:file:text-slate-350 cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsAssignModalOpen(false); setCandidateToAssign(null); clearCustomExamForm(); }}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold text-xs rounded-xl transition flex items-center justify-center space-x-1"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Exam</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Candidates;
