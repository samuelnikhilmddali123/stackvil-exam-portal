import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { GraduationCap, Mail, ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: { email: '' },
  });

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const response = await axios.post('/api/auth/forgot-password', { email: data.email });

      if (response.data.success) {
        toast.success('OTP sent to your email. Check inbox/simulation console.');
        // Redirect to Reset Password with email query param
        navigate(`/reset-password?email=${encodeURIComponent(data.email)}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to dispatch reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 transition-colors">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 border border-slate-100 dark:border-slate-700/50 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-16 w-16 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg border border-slate-100 dark:border-slate-700 p-1.5 overflow-hidden">
            <img src="/Black Simple Eagle Logo (1).jpg" alt="Company Logo" className="h-full w-full object-contain rounded-xl" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">
              Reset Password
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Enter your email to receive a 6-digit verification code
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider pl-1">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                {...register('email', {
                  required: 'Email address is required',
                  pattern: {
                    value: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
                    message: 'Enter a valid email address',
                  },
                })}
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border text-slate-900 dark:text-white rounded-2xl text-sm transition focus:outline-none focus:ring-2 focus:ring-brand-500/50 ${
                  errors.email 
                    ? 'border-rose-500 focus:border-rose-500' 
                    : 'border-slate-200 dark:border-slate-700 focus:border-brand-500 dark:focus:border-brand-500'
                }`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-rose-500 font-medium pl-1">{errors.email.message}</p>
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
                <span>Sending Code...</span>
              </>
            ) : (
              <span>Request Verification Code</span>
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

export default ForgotPassword;
