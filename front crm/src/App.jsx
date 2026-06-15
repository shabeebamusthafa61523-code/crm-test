import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';

// Page Imports
import Dashboard from './pages/Dashboard';
import LeadDashboard from './pages/LeadDashboard';
import MarketingDashboard from './pages/Marketing Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Attendance from './pages/Attendance';
import Todo from './pages/Todo';
import Users from './pages/Users';
import Leads from './pages/Leads';
import LeadsTelecaller from './pages/LeadsTelecaller';
import LeadCounselor from './pages/LeadCounselor';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import StudentAttendance from './pages/StudentAttendance';
import DepartmentsPage from './modules/departments/DepartmentsPage';
import DeveloperReportPage from './pages/DeveloperReportPage';
import HodRdReportPage from './pages/HodRdReportPage';
import GraphicDesignerReportPage from './pages/GraphicDesignerReportPage';
import AcademicCounselorReportPage from './pages/AcademicCounselorReportPage';
import HrReportPage from './pages/HrReportPage';
import OpsReportPage from './pages/OpsReportPage';
import AccountantReportPage from './pages/AccountantReportPage';
import MarketingReportPage from './pages/MarketingReportPage';
import VideographerReportPage from './pages/VideographerReportPage';



// Route Guards
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const LandingRoute = () => {
  const token = localStorage.getItem('token');
  return token ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Auth Routes - No Sidebar */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Protected Routes - Wrapped in MainLayout */}
        <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/lead-dashboard" element={<ProtectedRoute><MainLayout><LeadDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/marketing-dashboard" element={<ProtectedRoute><MainLayout><MarketingDashboard /></MainLayout></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><MainLayout><Attendance /></MainLayout></ProtectedRoute>} />
        <Route path="/todo" element={<ProtectedRoute><MainLayout><Todo /></MainLayout></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute><MainLayout><Users /></MainLayout></ProtectedRoute>} />
        <Route path="/leads" element={<ProtectedRoute><MainLayout><Leads /></MainLayout></ProtectedRoute>} />
        <Route path="/leads-telecaller" element={<ProtectedRoute><MainLayout><LeadsTelecaller /></MainLayout></ProtectedRoute>} />
        <Route path="/lead-counselor" element={<ProtectedRoute><MainLayout><LeadCounselor /></MainLayout></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
        <Route path="/student-attendance" element={<ProtectedRoute><MainLayout><StudentAttendance /></MainLayout></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute><MainLayout><DepartmentsPage /></MainLayout></ProtectedRoute>} />
        <Route path="/developer-report" element={<ProtectedRoute><MainLayout><DeveloperReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/hod-rd-report" element={<ProtectedRoute><MainLayout><HodRdReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/graphic-designer-report" element={<ProtectedRoute><MainLayout><GraphicDesignerReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/academic-counselor-report" element={<ProtectedRoute><MainLayout><AcademicCounselorReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/hr-report" element={<ProtectedRoute><MainLayout><HrReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/ops-report" element={<ProtectedRoute><MainLayout><OpsReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/accountant-report" element={<ProtectedRoute><MainLayout><AccountantReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/marketing-report" element={<ProtectedRoute><MainLayout><MarketingReportPage /></MainLayout></ProtectedRoute>} />
        <Route path="/videographer-report" element={<ProtectedRoute><MainLayout><VideographerReportPage /></MainLayout></ProtectedRoute>} />



        {/* Default Landing Route */}
        <Route path="/" element={<LandingRoute />} />

        <Route path="/404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/404" />} />
      </Routes>
    </Router>
  );
}


export default App;