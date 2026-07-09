import { useQuery } from '@tanstack/react-query'
import { getLookupsByType, getAllLookups } from '../api/lookup.api'

export function useLookupsByType(type) {
  return useQuery({
    queryKey: ['lookup', type],
    queryFn: () => getLookupsByType(type),
    staleTime: 10 * 60 * 1000,   // Lookups are nearly-static; cache for 10 min
  })
}

export function useAllLookups() {
  return useQuery({
    queryKey: ['lookup', 'all'],
    queryFn: getAllLookups,
    staleTime: 10 * 60 * 1000,   // Lookups are nearly-static; cache for 10 min
  })
}
