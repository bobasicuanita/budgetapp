import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/api';

/**
 * Custom hook to fetch wallets
 * This hook can be used across the entire app
 * React Query handles caching, refetching, and invalidation automatically
 */
export const useWallets = () => {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/wallets');
      
      if (!response.ok) {
        throw new Error('Failed to fetch wallets');
      }
      
      return response.json();
    },
    // Only fetch if user is authenticated
    // This will be handled by authenticatedFetch throwing on 401
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};
