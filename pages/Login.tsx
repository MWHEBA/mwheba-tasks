/**
 * Login Page
 * Handles user authentication
 */

import React, { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { useAuthContext } from '../contexts/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login, loading: authLoading, error: authError } = useAuthContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await login({ username, password });
      // Redirect to dashboard on success
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
      <div className="w-full max-w-md px-4">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src="/Logo.png" 
              alt="MWHEBA Creative Agency" 
              className="h-20 w-auto object-contain"
            />
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            تسجيل الدخول
          </h2>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <i className="fa-solid fa-circle-exclamation text-red-600 mt-0.5"></i>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                اسم المستخدم
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={authLoading}
                  className="w-full px-4 py-3 pr-11 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all disabled:bg-slate-50 disabled:text-slate-500 text-sm"
                  placeholder="أدخل اسم المستخدم"
                  autoComplete="username"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <i className="fa-regular fa-user"></i>
                </div>
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={authLoading}
                  className="w-full px-4 py-3 pr-11 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 transition-all disabled:bg-slate-50 disabled:text-slate-500 text-sm"
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <i className="fa-solid fa-lock"></i>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={authLoading}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-all shadow-sm ${
                authLoading
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-brand-600 hover:bg-brand-700 active:scale-[0.98]'
              }`}
            >
              {authLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  جاري تسجيل الدخول...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className="fa-solid fa-right-to-bracket"></i>
                  تسجيل الدخول
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-slate-500">
            جميع الحقوق محفوظة &copy; {new Date().getFullYear()} <span className="font-medium text-brand-700">مؤسسة موهبة للحلول الدعائية</span>
          </p>
        </div>
      </div>
    </div>
  );
}
