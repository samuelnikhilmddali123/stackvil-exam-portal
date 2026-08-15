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
  AlertOctagon,
  Video,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import LoadingSkeleton from '../../components/LoadingSkeleton';

// High-performance direct DOM feed display for Candidate Camera (0 React re-render lag)
const CandidateCameraFeed = ({ candidateId, socketRef, cameraStream, initialImage, candidateName }) => {
  const videoRef = useRef(null);
  const imgRef = useRef(null);
  const prevUrlRef = useRef(null);
  const [hasImage, setHasImage] = useState(Boolean(initialImage));
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (initialImage && imgRef.current) {
      imgRef.current.src = initialImage;
      setHasImage(true);
    }
  }, [initialImage]);

  useEffect(() => {
    if (cameraStream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = cameraStream;

      const checkPlaying = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2 && !video.paused) {
          setIsVideoPlaying(true);
        }
      };

      video.onloadedmetadata = checkPlaying;
      video.onplaying = checkPlaying;
      video.onresize = checkPlaying;

      video.play().then(() => {
        checkPlaying();
      }).catch(err => {
        if (err.name !== 'AbortError') {
          console.warn('Video play notice:', err.message);
        }
        video.muted = true;
        video.play().catch(() => {});
      });

      const interval = setInterval(checkPlaying, 400);
      return () => {
        clearInterval(interval);
        setIsVideoPlaying(false);
      };
    } else {
      setIsVideoPlaying(false);
    }
  }, [cameraStream]);

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleFrameUpdate = (data) => {
      const frameCId = data.candidateId;
      if (String(frameCId) !== String(candidateId)) return;
      if (!imgRef.current) return;

      const buffer = data.imageData || data.frameBuffer;
      if (!buffer) return;

      if (typeof buffer === 'string') {
        imgRef.current.src = buffer;
        setHasImage(true);
      } else if (buffer instanceof ArrayBuffer || buffer instanceof Blob || ArrayBuffer.isView(buffer)) {
        const blob = buffer instanceof Blob ? buffer : new Blob([buffer], { type: 'image/jpeg' });
        const newUrl = URL.createObjectURL(blob);
        const oldUrl = prevUrlRef.current;
        imgRef.current.src = newUrl;
        prevUrlRef.current = newUrl;
        setHasImage(true);

        if (oldUrl && oldUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldUrl);
        }
      }
    };

    socket.on('candidate-frame-update', handleFrameUpdate);
    return () => {
      socket.off('candidate-frame-update', handleFrameUpdate);
      if (prevUrlRef.current && prevUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, [socketRef, candidateId]);

  return (
    <>
      {/* Background Image / Socket Blob Fallback */}
      <img
        ref={imgRef}
        alt={`${candidateName}'s Camera`}
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-0 ${isVideoPlaying ? 'hidden' : (hasImage ? 'block' : 'hidden')}`}
      />

      {/* Real 30 FPS WebRTC Video Stream */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-10 ${isVideoPlaying ? 'block' : 'hidden'}`}
      />

      {!isVideoPlaying && !hasImage && (
        <div className="text-center p-6 space-y-2 z-0">
          <Camera className="h-8 w-8 text-slate-600 mx-auto animate-pulse" />
          <p className="text-xs text-slate-500 font-semibold">Camera Stream Connecting...</p>
        </div>
      )}
    </>
  );
};

