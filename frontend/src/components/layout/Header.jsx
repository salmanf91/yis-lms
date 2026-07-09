import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { cn } from '../../utils/cn'

const ROLE_BADGE = {
  ADMIN:   { cls: 'bg-purple-100 text-purple-700', label: 'Admin' },
  HOD:     { cls: 'bg-blue-100 text-blue-700',     label: 'HOD' },
  TEACHER: { cls: 'bg-green-100 text-green-700',   label: 'Teacher' },
}

export default function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const role = user?.role
  const badge = ROLE_BADGE[role] || {}

  return (
    <header className="bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between gap-6">

        {/* Brand */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <svg width="40" height="29" viewBox="0 0 186 133" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M74.5079 64.1778L63.9134 84.1374V104.174H80.826V83.1778L88.1843 70.7414L74.5079 64.1778Z" fill="#676767"/>
            <path d="M33.8637 34.5838L39.9507 21.303L53.3575 27.0606L47.5787 40.8788L33.8637 34.5838Z" fill="#F89A20"/>
            <path d="M43.2254 6.90909L54.4747 0L64.3372 16.0061L53.3575 23.0303L43.2254 6.90909Z" fill="#EE2726"/>
            <path d="M54.5903 40.8788L60.4847 27.7131L74.1226 33.6626L68.1897 47.2505L54.5903 40.8788Z" fill="#F89A20"/>
            <path d="M83.0605 36.2727L94.3869 29.4788L84.2933 13.396L73.198 20.4202L83.0605 36.2727Z" fill="#EE2726"/>
            <path d="M94.3869 38.7293L100.397 25.2566L113.534 31.0525L107.948 44.5636L94.3869 38.7293Z" fill="#F89A20"/>
            <path d="M111.377 25.2566L117.155 11.5152L130.755 17.4646L124.86 31.0525L111.377 25.2566Z" fill="#F89A20"/>
            <path d="M102.862 47.6727L117.309 49.3616L115.807 64.1778L100.782 62.4505L102.862 47.6727Z" fill="#F89A20"/>
            <path d="M77.3973 59.2646L90.0336 65.9818L98.9714 49.5535L86.181 42.7596L77.3973 59.2646Z" fill="#676767"/>
            <path d="M43.6106 50.0141H63.9134L69.7693 62.1434L60.9855 78.8404L43.6106 50.0141Z" fill="#676767"/>
            <path d="M5.23944 20.8424L19.2626 26.9455L13.5994 40.2263L0 34.3151L5.23944 20.8424Z" fill="#F89A20"/>
            <path d="M16.065 43.6424L23.8471 33.1636L39.0646 44.2949L31.321 54.9273L16.065 43.6424Z" fill="#EE2726"/>
            <path d="M16.8741 22.4545L23.1922 8.86667L36.522 14.7778L30.7432 28.4424L16.8741 22.4545Z" fill="#F89A20"/>
          </svg>

          <div>
            <p className="text-sm font-bold text-neutral-900 leading-none tracking-wide">YENEPOYA</p>
            <p className="text-[10px] text-neutral-400 tracking-widest uppercase leading-tight mt-0.5">International School</p>
          </div>

          <div className="h-5 w-px bg-neutral-200 mx-1" />

          <span className="text-[11px] font-semibold text-brand bg-brand/10 px-2 py-0.5 rounded-md tracking-wide">
            LMS
          </span>
        </div>

        {/* Right: user */}
        <div className="flex items-center gap-3">
          {/* Name + role */}
          <div className="hidden md:flex flex-col items-end gap-0.5">
            <p className="text-sm font-semibold text-neutral-800 leading-none">{user?.name}</p>
            {badge.label && (
              <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', badge.cls)}>
                {badge.label}
              </span>
            )}
          </div>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>

          {/* Sign out */}
          <button
            onClick={handleLogout}
            title="Sign out"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  )
}
