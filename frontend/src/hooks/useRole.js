import { useAuth } from '../context/AuthContext'

export function useRole() {
  const { user } = useAuth()
  const role = user?.role
  return {
    role,
    isAdmin:      role === 'ADMIN',
    isHod:        role === 'HOD',
    isTeacher:    role === 'TEACHER',
    isAdminOrHod: role === 'ADMIN' || role === 'HOD',
  }
}
