import React, { useState, useRef, useEffect } from 'react';
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
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', allowedRoles: ['1', '2', 'admin' ],  allowedDepartments: ['6a55c7e8b613a280003481d8'] 
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
    allowedDepartments: ['6a211b6621f80bb8da167efb'],
    // allowedRoles: ['1', '2', 'hr', 'admin'],
  },
  { 
    icon: TrendingUp, 
    label: 'Telecaller Leads', 
    path: '/leads-telecaller',
    // allowedRoles: ['3'],
    // allowedDepartments: ['6a26a7d72a56a1f9c49da8a3', '6a27f394558c220a47fff02e'],
    allowedDesignations: ['6a27939af292348deb7d0495'],
    allowedRoles: ['1', '2', 'hr','admin']
  },
  { 
    icon: TrendingUp, 
    label: 'Lead Counselor', 
    path: '/lead-counselor',
    allowedDesignations: ['6a2f91472df21dc234018cab'],
    // allowedRoles: ['1', '2', 'hr', 'admin']
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
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: '/common-dashboard',
    isCommonDashboardFallback: true
  },
  {
    icon: FileText,
    label: 'Daily Report',
    path: '/basic-report',
    isBasicReportFallback: true
  },
  { icon: UserCheck, label: 'Attendance', path: '/attendance', excludeRoles: ['1', '2', 'hr', 'admin'] },
  { icon: ListCheck, label: 'Task Assign', path: '/todo' },
  { icon: Users, label: 'Student Attendance', path: '/student-attendance', allowedRoles: ['1', '2', 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
  { icon: Building, label: 'Departments', path: '/departments', allowedRoles: ['1', '2', 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
  { icon: Users, label: 'Employee Reports', path: '/employee-reports', allowedRoles: [ 'hr', 'admin'], allowedDepartments: ['6a3caed51194353cbc8a3686'] },
  { icon: Users, label: 'Team Reports', path: '/team-reports', isTeamLeadOnly: true },
];

// Simple Portal implementation to render the badge safely outside of parent overflow cropping
const PortalTooltip = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const Sidebar = ({ isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const activePath = location.pathname;
  const sidebarRef = useRef(null);

  // Click-inside to expand, click-outside to collapse on desktop
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (window.innerWidth < 1024) return; // Desktop only behavior
      if (sidebarRef.current) {
        if (sidebarRef.current.contains(event.target)) {
          setIsCollapsed(prev => !prev);
        } else {
          setIsCollapsed(true);
        }
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsCollapsed]);

  const getVisibleMenuItems = () => {
    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        return menuItems.filter(item => !item.allowedRoles && !item.allowedDepartments && !item.allowedDesignations);
      }

      const userObj = JSON.parse(savedUser);
      const currentUserRole = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
      
      const deptName = userObj.department || userObj.departmentId?.name || '';
      const isNonOperational = String(deptName).toLowerCase().trim() === 'non-operational';
      if (isNonOperational) {
        return menuItems.filter(item => item.label === 'Employee Reports' || item.label === 'Dashboard');
      }

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
      
      const visible = menuItems.filter(item => {
        if (item.excludeRoles && item.excludeRoles.includes(currentUserRole)) {
          return false;
        }
        // Show Team Reports page only for department team leads
        if (item.isTeamLeadOnly) {
          return !!userObj.isTeamLead;
        }
        if (item.isCommonDashboardFallback || item.isBasicReportFallback) {
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

      // Fallback dashboard: if user has no other dashboard in visible items
      const hasOtherDashboard = visible.some(item => item.label.toLowerCase().includes('dashboard'));
      if (!hasOtherDashboard) {
        const fallbackDashboard = menuItems.find(item => item.isCommonDashboardFallback);
        if (fallbackDashboard) visible.unshift(fallbackDashboard);
      }

      // Fallback report: if user has no other report page in visible items
      const hasOtherReport = visible.some(item => item.label.toLowerCase().includes('report') && item.label !== 'Employee Reports' && item.label !== 'Team Reports');
      if (!hasOtherReport) {
        const fallbackReport = menuItems.find(item => item.isBasicReportFallback);
        if (fallbackReport) {
          // Insert after Dashboard or at correct position
          visible.push(fallbackReport);
        }
      }

      return visible;
    } catch (e) {
      console.error("Error reading operator authorization layout paths:", e);
      return menuItems.filter(item => !item.allowedRoles && !item.allowedDepartments && !item.allowedDesignations);
    }
  };

  const visibleMenuItems = getVisibleMenuItems();

  return (
    <>
      {/* 1. Desktop Sidebar */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 bottom-0 left-0 z-40 hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Logo header */}
        <div className="h-16 flex items-center px-5  shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 w-full justify-center lg:justify-start">
            {!isCollapsed ? (
              <img src="/logo3.png" alt="StaffHQ Logo" className="h-8 w-auto object-contain" />
            ) : (
              <img src="/logo2.png" alt="StaffHQ Logo Icon" className="h-8 w-8 object-contain shrink-0" />
            )}
          </div>
        </div>

        {/* Menu Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleMenuItems.map((item) => (
            <NavItem 
              key={item.path}
              icon={<item.icon size={20} />} 
              label={item.label} 
              to={item.path} 
              active={activePath === item.path} 
              isCollapsed={isCollapsed}
            />
          ))}
        </div>

        {/* Logout (Bottom-aligned) */}
        <div className="p-3.5 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <NavItem 
            icon={<LogOut size={20} />} 
            label="Logout" 
            to="/" 
            active={false} 
            isLogout={true}
            isCollapsed={isCollapsed}
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('user_id');
            }}
          />
        </div>
      </aside>

      {/* 2. Mobile Sidebar Slide-over Backdrop */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* 3. Mobile Sidebar Slide-over Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col transition-transform duration-300 lg:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <img src="/logo3.png" alt="StaffHQ Logo" className="h-8 w-auto object-contain" />
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {visibleMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                activePath === item.path
                  ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 shrink-0">
          <Link
            to="/"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('user_id');
              setIsMobileOpen(false);
            }}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all font-medium"
          >
            <LogOut size={20} className="shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </Link>
        </div>
      </aside>
    </>
  );
};

const NavItem = ({ icon, label, to, active, isLogout, isCollapsed, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const itemRef = useRef(null);

  const handleMouseEnter = () => {
    if (itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 12,
      });
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
      className="relative flex items-center justify-start shrink-0 group select-none w-full"
    >
      <div
        className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 
          ${active 
            ? 'text-white bg-indigo-600 shadow-md shadow-indigo-500/15' 
            : isLogout 
              ? 'text-rose-500 hover:bg-rose-500/10'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50'
          }`}
      >
        <span className="flex items-center justify-center shrink-0">
          {icon}
        </span>
        <span className={`text-sm font-medium transition-all duration-200 whitespace-nowrap overflow-hidden ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'}`}>
          {label}
        </span>
      </div>
      
      {/* Portalled Floating Label Badge to make sure it bypasses all overflow constraints */}
      <AnimatePresence>
        {isHovered && isCollapsed && (
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
              className="fixed pointer-events-none z-[9999] px-3 py-1.5 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-[11px] font-semibold rounded-lg shadow-md border border-slate-200 dark:border-slate-800 whitespace-nowrap -translate-y-1/2"
            >
              {label}
              
              {/* Desktop Side Arrow Pin Indicator */}
              <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-1.5 h-1.5 bg-white dark:bg-slate-900 rotate-45 border-l border-b border-slate-200 dark:border-slate-800" />
            </motion.span>
          </PortalTooltip>
        )}
      </AnimatePresence>
    </Link>
  );
};

export default Sidebar;