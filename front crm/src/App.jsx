import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// Page Imports
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Attendance from './pages/Attendance';
import Todo from './pages/Todo';
import Users from './pages/Users';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import StudentAttendance from './pages/StudentAttendance';

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes - No Sidebar */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes - Wrapped in MainLayout */}
        <Route path="/" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/attendance" element={<MainLayout><Attendance /></MainLayout>} />
        <Route path="/todo" element={<MainLayout><Todo /></MainLayout>} />
        <Route path="/users" element={<MainLayout><Users /></MainLayout>} />
        <Route path="/settings" element={<MainLayout><Settings /></MainLayout>} />
        <Route path="/student-attendance" element={<MainLayout><StudentAttendance /></MainLayout>} />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
    </Router>
  );
}

export default App;