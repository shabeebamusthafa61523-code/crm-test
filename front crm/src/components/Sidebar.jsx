import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
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
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', allowedRoles: ['1', '2','3', 'hr', 'admin' ,'employee'] 
 },
  {
    icon: LayoutDashboard,
    label: 'Lead Dashboard',
    path: '/lead-dashboard',
    allowedDepartments: ['6a211b6621f80bb8da167efb']
  },

  { 
    icon: Users, 
    label: 'Users', 
    path: '/users', 
    allowedRoles: ['1', '2', 'hr', 'admin'] 
  },
  { 
    icon: TrendingUp, 
    label: 'Leads Directory', 
    path: '/leads',
    allowedDepartments: ['6a211b6621f80bb8da167efb']
  },
  { 
    icon: TrendingUp, 
    label: 'Telecaller Leads', 
    path: '/leads-telecaller',
    allowedRoles: ['3'],
    allowedDepartments: ['6a26a7d72a56a1f9c49da8a3']
  },
  { icon: UserCheck, label: 'Attendance', path: '/attendance' },
  { icon: ListCheck, label: 'To-Do', path: '/todo' },
  { icon: Users, label: 'Student Attendance', path: '/student-attendance' },
  { icon: Building, label: 'Departments', path: '/departments', allowedRoles: ['1', '2', 'hr', 'admin'] },
];


// Simple Portal implementation to render the badge safely outside of parent overflow cropping
const PortalTooltip = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const Sidebar = () => {
  const location = useLocation();
  const activePath = location.pathname;


  const getVisibleMenuItems = () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        return menuItems.filter(item => !item.allowedRoles && !item.allowedDepartments);
      }

      const userObj = JSON.parse(savedUser);
      const currentUserRole = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
      
      let currentUserDept = '';
      if (userObj.departmentId) {
        if (typeof userObj.departmentId === 'object' && userObj.departmentId._id) {
          currentUserDept = String(userObj.departmentId._id).trim();
        } else {
          currentUserDept = String(userObj.departmentId).trim();
        }
      }
      
      return menuItems.filter(item => {
        if (!item.allowedRoles && !item.allowedDepartments) return true;
        const roleMatch = item.allowedRoles && item.allowedRoles.includes(currentUserRole);
        const deptMatch = item.allowedDepartments && item.allowedDepartments.includes(currentUserDept);
        
        if (item.allowedRoles && item.allowedDepartments) {
          return roleMatch || deptMatch;
        }
        if (item.allowedRoles) return roleMatch;
        if (item.allowedDepartments) return deptMatch;
        return true;
      });
    } catch (e) {
      console.error("Error reading operator authorization layout paths:", e);
      return menuItems.filter(item => !item.allowedRoles && !item.allowedDepartments);
    }
  };


  const visibleMenuItems = getVisibleMenuItems();

  return (
    <motion.aside
      className={`
        mt-18 fixed z-50 transition-all duration-500
        /* Mobile: Bottom Center Dock */
        bottom-6 left-1/2 -translate-x-1/2 flex-row py-3 px-6 gap-3 rounded-full max-w-[92vw]
        /* Desktop: Left Center Dock */
        lg:bottom-auto lg:top-1/2 lg:left-8 lg:-translate-y-1/2 lg:-translate-x-0 lg:flex-col lg:py-8 lg:px-4 lg:gap-5 lg:rounded-[2.5rem] lg:max-h-[82vh]
        
        flex items-center bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-3xl shadow-lg
      `}
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
    >

      <div className="flex lg:flex-col gap-3 lg:gap-4 overflow-x-auto lg:overflow-y-auto max-w-full lg:max-h-full scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 px-0.5">

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

      <div className="hidden lg:block w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent my-2 shrink-0" />
      <div className="lg:hidden w-[1px] h-6 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

      <div className="shrink-0">
        <NavItem 
          icon={<LogOut size={22} />} 
          label="Logout" 
          to="/" 
          active={false} 
          isLogout={true}
          onClick={() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('user_id');
          }}
        />
      </div>
    </motion.aside>
  );
};

const NavItem = ({ icon, label, to, active, isLogout, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const itemRef = useRef(null);

  const handleMouseEnter = () => {
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      
      // Calculate coordinates to align perfectly based on screen sizes
      if (window.innerWidth >= 1024) {
        // Desktop positioning: right next to the dock button center vertical line
        setCoords({
          top: rect.top + rect.height / 2,
          left: rect.right + 16,
        });
      } else {
        // Mobile positioning: centered right above the dock button
        setCoords({
          top: rect.top - 12,
          left: rect.left + rect.width / 2,
        });
      }
    }
    setIsHovered(true);
  };

  return (
    <Link 
      to={to} 
      onClick={onClick} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
      ref={itemRef}
      className="relative flex items-center justify-center shrink-0 group select-none"
    >
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
      </motion.div>
      
      {/* Portalled Floating Label Badge to make sure it bypasses all overflow constraints */}
      <AnimatePresence>
        {isHovered && (
          <PortalTooltip>
            <motion.span 
              initial={{ opacity: 0, x: -10, y: '-50%' }}
              animate={{ opacity: 1, x: 0, y: '-50%' }}
              exit={{ opacity: 0, x: -10, y: '-50%' }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
              }}
              className="fixed pointer-events-none z-[9999] px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[11px] font-semibold rounded-lg shadow-md border border-slate-200 dark:border-slate-800 whitespace-nowrap
                /* Align adjustments for responsive layout offsets */
                -translate-y-1/2 -translate-x-0
                max-lg:-translate-x-1/2 max-lg:-translate-y-full"
            >
              {label}
              
              {/* Desktop Side Arrow Pin Indicator */}
              <div className="hidden lg:block absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-white dark:bg-slate-900 rotate-45 border-l border-b border-slate-200 dark:border-slate-800" />
            </motion.span>
          </PortalTooltip>
        )}
      </AnimatePresence>

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
