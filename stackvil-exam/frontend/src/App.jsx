import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminCandidates from './pages/admin/Candidates';
import AdminExams from './pages/admin/Exams';
import AdminQuestions from './pages/admin/Questions';
import AdminReports from './pages/admin/Reports';
import AdminResultDetails from './pages/admin/ResultDetails';
import AdminSettings from './pages/admin/Settings';
import AdminLiveProctor from './pages/admin/LiveProctor';
import AdminCreateCustomExam from './pages/admin/CreateCustomExam';

// Candidate Pages
import CandidateProfile from './pages/candidate/Profile';
import CandidateInstructions from './pages/candidate/Instructions';
import CandidateExamRoom from './pages/candidate/ExamRoom';
import CandidateResultPage from './pages/candidate/ResultPage';

// Component Layouts
import AdminLayout from './components/AdminLayout';
import CandidateLayout from './components/CandidateLayout';
import LoadingSkeleton from './components/LoadingSkeleton';

// Protected Route Guard
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LoadingSkeleton type="page" />
      </div>
    );
  }

  if (!token || !user) {
    const isAdminRoute = window.location.pathname.startsWith('/admin');
    return <Navigate to={isAdminRoute ? "/login/admin" : "/login"} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If unauthorized, send to respective default entry pages
    return user.role === 'candidate' 
      ? <Navigate to="/candidate/profile" replace />
      : <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

// Redirect logged-in users away from auth pages
const PublicRoute = ({ children }) => {
  const { user, token, loading } = useAuth();

  if (loading) return null;

  if (token && user) {
    return user.role === 'candidate'
      ? <Navigate to="/candidate/profile" replace />
      : <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<PublicRoute><Login isAdmin={false} /></PublicRoute>} />
          <Route path="/login/admin" element={<PublicRoute><Login isAdmin={true} /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />

          {/* Admin Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="candidates" element={<AdminCandidates />} />
            <Route path="candidates/:candidateId/custom-exam" element={<AdminCreateCustomExam />} />
            <Route path="exams" element={<AdminExams />} />
            <Route path="questions" element={<AdminQuestions />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="results/:candidateId/:examId" element={<AdminResultDetails />} />
            <Route path="live-proctor" element={<AdminLiveProctor />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Candidate Protected Routes */}
          <Route
            path="/candidate"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<CandidateProfile />} />
            <Route path="instructions/:examId" element={<CandidateInstructions />} />
            <Route path="result/:resultId" element={<CandidateResultPage />} />
          </Route>

          {/* Special Fullscreen Candidate Exam Room (Guarded but no layout wrapper to maximize screen space) */}
          <Route
            path="/candidate/exam/:examId"
            element={
              <ProtectedRoute allowedRoles={['candidate']}>
                <CandidateExamRoom />
              </ProtectedRoute>
            }
          />

          {/* Catch All Redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
