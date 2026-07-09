import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTimetable } from '../../api/timetable.api'
import { getRoster } from '../../api/roster.api'
import { getLookupsByType } from '../../api/lookup.api'
import { useAuth } from '../../context/AuthContext'
import { useRole } from '../../hooks/useRole'
import { useCurrentAcademicWeek } from '../../hooks/useCurrentAcademicWeek'
import { cn } from '../../utils/cn'
import PageHeader from '../../components/PageHeader'
import { exportWeeklyPlanToExcel } from '../../utils/exportWeeklyPlan'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']

const CELL_STATUS = {
  APPROVED:  { cls: 'bg-green-50 border-green-200',    dot: 'bg-green-500',   label: 'Approved' },
  SUBMITTED: { cls: 'bg-blue-50 border-blue-200',      dot: 'bg-blue-500',    label: 'Submitted' },
  DRAFT:     { cls: 'bg-amber-50 border-amber-200',    dot: 'bg-amber-400',   label: 'Draft' },
  REJECTED:  { cls: 'bg-red-50 border-red-200',        dot: 'bg-red-400',     label: 'Rejected' },
  BEHIND:    { cls: 'bg-orange-50 border-orange-200',  dot: 'bg-orange-400',  label: 'Behind' },
  NO_PLAN:   { cls: 'bg-neutral-50 border-neutral-200', dot: null,            label: 'No Plan' },
}

