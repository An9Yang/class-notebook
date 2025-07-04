import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import NewClass from './components/NewClass';
import IntegratedClassRoom from './components/IntegratedClassRoom';
import ClassDetail from './components/ClassDetail';
import StructuredClassView from './components/StructuredClassView';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/class/new" 
              element={
                <PrivateRoute>
                  <IntegratedClassRoom />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/class/new-old" 
              element={
                <PrivateRoute>
                  <NewClass />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/class/:id" 
              element={
                <PrivateRoute>
                  <StructuredClassView />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/class/:id/old" 
              element={
                <PrivateRoute>
                  <ClassDetail />
                </PrivateRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
