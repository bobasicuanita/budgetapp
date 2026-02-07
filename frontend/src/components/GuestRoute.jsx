import { Navigate } from 'react-router-dom';

// Component for routes that should only be accessible to guests (not logged in)
// If user is logged in, redirect to dashboard
function GuestRoute({ children }) {
  const accessToken = localStorage.getItem('accessToken');
  
  // If access token exists, user is logged in - redirect to dashboard
  if (accessToken) {
    return <Navigate to="/dashboard" replace />;
  }
  
  // If no access token, user is guest - show the page
  return children;
}

export default GuestRoute;
