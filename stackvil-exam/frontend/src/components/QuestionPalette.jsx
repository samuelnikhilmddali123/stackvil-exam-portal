import React from 'react';

const QuestionPalette = ({
  questions = [],
  currentQuestionIndex = 0,
  answers = {},
  reviewLater = [],
  onSelectQuestion,
}) => {
  
  const getButtonClass = (question, index) => {
    const qId = question._id;
    const isCurrent = index === currentQuestionIndex;
    const isAnswered = answers[qId] !== undefined && answers[qId] !== null && answers[qId] !== '';
    const isReview = reviewLater.includes(qId);

    let base = "h-10 w-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-all ";

    if (isCurrent) {
      base += "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900 ";
    }

    if (isReview) {
      // Marked for review later
      return base + "bg-amber-500 text-white hover:bg-amber-600 shadow-sm";
    }

    if (isAnswered) {
      // Successfully answered
      return base + "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm";
    }

    // Unanswered / Visited or unvisited
    return base + "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-750";
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
      <div>
        <h3 className="font-bold text-slate-800 dark:text-white text-base">Question Navigator</h3>
        <p className="text-xs text-slate-400">Select any square to jump directly</p>
      </div>

      {/* Grid of buttons */}
      <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
        {questions.map((q, idx) => (
          <button
            key={q._id}
            onClick={() => onSelectQuestion(idx)}
            className={getButtonClass(q, idx)}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Legend key indicators */}
      <div className="pt-6 border-t border-slate-100 dark:border-slate-700 space-y-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legend</h4>
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center space-x-2">
            <span className="h-3.5 w-3.5 bg-emerald-500 rounded-md block"></span>
            <span>Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3.5 w-3.5 bg-amber-500 rounded-md block"></span>
            <span>Review Later</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3.5 w-3.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md block"></span>
            <span>Not Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3.5 w-3.5 ring-2 ring-brand-500 rounded-md block"></span>
            <span>Current Item</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionPalette;
