import { Navigate } from 'react-router-dom';

// Smart redirect based on authentication status
function RootRedirect() {
  const token = localStorage.getItem('token');
  
  // If logged in, go to dashboard
  // If not logged in, go to login
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

export default RootRedirect;
