import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import GuestRoute from '../components/GuestRoute';
import RootRedirect from '../components/RootRedirect';

// Page components
import Login from '../pages/Login';
import VerifyOtp from '../pages/VerifyOtp';
import Dashboard from '../pages/Dashboard';
// import Settings from '../pages/Settings';
// import Budgets from '../pages/Budgets';
// import Transactions from '../pages/Transactions';
// import NotFound from '../pages/NotFound';

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ===== ROOT ===== */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* ===== PUBLIC ROUTES (Guest Only) ===== */}
        <Route 
          path="/login" 
          element={
            <GuestRoute>
              <Login />
            </GuestRoute>
          } 
        />
        <Route 
          path="/verify-otp" 
          element={
            <GuestRoute>
              <VerifyOtp />
            </GuestRoute>
          } 
        />
        
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
