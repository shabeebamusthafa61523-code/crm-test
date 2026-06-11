import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Edit3, Trash2, Eye, X, Mail, Phone, 
  Briefcase, Folder, UserCheck, ShieldAlert, Image as ImageIcon,
  Loader2, User, ChevronRight, CheckCircle2, AlertTriangle, Shield
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
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
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [designations, setDesignations] = useState([]);
  const [departments, setDepartments] = useState([]);
  const { showToast } = useToast();

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
      const res = await fetch(`${API_BASE}/v1/departments`, {
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

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`Are you absolutely sure you want to delete employee "${name}"? This action is permanent.`)) {
      return;
    }
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
    <div className="p-4 md:p-8 min-h-screen text-slate-800 dark:text-slate-100 transition-colors duration-500">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Nexus Staff Portal</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none">
              EMPLOYEE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-lime-400">DIRECTORY</span>
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
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm">
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
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, email, designation, employee ID..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800/80 py-3.5 pl-12 pr-4 rounded-xl text-sm font-medium focus:border-indigo-500/50 dark:focus:border-indigo-400/50 outline-none transition-all duration-300"
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
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Employee ID</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Contact</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Role / Designation</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Department / Manager</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</th>
                    <th className="py-4.5 px-6 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                  {filteredUsers.map((user) => {
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
                            <div className="relative">
                              {user.avatar || user.profile_image ? (
                                <img 
                                  src={user.avatar || user.profile_image} 
                                  alt={user.name} 
                                  className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-800 shadow-sm"
                                  onError={(e) => {
                                    e.target.src = '';
                                    e.target.className = 'hidden';
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
                              <p className="text-[11px] text-slate-400 font-medium tracking-wide lowercase truncate max-w-[180px]">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Employee ID */}
                        <td className="py-4.5 px-6 font-semibold text-xs tracking-wider text-slate-600 dark:text-slate-300">
                          {user.employeeId || 'N/A'}
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
                              title="Purge agent file"
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
    </div>
  );
};

const DesignationSelect = ({ value, onChange, designations, getAuthHeaders, onDesignationCreated, showToast }) => {
  const [isAdding, setIsAdding] = useState(false);

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
    <div className="flex gap-2">
      <select required name="designation" className="w-full" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select Designation</option>
        {designations.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleAddDesignation}
        disabled={isAdding}
        title="Add designation"
        className="shrink-0 h-11 w-11 rounded-xl bg-indigo-600 text-white dark:bg-indigo-500 dark:text-slate-950 flex items-center justify-center transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:opacity-60"
      >
        {isAdding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
      </button>
    </div>
  );
};

// --- CREATE MODAL ---
const CreateModal = ({ onClose, refresh, getAuthHeaders, designations, onDesignationCreated, departments, showToast }) => {
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
    avatar: null
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
      showToast(data.message || 'Failed to onboard employee.', 'error');
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
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-100 italic uppercase tracking-tighter">NEW <span className="text-indigo-600 dark:text-indigo-400">EMPLOYEE FILE</span></h2>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Initiating Onboarding Protocols</p>
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
              <input required name="phone" className="w-full" placeholder="PHONE" value={form.phone} onChange={handleInputChange} />
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
            Onboard New Agent
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- EDIT MODAL ---
const EditModal = ({ user, onClose, refresh, getAuthHeaders, designations, onDesignationCreated, departments, showToast }) => {
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
    avatar: null
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
        showToast(data.message || 'Synchronization failed.', 'error');
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
              <input required name="employeeId" className="w-full" value={form.employeeId} onChange={handleInputChange} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Full Name</label>
              <input required name="name" className="w-full" placeholder="NAME" value={form.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-indigo-500 dark:text-indigo-400 tracking-wider block ml-1">Phone Number</label>
              <input required name="phone" className="w-full" placeholder="PHONE" value={form.phone} onChange={handleInputChange} />
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
            <span className="text-[9px] font-black text-white/60 uppercase tracking-[0.3em]">Agent Profile dossier</span>
          </div>
        </div>

        {/* Avatar overlay */}
        <div className="px-8 pb-8 relative">
          <div className="-mt-16 mb-4 flex items-end justify-between">
            <div className="relative">
              {user.avatar || user.profile_image ? (
                <img 
                  src={user.avatar || user.profile_image} 
                  alt={user.name} 
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-slate-900 shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-indigo-500/10 border-4 border-white dark:border-slate-900 text-indigo-500 flex items-center justify-center shadow-lg">
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

            <div className="grid grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-950/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
              <div className="space-y-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Employee ID</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{user.employeeId || 'N/A'}</span>
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

            {/* --- NEW: Dynamic Account Credentials Section --- */}
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
