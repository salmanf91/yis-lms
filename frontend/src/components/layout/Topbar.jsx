import { useLocation } from 'react-router-dom'

const TITLES = {
  '/dashboard':    'Dashboard',
  '/master-data':  'Master Data',
  '/users':        'Users',
  '/curriculum':   'Curriculum',
  '/roster':       'Roster',
  '/lesson-plans': 'Lesson Plans',
  '/timetable':    'Timetable',
  '/reports':      'Reports',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const base = '/' + pathname.split('/')[1]
  const title = TITLES[base] || 'YIS LMS'

  return (
    <header className="h-16 bg-white border-b border-neutral-200 px-6 flex items-center justify-between sticky top-0 z-10">
      <h1 className="text-lg font-semibold text-neutral-800">{title}</h1>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-green-400" />
        <span className="text-xs text-neutral-500">Connected</span>
      </div>
    </header>
  )
}
