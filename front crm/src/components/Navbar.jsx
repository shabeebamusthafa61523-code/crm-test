import React, { useState, useEffect } from 'react';
import { Search, Bell, User, LogOut, Sun, Moon, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import ProfileDrawer from './ProfileDrawer';

const Navbar = ({ isSidebarCollapsed, toggleMobileSidebar }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const location = useLocation();

  const pathName = location.pathname.substring(1);
  const pageTitle = pathName
    ? pathName.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Dashboard';
  
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

  // State for scroll visibility tracking (only show on back scrolling)
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Keep visible at the top of the page
      if (currentScrollY <= 10) {
        setIsVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // Ignore micro-scroll fluctuations
      if (Math.abs(currentScrollY - lastScrollY) < 5) {
        return;
      }

      // Show when scrolling up (back scrolling), hide when scrolling down
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
          role: parsedUser.role?.name || 'Staff'
        });
      } catch (err) {
        console.error("Failed to parse user data", err);
      }
    }
  }, []);

  return (
    <>
      <header className={`fixed top-0 right-0 z-30 h-16 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 transform ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      } ${isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'} left-0`}>
        
        {/* Left Side: Mobile Hamburger & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleMobileSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors lg:hidden cursor-pointer"
            title="Open Menu"
          >
            <Menu size={20} />
          </button>
{/*           
          <h1 className="text-2xl md:text-3xl font-black text-slate-850 dark:text-slate-100 tracking-tight uppercase">
            {pageTitle}
          </h1> */}
        </div>

        {/* Right Actions Wrapper */}
        <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-800/30 p-1 rounded-xl shadow-sm transition-colors">

          {/* Theme Toggle Button */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-all cursor-pointer relative"
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

          {/* Profile Trigger - DYNAMIC DATA (No text label next to the icon) */}
          <div
            onClick={() => setIsProfileOpen(true)}
            className="flex items-center gap-2 p-1 group cursor-pointer"
            title={currentUser.name}
          >
            <div className="relative w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:border-indigo-500/50 group-hover:bg-indigo-500/10 dark:group-hover:bg-indigo-500/20 transition-all shadow-sm overflow-hidden">
              <User size={16} />
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