import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { lazy, Suspense } from 'react'

import AppShell from './components/layout/AppShell'
import ProtectedRoute from './router/ProtectedRoute'

// Eagerly load auth + shell (needed immediately)
import LoginPage    from './features/auth/LoginPage'
import DashboardPage from './features/dashboards/DashboardPage'

// Lazy-load all other pages so the initial bundle is smaller
const LookupListPage       = lazy(() => import('./features/master-data/LookupListPage'))
const UserListPage          = lazy(() => import('./features/users/UserListPage'))
const CurriculumListPage    = lazy(() => import('./features/curriculum/CurriculumListPage'))
const CurriculumFormPage    = lazy(() => import('./features/curriculum/CurriculumFormPage'))
const CurriculumDetailPage  = lazy(() => import('./features/curriculum/CurriculumDetailPage'))
const RosterListPage        = lazy(() => import('./features/roster/RosterListPage'))
const LessonPlanListPage    = lazy(() => import('./features/lesson-plans/LessonPlanListPage'))
const LessonPlanFormPage    = lazy(() => import('./features/lesson-plans/LessonPlanFormPage'))
const LessonPlanDetailPage  = lazy(() => import('./features/lesson-plans/LessonPlanDetailPage'))
const WeeklyPlanPage        = lazy(() => import('./features/lesson-plans/WeeklyPlanPage'))
const TimetablePage         = lazy(() => import('./features/timetable/TimetablePage'))
const ReportsPage           = lazy(() => import('./features/reports/ReportsPage'))
const AcademicCalendarPage  = lazy(() => import('./features/academic-calendar/AcademicCalendarPage'))
const DomainsPage           = lazy(() => import('./features/domains/DomainsPage'))

// Minimal spinner shown while a chunk is loading
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64 text-neutral-400 text-sm">
      Loading…
    </div>
  )
}

// Wrap lazy pages in Suspense
function L({ component: Component }) {
  return <Suspense fallback={<PageLoader />}><Component /></Suspense>
}

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,   // keep unused cache for 5 min
    },
  },
})

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/', element: <Navigate to="/dashboard" replace /> },
  {
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { path: '/dashboard', element: <DashboardPage /> },
      {
        path: '/master-data',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><L component={LookupListPage} /></ProtectedRoute>,
      },
      {
        path: '/users',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><L component={UserListPage} /></ProtectedRoute>,
      },
      {
        path: '/curriculum',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><L component={CurriculumListPage} /></ProtectedRoute>,
      },
      {
        path: '/curriculum/new',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><L component={CurriculumFormPage} /></ProtectedRoute>,
      },
      {
        path: '/curriculum/:id/edit',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><L component={CurriculumFormPage} /></ProtectedRoute>,
      },
      {
        path: '/curriculum/:id',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><L component={CurriculumDetailPage} /></ProtectedRoute>,
      },
      {
        path: '/roster',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><L component={RosterListPage} /></ProtectedRoute>,
      },
      { path: '/lesson-plans', element: <L component={LessonPlanListPage} /> },
      { path: '/weekly-plan', element: <L component={WeeklyPlanPage} /> },
      {
        path: '/lesson-plans/new',
        element: <ProtectedRoute allowedRoles={['TEACHER']}><L component={LessonPlanFormPage} /></ProtectedRoute>,
      },
      { path: '/lesson-plans/:id', element: <L component={LessonPlanDetailPage} /> },
      {
        path: '/lesson-plans/:id/edit',
        element: <ProtectedRoute allowedRoles={['TEACHER']}><L component={LessonPlanFormPage} /></ProtectedRoute>,
      },
      { path: '/timetable', element: <L component={TimetablePage} /> },
      { path: '/domains', element: <L component={DomainsPage} /> },
      {
        path: '/reports',
        element: <ProtectedRoute allowedRoles={['ADMIN','HOD']}><L component={ReportsPage} /></ProtectedRoute>,
      },
      {
        path: '/academic-calendar',
        element: <ProtectedRoute allowedRoles={['ADMIN']}><L component={AcademicCalendarPage} /></ProtectedRoute>,
      },
    ],
  },
])

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  )
}
