export const fetchCompletedTasks = async (userId, dateStr) => {
  if (!userId || !dateStr) return [];
  const API_BASE = import.meta.env.VITE_API_URL;
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/tasks/all`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!res.ok) return [];
    
    const data = await res.json();
    const tasks = Array.isArray(data) ? data : (data.tasks || data.data || []);
    
    // Filter for tasks assigned to the user, marked as done, and matching the date
    return tasks.filter(t => {
      // Check user assignment
      const assignedUser = t.assigned_to?._id || t.assigned_to?.id || t.assigned_to || t.assignedTo?._id || t.assignedTo?.id || t.assignedTo;
      if (String(assignedUser) !== String(userId)) return false;
      
      // Check status
      if (String(t.status).toLowerCase() !== 'done') return false;
      
      // Check date safely with local timezone
      const getLocalDateStr = (d) => {
        if (!d) return '';
        try {
          return new Intl.DateTimeFormat('en-CA').format(new Date(d));
        } catch(e) { return ''; }
      };
      
      const taskDate = getLocalDateStr(t.date);
      const updateDate = getLocalDateStr(t.updatedAt);
      const createDate = getLocalDateStr(t.createdAt);
      
      // We consider it completed for this report if its date or updateDate matches the report date
      return taskDate === dateStr || updateDate === dateStr || createDate === dateStr;
    });
  } catch (error) {
    console.error("Error fetching completed tasks:", error);
    return [];
  }
};
