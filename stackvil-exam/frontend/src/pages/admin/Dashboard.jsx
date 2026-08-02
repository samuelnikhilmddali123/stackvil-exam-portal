import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Users, 
  Calendar, 
  FileCheck, 
  Clock, 
  CheckCircle, 
  Award, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import toast from 'react-hot-toast';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/admin/dashboard');
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      toast.error('Could not fetch dashboard metrics.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <LoadingSkeleton type="chart" />
          </div>
          <div>
            <LoadingSkeleton type="table" />
          </div>
        </div>
      </div>
    );
  }

  // Chart configs
  const performanceData = {
    labels: ['Pass Percentage', 'Average Score'],
    datasets: [
      {
        label: 'Candidates Success Rates (%)',
        data: [stats.passPercentage || 0, stats.averageScore || 0],
        backgroundColor: ['rgba(59, 130, 246, 0.85)', 'rgba(16, 185, 129, 0.85)'],
        borderRadius: 12,
        barThickness: 36,
      },
    ],
  };

  const distributionData = {
    labels: ['Completed Exams', 'Pending Exams'],
    datasets: [
      {
        data: [stats.completedExams || 0, stats.pendingExams || 0],
        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(245, 158, 11, 0.8)'],
        borderWidth: 0,
      },
    ],
  };

  const cardItems = [
    { name: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
    { name: "Today's Exams", value: stats.todaysExams, icon: Calendar, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
    { name: 'Completed Submissions', value: stats.completedExams, icon: FileCheck, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
    { name: 'Active Pending Exams', value: stats.pendingExams, icon: Clock, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
    { name: 'Success Rate', value: `${stats.passPercentage}%`, icon: CheckCircle, color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/30' },
    { name: 'Avg Assessment Score', value: `${stats.averageScore}%`, icon: Award, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Overview</h2>
        <p className="text-sm text-slate-400">Welcome to your management dashboard</p>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        {cardItems.map((item, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col justify-between space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">{item.name}</span>
              <div className={`p-2 rounded-xl ${item.color}`}>
                <item.icon className="h-5 w-5 shrink-0" />
              </div>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white">{item.value}</h3>
          </div>
        ))}
      </div>

      {/* Analytics Charts & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Bar Chart & Doughnut */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-brand-500" />
              <span>Assessment Performance Rates</span>
            </h3>
            <div className="h-[260px] flex items-center justify-center">
              <Bar 
                data={performanceData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: { y: { min: 0, max: 100 } },
                  plugins: { legend: { display: false } }
                }} 
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50">
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-6">Exams Volume breakdown</h3>
            <div className="h-[220px] flex items-center justify-center">
              <div className="h-full aspect-square">
                <Doughnut 
                  data={distributionData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                  }} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity List */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex flex-col h-full justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-700 dark:text-slate-200 mb-6">Recent Portal Activity</h3>
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {stats.recentActivity && stats.recentActivity.length > 0 ? (
                stats.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start space-x-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl">
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${
                      activity.type === 'exam_submitted' ? 'bg-emerald-500' : 'bg-blue-500'
                    }`}></span>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {activity.message}
                      </p>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-400 py-12">
                  No activity logs registered yet.
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-slate-700 mt-6 text-center">
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 inline-flex items-center space-x-1 hover:underline cursor-pointer">
              <span>View detailed audits</span>
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
