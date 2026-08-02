import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  HelpCircle, 
  BarChart3, 
  Settings, 
  GraduationCap
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: 'dashboard', icon: LayoutDashboard },
    { name: 'Candidates', path: 'candidates', icon: Users },
    { name: 'Exams', path: 'exams', icon: BookOpen },
    { name: 'Question Bank', path: 'questions', icon: HelpCircle },
    { name: 'Reports', path: 'reports', icon: BarChart3 },
    { name: 'Settings', path: 'settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 space-x-3">
        <GraduationCap className="h-8 w-8 text-brand-400" />
        <span className="font-extrabold text-xl tracking-tight text-white">Stackvil Exam</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-500 font-medium">Stackvil Online Portal</p>
        <p className="text-[10px] text-slate-600">v1.0.0 (Production-Ready)</p>
      </div>
    </aside>
  );
};

export default Sidebar;
