import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap, Lock, Key, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailParam = searchParams.get('email') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: emailParam,
      otp: '',
      newPassword: '',
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const response = await axios.post('/api/auth/reset-password', {
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword,
      });

      if (response.data.success) {
        toast.success('Password updated successfully. Please log in.');
        navigate('/login');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Double check details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-700/50 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 bg-brand-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/20">
            <GraduationCap className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Create New Password
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Enter verification OTP and your new credentials
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Email (read-only/hidden if already passed, otherwise visible) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              Confirm Email
            </label>
            <input
              type="email"
              placeholder="email@example.com"
              {...register('email', { required: 'Confirming email is required' })}
              className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-2xl text-sm outline-none cursor-not-allowed"
              readOnly
            />
          </div>

          {/* OTP Code */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              6-Digit OTP Code
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Key className="h-5 w-5" />
              </span>
              <input
                type="text"
                placeholder="123456"
                maxLength={6}
                {...register('otp', {
                  required: 'OTP Code is required',
                  minLength: { value: 6, message: 'OTP must be 6 digits' },
                })}
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white rounded-2xl text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
                  errors.otp 
                    ? 'border-rose-500 focus:border-rose-500' 
                    : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500'
                }`}
              />
            </div>
            {errors.otp && (
              <p className="text-xs text-rose-500 font-medium pl-1">{errors.otp.message}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              New Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="h-5 w-5" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                {...register('newPassword', {
                  required: 'New Password is required',
                  minLength: { value: 6, message: 'Password must be at least 6 characters' },
                })}
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white rounded-2xl text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
                  errors.newPassword 
                    ? 'border-rose-500 focus:border-rose-500' 
                    : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500'
                }`}
              />
            </div>
            {errors.newPassword && (
              <p className="text-xs text-rose-500 font-medium pl-1">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:bg-brand-400 text-white font-semibold rounded-2xl shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Resetting...</span>
              </>
            ) : (
              <span>Reset Password</span>
            )}
          </button>
        </form>

        {/* Back Link */}
        <div className="text-center pt-2">
          <Link
            to="/login"
            className="inline-flex items-center space-x-2 text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Login</span>
          </Link>
        </div>

      </div>
    </div>
  );
};

export default ResetPassword;
