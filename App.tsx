
import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthService } from './services/authService';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { TaskProvider } from './contexts/TaskContext';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy load pages for code splitting
const TaskList = lazy(() => import('./pages/TaskList').then(m => ({ default: m.TaskList })));
const CreateTask = lazy(() => import('./pages/CreateTask').then(m => ({ default: m.CreateTask })));
const TaskDetail = lazy(() => import('./pages/TaskDetail').then(m => ({ default: m.TaskDetail })));
const FinishedTasks = lazy(() => import('./pages/FinishedTasks').then(m => ({ default: m.FinishedTasks })));
const Clients = lazy(() => import('./pages/Clients').then(m => ({ default: m.Clients })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Users = lazy(() => import('./pages/Users').then(m => ({ default: m.Users })));
const StatusSettingsPage = lazy(() => import('./pages/StatusSettings').then(m => ({ default: m.StatusSettings })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Login = lazy(() => import('./pages/Login'));

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = AuthService.isAuthenticated();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <TaskProvider>
          <HashRouter>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-screen">
                <LoadingSpinner size="large" text="جاري التحميل..." />
              </div>
            }>
              <Routes>
                {/* Public Route */}
                <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><TaskList /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/new" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><CreateTask /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/finished" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><FinishedTasks /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/clients" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><Clients /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><Products /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/users" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><Users /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/status-settings" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><StatusSettingsPage /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><Settings /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
              <Route path="/task/:id" element={
                <ProtectedRoute>
                  <Layout>
                    <ErrorBoundary><TaskDetail /></ErrorBoundary>
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </Suspense>
        </HashRouter>
      </TaskProvider>
    </SettingsProvider>
  </AuthProvider>
  );
};

export default App;