export default function TimetablePage() {
  const { user } = useAuth()
  const { isTeacher, isAdmin } = useRole()
  const { weekNo: academicWeek } = useCurrentAcademicWeek()
  const currentWeek = academicWeek

  const [weekNo, setWeekNo] = useState(null)
  const [gradeFilter, setGradeFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('')
  // Admin "All Grades" tab state
  const [selectedGradeTab, setSelectedGradeTab] = useState(null)
  const [selectedSectionTab, setSelectedSectionTab] = useState(null)

  useEffect(() => {
    if (academicWeek && weekNo === null) setWeekNo(academicWeek)
  }, [academicWeek, weekNo])

  // Fetch teacher's roster if they're a teacher.
  const { data: teacherRoster = [] } = useQuery({
    queryKey: ['roster', { teacherId: user?.userId || user?.id }],
    queryFn: () => getRoster({ teacherId: user?.userId || user?.id, limit: 999 })
      .then(r => (Array.isArray(r) ? r : r?.data ?? [])),
    enabled: isTeacher && !!(user?.userId || user?.id),
  })

  // Auto-set grade for teachers (to their first assigned grade)
  useEffect(() => {
    if (isTeacher && teacherRoster.length > 0 && !gradeFilter) {
      const uniqueGrades = [...new Set(teacherRoster.map(r => r.gradeId?._id))]
      if (uniqueGrades.length > 0) setGradeFilter(uniqueGrades[0])
    }
  }, [isTeacher, teacherRoster, gradeFilter])

  const { data: grades = [] } = useQuery({
    queryKey: ['lookup', 'GRADE'],
    queryFn: () => getLookupsByType('GRADE'),
  })
  const { data: semesters = [] } = useQuery({
    queryKey: ['lookup', 'SEMESTER'],
    queryFn: () => getLookupsByType('SEMESTER'),
  })
  const { data: sectionLookups = [] } = useQuery({
    queryKey: ['lookup', 'SECTION'],
    queryFn: () => getLookupsByType('SECTION'),
  })

  // For teachers, get only their assigned grades
  const availableGrades = isTeacher
    ? grades.filter(g => teacherRoster.some(r => r.gradeId?._id === g._id))
    : grades

  const teacherReady = !isTeacher || (teacherRoster.length > 0 && !!gradeFilter)

  // Admin "All Grades" mode: grade tabs from the grades list
  const isViewingAllGrades = isAdmin && !gradeFilter

  // When switching to "All Grades" mode, auto-select first grade tab
  useEffect(() => {
    if (isViewingAllGrades && grades.length > 0 && !selectedGradeTab) {
      const firstActive = grades.filter(g => g.isActive).sort((a, b) => a.order - b.order)[0]
      if (firstActive) setSelectedGradeTab(firstActive._id)
    }
    if (!isViewingAllGrades) {
      setSelectedGradeTab(null)
      setSelectedSectionTab(null)
    }
  }, [isViewingAllGrades, grades, selectedGradeTab])

  // Reset section tab when grade tab changes
  useEffect(() => {
    setSelectedSectionTab(null)
  }, [selectedGradeTab])

  // Effective grade for the API
  const effectiveGradeId = gradeFilter || selectedGradeTab

  // In grade-tab mode, NEVER pass section to the API — always fetch all sections
  // and filter client-side so switching tabs doesn't lose the list of available sections.
  const apiSection = isViewingAllGrades ? undefined : sectionFilter

  const { data, isLoading } = useQuery({
    queryKey: ['timetable', { weekNo, gradeId: effectiveGradeId, section: apiSection, semesterId: semesterFilter, teacherId: isTeacher ? (user?.userId || user?.id) : undefined }],
    queryFn: () => getTimetable({
      weekNo,
      ...(effectiveGradeId && { gradeId: effectiveGradeId }),
      ...(apiSection && { section: apiSection }),
      ...(semesterFilter && { semesterId: semesterFilter }),
      ...(isTeacher && (user?.userId || user?.id) && { teacherId: (user?.userId || user?.id) }),
    }),
    enabled: weekNo !== null && teacherReady && !!effectiveGradeId,
  })

  const grid = data?.grid || {}
  const periods = data?.periods || []
  const days = data?.days || DAYS

  // Derive available sections from the full (unfiltered) roster returned for this grade
  const gradeTabSections = useMemo(() => {
    if (!isViewingAllGrades || !selectedGradeTab) return []
    const seen = new Set()
    ;(data?.roster || []).forEach(r => { if (r.section) seen.add(r.section) })
    return Array.from(seen).sort()
  }, [isViewingAllGrades, selectedGradeTab, data?.roster])

  // Auto-select first section tab when sections first load for a grade
  useEffect(() => {
    if (isViewingAllGrades && gradeTabSections.length > 0 && !selectedSectionTab) {
      setSelectedSectionTab(gradeTabSections[0])
    }
  }, [isViewingAllGrades, gradeTabSections, selectedSectionTab])

  // Build display grid — always filter client-side
  const displayGrid = useMemo(() => {
    const activeSection = isViewingAllGrades ? selectedSectionTab : sectionFilter
    const filtered = {}
    Object.entries(grid).forEach(([day, dayPeriods]) => {
      filtered[day] = {}
      Object.entries(dayPeriods).forEach(([period, cells]) => {
        const arr = Array.isArray(cells) ? cells : [cells]
        const match = activeSection
          ? arr.find(c => c.section === activeSection)
          : arr[0]
        if (match) filtered[day][period] = match
      })
    })
    return filtered
  }, [grid, isViewingAllGrades, selectedSectionTab, sectionFilter])

  const gradeTabs = grades.filter(g => g.isActive).sort((a, b) => a.order - b.order)

  return (
    <div>
      <PageHeader
        title="Timetable"
        subtitle="Weekly Brown Sheet — lesson plan compliance view"
        action={
          <button
            className="btn-primary"
            disabled={!effectiveGradeId || !data?.roster?.length}
            onClick={() => {
              const gradeLabel = grades.find(g => g._id === effectiveGradeId)?.label || ''
              const semesterLabel = semesters.find(s => s._id === semesterFilter)?.label || ''
              exportWeeklyPlanToExcel(data, weekNo, gradeLabel, effectiveSection || '', semesterLabel)
            }}
          >
            Export to Excel
          </button>
        }
      />

      {/* Controls */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setWeekNo(w => Math.max(1, w - 1))}>←</button>
          <span className="font-semibold text-neutral-700 w-24 text-center">
            Week {weekNo}
            {weekNo === currentWeek && <span className="text-xs text-brand ml-1">(current)</span>}
          </span>
          <button className="btn-secondary btn-sm" onClick={() => setWeekNo(w => Math.min(52, w + 1))}>→</button>
        </div>

        <select className="select w-44" value={gradeFilter} onChange={e => { setGradeFilter(e.target.value); setSelectedGradeTab(null); setSelectedSectionTab(null) }}>
          {isAdmin && <option value="">All Grades</option>}
          {availableGrades.filter(g => g.isActive).sort((a, b) => a.order - b.order).map(g =>
            <option key={g._id} value={g._id}>{g.label}</option>
          )}
        </select>

        {/* Section dropdown — shown only in single-grade or teacher view */}
        {!isViewingAllGrades && (
          <select className="select w-40" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
            <option value="">All Sections</option>
            {sectionLookups.filter(s => s.isActive).sort((a, b) => a.order - b.order).map(s =>
              <option key={s._id} value={s.code}>{s.label}</option>
            )}
          </select>
        )}

        <select className="select w-48" value={semesterFilter} onChange={e => setSemesterFilter(e.target.value)}>
          <option value="">All Semesters</option>
          {semesters.filter(s => s.isActive).sort((a, b) => a.order - b.order).map(s =>
            <option key={s._id} value={s._id}>{s.label}</option>
          )}
        </select>

        <button
          className="btn-secondary btn-sm ml-auto"
          onClick={() => { setGradeFilter(''); setSectionFilter(''); setSemesterFilter(''); setWeekNo(currentWeek); setSelectedGradeTab(null); setSelectedSectionTab(null) }}
        >
          Reset
        </button>
      </div>

      {/* Admin "All Grades" tabs */}
      {isViewingAllGrades && (
        <div className="card p-0 mb-4 overflow-hidden">
          {/* Grade tabs */}
          <div className="flex flex-wrap border-b border-neutral-200 px-2 pt-1 bg-neutral-50">
            {gradeTabs.map(tab => (
              <button
                key={tab._id}
                onClick={() => setSelectedGradeTab(tab._id)}
                className={cn(
                  'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                  selectedGradeTab === tab._id
                    ? 'border-brand text-brand bg-white'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Section sub-tabs */}
          {gradeTabSections.length > 0 && (
            <div className="flex items-center gap-1 px-4 py-2 bg-white border-b border-neutral-100">
              <span className="text-xs text-neutral-400 mr-2">Section:</span>
              {gradeTabSections.map(sec => (
                <button
                  key={sec}
                  onClick={() => setSelectedSectionTab(sec)}
                  className={cn(
                    'px-3 py-1 text-xs font-semibold rounded-full border transition-colors',
                    selectedSectionTab === sec
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white text-neutral-600 border-neutral-200 hover:border-brand hover:text-brand'
                  )}
                >
                  {sec}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4">
        {Object.entries(CELL_STATUS).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs text-neutral-600">
            <span className={`w-2.5 h-2.5 rounded-full ${v.dot || 'bg-neutral-300'}`} />
            {v.label}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="card p-12 text-center text-neutral-400">Loading timetable…</div>
      ) : !effectiveGradeId ? (
        <div className="card p-12 text-center text-neutral-400">
          <p>Select a grade to view the timetable.</p>
        </div>
      ) : periods.length === 0 ? (
        <div className="card p-12 text-center text-neutral-400">
          <p>No roster entries found.</p>
          <p className="text-xs mt-1">Add roster assignments to see the timetable.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-neutral-900">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-400 uppercase w-20">Period</th>
                  {days.map(d => (
                    <th key={d} className="px-4 py-3 text-left text-xs font-semibold text-white uppercase">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => (
                  <tr key={period} className="border-t border-neutral-100">
                    <td className="px-4 py-3 text-sm font-semibold text-neutral-500 bg-neutral-50">P{period}</td>
                    {days.map(day => {
                      const cell = displayGrid[day]?.[period]
                      if (!cell) return (
                        <td key={day} className="px-3 py-3 border-l border-neutral-100">
                          <div className="text-xs text-neutral-300 text-center">—</div>
                        </td>
                      )
                      const status = cell.complianceStatus || 'NO_PLAN'
                      const cfg = CELL_STATUS[status] || CELL_STATUS.NO_PLAN
                      return (
                        <td key={day} className="px-3 py-2 border-l border-neutral-100">
                          <div className={cn('rounded-lg border p-2 min-h-16', cfg.cls)}>
                            <p className="text-xs font-semibold text-neutral-800 leading-tight">
                              {cell.subject?.label || '—'}
                            </p>
                            <p className="text-xs text-neutral-500 mt-0.5">
                              {cell.teacher?.name || '—'}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {cell.startTime}–{cell.endTime}
                            </p>
                            {cell.plan?.topic && (
                              <p className="text-xs text-neutral-600 mt-1 truncate" title={cell.plan.topic}>
                                {cell.plan.topic}
                              </p>
                            )}
                            <div className="flex items-center gap-1 mt-1.5">
                              {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
                              <span className="text-xs text-neutral-500">{cfg.label}</span>
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
