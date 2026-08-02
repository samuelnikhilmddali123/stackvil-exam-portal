import React from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const WarningModal = ({ isOpen, title, message, warningCount, onConfirm }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-rose-100 dark:border-rose-950/30 text-center space-y-6"
          >
            {/* Warning Icon */}
            <div className="mx-auto h-16 w-16 bg-rose-50 dark:bg-rose-950/30 rounded-full flex items-center justify-center text-rose-500 animate-bounce">
              <AlertTriangle className="h-9 w-9" />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                {title || 'Security Violation'}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {message || 'A security event has been recorded by the proctoring engine.'}
              </p>
            </div>

            {/* Warning Counter Card */}
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
                <Lock className="h-5 w-5 shrink-0" />
                <span className="text-sm font-semibold">Violation Warning Issued</span>
              </div>
              <span className="px-3 py-1 bg-rose-600 text-white rounded-full font-bold text-sm">
                {warningCount} / 5
              </span>
            </div>

            {/* Action instructions */}
            <div className="text-xs text-slate-400 dark:text-slate-500 italic">
              Note: Exceeding 5 warnings will cause immediate auto-submission of your exam.
            </div>

            {/* Confirm Button */}
            <button
              onClick={onConfirm}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-semibold rounded-xl shadow-lg shadow-brand-500/20 transition-all hover:scale-[1.01]"
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
