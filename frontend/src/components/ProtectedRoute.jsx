import { Navigate } from 'react-router-dom';

// Component to protect routes that require authentication
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  
  // If no token, redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // If token exists, render the protected component
  return children;
}

export default ProtectedRoute;
