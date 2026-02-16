import { useInfiniteQuery } from '@tanstack/react-query';
import { authenticatedFetch } from '../utils/api';

export const useTransactions = (filters = {}) => {
  return useInfiniteQuery({
    queryKey: ['transactions', filters],
    queryFn: async ({ pageParam = 1, signal }) => {
      // Build query string from filters
      const params = new URLSearchParams();
      
      // Add page parameter
      params.append('page', pageParam.toString());
      params.append('per_page', '30');
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      
      const queryString = params.toString();
      const url = `/api/transactions${queryString ? `?${queryString}` : ''}`;
      
      // Pass the AbortSignal to cancel previous requests
      const response = await authenticatedFetch(url, { signal });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      return response.json();
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      // Return next page number if there are more pages, otherwise undefined
      if (lastPage.pagination.has_next) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    refetchOnWindowFocus: false,
  });
};
