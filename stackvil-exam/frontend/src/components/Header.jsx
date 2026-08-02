import React from 'react';
import { Sun, Moon, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { user, logout, theme, toggleTheme } = useAuth();

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-8 sticky top-0 z-10 transition-colors">
      {/* Title */}
      <div>
        <h1 className="text-slate-800 dark:text-slate-100 font-semibold text-lg">
          {user?.role === 'superadmin' ? 'Super Admin Console' : 'Administration Control Center'}
        </h1>
      </div>

      {/* Toolbar actions */}
      <div className="flex items-center space-x-6">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-yellow-400" />}
        </button>

        {/* User Card */}
        <div className="flex items-center space-x-3 border-l border-slate-200 dark:border-slate-700 pl-6">
          <div className="h-9 w-9 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold uppercase text-sm shadow-sm shadow-brand-500/30">
            {user?.name ? user.name.slice(0, 2) : 'AD'}
          </div>
          <div className="text-left hidden md:block">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{user?.name}</h4>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        </div>

        {/* Log Out */}
        <button
          onClick={logout}
          className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
          title="Log Out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