// High-performance direct DOM feed display for Candidate Screen Share (0 React re-render lag)
const CandidateScreenFeed = ({ candidateId, socketRef, screenStream, candidateName }) => {
  const imgRef = useRef(null);
  const videoRef = useRef(null);
  const prevUrlRef = useRef(null);
  const [hasScreenFrame, setHasScreenFrame] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    if (screenStream && videoRef.current) {
      const video = videoRef.current;
      video.srcObject = screenStream;

      const checkPlaying = () => {
        if (video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= 2 && !video.paused) {
          setIsVideoPlaying(true);
        }
      };

      video.onloadedmetadata = checkPlaying;
      video.onplaying = checkPlaying;
      video.onresize = checkPlaying;

      video.play().then(checkPlaying).catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn('Screen video play notice:', err.message);
        }
      });

      const interval = setInterval(checkPlaying, 400);
      return () => {
        clearInterval(interval);
        setIsVideoPlaying(false);
      };
    } else {
      setIsVideoPlaying(false);
    }
  }, [screenStream]);

  useEffect(() => {
    let attachedSocket = null;

    const handleScreenUpdate = ({ candidateId: frameCId, frameBuffer, imageData }) => {
      if (String(frameCId) !== String(candidateId)) return;
      if (!imgRef.current) return;

      const buffer = imageData || frameBuffer;
      if (!buffer) return;

      if (typeof buffer === 'string') {
        imgRef.current.src = buffer;
        setHasScreenFrame(true);
      } else if (buffer instanceof ArrayBuffer || buffer instanceof Blob || ArrayBuffer.isView(buffer)) {
        const blob = buffer instanceof Blob ? buffer : new Blob([buffer], { type: 'image/jpeg' });
        const newUrl = URL.createObjectURL(blob);
        const oldUrl = prevUrlRef.current;
        imgRef.current.src = newUrl;
        prevUrlRef.current = newUrl;
        setHasScreenFrame(true);

        if (oldUrl && oldUrl.startsWith('blob:')) {
          URL.revokeObjectURL(oldUrl);
        }
      }
    };

    const attachListener = () => {
      const socket = socketRef?.current;
      if (!socket || attachedSocket === socket) return;
      attachedSocket = socket;
      socket.on('candidate-screen-frame-update', handleScreenUpdate);
    };

    attachListener();
    const timer = setInterval(attachListener, 400);

    return () => {
      clearInterval(timer);
      if (attachedSocket) {
        attachedSocket.off('candidate-screen-frame-update', handleScreenUpdate);
      }
      if (prevUrlRef.current && prevUrlRef.current.startsWith('blob:')) {
        URL.revokeObjectURL(prevUrlRef.current);
      }
    };
  }, [socketRef, candidateId]);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
      {/* 30 FPS WebRTC Video Stream (Overlay) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-contain z-10 ${isVideoPlaying ? 'block' : 'hidden'}`}
      />

      {/* Socket JPEG Frame Stream (Fallback that NEVER unmounts) */}
      <img
        ref={imgRef}
        alt={`${candidateName}'s Screen`}
        className={`absolute inset-0 w-full h-full object-contain z-0 ${isVideoPlaying ? 'hidden' : (hasScreenFrame ? 'block' : 'hidden')}`}
      />

      {/* Pending / Connecting Placeholder */}
      {!isVideoPlaying && !hasScreenFrame && (
        <div className="text-center p-12 space-y-3 z-0">
          <Monitor className="h-16 w-16 text-slate-700 mx-auto animate-pulse" />
          <h4 className="text-sm font-bold text-slate-400">Screen Share Feed Connecting...</h4>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Candidate screen share stream is active or initializing. Candidate can click "Share Entire Screen" in their exam room header or sidebar to broadcast screen feed.
          </p>
        </div>
      )}
    </div>
  );
};

