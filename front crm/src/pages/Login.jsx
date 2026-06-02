import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ChevronRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setLoginData(prev => ({ ...prev, [name]: value.trim() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      const result = await response.json();

      if (response.ok && result.token) {
        // 1. Save the token
        localStorage.setItem('token', result.token);

        // 2. Extract and Save User ID
        // Try to get ID from result.user first, then fallback to token decoding
        let userId = result.user?.id;

        if (!userId) {
          try {
            const base64Url = result.token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(window.atob(base64));
            userId = payload.id || payload.sub;
          } catch (decodeError) {
            console.error("Token decoding failed:", decodeError);
          }
        }

        // --- CRITICAL FIX: Save the specific 'user_id' key for Attendance ---
        if (userId) {
          localStorage.setItem('user_id', String(userId));
          console.log("✅ User ID saved to storage:", userId);
        }

        // 3. Save full user object for profile/other uses
        localStorage.setItem('user', JSON.stringify(result.user || { id: userId }));

        navigate('/');
      } else {
        alert(result.detail || "Authentication Failed");
      }
    } catch (error) {
      console.error("Login Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0b0c10] relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-lime-500/10 dark:bg-lime-500/5 blur-[120px] rounded-full" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex p-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <ShieldCheck size={40} className="text-indigo-400" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">
            KOD<span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">BRAND</span>
          </h1>
        </div>

        <div className="glass-card p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
    Email
  </label>

  <div className="relative">

    {/* ICON */}
    <Mail
      className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
      ${loginData.email ? "opacity-0" : "opacity-100"}`}
      size={18}
    />

    {/* INPUT */}
    <input
      required
      name="email"
      type="email"
      value={loginData.email}
      onChange={handleChange}
      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-4 pl-12 pr-4 text-slate-900 dark:text-slate-100 focus:border-indigo-500/50 outline-none transition-all"
    />

  </div>
</div>

            <div className="space-y-2">
  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-2">
    Password
  </label>

  <div className="relative">

    {/* LOCK ICON */}
    <Lock
      className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
      ${loginData.password ? "opacity-0" : "opacity-100"}`}
      size={18}
    />

    {/* INPUT */}
    <input
      required
      name="password"
      value={loginData.password}
      onChange={handleChange}
      type={showPassword ? "text" : "password"}
      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-2xl py-4 pl-12 pr-12 text-slate-900 dark:text-slate-100 focus:border-indigo-500/50 outline-none transition-all"
    />

    {/* SHOW / HIDE BUTTON */}
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer"
    >
      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
    </button>

  </div>
</div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={isLoading} type="submit" className="w-full py-5 bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 cursor-pointer">
              {isLoading ? "Verifying..." : "Authorize Access"} 
              {!isLoading && <ChevronRight size={18} />}
            </motion.button>
          </form>
          <div className="mt-8 text-center"><Link to="/register" className="text-slate-500 dark:text-slate-400 text-sm hover:text-indigo-400">Register Staff</Link></div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;