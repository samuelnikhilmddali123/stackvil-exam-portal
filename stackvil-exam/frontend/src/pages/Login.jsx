import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Loader2,
  Info,
  CheckCircle2,
  ShieldAlert,
  Shield,
  Sparkles,
  Cpu,
  Laptop
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const [authError, setAuthError] = useState('');

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      setAuthError('');
      const user = await login(data.emailAddress, data.userPassword, isAdmin ? 'admin' : 'candidate');
      
      // Redirect based on role
      if (user.role === 'candidate') {
        navigate('/candidate/profile');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      console.error(err);
      setAuthError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Shared Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15
      }
    }
  };

  // If Admin portal, render standard clean center login card
  if (isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-12 transition-colors duration-300 relative overflow-hidden text-left">
        
        {/* CSS Keyframe Animations Injection */}
        <style>{`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.35; }
            50% { opacity: 0.65; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 8s infinite ease-in-out;
          }
        `}</style>

        {/* Clean Grid Background overlay */}
        <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
          {/* Extremely subtle ambient glow to keep background white and crisp */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-md w-full backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 rounded-3xl shadow-2xl p-8 md:p-10 border border-slate-200/50 dark:border-slate-800/60 space-y-8 relative overflow-hidden z-10"
        >
          {/* Subtle inside glow */}
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-brand-500/5 rounded-full blur-xl pointer-events-none" />

          {/* Brand/Logo Header */}
          <motion.div variants={itemVariants} className="text-center space-y-4">
            <div className="relative mx-auto h-24 w-24">
              {/* Pulsating colorful gradient glow behind the admin logo card */}
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-400 to-indigo-500 dark:from-brand-500 dark:to-indigo-650 rounded-2xl blur-xl opacity-35 animate-pulse" />
              
              <div className="relative h-full w-full bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl border border-slate-200/60 dark:border-slate-800 p-2.5 overflow-hidden ring-4 ring-indigo-500/10">
                <img src="/Black Simple Eagle Logo (1).jpg" alt="Company Logo" className="h-full w-full object-contain rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-tight px-2">
                Stackvil Technologies Private Limited
              </h2>
              <div className="inline-flex items-center space-x-1.5 bg-brand-500/10 text-brand-600 dark:text-brand-400 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border border-brand-500/20">
                <span className="h-1.5 w-1.5 bg-brand-500 rounded-full animate-ping" />
                <span>Admin Gateway</span>
              </div>
            </div>
          </motion.div>

          {/* Login Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
            <input type="text" name="dummy_email" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />
            <input type="password" name="dummy_password" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />
            
            <AnimatePresence mode="wait">
              {authError && (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, x: [0, -10, 10, -10, 10, 0] }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.5 }}
                  className="p-3.5 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/30 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-455 flex items-center space-x-2 text-left shadow-lg shadow-rose-500/5"
                >
                  <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500" />
                  <span>{authError}</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Email input */}
            <motion.div variants={itemVariants} className="space-y-1.5 text-left">
              <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-1">
                Email Address
              </label>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-brand-500">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="off"
                  {...register('emailAddress', {
                    required: 'Email address is required',
                    pattern: {
                      value: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                      message: 'Enter a valid email address',
                    },
                  })}
                  className={`w-full pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/45 border text-slate-900 dark:text-white rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 ${
                    errors.emailAddress 
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' 
                      : 'border-slate-200 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-500'
                  }`}
                />
              </div>
              <AnimatePresence>
                {errors.emailAddress && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-rose-500 font-bold pl-1.5"
                  >
                    {errors.emailAddress.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Password Input */}
            <motion.div variants={itemVariants} className="space-y-1.5 text-left">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative group">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-brand-500">
                  <Lock className="h-4.5 w-4.5" />
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
                  className={`w-full pl-11 pr-11 py-3 bg-slate-50/50 dark:bg-slate-950/45 border text-slate-900 dark:text-white rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 ${
                    errors.userPassword 
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' 
                      : 'border-slate-200 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
              <AnimatePresence>
                {errors.userPassword && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-rose-500 font-bold pl-1.5"
                  >
                    {errors.userPassword.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isSubmitting}
              variants={itemVariants}
              whileHover={{ scale: 1.01, translateY: -1 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-brand-600 hover:from-blue-700 hover:to-brand-700 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 hover:shadow-brand-500/35 transition-all duration-300 flex items-center justify-center space-x-2 disabled:from-slate-200 disabled:to-slate-350 dark:disabled:from-slate-800 dark:disabled:to-slate-900 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:shadow-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="tracking-wide">Authenticating...</span>
                </>
              ) : (
                <span className="tracking-wide font-extrabold uppercase text-xs">Verify Credentials</span>
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Two-column Candidate Login Portal: Left (Guidelines), Right (Login form)
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center relative overflow-hidden px-4 py-8 md:py-16 transition-colors duration-300 text-left">
      
      {/* CSS Keyframe Animations Injection */}
      <style>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.65; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s infinite ease-in-out;
        }
      `}</style>

      {/* Clean Grid Background overlay */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35" />
        {/* Extremely subtle ambient glow to keep background white and crisp */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 items-stretch z-10"
      >
        
        {/* LEFT SIDE (40% width) - Guidelines */}
        <div className="lg:col-span-2 flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            
            {/* Header info */}
            <div className="space-y-4">
              <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-2">
                <div className="inline-flex items-center space-x-3 bg-white/85 dark:bg-slate-900/60 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-md border border-slate-200/40 dark:border-slate-800/40 max-w-full overflow-hidden">
                  <div className="relative shrink-0">
                    {/* Pulsating glow ring around the logo */}
                    <span className="absolute inset-0 bg-brand-500/20 dark:bg-brand-400/30 rounded-lg blur-[3px] scale-110 animate-pulse" />
                    <img src="/Black Simple Eagle Logo (1).jpg" alt="Company Logo" className="relative h-8 w-8 object-contain rounded-lg border border-slate-200/60 dark:border-slate-700 shadow-md ring-2 ring-brand-500/10" />
                  </div>
                  <span className="font-black tracking-tight text-xs sm:text-sm uppercase text-slate-850 dark:text-white truncate">
                    Stackvil Technologies Private Limited
                  </span>
                </div>
                
                <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20 animate-pulse-slow">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-ping" />
                  <span>AI Proctoring Active</span>
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                  <span className="text-slate-800 dark:text-white">Welcome to the </span>
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                    Assessment Portal
                  </span>
                </h1>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  Secure Enterprise Examination Suite
                </p>
              </motion.div>
            </div>

            {/* Candidate Guidelines List Card */}
            <motion.div 
              variants={itemVariants}
              className="backdrop-blur-md bg-white/80 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl p-6 shadow-xl relative overflow-hidden space-y-5"
            >
              {/* Highlight shadow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

              <h3 className="font-bold text-slate-800 dark:text-white flex items-center space-x-2 text-xs uppercase tracking-widest border-b border-slate-100 dark:border-slate-800/60 pb-3">
                <Info className="h-4 w-4 text-blue-500" />
                <span>Essential Candidate Guidelines</span>
              </h3>
              
              <div className="space-y-4">
                
                <motion.div 
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="flex items-start space-x-3.5 group"
                >
                  <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 border border-blue-500/10 transition-transform group-hover:scale-105">
                    <Laptop className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">Device Compliance</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      Attempt the examination individually using a <strong>Laptop/Desktop</strong> only (Mobile phones/tablets are prohibited).
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="flex items-start space-x-3.5 group"
                >
                  <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 border border-blue-500/10 transition-transform group-hover:scale-105">
                    <Cpu className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">Hardware & Connection</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      Ensure a stable internet connection and webcam/microphone devices remain active at all times.
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="flex items-start space-x-3.5 group"
                >
                  <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 border border-blue-500/10 transition-transform group-hover:scale-105">
                    <Shield className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">Fullscreen Monitoring</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      <strong>Fullscreen mode is mandatory</strong>. Exiting fullscreen or minimizing generates warning prompts.
                    </p>
                  </div>
                </motion.div>

                <motion.div 
                  whileHover={{ x: 4 }}
                  transition={{ type: 'spring', stiffness: 200 }}
                  className="flex items-start space-x-3.5 group"
                >
                  <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0 border border-blue-500/10 transition-transform group-hover:scale-105">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">Application Restrictions</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      Switching browser tabs or opening external applications is strictly prohibited.
                    </p>
                  </div>
                </motion.div>

                {/* Critical warning banner */}
                <div className="flex items-start space-x-3 bg-rose-500/5 dark:bg-rose-500/10 p-3.5 rounded-2xl border border-rose-500/25 dark:border-rose-500/20 shadow-inner">
                  <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h5 className="text-[11px] font-bold text-rose-600 dark:text-rose-455 uppercase tracking-wider mb-0.5">Strict Auto-Submission Policy</h5>
                    <p className="text-[10px] text-rose-600/90 dark:text-rose-400/90 font-semibold leading-normal">
                      Reaching 5 warning counts, blocking camera/mic feed, or navigating outside the testing page will trigger immediate, automatic submission of your examination.
                    </p>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>

          <motion.p variants={itemVariants} className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider pl-1">
            © Stackvil Technologies Private Limited. All Rights Reserved. AI proctoring active.
          </motion.p>
        </div>

        {/* RIGHT SIDE (60% width) - Glass Login Card */}
        <motion.div variants={itemVariants} className="lg:col-span-3 flex flex-col justify-center">
          <div className="backdrop-blur-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/60 rounded-3xl shadow-2xl p-8 md:p-10 space-y-6 relative overflow-hidden">
            
            {/* Card inner top glow */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header Title */}
            <div className="pb-5 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-2xl font-black text-slate-850 dark:text-white tracking-tight">Candidate Access Portal</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Please sign in with your registered credentials to launch the test suite</p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" autoComplete="off">
              <input type="text" name="dummy_email" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />
              <input type="password" name="dummy_password" style={{ position: 'absolute', top: '-1000px', left: '-1000px' }} tabIndex={-1} readOnly />

              <AnimatePresence mode="wait">
                {authError && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1, x: [0, -10, 10, -10, 10, 0] }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.5 }}
                    className="p-3.5 bg-rose-500/5 dark:bg-rose-950/20 border border-rose-500/30 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-455 flex items-center space-x-2.5 text-left shadow-lg shadow-rose-500/5"
                  >
                    <ShieldAlert className="h-5 w-5 shrink-0 text-rose-500 animate-pulse" />
                    <span>{authError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest pl-0.5">
                  Security Email
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-brand-500">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="off"
                    {...register('emailAddress', {
                      required: 'Email address is required',
                      pattern: {
                        value: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                        message: 'Enter a valid email address',
                      },
                    })}
                    className={`w-full pl-11 pr-4 py-3 bg-slate-50/50 dark:bg-slate-950/45 border text-slate-900 dark:text-white rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 ${
                      errors.emailAddress 
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' 
                        : 'border-slate-200 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-500'
                    }`}
                  />
                </div>
                <AnimatePresence>
                  {errors.emailAddress && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-rose-500 font-bold pl-1.5"
                    >
                      {errors.emailAddress.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    Security Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-slate-500 transition-colors group-focus-within:text-brand-555">
                    <Lock className="h-4.5 w-4.5" />
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
                    className={`w-full pl-11 pr-11 py-3 bg-slate-50/50 dark:bg-slate-950/45 border text-slate-900 dark:text-white rounded-2xl text-sm transition-all focus:outline-none focus:ring-4 focus:ring-brand-500/10 ${
                      errors.userPassword 
                        ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/10' 
                        : 'border-slate-200 dark:border-slate-800 focus:border-brand-500 dark:focus:border-brand-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
                <AnimatePresence>
                  {errors.userPassword && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[11px] text-rose-500 font-bold pl-1.5"
                    >
                      {errors.userPassword.message}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Remember me option */}
              <div className="flex items-center text-xs py-1.5">
                <label className="flex items-center space-x-2 text-slate-500 dark:text-slate-450 font-bold cursor-pointer group">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-200 dark:border-slate-800 accent-brand-500 cursor-pointer" />
                  <span className="select-none tracking-wide text-[11px] uppercase group-hover:text-slate-700 dark:group-hover:text-slate-350 transition-colors">Remember Credentials</span>
                </label>
              </div>

              {/* Submit Action */}
              <motion.button
                type="submit"
                disabled={isSubmitting}
                whileHover={{ scale: 1.01, translateY: -1 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-brand-500 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-brand-500/20 hover:shadow-brand-500/35 transition-all duration-300 flex items-center justify-center space-x-2 disabled:from-slate-200 disabled:to-slate-350 dark:disabled:from-slate-800 dark:disabled:to-slate-900 disabled:text-slate-400 dark:disabled:text-slate-500 disabled:shadow-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="tracking-wide">Verifying Integrity...</span>
                  </>
                ) : (
                  <span className="tracking-wide font-extrabold uppercase text-xs">Access Exam Suite</span>
                )}
              </motion.button>

            </form>

            {/* Encrypted SSL lock indicator */}
            <div className="pt-2 flex items-center justify-center space-x-2 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
              <Shield className="h-4.5 w-4.5 text-blue-500/60" />
              <span>256-bit SSL Secure Assessment Link</span>
            </div>

          </div>
        </motion.div>

      </motion.div>
    </div>
  );
};

export default Login;
