import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getCoverageReport, getComplianceReport } from '../../api/report.api'
import { getLessonPlans } from '../../api/lessonPlan.api'
import { getDepartments } from '../../api/user.api'
import { exportToCsv } from '../../utils/exportCsv'
import { useCurrentAcademicWeek } from '../../hooks/useCurrentAcademicWeek'
import PageHeader from '../../components/PageHeader'
import StatusBadge from '../../components/StatusBadge'
import Pagination from '../../components/Pagination'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { cn } from '../../utils/cn'

const STATUS_COLORS = {
  APPROVED:  '#16a34a',
  SUBMITTED: '#2563eb',
  DRAFT:     '#ca8a04',
  REJECTED:  '#dc2626',
  MISSING:   '#f97316',
}

const TABS = ['Coverage', 'Compliance', 'Pacing']

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('Coverage')
  const { weekNo: currentWeek } = useCurrentAcademicWeek()

  // Filters
  const [deptFilter, setDeptFilter] = useState('')

  // Pagination state — one set per tab
  const [coveragePage,     setCoveragePage]     = useState(1)
  const [coverageLimit,    setCoverageLimit]     = useState(10)
  const [compliancePage,   setCompliancePage]   = useState(1)
  const [complianceLimit,  setComplianceLimit]  = useState(10)

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    // Reset pages when switching tabs
    setCoveragePage(1)
    setCompliancePage(1)
  }

  // Data fetches
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: getDepartments, staleTime: 5 * 60_000 })

  const { data: coverageRows = [], isLoading: coverageLoading } = useQuery({
    queryKey: ['coverage'],
    queryFn: () => getCoverageReport({}),
  })

  const { data: complianceData = [], isLoading: complianceLoading } = useQuery({
    queryKey: ['compliance', deptFilter],
    queryFn: () => getComplianceReport(deptFilter ? { department: deptFilter } : {}),
  })

  const { data: plans = [] } = useQuery({
    queryKey: ['lessonPlans', {}],
    queryFn: () => getLessonPlans(),
  })

  // Pie chart data
  const statusCounts = coverageRows.reduce((acc, r) => {
    const s = r.planStatus || 'NO_PLAN'
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  const pieData = Object.entries(statusCounts)
    .filter(([name]) => name !== 'NO_PLAN')
    .map(([name, value]) => ({ name, value }))

  // ── Client-side pagination slices ──────────────────────────────────────────
  const coverageTotal     = coverageRows.length
  const coverageTotalPages = Math.max(1, Math.ceil(coverageTotal / coverageLimit))
  const coverageSlice     = coverageLimit >= 9999
    ? coverageRows
    : coverageRows.slice((coveragePage - 1) * coverageLimit, coveragePage * coverageLimit)

  const complianceTotal     = complianceData.length
  const complianceTotalPages = Math.max(1, Math.ceil(complianceTotal / complianceLimit))
  const complianceSlice     = complianceLimit >= 9999
    ? complianceData
    : complianceData.slice((compliancePage - 1) * complianceLimit, compliancePage * complianceLimit)

  const handleExport = () => {
    exportToCsv('coverage-report', coverageRows.map(r => ({
      Week: r.weekNo,
      Code: r.standardCode,
      Grade: r.grade?.label || '—',
      Subject: r.subject?.label || '—',
      Semester: r.semester?.label || '—',
      Status: r.planStatus,
      Teacher: r.teacher?.name || '—',
    })))
  }

  return (
    <div>
      <PageHeader title="Reports" subtitle="Curriculum coverage and teacher compliance analytics" />

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Coverage Tab ──────────────────────────────────────────────────────── */}
      {activeTab === 'Coverage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Pie */}
            <div className="card p-5">
              <h3 className="font-semibold text-neutral-800 mb-4">Plans by Status</h3>
              {coverageLoading ? (
                <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">Loading…</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Summary */}
            <div className="card p-5">
              <h3 className="font-semibold text-neutral-800 mb-4">Summary</h3>
              <div className="space-y-3">
                {Object.entries(statusCounts).map(([s, n]) => (
                  <div key={s} className="flex items-center justify-between">
                    {s === 'MISSING' ? (
                      <span className="badge bg-orange-100 text-orange-700">Behind</span>
                    ) : s === 'NO_PLAN' ? (
                      <span className="badge bg-neutral-100 text-neutral-500">No Plan</span>
                    ) : (
                      <StatusBadge status={s} />
                    )}
                    <span className="font-bold text-neutral-800">{n}</span>
                  </div>
                ))}
                {coverageRows.length === 0 && <p className="text-sm text-neutral-400">No coverage data yet.</p>}
              </div>
            </div>
          </div>

          {/* Coverage table with pagination */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-800">Curriculum Coverage</h3>
                {coverageTotal > 0 && (
                  <p className="text-xs text-neutral-400 mt-0.5">{coverageTotal} total entries</p>
                )}
              </div>
              <button className="btn-secondary btn-sm" onClick={handleExport}>Export CSV</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>{['Week', 'Code', 'Grade', 'Subject', 'Semester', 'Teacher', 'Status'].map(h =>
                    <th key={h} className="table-header">{h}</th>
                  )}</tr>
                </thead>
                <tbody>
                  {coverageLoading ? (
                    <tr><td colSpan={7} className="table-cell text-center py-10 text-neutral-400">Loading…</td></tr>
                  ) : coverageSlice.length === 0 ? (
                    <tr><td colSpan={7} className="table-cell text-center py-10 text-neutral-400">No curriculum data.</td></tr>
                  ) : coverageSlice.map((r, i) => (
                    <tr key={i} className="hover:bg-neutral-50">
                      <td className="table-cell font-medium">W{r.weekNo}</td>
                      <td className="table-cell font-mono text-xs text-brand">{r.standardCode}</td>
                      <td className="table-cell">{r.grade?.label || '—'}</td>
                      <td className="table-cell">{r.subject?.label || '—'}</td>
                      <td className="table-cell">{r.semester?.label || '—'}</td>
                      <td className="table-cell text-neutral-500">{r.teacher?.name || '—'}</td>
                      <td className="table-cell">
                        {r.planStatus === 'MISSING' ? (
                          <span className="badge bg-orange-100 text-orange-700">Behind</span>
                        ) : r.planStatus === 'NO_PLAN' ? (
                          <span className="badge bg-neutral-100 text-neutral-500">No Plan</span>
                        ) : (
                          <StatusBadge status={r.planStatus} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={coveragePage}
              totalPages={coverageTotalPages}
              total={coverageTotal}
              limit={coverageLimit}
              onPageChange={(p) => { setCoveragePage(p) }}
              onLimitChange={(l) => { setCoverageLimit(l); setCoveragePage(1) }}
            />
          </div>
        </div>
      )}

      {/* ── Compliance Tab ────────────────────────────────────────────────────── */}
      {activeTab === 'Compliance' && (
        <div className="space-y-6">
          {/* Compliance Filters */}
          <div className="card p-4 flex flex-wrap gap-3 items-center">
            <select className="select flex-1 min-w-36" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <button className="btn-secondary btn-sm" onClick={() => setDeptFilter('')}>Reset</button>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold text-neutral-800 mb-4">
              Teacher Compliance Rate — Week {currentWeek}
              {deptFilter && <span className="ml-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded font-medium">{deptFilter}</span>}
            </h3>
            {complianceLoading ? (
              <div className="h-48 flex items-center justify-center text-neutral-400 text-sm">Loading…</div>
            ) : complianceData.length === 0 ? (
              <p className="text-sm text-neutral-400">No roster data available.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={complianceData.map(t => ({ name: t.teacher?.name || '—', rate: t.complianceRate }))}
                  margin={{ left: 0 }}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Bar dataKey="rate" name="Compliance %" radius={[4, 4, 0, 0]}>
                    {complianceData.map((e, i) => (
                      <Cell key={i} fill={e.complianceRate >= 80 ? '#16a34a' : e.complianceRate >= 50 ? '#f89a20' : '#dc2626'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Compliance table with pagination */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-neutral-800">Per-Teacher Summary</h3>
                {complianceTotal > 0 && (
                  <p className="text-xs text-neutral-400 mt-0.5">{complianceTotal} teachers</p>
                )}
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr>{['Teacher', 'Department', 'Total Slots', 'Approved', 'Compliance'].map(h =>
                  <th key={h} className="table-header">{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {complianceLoading ? (
                  <tr><td colSpan={5} className="table-cell text-center py-8 text-neutral-400">Loading…</td></tr>
                ) : complianceSlice.length === 0 ? (
                  <tr><td colSpan={5} className="table-cell text-center py-8 text-neutral-400">No data.</td></tr>
                ) : complianceSlice.map((t, i) => (
                  <tr key={i} className="hover:bg-neutral-50">
                    <td className="table-cell font-medium">{t.teacher?.name || '—'}</td>
                    <td className="table-cell">
                      {t.teacher?.department ? (
                        <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-medium inline-block">
                          {t.teacher.department}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="table-cell">{t.totalSlots}</td>
                    <td className="table-cell">{t.approvedThisWeek}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${t.complianceRate}%`,
                              backgroundColor: t.complianceRate >= 80 ? '#16a34a' : t.complianceRate >= 50 ? '#f89a20' : '#dc2626'
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-10 text-right">{t.complianceRate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={compliancePage}
              totalPages={complianceTotalPages}
              total={complianceTotal}
              limit={complianceLimit}
              onPageChange={(p) => { setCompliancePage(p) }}
              onLimitChange={(l) => { setComplianceLimit(l); setCompliancePage(1) }}
            />
          </div>
        </div>
      )}

      {/* ── Pacing Tab ────────────────────────────────────────────────────────── */}
      {activeTab === 'Pacing' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h3 className="font-semibold text-neutral-800">Curriculum Pacing Overview</h3>
            <p className="text-xs text-neutral-400 mt-1">Green = approved, Amber = behind, White = upcoming</p>
          </div>
          <div className="overflow-x-auto p-5">
            <div className="grid grid-cols-1 gap-2">
              {Array.from({ length: 20 }, (_, i) => i + 1).map(week => {
                const weekRows = coverageRows.filter(r => r.weekNo === week)
                const isBehind = week < currentWeek
                const isCurrent = week === currentWeek

                return (
                  <div key={week} className={cn(
                    'flex items-center gap-4 px-4 py-3 rounded-lg border',
                    isCurrent ? 'border-brand bg-brand/5' : 'border-neutral-100 bg-white'
                  )}>
                    <div className="w-14 flex-shrink-0">
                      <p className="text-sm font-bold text-neutral-700">W{week}</p>
                      {isCurrent && <p className="text-xs text-brand">current</p>}
                    </div>
                    {weekRows.length === 0 ? (
                      <p className="text-xs text-neutral-300">No curriculum mapped</p>
                    ) : (
                      <div className="flex flex-wrap gap-2 flex-1">
                        {weekRows.map((r, idx) => {
                          const status = r.planStatus || (isBehind ? 'MISSING' : 'EMPTY')
                          const colorMap = {
                            APPROVED:  'bg-green-100 text-green-700 border-green-200',
                            SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200',
                            DRAFT:     'bg-amber-100 text-amber-700 border-amber-200',
                            MISSING:   'bg-orange-100 text-orange-700 border-orange-200',
                            NO_PLAN:   'bg-neutral-50 text-neutral-400 border-neutral-200',
                            EMPTY:     'bg-neutral-50 text-neutral-400 border-neutral-200',
                          }
                          return (
                            <span key={idx} className={cn('badge border text-xs', colorMap[status] || colorMap.EMPTY)}>
                              {r.standardCode} · {r.grade?.label}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
