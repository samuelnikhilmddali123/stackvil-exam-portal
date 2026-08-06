import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WarningModal = ({ isOpen, title, message, warningCount, onConfirm }) => {
  
  // Play synth security alert double-beep warning sound when modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          const audioCtx = new AudioContext();
          
          const playBeep = (timeDelay, frequency, duration) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            
            osc.type = 'sawtooth'; // Sawtooth wave for a harsh alarm tone
            osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
            
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
            
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            osc.start(audioCtx.currentTime + timeDelay);
            osc.stop(audioCtx.currentTime + timeDelay + duration);
          };
          
          // Play double alarm tone
          playBeep(0, 750, 0.25);
          playBeep(0.2, 750, 0.25);
        }
      } catch (err) {
        console.warn('Audio feedback blocked by browser interaction policy:', err);
      }
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/80 backdrop-blur-md transition-all duration-300">
          
          {/* Flashing Fullscreen Red Ambient Light Overlay */}
          <div className="absolute inset-0 bg-red-600/5 pointer-events-none animate-pulse" />

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="bg-slate-900 border-2 border-red-500 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.45)] text-center space-y-6 relative z-10 overflow-hidden"
          >
            {/* Header Warning Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500 animate-pulse" />

            {/* Glowing Red Warning Icon */}
            <div className="mx-auto h-20 w-20 bg-red-950/60 border border-red-500/50 rounded-full flex items-center justify-center text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.35)] animate-bounce">
              <AlertTriangle className="h-10 w-10 animate-pulse" />
            </div>

            {/* Content block */}
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-red-500 uppercase tracking-widest flex items-center justify-center gap-2">
                <ShieldAlert className="h-6 w-6 shrink-0" />
                <span>Red Alert</span>
              </h2>
              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                {title || 'Security Violation'}
              </h3>
              <p className="text-sm text-slate-355 font-medium leading-relaxed bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-slate-300">
                {message || 'A security event has been logged by the proctoring engine. Further tab switching will lead to automatic submission.'}
              </p>
            </div>

            {/* Warning Counter Card */}
            <div className="p-4 bg-red-950/40 border border-red-900/40 rounded-2xl flex items-center justify-between shadow-inner">
              <div className="flex items-center space-x-3 text-red-400">
                <span className="h-2 w-2 bg-red-500 rounded-full animate-ping" />
                <span className="text-sm font-black uppercase tracking-wider">Warnings Logged</span>
              </div>
              <span className="px-4 py-1.5 bg-red-600 text-white rounded-full font-black text-sm border border-red-400 shadow-md">
                {warningCount} / 5
              </span>
            </div>

            {/* Alert info text */}
            <div className="text-xs text-rose-450 font-bold uppercase tracking-wider text-red-400 animate-pulse">
              System Action: Exceeding 5 warnings triggers automatic submission.
            </div>

            {/* Action button */}
            <button
              onClick={onConfirm}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-red-500/25 border border-red-400/30 transition-all duration-250 hover:scale-[1.02]"
            >
              Understand & Return to Exam
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WarningModal;
