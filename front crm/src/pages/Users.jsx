import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Edit3, Trash2, Eye, X, Mail, Phone, 
  Briefcase, Folder, UserCheck, ShieldAlert, Image as ImageIcon,
  Loader2, User, ChevronRight, CheckCircle2, AlertTriangle, Shield
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
const API_BASE = import.meta.env.VITE_API_URL;
const ROLES = [
  { id: "1", name: "hr" },
  { id: "2", name: "admin" },
  { id: "3", name: "employee" }
];

const STATUS_META = {
  active: { label: 'Active', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
  inactive: { label: 'Inactive', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400', dot: 'bg-amber-500' },
  blocked: { label: 'Blocked', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400', dot: 'bg-rose-500' }
};

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // all, active, inactive, blocked
  // Ensure it is initialized like this inside your component:
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteUserConfirm, setDeleteUserConfirm] = useState({ isOpen: false, id: null, name: '' });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const { showToast } = useToast();
  const [imgErrors, setImgErrors] = useState({});

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);


  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      // Appended roles parameter to query only explicit structural system role IDs
      const res = await fetch(`${API_BASE}/v1/users?roles=1,2,3`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      
      let incomingUsers = [];
      if (data.success && Array.isArray(data.data)) {
        incomingUsers = data.data;
      } else if (Array.isArray(data)) {
        incomingUsers = data;
      }

      // Strict structural filtering: ensures only matching target IDs (1, 2, 3) enter UI state
      const targetRolesOnly = incomingUsers.filter(user => {
        const userRoleId = String(user.roleId || user.role || '');
        return ['1', '2', '3'].includes(userRoleId) || ['hr', 'admin', 'employee'].includes(userRoleId.toLowerCase());
      });

      setUsers(targetRolesOnly);
    } catch (e) {
      console.error("Failed to fetch users:", e);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchDesignations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/designations`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setDesignations(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error("Failed to fetch designations:", e);
      setDesignations([]);
    }
  }, [getAuthHeaders]);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/departments?status=true`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      setDepartments(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      console.error("Failed to fetch departments:", e);
      setDepartments([]);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchUsers();
    fetchDesignations();
    fetchDepartments();
  }, [fetchUsers, fetchDesignations, fetchDepartments]);

  const handleDesignationCreated = useCallback((designation) => {
    setDesignations(prev => {
      const exists = prev.some(item => String(item.id) === String(designation.id));
      return exists ? prev : [...prev, designation].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const handleDesignationUpdated = useCallback((designation) => {
    setDesignations(prev => prev.map(item => String(item.id) === String(designation.id) ? designation : item).sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  const handleDesignationDeleted = useCallback((id) => {
    setDesignations(prev => prev.filter(item => String(item.id) !== String(id)));
  }, []);

  const designationMap = useMemo(() => {
    return new Map(designations.map(designation => [String(designation.id), designation.name]));
  }, [designations]);

  const getDesignationName = useCallback((user) => {
    const id = user.designationId || user.designation;
    return user.designationName || designationMap.get(String(id)) || user.designation || 'General Staff';
  }, [designationMap]);

  const departmentMap = useMemo(() => {
    return new Map(departments.map(department => [
      String(department.id || department._id),
      department.name
    ]));
  }, [departments]);

  const getDepartmentName = useCallback((user) => {
    const departmentId = user.departmentId?._id || user.departmentId || user.department;
    return user.departmentId?.name || departmentMap.get(String(departmentId)) || user.departmentName || user.department || 'Unassigned';
  }, [departmentMap]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      all: users.length,
      active: users.filter(u => (u.status || 'active') === 'active').length,
      inactive: users.filter(u => (u.status || 'active') === 'inactive').length,
      blocked: users.filter(u => (u.status || 'active') === 'blocked').length
    };
  }, [users]);

  // Filtered & searched users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Tab filter
      if (activeTab !== 'all' && (user.status || 'active') !== activeTab) {
        return false;
      }
      // Search query filter
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.employeeId?.toLowerCase().includes(query) ||
      getDesignationName(user).toLowerCase().includes(query) ||
      getDepartmentName(user).toLowerCase().includes(query)
    );
  });
}, [users, activeTab, searchQuery, getDesignationName, getDepartmentName]);

const ITEMS_PER_PAGE = 10;
const [currentPage, setCurrentPage] = useState(1);

// Reset to page 1 whenever filter changes
React.useEffect(() => { setCurrentPage(1); }, [activeTab, searchQuery]);

const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
const pagedUsers = filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDeleteUser = (id, name) => {
    setDeleteUserConfirm({ isOpen: true, id, name });
  };

  const handleConfirmDeleteUser = async () => {
    const { id, name } = deleteUserConfirm;
    setDeleteUserConfirm({ isOpen: false, id: null, name: '' });
    try {
      const res = await fetch(`${API_BASE}/v1/users/delete/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (res.ok || data.success) {
        setUsers(prev => prev.filter(u => u.id !== id && u._id !== id));
        showToast('Employee records purged successfully.', 'success');
      } else {
        showToast(data.message || 'Deletion failed.', 'error');
      }
    } catch (e) {
      console.error("Deletion failed:", e);
      showToast('Network or server error during deletion.', 'error');
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setIsEditOpen(true);
  };

  const handleViewClick = (user) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-5">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-2">
          <div>
            {/* <div className="flex items-center gap-3 mb-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Nexus Staff Portal</span>
            </div> */}
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none">
              EMPLOYEE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-lime-400">LIST</span>
            </h1>
          </div>
          
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 dark:bg-slate-900 text-white dark:text-slate-100 border border-transparent dark:border-slate-800 shadow-lg hover:shadow-indigo-500/20 dark:hover:shadow-none rounded-full font-bold text-[12px] uppercase tracking-wider transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-indigo-700 dark:bg-lime-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Plus size={16} className="relative z-10" /> 
            <span className="relative z-10">Add Employee</span>
          </button>
        </header>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 py-1">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2">
            {['all', 'active', 'inactive', 'blocked'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                  activeTab === tab 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 dark:bg-slate-800 dark:border-slate-700 dark:shadow-none' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/40 dark:hover:bg-slate-800/80 dark:text-slate-400'
                }`}
              >
                <span>{tab}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  activeTab === tab ? 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative max-w-md w-full">
            <input 
              type="text" 
              placeholder="Search users..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800/80 py-3.5 pl-4 pr-4 rounded-xl text-sm font-medium focus:border-indigo-500/50 dark:focus:border-indigo-400/50 outline-none transition-all duration-300"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Employees Table Grid */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" size={40} />
            <p className="text-xs uppercase tracking-[0.2em] font-black text-slate-400 animate-pulse">Retrieving Core Intelligence</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center shadow-sm">
            <AlertTriangle className="mx-auto text-amber-500 mb-4 animate-bounce" size={40} />
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">No Records Discovered</h3>
            <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">No employees matched your status tabs or query criteria. Modify filters or initiate a new employee onboarding pipeline.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80">
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Employee Details</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Contact</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Role / Designation</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Department / Manager</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {pagedUsers.map((user) => {
                    const statusKey = user.status || (user.isActive ? 'active' : 'inactive');
                    const meta = STATUS_META[statusKey] || STATUS_META.active;
                    return (
                      <tr 
                        key={user.id || user._id}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-all duration-200 group"
                      >
                        {/* Profile & Name */}
                        <td className="py-4.5 px-6">
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              {(user.avatar || user.profile_image) && !imgErrors[user._id || user.id] ? (
                                <img 
                                  src={user.avatar || user.profile_image} 
                                  alt={user.name} 
                                  className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                                  onError={() => {
                                    setImgErrors(prev => ({ ...prev, [user._id || user.id]: true }));
                                  }}
                                />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-white-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shadow-sm">
                                  <User size={18} />
                                </div>
                              )}
                              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${meta.dot}`} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                {user.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase truncate max-w-[180px]">
                                {user.employeeId || 'No ID'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Contact Info */}
                        <td className="py-4.5 px-6 text-xs text-slate-500 dark:text-slate-400 font-medium space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Mail size={12} className="text-slate-400" />
                            <span className="truncate max-w-[160px]">{user.email}</span>
                          </div>
                          {user.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone size={12} className="text-slate-400" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                        </td>

                        {/* Designation / Role */}
                        <td className="py-4.5 px-6 text-xs space-y-1">
  <div className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1">
    <Briefcase size={12} className="text-slate-400" />
    <span>
      {getDesignationName(user)}
    </span>
  </div>
  <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded inline-block">
    {/* Maps role IDs (like 1, 2, 3) to their string name ('hr', 'admin', 'employee') */}
    {ROLES.find(r => String(r.id) === String(user.roleId || user.role))?.name || user.role || 'employee'}
  </span>
</td>

                        {/* Department / Manager */}
                        <td className="py-4.5 px-6 text-xs space-y-1">
                          <div className="font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Folder size={12} className="text-slate-400" />
                            <span>{getDepartmentName(user)}</span>
                          </div>
                          {user.reportingManager && (
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                              Manager: {user.reportingManager}
                            </p>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-4.5 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${meta.color}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                            {statusKey}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-4.5 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleViewClick(user)}
                              className="p-2.5 bg-slate-100 hover:bg-indigo-500 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-90"
                              title="View dossier"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              onClick={() => handleEditClick(user)}
                              className="p-2.5 bg-slate-100 hover:bg-amber-500 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-90"
                              title="Edit records"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id || user._id, user.name)}
                              className="p-2.5 bg-slate-100 hover:bg-rose-500 hover:text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl transition-all duration-300 cursor-pointer shadow-sm active:scale-90"
                              title="Delete file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredUsers.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-2 py-3">
            <p className="text-xs text-slate-400 font-semibold">
              Showing {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUsers.length)}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} employees
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  p === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-xs">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 text-xs font-bold rounded-lg border transition-all ${
                        currentPage === p
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600'
                      }`}
                    >
                      {p}
                    </button>
                  )
                )
              }
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* CREATE & EDIT & VIEW MODALS */}
      <AnimatePresence>
        {isCreateOpen && (
          <CreateModal 
            onClose={() => setIsCreateOpen(false)} 
            refresh={fetchUsers} 
            getAuthHeaders={getAuthHeaders} 
            designations={designations}
            onDesignationCreated={handleDesignationCreated}
            onDesignationUpdated={handleDesignationUpdated}
            onDesignationDeleted={handleDesignationDeleted}
            departments={departments}
            showToast={showToast}
          />
        )}
        {isEditOpen && selectedUser && (
          <EditModal 
            user={selectedUser}
            onClose={() => {
              setIsEditOpen(false);
              setSelectedUser(null);
            }} 
            refresh={fetchUsers} 
            getAuthHeaders={getAuthHeaders} 
            designations={designations}
            onDesignationCreated={handleDesignationCreated}
            onDesignationUpdated={handleDesignationUpdated}
            onDesignationDeleted={handleDesignationDeleted}
            departments={departments}
            showToast={showToast}
          />
        )}
        {isViewOpen && selectedUser && (
          <ViewModal 
            user={selectedUser}
            getDesignationName={getDesignationName}
            getDepartmentName={getDepartmentName}
            onClose={() => {
              setIsViewOpen(false);
              setSelectedUser(null);
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={deleteUserConfirm.isOpen}
        onClose={() => setDeleteUserConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={handleConfirmDeleteUser}
        title="Delete Employee?"
        message={`Are you absolutely sure you want to delete employee "${deleteUserConfirm.name}"? This action is permanent and cannot be undone.`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};

const ManageDesignationsModal = ({ onClose, designations, getAuthHeaders, onDesignationUpdated, onDesignationDeleted, showToast }) => {
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteDesignationConfirm, setDeleteDesignationConfirm] = useState({ isOpen: false, id: null, name: '' });

  const handleEditStart = (id, currentName) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const handleEditSave = async (id) => {
    if (!editName.trim()) return;
    setSavingId(id);
    try {
      const res = await fetch(`${API_BASE}/v1/designations/${id}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: editName.trim() })
      });
      const data = await res.json();

      if (!res.ok && !data.success) {
        showToast(data.message || data.error || 'Failed to update designation.', 'error');
        return;
      }

      onDesignationUpdated(data.data);
      setEditingId(null);
      showToast('Designation updated successfully.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error updating designation.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = (id, name) => {
    setDeleteDesignationConfirm({ isOpen: true, id, name });
  };

  const handleConfirmDeleteDesignation = async () => {
    const { id, name } = deleteDesignationConfirm;
    setDeleteDesignationConfirm({ isOpen: false, id: null, name: '' });
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/v1/designations/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (!res.ok && !data.success) {
        showToast(data.message || data.error || 'Failed to delete designation.', 'error');
        return;
      }

      onDesignationDeleted(id);
      showToast('Designation deleted successfully.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error deleting designation.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-16 bg-slate-950/40 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-xl max-h-[80vh] flex flex-col"
      >
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Manage Designations</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg text-slate-500">
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {designations.map(d => (
            <div key={d.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/40 gap-2">
              {editingId === d.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              ) : (
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{d.name}</span>
              )}

              <div className="flex gap-1.5 shrink-0">
                {editingId === d.id ? (
                  <>
                    <button
                      onClick={() => handleEditSave(d.id)}
                      disabled={savingId === d.id}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold"
                    >
                      {savingId === d.id ? '...' : 'Save'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditStart(d.id, d.name)}
                      className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg"
                      title="Edit Name"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id, d.name)}
                      disabled={deletingId === d.id}
                      className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {designations.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No designations available.</p>
          )}
        </div>

        <ConfirmModal
          isOpen={deleteDesignationConfirm.isOpen}
          onClose={() => setDeleteDesignationConfirm({ isOpen: false, id: null, name: '' })}
          onConfirm={handleConfirmDeleteDesignation}
          title="Delete Designation"
          message={`Are you sure you want to delete the designation "${deleteDesignationConfirm.name}"?`}
          confirmText="Yes, Delete"
          cancelText="Cancel"
          type="danger"
        />
      </motion.div>
    </div>
  );
};

const DesignationSelect = ({ 
  value, 
  onChange, 
  designations, 
  getAuthHeaders, 
  onDesignationCreated, 
  onDesignationUpdated,
  onDesignationDeleted,
  showToast 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);

  const handleAddDesignation = async () => {
    const name = window.prompt('Enter designation name');
    if (!name?.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch(`${API_BASE}/v1/designations`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: name.trim() })
      });
      const data = await res.json();

      if (!res.ok && !data.success) {
        showToast(data.message || data.error || 'Failed to add designation.', 'error');
        return;
      }

      const designation = data.data;
      onDesignationCreated(designation);
      onChange(String(designation.id));
      showToast('Designation added successfully.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Error creating designation.', 'error');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <>
      <div className="flex gap-2 w-full items-center">
        <div className="flex-1">
          <select required name="designation" className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select Designation</option>
            {designations.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleAddDesignation}
          disabled={isAdding}
          title="Add designation"
          className="shrink-0 h-11 w-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-60"
        >
          {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        </button>
        <button
          type="button"
          onClick={() => setIsManageOpen(true)}
          title="Edit/Delete designations"
          className="shrink-0 h-11 w-11 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <Edit3 size={16} />
        </button>
      </div>

      <AnimatePresence>
        {isManageOpen && (
          <ManageDesignationsModal
            onClose={() => setIsManageOpen(false)}
            designations={designations}
            getAuthHeaders={getAuthHeaders}
            onDesignationUpdated={onDesignationUpdated}
            onDesignationDeleted={onDesignationDeleted}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// --- CREATE MODAL ---
const CreateModal = ({ onClose, refresh, getAuthHeaders, designations, onDesignationCreated, onDesignationUpdated, onDesignationDeleted, departments, showToast }) => {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const [form, setForm] = useState({
    employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    name: '',
    phone: '',
    email: '',
    designation: '',
    departmentId: '',
    reportingManager: '',
    status: 'active',
    role: 'employee',
    avatar: null,
    joining_date: new Date().toISOString().split('T')[0],
    salary: '',
    address: '',
    identityType: 'aadhaar',
    identityNumber: ''
  });
  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, avatar: file });
      setPreview(URL.createObjectURL(file));
    }
  };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);

  // Phone number validation
  if (!/^\d{10}$/.test(form.phone || '')) {
    showToast('Phone number must be exactly 10 digits.', 'warning');
    setIsSubmitting(false);
    return;
  }

  try {
    const fd = new FormData();

    // 1. Extract name and phone from the active form state
    const employeeName = form.name || ""; 
    const employeePhone = form.phone || "";

    // 2. Generate custom formula: FIRST 3 LETTERS (UPPERCASE) + LAST 3 DIGITS
    const namePart = employeeName.trim().slice(0, 3).toUpperCase();
    const phonePart = employeePhone.trim().slice(-3) || "123"; // Fallback if phone is empty
    
    const dynamicPassword = `${namePart}${phonePart}`; // e.g., "ABC454"

    // 3. Append your standard state keys to FormData
    Object.keys(form).forEach(key => {
      if (key === 'avatar') {
        if (form.avatar) fd.append('profileImage', form.avatar);
      } else {
        fd.append(key, form[key]);
      }
    });
    
    // 4. Inject the dynamically calculated password instead of a static string
    fd.append('password', dynamicPassword);

    // 5. Send payload to your backend API
    const res = await fetch(`${API_BASE}/v1/users/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: fd
    });

    const data = await res.json();
    if (res.ok || data.success) {
      // 💡 Displaying the generated password in the success toast so HR can copy it instantly
      showToast(`Employee created! Temp Password: ${dynamicPassword}`, 'success');
      await refresh();
      onClose();
    } else {
      showToast(data.message || data.error || 'Failed to onboard employee.', 'error');
    }
  } catch (e) {
    console.error(e);
    showToast('Error connecting to the onboard api.', 'error');
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex justify-center items-start overflow-y-auto pt-16 pb-16 p-4"
    >
      <motion.div 
        initial={{ y: -50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: -50, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl p-8 md:p-10 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={20}/></button>
        
        <header className="mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">ADD <span className="text-indigo-600 dark:text-indigo-400">EMPLOYEE FILE</span></h2>
          {/* <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Initiating Onboarding Protocols</p> */}
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Avatar Upload Container */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/40">
            <div className="relative group w-24 h-24 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900 hover:border-indigo-500 transition-all cursor-pointer">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarChange} />
              {preview ? (
                <img src={preview} className="h-full w-full object-cover" alt="avatar preview" />
              ) : (
                <div className="text-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <ImageIcon className="mx-auto" size={24} />
                  <span className="text-[8px] font-bold uppercase tracking-widest mt-1 block">IMAGE</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Profile Image File</h4>
              <p className="text-xs text-slate-500 mt-1">Provide a high-fidelity JPG, PNG, or WEBP  asset. Max size: 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Employee ID</label>
              <input required name="employeeId" className="w-full" value={form.employeeId} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Full Name</label>
              <input required name="name" className="w-full" placeholder="NAME" value={form.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Phone Number</label>
              <input
                required
                name="phone"
                type="tel"
                maxLength={10}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition focus:ring-1 ${
                  form.phone && form.phone.length !== 10
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                }`}
                placeholder="10-digit number"
                value={form.phone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm(prev => ({ ...prev, phone: digits }));
                }}
              />
              {form.phone && form.phone.length !== 10 && (
                <p className="text-[10px] text-red-500 ml-1">Must be exactly 10 digits.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Corporate Email</label>
              <input required type="email" name="email" className="w-full" placeholder="EMAIL" value={form.email} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Corporate Designation</label>
              <DesignationSelect
                value={form.designation}
                onChange={(designation) => setForm(prev => ({ ...prev, designation }))}
                designations={designations}
                getAuthHeaders={getAuthHeaders}
                onDesignationCreated={onDesignationCreated}
                onDesignationUpdated={onDesignationUpdated}
                onDesignationDeleted={onDesignationDeleted}
                showToast={showToast}
              />
            </div>
            <div className="space-y-2">
  <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">
    Department Assignment
  </label>
  
  <select 
    required 
    name="departmentId" 
    value={form.departmentId} 
    onChange={handleInputChange}
    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 cursor-pointer"
  >
    <option value="" disabled>
      SELECT DEPARTMENT
    </option>
    
    {departments.map((dept) => (
      <option 
        key={dept._id || dept.id} 
        value={dept._id || dept.id}
        className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
      >
        {dept.name.toUpperCase()}
      </option>
    ))}
  </select>
</div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Reporting Manager</label>
              <input required name="reportingManager" className="w-full" placeholder="MANAGER" value={form.reportingManager} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">System Status</label>
              <select name="status" className="w-full" value={form.status} onChange={handleInputChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
             <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">System Role</label>
              <select name="role" className="w-full" value={form.role} onChange={handleInputChange}>
                {ROLES.map(r => (
                  <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Monthly Salary</label>
              <input name="salary" type="number" className="w-full" placeholder="SALARY" value={form.salary} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Joining Date</label>
              <input required name="joining_date" type="date" className="w-full" value={form.joining_date} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Identity Type</label>
              <select name="identityType" className="w-full" value={form.identityType} onChange={handleInputChange}>
                <option value="aadhaar">Aadhaar</option>
                <option value="pan">PAN</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">ID Number</label>
              <input required name="identityNumber" className="w-full" placeholder="ID NUMBER" value={form.identityNumber} onChange={handleInputChange} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Residential Address</label>
              <textarea name="address" rows={2} className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500/50 outline-none transition" placeholder="ADDRESS" value={form.address} onChange={handleInputChange} />
            </div>
          </div>

          <button 
            disabled={isSubmitting} 
            className="w-full py-5 bg-indigo-600 dark:bg-indigo-500 text-white dark:text-slate-900 dark:font-black font-bold rounded-2xl uppercase text-[12px] tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Add Employee
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- EDIT MODAL ---
const EditModal = ({ user, onClose, refresh, getAuthHeaders, designations, onDesignationCreated, onDesignationUpdated, onDesignationDeleted, departments, showToast }) => {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  const [form, setForm] = useState({
    employeeId: user.employeeId || '',
    name: user.name || '',
    phone: user.phone || '',
    email: user.email || '',
    designation: user.designationId || user.designation || '',
    departmentId: user.departmentId?._id || user.departmentId || user.department || '',
    reportingManager: user.reportingManager || '',
    status: user.status || 'active',
    role: user.role || 'employee',
    avatar: null,
    joining_date: user.joining_date ? new Date(user.joining_date).toISOString().split('T')[0] : '',
    salary: user.salary || '',
    address: user.address || '',
    identityType: user.identityType || 'aadhaar',
    identityNumber: user.identityNumber || ''
  });
  const [preview, setPreview] = useState(user.avatar || user.profile_image || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!form.designation || designations.some(d => String(d.id) === String(form.designation))) return;

    const matchingDesignation = designations.find(d => d.name.toLowerCase() === String(form.designation).toLowerCase());
    if (matchingDesignation) {
      setForm(prev => ({ ...prev, designation: String(matchingDesignation.id) }));
    }
  }, [designations, form.designation]);

  useEffect(() => {
    if (!form.departmentId || departments.some(d => String(d.id || d._id) === String(form.departmentId))) return;

    const matchingDepartment = departments.find(d => d.name.toLowerCase() === String(form.departmentId).toLowerCase());
    if (matchingDepartment) {
      setForm(prev => ({ ...prev, departmentId: String(matchingDepartment.id || matchingDepartment._id) }));
    }
  }, [departments, form.departmentId]);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, avatar: file });
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const fd = new FormData();
      Object.keys(form).forEach(key => {
        if (key === 'avatar') {
          if (form.avatar) fd.append('profileImage', form.avatar);
        } else {
          fd.append(key, form[key]);
        }
      });

      const res = await fetch(`${API_BASE}/v1/users/update/${user.id || user._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: fd
      });

      const data = await res.json();
      if (res.ok || data.success) {
        showToast('Employee data synchronized successfully.', 'success');
        await refresh();
        onClose();
      } else {
        showToast(data.message || data.error || 'Synchronization failed.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Error reaching the synchronizer api.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex justify-center items-start overflow-y-auto pt-16 pb-16 p-4"
    >
      <motion.div 
        initial={{ y: -50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: -50, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-3xl p-8 md:p-10 shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors"><X size={20}/></button>
        
        <header className="mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">EDIT <span className="text-indigo-600 dark:text-indigo-400">EMPLOYEE FILE</span></h2>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Synchronizing Tactical Assets</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Avatar Upload Container */}
          <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/40">
            <div className="relative group w-24 h-24 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-900 hover:border-indigo-500 transition-all cursor-pointer">
              <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleAvatarChange} />
              {preview ? (
                <img src={preview} className="h-full w-full object-cover" alt="avatar preview" />
              ) : (
                <div className="text-center text-slate-400 group-hover:text-indigo-500 transition-colors">
                  <ImageIcon className="mx-auto" size={24} />
                  <span className="text-[8px] font-bold uppercase tracking-widest mt-1 block">IMAGE</span>
                </div>
              )}
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Update Avatar File</h4>
              <p className="text-xs text-slate-500 mt-1">On-click triggers file manager. Upload high resolution files. Max size: 5MB.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Employee ID</label>
              <input required name="employeeId" className="w-full" value={form.employeeId} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Full Name</label>
              <input required name="name" className="w-full" placeholder="NAME" value={form.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Phone Number</label>
              <input
                required
                name="phone"
                type="tel"
                maxLength={10}
                className={`w-full border rounded-xl px-3 py-2 text-sm outline-none transition focus:ring-1 ${
                  form.phone && form.phone.length !== 10
                    ? 'border-red-400 focus:ring-red-400'
                    : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500'
                }`}
                placeholder="10-digit number"
                value={form.phone}
                onChange={e => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setForm(prev => ({ ...prev, phone: digits }));
                }}
              />
              {form.phone && form.phone.length !== 10 && (
                <p className="text-[10px] text-red-500 ml-1">Must be exactly 10 digits.</p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Corporate Email</label>
              <input required type="email" name="email" className="w-full" placeholder="EMAIL" value={form.email} onChange={handleInputChange} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Corporate Designation</label>
              <DesignationSelect
                value={form.designation}
                onChange={(designation) => setForm(prev => ({ ...prev, designation }))}
                designations={designations}
                getAuthHeaders={getAuthHeaders}
                onDesignationCreated={onDesignationCreated}
                onDesignationUpdated={onDesignationUpdated}
                onDesignationDeleted={onDesignationDeleted}
                showToast={showToast}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Department Assignment</label>
              <select
                required
                name="departmentId"
                value={form.departmentId}
                onChange={handleInputChange}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 dark:focus:border-indigo-400 cursor-pointer"
              >
                <option value="" disabled>SELECT DEPARTMENT</option>
                {departments.map((dept) => (
                  <option
                    key={dept._id || dept.id}
                    value={dept._id || dept.id}
                    className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
                  >
                    {dept.name.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Reporting Manager</label>
              <input required name="reportingManager" className="w-full" placeholder="MANAGER" value={form.reportingManager} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">System Status</label>
              <select name="status" className="w-full" value={form.status} onChange={handleInputChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
             <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">System Role</label>
              <select name="role" className="w-full" value={form.role} onChange={handleInputChange}>
                {ROLES.map(r => (
                  <option key={r.id} value={r.name}>{r.name.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Monthly Salary</label>
              <input name="salary" type="number" className="w-full" placeholder="SALARY" value={form.salary} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Joining Date</label>
              <input required name="joining_date" type="date" className="w-full" value={form.joining_date} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Identity Type</label>
              <select name="identityType" className="w-full" value={form.identityType} onChange={handleInputChange}>
                <option value="aadhaar">Aadhaar</option>
                <option value="pan">PAN</option>
                <option value="passport">Passport</option>
                <option value="driving_license">Driving License</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">ID Number</label>
              <input required name="identityNumber" className="w-full" placeholder="ID NUMBER" value={form.identityNumber} onChange={handleInputChange} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Residential Address</label>
              <textarea name="address" rows={2} className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:border-indigo-500/50 outline-none transition" placeholder="ADDRESS" value={form.address} onChange={handleInputChange} />
            </div>
          </div>

          <button 
            disabled={isSubmitting} 
            className="w-full py-5 bg-indigo-600 dark:bg-indigo-500 text-white dark:text-slate-900 dark:font-black font-bold rounded-2xl uppercase text-[12px] tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98]"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            Synchronize Onboard File
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- VIEW DOSSIER MODAL ---
const ViewModal = ({ user, getDesignationName, getDepartmentName, onClose }) => {
  // Local state to track image loading errors for this single view instance
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // Determine status configurations dynamically
  const statusKey = user.status || (user.isActive ? 'active' : 'inactive');
  const STATUS_META = {
    active: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
    inactive: { color: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400', dot: 'bg-amber-500' },
    blocked: { color: 'bg-rose-500/10 text-rose-500 border-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400', dot: 'bg-rose-500' }
  };
  const meta = STATUS_META[statusKey] || STATUS_META.active;

  // Mirror the dynamic format: FIRST 3 LETTERS (UPPERCASE) + LAST 3 DIGITS OF PHONE
  const namePart = (user.name || "").trim().slice(0, 3).toUpperCase();
  const phonePart = (user.phone || "").trim().slice(-3) || "123";
  const implicitPassword = `${namePart}${phonePart}`;

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex justify-center items-start overflow-y-auto pt-16 pb-16 p-4"
    >
      <motion.div 
        initial={{ y: -50, scale: 0.95 }} animate={{ y: 0, scale: 1 }} exit={{ y: -50, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 transition-colors z-10"><X size={20}/></button>

        {/* Graphic Header Block */}
        <div className="h-32 bg-gradient-to-r from-indigo-500 to-indigo-700 p-6 flex items-end relative">
          <div className="absolute top-6 left-6 flex items-center gap-2">
            <Shield size={16} className="text-white/60" />
            <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">Employee Details</span>
          </div>
        </div>

        {/* Avatar overlay */}
        <div className="px-8 pb-8 relative">
          <div className="-mt-16 mb-4 flex items-end justify-between">
            <div className="relative">
              {(user.avatar || user.profile_image) && !imgError ? (
                <img 
                  src={user.avatar || user.profile_image} 
                  alt={user.name} 
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-lg"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-indigo-500/10 border-4 border-white dark:border-slate-900 text-white-100 flex items-center justify-center shadow-lg">
                  <User size={36} />
                </div>
              )}
              <div className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full border-4 border-white dark:border-slate-900 ${meta.dot}`} />
            </div>
            
            <span className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider border ${meta.color}`}>
              {statusKey}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none">{user.name}</h3>
              <p className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 mt-1 uppercase tracking-widest">{getDesignationName(user)}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Employee ID</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{user.employeeId || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Corporate Email</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{user.email || 'N/A'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">System Role</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{user.role || 'employee'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Department Assignment</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{getDepartmentName(user)}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Reporting Manager</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{user.reportingManager || 'Unassigned'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Monthly Salary</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">₹{user.salary || '0'}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Joining Date</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {user.joining_date ? new Date(user.joining_date).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Identity Document</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                  {user.identityType || 'N/A'}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">ID Number</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {user.identityNumber || 'N/A'}
                </span>
              </div>
              <div className="space-y-1 col-span-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Residential Address</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {user.address || 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="flex items-center gap-3.5 text-xs">
                <Mail size={16} className="text-slate-400" />
                <span className="font-semibold text-slate-600 dark:text-slate-300">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3.5 text-xs">
                  <Phone size={16} className="text-slate-400" />
                  <span className="font-semibold text-slate-600 dark:text-slate-300">{user.phone}</span>
                </div>
              )}
            </div>

            {/* Account Credentials Section */}
            <div className="mt-4 pt-4 border-t border-dashed border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center justify-between p-4 bg-indigo-500/5 dark:bg-lime-500/5 border border-indigo-500/10 dark:border-lime-500/10 rounded-xl">
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-indigo-500 dark:text-lime-400 block">
                    Initial System Password
                  </span>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Formula: First 3 letters of name + last 3 digits of phone
                  </p>
                </div>
                <div className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-slate-100 select-all shadow-sm">
                  {implicitPassword}
                </div>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
    </motion.div>
  );

};
export default Users;
