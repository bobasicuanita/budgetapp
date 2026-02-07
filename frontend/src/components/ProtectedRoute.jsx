import { Navigate } from 'react-router-dom';

// Component to protect routes that require authentication
function ProtectedRoute({ children }) {
  const accessToken = localStorage.getItem('accessToken');
  
  // If no access token, redirect to login
  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }
  
  // If access token exists, render the protected component
  return children;
}

export default ProtectedRoute;
