import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Clock, CheckCircle2, Eye, Layout, X, 
  Trash2, Edit3, Save, Upload, Image as ImageIcon, 
  Loader2, Camera, ShieldCheck, User, Target, Info
} from 'lucide-react';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';

const API_BASE = import.meta.env.VITE_API_URL;// --- UTILS & CONSTANTS ---
const getTaskImageUrl = (path) => {

  if (!path) return null;

  if (path.startsWith("http")) {
    return path;
  }

  const fileName = path.split(/[\\/]/).pop();

  return `https://res.cloudinary.com/davmqgfsq/image/upload/v1776844261/tasks/${fileName}`;

};

const COLUMN_META = {
  pending: { label: 'Pending', icon: Layout, color: 'bg-[#e26a6a]', glow: 'shadow-[#e26a6a]/20' },
  current: { label: 'Current', icon: Clock, color: 'bg-[#e5a23a]', glow: 'shadow-[#e5a23a]/20' },
  preview: { label: 'Preview', icon: Eye, color: 'bg-indigo-500', glow: 'shadow-indigo-500/20' },
  done: { label: 'Completed', icon: CheckCircle2, color: 'bg-[#9dd384]', glow: 'shadow-[#9dd384]/20' }
};

const DEFAULT_DESIGNATIONS = [
  { id: "1", name: "HR Manager" }, { id: "2", name: "Graphic Designer" },
  { id: "3", name: "Digital Marketer" }, { id: "4", name: "React Developer" },
  { id: "5", name: "Node Developer" }, { id: "6", name: "Flutter Developer" },
  { id: "7", name: "Fullstack" }, { id: "8", name: "Admin" }, { id: "9", name: "Manager" }
];

