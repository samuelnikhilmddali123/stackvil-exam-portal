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

const ProctorCamera = forwardRef(({ examId, onPermissionDenied, onWarningLogged }, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [permission, setPermission] = useState('pending'); // pending, granted, denied
  const [isMuted, setIsMuted] = useState(false);

  // Initialize Camera & Microphone stream
  useEffect(() => {
    startMedia();
    return () => {
      stopMedia();
    };
  }, []);

  const startMedia = async () => {
    try {
      setPermission('pending');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true,
      });
      
      setStream(mediaStream);
      setPermission('granted');

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Proctor Media Error:', err);
      setPermission('denied');
      toast.error('Camera & Microphone access is mandatory for this exam.');
      if (onPermissionDenied) {
        onPermissionDenied(err.name === 'NotAllowedError' ? 'Permission Denied' : 'Device Error');
      }
    }
  };

  const stopMedia = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Periodic capture every 30 seconds
  useEffect(() => {
    if (permission !== 'granted' || !stream) return;

    const interval = setInterval(() => {
      captureFrame('PeriodicCapture');
    }, 30000);

    return () => clearInterval(interval);
  }, [permission, stream]);

  // Method to take a canvas snapshot and send it to the server
  const captureFrame = async (type = 'PeriodicCapture') => {
    if (permission !== 'granted' || !videoRef.current || !canvasRef.current) {
      console.warn('Skipping capture: media devices are not ready');
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
              if (res.data.success && onWarningLogged) {
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
    captureViolation: (type) => captureFrame(type),
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
