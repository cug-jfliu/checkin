import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './pages/admin/Layout';
import AdminCheckins from './pages/admin/Checkins';
import AdminUsers from './pages/admin/Users';
import AdminWeekly from './pages/admin/Weekly';

import CheckinLayout from './pages/checkin/Layout';
import CheckinToday from './pages/checkin/Today';
import CheckinHistory from './pages/checkin/History';
import { useAuth } from './store/useAuth';

import Register from './pages/Register';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/checkin" replace />;

  return children;
}

function App() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground antialiased dark">
      <Routes>
        <Route path="/" element={<Navigate to="/checkin" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/checkin"
          element={
            <ProtectedRoute>
              <CheckinLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="today" replace />} />
          <Route path="today" element={<CheckinToday />} />
          <Route path="history" element={<CheckinHistory />} />
        </Route>
        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="checkins" replace />} />
          <Route path="checkins" element={<AdminCheckins />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="weekly" element={<AdminWeekly />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App;
