import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ShoppingCart, 
  FileCheck, 
  Users, 
  FileText, 
  TrendingUp, 
  ShieldAlert 
} from 'lucide-react';

const AccountingLayout = ({ children, activeTab, onTabChange }) => {
  const [user, setUser] = useState(null);
  const [isHR, setIsHR] = useState(false);
  const [isAccountant, setIsAccountant] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const userObj = JSON.parse(savedUser);
      setUser(userObj);

      const currentUserRole = String(userObj.role_id || userObj.roleId || userObj.role || '').toLowerCase().trim();
      const adminOrHR = ['1', '2', 'hr', 'admin'].includes(currentUserRole);

      let designationId = '';
      if (userObj.designationId) {
        designationId = typeof userObj.designationId === 'object' ? userObj.designationId._id : userObj.designationId;
      } else if (userObj.designation_id) {
        designationId = userObj.designation_id;
      }
      
      const hrDesignation = ['1', '6a2f8efea2fe388770a38987'].includes(String(designationId).trim());
      setIsHR(adminOrHR || hrDesignation);

      const accountant = String(designationId).trim() === '6a2f915e2df21dc234018cac';
      setIsAccountant(accountant);
    }
  }, []);

  const allTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, role: ['admin', 'hr', 'accountant'] },
    { id: 'income', label: 'Income', icon: ArrowDownLeft, role: ['admin', 'hr', 'accountant'] },
    { id: 'expenses', label: 'Expenses', icon: ArrowUpRight, role: ['admin', 'hr', 'accountant'] },
    { id: 'purchases', label: 'Purchases', icon: ShoppingCart, role: ['admin', 'hr', 'accountant'] },
    { id: 'invoices', label: 'Invoices', icon: FileCheck, role: ['admin', 'hr', 'accountant'] },
    { id: 'salaries', label: 'Salaries', icon: Users, role: ['admin', 'hr'] },
    { id: 'salaryReports', label: 'Salary Reports', icon: TrendingUp, role: ['admin', 'hr'] },
    { id: 'financialReports', label: 'Financial Reports', icon: FileText, role: ['admin', 'hr', 'accountant'] }
  ];

  const visibleTabs = allTabs.filter(tab => {
    if (tab.role.includes('admin') || tab.role.includes('hr')) {
      if (isHR) return true;
    }
    if (tab.role.includes('accountant')) {
      if (isAccountant) return true;
    }
    return false;
  });

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Double check authorization to view anything
  if (!isHR && !isAccountant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-4 bg-rose-500/10 text-rose-500 rounded-full mb-4">
          <ShieldAlert size={48} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
          Unauthorized Section
        </h2>
        <p className="text-slate-400 text-xs mt-2 max-w-sm">
          This accounting console is locked for security. If you are an employee, please use the "My Payroll" portal link to view your salary sheets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Sleek Sub-Header Tab Bar */}
      <div className="w-full bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md rounded-3xl p-2 shadow-sm overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 min-w-max">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all select-none
                  ${isActive 
                    ? 'text-white bg-indigo-600 shadow-md shadow-indigo-500/20' 
                    : 'text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-lime-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                  }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div 
                    layoutId="activeSubTabIndicator" 
                    className="absolute inset-0 bg-indigo-600 -z-10 rounded-2xl"
                    transition={{ type: 'spring', damping: 20, stiffness: 150 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Routed Content view */}
      <div className="relative min-h-[60vh]">
        {children}
      </div>
    </div>
  );
};

export default AccountingLayout;
