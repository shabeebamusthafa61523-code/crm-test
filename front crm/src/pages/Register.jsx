import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Mail, Lock, ShieldPlus, Phone, Briefcase, 
  ShieldCheck, CreditCard, DollarSign, 
  Eye, EyeOff, MapPin, Calendar, Image as ImageIcon, Loader2, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [roles] = useState([
    { id: "1", name: "hr" },
    { id: "2", name: "admin" },
    { id: "3", name: "employee" },
    { id: "10", name: "student" }
  ]);

  const [designations] = useState([
    { id: "1", name: "Hr Manager" },
    { id: "2", name: "Graphic Designer" },
    { id: "3", name: "Digital Marketer" },
    { id: "4", name: "React Developer" },
    { id: "5", name: "Node Developer" },
    { id: "6", name: "Flutter Developer" },
    { id: "7", name: "Fullstack Developer" },
    { id: "8", name: "Admin" },
    { id: "9", name: "Manager" },
    { id: "10", name: "Student" }
  ]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role_id: '3', // Fix 1: Explicitly set default
    status: 'active',
    designation_id: '4', // Fix 1: Explicitly set default
    joining_date: new Date().toISOString().split('T')[0],
    salary: '',
    address: '',
    identityType: 'aadhaar', 
    identityNumber: '',
    // profile_image: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Fix 2: Force-format payload to prevent nulls/empty strings in DB
    const finalPayload = {
      ...formData,
      salary: parseFloat(formData.salary) || 0,
      role_id: String(formData.role_id || "3"),
      designation_id: String(formData.designation_id || "4")
    };

    console.log("Submitting Payload:", finalPayload);

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalPayload),
      });

      const result = await response.json();

      if (response.ok) {
        showToast("Staff Registration Successful!", 'success');
        navigate('/login');
      } else {
        // Handle FastAPI validation array or string detail
        const errorMsg = Array.isArray(result.detail) 
          ? result.detail[0]?.msg 
          : result.detail || "Registration Failed";
        setError(errorMsg);
      }
    } catch (err) {
      setError("Network error. Please check if your API server is online.");
      console.error("Signup error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 flex items-center justify-center p-6 bg-slate-50 dark:bg-[#0b0c10] transition-colors duration-500">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-2xl border border-[#374b69] dark:border-[#2c3e5a] shadow-xl transition-colors">
          <header className="mb-8">
            <h2 className="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter italic uppercase">Create Staff Profile</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium uppercase tracking-widest">Enterprise Human Resources Portal</p>
          </header>
          
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }} 
                className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-500 text-xs font-mono overflow-hidden"
              >
                <AlertTriangle className="shrink-0" size={16} /> 
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <FormInput label="Full Name" name="name" icon={<User size={16}/>} onChange={handleChange} value={formData.name} />
            
            <FormInput label="Email" name="email" type="email" icon={<Mail size={16}/>} onChange={handleChange} value={formData.email} />
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Password</label>
              <div className="relative">
<Lock
  className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
  ${formData.password ? "opacity-0" : "opacity-100"}`}
  size={16}
/>                <input 
                  required 
                  name="password" 
                  type={showPassword ? "text" : "password"} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 pr-12 text-slate-900 dark:text-slate-100 outline-none focus:border-[#374b69] focus:ring-2 focus:ring-[#374b69] transition-all peer" 
                  onChange={handleChange} 
                  value={formData.password}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors cursor-pointer">
                  {showPassword ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Role</label>
              <div className="relative">

  {/* ICON */}
  <ShieldCheck
    className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
    ${formData.role_id ? "opacity-0" : "opacity-100"}`}
    size={16}
  />

  {/* SELECT */}
  <select
    name="role_id"
    value={formData.role_id}
    onChange={handleChange}
    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none appearance-none focus:border-[#374b69] focus:ring-2 focus:ring-[#374b69] transition-all cursor-pointer"
  >
    {roles.map(r => (
      <option key={r.id} value={r.id}>
        {r.name.toUpperCase()}
      </option>
    ))}
  </select>

</div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Designation</label>
              <div className="relative">
<Briefcase
  className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
  ${formData.designation_id ? "opacity-0" : "opacity-100"}`}
  size={16}
/>                <select name="designation_id" 
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none appearance-none focus:border-[#374b69] focus:ring-2 focus:ring-[#374b69] transition-all cursor-pointer peer" onChange={handleChange} value={formData.designation_id}>
                  {designations.map(d => <option key={d.id} value={d.id} className="dark:bg-slate-900">{d.name}</option>)}
                </select>
              </div>
            </div>

            <FormInput label="Monthly Salary" name="salary" type="number" icon={<DollarSign size={16}/>} onChange={handleChange} value={formData.salary} />

            <FormInput label="Phone" name="phone" icon={<Phone size={16}/>} onChange={handleChange} value={formData.phone} />

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Identity Type</label>
              <div className="relative">
<ShieldPlus
  className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-all duration-200 text-slate-500
  ${formData.identityType ? "opacity-0" : "opacity-100"}`}
  size={16}
/>                <select name="identityType" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none appearance-none focus:border-[#374b69] focus:ring-2 focus:ring-[#374b69] transition-all cursor-pointer peer" onChange={handleChange} value={formData.identityType}>
                  <option value="aadhaar" className="dark:bg-slate-900">Aadhar</option>
                  <option value="pancard" className="dark:bg-slate-900">PAN</option>
                  <option value="passport" className="dark:bg-slate-900">Passport</option>
                </select>
              </div>
            </div>

            <FormInput label="ID Number" name="identityNumber" icon={<CreditCard size={16}/>} onChange={handleChange} value={formData.identityNumber} placeholder="XXXX-XXXX-XXXX" />

            <FormInput label="Joining Date" name="joining_date" type="date" icon={<Calendar size={16}/>} onChange={handleChange} value={formData.joining_date} />

            {/* <FormInput label="Profile Image URL" name="profile_image" icon={<ImageIcon size={16}/>} onChange={handleChange} value={formData.profile_image} placeholder="https://..." required={false} /> */}

            <div className="lg:col-span-3 space-y-1">
              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">Residential Address</label>
              <div className="relative">
<MapPin
  className={`absolute left-4 top-6 text-slate-500 pointer-events-none transition-all duration-200
  ${formData.address ? "opacity-0" : "opacity-100"}`}
  size={16}
/>                <textarea required name="address" rows="2" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none focus:border-[#374b69] focus:ring-2 focus:ring-[#374b69] transition-all peer" onChange={handleChange} value={formData.address}></textarea>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="lg:col-span-3 w-full py-4 bg-[#374b69] hover:bg-[#2c3e5a] text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-[#374b69]/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing...</span>
                </>
              ) : (
                "Finalize Registration"
              )}
            </button>
            {/* Login Redirect Link */}
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 text-center w-full lg:col-span-3">
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-widest">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-indigo-400 hover:text-indigo-300 font-black transition-colors ml-1 cursor-pointer"
                >
                  Sign In Here
                </button>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

// Fix 3: Updated Helper with proper value binding
const FormInput = ({
  label,
  name,
  type = "text",
  icon,
  onChange,
  value,
  placeholder = "",
  required = true
}) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase ml-2 tracking-widest">
      {label}
    </label>

    <div className="relative">

      {/* ICON */}
      <div
        className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none transition-all duration-200
        ${value ? "opacity-0" : "opacity-100"}`}
      >
        {icon}
      </div>

      {/* INPUT */}
      <input
        required={required}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl py-3 pl-12 text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 transition-all"
      />

    </div>
  </div>
);

export default Register;
