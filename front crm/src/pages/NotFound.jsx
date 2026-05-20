import React from 'react';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0 }}
      className="p-6 min-h-screen"
    >
      <h1 className="text-2xl font-bold text-slate-800">NotFound Page</h1>
      <p className="text-slate-500 mt-2">Welcome to the NotFound section of the Staff Management System.</p>
      
      {/* Glassmorphism Placeholder Card */}
      <div className="mt-8 p-10 bg-white/30 backdrop-blur-md border border-white/20 rounded-3xl shadow-xl">
        <p className="text-slate-700">Content for NotFound will go here...</p>
      </div>
    </motion.div>
  );
};

export default NotFound;
