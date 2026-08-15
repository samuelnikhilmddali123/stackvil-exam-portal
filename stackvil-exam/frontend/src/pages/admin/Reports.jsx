import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { 
  FileText, 
  FileDown, 
  Eye, 
  Clock, 
  AlertTriangle,
  Award,
  BookOpen,
  Camera,
  X,
  TrendingUp,
  UserCheck,
  FolderDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import JSZip from 'jszip';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const Reports = () => {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState('');
  const [reportData, setReportData] = useState(null);
  const [departmentReport, setDepartmentReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Proctor Logs Modal
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [proctorLogs, setProctorLogs] = useState([]);
  const [logCandidateName, setLogCandidateName] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      fetchExamReport(selectedExamId);
    } else {
      setReportData(null);
    }
  }, [selectedExamId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [exRes, deptRes] = await Promise.all([
        axios.get('/api/exams'),
        axios.get('/api/reports/departments')
      ]);
      
      if (exRes.data.success) {
        setExams(exRes.data.exams);
        // Pre-select first exam if available
        if (exRes.data.exams.length > 0) {
          setSelectedExamId(exRes.data.exams[0]._id);
        }
      }
      if (deptRes.data.success) {
        setDepartmentReport(deptRes.data.report);
      }
    } catch (err) {
      toast.error('Failed to load reports metadata.');
    } finally {
      setLoading(false);
    }
  };

  const fetchExamReport = async (examId) => {
    try {
      setDetailsLoading(true);
      const res = await axios.get(`/api/reports/exams/${examId}`);
      if (res.data.success) {
        setReportData(res.data);
      }
    } catch (err) {
      toast.error('Could not fetch exam statistics report.');
    } finally {
      setDetailsLoading(false);
    }
  };

  const viewProctorLogs = async (candidateId, candidateName) => {
    try {
      setLogsLoading(true);
      setLogCandidateName(candidateName);
      const res = await axios.get(`/api/reports/candidate/${candidateId}/exam/${selectedExamId}`);
      if (res.data.success) {
        setProctorLogs(res.data.proctorLog.logs || []);
        setIsLogsModalOpen(true);
      }
    } catch (err) {
      toast.error('Failed to load proctor log snapshots.');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!selectedExamId) return;
    try {
      const response = await axios.get(`/api/reports/exams/${selectedExamId}/export-excel`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Exam_${reportData.exam.title.replace(/\s+/g, '_')}_Report.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Spreadsheet report downloaded.');
    } catch (err) {
      toast.error('Failed to export Excel report.');
    }
  };

  const handleDownloadPDF = async (resultId, candidateName) => {
    try {
      const response = await axios.get(`/api/reports/results/${resultId}/download-pdf`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${candidateName.replace(/\s+/g, '_')}_Certificate.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('PDF Certificate downloaded.');
    } catch (err) {
      toast.error('Failed to compile PDF report.');
    }
  };

  const handleDownloadRound3Zip = async (resItem) => {
    const files = resItem.round3?.files;
    const fileEntries = files instanceof Map ? Object.fromEntries(files) : (files || {});
    const fileKeys = Object.keys(fileEntries);

    if (!fileKeys || fileKeys.length === 0) {
      toast.error('No Round 3 project files available for this candidate.');
      return;
    }

    try {
      const zip = new JSZip();
      const candName = (resItem.candidate?.name || 'Candidate').replace(/\s+/g, '_');
      const rootFolder = zip.folder(`${candName}_Round3_Submission`);

      for (const [filePath, content] of Object.entries(fileEntries)) {
        rootFolder.file(filePath, content || '');
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${candName}_Round3_Submission.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success(`Downloaded Round 3 project zip for ${resItem.candidate?.name}!`);
    } catch (err) {
      console.error('Project zip export error:', err);
      toast.error('Failed to generate project zip file.');
    }
  };

  // Department report chart config
  const deptChartData = {
    labels: departmentReport.map(r => r.department),
    datasets: [
      {
        label: 'Average Score (%)',
        data: departmentReport.map(r => r.averagePercentage),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 8,
      },
      {
        label: 'Pass Rate (%)',
        data: departmentReport.map(r => r.passRate),
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderRadius: 8,
      }
    ]
  };

  if (loading) {
    return <LoadingSkeleton type="page" />;
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Reports & Audits</h2>
          <p className="text-sm text-slate-400">Review candidate scores, proctor violation snapshots, and metrics</p>
        </div>

        {/* Dropdown to select Exam */}
        {exams.length > 0 && (
          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="py-2 px-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none shadow-sm"
          >
            {exams.map(e => (
              <option key={e._id} value={e._id}>{e.title}</option>
            ))}
          </select>
        )}
      </div>

      {/* Main Details block */}
      {selectedExamId && reportData ? (
        <div className="space-y-8">
          
          {/* Stats Cards Grid */}
          {detailsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
              {[1, 2, 3, 4].map(i => <LoadingSkeleton key={i} type="card" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                  <span>Total Submissions</span>
                  <UserCheck className="h-5 w-5 text-blue-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                  {reportData.stats.totalSubmissions}
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                  <span>Pass Percentage</span>
                  <Award className="h-5 w-5 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white text-emerald-500">
                  {reportData.stats.passPercentage}%
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                  <span>Avg Assessment Score</span>
                  <TrendingUp className="h-5 w-5 text-indigo-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                  {reportData.stats.averagePercentage}%
                </h3>
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-4">
                <div className="flex justify-between items-center text-slate-400 text-xs font-semibold uppercase">
                  <span>Avg Duration Taken</span>
                  <Clock className="h-5 w-5 text-amber-500" />
                </div>
                <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">
                  {Math.floor(reportData.stats.averageTimeTaken / 60)}m {reportData.stats.averageTimeTaken % 60}s
                </h3>
              </div>

            </div>
          )}

          {/* Candidates table result list */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center flex-wrap gap-4">
              <h3 className="font-bold text-slate-850 dark:text-slate-150 flex items-center space-x-2 text-base">
                <BookOpen className="h-5 w-5 text-brand-600" />
                <span>Candidate Performance Sheet</span>
              </h3>
              
              <button
                onClick={handleDownloadExcel}
                className="flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-750 dark:text-slate-200 font-semibold text-xs rounded-lg transition"
              >
                <FileDown className="h-4 w-4" />
                <span>Download Excel Report</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase">
                    <th className="px-6 py-4">Candidate</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Result</th>
                    <th className="px-6 py-4 text-center">Warnings</th>
                    <th className="px-6 py-4 text-center font-bold text-slate-700 dark:text-slate-350">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-sm">
                  {reportData.results.length > 0 ? (
                    reportData.results.map((res) => (
                      <tr key={res._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {res.candidate ? res.candidate.name : 'Unknown Candidate'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {res.candidate ? res.candidate.email : 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {res.candidate ? res.candidate.department : 'General'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800 dark:text-white">
                            {res.score} Marks
                          </span>
                          <span className="text-xs text-slate-400 block font-medium">
                            ({res.percentage.toFixed(1)}%)
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            res.status === 'Pass' 
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400' 
                              : 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
                          }`}>
                            {res.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold">
                          <span className={`px-2.5 py-1 rounded-lg text-xs ${
                            res.warningsCount >= 4 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 
                            res.warningsCount >= 1 ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20' :
                            'bg-slate-100 dark:bg-slate-700 text-slate-400'
                          }`}>
                            {res.warningsCount} / 5
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center space-x-3">
                            {/* View Result Details */}
                            <button
                              onClick={() => navigate(`/admin/results/${res.candidate?._id}/${selectedExamId}`)}
                              disabled={!res.candidate}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition disabled:cursor-not-allowed"
                              title="View Result Details"
                            >
                              <Eye className="h-4.5 w-4.5" />
                            </button>
                            {/* View Proctor logs button */}
                            <button
                              onClick={() => viewProctorLogs(res.candidate?._id, res.candidate?.name)}
                              disabled={!res.candidate}
                              className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition disabled:cursor-not-allowed"
                              title="Audit Proctor Snapshots"
                            >
                              <Camera className="h-4.5 w-4.5" />
                            </button>
                            {/* Download PDF button */}
                            <button
                              onClick={() => handleDownloadPDF(res._id, res.candidate?.name)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg transition"
                              title="Download Performance Certificate"
                            >
                              <FileText className="h-4.5 w-4.5" />
                            </button>
                            {/* Download Round 3 Submitted Project ZIP button */}
                            {res.round3?.files && (res.round3.files instanceof Map ? res.round3.files.size > 0 : Object.keys(res.round3.files || {}).length > 0) && (
                              <button
                                onClick={() => handleDownloadRound3Zip(res)}
                                className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition"
                                title="Download Round 3 Project ZIP"
                              >
                                <FolderDown className="h-4.5 w-4.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-xs text-slate-400">
                        No submissions recorded for this exam yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="py-20 text-center text-slate-400 text-sm">
          Select an exam from the filter to view candidate statistics.
        </div>
      )}

      {/* Department summary report chart */}
      {departmentReport.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-brand-600" />
            <span>Department Wise Performance Reports</span>
          </h3>
          <div className="h-[280px]">
            <Bar
              data={deptChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { min: 0, max: 100 } }
              }}
            />
          </div>
        </div>
      )}

      {/* Proctor Logs Auditing Modal */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl p-6 border border-slate-100 dark:border-slate-700/50 space-y-6 max-h-[85vh] overflow-y-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center space-x-2">
                <Camera className="h-5 w-5 text-rose-600 animate-pulse" />
                <span>Proctoring Audit: {logCandidateName}</span>
              </h3>
              <button 
                onClick={() => { setIsLogsModalOpen(false); setProctorLogs([]); }} 
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Timelines grid */}
            <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
              {proctorLogs.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {proctorLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`bg-slate-50 dark:bg-slate-900 rounded-2xl border p-3 flex flex-col items-center justify-between text-center space-y-3 ${
                        log.warningNumber ? 'border-rose-100 dark:border-rose-950/40' : 'border-slate-200 dark:border-slate-850'
                      }`}
                    >
                      {/* Image snapshot frame preview */}
                      <div className="w-full aspect-[4/3] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center relative">
                        {log.imagePath ? (
                          <img 
                            src={`${API_BASE_URL}${log.imagePath}`} 
                            alt="Proctor Snapshot" 
                            className="w-full h-full object-cover transform -scale-x-100"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23dc2626" stroke-width="2"%3E%3Cpath d="M2 2l20 20M12 4.5l-8 8V20h16v-7.5"/%3E%3C/svg%3E';
                            }}
                          />
                        ) : (
                          <div className="text-[10px] text-slate-500 font-semibold p-2">Snapshot Missing</div>
                        )}
                        
                        {/* Type indicator bubble */}
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider text-white ${
                          log.warningNumber ? 'bg-rose-600' : 'bg-slate-800'
                        }`}>
                          {log.type}
                        </div>
                      </div>

                      {/* Log details */}
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {log.warningNumber ? `Warning #${log.warningNumber}` : 'Periodic Capture'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-slate-350" />
                  <span>No proctoring violation alerts or logs uploaded for this session.</span>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                onClick={() => { setIsLogsModalOpen(false); setProctorLogs([]); }}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-650 font-semibold text-xs rounded-xl transition"
              >
                Close Audits
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Reports;
