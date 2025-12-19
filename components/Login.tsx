import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New States for preferences
  const [rememberMe, setRememberMe] = useState(false);
  const [autoLogin, setAutoLogin] = useState(false);

  // Check for saved credentials on mount
  useEffect(() => {
    const savedCreds = localStorage.getItem('nexus_login_pref');
    if (savedCreds) {
      try {
        const { u, p, r, a } = JSON.parse(savedCreds);
        if (r) {
          setUsername(u);
          setPassword(p);
          setRememberMe(true);
          setAutoLogin(a);
          
          // Trigger auto login if enabled
          if (a && u && p) {
            performLogin(u, p, true, a);
          }
        }
      } catch (e) {
        localStorage.removeItem('nexus_login_pref');
      }
    }
  }, []);

  const performLogin = async (u: string, p: string, remember: boolean, auto: boolean) => {
    setLoading(true);
    setError('');
    
    try {
      const user = await api.login(u, p);
      
      // Handle "Remember Me" logic
      if (remember) {
        localStorage.setItem('nexus_login_pref', JSON.stringify({ u, p, r: true, a: auto }));
      } else {
        localStorage.removeItem('nexus_login_pref');
      }

      onLogin(user);
    } catch (err: any) {
      setError(err.message || '登录失败，请重试');
      // If auto login failed, disable it to prevent loop
      if (auto) {
        setAutoLogin(false);
        const currentData = localStorage.getItem('nexus_login_pref');
        if (currentData) {
           const parsed = JSON.parse(currentData);
           localStorage.setItem('nexus_login_pref', JSON.stringify({ ...parsed, a: false }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performLogin(username, password, rememberMe, autoLogin);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1/2 bg-slate-900 z-0"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/20 rounded-full blur-3xl z-0 pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden z-10 animate-scale-in">
        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-indigo-50 text-indigo-600 mb-6 shadow-sm border border-indigo-100">
            <span className="text-3xl">❖</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Nexus 管理系统</h2>
          <p className="text-slate-500 text-sm">请输入您的账号密码登录</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm py-2 px-4 rounded-lg flex items-center gap-2 animate-fade-in">
              <span>⚠️</span> {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 block">账号</label>
            <input 
              type="text" 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none bg-slate-50 focus:bg-white"
              placeholder="admin 或 user"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 block">密码</label>
            <input 
              type="password" 
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none bg-slate-50 focus:bg-white"
              placeholder="••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Preferences Checkboxes */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                checked={rememberMe}
                onChange={e => {
                  setRememberMe(e.target.checked);
                  if (!e.target.checked) setAutoLogin(false); // Disable auto login if remember is unchecked
                }}
              />
              <span className="text-sm text-slate-600">记住密码</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                checked={autoLogin}
                onChange={e => {
                  setAutoLogin(e.target.checked);
                  if (e.target.checked) setRememberMe(true); // Enable remember if auto login is checked
                }}
              />
              <span className="text-sm text-slate-600">自动登录</span>
            </label>
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  登录中...
                </>
              ) : (
                '立即登录'
              )}
            </button>
          </div>

          <div className="text-center">
             <div className="text-xs text-slate-400 mt-4">
                演示账号: admin/admin 或 user/user
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;