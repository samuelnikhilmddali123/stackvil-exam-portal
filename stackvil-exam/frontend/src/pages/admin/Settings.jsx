import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../config/api';
import { 
  Settings as SettingsIcon, 
  Upload, 
  Mail, 
  ShieldCheck, 
  Palette,
  Loader2,
  Database,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSkeleton from '../../components/LoadingSkeleton';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [companyName, setCompanyName] = useState('Stackvil');
  const [companyLogo, setCompanyLogo] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [passwordLength, setPasswordLength] = useState(8);
  const [requireSpecialChar, setRequireSpecialChar] = useState(true);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/admin/settings');
      if (res.data.success) {
        const set = res.data.settings;
        setCompanyName(set.companyName || 'Stackvil');
        setCompanyLogo(set.companyLogo || '');
        setSmtpHost(set.smtpHost || '');
        setSmtpPort(set.smtpPort || 587);
        setSmtpUser(set.smtpUser || '');
        setSmtpPass(set.smtpPass || '');
        setPasswordLength(set.passwordLength || 8);
        setRequireSpecialChar(set.requireSpecialChar !== undefined ? set.requireSpecialChar : true);
        setTheme(set.theme || 'light');
      }
    } catch (err) {
      toast.error('Failed to load global configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUploadChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setCompanyLogo(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append('companyName', companyName);
      formData.append('smtpHost', smtpHost);
      formData.append('smtpPort', smtpPort);
      formData.append('smtpUser', smtpUser);
      formData.append('smtpPass', smtpPass);
      formData.append('passwordLength', passwordLength);
      formData.append('requireSpecialChar', requireSpecialChar);
      formData.append('theme', theme);
      if (logoFile) {
        formData.append('logo', logoFile);
      }

      const res = await axios.put('/api/admin/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data.success) {
        toast.success('Configuration updates saved successfully.');
        if (res.data.settings.companyLogo) {
          setCompanyLogo(res.data.settings.companyLogo);
          setLogoFile(null);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update portal settings.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetDatabase = async () => {
    const confirm1 = window.confirm('CRITICAL WARNING: This will completely wipe all candidates, exam results, and custom assessments. Are you sure you want to proceed?');
    if (!confirm1) return;

    const confirm2 = window.confirm('FINAL CONFIRMATION: Please confirm once more that you want to reset the database. You will be logged out automatically after reset.');
    if (!confirm2) return;

    try {
      const toastId = toast.loading('Resetting database...');
      const res = await axios.post('/api/admin/reset-database');
      toast.dismiss(toastId);
      if (res.data.success) {
        toast.success('Database reset successfully. Logging you out...');
        
        // Log out user
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Wait a brief moment for toast, then redirect
        setTimeout(() => {
          window.location.href = '/login/saikiran';
        }, 1500);
      }
    } catch (err) {
      toast.dismiss();
      toast.error(err.response?.data?.message || 'Database reset failed.');
    }
  };

  if (loading) {
    return <LoadingSkeleton type="table" />;
  }

  return (
    <div className="space-y-8 animate-fadeIn text-left max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Portal Settings</h2>
        <p className="text-sm text-slate-400">Configure corporate brand assets, email dispatches, and authentication rules</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Company profile branding */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-700 pb-3">
            <Palette className="h-5 w-5 text-brand-600" />
            <span>Corporate Branding</span>
          </h3>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            
            {/* Logo box */}
            <div className="h-20 w-20 bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center relative overflow-hidden shrink-0">
              {companyLogo ? (
                <img 
                  src={logoFile ? companyLogo : `${API_BASE_URL}${companyLogo}`} 
                  alt="Company Logo" 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <Upload className="h-6 w-6 text-slate-350" />
              )}
            </div>

            {/* Upload details */}
            <div className="space-y-2">
              <label className="inline-flex items-center space-x-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-700 dark:text-white font-semibold text-xs rounded-xl cursor-pointer transition">
                <Upload className="h-4 w-4" />
                <span>Upload New Logo</span>
                <input type="file" accept="image/*" onChange={handleLogoUploadChange} className="hidden" />
              </label>
              <p className="text-[10px] text-slate-450">Supported formats: PNG, JPG, or SVG. Suggested size 200x200px.</p>
            </div>

          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase">Company Name</label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full max-w-md px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
        </div>

        {/* SMTP Mail Dispatch Configurations */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-700 pb-3">
            <Mail className="h-5 w-5 text-brand-600" />
            <span>SMTP Email Settings (For credentials dispatch)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">SMTP Host Address</label>
              <input
                type="text"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.mailtrap.io"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">SMTP Port</label>
              <input
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Username / API Key</label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Password / Token secret</label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              />
            </div>

          </div>
        </div>

        {/* Security Password Policies */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-700 pb-3">
            <ShieldCheck className="h-5 w-5 text-brand-600" />
            <span>Password & Security Policies</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Minimum password length</label>
              <input
                type="number"
                min={6}
                max={32}
                value={passwordLength}
                onChange={(e) => setPasswordLength(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
              />
            </div>

            <div className="space-y-1 flex flex-col justify-end pb-2">
              <button
                type="button"
                onClick={() => setRequireSpecialChar(!requireSpecialChar)}
                className="flex items-center space-x-3 text-sm text-slate-600 dark:text-slate-350 text-left font-medium"
              >
                <input
                  type="checkbox"
                  checked={requireSpecialChar}
                  readOnly
                  className="h-4.5 w-4.5 accent-brand-600 rounded"
                />
                <span>Force inclusion of special character symbols (!, @, #, etc.)</span>
              </button>
            </div>

          </div>
        </div>

        {/* Default Portal theme */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700/50 shadow-sm space-y-5">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 text-sm flex items-center space-x-2 border-b border-slate-50 dark:border-slate-700 pb-3">
            <Palette className="h-5 w-5 text-brand-600" />
            <span>System Themes</span>
          </h3>
          
          <div className="space-y-1 max-w-md">
            <label className="text-xs font-bold text-slate-500 uppercase">Default Appearance</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none"
            >
              <option value="light">Light Theme Mode (Corporate Blue-White)</option>
              <option value="dark">Dark Theme Mode</option>
            </select>
          </div>
        </div>

        {/* Database Maintenance */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-rose-200 dark:border-rose-950/30 shadow-sm space-y-5">
          <h3 className="font-bold text-rose-600 dark:text-rose-400 text-sm flex items-center space-x-2 border-b border-rose-50 dark:border-rose-950/20 pb-3">
            <Database className="h-5 w-5 text-rose-600" />
            <span>Database Maintenance</span>
          </h3>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-950/30 rounded-2xl">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Factory Reset Database</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                Clears all candidate exam results, logs, warning history, custom assessments, and restores the default administrative profiles and question banks to their initial state.
              </p>
            </div>
            
            <button
              type="button"
              onClick={handleResetDatabase}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-500/10 transition flex items-center space-x-2 whitespace-nowrap"
            >
              <Trash2 className="h-4 w-4" />
              <span>Reset Database</span>
            </button>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white font-semibold text-sm rounded-xl shadow-lg shadow-brand-500/20 transition flex items-center space-x-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <span>Save Global Configurations</span>
          </button>
        </div>

      </form>
    </div>
  );
};

export default Settings;
