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

    let base = "h-11 w-11 rounded-xl flex items-center justify-center font-extrabold text-sm transition-all duration-200 ";

    if (isCurrent) {
      base += "ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-950 scale-105 shadow-md shadow-blue-500/10 ";
    }

    if (isReview) {
      // Marked for review later
      return base + "bg-amber-500 text-white hover:bg-amber-400 cursor-pointer";
    }

    if (isAnswered) {
      // Successfully answered
      return base + "bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer";
    }

    // Unanswered / Visited or unvisited
    return base + "bg-slate-950 border border-slate-850 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer";
  };

  return (
    <div className="bg-slate-950 border border-slate-800/80 rounded-3xl p-5 space-y-5 shadow-xl shadow-slate-950/30 shrink-0">
      <div className="space-y-1">
        <h3 className="font-black text-white text-sm uppercase tracking-wider">Question Navigator</h3>
        <p className="text-[11px] text-slate-400 font-medium">Select any square to jump directly</p>
      </div>

      {/* Grid of buttons */}
      <div className="grid grid-cols-5 gap-2.5">
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
      <div className="pt-4 border-t border-slate-850/60 space-y-2">
        <h4 className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Legend</h4>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-slate-400 font-semibold">
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 bg-emerald-600 rounded-md block"></span>
            <span>Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 bg-amber-500 rounded-md block"></span>
            <span>Review Later</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 bg-slate-950 border border-slate-850 rounded-md block"></span>
            <span>Not Answered</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="h-3 w-3 ring-2 ring-blue-500 rounded-md block"></span>
            <span>Current Item</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionPalette;
