import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

function RequireOnboarding({ children }) {
  const token = localStorage.getItem('token');

  // Fetch onboarding status
  const { data, isLoading, error } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: async () => {
      const response = await fetch('http://localhost:5000/api/onboarding/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch onboarding status');
      }

      return response.json();
    },
    enabled: !!token, // Only run if token exists
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-1 flex items-center justify-center">
        <div className="text-center">
          <i className="pi pi-spin pi-spinner text-4xl text-blue-9 mb-4"></i>
          <p className="text-slate-11">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-1 flex items-center justify-center">
        <div className="text-center">
          <i className="pi pi-exclamation-triangle text-4xl text-red-9 mb-4"></i>
          <p className="text-slate-11">Failed to load. Please refresh.</p>
        </div>
      </div>
    );
  }

  // Redirect to onboarding if not completed
  if (!data?.completed) {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding complete, render children
  return children;
}

export default RequireOnboarding;
