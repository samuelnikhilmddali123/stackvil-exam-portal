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
import { API_BASE_URL } from '../config/api';

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

      // Optimize WebRTC camera constraints: 640x480 at 15-20 FPS
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
          frameRate: { ideal: 15, max: 20 }
        },
        audio: false,
      });
      
      if (requestId !== currentRequestRef.current) {
        mediaStream.getTracks().forEach(track => track.stop());
        return;
      }

      // Monitor camera track ending / turn off
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          console.warn('Camera stream stopped unexpectedly.');
          setPermission('denied');
          toast.error('Webcam stream was disconnected or turned off!');
          if (socketRef.current) {
            socketRef.current.emit('candidate-webcam-status', {
              examId,
              candidateId,
              status: 'stopped'
            });
          }
          if (onPermissionDenied) {
            onPermissionDenied('Camera Stopped');
          }
        };
      }

      setStream(mediaStream);
      streamRef.current = mediaStream;
      setPermission('granted');

      if (socketRef.current) {
        socketRef.current.emit('candidate-webcam-status', {
          examId,
          candidateId,
          status: 'active'
        });
      }
    } catch (err) {
      if (requestId !== currentRequestRef.current) return;
      console.error('Proctor Media Error:', err);
      setPermission('denied');
      toast.error('Camera access is mandatory for live proctoring.');
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

  // Socket canvas frame fallback stream (1.25 FPS ~ 800ms) for backup preview only
  useEffect(() => {
    if (permission !== 'granted' || !stream) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 320;
    canvas.height = 240;

    let isSending = false;

    const frameInterval = setInterval(() => {
      if (isSending || !videoRef.current || !socketRef.current || !socketRef.current.connected) return;
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) return;

      isSending = true;
      try {
        ctx.drawImage(video, 0, 0, 320, 240);
        canvas.toBlob((blob) => {
          isSending = false;
          if (blob && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('candidate-frame', {
              examId,
              candidateId,
              frameBuffer: blob
            });
          }
        }, 'image/jpeg', 0.30);
      } catch (e) {
        isSending = false;
        console.warn('Socket camera frame emit error:', e);
      }
    }, 800);

    return () => clearInterval(frameInterval);
  }, [permission, stream, examId, candidateId]);

  // Periodic HTTP capture for server audit log (every 30 seconds)
  useEffect(() => {
    if (permission !== 'granted' || !stream) return;

    captureFrame('PeriodicCapture', true);

    const auditInterval = setInterval(() => {
      captureFrame('PeriodicCapture', true);
    }, 30000);

    return () => clearInterval(auditInterval);
  }, [permission, stream]);

  const peersRef = useRef({});
  const iceQueuesRef = useRef({});

  const initiateWebRPeerConnection = async (adminSocketId) => {
    try {
      if (!streamRef.current) {
        console.warn('Postponing WebRTC connection: camera stream not active yet.');
        return;
      }
      if (peersRef.current[adminSocketId]) {
        peersRef.current[adminSocketId].close();
      }

      const pc = new RTCPeerConnection({
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

      peersRef.current[adminSocketId] = pc;
      iceQueuesRef.current[adminSocketId] = [];

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') {
          console.warn('WebRTC Camera ICE connection failed, attempting ICE restart...');
          pc.restartIce();
        }
      };

      // Add local video track with high performance 30 FPS video parameters
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          const sender = pc.addTrack(track, streamRef.current);
          if (sender && sender.track && sender.track.kind === 'video') {
            try {
              const params = sender.getParameters();
              if (!params.encodings) params.encodings = [{}];
              params.encodings[0].maxBitrate = 800000; // 800 kbps HD video
              params.encodings[0].maxFramerate = 30; // 30 FPS video call
              sender.setParameters(params).catch(e => console.warn('Bitrate param set error:', e));
            } catch (e) {
              console.warn('Bitrate error:', e);
            }
          }
        });
      }

      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('send-webrtc-signal', {
            toSocketId: adminSocketId,
            signalData: { type: 'ice', candidate: event.candidate },
            candidateId,
            examId,
            streamType: 'camera'
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
          examId,
          streamType: 'camera'
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
        // Flush queued ICE candidates
        const queue = iceQueuesRef.current[fromSocketId] || [];
        for (const candidate of queue) {
          await pc.addIceCandidate(candidate).catch(e => console.warn('ICE add error:', e));
        }
        iceQueuesRef.current[fromSocketId] = [];
      } else if (signalData.type === 'ice') {
        const iceCandidate = new RTCIceCandidate(signalData.candidate);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(iceCandidate).catch(e => console.warn('ICE candidate add error:', e));
        } else {
          if (!iceQueuesRef.current[fromSocketId]) iceQueuesRef.current[fromSocketId] = [];
          iceQueuesRef.current[fromSocketId].push(iceCandidate);
        }
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err);
    }
  };

  // Initialize Socket connection
  useEffect(() => {
    if (permission === 'granted' && candidateId) {
      const socket = io(API_BASE_URL, {
        path: '/socket.io'
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join-exam-session', { examId, candidateId, streamType: 'camera' });
      });
      socket.emit('join-exam-session', { examId, candidateId, streamType: 'camera' });

      socket.on('admin-online-ping', ({ adminSocketId }) => {
        initiateWebRPeerConnection(adminSocketId);
      });

      socket.on('receive-webrtc-signal', ({ fromSocketId, signalData, streamType }) => {
        if (!streamType || streamType === 'camera') {
          handleWebRTCSignal(fromSocketId, signalData);
        }
      });

      return () => {
        Object.keys(peersRef.current).forEach(id => {
          if (peersRef.current[id]) {
            peersRef.current[id].close();
          }
        });
        peersRef.current = {};
        iceQueuesRef.current = {};
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [permission, examId, candidateId]);

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

      // Check if video track has actual loaded frame dimensions to avoid black frames
      if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
        return null;
      }

      // Draw current video frame to lightweight 320x240 canvas for fast processing
      canvas.width = 320;
      canvas.height = 240;
      context.drawImage(video, 0, 0, 320, 240);

      // Emit lightweight base64 image frame over socket
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.35);
        if (socketRef.current) {
          socketRef.current.emit('candidate-frame', {
            examId,
            candidateId,
            imageData: dataUrl
          });
        }
      } catch (e) {
        console.warn('Socket frame emit error:', e);
      }

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
