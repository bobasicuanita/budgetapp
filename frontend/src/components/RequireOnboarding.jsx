import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader } from '@mantine/core';
import { authenticatedFetch } from '../utils/api';

function RequireOnboarding({ children }) {
  const accessToken = localStorage.getItem('accessToken');

  // Fetch onboarding status
  const { data, isLoading, error } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/onboarding/status');

      if (!response.ok) {
        throw new Error('Failed to fetch onboarding status');
      }

      return response.json();
    },
    enabled: !!accessToken, // Only run if access token exists
    retry: 1,
    staleTime: 0, // Always fetch fresh data on mount
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes after unmount
  });

  // Loading state
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <Loader color="blue.9" size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return <div>Error loading. Please refresh.</div>;
  }

  // Redirect to onboarding if not completed
  if (!data?.completed) {
    return <Navigate to="/onboarding" replace />;
  }

  // Onboarding complete, render children
  return children;
}

export default RequireOnboarding;
