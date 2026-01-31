import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';

// Page components (you'll create these)
// import SignUp from '../pages/SignUp';
import Login from '../pages/Login';
import Dashboard from '../pages/Dashboard';
// import Settings from '../pages/Settings';
// import Budgets from '../pages/Budgets';
// import Transactions from '../pages/Transactions';
// import NotFound from '../pages/NotFound';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ===== PUBLIC ROUTES ===== */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        {/* <Route path="/signup" element={<SignUp />} /> */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-email" element={<div>Email Verification Page</div>} />
        <Route path="/forgot-password" element={<div>Forgot Password Page</div>} />
        <Route path="/reset-password" element={<div>Reset Password Page</div>} />
        
        {/* ===== PROTECTED ROUTES ===== */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        /> */}
        
        {/* <Route 
          path="/budgets" 
          element={
            <ProtectedRoute>
              <Budgets />
            </ProtectedRoute>
          } 
        /> */}
        
        {/* <Route 
          path="/transactions" 
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          } 
        /> */}
        
        {/* ===== 404 NOT FOUND ===== */}
        {/* <Route path="*" element={<NotFound />} /> */}
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