// Local Session Recorder Component for saving candidate video streams directly to computer
const RecordSessionButton = ({ candidateName, candidateId, cameraStream, screenStream }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const recIntervalRef = useRef(null);

  const startRecording = async (e) => {
    e.stopPropagation();
    try {
      chunksRef.current = [];
      let targetStream = screenStream || cameraStream;

      if (!targetStream || !targetStream.active || targetStream.getVideoTracks().length === 0) {
        const parentContainer = e.currentTarget.closest('.group') || e.currentTarget.closest('.fixed') || document;
        
        // 1. Try finding a video element with a live srcObject stream
        const videoEl = parentContainer.querySelector('video');
        if (videoEl && videoEl.srcObject && videoEl.srcObject.getVideoTracks && videoEl.srcObject.getVideoTracks().length > 0) {
          // Wait until video is actually playing with real frames
          if (videoEl.readyState < 2 || videoEl.videoWidth === 0) {
            await new Promise((resolve) => {
              const onReady = () => { videoEl.removeEventListener('playing', onReady); resolve(); };
              videoEl.addEventListener('playing', onReady);
              setTimeout(resolve, 3000); // Safety timeout
            });
          }
          targetStream = videoEl.srcObject;
        } else if (videoEl && videoEl.captureStream && videoEl.videoWidth > 0) {
          try {
            targetStream = videoEl.captureStream(30);
          } catch(err) {}
        }

        // 2. Fallback: capture live <img> socket-frame via canvas at 30 FPS
        if (!targetStream || targetStream.getVideoTracks().length === 0) {
          const imgEl = parentContainer.querySelector('img[alt*="Screen"]') || parentContainer.querySelector('img');
          if (imgEl && (imgEl.src || imgEl.currentSrc)) {
            const recCanvas = document.createElement('canvas');
            recCanvas.width = 1280;
            recCanvas.height = 720;
            const ctx = recCanvas.getContext('2d', { alpha: false });
            
            // Draw img to canvas at 30 FPS
            const drawFrame = () => {
              try {
                if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
                  ctx.drawImage(imgEl, 0, 0, 1280, 720);
                }
              } catch (e) {}
            };

            // Pre-warm: draw frames for 600ms so canvas has real pixels before recorder starts
            drawFrame();
            recIntervalRef.current = setInterval(drawFrame, 33);

            await new Promise(resolve => setTimeout(resolve, 600));

            if (recCanvas.captureStream) {
              targetStream = recCanvas.captureStream(30);
            }
          }
        }
      }

      // Ensure we have live video frames before starting MediaRecorder
      if (!targetStream || targetStream.getVideoTracks().length === 0) {
        toast.error('No active live stream or feed available to record. Wait for the screen share to fully load.');
        if (recIntervalRef.current) clearInterval(recIntervalRef.current);
        return;
      }

      // Verify stream tracks are live (not ended)
      const activeTracks = targetStream.getVideoTracks().filter(t => t.readyState === 'live');
      if (activeTracks.length === 0) {
        toast.error('Stream tracks have ended. Please reopen the candidate focus window.');
        if (recIntervalRef.current) clearInterval(recIntervalRef.current);
        return;
      }

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(targetStream, { mimeType, videoBitsPerSecond: 2500000 });
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        if (recIntervalRef.current) {
          clearInterval(recIntervalRef.current);
          recIntervalRef.current = null;
        }

        const totalSize = chunksRef.current.reduce((acc, c) => acc + c.size, 0);
        if (chunksRef.current.length === 0 || totalSize === 0) {
          toast.error('Recorded video file was empty. The stream may have stopped. Please try again.');
          return;
        }

        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const cleanName = (candidateName || 'candidate').toLowerCase().replace(/[^a-z0-9]/g, '-');
        a.download = `proctor-recording-${cleanName}-${timestamp}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 200);
        toast.success(`Session video (${(blob.size / (1024 * 1024)).toFixed(2)} MB) saved to your computer!`);
      };

      recorder.start(100); // 100ms timeslices for frequent data events and reliable buffering
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecSeconds((prev) => prev + 1);
      }, 1000);

      toast.success(`Recording started for ${candidateName}`);
    } catch (err) {
      console.error('Local recording start error:', err);
      toast.error('Failed to start local recording: ' + err.message);
    }
  };


  const stopRecording = (e) => {
    e.stopPropagation();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.requestData();
      } catch (err) {}
      setTimeout(() => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      }, 150);
    }
    setIsRecording(false);
  };

  const formatRecTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (isRecording) {
    return (
      <button
        onClick={stopRecording}
        className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow animate-pulse flex items-center space-x-1.5 cursor-pointer z-30"
        title="Click to Stop and Save Video Recording to Computer"
      >
        <span className="h-2 w-2 bg-white rounded-full animate-ping" />
        <span>REC {formatRecTime(recSeconds)} (Save)</span>
      </button>
    );
  }

  return (
    <button
      onClick={startRecording}
      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer z-30"
      title="Record Candidate Session to Computer"
    >
      <Video className="h-3.5 w-3.5 text-rose-400" />
      <span>Record</span>
    </button>
  );
};

const LiveProctor = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pollingActive, setPollingActive] = useState(true);
  
  // Modal candidate focus
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Tab state for feed view on grid cards: { [candidateIdStr]: 'camera' | 'screen' }
  const [cardFeedTabs, setCardFeedTabs] = useState({});

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
    }, 10000);

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
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443?transport=tcp',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ],
          iceCandidatePoolSize: 10,
          bundlePolicy: 'max-bundle'
        });

        pcsRef.current[pcKey] = pc;
        iceQueuesRef.current[pcKey] = [];

        pc.oniceconnectionstatechange = () => {
          if (pc.iceConnectionState === 'failed') {
            console.warn(`[WebRTC] Admin ${streamType} ICE connection failed, restarting ICE...`);
            pc.restartIce();
          }
        };

        pc.ontrack = (event) => {
          const remoteStream = (event.streams && event.streams[0]) ? event.streams[0] : new MediaStream([event.track]);
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

        if (pc.signalingState === 'stable' || pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp)).catch(e => console.warn('setRemoteDescription offer error:', e));

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
        }
      } else if (signalData.type === 'answer' && pc) {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp)).catch(e => console.warn('setRemoteDescription answer error:', e));
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

                  {/* Feed Display Frame with Camera / Screen Toggle */}
                <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
                  {(cardFeedTabs[candidateIdStr] || 'camera') === 'camera' ? (
                    <CandidateCameraFeed
                      candidateId={session.candidateId}
                      socketRef={socketRef}
                      cameraStream={cameraStream}
                      initialImage={
                        Boolean(session.latestBase64Frame && session.latestBase64Frame.length > 500)
                          ? session.latestBase64Frame
                          : (session.latestImagePath
                              ? (session.latestImagePath.startsWith('http')
                                  ? session.latestImagePath
                                  : `${API_BASE_URL}/${session.latestImagePath.replace(/^\//, '')}`)
                              : null)
                      }
                      candidateName={session.candidateName}
                    />
                  ) : (
                    <CandidateScreenFeed
                      candidateId={session.candidateId}
                      socketRef={socketRef}
                      screenStream={screenStream}
                      candidateName={session.candidateName}
                    />
                  )}

                  {/* Left Top Feed View Mode Toggle Tabs */}
                  <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl flex items-center space-x-1 shadow-md border border-slate-700/80 z-20" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setCardFeedTabs(prev => ({ ...prev, [candidateIdStr]: 'camera' }))}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition flex items-center space-x-1 ${
                        (cardFeedTabs[candidateIdStr] || 'camera') === 'camera'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Camera className="h-3 w-3" />
                      <span>Camera</span>
                    </button>
                    
                    <button
                      onClick={() => setCardFeedTabs(prev => ({ ...prev, [candidateIdStr]: 'screen' }))}
                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition flex items-center space-x-1 ${
                        cardFeedTabs[candidateIdStr] === 'screen'
                          ? 'bg-brand-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Monitor className="h-3 w-3" />
                      <span>Screen</span>
                    </button>
                  </div>

                  {/* Right Top Badge: Warnings Counter */}
                  <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full flex items-center space-x-1 shadow-md border text-white font-bold text-[9px] uppercase tracking-wider z-20 ${
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
                      <span>Focus Monitor</span>
                    </span>
                    <span className="bg-slate-900/80 px-2 py-0.5 rounded font-bold border border-slate-800">
                      ID: {String(session.candidateId).substring(0, 8)}
                    </span>
                  </div>
                </div>

                {/* Candidate details & controls */}
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
                      <span>Focus</span>
                    </button>

                    <RecordSessionButton
                      candidateName={session.candidateName}
                      candidateId={session.candidateId}
                      cameraStream={cameraStream}
                      screenStream={screenStream}
                    />
                    
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
          <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-[98vw] h-[95vh] max-w-none max-h-none overflow-hidden flex flex-col shadow-2xl">
              
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

                  <RecordSessionButton
                    candidateName={selectedCandidate.candidateName}
                    candidateId={selectedCandidate.candidateId}
                    cameraStream={cameraStream}
                    screenStream={screenStream}
                  />

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
              <div className="flex-1 bg-black relative flex items-center justify-center h-full min-h-[500px] overflow-hidden">
                <CandidateScreenFeed
                  candidateId={selectedCandidate.candidateId}
                  socketRef={socketRef}
                  screenStream={screenStream}
                  candidateName={selectedCandidate.candidateName}
                />

                {/* PICTURE-IN-PICTURE CAMERA OVERLAY (Top-Right Corner) */}
                <div className="absolute top-4 right-4 w-64 aspect-[4/3] bg-slate-950 border-2 border-brand-500/70 rounded-2xl overflow-hidden shadow-2xl z-20 group">
                  <CandidateCameraFeed
                    candidateId={selectedCandidate.candidateId}
                    socketRef={socketRef}
                    cameraStream={cameraStream}
                    initialImage={
                      Boolean(selectedCandidate.latestBase64Frame && selectedCandidate.latestBase64Frame.length > 500)
                        ? selectedCandidate.latestBase64Frame
                        : (selectedCandidate.latestImagePath
                            ? (selectedCandidate.latestImagePath.startsWith('http')
                                ? selectedCandidate.latestImagePath
                                : `${API_BASE_URL}/${selectedCandidate.latestImagePath.replace(/^\//, '')}`)
                            : null)
                    }
                    candidateName={selectedCandidate.candidateName}
                  />

                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/80 text-[10px] font-bold text-rose-400 rounded-full flex items-center space-x-1 z-20">
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
