import { useQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/api';

/**
 * Custom hook to fetch reference data (categories, tags, suggestions)
 * This hook can be used across the entire app
 * React Query handles caching automatically
 */
export const useReferenceData = () => {
  return useQuery({
    queryKey: ['reference-data'],
    queryFn: async () => {
      const response = await authenticatedFetch('/api/user/reference-data');
      
      if (!response.ok) {
        throw new Error('Failed to fetch reference data');
      }
      
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // Consider data fresh for 10 minutes (categories/tags change rarely)
    refetchOnWindowFocus: false,
  });
};
