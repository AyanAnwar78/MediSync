import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import RoleRedirect from './routes/RoleRedirect';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import AdminDashboard from './pages/admin/AdminDashboard';
import DoctorsManagementPage from './pages/admin/DoctorsManagementPage';
import DepartmentsManagementPage from './pages/admin/DepartmentsManagementPage';
import PatientsManagementPage from './pages/admin/PatientsManagementPage';
import AppointmentsMonitorPage from './pages/admin/AppointmentsMonitorPage';
import SchedulesLeavesPage from './pages/admin/SchedulesLeavesPage';

import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorAppointmentsPage from './pages/doctor/DoctorAppointmentsPage';
import DoctorSchedulePage from './pages/doctor/DoctorSchedulePage';
import DoctorLeavesPage from './pages/doctor/DoctorLeavesPage';

import PatientDashboard from './pages/patient/PatientDashboard';
import SmartBookingPage from './pages/patient/SmartBookingPage';
import DoctorsDirectoryPage from './pages/patient/DoctorsDirectoryPage';
import PatientAppointmentsPage from './pages/patient/PatientAppointmentsPage';
import PatientProfilePage from './pages/patient/PatientProfilePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<DoctorsManagementPage />} />
            <Route path="/admin/departments" element={<DepartmentsManagementPage />} />
            <Route path="/admin/patients" element={<PatientsManagementPage />} />
            <Route path="/admin/appointments" element={<AppointmentsMonitorPage />} />
            <Route path="/admin/schedules-leaves" element={<SchedulesLeavesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Doctor']} />}>
            <Route path="/doctor" element={<DoctorDashboard />} />
            <Route path="/doctor/appointments" element={<DoctorAppointmentsPage />} />
            <Route path="/doctor/schedule" element={<DoctorSchedulePage />} />
            <Route path="/doctor/leaves" element={<DoctorLeavesPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Patient']} />}>
            <Route path="/patient" element={<PatientDashboard />} />
            <Route path="/patient/smart-booking" element={<SmartBookingPage />} />
            <Route path="/patient/doctors" element={<DoctorsDirectoryPage />} />
            <Route path="/patient/appointments" element={<PatientAppointmentsPage />} />
            <Route path="/patient/profile" element={<PatientProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

