// src/modules/departments/DepartmentsPage.jsx

import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { Plus, Search, Building, Users, Activity, EyeOff, Loader, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { getAllDepartments, getDepartmentById } from '../../services/departmentService';
import StatsCard from '../../components/StatsCard';
import DepartmentCard from './DepartmentCard';

// Lazy-loaded dialog components to minimize initial bundle size
const CreateDepartmentModal = lazy(() => import('./CreateDepartmentModal'));
const EditDepartmentModal = lazy(() => import('./EditDepartmentModal'));
const DeleteDepartmentModal = lazy(() => import('./DeleteDepartmentModal'));
const DepartmentUsersDrawer = lazy(() => import('./DepartmentUsersDrawer'));

export const DepartmentsPage = () => {
  const { id } = useParams();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Search and Tab Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'active' | 'inactive'

  // Modal and Drawer visibility states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Selected item reference for edit/delete/drawer actions
  const [selectedDept, setSelectedDept] = useState(null);

  // Toast notification state
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success'); // 'success' | 'error'

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // Fetch departments data from backend
  const fetchDepartments = useCallback(async () => {
    // Extract parameter ID and strip colons (e.g. ":1" -> "1")
    const cleanId = id && id.startsWith(':') ? id.slice(1) : id;
    
    // Guard against literal colon path variables or placeholder values
    if (id && (!cleanId || cleanId === '1' || cleanId === 'id')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      if (cleanId) {
        const res = await getDepartmentById(cleanId);
        const dept = res.data || res;
        setDepartments(dept ? [dept] : []);
      } else {
        const res = await getAllDepartments();
        // Service unrolls `{ success, message, data }` or rejects
        setDepartments(Array.isArray(res) ? res : res.data || []);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to retrieve departments list');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  // Compute stat card metrics
  const totalCount = departments.length;
  const activeCount = departments.filter(d => d.status === true).length;
  const inactiveCount = departments.filter(d => d.status === false).length;
  const totalMembers = departments.reduce((sum, d) => sum + (d.memberCount || 0), 0);

  // Perform client-side filter based on Search Input & Tabs
  const filteredDepartments = departments.filter(dept => {
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && dept.status === true) ||
      (activeTab === 'inactive' && dept.status === false);

    const term = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !term ||
      dept.name.toLowerCase().includes(term) ||
      dept.code.toLowerCase().includes(term);

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-8 p-1">
      {/* Top Banner and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
            Departments Manager
          </h1>
          <p className="text-sm font-semibold text-slate-400">
            Configure business divisions, view headcounts, and assign management roles.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all self-start md:self-auto"
        >
          <Plus size={18} className="stroke-[2.5px]" />
          <span>New Department</span>
        </motion.button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total Units"
          value={totalCount}
          icon={Building}
          color="indigo"
          loading={loading}
        />
        <StatsCard
          title="Active Units"
          value={activeCount}
          icon={Activity}
          color="emerald"
          loading={loading}
        />
        <StatsCard
          title="Inactive Units"
          value={inactiveCount}
          icon={EyeOff}
          color="rose"
          loading={loading}
        />
        <StatsCard
          title="Total Members"
          value={totalMembers}
          icon={Users}
          color="amber"
          loading={loading}
        />
      </div>

      {/* Filter tabs and search control */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-50/50 dark:bg-slate-900/55 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-md">
        {/* Tabs */}
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-300
                ${activeTab === tab
                  ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-lime-400 shadow-md shadow-black/5 ring-1 ring-slate-200/50 dark:ring-slate-800/50'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm w-full">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search department name or code..."
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200/50 dark:border-slate-800/50 text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Main Grid display area */}
      {loading && departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-3">
          <Loader size={32} className="animate-spin text-indigo-600" />
          <p className="text-sm font-bold">Populating organization grid...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-[2rem] bg-rose-500/10 border border-rose-500/20 text-center max-w-md mx-auto space-y-4">
          <p className="text-sm font-bold text-rose-600 dark:text-rose-400 leading-relaxed">
            {error}
          </p>
          <button
            onClick={fetchDepartments}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg transition-colors"
          >
            <RefreshCw size={14} />
            <span>Try Again</span>
          </button>
        </div>
      ) : filteredDepartments.length === 0 ? (
        <div className="text-center py-16 p-8 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-800 max-w-md mx-auto">
          <Building size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-base font-bold text-slate-700 dark:text-slate-200">
            No Departments Found
          </h3>
          <p className="text-xs font-semibold text-slate-400 mt-1 leading-relaxed">
            {departments.length === 0
              ? 'Get started by clicking "New Department" above.'
              : 'Try adjusting your search criteria or filter tags.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDepartments.map(dept => (
            <DepartmentCard
              key={dept._id}
              department={dept}
              onEdit={(d) => {
                setSelectedDept(d);
                setIsEditOpen(true);
              }}
              onDelete={(d) => {
                setSelectedDept(d);
                setIsDeleteOpen(true);
              }}
              onViewUsers={(d) => {
                setSelectedDept(d);
                setIsDrawerOpen(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Lazy Loaded modals and sliders */}
      <Suspense fallback={null}>
        <CreateDepartmentModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={(msg) => {
            showToast(msg);
            fetchDepartments();
          }}
        />

        <EditDepartmentModal
          isOpen={isEditOpen}
          onClose={() => {
            setIsEditOpen(false);
            setSelectedDept(null);
          }}
          department={selectedDept}
          onSuccess={(msg) => {
            showToast(msg);
            fetchDepartments();
          }}
        />

        <DeleteDepartmentModal
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setSelectedDept(null);
          }}
          department={selectedDept}
          onSuccess={(msg) => {
            showToast(msg);
            fetchDepartments();
          }}
        />

        <DepartmentUsersDrawer
          isOpen={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedDept(null);
          }}
          department={selectedDept}
        />
      </Suspense>

      {/* Toast Notification popup */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-8 right-8 z-[200] px-5 py-3.5 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-2
              ${toastType === 'success'
                ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/10'
                : 'bg-rose-500 border-rose-400 text-white shadow-rose-500/10'
              }
            `}
          >
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DepartmentsPage;
