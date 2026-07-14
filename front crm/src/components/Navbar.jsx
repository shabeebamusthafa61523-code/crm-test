import React, { useState, useEffect } from 'react';
import { Search, Bell, User, LogOut, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import ProfileDrawer from './ProfileDrawer';
import NotificationPopover from './NotificationPopover';

const Navbar = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 1. Keep visible at the top of the page
      if (currentScrollY <= 10) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // 2. Ignore micro-scroll fluctuations
      if (Math.abs(currentScrollY - lastScrollY) < 5) {
        return;
      }

      // 3. Show when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);
  
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // State for the logged-in user
  const [currentUser, setCurrentUser] = useState({
    name: 'Guest',
    role: 'User'
  });

  useEffect(() => {
    // Pull user data stored during login
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser({
          name: parsedUser.name || 'User',
          // Assuming your role object has a name, otherwise default to "Staff"
          role: parsedUser.role?.name || 'Staff'
        });
      } catch (err) {
        console.error("Failed to parse user data", err);
      }
    }
  }, []);

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-40 px-4 md:px-8 py-4 pointer-events-none transition-all duration-300 ease-out transform ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
        <div className="mx-auto max-w-[1600px] flex items-center justify-between gap-4 pointer-events-auto bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 p-2 rounded-3xl shadow-lg transition-colors">

          {/* 1. Search Bar */}
          {/* <div className="hidden md:flex items-center bg-slate-900/40 backdrop-blur-2xl border border-white/10 px-4 py-2.5 rounded-2xl gap-3 focus-within:ring-2 ring-indigo-500/40 transition-all shadow-2xl">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Search dashboard..." 
              className="bg-transparent border-none focus:outline-none text-sm text-white w-48 lg:w-64 placeholder:text-slate-500"
            />
          </div> */}

          {/* 2. Center Logo */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-lime-400/20 blur-xl rounded-full group-hover:from-indigo-500/40 group-hover:to-lime-400/40 transition-all duration-500" />
              <img
                src="/logo3.png"
                alt="StaffHQ Logo"
                className="relative w-26 md:w-32 h-auto object-contain transition-transform group-hover:scale-105"
              />
            </div>
          </motion.div>

          {/* 3. Right Actions Wrapper */}
          <div className="flex items-center gap-2 bg-white/70 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-800/50 p-1.5 rounded-2xl shadow-sm transition-colors">

            {/* Theme Toggle Button */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer relative"
              title="Toggle theme"
            >
              <motion.div
                initial={false}
                animate={{ rotate: isDark ? 180 : 0, scale: isDark ? 0.95 : 1 }}
                transition={{ duration: 0.3 }}
              >
                {isDark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
              </motion.div>
            </button>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1"></div>

            {/* Profile Trigger - DYNAMIC DATA */}
            <div
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 pl-1 pr-2 py-1 group cursor-pointer"
            >
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-none">
                  {currentUser.name}
                </p>
                <p className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium tracking-widest mt-1 uppercase leading-none">
                  {currentUser.role}
                </p>
              </div>
              <div className="relative w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-500/20 transition-all shadow-sm overflow-hidden">
                {/* Optional: Add profile image logic here if you have image_url in DB */}
                <User size={18} />
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Profile Sidebar */}
      <ProfileDrawer
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={currentUser} // Passing dynamic user to drawer
      />
    </>
  );
};

export default Navbar;