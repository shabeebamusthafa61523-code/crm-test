import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  UserCheck, 
  ListCheck, 
  Users, 
  GraduationCap,
  Settings, 
  LogOut,
  Building,
  TrendingUp
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { 
    icon: Users, 
    label: 'Users', 
    path: '/users', 
    allowedRoles: ['1', '2', 'hr', 'admin'] // Strictly whitelisted roles
  },
  { icon: TrendingUp, label: 'Leads', path: '/leads' },
  { icon: UserCheck, label: 'Attendance', path: '/attendance' },
  { icon: ListCheck, label: 'To-Do', path: '/todo' },
  { icon: Users, label: 'Student Attendance', path: '/student-attendance' },
  { icon: Building, label: 'Departments', path: '/departments' ,allowedRoles: ['1', '2', 'hr', 'admin']},
  // { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = () => {
  const location = useLocation();
  const activePath = location.pathname;

  // Dynamically filters and constructs visibility list based on system profile privileges
 // Dynamically filters and constructs visibility list based on system profile privileges
  const getVisibleMenuItems = () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) return menuItems.filter(item => !item.allowedRoles);

      const userObj = JSON.parse(savedUser);
      
      // FIX: Added userObj.role_id to match your exact backend response payload
      const currentUserRole = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();

      return menuItems.filter(item => {
        if (!item.allowedRoles) return true;
        return item.allowedRoles.includes(currentUserRole);
      });
    } catch (e) {
      console.error("Error reading operator authorization layout paths:", e);
      return menuItems.filter(item => !item.allowedRoles);
    }
  };
  const visibleMenuItems = getVisibleMenuItems();

  return (
    <motion.aside
      className={`
        mt-18 fixed z-50 transition-all duration-500
        /* Mobile: Bottom Center Dock */
        bottom-6 left-1/2 -translate-x-1/2 flex-row py-3 px-6 gap-3 rounded-full 
        /* Desktop: Left Center Dock */
        lg:bottom-auto lg:top-1/2 lg:left-8 lg:-translate-y-1/2 lg:-translate-x-0 lg:flex-col lg:py-8 lg:px-4 lg:gap-5 lg:rounded-[2.5rem]
        
        flex items-center bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-3xl shadow-lg
      `}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
    >
      <div className="flex lg:flex-col gap-3 lg:gap-4">
        {visibleMenuItems.map((item) => (
          <NavItem 
            key={item.path}
            icon={<item.icon size={22} />} 
            label={item.label} 
            to={item.path} 
            active={activePath === item.path} 
          />
        ))}
      </div>

      {/* Visual Separator */}
      <div className="hidden lg:block w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent my-2" />
      <div className="lg:hidden w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1" />

      <NavItem 
        icon={<LogOut size={22} />} 
        label="Logout" 
        to="/login" 
        active={false} 
        isLogout={true}
        onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('user_id');
        }}
      />
    </motion.aside>
  );
};

const NavItem = ({ icon, label, to, active, isLogout, onClick }) => {
  return (
    <Link to={to} onClick={onClick} className="relative group flex items-center justify-center">
      <motion.div
        className={`relative p-3.5 rounded-2xl transition-all duration-500 flex items-center justify-center 
          ${active 
            ? 'text-white bg-indigo-600 shadow-xl shadow-indigo-500/40 ring-1 ring-indigo-200 dark:ring-indigo-950' 
            : isLogout 
              ? 'text-rose-500 hover:bg-rose-500/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-lime-400 hover:bg-indigo-500/10 dark:hover:bg-lime-500/10'
          }`}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
      >
        {icon}
        
        {/* Hover Tooltip - Light & Dark Style */}
        <span className="absolute px-3 py-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-200 text-[10px] font-bold rounded-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 whitespace-nowrap shadow-lg border border-slate-200 dark:border-slate-800 bottom-[calc(100%+20px)] left-1/2 -translate-x-1/2 lg:bottom-auto lg:left-full lg:ml-10 lg:translate-x-0">
          {label}
          <div className="hidden lg:block absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-white/90 dark:bg-slate-900/90 rotate-45 border-l border-b border-slate-200 dark:border-slate-800" />
        </span>
      </motion.div>
      
      {/* Active Indicator Glow */}
      <AnimatePresence>
        {active && (
          <motion.div 
            layoutId="activeGlowSide"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            className="absolute hidden lg:block -left-6 w-2 h-2 bg-lime-400 rounded-full shadow-[0_0_15px_rgba(163,230,53,0.8)]"
          />
        )}
      </AnimatePresence>
    </Link>
  );
};

export default Sidebar;