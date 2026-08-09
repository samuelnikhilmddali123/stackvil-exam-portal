import React, {
  useRef,
  useEffect,
  useState,
  useImperativeHandle,
  forwardRef
} from 'react';
import { Monitor, AlertOctagon, CheckCircle2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/api';

const ProctorScreenShare = forwardRef(({
  examId,
  onScreenShareStateChange,
  onWarningLogged
}, ref) => {
  const { user } = useAuth();
  const candidateId = user?._id || user?.id;

  const [stream, setStream] = useState(null);
  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const socketRef = useRef(null);

  const [isSharing, setIsSharing] = useState(false);
  const [isEntireScreen, setIsEntireScreen] = useState(false);
  const [needsManualConfirm, setNeedsManualConfirm] = useState(false);
  const [candidateConfirmed, setCandidateConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const peersRef = useRef({});
  const iceQueuesRef = useRef({});

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const startScreenShare = async () => {
    try {
      setErrorMsg('');
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: false
      });

      const videoTrack = mediaStream.getVideoTracks()[0];
      if (!videoTrack) {
        throw new Error('No video track found in screen share stream.');
      }

      // Check display surface API if supported
      const trackSettings = videoTrack.getSettings ? videoTrack.getSettings() : {};
      const surface = trackSettings.displaySurface;

      let isEntire = false;
      let manualNeeded = false;

      if (surface === 'monitor') {
        isEntire = true;
      } else if (surface === 'window' || surface === 'browser') {
        // Candidate picked single window or tab instead of entire screen!
        videoTrack.stop();
        const err = 'Entire Screen sharing is mandatory. Please re-share and select "Entire Screen".';
        setErrorMsg(err);
        toast.error(err, { duration: 5000 });
        if (onScreenShareStateChange) onScreenShareStateChange(false, false);
        return false;
      } else {
        // Browser API does not specify surface (e.g. some Firefox/Safari versions)
        manualNeeded = true;
      }

      // Handle user stopping screen share from browser banner ("Stop sharing")
      videoTrack.onended = () => {
        console.warn('Screen sharing stopped by user.');
        stopScreenShare();
        toast.error('Screen sharing was stopped! Entire screen sharing is required.', { duration: 6000 });
        if (socketRef.current) {
          socketRef.current.emit('candidate-screenshare-status', {
            examId,
            candidateId,
            status: 'stopped',
            isEntireScreen: false
          });
        }
        if (onWarningLogged) {
          onWarningLogged(null, 'Screen Sharing Disconnected');
        }
      };

      setStream(mediaStream);
      streamRef.current = mediaStream;
      setIsSharing(true);
      setIsEntireScreen(isEntire || candidateConfirmed);
      setNeedsManualConfirm(manualNeeded);

      const activeState = isEntire || candidateConfirmed || manualNeeded;
      if (onScreenShareStateChange) {
        onScreenShareStateChange(true, activeState);
      }

      if (socketRef.current) {
        socketRef.current.emit('candidate-screenshare-status', {
          examId,
          candidateId,
          status: 'active',
          isEntireScreen: isEntire
        });
      }

      return true;
    } catch (err) {
      console.error('Screen Share Error:', err);
      if (err.name !== 'NotAllowedError') {
        toast.error(err.message || 'Failed to start screen sharing.');
      }
      setIsSharing(false);
      setIsEntireScreen(false);
      if (onScreenShareStateChange) onScreenShareStateChange(false, false);
      return false;
    }
  };

  const stopScreenShare = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setStream(null);
    setIsSharing(false);
    setIsEntireScreen(false);
    setCandidateConfirmed(false);
    if (onScreenShareStateChange) onScreenShareStateChange(false, false);
  };

  const handleManualConfirmationToggle = (e) => {
    const checked = e.target.checked;
    setCandidateConfirmed(checked);
    if (checked && isSharing) {
      setIsEntireScreen(true);
      if (onScreenShareStateChange) onScreenShareStateChange(true, true);
    }
  };

  const initiateWebRPeerConnection = async (adminSocketId) => {
    try {
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
          console.warn('WebRTC Screen ICE connection failed, attempting ICE restart...');
          pc.restartIce();
        }
      };

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          const sender = pc.addTrack(track, streamRef.current);
          if (sender && sender.track && sender.track.kind === 'video') {
            try {
              const params = sender.getParameters();
              if (!params.encodings) params.encodings = [{}];
              params.encodings[0].maxBitrate = 800000; // 800 kbps for HD screen clarity
              params.encodings[0].maxFramerate = 15;
              sender.setParameters(params).catch(e => console.warn(e));
            } catch (e) {
              console.warn(e);
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
            streamType: 'screen'
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
          streamType: 'screen'
        });
      }
    } catch (err) {
      console.error('Failed to initiate Screen Share WebRTC:', err);
    }
  };

  const handleWebRTCSignal = async (fromSocketId, signalData) => {
    try {
      const pc = peersRef.current[fromSocketId];
      if (!pc) return;

      if (signalData.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
        const queue = iceQueuesRef.current[fromSocketId] || [];
        for (const candidate of queue) {
          await pc.addIceCandidate(candidate).catch(e => console.warn(e));
        }
        iceQueuesRef.current[fromSocketId] = [];
      } else if (signalData.type === 'ice') {
        const iceCandidate = new RTCIceCandidate(signalData.candidate);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(iceCandidate).catch(e => console.warn(e));
        } else {
          if (!iceQueuesRef.current[fromSocketId]) iceQueuesRef.current[fromSocketId] = [];
          iceQueuesRef.current[fromSocketId].push(iceCandidate);
        }
      }
    } catch (err) {
      console.error('Screen WebRTC signal error:', err);
    }
  };

  useEffect(() => {
    if (isSharing && candidateId) {
      const socket = io(API_BASE_URL, {
        path: '/socket.io'
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join-exam-session', { examId, candidateId, streamType: 'screen' });
      });
      socket.emit('join-exam-session', { examId, candidateId, streamType: 'screen' });

      socket.on('admin-online-ping', ({ adminSocketId, streamType }) => {
        if (!streamType || streamType === 'screen') {
          initiateWebRPeerConnection(adminSocketId);
        }
      });

      socket.on('receive-webrtc-signal', ({ fromSocketId, signalData, streamType }) => {
        if (streamType === 'screen') {
          handleWebRTCSignal(fromSocketId, signalData);
        }
      });

      return () => {
        Object.keys(peersRef.current).forEach(id => {
          if (peersRef.current[id]) peersRef.current[id].close();
        });
        peersRef.current = {};
        iceQueuesRef.current = {};
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [isSharing, examId, candidateId]);

  // Real-time socket screen frame fallback streaming (2 FPS ~ 500ms)
  useEffect(() => {
    if (!isSharing || !stream) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 960;
    canvas.height = 540;

    let isSending = false;

    const screenFrameInterval = setInterval(() => {
      if (isSending || !videoRef.current || !socketRef.current || !socketRef.current.connected) return;
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) return;

      isSending = true;
      try {
        ctx.drawImage(video, 0, 0, 960, 540);
        canvas.toBlob((blob) => {
          isSending = false;
          if (blob && socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('candidate-screen-frame', {
              examId,
              candidateId,
              frameBuffer: blob
            });
          }
        }, 'image/jpeg', 0.35);
      } catch (e) {
        isSending = false;
        console.warn('Socket screen frame emit error:', e);
      }
    }, 500);

    return () => clearInterval(screenFrameInterval);
  }, [isSharing, stream, examId, candidateId]);

  useImperativeHandle(ref, () => ({
    startScreenShare,
    stopScreenShare,
    isSharing: () => isSharing && (isEntireScreen || candidateConfirmed)
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Monitor className={`h-5 w-5 ${isSharing ? 'text-emerald-400' : 'text-slate-400'}`} />
          <span className="text-sm font-bold text-white">Entire Screen Sharing</span>
        </div>

        {isSharing ? (
          <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-full flex items-center space-x-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Active</span>
          </span>
        ) : (
          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 text-xs font-bold rounded-full">
            Not Started
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs font-medium flex items-start space-x-2">
          <AlertOctagon className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isSharing ? (
        <div className="space-y-3">
          <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-slate-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 backdrop-blur text-[10px] font-mono text-emerald-400 rounded">
              Live Screen Feed
            </div>
          </div>

          {needsManualConfirm && !isEntireScreen && (
            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2 text-xs">
              <p className="text-amber-300 font-semibold">
                Please confirm that you have selected your "Entire Screen" in the browser prompt:
              </p>
              <label className="flex items-center space-x-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={candidateConfirmed}
                  onChange={handleManualConfirmationToggle}
                  className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-brand-500"
                />
                <span className="font-bold">I confirm I am sharing my Entire Screen (not just a single window or tab).</span>
              </label>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4 space-y-3 bg-slate-950/50 rounded-xl border border-slate-800">
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            You must share your <strong className="text-white">Entire Screen</strong> to proceed to the coding round. Single windows or browser tabs are prohibited.
          </p>
          <button
            onClick={startScreenShare}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-2 mx-auto cursor-pointer"
          >
            <Monitor className="h-4 w-4" />
            <span>Share Entire Screen</span>
          </button>
        </div>
      )}
    </div>
  );
});

export default ProctorScreenShare;
