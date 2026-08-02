import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2,
  Info,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import toast from 'react-hot-toast';

const Login = ({ isAdmin = false }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      emailAddress: '',
      userPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const user = await login(data.emailAddress, data.userPassword, isAdmin ? 'admin' : 'candidate');
      
      // Redirect based on role
      if (user.role === 'candidate') {
        navigate('/candidate/profile');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If Admin portal, render standard clean center login card
  if (isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 transition-colors">
        <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-700/50 space-y-8">
          
          {/* Brand/Logo Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto h-12 w-12 bg-brand-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                Stackvil Admin Control
              </h2>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                Sign in to manage evaluations
              </p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
            <input type="text" name="dummy_email" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />
            <input type="password" name="dummy_password" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />
            
            {/* Email input */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="h-5 w-5" />
                </span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="off"
                  {...register('emailAddress', {
                    required: 'Email address is required',
                    pattern: {
                      value: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white rounded-2xl text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
                    errors.emailAddress 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500'
                  }`}
                />
              </div>
              {errors.emailAddress && (
                <p className="text-xs text-rose-500 font-medium pl-1">{errors.emailAddress.message}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="space-y-1.5 text-left">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="off"
                  {...register('userPassword', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                  className={`w-full pl-11 pr-11 py-3 bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white rounded-2xl text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
                    errors.userPassword 
                      ? 'border-rose-500 focus:border-rose-500' 
                      : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.userPassword && (
                <p className="text-xs text-rose-500 font-medium pl-1">{errors.userPassword.message}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-400 text-white font-semibold rounded-2xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition flex items-center justify-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Demo Credentials
            </p>
            <div className="flex justify-center text-[10px] text-slate-500 dark:text-slate-400">
              <div className="p-2 w-full bg-slate-50 dark:bg-slate-900 rounded-lg">
                <p className="font-bold text-slate-700 dark:text-slate-200">Admin Account</p>
                <p>hr@stackvil.com</p>
                <p>password123</p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Two-column Candidate Login Portal: Left (40% Guidelines), Right (60% Login form)
  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 to-blue-50/20 dark:from-slate-900 dark:to-slate-955 px-4 py-8 md:py-16 transition-colors text-left flex items-center justify-center">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-stretch">
        
        {/* LEFT SIDE (40% width / 2 Columns) - Guidelines */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-3 bg-brand-500 text-white p-3 rounded-2xl shadow-lg shadow-brand-500/20">
                <GraduationCap className="h-8 w-8" />
                <span className="font-black tracking-wider text-xl uppercase">Stackvil</span>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white leading-tight">
                  Welcome to Stackvil Online Examination Portal
                </h1>
                <p className="text-sm font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider mt-1">
                  Secure AI-Proctored Assessment Platform
                </p>
              </div>
            </div>

            {/* Candidate Guidelines List Card */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-lg space-y-4">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center space-x-2 text-sm uppercase tracking-wider">
                <Info className="h-4.5 w-4.5 text-brand-500" />
                <span>Important Guidelines</span>
              </h3>
              
              <div className="space-y-3 text-xs text-slate-650 dark:text-slate-350 font-medium">
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>Attempt the examination individually using a <strong>Laptop/Desktop</strong> only (Mobile phones/tablets are prohibited).</p>
                </div>
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>Ensure a stable internet connection and webcam/microphone devices remain active at all times.</p>
                </div>
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p><strong>Fullscreen mode is mandatory</strong>. Exiting fullscreen or minimizing generates warning prompts.</p>
                </div>
                <div className="flex items-start space-x-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>Switching browser tabs or opening external applications is strictly prohibited.</p>
                </div>
                <div className="flex items-start space-x-2.5 bg-rose-50 dark:bg-rose-950/10 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                  <ShieldAlert className="h-4.5 w-4.5 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-rose-700 dark:text-rose-455">
                    <strong>Auto-Submission:</strong> Reaching 5 warning counts, camera/mic obstruction, or tab-switching violations will result in automatic exam submission.
                  </p>
                </div>
              </div>
            </div>

          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            © Stackvil Online Examinations. All Rights Reserved. AI proctoring active.
          </p>
        </div>

        {/* RIGHT SIDE (60% width / 3 Columns) - Clean Login Card */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-750 p-8 space-y-6">
            
            {/* Header Title */}
            <div className="pb-4 border-b border-slate-100 dark:border-slate-700/60">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Candidate Login</h2>
              <p className="text-xs text-slate-450 mt-0.5">Sign in to start your assessment</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
              <input type="text" name="dummy_email" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />
              <input type="password" name="dummy_password" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />

              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider pl-0.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail className="h-5 w-5" />
                  </span>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    autoComplete="off"
                    {...register('emailAddress', {
                      required: 'Email address is required',
                      pattern: {
                        value: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                    className={`w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
                      errors.emailAddress 
                        ? 'border-rose-500 focus:border-rose-500' 
                        : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500'
                    }`}
                  />
                </div>
                {errors.emailAddress && (
                  <p className="text-xs text-rose-500 font-medium pl-1">{errors.emailAddress.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock className="h-5 w-5" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="off"
                    {...register('userPassword', {
                      required: 'Password is required',
                      minLength: {
                        value: 6,
                        message: 'Password must be at least 6 characters',
                      },
                    })}
                    className={`w-full pl-11 pr-11 py-2.5 bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white rounded-xl text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
                      errors.userPassword 
                        ? 'border-rose-500 focus:border-rose-500' 
                        : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.userPassword && (
                  <p className="text-xs text-rose-500 font-medium pl-1">{errors.userPassword.message}</p>
                )}
              </div>

              {/* Remember me option */}
              <div className="flex items-center text-xs py-1">
                <label className="flex items-center space-x-2 text-slate-600 dark:text-slate-350 font-semibold cursor-pointer">
                  <input type="checkbox" className="h-4.5 w-4.5 rounded accent-brand-650" />
                  <span>Remember Me</span>
                </label>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-slate-200 dark:disabled:bg-slate-700 disabled:text-slate-400 dark:disabled:text-slate-500 text-white font-bold rounded-xl shadow-lg shadow-brand-500/10 hover:shadow-brand-500/25 transition flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>

            </form>

            {/* Demo credentials hint */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
              <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                Demo Credentials
              </p>
              <div className="flex justify-center text-[10px] text-slate-500 dark:text-slate-400">
                <div className="p-2 w-full bg-slate-50 dark:bg-slate-900 rounded-lg">
                  <p className="font-bold text-slate-700 dark:text-slate-200">Candidate Account</p>
                  <p>candidate@stackvil.com</p>
                  <p>password123</p>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
