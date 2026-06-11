import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Clock, CheckCircle2, Eye, Layout, X, 
  Trash2, Edit3, Save, Upload, Image as ImageIcon, 
  Loader2, Camera, ShieldCheck, User, Target, Info
} from 'lucide-react';

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
        typeof task.assigned_to === "object"
          ? task.assigned_to.id
          : task.assigned_to
    }));

    setTasks(cleanedTasks);
    setUsers(
      Array.isArray(uData)
        ? uData.filter(
            u => ["1","2","3"].includes(String(u.role_id))
          )
        : []
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
    <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center">
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
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16 border-b border-slate-200 dark:border-slate-800 pb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
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
                    className={`flex flex-col min-h-[70vh] rounded-[2.5rem] transition-all duration-500 border ${snapshot.isDraggingOver ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-none'}`}
                  >
                    <div className="p-6 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-6 rounded-full ${COLUMN_META[statusKey].color}`} />
                        <h2 className="font-black text-slate-900 dark:text-slate-100 uppercase text-[12px] tracking-[0.2em]">{COLUMN_META[statusKey].label}</h2>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950/40 px-3 py-1 rounded-full">{tasks.filter(t => t.status === statusKey).length}</span>
                    </div>

                    <div className="p-4 space-y-4">
                      {tasks.filter(t => t.status === statusKey).map((task, index) => (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(p, s) => (
                            <div 
                              ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} 
                              onClick={() => setSelectedTask(task)} 
                              className={`group p-6 rounded-[2rem] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-900/60 shadow-sm hover:shadow-md hover:border-indigo-500/30 dark:hover:border-indigo-500/50 transition-all ${s.isDragging ? 'rotate-3 scale-105 shadow-xl z-50 bg-slate-50 dark:bg-slate-900' : ''}`}
                            >
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                                  {designations.find(d => String(d.id) === String(task.designation_id))?.name || "General"}
                                </span>
                              </div>
                              <h3 className="text-slate-800 dark:text-slate-200 font-bold text-[15px] mb-4 leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{task.title}</h3>
                              
                              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-900">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center border border-indigo-500/20 dark:border-indigo-800/40">
                                  <User size={14} className="text-indigo-400 dark:text-indigo-300" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider truncate">
                                  {
typeof task.assigned_to === "object"
? task.assigned_to?.name
: users.find(
    u=>String(u.id || u._id)===String(task.assigned_to)
  )?.name
  ||
  task.assigned_to
  ||
  "No Agent"
}                                </span>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
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
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', designation_id: '', image: null });
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
fd.append('designation_id', parseInt(form.designation_id));
  fd.append('status', 'pending');

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
      alert(data.message || "Task creation failed");
      return;
    }

    await refresh();
    onClose();

  } catch (e) {
    console.error("CREATE ERROR:", e);
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
              <label className="text-[9px] font-black uppercase text-indigo-500 tracking-[0.2em] ml-2">assign to</label>
              <div className="grid grid-cols-2 gap-3">
                <select
  required
  className="appearance-none bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 p-5 rounded-2xl text-gray-900 dark:text-gray-200 text-[11px] font-bold outline-none"
  value={form.assigned_to}
  onChange={e => setForm({ ...form, assigned_to: e.target.value })}
>
  <option value="" staff>Assign to</option>
  {users.map(u => (
    <option key={u.id || u._id} value={u.id || u._id} className="bg-white text-gray-900">
    
      {u.name}
    </option>
  ))}
</select>
                <select 
                  required 
                  className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 p-5 rounded-2xl text-gray-900 dark:text-gray-200 text-[11px] font-bold outline-none" 
                  value={form.designation_id} 
                  onChange={e => setForm({...form, designation_id: e.target.value})}
                >
                  <option value="">designation</option>
                  {designations.map(d => (
                    <option key={d.id} value={d.id} className="bg-white text-gray-900">
                      {d.name}
                    </option>
                  ))}
                </select>
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
// --- DETAIL MODAL COMPONENT ---
// --- DETAIL MODAL COMPONENT (CLEANED & INTEGRATED) ---
const DetailModal = ({ task, currentUserId, onClose, onUpdate, getAuthHeaders, DESIGNATIONS,users, API_BASE   }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [newFile, setNewFile] = useState(null);

  const canModify = useMemo(() => {
    const creatorId = task?.created_by?._id || task?.created_by?.id || task?.user_id || '';
    const currentId = currentUserId || (localStorage.getItem('user_id') ?? '');
    console.log('CREATOR ID =', creatorId);
    console.log('CURRENT ID =', currentId);
    return String(creatorId).trim() === String(currentId).trim();
  }, [task, currentUserId]);
 useEffect(() => { 
    if (task) { 
      // 1. Scroll to the top of the page immediately or smoothly
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // 2. Existing state resets
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

  try {
    // ✅ First update main data
    await fetch(`${API_BASE}/tasks/update/${task.id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: fd
    });

    // ✅ THEN update status separately
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
  // Optimistic UI update
  setEditForm(prev => ({ ...prev, status: newStatus }));

  try {
    await fetch(`${API_BASE}/tasks/task-status/${task.id}?status=${newStatus}`, {
      method: "PUT",
      headers: getAuthHeaders(),
    });

    // Refresh board
    await onUpdate();

  } catch (err) {
    console.error("Status update failed:", err);
  }
};
 const handleDelete = async () => {
  if (!window.confirm("ARE YOU SURE? This action will permanently purge this asset.")) return;
  
  setIsDeleting(true);
  try {
    const res = await fetch(`${API_BASE}/tasks/delete/${task.id}`, { 
      method: "DELETE", 
      headers: getAuthHeaders()
    });

    // We check if res.ok IS true OR if we got a 500 but the task is gone
    if (res.ok) {
      await onUpdate();
      onClose();
    } else {
      const errorData = await res.json().catch(() => ({}));
      
      // If the error is that specific SQLAlchemy session error, 
      // the backend usually still finishes the job or requires a refresh.
      // We force a refresh and close anyway to keep the UI moving.
      console.warn("Backend Session Error detected, forcing UI refresh...");
      await onUpdate();
      onClose();
    }
  } catch (e) {
    console.error("Delete error:", e);
    // Even on network error, try to refresh and close
    await onUpdate();
    onClose();
  } finally {
    setIsDeleting(false);
  }
};
console.log("TASK =", task);
console.log("CURRENT USER =", currentUserId);

console.log("FULL TASK =", task);
console.log("CREATED_BY =", task?.created_by);
console.log("USER_ID =", task?.user_id);
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[5000] bg-slate-900/40 backdrop-blur-sm flex justify-center items-start overflow-y-auto pt-8 md:pt-16 p-4 no-scrollbar"
    >
      <motion.div 
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="bg-white border border-slate-200 w-full max-w-6xl rounded-[3.5rem] overflow-hidden flex flex-col lg:flex-row shadow-2xl mb-10"
      >
        {/* LEFT: IMAGE SCANNER */}
        <div className="w-full lg:w-5/12 bg-slate-50 p-10 flex flex-col items-center justify-center relative border-r border-slate-100">
          <div className="absolute top-8 left-10 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em]">Tactical Asset</span>
          </div>

          <div 
            className="group relative cursor-zoom-in w-full transition-transform duration-500 hover:scale-[1.02]" 
            onClick={() => window.open(getTaskImageUrl(task.image || task.file), '_blank')}
          >
            <img 
              src={getTaskImageUrl(task.image || task.file) || 'https://placehold.co/600x800/111218/4f46e5?text=DATA+MISSING'} 
              className="w-full rounded-3xl object-cover shadow-2xl border border-slate-100" 
              alt="Task Asset" 
            />
          </div>

          {isEditing && (
            <label className="mt-6 w-full py-4 border-2 border-dashed border-indigo-500/20 rounded-2xl flex items-center justify-center gap-3 cursor-pointer hover:bg-indigo-500/5 transition-all">
              <input type="file" className="hidden" onChange={(e) => setNewFile(e.target.files[0])} />
              <Camera size={18} className="text-indigo-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[200px]">
                {newFile ? newFile.name : 'Update File'}
              </span>
            </label>
          )}
        </div>

        {/* RIGHT: DATA CORE */}
       {/* RIGHT: DATA CORE */}
<div className="w-full lg:w-7/12 p-10 lg:p-16 relative flex flex-col justify-between">
  <button onClick={onClose} className="absolute top-10 right-10 p-3 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-900 transition-all">
    <X />
  </button>

  <div>
    {isEditing ? (
  <div className="relative">
    <select
      value={editForm.status}
      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
      className="w-full appearance-none bg-white border border-slate-200 p-5 pr-12 rounded-2xl text-slate-900 text-[11px] font-black uppercase tracking-[0.2em] outline-none focus:border-indigo-500/50 transition-all cursor-pointer hover:border-indigo-500/30 shadow-sm"
    >
      <option value="pending" className="bg-white text-slate-900">PENDING</option>
      <option value="current" className="bg-white text-slate-900">CURRENT</option>
      <option value="preview" className="bg-white text-slate-900">PREVIEW</option>
      <option value="done" className="bg-white text-slate-900">COMPLETED</option>
    </select>
    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-400/60">
      <Layout size={16} />
    </div>
  </div>
) : (
  <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
    <div className={`w-2 h-2 rounded-full animate-pulse ${COLUMN_META[task.status]?.color || 'bg-slate-500'}`} />
    <span className="text-indigo-600 font-black uppercase text-[11px] tracking-widest">
      {task.status}
    </span>
  </div>
)}

    {/* CONTENT SECTION */}
    {isEditing ? (
      <div className="space-y-6">
        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block ml-2">Header</label>
          <input 
            className="w-full bg-slate-50 border border-slate-200 p-6 rounded-3xl text-slate-900 text-2xl font-bold outline-none focus:border-indigo-500/50" 
            value={editForm.title} 
            onChange={e => setEditForm({...editForm, title: e.target.value})} 
          />
        </div>
        <div>
          <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-2 block ml-2">Objective Brief</label>
          <textarea 
            className="w-full bg-slate-50 border border-slate-200 p-6 rounded-3xl text-slate-900 text-sm h-48 outline-none focus:border-indigo-500/50 resize-none leading-relaxed" 
            value={editForm.description} 
            onChange={e => setEditForm({...editForm, description: e.target.value})} 
          />
        </div>
      </div>
    ) : (
      <div className="space-y-8">
        <h2 className="text-5xl md:text-7xl font-black text-slate-900 italic tracking-tighter uppercase leading-[0.85]">
          {task.title}
        </h2>
        <div className="p-8 bg-slate-50 border-y border-r border-slate-100 border-l-2 border-l-indigo-500 rounded-r-[2rem]">
          <p className="text-slate-400 text-xl leading-relaxed font-medium italic opacity-80">
            {task.description || 'No briefing recorded for this asset.'}
          </p>
        </div>
      </div>
    )}
  </div>

 
<div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-100 bg-slate-50 rounded-2xl px-6">
  <div>
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Staff</span>
    {isEditing ? (
      <div className="relative">
        <select
          required
          className="w-full appearance-none bg-white border border-slate-200 p-3 rounded-xl text-slate-900 text-[11px] font-bold outline-none cursor-pointer"
          value={editForm.assigned_to}
          onChange={e => setEditForm({ ...editForm, assigned_to: e.target.value })}
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
        <span className="text-slate-900 font-bold tracking-tight uppercase text-sm">
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
    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Designation</span>
    {isEditing ? (
      <div className="relative">
        <select
          required
          className="w-full appearance-none bg-white border border-slate-200 p-3 rounded-xl text-slate-900 text-[11px] font-bold outline-none cursor-pointer"
          value={editForm.designation_id}
          onChange={e => setEditForm({ ...editForm, designation_id: e.target.value })}
        >
          <option value="">Designation</option>
          {DESIGNATIONS.map(d => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    ) : (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-purple-500/10 rounded-full flex items-center justify-center border border-purple-500/20 text-purple-400">
          <Target size={18} />
        </div>
        <span className="text-slate-900 font-bold tracking-tight uppercase text-sm">
          {DESIGNATIONS?.find(d => String(d.id) === String(task.designation_id))?.name || "General"}
        </span>
      </div>
    )}
  </div>
</div>

          {/* ACTION BUTTONS ROW */}
          <div className="mt-12 flex gap-4">
            {canModify ? (
              <>
                <button 
                  onClick={handleDelete}
                  disabled={isSaving || isDeleting}
                  className="px-6 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50"
                  title="Purge Asset"
                >
                  {isDeleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                </button>

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
              <div className="w-full py-6 bg-slate-50 rounded-3xl border border-slate-200 flex flex-col items-center justify-center gap-2 text-slate-500 italic font-medium">
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
}
export default Todo;