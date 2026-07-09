import { useQuery } from '@tanstack/react-query'
import { getCurrentAcademicWeek } from '../api/academicYear.api'

/**
 * Returns the current academic week number from the active academic calendar.
 * Falls back to ISO calendar week only if outside academic session or API fails.
 */
export function useCurrentAcademicWeek() {
  const { data, isLoading } = useQuery({
    queryKey: ['currentAcademicWeek'],
    queryFn: getCurrentAcademicWeek,
    staleTime: 5 * 60 * 1000, // cache 5 min — week doesn't change that fast
  })

  return {
    weekNo: data?.weekNo ?? null,
    semesterCode: data?.semesterCode ?? null,
    semesterName: data?.semesterName ?? null,
    inSession: data?.inSession ?? false,
    isLoading,
  }
}
