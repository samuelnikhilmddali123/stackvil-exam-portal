import React, { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminLayout = () => {
  const lastSeenViolationTimes = useRef({}); // { candidateId: lastViolationTimestamp }
  const isInitialLoad = useRef(true);

  // Global background poller for live proctoring violations
  useEffect(() => {
    const fetchLiveViolations = async () => {
      try {
        const res = await axios.get('/api/proctor/live');
        if (res.data.success) {
          const sessions = res.data.sessions || [];
          
          sessions.forEach(session => {
            if (session.lastActivityType === 'Tab Switch Violation') {
              const lastTime = new Date(session.lastActivityTime).getTime();
              const prevTime = lastSeenViolationTimes.current[session.candidateId];
              
              // Alert if we are past the initial load AND this is a new violation
              const isNewViolation = !prevTime || lastTime > prevTime;
              
              if (!isInitialLoad.current && isNewViolation) {
                toast.error(
                  `Security Alert: "${session.candidateName}" has switched tabs during "${session.examTitle}"!`,
                  { 
                    duration: 7000, 
                    icon: '⚠️',
                    style: {
                      border: '1px solid #dc2626',
                      padding: '16px',
                      color: '#dc2626',
                      fontWeight: 'bold',
                      background: '#fef2f2',
                      boxShadow: '0 4px 12px rgba(220, 38, 38, 0.15)'
                    }
                  }
                );
              }
              
              // Store timestamp
              lastSeenViolationTimes.current[session.candidateId] = lastTime;
            }
          });

          // After first successful pull, mark initial load as false
          isInitialLoad.current = false;
        }
      } catch (err) {
        console.error('Background live proctor poll error:', err);
      }
    };

    // Run immediately on load
    fetchLiveViolations();

    // Poll every 10 seconds
    const interval = setInterval(fetchLiveViolations, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-screen bg-slate-50 dark:bg-slate-900 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex flex-col flex-1 h-full min-w-0">
        {/* Header Toolbar */}
        <Header />

        {/* Content Pane */}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
