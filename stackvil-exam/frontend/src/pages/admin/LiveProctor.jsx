import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Radio, 
  Camera, 
  AlertTriangle, 
  Search, 
  Power, 
  Clock, 
  Users,
  ShieldAlert,
  FolderSync
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const LiveProctor = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pollingActive, setPollingActive] = useState(true);
  
  // Quick poll interval (every 10 seconds)
  useEffect(() => {
    fetchLiveSessions();
    if (!pollingActive) return;

    const interval = setInterval(() => {
      fetchLiveSessions(true); // silent fetch in background
    }, 10000);

    return () => clearInterval(interval);
  }, [pollingActive]);

  const socketRef = useRef(null);
  const pcsRef = useRef({});
  const [candidateStreams, setCandidateStreams] = useState({});

  const handleAdminWebRTCSignal = async (fromSocketId, signalData, candidateId, examId) => {
    try {
      const cIdStr = String(candidateId);
      let pc = pcsRef.current[cIdStr];

      if (signalData.type === 'offer') {
        if (pc) {
          pc.close();
        }

        pc = new RTCPeerConnection({
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        });

        pcsRef.current[cIdStr] = pc;

        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          setCandidateStreams(prev => ({
            ...prev,
            [cIdStr]: remoteStream
          }));
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit('send-webrtc-signal', {
              toSocketId: fromSocketId,
              signalData: { type: 'ice', candidate: event.candidate },
              candidateId,
              examId
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socketRef.current) {
          socketRef.current.emit('send-webrtc-signal', {
            toSocketId: fromSocketId,
            signalData: { type: 'answer', sdp: answer },
            candidateId,
            examId
          });
        }
      } else if (signalData.type === 'ice' && pc) {
        await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    } catch (err) {
      console.error('Error handling WebRTC signal for candidate:', candidateId, err);
    }
  };

  // Real-time WebSocket connection to receive WebRTC video streams & warning updates
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      path: '/socket.io'
    });
    socketRef.current = socket;

    socket.emit('join-admin-proctor');

    socket.on('candidate-online-webrtc', ({ socketId, candidateId }) => {
      socket.emit('send-admin-ping-to-candidate', { toSocketId: socketId });
      fetchLiveSessions(true);
    });

    socket.on('receive-webrtc-signal', ({ fromSocketId, signalData, candidateId, examId }) => {
      handleAdminWebRTCSignal(fromSocketId, signalData, candidateId, examId);
    });

    socket.on('candidate-warning-update', ({ candidateId, examId, warningsCount, lastActivityType, lastActivityTime }) => {
      setSessions(prevSessions => {
        let found = false;
        const updated = prevSessions.map(session => {
          if (String(session.candidateId) === String(candidateId) && String(session.examId) === String(examId)) {
            found = true;
            return {
              ...session,
              warningsCount,
              lastActivityType: lastActivityType || session.lastActivityType,
              lastActivityTime: lastActivityTime || Date.now()
            };
          }
          return session;
        });

        if (!found) {
          fetchLiveSessions(true);
        }
        return updated;
      });
    });

    socket.on('candidate-frame-update', ({ candidateId, examId, imageData, imagePath, lastActivityType, lastActivityTime }) => {
      setSessions(prevSessions => {
        let found = false;
        const updated = prevSessions.map(session => {
          if (String(session.candidateId) === String(candidateId) && String(session.examId) === String(examId)) {
            found = true;
            return {
              ...session,
              latestBase64Frame: imageData || session.latestBase64Frame,
              latestImagePath: imagePath || session.latestImagePath,
              lastActivityType: lastActivityType || session.lastActivityType || 'PeriodicCapture',
              lastActivityTime: lastActivityTime || Date.now()
            };
          }
          return session;
        });

        if (!found) {
          fetchLiveSessions(true);
        }
        return updated;
      });
    });

    socket.on('candidate-offline', ({ candidateId, examId }) => {
      const cIdStr = String(candidateId);
      if (pcsRef.current[cIdStr]) {
        pcsRef.current[cIdStr].close();
        delete pcsRef.current[cIdStr];
      }
      setCandidateStreams(prev => {
        const next = { ...prev };
        delete next[cIdStr];
        return next;
      });

      setSessions(prevSessions => {
        return prevSessions.map(session => {
          if (String(session.candidateId) === cIdStr && String(session.examId) === String(examId)) {
            return {
              ...session,
              latestBase64Frame: null,
            };
          }
          return session;
        });
      });
    });

    return () => {
      Object.keys(pcsRef.current).forEach(id => {
        if (pcsRef.current[id]) {
          pcsRef.current[id].close();
        }
      });
      pcsRef.current = {};
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const fetchLiveSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get('/api/proctor/live');
      if (res.data.success) {
        setSessions(prevSessions => {
          const freshSessions = res.data.sessions || [];
          return freshSessions.map(fresh => {
            const match = prevSessions.find(p => String(p.candidateId) === String(fresh.candidateId) && String(p.examId) === String(fresh.examId));
            return match ? { ...fresh, latestBase64Frame: match.latestBase64Frame } : fresh;
          });
        });
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load active proctoring feeds.');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleForceSubmit = async (candidateId, examId, candidateName) => {
    const confirm = window.confirm(`Are you sure you want to FORCE SUBMIT ${candidateName}'s exam? This action will terminate their session immediately.`);
    if (!confirm) return;

    try {
      // Fetch result creation or force end endpoint
      const res = await axios.post(`/api/admin/exams/${examId}/force-submit`, { candidateId });
      if (res.data.success) {
        toast.success(`Exam submitted successfully for ${candidateName}.`);
        fetchLiveSessions();
      }
    } catch (err) {
      toast.error('Failed to force submit exam.');
      console.error(err);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.candidateEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Radio className="h-6 w-6 text-rose-500 animate-pulse" />
            <span>Live Proctoring Control Room</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time feed of active candidates currently undertaking examination portals.
          </p>
        </div>

        {/* Polling Switch & Manual Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setPollingActive(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                pollingActive 
                  ? 'bg-rose-550 bg-rose-600 text-white shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Live Auto-Sync
            </button>
            <button
              onClick={() => setPollingActive(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                !pollingActive 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-550 text-slate-500 hover:text-slate-850'
              }`}
            >
              Paused
            </button>
          </div>

          <button
            onClick={() => fetchLiveSessions()}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-slate-700 text-slate-650 dark:text-slate-200 rounded-xl transition"
            title="Refresh Feeds"
          >
            <FolderSync className={`h-4.5 w-4.5 ${pollingActive ? 'animate-spin-slow' : ''}`} />
          </button>
        </div>
      </div>

      {/* Control Actions & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by candidate name, email, or exam title..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-550 text-slate-800 dark:text-white"
          />
        </div>
        
        {/* Status Count Indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shrink-0">
          <Users className="h-4.5 w-4.5 text-brand-500" />
          <span className="text-slate-500">Active Sessions:</span>
          <span className="bg-brand-50 text-brand-600 dark:bg-brand-950/30 dark:text-brand-400 px-2 py-0.5 rounded font-black">
            {filteredSessions.length} Online
          </span>
        </div>
      </div>

      {/* Live Monitoring Feeds Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
          <LoadingSkeleton type="card" />
        </div>
      ) : filteredSessions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => (
            <div 
              key={`${session.candidateId}-${session.examId}`}
              className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-lg overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-600 relative group"
            >
              
              {/* Flashing warning overlay if candidate has high warnings */}
              {session.warningsCount >= 4 && (
                <div className="absolute inset-0 border-2 border-red-500 pointer-events-none rounded-3xl animate-pulse z-20" />
              )}

              {/* Feed Display Frame */}
              <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
                {candidateStreams[session.candidateId] ? (
                  <video
                    ref={(el) => {
                      if (el) {
                        el.srcObject = candidateStreams[session.candidateId];
                      }
                    }}
                    autoPlay
                    playsInline
                    muted={true}
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : session.latestBase64Frame || session.latestImagePath ? (
                  <img
                    src={session.latestBase64Frame || `${import.meta.env.VITE_API_URL || window.location.origin}${session.latestImagePath}`}
                    alt={`${session.candidateName}'s Live Feed`}
                    className="w-full h-full object-cover transform -scale-x-100 transition-all duration-500 group-hover:scale-102"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%23f43f5e" stroke-width="1.5"%3E%3Cpath d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/%3E%3Ccircle cx="12" cy="13" r="4"/%3E%3C/svg%3E';
                    }}
                  />
                ) : (
                  <div className="text-center p-6 space-y-2">
                    <Camera className="h-8 w-8 text-slate-650 mx-auto animate-pulse" />
                    <p className="text-xs text-slate-500 font-semibold">Webcam Feed Pending</p>
                  </div>
                )}

                {/* Left Top Badge: Live indicator */}
                <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-xs text-white px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-md">
                  <span className="h-1.5 w-1.5 bg-white rounded-full animate-ping" />
                  <span className="text-[9px] font-black uppercase tracking-wider">Live</span>
                </div>

                {/* Right Top Badge: Warnings Counter */}
                <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-md border text-white font-bold text-[9px] uppercase tracking-wider ${
                  session.warningsCount >= 4 ? 'bg-red-600 border-red-400 animate-pulse' :
                  session.warningsCount >= 1 ? 'bg-amber-500 border-amber-400' :
                  'bg-slate-800 border-slate-700'
                }`}>
                  <ShieldAlert className="h-3 w-3 shrink-0" />
                  <span>{session.warningsCount} Warnings</span>
                </div>

                {/* Bottom Overlay: Last Activity */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent flex items-center justify-between text-white text-[10px]">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span className="font-semibold">Last Active:</span>
                  </div>
                  <span className="bg-slate-900/60 px-2 py-0.5 rounded font-black border border-slate-800">
                    {session.lastActivityType} ({new Date(session.lastActivityTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                  </span>
                </div>
              </div>

              {/* Details & Controls */}
              <div className="p-5 space-y-4">
                
                {/* Candidate details */}
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-800 dark:text-white truncate">
                    {session.candidateName}
                  </div>
                  <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                    <span className="truncate max-w-[170px]">{session.candidateEmail}</span>
                    <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">
                      {session.candidateDepartment}
                    </span>
                  </div>
                </div>

                {/* Exam Title indicator */}
                <div className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-slate-450 font-bold uppercase tracking-wider text-[10px]">Exam Session</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-305 truncate max-w-[150px]">
                    {session.examTitle}
                  </span>
                </div>

                {/* Quick actions bar */}
                <div className="flex gap-2">
                  {/* View full logs button */}
                  <a
                    href={`/admin/reports`}
                    className="flex-1 py-2 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-750 font-bold uppercase tracking-wider text-[10px] rounded-xl border border-slate-200 dark:border-slate-800 transition"
                  >
                    Audits Report
                  </a>
                  
                  {/* Force submit button */}
                  <button
                    onClick={() => handleForceSubmit(session.candidateId, session.examId, session.candidateName)}
                    className="px-3 bg-red-650 hover:bg-red-700 active:bg-red-800 text-red-500 hover:text-white border border-red-550 border-red-600/30 hover:border-transparent rounded-xl transition"
                    title="Force Submit Exam Session"
                  >
                    <Power className="h-4 w-4" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-3xl py-24 text-center text-slate-400 space-y-3">
          <Radio className="h-12 w-12 text-slate-350 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Control Room Empty</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            There are currently no active exam sessions. As soon as a candidate starts taking an exam, their live webcam feed and audit trail will populate here.
          </p>
        </div>
      )}

    </div>
  );
};

export default LiveProctor;
