import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getLessonPlans } from '../../api/lessonPlan.api'
import { getLookupsByType } from '../../api/lookup.api'
import { getDepartments } from '../../api/user.api'
import { useRole } from '../../hooks/useRole'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import Pagination from '../../components/Pagination'
import { formatDate } from '../../utils/formatDate'
import { cn } from '../../utils/cn'

const STATUSES = ['DRAFT','SUBMITTED','APPROVED','REJECTED']

export default function LessonPlanListPage() {
  const navigate = useNavigate()
  const { isTeacher, isHod, isAdmin } = useRole()
  const { user } = useAuth()
  const [filters, setFilters] = useState({ gradeId: '', subjectId: '', semesterId: '', weekNo: '', status: '', department: '' })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  useEffect(() => setPage(1), [filters])

  const { data: grades = [] } = useQuery({ queryKey: ['lookup', 'GRADE'], queryFn: () => getLookupsByType('GRADE') })
  const { data: subjects = [] } = useQuery({ queryKey: ['lookup', 'SUBJECT'], queryFn: () => getLookupsByType('SUBJECT') })
  const { data: semesters = [] } = useQuery({ queryKey: ['lookup', 'SEMESTER'], queryFn: () => getLookupsByType('SEMESTER') })
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: getDepartments, staleTime: 5 * 60_000 })

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
  const { data: result = {}, isLoading } = useQuery({
    queryKey: ['lessonPlans', activeFilters, page, limit],
    queryFn: () => getLessonPlans({ ...activeFilters, page, limit }),
  })
  const data = result.data || []

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }))

  return (
    <div>
      <PageHeader
        title="Lesson Plans"
        subtitle="Track weekly lesson plans across grades and subjects"
        action={isTeacher && (
          <button className="btn-primary" onClick={() => navigate('/lesson-plans/new')}>+ New Plan</button>
        )}
      />

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="select flex-1 min-w-36" value={filters.gradeId} onChange={e => setFilter('gradeId', e.target.value)}>
          <option value="">All Grades</option>
          {grades.filter(g => g.isActive).sort((a,b) => a.order-b.order).map(g => <option key={g._id} value={g._id}>{g.label}</option>)}
        </select>
        <select className="select flex-1 min-w-36" value={filters.subjectId} onChange={e => setFilter('subjectId', e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.filter(s => s.isActive).sort((a,b) => a.order-b.order).map(s => <option key={s._id} value={s._id}>{s.label}</option>)}
        </select>
        <select className="select flex-1 min-w-36" value={filters.semesterId} onChange={e => setFilter('semesterId', e.target.value)}>
          <option value="">All Semesters</option>
          {semesters.filter(s => s.isActive).sort((a,b) => a.order-b.order).map(s => <option key={s._id} value={s._id}>{s.label}</option>)}
        </select>
        <input type="number" className="input w-28" placeholder="Week" min={1} max={52}
          value={filters.weekNo} onChange={e => setFilter('weekNo', e.target.value)} />
        <select className="select w-40" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {(!isTeacher) && (
          <select className="select flex-1 min-w-36" value={filters.department} onChange={e => setFilter('department', e.target.value)}>
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <button className="btn-secondary btn-sm" onClick={() => setFilters({ gradeId: '', subjectId: '', semesterId: '', weekNo: '', status: '', department: '' })}>
          Reset
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-neutral-400">Loading…</div> : (
          <table className="w-full">
            <thead>
              <tr>
                {!isTeacher && <th className="table-header">Teacher</th>}
                <th className="table-header">Grade</th>
                <th className="table-header">Subject</th>
                <th className="table-header">Week</th>
                <th className="table-header">Topic</th>
                <th className="table-header">Status</th>
                <th className="table-header">Submitted</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={isTeacher ? 7 : 8} className="table-cell text-center py-12 text-neutral-400">No lesson plans found.</td></tr>
              ) : data.map(p => (
                <tr key={p._id} className="hover:bg-neutral-50">
                  {!isTeacher && (
                    <td className="table-cell">
                      <p className="font-medium text-neutral-800">{p.teacherId?.name || '—'}</p>
                      {p.teacherId?.department && (
                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block">
                          {p.teacherId.department}
                        </span>
                      )}
                    </td>
                  )}
                  <td className="table-cell">{p.gradeId?.label || '—'}</td>
                  <td className="table-cell">{p.subjectId?.label || '—'}</td>
                  <td className="table-cell text-center font-medium">W{p.weekNo}</td>
                  <td className="table-cell max-w-xs">
                    <p className="truncate">{p.topic}</p>
                  </td>
                  <td className="table-cell"><StatusBadge status={p.status} /></td>
                  <td className="table-cell text-neutral-400 text-xs">{formatDate(p.submittedAt)}</td>
                  <td className="table-cell">
                    <div className="flex gap-1 flex-wrap">
                      <button className="btn-ghost btn-sm" onClick={() => navigate(`/lesson-plans/${p._id}`)}>View</button>
                      {isTeacher && (p.status === 'DRAFT' || p.status === 'REJECTED') && (
                        <button
                          className={`btn-ghost btn-sm ${p.status === 'REJECTED' ? 'text-red-600' : 'text-brand'}`}
                          onClick={() => navigate(`/lesson-plans/${p._id}/edit`)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={result.totalPages} total={result.total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>
    </div>
  )
}
