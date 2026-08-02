import React from 'react';

const LoadingSkeleton = ({ type = 'card' }) => {
  if (type === 'page') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500"></div>
        <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading portal assets...</p>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
        </div>
        <div className="h-8 w-36 bg-slate-300 dark:bg-slate-600 rounded"></div>
        <div className="h-3 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className="w-full bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse overflow-hidden">
        <div className="h-14 bg-slate-100 dark:bg-slate-700 w-full mb-2"></div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center space-x-4">
              <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 w-1/5 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-4 w-1/6 bg-slate-200 dark:bg-slate-700 rounded"></div>
              <div className="h-8 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'chart') {
    return (
      <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 animate-pulse flex flex-col justify-between h-[300px]">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="flex items-end justify-between h-48 px-4">
          <div className="h-[20%] w-8 bg-slate-200 dark:bg-slate-700 rounded-t"></div>
          <div className="h-[50%] w-8 bg-slate-300 dark:bg-slate-600 rounded-t"></div>
          <div className="h-[80%] w-8 bg-slate-200 dark:bg-slate-700 rounded-t"></div>
          <div className="h-[40%] w-8 bg-slate-300 dark:bg-slate-600 rounded-t"></div>
          <div className="h-[75%] w-8 bg-slate-200 dark:bg-slate-700 rounded-t"></div>
        </div>
        <div className="h-4 w-2/3 bg-slate-150 dark:bg-slate-700 rounded self-center"></div>
      </div>
    );
  }

  return null;
};

export default LoadingSkeleton;
