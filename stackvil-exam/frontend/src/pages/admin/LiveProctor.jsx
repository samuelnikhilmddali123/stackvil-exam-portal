import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { 
  Radio, 
  Camera, 
  AlertTriangle, 
  Search, 
  Power, 
  Clock, 
  Users,
  ShieldAlert,
  FolderSync,
  Monitor,
  Maximize2,
  X,
  FileCode,
  CheckCircle2,
  AlertOctagon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const LiveProctor = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pollingActive, setPollingActive] = useState(true);
  
  // Modal candidate focus
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Streams map: { [candidateIdStr]: { camera: Stream, screen: Stream } }
  const [candidateStreams, setCandidateStreams] = useState({});
  const pcsRef = useRef({});
  const iceQueuesRef = useRef({});
  const socketRef = useRef(null);

  // Quick poll interval (every 10 seconds)
  useEffect(() => {
    fetchLiveSessions();
    if (!pollingActive) return;

    const interval = setInterval(() => {
      fetchLiveSessions(true); // silent fetch in background
    }, 3000);

    return () => clearInterval(interval);
  }, [pollingActive]);

  const handleAdminWebRTCSignal = async (fromSocketId, signalData, candidateId, examId, streamType = 'camera') => {
    try {
      const cIdStr = String(candidateId);
      const pcKey = `${cIdStr}_${streamType}`;
      let pc = pcsRef.current[pcKey];

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

        pcsRef.current[pcKey] = pc;
        iceQueuesRef.current[pcKey] = [];

        pc.ontrack = (event) => {
          const remoteStream = event.streams[0];
          setCandidateStreams(prev => ({
            ...prev,
            [cIdStr]: {
              ...(prev[cIdStr] || {}),
              [streamType]: remoteStream
            }
          }));
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socketRef.current) {
            socketRef.current.emit('send-webrtc-signal', {
              toSocketId: fromSocketId,
              signalData: { type: 'ice', candidate: event.candidate },
              candidateId,
              examId,
              streamType
            });
          }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));

        // Flush queued ICE candidates
        const queue = iceQueuesRef.current[pcKey] || [];
        for (const cand of queue) {
          await pc.addIceCandidate(cand).catch(e => console.warn('ICE add error:', e));
        }
        iceQueuesRef.current[pcKey] = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (socketRef.current) {
          socketRef.current.emit('send-webrtc-signal', {
            toSocketId: fromSocketId,
            signalData: { type: 'answer', sdp: answer },
            candidateId,
            examId,
            streamType
          });
        }
      } else if (signalData.type === 'ice' && pc) {
        const iceCand = new RTCIceCandidate(signalData.candidate);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(iceCand).catch(e => console.warn(e));
        } else {
          if (!iceQueuesRef.current[pcKey]) iceQueuesRef.current[pcKey] = [];
          iceQueuesRef.current[pcKey].push(iceCand);
        }
      }
    } catch (err) {
      console.error('Error handling WebRTC signal for candidate:', candidateId, err);
    }
  };

  // Real-time WebSocket connection
  useEffect(() => {
    const socket = io(API_BASE_URL, {
      path: '/socket.io'
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-admin-proctor');
    });
    socket.emit('join-admin-proctor');

    socket.on('candidate-online-webrtc', ({ socketId, candidateId, streamType }) => {
      socket.emit('send-admin-ping-to-candidate', { toSocketId: socketId, streamType });
      fetchLiveSessions(true);
    });

    socket.on('receive-webrtc-signal', ({ fromSocketId, signalData, candidateId, examId, streamType }) => {
      handleAdminWebRTCSignal(fromSocketId, signalData, candidateId, examId, streamType || 'camera');
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

    socket.on('candidate-screenshare-alert', ({ candidateId, status, isEntireScreen }) => {
      toast(status === 'stopped' ? 'Candidate screen sharing stopped!' : 'Candidate screen sharing updated.', {
        icon: status === 'stopped' ? '⚠️' : '🖥️'
      });
      fetchLiveSessions(true);
    });

    socket.on('candidate-webcam-alert', ({ candidateId, status }) => {
      if (status === 'stopped') {
        toast.error('Candidate camera stream stopped unexpectedly!');
      }
      fetchLiveSessions(true);
    });

    socket.on('candidate-offline', ({ candidateId, examId }) => {
      const cIdStr = String(candidateId);
      ['camera', 'screen'].forEach(st => {
        const pcKey = `${cIdStr}_${st}`;
        if (pcsRef.current[pcKey]) {
          pcsRef.current[pcKey].close();
          delete pcsRef.current[pcKey];
        }
      });

      setCandidateStreams(prev => {
        const next = { ...prev };
        delete next[cIdStr];
        return next;
      });
    });

    return () => {
      Object.keys(pcsRef.current).forEach(id => {
        if (pcsRef.current[id]) {
          pcsRef.current[id].close();
        }
      });
      pcsRef.current = {};
      iceQueuesRef.current = {};
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const fetchLiveSessions = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await axios.get('/api/proctor/live');
      if (res.data.success) {
        setSessions(res.data.sessions || []);
      }
    } catch (err) {
      if (!silent) toast.error('Failed to load active proctoring feeds.');
      console.error(err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleForceSubmit = async (candidateId, examId, candidateName) => {
    const confirm = window.confirm(`Are you sure you want to FORCE SUBMIT ${candidateName}'s exam session?`);
    if (!confirm) return;

    try {
      const res = await axios.post(`/api/admin/exams/${examId}/force-submit`, { candidateId });
      if (res.data.success) {
        toast.success(`Exam submitted successfully for ${candidateName}.`);
        if (selectedCandidate && String(selectedCandidate.candidateId) === String(candidateId)) {
          setSelectedCandidate(null);
        }
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
            Real-time multi-stream WebRTC proctoring grid for live camera and screen monitoring.
          </p>
        </div>

        {/* Polling Switch & Manual Refresh */}
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
            <button
              onClick={() => setPollingActive(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                pollingActive 
                  ? 'bg-rose-600 text-white shadow-sm' 
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
                  : 'text-slate-500 hover:text-slate-800'
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
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-white"
          />
        </div>
        
        <div className="flex items-center gap-2 text-xs font-semibold px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shrink-0">
          <Users className="h-4.5 w-4.5 text-brand-500" />
          <span className="text-slate-500">Active Candidates:</span>
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
          {filteredSessions.map((session) => {
            const candidateIdStr = String(session.candidateId);
            const cameraStream = candidateStreams[candidateIdStr]?.camera;
            const screenStream = candidateStreams[candidateIdStr]?.screen;

            return (
              <div 
                key={`${session.candidateId}-${session.examId}`}
                className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700/50 shadow-lg overflow-hidden flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-slate-200 dark:hover:border-slate-600 relative group cursor-pointer"
                onClick={() => setSelectedCandidate(session)}
              >
                
                {/* Flashing warning overlay if high warnings */}
                {session.warningsCount >= 4 && (
                  <div className="absolute inset-0 border-2 border-red-500 pointer-events-none rounded-3xl animate-pulse z-20" />
                )}

                {/* Feed Display Frame */}
                <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
                  {cameraStream ? (
                    <video
                      ref={(el) => { if (el && el.srcObject !== cameraStream) el.srcObject = cameraStream; }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : session.latestBase64Frame || session.latestImagePath ? (
                    <img
                      src={session.latestBase64Frame || `${API_BASE_URL}${session.latestImagePath}`}
                      alt={`${session.candidateName}'s Feed`}
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <div className="text-center p-6 space-y-2">
                      <Camera className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
                      <p className="text-xs text-slate-500 font-semibold">Camera Stream Connecting...</p>
                    </div>
                  )}

                  {/* Left Top Badge: Live indicator */}
                  <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-xs text-white px-2.5 py-0.5 rounded-full flex items-center space-x-1 shadow-md">
                    <span className="h-1.5 w-1.5 bg-white rounded-full animate-ping" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Camera Live</span>
                  </div>

                  {/* Screen Share Badge if Active */}
                  {screenStream ? (
                    <div className="absolute bottom-10 left-3 bg-emerald-600/90 backdrop-blur-xs text-white px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-md text-[9px] font-black">
                      <Monitor className="h-3 w-3" />
                      <span>Screen Shared</span>
                    </div>
                  ) : null}

                  {/* Right Top Badge: Warnings Counter */}
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-md border text-white font-bold text-[9px] uppercase tracking-wider ${
                    session.warningsCount >= 4 ? 'bg-red-600 border-red-400 animate-pulse' :
                    session.warningsCount >= 1 ? 'bg-amber-500 border-amber-400' :
                    'bg-slate-800 border-slate-700'
                  }`}>
                    <ShieldAlert className="h-3 w-3 shrink-0" />
                    <span>{session.warningsCount} Warnings</span>
                  </div>

                  {/* Bottom Overlay: Click to Focus */}
                  <div className="absolute bottom-0 left-0 right-0 p-2.5 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent flex items-center justify-between text-white text-[10px]">
                    <span className="font-bold flex items-center space-x-1 text-slate-300">
                      <Maximize2 className="h-3 w-3 text-brand-400" />
                      <span>Click for Picture-in-Picture Focus</span>
                    </span>
                    <span className="bg-slate-900/80 px-2 py-0.5 rounded font-bold border border-slate-800">
                      ID: {String(session.candidateId).substring(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Candidate details */}
                <div className="p-5 space-y-4">
                  <div className="space-y-1">
                    <div className="font-extrabold text-slate-800 dark:text-white truncate">
                      {session.candidateName}
                    </div>
                    <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
                      <span className="truncate max-w-[170px]">{session.candidateEmail}</span>
                      <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500">
                        {session.candidateDepartment || 'Engineering'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-slate-500 font-bold text-[10px] uppercase">Exam</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                      {session.examTitle}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCandidate(session);
                      }}
                      className="flex-1 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Focus Monitor</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleForceSubmit(session.candidateId, session.examId, session.candidateName);
                      }}
                      className="px-3 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/30 rounded-xl transition"
                      title="Force Submit Exam"
                    >
                      <Power className="h-4 w-4" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-3xl py-24 text-center text-slate-400 space-y-3">
          <Radio className="h-12 w-12 text-slate-400 mx-auto animate-pulse" />
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Control Room Empty</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
            There are currently no active exam sessions. As candidates start taking their exams, their WebRTC camera and screen streams will stream live here.
          </p>
        </div>
      )}

      {/* CANDIDATE FOCUS MODAL (Large Screen Share + Picture-in-Picture Camera Overlay) */}
      {selectedCandidate && (() => {
        const cIdStr = String(selectedCandidate.candidateId);
        const cameraStream = candidateStreams[cIdStr]?.camera;
        const screenStream = candidateStreams[cIdStr]?.screen;

        return (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
              
              {/* Modal Header */}
              <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-brand-500/20 text-brand-400 rounded-xl border border-brand-500/30">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>{selectedCandidate.candidateName}</span>
                      <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-normal">
                        ID: {selectedCandidate.candidateId}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium">
                      Exam: {selectedCandidate.examTitle} • Dept: {selectedCandidate.candidateDepartment || 'Engineering'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg">
                    <ShieldAlert className="h-4 w-4" />
                    <span>{selectedCandidate.warningsCount} Warnings</span>
                  </div>

                  <button
                    onClick={() => handleForceSubmit(selectedCandidate.candidateId, selectedCandidate.examId, selectedCandidate.candidateName)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
                  >
                    <Power className="h-4 w-4" />
                    <span>Force Submit</span>
                  </button>

                  <button
                    onClick={() => setSelectedCandidate(null)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Large Screen Share Feed + Picture-in-Picture Camera Overlay */}
              <div className="flex-1 bg-black relative flex items-center justify-center min-h-0 overflow-hidden">
                {screenStream ? (
                  <video
                    ref={(el) => { if (el && el.srcObject !== screenStream) el.srcObject = screenStream; }}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center p-12 space-y-3">
                    <Monitor className="h-16 w-16 text-slate-700 mx-auto animate-pulse" />
                    <h4 className="text-sm font-bold text-slate-400">Screen Share Feed Pending or Disconnected</h4>
                    <p className="text-xs text-slate-600 max-w-sm mx-auto">
                      Candidate has not started screen sharing yet or is in Round 1 / Round 2. Screen share activates during Round 3.
                    </p>
                  </div>
                )}

                {/* PICTURE-IN-PICTURE CAMERA OVERLAY (Top-Right Corner) */}
                <div className="absolute top-4 right-4 w-64 aspect-[4/3] bg-slate-950 border-2 border-brand-500/70 rounded-2xl overflow-hidden shadow-2xl z-20 group">
                  {cameraStream ? (
                    <video
                      ref={(el) => { if (el && el.srcObject !== cameraStream) el.srcObject = cameraStream; }}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : selectedCandidate.latestBase64Frame || selectedCandidate.latestImagePath ? (
                    <img
                      src={selectedCandidate.latestBase64Frame || `${API_BASE_URL}${selectedCandidate.latestImagePath}`}
                      alt="Camera Feed"
                      className="w-full h-full object-cover transform -scale-x-100"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-600">
                      <Camera className="h-8 w-8" />
                    </div>
                  )}

                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-[10px] font-bold text-rose-400 rounded-full flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 bg-rose-500 rounded-full animate-ping" />
                    <span>Camera Feed</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div>
                  <span className="font-bold text-white">Status:</span> Live Proctoring Connection Active
                </div>
                <button
                  onClick={() => setSelectedCandidate(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition"
                >
                  Close Focus View
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
};

export default LiveProctor;
