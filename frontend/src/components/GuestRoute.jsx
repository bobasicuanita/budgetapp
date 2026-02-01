import { Navigate } from 'react-router-dom';

// Component for routes that should only be accessible to guests (not logged in)
// If user is logged in, redirect to dashboard
function GuestRoute({ children }) {
  const token = localStorage.getItem('token');
  
  // If token exists, user is logged in - redirect to dashboard
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If no token, user is guest - show the page
  return children;
}

export default GuestRoute;
