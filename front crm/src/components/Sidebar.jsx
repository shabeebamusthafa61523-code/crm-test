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
  ChevronRight
} from 'lucide-react';

const iconMap = {
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
};

// Simple Portal implementation to render the badge safely outside of parent overflow cropping
const PortalTooltip = ({ children }) => {
  return ReactDOM.createPortal(children, document.body);
};

const Sidebar = () => {
  const location = useLocation();
  const activePath = location.pathname;
  const [isOpen, setIsOpen] = useState(true);
  const [visibleMenuItems, setVisibleMenuItems] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchSidebar = async () => {
      try {
        const rawToken = localStorage.getItem('token');
        if (!rawToken) {
          setVisibleMenuItems([]);
          return;
        }
        const cleanToken = rawToken.replace(/"/g, '');
        const authHeader = cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}`;

        const API_BASE = import.meta.env.VITE_API_URL;
        const res = await fetch(`${API_BASE}/v1/users/sidebar`, {
          headers: { 'Authorization': authHeader }
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            setVisibleMenuItems(json.data);
          }
        }
      } catch (err) {
        console.error("Error loading dynamic sidebar:", err);
      }
    };
    fetchSidebar();
  }, [token, location.pathname]);

  return (
    <div
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
          
          /* Desktop Slide Effect */
          lg:transition-all lg:duration-300 lg:ease-out
          ${isOpen 
            ? 'lg:translate-x-0 lg:opacity-100 lg:scale-100 lg:shadow-2xl lg:shadow-slate-950/20' 
            : 'lg:-translate-x-[75%] lg:opacity-30 lg:hover:opacity-100 lg:scale-95'
          }
        `}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      >

      <div className="flex lg:flex-col gap-3 lg:gap-4 overflow-x-auto lg:overflow-y-auto max-w-full lg:max-h-full scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden py-0.5 px-0.5">
        {visibleMenuItems.map((item) => {
          const IconComponent = iconMap[item.icon] || LayoutDashboard;
          return (
            <NavItem 
              key={item.path}
              icon={<IconComponent size={22} />} 
              label={item.label} 
              to={item.path} 
              active={activePath === item.path} 
            />
          );
        })}
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

      {/* Sidebar Toggle Arrow Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-50 items-center justify-center w-6 h-6 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 hover:border-slate-400 dark:hover:border-slate-500 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full shadow-md transition-all shrink-0 cursor-pointer active:scale-95 hover:scale-105"
      >
        {isOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

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
        ? 'text-rose-500 group-hover:bg-rose-500/10'
        : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 group-hover:bg-slate-100 dark:group-hover:bg-slate-800/50'
    }`}
  whileHover={active ? {} : { scale: 1.05 }} // Disables the Framer Motion pop effect if active
  whileTap={active ? {} : { scale: 0.95 }}   // Disables the Framer Motion click effect if active
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