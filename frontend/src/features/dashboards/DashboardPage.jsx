import { useRole } from '../../hooks/useRole'
import { useAuth } from '../../context/AuthContext'
import { useQuery } from '@tanstack/react-query'
import { getLessonPlans } from '../../api/lessonPlan.api'
import { getRoster } from '../../api/roster.api'
import { getAdminSummary, getHodSummary } from '../../api/report.api'
import { formatDate } from '../../utils/formatDate'
import { useCurrentAcademicWeek } from '../../hooks/useCurrentAcademicWeek'
import StatusBadge from '../../components/StatusBadge'
import { useNavigate } from 'react-router-dom'

function StatCard({ label, value, sub, color = 'brand', icon }) {
  const colors = {
    brand:  'bg-brand/10 text-brand',
    green:  'bg-green-100 text-green-600',
    blue:   'bg-blue-100 text-blue-600',
    amber:  'bg-amber-100 text-amber-600',
    red:    'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
  }
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-neutral-900">{value ?? '—'}</p>
        <p className="text-sm text-neutral-500">{label}</p>
        {sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function AdminDashboard() {
  const navigate = useNavigate()

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['adminSummary'],
    queryFn: getAdminSummary,
  })

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['lessonPlans', {}],
    queryFn: () => getLessonPlans({ limit: 100 }).then(r => r.data || r),
  })

  const { weekNo: academicWeek } = useCurrentAcademicWeek()
  const isLoading = summaryLoading || plansLoading
  const counts = summary?.plansByStatus || {}
  const currentWeek = summary?.currentWeek || academicWeek || '—'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Curriculum Entries" value={summary?.totalCurriculum} color="brand"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <StatCard label="Roster Assignments" value={summary?.totalRoster} color="blue"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        />
        <StatCard label="Pending Review" value={counts.SUBMITTED || 0} color="amber" sub="Awaiting HOD"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label={`Week ${currentWeek} Plans`} value={summary?.weekPlans} color="green" sub={`Current week`}
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Status Breakdown */}
      <div className="card p-5">
        <h3 className="font-semibold text-neutral-800 mb-4">Lesson Plans by Status</h3>
        <div className="grid grid-cols-4 gap-4">
          {['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(s => (
            <div key={s} className="text-center">
              <p className="text-3xl font-bold text-neutral-900">{counts[s] || 0}</p>
              <div className="mt-1"><StatusBadge status={s} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent plans */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-800">Recent Lesson Plans</h3>
          <button className="text-xs text-brand hover:underline" onClick={() => navigate('/lesson-plans')}>View all</button>
        </div>
        {isLoading ? (
          <div className="p-5 text-sm text-neutral-400">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Teacher', 'Grade', 'Subject', 'Week', 'Status', 'Submitted'].map(h => (
                  <th key={h} className="table-header">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plans.slice(0, 8).map(p => (
                <tr key={p._id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => navigate(`/lesson-plans/${p._id}`)}>
                  <td className="table-cell">{p.teacherId?.name || '—'}</td>
                  <td className="table-cell">{p.gradeId?.label || '—'}</td>
                  <td className="table-cell">{p.subjectId?.label || '—'}</td>
                  <td className="table-cell">Week {p.weekNo}</td>
                  <td className="table-cell"><StatusBadge status={p.status} /></td>
                  <td className="table-cell text-neutral-400">{formatDate(p.submittedAt)}</td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr><td colSpan={6} className="table-cell text-center text-neutral-400 py-8">No lesson plans yet</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function HodDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const { data: summary } = useQuery({
    queryKey: ['hodSummary'],
    queryFn: getHodSummary,
    enabled: !!(user?.userId || user?.id),
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['lessonPlans', { status: 'SUBMITTED' }],
    queryFn: () => getLessonPlans({ status: 'SUBMITTED', limit: 100 }).then(r => r.data || r),
  })

  const submitted = summary?.submitted ?? plans.filter(p => p.status === 'SUBMITTED').length
  const approved = summary?.approved ?? 0
  const rejected = summary?.rejected ?? 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Pending Review" value={submitted} color="amber"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Approved by Me" value={approved} color="green"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Rejected by Me" value={rejected} color="red"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-800">Pending Review Queue</h3>
          <button className="text-xs text-brand hover:underline" onClick={() => navigate('/lesson-plans?status=SUBMITTED')}>View all</button>
        </div>
        <table className="w-full">
          <thead>
            <tr>{['Teacher', 'Grade', 'Subject', 'Week', 'Topic', 'Submitted'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr><td colSpan={6} className="table-cell text-center text-neutral-400 py-8">No plans pending review</td></tr>
            ) : plans.map(p => (
              <tr key={p._id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => navigate(`/lesson-plans/${p._id}`)}>
                <td className="table-cell font-medium">{p.teacherId?.name || '—'}</td>
                <td className="table-cell">{p.gradeId?.label || '—'}</td>
                <td className="table-cell">{p.subjectId?.label || '—'}</td>
                <td className="table-cell">Week {p.weekNo}</td>
                <td className="table-cell">{p.topic}</td>
                <td className="table-cell text-neutral-400">{formatDate(p.submittedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TeacherDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { weekNo: currentWeek } = useCurrentAcademicWeek()

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['lessonPlans', { teacherId: (user?.userId || user?.id) }],
    queryFn: () => getLessonPlans({ teacherId: (user?.userId || user?.id), limit: 100 }).then(r => r.data || r),
    enabled: !!(user?.userId || user?.id),
  })

  const { data: roster = [] } = useQuery({
    queryKey: ['roster', { teacherId: (user?.userId || user?.id) }],
    queryFn: () => getRoster({ teacherId: (user?.userId || user?.id), limit: 999 })
      .then(r => (Array.isArray(r) ? r : r?.data ?? [])),
    enabled: !!(user?.userId || user?.id),
  })

  const counts = plans.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + 1; return acc }, {})

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Plans" value={plans.length} color="brand"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard label="Approved" value={counts.APPROVED || 0} color="green"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Pending Review" value={counts.SUBMITTED || 0} color="amber"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Rejected" value={counts.REJECTED || 0} color="red"
          icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* This week's roster */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-neutral-800">Week {currentWeek} — My Assignments</h3>
          <button className="btn-primary btn-sm" onClick={() => navigate('/lesson-plans/new')}>+ New Plan</button>
        </div>
        {roster.filter(r => r.isActive).length === 0 ? (
          <p className="text-sm text-neutral-400">No roster assignments found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roster.filter(r => r.isActive).map(slot => {
              const plan = plans.find(p =>
                p.weekNo === currentWeek &&
                (p.gradeId?._id || p.gradeId) === (slot.gradeId?._id || slot.gradeId) &&
                (p.subjectId?._id || p.subjectId) === (slot.subjectId?._id || slot.subjectId)
              )
              const borderColor = !plan ? 'border-l-amber-400' : plan.status === 'APPROVED' ? 'border-l-green-400' : 'border-l-blue-400'
              return (
                <div key={slot._id} className={`border border-neutral-200 border-l-4 ${borderColor} rounded-lg p-4`}>
                  <p className="font-medium text-neutral-800">{slot.subjectId?.label || '—'}</p>
                  <p className="text-sm text-neutral-500">{slot.gradeId?.label} · {slot.section}</p>
                  <p className="text-xs text-neutral-400 mt-1">{slot.day} · Period {slot.period}</p>
                  {plan ? <div className="mt-2"><StatusBadge status={plan.status} /></div> : (
                    <span className="badge bg-amber-100 text-amber-700 mt-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1" />No Plan
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My recent plans */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h3 className="font-semibold text-neutral-800">My Lesson Plans</h3>
          <button className="text-xs text-brand hover:underline" onClick={() => navigate('/lesson-plans')}>View all</button>
        </div>
        <table className="w-full">
          <thead>
            <tr>{['Grade', 'Subject', 'Week', 'Topic', 'Status'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="table-cell text-center py-8 text-neutral-400">Loading…</td></tr>
            ) : plans.slice(0, 6).map(p => (
              <tr key={p._id} className="hover:bg-neutral-50 cursor-pointer" onClick={() => navigate(`/lesson-plans/${p._id}`)}>
                <td className="table-cell">{p.gradeId?.label || '—'}</td>
                <td className="table-cell">{p.subjectId?.label || '—'}</td>
                <td className="table-cell">Week {p.weekNo}</td>
                <td className="table-cell font-medium">{p.topic}</td>
                <td className="table-cell"><StatusBadge status={p.status} /></td>
              </tr>
            ))}
            {!isLoading && plans.length === 0 && (
              <tr><td colSpan={5} className="table-cell text-center py-8 text-neutral-400">No plans yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { isAdmin, isHod, isTeacher } = useRole()
  const { user } = useAuth()

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
        </h2>
        <p className="text-neutral-500 text-sm mt-1">Here's what's happening today.</p>
      </div>
      {isAdmin && <AdminDashboard />}
      {isHod && <HodDashboard />}
      {isTeacher && <TeacherDashboard />}
    </div>
  )
}