const Todo = () => {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [designations, setDesignations] = useState(DEFAULT_DESIGNATIONS);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  
  // Determine current user ID from localStorage or JWT token
  const getCurrentUserId = () => {
    const stored = localStorage.getItem('user_id');
    if (stored) {
      return stored.replace(/"/g, '').trim();
    }
    const rawToken = localStorage.getItem('token');
    if (rawToken) {
      try {
        const payload = JSON.parse(atob(rawToken.split('.')[1]));
        // Common fields: id, _id, user_id
        return (payload.id || payload._id || payload.user_id || '').toString().replace(/"/g, '').trim();
      } catch (e) {
        console.warn('Failed to decode JWT for user id', e);
      }
    }
    return '';
  };
  const [currentUserId] = useState(getCurrentUserId);

  const getAuthHeaders = useCallback(() => {
    const rawToken = localStorage.getItem('token');
    const cleanToken = rawToken ? rawToken.replace(/"/g, '') : '';
    return { 'Authorization': cleanToken.startsWith('Bearer ') ? cleanToken : `Bearer ${cleanToken}` };
  }, []);
const fetchData = useCallback(async () => {
  try {

    const [tRes, uRes, dRes] = await Promise.all([
      fetch(`${API_BASE}/tasks/all`, {
        headers: getAuthHeaders()
      }),

      fetch(`${API_BASE}/user/list`, {
        headers: getAuthHeaders()
      }),

      fetch(`${API_BASE}/v1/designations`, {
        headers: getAuthHeaders()
      })
    ]);

    const responseText = await tRes.text();
    const tData = JSON.parse(responseText);
    const uData = await uRes.json();
    
    let dData = [];
    if (dRes.ok) {
      const dJson = await dRes.json();
      dData = dJson.data || [];
    }

    const rawTasks = Array.isArray(tData)
      ? tData
      : (tData.data || []);

    const sortedTasks = [...rawTasks].reverse();
    const cleanedTasks = sortedTasks.map(task=>({
      ...task,
      assigned_to:
        (task.assigned_to && typeof task.assigned_to === "object")
          ? (task.assigned_to.id || task.assigned_to._id || "")
          : (task.assigned_to || "")
    }));

    setTasks(cleanedTasks);
    setUsers(
      Array.isArray(uData) ? uData : []
    );
    if (Array.isArray(dData) && dData.length > 0) {
      setDesignations(dData);
    }
  } catch (e) {
    console.error("Fetch Error:", e);
  } finally {
    setLoading(false);
  }
}, [getAuthHeaders]);
  useEffect(() => { fetchData(); }, [fetchData]);

  const onDragEnd = async (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const newStatus = destination.droppableId;
    const oldTasks = [...tasks];
    setTasks(prev => prev.map(t => t.id.toString() === draggableId ? { ...t, status: newStatus } : t));
    try {
      await fetch(`${API_BASE}/tasks/task-status/${draggableId}?status=${newStatus}`, {
        method: 'PUT', headers: getAuthHeaders()
      });
    } catch (err) { setTasks(oldTasks); }
  };

  if (loading) return (
    <div className="min-h-[75vh] bg-transparent flex flex-col items-center justify-center">
      <div className="relative">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
        <div className="absolute inset-0 blur-xl bg-indigo-500/20 animate-pulse" />
      </div>
      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.5em] text-indigo-500/50">Syncing Nexus</p>
    </div>
  );
console.log("TOKEN:", localStorage.getItem("token"));
console.log("HEADERS:", getAuthHeaders());
  return (
    <div className="text-slate-700 dark:text-slate-200 font-sans selection:bg-white-500/30 selection:text-white">
      <style>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>
      
      <div className="max-w-[1700px] mx-auto px-6 py-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-10 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-3 ">
              <div className="h-2 w-2 bg-indigo-500 rounded-full animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500/70 dark:text-indigo-400/80">System Live</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter leading-none">
              TASKS <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500"></span>
            </h1>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)} 
            className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 shadow-sm rounded-full font-black text-[11px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-indigo-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <Plus size={18} className="relative z-10 group-hover:text-white" /> 
            <span className="relative z-10 group-hover:text-white">Create Task</span>
          </button>
        </header>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
            {Object.keys(COLUMN_META).map(statusKey => (
              <Droppable droppableId={statusKey} key={statusKey}>
                {(provided, snapshot) => (
                  <div 
                    {...provided.droppableProps} ref={provided.innerRef} 
                    className={`flex flex-col min-h-[75vh] rounded-[2.25rem] transition-all duration-300 border ${snapshot.isDraggingOver ? 'bg-indigo-500/[0.03] dark:bg-indigo-500/[0.01] border-indigo-500/30 dark:border-indigo-500/20 shadow-inner' : 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200/50 dark:border-slate-800/40'}`}
                  >
                    <div className="p-6 pb-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-900/80">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 shadow-sm ${COLUMN_META[statusKey].glow}`}>
                          {React.createElement(COLUMN_META[statusKey].icon, {
                            size: 15,
                            className: COLUMN_META[statusKey].color.replace('bg-', 'text-')
                          })}
                        </div>
                        <h2 className="font-bold text-slate-800 dark:text-slate-200 uppercase text-[11px] tracking-[0.2em]">{COLUMN_META[statusKey].label}</h2>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-lg border border-slate-200/20 dark:border-slate-800/30">{tasks.filter(t => t.status === statusKey).length}</span>
                    </div>

                    <div className="p-4 space-y-4">
                      {tasks.filter(t => t.status === statusKey).map((task, index) => {
                        const checkIsUrgent = (dateString) => {
                          if (!dateString) return false;
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const due = new Date(dateString);
                          due.setHours(0, 0, 0, 0);
                          const diffTime = due.getTime() - today.getTime();
                          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                          return diffDays <= 1; // Today, tomorrow, or overdue
                        };
                        const isUrgent = task.dueDate && statusKey !== 'done' && checkIsUrgent(task.dueDate);
                        return (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(p, s) => (
                            <div 
                              ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} 
                              onClick={() => setSelectedTask(task)} 
                              className={`group relative p-5 pl-7 rounded-[1.75rem] bg-white/80 dark:bg-slate-900/40 backdrop-blur-md border ${isUrgent ? 'border-rose-500 bg-rose-50/20 dark:bg-rose-950/20' : 'border-slate-200/50 dark:border-slate-800/50'} shadow-sm hover:shadow-lg dark:hover:shadow-indigo-500/[0.02] transition-all duration-300 cursor-grab active:cursor-grabbing hover:-translate-y-[2px] ${s.isDragging ? 'rotate-[1.5deg] scale-[1.02] shadow-2xl z-50 bg-white/95 dark:bg-slate-900/95 border-indigo-500/40 dark:border-indigo-500/50 ring-2 ring-indigo-500/10' : ''}`}
                            >
                              {/* Left Accent Bar */}
                              <div className={`absolute left-0 top-6 bottom-6 w-[3px] rounded-r-full transition-all duration-300 group-hover:top-4 group-hover:bottom-4 ${isUrgent ? 'bg-rose-500' : COLUMN_META[statusKey].color}`} />

                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)] animate-pulse" />
                                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                  {designations.find(d => String(d.id) === String(task.designation_id))?.name || "General"}
                                </span>
                              </div>

                              <h3 className="text-slate-800 dark:text-slate-200 font-bold text-[14px] leading-snug mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">{task.title}</h3>
                              {task.dueDate && (
                                <div className={`text-[10px] font-bold mb-4 flex items-center gap-1.5 ${isUrgent ? 'text-rose-500' : 'text-slate-500'}`}>
                                  <Clock size={12} />
                                  <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                                </div>
                              )}

                              
                              <div className="flex items-center justify-between pt-4 border-t border-slate-100/60 dark:border-slate-850/50">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200/50 dark:border-slate-750/50 flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    <User size={12} />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-wide truncate max-w-[120px]">
                                    {
                                      typeof task.assigned_to === "object"
                                        ? task.assigned_to?.name
                                        : users.find(
                                            u => String(u.id || u._id) === String(task.assigned_to)
                                          )?.name
                                          || task.assigned_to
                                          || "No Agent"
                                    }
                                  </span>
                                </div>
                                {task.image && (
                                  <div className="p-1.5 rounded-lg bg-white-500/10 text-white-500 dark:text-indigo-400 border border-indigo-500/10">
                                    <ImageIcon size={12} />
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isModalOpen && (
          <CreateModal 
            onClose={() => setIsModalOpen(false)} 
            users={users} refresh={fetchData} getAuthHeaders={getAuthHeaders} 
            designations={designations}
          />
        )}
        {selectedTask && (
          <DetailModal 
            task={selectedTask} users={users} 
            currentUserId={currentUserId}
            onClose={() => setSelectedTask(null)} 
            onUpdate={fetchData}           // Pointing to your fetch function
            getAuthHeaders={getAuthHeaders}
            API_BASE={API_BASE} // <--- ADD THIS LINE
            DESIGNATIONS={designations} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- CREATE MODAL COMPONENT ---
const CreateModal = ({ onClose, users, refresh, getAuthHeaders, designations }) => {
  const { showToast } = useToast();

  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', designation_id: '', image: null, dueDate: '' });

  const [preview, setPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) { 
      setForm({ ...form, image: file }); 
      setPreview(URL.createObjectURL(file)); 
    }
  };

  const handleSubmit = async (e) => {

  e.preventDefault();

  setIsSubmitting(true);

  const fd = new FormData();

 

  fd.append('title', form.title);
  fd.append('description', form.description || '');
  fd.append('assigned_to', form.assigned_to);
  fd.append('designation_id', form.designation_id);
  fd.append('status', 'pending');
  if (form.dueDate) {
    fd.append('dueDate', form.dueDate);
  }

  if (form.image) {
    fd.append('file', form.image);
  }

  // DEBUG
  for (let pair of fd.entries()) {
    console.log(pair[0], pair[1]);
  }

  try {
    const res = await fetch(`${API_BASE}/tasks/create`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: fd
    });

    const data = await res.json();

    console.log("STATUS:", res.status);
    console.log("RESPONSE:", data);
    console.log("ERRORS FULL:", JSON.stringify(data.errors, null, 2));
    if (!res.ok) {
      showToast(data.message || "Task creation failed", "error");
      return;
    }

    showToast("Task successfully created!", "success");
    await refresh();
    onClose();

  } catch (e) {
    console.error("CREATE ERROR:", e);
    showToast("Network error. Task creation failed.", "error");
  } finally {
    setIsSubmitting(false);
  }
};

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex justify-center items-start overflow-y-auto pt-10 pb-10 no-scrollbar"
    >
      <motion.div 
        initial={{ y: -100, scale: 0.9 }} animate={{ y: 0, scale: 1 }}
        className="bg-white border border-slate-200 w-full max-w-3xl rounded-[3rem] p-10 shadow-xl relative"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-slate-900 transition-colors"><X size={24}/></button>
        
        <header className="mb-10">
          <h2 className="text-3xl font-black text-slate-900 italic uppercase tracking-tighter">New <span className="text-indigo-600">Assignment</span></h2>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em] mt-2">Dossier Entry Protocol</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="group relative h-48 w-full rounded-[2rem] border-2 border-dashed border-slate-200 hover:border-indigo-500/50 flex flex-col items-center justify-center transition-all bg-slate-50">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImage} />
            {preview ? (
              <img src={preview} className="h-full w-full object-cover rounded-[2rem]" alt="preview" />
            ) : (
              <div className="text-center">
                <Camera className="mx-auto text-indigo-500 mb-4" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Upload Intelligence Asset</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-2">Title</label>
              <input required className="w-full bg-white border border-slate-200 p-5 rounded-2xl text-slate-900 font-bold outline-none focus:border-indigo-500/50" placeholder="TITLE" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-2">Due Date</label>
              <input type="date" className="w-full bg-white border border-slate-200 p-5 rounded-2xl text-slate-900 font-bold outline-none focus:border-indigo-500/50" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-2">assign to</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  required
                  className="appearance-none bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 p-5 rounded-2xl text-gray-900 dark:text-gray-200 text-[11px] font-bold outline-none"
                  value={form.assigned_to}
                  onChange={e => {
                    const userId = e.target.value;
                    const user = users.find(u => String(u.id || u._id) === String(userId));
                    let desigId = '';
                    if (user) {
                      if (user.designationId) {
                        desigId = typeof user.designationId === 'object'
                          ? (user.designationId._id || user.designationId.id || '')
                          : String(user.designationId);
                      } else if (user.designation) {
                        desigId = String(user.designation);
                      }
                    }
                    setForm({ ...form, assigned_to: userId, designation_id: desigId });
                  }}
                >
                  <option value="">Assign to</option>
                  {users.map(u => (
                    <option key={u.id || u._id} value={u.id || u._id} className="bg-white text-gray-900">
                      {u.name}
                    </option>
                  ))}
                </select>
                <div className="bg-slate-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-650 p-5 rounded-2xl text-gray-500 dark:text-gray-400 text-[11px] font-bold flex items-center">
                  <span>
                    {designations.find(d => String(d.id || d._id) === String(form.designation_id))?.name || "Designation"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-2">Briefing</label>
            <textarea className="w-full bg-white border border-slate-200 p-5 rounded-2xl text-slate-900 text-sm h-40 resize-none outline-none focus:border-indigo-500/50" placeholder="Enter tactical requirements..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          <button disabled={isSubmitting} className="w-full py-6 bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white rounded-2xl font-black uppercase text-[12px] tracking-[0.3em] transition-all flex items-center justify-center gap-3">
{isSubmitting ? <Loader2
  size={18}
  className="animate-spin"
/> : <ShieldCheck size={20} />}            Submit
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
};

// --- DETAIL MODAL COMPONENT (CLEANED & INTEGRATED) ---
const DetailModal = ({ task, currentUserId, onClose, onUpdate, getAuthHeaders, DESIGNATIONS, users, API_BASE }) => {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newFile, setNewFile] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const statusConfig = {
    pending: { 
      label: 'Pending', 
      activeClass: 'bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 font-bold', 
      dot: 'bg-rose-600' 
    },
    current: { 
      label: 'Current', 
      activeClass: 'bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 text-amber-800 dark:text-amber-300 font-bold', 
      dot: 'bg-amber-600' 
    },
    preview: { 
      label: 'Preview', 
      activeClass: 'bg-indigo-100 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-indigo-800 dark:text-indigo-300 font-bold', 
      dot: 'bg-indigo-600' 
    },
    done: { 
      label: 'Completed', 
      activeClass: 'bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 font-bold', 
      dot: 'bg-emerald-600' 
    }
  };

  const canModify = useMemo(() => {
    const getCreatorId = () => {
      const candidates = [
        task?.user_id,
        task?.created_by?._id,
        task?.created_by?.id,
        task?.created_by
      ];

      for (const val of candidates) {
        if (!val) continue;
        const str = typeof val === 'object'
          ? (val._id || val.id || '').toString().trim()
          : val.toString().trim();

        if (str && str !== '[object Object]') {
          return str;
        }
      }
      return null;
    };

    const creatorId = getCreatorId();
    return currentUserId && creatorId && String(currentUserId).trim() === creatorId;
  }, [task, currentUserId]);

  useEffect(() => { 
    if (task) { 
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setEditForm({ ...task, status: task.status || "pending" }); 
      setIsEditing(false); 
      setNewFile(null);
    } 
  }, [task]);

  if (!task || !editForm) return null;

  const handleUpdate = async () => {
    if (isSaving) return;
    setIsSaving(true);

    const fd = new FormData();
    fd.append('title', editForm.title);
    fd.append('description', editForm.description || '');
    fd.append('assigned_to', editForm.assigned_to);
    fd.append('designation_id', editForm.designation_id);

    if (newFile) fd.append('file', newFile);
    if (editForm.dueDate) fd.append('dueDate', editForm.dueDate);

    try {
      await fetch(`${API_BASE}/tasks/update/${task.id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: fd
      });

      if (editForm.status !== task.status) {
        await fetch(`${API_BASE}/tasks/task-status/${task.id}?status=${editForm.status}`, {
          method: "PUT",
          headers: getAuthHeaders()
        });
      }

      await onUpdate();
      onClose();

    } catch (e) {
      console.error("Update error:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setEditForm(prev => ({ ...prev, status: newStatus }));

    try {
      await fetch(`${API_BASE}/tasks/task-status/${task.id}?status=${newStatus}`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      await onUpdate();
    } catch (err) {
      console.error("Status update failed:", err);
    }
  };

  const handleDelete = () => {
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleteConfirmOpen(false);
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/tasks/delete/${task.id}`, { 
        method: "DELETE", 
        headers: getAuthHeaders()
      });

      if (res.ok) {
        showToast("Task successfully deleted!", "success");
        await onUpdate();
        onClose();
      } else {
        showToast("Failed to delete task.", "error");
        console.warn("Backend Session Error detected, forcing UI refresh...");
        await onUpdate();
        onClose();
      }
    } catch (e) {
      showToast("Error deleting task.", "error");
      console.error("Delete error:", e);
      await onUpdate();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[5000] bg-slate-900/40 backdrop-blur-sm flex justify-center items-start overflow-y-auto pt-8 md:pt-16 p-4 no-scrollbar"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-6xl rounded-[3.5rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl mb-10"
      >
        <div className="w-full lg:w-5/12 bg-slate-50 dark:bg-slate-950/40 p-10 flex flex-col items-center justify-center relative border-r border-slate-100 dark:border-slate-800">
          <div className="absolute top-8 left-10 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.4em]">Tactical Asset</span>
          </div>

          <div 
            className="group relative cursor-zoom-in w-full transition-transform duration-500 hover:scale-[1.02]" 
            onClick={() => window.open(getTaskImageUrl(task.image || task.file), '_blank')}
          >
            <img 
              src={getTaskImageUrl(task.image || task.file) || 'https://placehold.co/600x800/111218/4f46e5?text=DATA+MISSING'} 
              className="w-full rounded-3xl object-cover shadow-2xl border border-slate-100 dark:border-slate-850" 
              alt="Task Asset" 
            />
          </div>

          {isEditing && (
            <label className="mt-6 w-full py-4 border-2 border-dashed border-indigo-500/20 rounded-2xl flex items-center justify-center gap-3 cursor-pointer hover:bg-indigo-500/5 transition-all">
              <input type="file" className="hidden" onChange={(e) => setNewFile(e.target.files[0])} />
              <Camera size={18} className="text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate max-w-[200px]">
                {newFile ? newFile.name : 'Update File'}
              </span>
            </label>
          )}
        </div>

        <div className="w-full lg:w-7/12 p-10 lg:p-16 relative flex flex-col justify-between bg-white dark:bg-slate-900">
          <button onClick={onClose} className="absolute top-10 right-10 p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-all">
            <X />
          </button>

          <div>
            {/* STATUS DISPLAY */}
            <div className="mb-8">
              {isEditing ? (
                <div className="relative">
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full appearance-none bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 pr-12 rounded-2xl text-slate-900 dark:text-slate-100 text-[11px] font-black uppercase tracking-[0.2em] outline-none focus:border-indigo-500/50 transition-all cursor-pointer hover:border-indigo-500/30 shadow-sm"
                  >
                    <option value="pending" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">PENDING</option>
                    <option value="current" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">CURRENT</option>
                    <option value="preview" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">PREVIEW</option>
                    <option value="done" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">COMPLETED</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400/60">
                    <Layout size={16} />
                  </div>
                </div>
              ) : (
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full border ${statusConfig[task.status]?.activeClass || 'bg-slate-500/10 border-slate-500/20 text-slate-600'}`}>
                  <div className={`w-2 h-2 rounded-full animate-pulse ${statusConfig[task.status]?.dot || 'bg-slate-500'}`} />
                  <span className="font-black uppercase text-[11px] tracking-widest">
                    {statusConfig[task.status]?.label || task.status}
                  </span>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-2 block ml-2">Header</label>
                  <input 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 p-6 rounded-3xl text-slate-900 dark:text-slate-105 text-2xl font-bold outline-none focus:border-indigo-500/50" 
                    value={editForm.title} 
                    onChange={e => setEditForm({...editForm, title: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-widest mb-2 block ml-2">Objective Brief</label>
                  <textarea 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 p-6 rounded-3xl text-slate-900 dark:text-slate-110 text-sm h-48 outline-none focus:border-indigo-500/50 resize-none leading-relaxed" 
                    value={editForm.description} 
                    onChange={e => setEditForm({...editForm, description: e.target.value})} 
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                <h2 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-slate-100 italic tracking-tighter uppercase leading-[0.85]">
                  {task.title}
                </h2>
                <div className="p-8 bg-slate-50 dark:bg-slate-950/40 border-y border-r border-slate-100 dark:border-slate-800 border-l-2 border-l-indigo-500 rounded-r-[2rem]">
                  <p className="text-slate-605 dark:text-slate-300 text-xl leading-relaxed font-medium italic opacity-80">
                    {task.description || 'No briefing recorded for this asset.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-y border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/20 rounded-2xl px-6 mt-8">
            <div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] block mb-2">Staff</span>
              {isEditing ? (
                <div className="relative">
                  <select
                    required
                    className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-slate-900 dark:text-slate-100 text-[11px] font-bold outline-none cursor-pointer"
                    value={editForm.assigned_to}
                    onChange={e => {
                      const userId = e.target.value;
                      const user = users.find(u => String(u.id || u._id) === String(userId));
                      let desigId = '';
                      if (user) {
                        if (user.designationId) {
                          desigId = typeof user.designationId === 'object'
                            ? (user.designationId._id || user.designationId.id || '')
                            : String(user.designationId);
                        } else if (user.designation) {
                          desigId = String(user.designation);
                        }
                      }
                      setEditForm({ ...editForm, assigned_to: userId, designation_id: desigId });
                    }}
                  >
                    <option value="">Assign to</option>
                    {users.map(u => (
                      <option key={u.id || u._id} value={u.id || u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 text-indigo-400">
                    <User size={18} />
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-bold tracking-tight uppercase text-sm">
                    {
                      typeof task.assigned_to === "object"
                        ? task.assigned_to?.name
                        : users?.find(
                            u => String(u.id || u._id) === String(task.assigned_to)
                          )?.name
                          || task.assigned_to
                          || "No Staff"
                    }
                  </span>
                </div>
              )}
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] block mb-2">Designation</span>
              {isEditing ? (
                <div className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-gray-500 dark:text-gray-400 text-[11px] font-bold">
                  {DESIGNATIONS?.find(d => String(d.id || d._id) === String(editForm.designation_id))?.name || "Designation"}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 text-purple-400">
                    <Target size={18} />
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-bold tracking-tight uppercase text-sm">
                    {DESIGNATIONS?.find(d => String(d.id) === String(task.designation_id))?.name || "General"}
                  </span>
                </div>
              )}
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] block mb-2">Due Date</span>
              {isEditing ? (
                <input 
                  type="date"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-xl text-gray-500 dark:text-gray-400 text-[11px] font-bold outline-none"
                  value={editForm.dueDate ? new Date(editForm.dueDate).toISOString().split('T')[0] : ''}
                  onChange={e => setEditForm({...editForm, dueDate: e.target.value})} 
                />
              ) : (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-rose-500/10 rounded-full flex items-center justify-center border border-rose-500/20 text-rose-400">
                    <Clock size={18} />
                  </div>
                  <span className="text-slate-900 dark:text-slate-100 font-bold tracking-tight uppercase text-sm">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No Due Date'}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 flex gap-4">
            {canModify ? (
              <>
                {isDeleteConfirmOpen ? (
                  <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 px-4 py-2 rounded-2xl animate-in slide-in-from-left-2 fade-in duration-200">
                    <span className="text-xs font-bold text-red-600 dark:text-red-400">Delete task?</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsDeleteConfirmOpen(false)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleConfirmDelete}
                        className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-xl shadow-md shadow-red-500/20 transition-colors"
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={handleDelete}
                    disabled={isSaving || isDeleting}
                    className="px-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                  </button>
                )}
                <button 
                  onClick={isEditing ? handleUpdate : () => setIsEditing(true)} 
                  disabled={isSaving || isDeleting}
                  className="flex-1 py-6 bg-indigo-600 text-white font-black uppercase text-[11px] tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 hover:bg-indigo-700 transition-all active:scale-95 shadow-lg disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="animate-spin" /> : isEditing ? <Save size={18} /> : <Edit3 size={18} />}
                  {isEditing ? (isSaving ? "Saving..." : "Synchronize Changes") : "Modify Assignment"}
                </button>
              </>
            ) : (
              <div className="w-full py-6 bg-slate-50 dark:bg-slate-950/20 rounded-3xl border border-slate-205 dark:border-slate-800 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-slate-400 italic font-medium">
                <span className="text-[11px] uppercase tracking-widest font-black">Authorized Creator Access Only</span>
                <span className="text-[8px] opacity-40 uppercase">Visitor: {currentUserId?.slice(0, 8)}... |Owner: {
                  (
                    task?.user_id ||
                    task?.created_by?._id ||
                    task?.created_by?.id ||
                    task?.created_by
                  )?.toString().slice(0,8)
                }...</span>
              </div>
            )}
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
};
export default Todo;