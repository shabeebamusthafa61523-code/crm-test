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
  TrendingUp,
  BarChart3,
  FileText,
  Sparkles
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', allowedRoles: ['1', '2', 'admin' ],   //allowedDepartments: ['6a3caed51194353cbc8a3686'] 
 },

  {
    icon: LayoutDashboard,
    label: 'HR Dashboard',
    path: '/hr-dashboard',
    allowedDesignations: ['6a2f8efea2fe388770a38987'],
  },
  {
    icon: BarChart3,
    label: 'Lead Dashboard',
    path: '/lead-dashboard',
    // allowedRoles: ['1', '2', '3', 'hr', 'admin'],
    allowedDepartments: ['6a26a7d72a56a1f9c49da8a3', '6a27f394558c220a47fff02e', '6a2f91472df21dc234018cab'],
    allowedDesignations: ['6a27939af292348deb7d0495']
  },
  {
    icon: BarChart3,
    label: 'Marketing Dashboard',
    path: '/marketing-dashboard',
    // allowedRoles: ['1', '2', '3', 'hr', 'admin', 'marketing'],
    allowedDepartments: [ '6a211b6621f80bb8da167efb']
  },

  { 
    icon: Users, 
    label: 'Users', 
    path: '/users', 
    allowedRoles: ['1', '2', 'hr', 'admin'],
    allowedDepartments: ['6a3caed51194353cbc8a3686']
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
    // allowedRoles: ['3'],
    // allowedDepartments: ['6a26a7d72a56a1f9c49da8a3', '6a27f394558c220a47fff02e'],
    allowedDesignations: ['6a27939af292348deb7d0495']
  },
  { 
    icon: TrendingUp, 
    label: 'Lead Counselor', 
    path: '/lead-counselor',
    allowedDesignations: ['6a2f91472df21dc234018cab'], // allowedRoles: ['1', '2', 'hr', 'admin'],
    // allowedDepartments: ['6a27f394558c220a47fff02e']
  },
  {
    icon: BarChart3,
    label: 'Dev Dashboard',
    path: '/developer-dashboard',
    allowedDepartments: ['6a1d5d3ea35c97490f38b383'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  {
    icon: BarChart3,
    label: 'GD Dashboard',
    path: '/graphic-designer-dashboard',
    allowedDesignations: ['6a1e8e6e01a0dae8b2f3b18d'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  {
    icon: FileText,
    label: 'Developer Report',
    path: '/developer-report',
    allowedDesignations: ['6a1e8e2d01a0dae8b2f3b18c'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  {
    icon: FileText,
    label: 'HOD R&D Report',
    path: '/hod-rd-report',
    allowedDesignations: ['6a2f9e086f1c41b0c80a9e21'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  {
    icon: FileText,
    label: 'Graphic Designer Report',
    path: '/graphic-designer-report',
    allowedDesignations: ['6a1e8e6e01a0dae8b2f3b18d'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  {
    icon: FileText,
    label: 'Academic Counselor Report',
    path: '/academic-counselor-report',
    allowedDesignations: ['6a27939af292348deb7d0495'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  // {
  //   icon: BarChart3,
  //   label: 'Counselor Dashboard',
  //   path: '/counselor-dashboard',
  //   allowedDesignations: ['6a27939af292348deb7d0495'],
  //   // allowedRoles: ['1', '2', 'hr', 'admin']
  // },
  {
    icon: LayoutDashboard,
    label: 'Video Dashboard',
    path: '/videographer-dashboard',
    allowedDesignations: ['6a2f912c2df21dc234018caa'],
  },
  {
    icon: FileText,
    label: 'Videographer Report',
    path: '/videographer-report',
    allowedDesignations: ['6a2f912c2df21dc234018caa'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
 
  {
    icon: FileText,
    label: 'HR Shift Report',
    path: '/hr-report',
    allowedDesignations: ['6a2f8efea2fe388770a38987'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  {
    icon: Sparkles,
    label: 'AI Reports',
    path: '/ai-report',
    allowedDesignations: ['6a2f8efea2fe388770a38987'],
    allowedRoles: ['1', '2', 'admin' ],
  },
  {
    icon: FileText,
    label: 'Ops Shift Report',
    path: '/ops-report',
    allowedDesignations: ['6a2f91472df21dc234018cab'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  {
    icon: FileText,
    label: 'Accountant Shift Report',
    path: '/accountant-report',
    allowedDesignations: ['6a2f915e2df21dc234018cac'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  {
    icon: FileText,
    label: 'Marketing Shift Report',
    path: '/marketing-report',
    allowedDesignations: ['6a2f909d2df21dc234018ca8'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
  },
  { icon: UserCheck, label: 'Attendance', path: '/attendance', excludeRoles: ['1', '2', 'hr', 'admin'] },
  { icon: ListCheck, label: 'To-Do', path: '/todo' },
  { icon: Users, label: 'Student Attendance', path: '/student-attendance', allowedRoles: ['1', '2', 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
  { icon: Building, label: 'Departments', path: '/departments', allowedRoles: ['1', '2', 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
  { icon: Users, label: 'Employee Reports', path: '/employee-reports', allowedRoles: ['1', '2', 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
];


// Simple Portal implementation to render the badge safely outside of parent overflow cropping
const PortalTooltip = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const Sidebar = () => {
  const location = useLocation();
  const activePath = location.pathname;
  const [isHovered, setIsHovered] = useState(false);


  const getVisibleMenuItems = () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        return menuItems.filter(item => !item.allowedRoles && !item.allowedDepartments && !item.allowedDesignations);
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

      let currentUserDesignation = '';
      if (userObj.designationId) {
        if (typeof userObj.designationId === 'object' && userObj.designationId._id) {
          currentUserDesignation = String(userObj.designationId._id).trim();
        } else {
          currentUserDesignation = String(userObj.designationId).trim();
        }
      } else if (userObj.designation_id) {
        currentUserDesignation = String(userObj.designation_id).trim();
      }
      
      return menuItems.filter(item => {
        if (item.excludeRoles && item.excludeRoles.includes(currentUserRole)) {
          return false;
        }
        if (!item.allowedRoles && !item.allowedDepartments && !item.allowedDesignations) return true;
        const roleMatch = item.allowedRoles && item.allowedRoles.includes(currentUserRole);
        const deptMatch = item.allowedDepartments && item.allowedDepartments.includes(currentUserDept);
        const designationMatch = item.allowedDesignations && item.allowedDesignations.includes(currentUserDesignation);
        
        const matches = [];
        if (item.allowedRoles) matches.push(roleMatch);
        if (item.allowedDepartments) matches.push(deptMatch);
        if (item.allowedDesignations) matches.push(designationMatch);
        
        return matches.some(m => m === true);
      });
    } catch (e) {
      console.error("Error reading operator authorization layout paths:", e);
      return menuItems.filter(item => !item.allowedRoles && !item.allowedDepartments && !item.allowedDesignations);
    }
  };


  const visibleMenuItems = getVisibleMenuItems();

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed lg:left-0 lg:top-0 lg:bottom-0 lg:w-28 z-[100] flex items-center justify-start pointer-events-none max-lg:contents"
    >
      <motion.aside
        className={`
          pointer-events-auto
          mt-18 fixed z-[100]
          /* Mobile: Bottom Center Dock */
          bottom-6 left-1/2 -translate-x-1/2 flex-row py-3 px-6 gap-3 rounded-full max-w-[92vw]
          /* Desktop: Left Center Dock */
          lg:bottom-auto lg:top-1/2 lg:left-4 lg:-translate-y-1/2 lg:flex-col lg:py-8 lg:px-4 lg:gap-5 lg:rounded-[2.5rem] lg:max-h-[82vh]
          
          flex items-center bg-white/80 dark:bg-slate-900/80 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-3xl shadow-lg
          
          /* Desktop Hover Slide Effect */
          lg:transition-all lg:duration-300 lg:ease-out
          ${isHovered 
            ? 'lg:translate-x-0 lg:opacity-100 lg:scale-100 lg:shadow-2xl lg:shadow-slate-950/20' 
            : 'lg:-translate-x-[75%] lg:opacity-20 lg:scale-95 lg:shadow-none'
          }
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
    </div>
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