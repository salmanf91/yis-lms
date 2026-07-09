import { useState, useRef, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useRole } from '../../hooks/useRole'
import { cn } from '../../utils/cn'

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icons = {
  dashboard: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  calendar: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  ),
  masterData: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7M4 7c0-2 1-3 3-3h10c2 0 3 1 3 3M4 7h16M9 11h6M9 15h4" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  curriculum: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  roster: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  lessonPlan: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  weeklyPlan: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  timetable: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
    </svg>
  ),
  reports: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  setup: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  chevron: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  ),
}

// ── Nav structure ──────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    type: 'link',
    label: 'Dashboard',
    path: '/dashboard',
    icon: Icons.dashboard,
    roles: ['ADMIN', 'HOD', 'TEACHER'],
  },
  {
    type: 'link',
    label: 'Domains',
    path: '/domains',
    icon: Icons.curriculum,
    roles: ['ADMIN', 'HOD', 'TEACHER'],
  },
  {
    type: 'group',
    label: 'Setup',
    icon: Icons.setup,
    roles: ['ADMIN'],
    children: [
      { label: 'Academic Calendar', path: '/academic-calendar', icon: Icons.calendar,  description: 'Manage academic weeks & terms' },
      { label: 'Master Data',       path: '/master-data',       icon: Icons.masterData, description: 'Grades, subjects, semesters' },
      { label: 'Users',             path: '/users',             icon: Icons.users,       description: 'Manage staff accounts' },
    ],
  },
  {
    type: 'link',
    label: 'Curriculum',
    path: '/curriculum',
    icon: Icons.curriculum,
    roles: ['ADMIN'],
  },
  {
    type: 'link',
    label: 'Roster',
    path: '/roster',
    icon: Icons.roster,
    roles: ['ADMIN'],
  },
  {
    type: 'link',
    label: 'Lesson Plans',
    path: '/lesson-plans',
    icon: Icons.lessonPlan,
    roles: ['ADMIN', 'HOD', 'TEACHER'],
  },
  {
    type: 'link',
    label: 'Weekly Plan',
    path: '/weekly-plan',
    icon: Icons.weeklyPlan,
    roles: ['ADMIN', 'HOD', 'TEACHER'],
  },
  {
    type: 'link',
    label: 'Timetable',
    path: '/timetable',
    icon: Icons.timetable,
    roles: ['ADMIN', 'HOD', 'TEACHER'],
  },
  {
    type: 'link',
    label: 'Reports',
    path: '/reports',
    icon: Icons.reports,
    roles: ['ADMIN', 'HOD'],
  },
]

// ── Dropdown group component ───────────────────────────────────────────────────
function NavDropdown({ group }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const location = useLocation()

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close when navigating
  useEffect(() => { setOpen(false) }, [location.pathname])

  const isAnyChildActive = group.children.some(c => location.pathname.startsWith(c.path))

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 select-none',
          isAnyChildActive
            ? 'bg-brand text-white shadow-sm'
            : open
              ? 'bg-neutral-100 text-neutral-800'
              : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
        )}
      >
        {group.icon}
        <span>{group.label}</span>
        <span className={cn('transition-transform duration-200', open && 'rotate-180', isAnyChildActive ? 'opacity-80' : 'opacity-60')}>
          {Icons.chevron}
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[220px] bg-white rounded-xl border border-neutral-200 shadow-lg shadow-neutral-200/60 py-1.5 overflow-hidden">
          {/* Arrow pointer */}
          <div className="absolute -top-1.5 left-5 w-3 h-3 bg-white border-l border-t border-neutral-200 rotate-45" />

          {group.children.map(item => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-start gap-3 px-4 py-2.5 mx-1.5 rounded-lg transition-all duration-100 group',
                  isActive
                    ? 'bg-brand/10 text-brand'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
                )}
              >
                <span className={cn(
                  'mt-0.5 flex-shrink-0 transition-colors',
                  isActive ? 'text-brand' : 'text-neutral-400 group-hover:text-neutral-600'
                )}>
                  {item.icon}
                </span>
                <div className="min-w-0">
                  <p className={cn('text-sm font-medium leading-none mb-0.5', isActive && 'text-brand')}>
                    {item.label}
                  </p>
                  <p className="text-xs text-neutral-400 leading-tight">{item.description}</p>
                </div>
                {isActive && (
                  <span className="ml-auto flex-shrink-0 w-1.5 h-1.5 rounded-full bg-brand mt-1" />
                )}
              </NavLink>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main NavBar ────────────────────────────────────────────────────────────────
export default function NavBar() {
  const { role } = useRole()

  return (
    <nav className="bg-white border-b border-neutral-200 sticky top-16 z-20">
      <div className="max-w-screen-xl mx-auto px-6">
        <div className="flex items-center gap-0.5 py-2">
          {NAV_GROUPS
            .filter(item => item.roles.includes(role))
            .map(item =>
              item.type === 'link' ? (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
                      isActive
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800'
                    )
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <NavDropdown key={item.label} group={item} />
              )
            )
          }
        </div>
      </div>
    </nav>
  )
}
