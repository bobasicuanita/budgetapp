import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import GuestRoute from '../components/GuestRoute';
import RootRedirect from '../components/RootRedirect';
import RequireOnboarding from '../components/RequireOnboarding';

// Page components
import Login from '../pages/Login';
import VerifyOtp from '../pages/VerifyOtp';
import Onboarding from '../pages/Onboarding';
import Dashboard from '../pages/Dashboard';
import Wallets from '../pages/Wallets';
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
        
        {/* ===== ONBOARDING (Protected, but no onboarding check) ===== */}
        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          } 
        />
        
        {/* ===== PROTECTED ROUTES (Require onboarding completed) ===== */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <Dashboard />
              </RequireOnboarding>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/wallets" 
          element={
            <ProtectedRoute>
              <RequireOnboarding>
                <Wallets />
              </RequireOnboarding>
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
