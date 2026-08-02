import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { GraduationCap, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CandidateLayout = () => {
  const { user, logout, theme, toggleTheme } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navigation */}
      <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 md:px-12 sticky top-0 z-10">
        <Link to="/candidate/profile" className="flex items-center space-x-3">
          <GraduationCap className="h-8 w-8 text-brand-600" />
          <span className="font-extrabold text-xl tracking-tight text-slate-800 dark:text-white">Stackvil Portal</span>
        </Link>

        {/* Action controls */}
        <div className="flex items-center space-x-4">
          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-yellow-400" />}
          </button>

          {/* Student name */}
          <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-700 pl-4">
            <div className="h-8 w-8 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm shadow-brand-500/20">
              {user?.name ? user.name.slice(0, 2) : 'CD'}
            </div>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 hidden md:inline">
              {user?.name}
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Main viewport */}
      <main className="flex-grow p-4 md:p-8 max-w-7xl w-full mx-auto">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-850">
        &copy; {new Date().getFullYear()} Stackvil Online Examination System. All rights reserved.
      </footer>
    </div>
  );
};

export default CandidateLayout;
