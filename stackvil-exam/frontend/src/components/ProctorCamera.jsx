import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef,
} from 'react';
import axios from 'axios';
import { Camera, CameraOff, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const ProctorCamera = forwardRef(({ examId, onPermissionDenied, onWarningLogged }, ref) => {
  const { user } = useAuth();
  const candidateId = user?._id || user?.id;
  const socketRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const streamRef = useRef(null);
  const currentRequestRef = useRef(0);
  const [permission, setPermission] = useState('pending'); // pending, granted, denied
  const [isMuted, setIsMuted] = useState(false);

  // Initialize Camera & Microphone stream
  useEffect(() => {
    startMedia();
    return () => {
      stopMedia();
    };
  }, []);

  // Bind video stream to element once DOM is updated and videoRef is initialized
  useEffect(() => {
    if (permission === 'granted' && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [permission, stream, videoRef]);

  const startMedia = async () => {
    const requestId = ++currentRequestRef.current;
    try {
      setPermission('pending');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true,
      });
      
      if (requestId !== currentRequestRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      setStream(mediaStream);
      streamRef.current = mediaStream;
      setPermission('granted');
    } catch (err) {
      if (requestId !== currentRequestRef.current) return;
      console.error('Proctor Media Error:', err);
      setPermission('denied');
      toast.error('Camera & Microphone access is mandatory for this exam.');
      if (onPermissionDenied) {
        onPermissionDenied(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Device Error');
      }
    }
  };

  const stopMedia = () => {
    currentRequestRef.current++;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  };

  // Periodic capture every 10 seconds for real-time proctor database updates
  useEffect(() => {
    if (permission !== 'granted' || !stream) return;

    // Capture immediately once permission is granted
    captureFrame('PeriodicCapture');

    const interval = setInterval(() => {
      captureFrame('PeriodicCapture');
    }, 10000);

    return () => clearInterval(interval);
  }, [permission, stream]);

  const peersRef = useRef({});

  const initiateWebRPeerConnection = async (adminSocketId) => {
    try {
      if (peersRef.current[adminSocketId]) {
        peersRef.current[adminSocketId].close();
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });

      peersRef.current[adminSocketId] = pc;

      // Add local tracks (webcam stream)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          pc.addTrack(track, streamRef.current);
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('send-webrtc-signal', {
            toSocketId: adminSocketId,
            signalData: { type: 'ice', candidate: event.candidate },
            candidateId,
            examId
          });
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (socketRef.current) {
        socketRef.current.emit('send-webrtc-signal', {
          toSocketId: adminSocketId,
          signalData: { type: 'offer', sdp: offer },
          candidateId,
          examId
        });
      }
    } catch (err) {
      console.error('Failed to initiate WebRTC connection with admin:', err);
    }
  };

  const handleWebRTCSignal = async (fromSocketId, signalData) => {
    try {
      const pc = peersRef.current[fromSocketId];
      if (!pc) return;

      if (signalData.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
      } else if (signalData.type === 'ice') {
        await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err);
    }
  };

  // Initialize Socket connection
  useEffect(() => {
    if (permission === 'granted' && candidateId) {
      const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
        path: '/socket.io'
      });
      socketRef.current = socket;

      socket.emit('join-exam-session', { examId, candidateId });

      socket.on('admin-online-ping', ({ adminSocketId }) => {
        initiateWebRPeerConnection(adminSocketId);
      });

      socket.on('receive-webrtc-signal', ({ fromSocketId, signalData }) => {
        handleWebRTCSignal(fromSocketId, signalData);
      });

      return () => {
        // Clean up all peer connections
        Object.keys(peersRef.current).forEach(id => {
          if (peersRef.current[id]) {
            peersRef.current[id].close();
          }
        });
        peersRef.current = {};
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [permission, examId, candidateId]);

  // Real-time WebSocket fallback streaming (every 5 seconds / 5000ms)
  useEffect(() => {
    if (permission !== 'granted' || !stream || !socketRef.current) return;

    const captureAndEmitFrame = () => {
      if (!videoRef.current || !canvasRef.current || !socketRef.current) return;
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = 240;
        canvas.height = 180;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.4);
        
        socketRef.current.emit('candidate-frame', {
          examId,
          candidateId,
          imageData: dataUrl
        });
      } catch (err) {
        console.error('Failed to emit socket frame:', err);
      }
    };

    captureAndEmitFrame();
    const interval = setInterval(captureAndEmitFrame, 5000);

    return () => clearInterval(interval);
  }, [permission, stream, candidateId, examId]);

  // Method to take a canvas snapshot and send it to the server
  const captureFrame = async (type = 'PeriodicCapture', silent = false) => {
    if (permission !== 'granted' || !videoRef.current || !canvasRef.current) {
      if (type !== 'PeriodicCapture') {
        // Log violation to server without image if camera is not active/granted
        try {
          const res = await axios.post('/api/proctor/log-warning', { examId, type });
          if (res.data.success && onWarningLogged && !silent) {
            onWarningLogged(res.data.warningCount, type);
          }
        } catch (err) {
          console.error('Failed to log camera-less violation:', err.message);
        }
      } else {
        console.warn('Skipping periodic capture: media devices are not ready');
      }
      return null;
    }

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Draw current video frame to canvas
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to Blob
      return new Promise((resolve) => {
        canvas.toBlob(async (blob) => {
          if (!blob) {
            resolve(null);
            return;
          }

          // Build form-data payload
          const formData = new FormData();
          formData.append('examId', examId);
          
          if (type === 'PeriodicCapture') {
            formData.append('proctorImage', blob, 'frame.jpg');
            try {
              const res = await axios.post('/api/proctor/upload-frame', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              resolve(res.data.imagePath);
            } catch (err) {
              console.error('Frame upload failed:', err.message);
              resolve(null);
            }
          } else {
            // Cheating violation
            formData.append('type', type);
            formData.append('proctorImage', blob, 'violation.jpg');
            try {
              const res = await axios.post('/api/proctor/log-warning', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
              });
              if (res.data.success && onWarningLogged && !silent) {
                onWarningLogged(res.data.warningCount, type);
              }
              resolve(res.data.imagePath);
            } catch (err) {
              console.error('Violation upload failed:', err.message);
              resolve(null);
            }
          }
        }, 'image/jpeg', 0.7); // 70% quality compression to optimize network speeds
      });
    } catch (error) {
      console.error('Proctor snapshot failure:', error);
      return null;
    }
  };

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    captureViolation: (type, silent = false) => captureFrame(type, silent),
    triggerSelfTest: () => {
      // Simulates face check
      const checks = ['FaceNotDetected', 'MultipleFaces', 'LookingAway'];
      const randomCheck = checks[Math.floor(Math.random() * checks.length)];
      captureFrame(randomCheck);
    }
  }));

  return (
    <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-slate-950 shadow-md border-2 border-slate-800 flex items-center justify-center">
      {/* Hidden canvas for screenshots */}
      <canvas ref={canvasRef} className="hidden" />

      {permission === 'pending' && (
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-slate-400 mx-auto"></div>
          <p className="text-xs text-slate-400">Requesting Camera...</p>
        </div>
      )}

      {permission === 'denied' && (
        <div className="text-center p-4 space-y-3">
          <CameraOff className="h-10 w-10 text-rose-500 mx-auto" />
          <p className="text-xs font-semibold text-rose-500">Camera Access Blocked</p>
          <button
            onClick={startMedia}
            className="px-3 py-1 bg-slate-800 text-white rounded-lg text-xs font-medium hover:bg-slate-700 transition"
          >
            Retry Permission
          </button>
        </div>
      )}

      {permission === 'granted' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
          {/* Active status indicator */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-emerald-500/85 backdrop-blur-sm rounded-full flex items-center space-x-1">
            <span className="h-2 w-2 bg-white rounded-full animate-ping"></span>
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">Live Proctor</span>
          </div>

          <div className="absolute bottom-3 right-3 text-white/50 hover:text-white bg-slate-900/50 hover:bg-slate-900/70 p-1.5 rounded-lg transition">
            <Video className="h-4 w-4" />
          </div>
        </>
      )}
    </div>
  );
});

export default ProctorCamera;
