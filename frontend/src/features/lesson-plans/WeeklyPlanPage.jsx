import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { getLessonPlans } from '../../api/lessonPlan.api'
import { getRoster } from '../../api/roster.api'
import { getLookupsByType } from '../../api/lookup.api'
import { useAuth } from '../../context/AuthContext'
import { useRole } from '../../hooks/useRole'
import PageHeader from '../../components/PageHeader'
import { useCurrentAcademicWeek } from '../../hooks/useCurrentAcademicWeek'
import { cn } from '../../utils/cn'
import api from '../../api/axios'
import { toast } from 'sonner'

const DAY_ORDER = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4 }
const DAYS      = Object.keys(DAY_ORDER)
const DAY_SHORT = { Sunday: 'SUN', Monday: 'MON', Tuesday: 'TUE', Wednesday: 'WED', Thursday: 'THU' }

// Soft pastel subject header colors — cycling per subject slot
const SUBJ_BG = [
  '#FEF3C7', '#FFEDD5', '#FEF9C3', '#DCFCE7',
  '#DBEAFE', '#EDE9FE', '#FCE7F3', '#F0FDF4',
]

// ── Weekly Plan Import Modal ──────────────────────────────────────────────────
function parseWeekNo(raw) {
  const n = parseInt(String(raw ?? '').replace(/^W[\s]*/i, ''), 10)
  return isNaN(n) ? null : n
}

function normaliseSemLabel(raw) {
  const num = String(raw ?? '').replace(/^(semester|sem|term|s)\s*0*/i, '').replace(/\D/g, '')
  return num ? `Semester ${num}` : 'Semester 1'
}

// Map short day names from file → full names used in roster
const DAY_NAME_MAP = {
  sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  sunday: 'Sunday', monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
}

function parseWeeklyPlanFile(e) {
  const wb = XLSX.read(e.target.result, { type: 'array' })

  // Aggregate per grade+subject+semester+week+day
  // key = `grade||subject||semester||week||day`
  const agg = {}

  for (const sheetName of wb.SheetNames) {
    if (sheetName === 'ALL_DATA') continue

    const sheetRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: null })

    // Find header row (must contain 'week')
    let headerIdx = -1
    for (let i = 0; i < Math.min(sheetRows.length, 8); i++) {
      const r = sheetRows[i].map(v => String(v ?? '').toLowerCase().trim())
      if (r.some(v => v === 'week')) { headerIdx = i; break }
    }
    if (headerIdx === -1) continue

    const hdrs = sheetRows[headerIdx].map(v => String(v ?? '').toLowerCase().trim())
    const col = (...names) => {
      for (const n of names) {
        const idx = hdrs.findIndex(h => h.includes(n.toLowerCase()))
        if (idx !== -1) return idx
      }
      return -1
    }

    const dayCol    = col('date ')          // col C — has day abbrev (Sun/Mon/Tue...)
                                            // actually day is col C label is 'Date ' but values are Sun/Mon...
    const semCol    = col('semester')
    const weekCol   = col('week')
    const topicCol  = col('lesson/topic', 'lesson topic')
    const actCol    = col('activities')      // classwork
    const resCol    = col('resources needed') // fallback classwork
    const assCol    = col('assessment')
    const srcCol    = col('source sheet')
    const gradeCol  = srcCol !== -1 ? srcCol : 1

    // col C is always index 2 (Date column) — day abbreviation lives here
    const dayColIdx = 2

    if (weekCol === -1) continue

    let lastGrade = null, lastSem = null, lastWeek = null, lastDay = null

    for (let r = headerIdx + 1; r < sheetRows.length; r++) {
      const row = sheetRows[r]

      // Carry-forward grade
      const gv = row[gradeCol]
      if (gv && typeof gv === 'string' && /grade\s*\d+/i.test(gv)) lastGrade = gv.trim()
      if (!lastGrade) continue

      // Carry-forward week
      const weekRaw = row[weekCol]
      const parsedWeek = weekRaw !== null && weekRaw !== undefined ? parseWeekNo(weekRaw) : null
      if (parsedWeek) lastWeek = parsedWeek
      if (!lastWeek) continue

      // Carry-forward semester
      const semRaw = semCol !== -1 ? row[semCol] : null
      if (semRaw !== null && semRaw !== undefined && String(semRaw).trim()) lastSem = semRaw
      const semLabel = normaliseSemLabel(lastSem ?? 'Semester 1')

      // Carry-forward day — col C has "Sun", "Mon", "Tue" etc.
      const dayRaw = row[dayColIdx]
      if (dayRaw && typeof dayRaw === 'string' && dayRaw.trim()) {
        const mapped = DAY_NAME_MAP[dayRaw.trim().toLowerCase()]
        if (mapped) lastDay = mapped
      }
      if (!lastDay) continue

      // Content columns
      const topic      = topicCol !== -1 ? String(row[topicCol] ?? '').trim() : ''
      const resource   = actCol  !== -1  ? String(row[actCol]   ?? '').trim()
                       : resCol !== -1   ? String(row[resCol]    ?? '').trim() : ''
      const assessment = assCol !== -1   ? String(row[assCol]   ?? '').trim() : ''

      if (!topic && !resource && !assessment) continue

      // One aggregated entry per grade+subject+semester+week+day
      const key = `${lastGrade}||${sheetName}||${semLabel}||${lastWeek}||${lastDay}`
      if (!agg[key]) {
        agg[key] = {
          gradeLabel:    lastGrade,
          subjectLabel:  sheetName,
          semesterLabel: semLabel,
          weekNo:        lastWeek,
          day:           lastDay,
          topic:         '',
          resource:      '',
          assessment:    '',
        }
      }
      // Take first non-empty value for each field
      if (topic      && !agg[key].topic)      agg[key].topic      = topic
      if (resource   && !agg[key].resource)   agg[key].resource   = resource
      if (assessment && !agg[key].assessment) agg[key].assessment = assessment
    }
  }

  return Object.values(agg).filter(r => r.topic || r.resource || r.assessment)
}

function WeeklyPlanImportModal({ open, onClose }) {
  const qc = useQueryClient()
  const [rows, setRows]       = useState([])
  const [step, setStep]       = useState('upload')
  const [importing, setImporting] = useState(false)
  const [result, setResult]   = useState(null)
  const fileRef = useRef()

  const reset = () => { setRows([]); setStep('upload'); setResult(null); if (fileRef.current) fileRef.current.value = '' }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseWeeklyPlanFile(ev)
        setRows(parsed)
        setStep('preview')
      } catch (err) {
        console.error(err)
        toast.error('Failed to parse file')
      } finally {
        setImporting(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const res = await api.post('/lesson-plans/import', { rows })
      setResult(res.data.data)
      qc.invalidateQueries({ queryKey: ['lessonPlans'] })
      toast.success(res.data.message)
      setStep('done')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  const uniqueGrades   = [...new Set(rows.map(r => r.gradeLabel))].sort()
  const uniqueSubjects = [...new Set(rows.map(r => r.subjectLabel))].sort()
  const uniqueWeeks    = [...new Set(rows.map(r => r.weekNo))].sort((a, b) => a - b)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { reset(); onClose() }} />
      <div className="relative card w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col">

        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-neutral-900">Import Weekly Plans from Excel</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Master_DB format (.xlsm) — one sheet per subject. Requires roster to be set up.</p>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => { reset(); onClose() }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-neutral-200 rounded-xl">
              {importing ? (
                <>
                  <div className="w-10 h-10 border-4 border-brand/30 border-t-brand rounded-full animate-spin mb-4" />
                  <p className="text-neutral-500">Parsing file…</p>
                </>
              ) : (
                <>
                  <svg className="w-12 h-12 text-neutral-300 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="font-medium text-neutral-700 mb-1">Upload Master_DB Excel</p>
                  <p className="text-sm text-neutral-400 mb-4">Reads Topic, Activities (Classwork) and Assessment (Homework) from each subject sheet</p>
                  <label className="btn-primary cursor-pointer">
                    Choose File
                    <input ref={fileRef} type="file" accept=".xlsx,.xls,.xlsm" className="hidden" onChange={handleFile} />
                  </label>
                </>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="card p-4 text-center border-green-200 bg-green-50">
                  <p className="text-2xl font-bold text-green-700">{rows.length}</p>
                  <p className="text-sm text-green-600">Plan entries parsed</p>
                </div>
                <div className="card p-4 text-center border-blue-200 bg-blue-50">
                  <p className="text-2xl font-bold text-blue-700">{uniqueWeeks.length}</p>
                  <p className="text-sm text-blue-600">Weeks (W{uniqueWeeks[0]}–W{uniqueWeeks[uniqueWeeks.length - 1]})</p>
                </div>
                <div className="card p-4 text-center border-purple-200 bg-purple-50">
                  <p className="text-2xl font-bold text-purple-700">{uniqueSubjects.length}</p>
                  <p className="text-sm text-purple-600">Subjects</p>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                <strong>Note:</strong> One lesson plan is created per Grade + Subject + Week, assigned to the teacher in the roster. Plans are saved with status <em>Approved</em>. Existing plans for the same grade/subject/week will be overwritten.
              </div>

              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50">
                    <tr>
                      {['Grade','Subject','Wk','Day','Topic','Classwork','Homework'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-neutral-500 uppercase text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 25).map((r, i) => (
                      <tr key={i} className="border-t border-neutral-100 hover:bg-neutral-50">
                        <td className="px-3 py-1.5 whitespace-nowrap">{r.gradeLabel}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap">{r.subjectLabel}</td>
                        <td className="px-3 py-1.5 text-center font-medium">{r.weekNo}</td>
                        <td className="px-3 py-1.5 whitespace-nowrap text-blue-600">{r.day}</td>
                        <td className="px-3 py-1.5 max-w-[120px] truncate text-neutral-600">{r.topic || <span className="text-neutral-300">—</span>}</td>
                        <td className="px-3 py-1.5 max-w-[120px] truncate text-neutral-600">{r.resource || <span className="text-neutral-300">—</span>}</td>
                        <td className="px-3 py-1.5 max-w-[120px] truncate text-neutral-600">{r.assessment || <span className="text-neutral-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 25 && <p className="text-xs text-neutral-400 text-center py-2">Showing 25 of {rows.length} rows</p>}
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <h4 className="font-semibold text-neutral-900 mb-1">Import complete!</h4>
                <p className="text-sm text-neutral-500">{result.created} lesson plan entries created/updated · {result.skipped} skipped</p>
              </div>
              {result.warnings?.length > 0 && (
                <div className="w-full rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700 max-h-36 overflow-y-auto">
                  <p className="font-medium mb-1">Warnings ({result.warnings.length}):</p>
                  {result.warnings.map((w, i) => <p key={i}>• {w}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-neutral-100 flex justify-between flex-shrink-0">
          <button className="btn-secondary" onClick={() => { reset(); onClose() }}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          {step === 'preview' && (
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={reset}>← Re-upload</button>
              <button className="btn-primary" disabled={importing || rows.length === 0} onClick={handleImport}>
                {importing ? 'Importing…' : `Import ${rows.length} entries`}
              </button>
            </div>
          )}
          {step === 'done' && (
            <button className="btn-primary" onClick={() => { reset(); onClose() }}>Done</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Printable Weekly Plan Table ───────────────────────────────────────────────
function WeeklyPlanTable({ grade, section, weekNo, semester, daySlots }) {
  const sortedDays   = DAYS.filter(d => daySlots[d]?.length)
  const maxSubjects  = sortedDays.reduce((m, d) => Math.max(m, daySlots[d].length), 1)
  const totalCols    = 2 + maxSubjects + 1  // day + row-label + subjects + notes

  if (!sortedDays.length) return null

  const tdBase = { border: '1px solid #d1d5db', padding: '3px 4px', fontSize: '9px', verticalAlign: 'top', lineHeight: '1.3' }
  const thBase = { ...tdBase, fontWeight: 600 }

  return (
    <div
      id="weekly-plan-print"
      style={{ background: '#fff', fontFamily: 'Arial, sans-serif', padding: '8px' }}
    >
      {/* ── School header ───────────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '4px' }}>
        <tbody>
          <tr>
            <td style={{ width: '120px' }}>
              <div style={{ fontWeight: 700, fontSize: '11px', color: '#1e3a5f' }}>YENEPOYA</div>
              <div style={{ fontSize: '8px', color: '#555' }}>INTERNATIONAL SCHOOL KSA</div>
            </td>
            <td style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '3px', color: '#1e3a5f' }}>WEEKLY PLAN</div>
            </td>
            <td style={{ width: '120px', textAlign: 'right', fontSize: '8px', color: '#555' }}>
              <div style={{ fontWeight: 700 }}>وزارة التعليم</div>
              <div>المملكة العربية السعودية</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Grade / Week / Semester bar ─────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', background: '#1e3a5f', color: '#fff', marginBottom: '4px' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4px 8px', fontWeight: 700, fontSize: '11px', width: '30%' }}>
              Grade: {grade?.label}{section ? ` ${section}` : ''}
            </td>
            <td style={{ padding: '4px 8px', fontWeight: 700, fontSize: '11px', textAlign: 'center' }}>
              Week No: {weekNo}
            </td>
            <td style={{ padding: '4px 8px', fontWeight: 700, fontSize: '11px', textAlign: 'right', width: '30%' }}>
              Semester: {semester?.label || ''}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Parent message ──────────────────────────────────────────── */}
      <div style={{ fontSize: '9px', padding: '3px 0 5px', borderBottom: '1px solid #e5e7eb', marginBottom: '4px' }}>
        <strong>Dear Parents/ Guardians</strong><br />
        Kindly note that we will be covering the following topics for the next week.
      </div>

      {/* ── Main timetable table ────────────────────────────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '36px' }} />  {/* day */}
          <col style={{ width: '60px' }} />  {/* row label */}
          {Array(maxSubjects).fill(null).map((_, i) => (
            <col key={i} />
          ))}
          <col style={{ width: '60px' }} />  {/* notes */}
        </colgroup>
        <tbody>
          {sortedDays.map(day => {
            const slots      = daySlots[day]
            const emptyCount = maxSubjects - slots.length
            return [
              /* ── Subject header row ── */
              <tr key={`${day}-hdr`} style={{ background: '#f9fafb' }}>
                <td
                  rowSpan={4}
                  style={{
                    ...thBase,
                    background: '#1e3a5f',
                    color: '#fff',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '1px',
                    writingMode: 'vertical-rl',
                    textOrientation: 'mixed',
                    transform: 'rotate(180deg)',
                    padding: '6px 2px',
                  }}
                >
                  {DAY_SHORT[day]}
                </td>
                <td style={{ ...tdBase, fontSize: '8px', color: '#6b7280', background: '#f3f4f6', textAlign: 'center', verticalAlign: 'middle' }}>
                  Day {DAY_ORDER[day] + 1}
                </td>
                {slots.map((slot, i) => (
                  <td
                    key={i}
                    style={{
                      ...thBase,
                      background: SUBJ_BG[i % SUBJ_BG.length],
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: '#1e3a5f',
                    }}
                  >
                    {slot.subject}
                  </td>
                ))}
                {Array(emptyCount).fill(null).map((_, i) => (
                  <td key={`eh${i}`} style={{ ...tdBase, background: '#f9fafb' }} />
                ))}
                <td
                  rowSpan={4}
                  style={{
                    ...thBase,
                    background: '#f3f4f6',
                    textAlign: 'center',
                    verticalAlign: 'middle',
                    fontSize: '9px',
                    fontWeight: 700,
                  }}
                >
                  Notes
                </td>
              </tr>,

              /* ── Topic row ── */
              <tr key={`${day}-topic`}>
                <td style={{ ...thBase, background: '#f9fafb', color: '#374151', whiteSpace: 'nowrap' }}>Topic</td>
                {slots.map((slot, i) => (
                  <td key={i} style={tdBase}>{slot.plan?.topic || ''}</td>
                ))}
                {Array(emptyCount).fill(null).map((_, i) => (
                  <td key={`et${i}`} style={tdBase} />
                ))}
              </tr>,

              /* ── Classwork row ── */
              <tr key={`${day}-cw`}>
                <td style={{ ...thBase, background: '#f9fafb', color: '#374151', whiteSpace: 'nowrap' }}>Classwork</td>
                {slots.map((slot, i) => (
                  <td key={i} style={tdBase}>{slot.plan?.resource || ''}</td>
                ))}
                {Array(emptyCount).fill(null).map((_, i) => (
                  <td key={`ecw${i}`} style={tdBase} />
                ))}
              </tr>,

              /* ── Homework row ── */
              <tr key={`${day}-hw`}>
                <td style={{ ...thBase, background: '#f9fafb', color: '#374151', whiteSpace: 'nowrap' }}>Homework</td>
                {slots.map((slot, i) => (
                  <td key={i} style={tdBase}>{slot.plan?.assessment || ''}</td>
                ))}
                {Array(emptyCount).fill(null).map((_, i) => (
                  <td key={`ehw${i}`} style={tdBase} />
                ))}
              </tr>,
            ]
          })}
        </tbody>
      </table>

      {/* ── Footer notice ───────────────────────────────────────────── */}
      <div
        style={{
          marginTop: '6px',
          padding: '5px 8px',
          border: '1px solid #e5e7eb',
          fontSize: '8px',
          color: '#374151',
          background: '#f9fafb',
          borderRadius: '3px',
        }}
      >
        <strong>Notice:</strong> Please note that weekly plans are subject to change based on the students' needs,
        schedule changes, staff meetings, teachers' absence and/or any other condition that may alter the planned
        lessons. Also, Days refer to the sequence of teaching blocks, not calendar days.
        Day 1 = the first block the subject is taught during the week, regardless of the actual weekday.
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WeeklyPlanPage() {
  const { user }                     = useAuth()
  const { isAdmin, isTeacher, isHod } = useRole()

  const { weekNo: academicWeek, isLoading: isWeekLoading } = useCurrentAcademicWeek()
  const [weekNo,       setWeekNo]     = useState(null)
  const [semesterId,   setSemesterId] = useState('')
  const [gradeId,      setGradeId]    = useState('')
  const [section,      setSection]    = useState('')
  const [importOpen,   setImportOpen] = useState(false)

  useEffect(() => {
    if (!isWeekLoading) {
      if (academicWeek) {
        setWeekNo(academicWeek)
      } else if (weekNo === null) {
        setWeekNo(1) // Fallback to Week 1
      }
    }
  }, [academicWeek, isWeekLoading, weekNo])

  const { data: grades    = [] } = useQuery({ queryKey: ['lookup', 'GRADE'],    queryFn: () => getLookupsByType('GRADE') })
  const { data: semesters = [] } = useQuery({ queryKey: ['lookup', 'SEMESTER'], queryFn: () => getLookupsByType('SEMESTER') })

  // ── Roster ──────────────────────────────────────────────────────────────────
  const { data: rosterRaw = {}, isLoading: rosterLoading } = useQuery({
    queryKey: ['roster', 'weekly', { gradeId: isTeacher ? undefined : gradeId, teacherId: isTeacher ? user?.userId : undefined }],
    queryFn: () => getRoster({
      ...(!isTeacher && gradeId && { gradeId }),
      ...(isTeacher && user?.userId && { teacherId: user.userId }),
      limit: 9999,
    }).then(r => (Array.isArray(r) ? r : r?.data ?? [])),
    enabled: isTeacher ? !!user?.userId : !!gradeId,
  })
  const roster = Array.isArray(rosterRaw) ? rosterRaw : []

  const activeGrades = useMemo(() =>
    grades.filter(g => g.isActive).sort((a, b) => a.order - b.order),
    [grades]
  )

  // Auto-select first grade
  useEffect(() => {
    if (activeGrades.length && !gradeId) setGradeId(activeGrades[0]._id)
  }, [activeGrades, gradeId])

  // Auto-select active semester
  useEffect(() => {
    if (semesters.length && !semesterId) {
      const s = semesters.find(x => x.isActive) || semesters[0]
      if (s) setSemesterId(s._id)
    }
  }, [semesters, semesterId])

  // ── Lesson plans ────────────────────────────────────────────────────────────
  const { data: planResult = {}, isLoading: plansLoading } = useQuery({
    queryKey: ['lessonPlans', 'weekly', { weekNo, semesterId, gradeId }],
    queryFn: () => getLessonPlans({
      weekNo,
      semesterId: semesterId || undefined,
      ...(gradeId && { gradeId }),
      limit: 9999,
    }),
    enabled: !!semesterId && weekNo !== null,
  })
  const lessonPlans = planResult.data || []

  // ── Build day→slots with plans joined ───────────────────────────────────────
  const { sections, daySlots } = useMemo(() => {
    const planMap = {}
    lessonPlans.forEach(p => {
      // If the plan has a day (imported), key includes day so each day shows its own content.
      // If no day (teacher-submitted week plan), key without day — matched as fallback.
      const baseKey = `${p.gradeId?._id || p.gradeId}::${p.subjectId?._id || p.subjectId}::${p.teacherId?._id || p.teacherId}`
      if (p.day) {
        planMap[`${baseKey}::${p.day}`] = p
      } else {
        planMap[baseKey] = p
      }
    })

    const days      = {}
    const secSet    = new Set()

    roster.forEach(r => {
      const day = r.day
      if (!(day in DAY_ORDER)) return

      const rowGradeId = r.gradeId?._id || r.gradeId
      if (gradeId && rowGradeId !== gradeId) return

      if (!days[day]) days[day] = []

      const baseKey = `${rowGradeId}::${r.subjectId?._id || r.subjectId}::${r.teacherId?._id || r.teacherId}`
      // Prefer day-specific plan; fall back to week-level plan
      const plan = planMap[`${baseKey}::${day}`] || planMap[baseKey] || null

      days[day].push({
        section: r.section,
        period:  r.period,
        subject: r.subjectId?.label || '—',
        teacher: r.teacherId?.name  || '—',
        plan,
      })
      if (r.section) secSet.add(r.section)
    })

    for (const d of Object.keys(days)) {
      days[d].sort((a, b) => (a.period ?? 99) - (b.period ?? 99))
    }

    return { sections: Array.from(secSet).sort(), daySlots: days }
  }, [roster, lessonPlans, gradeId])

  // Auto-select first section
  useEffect(() => {
    if (sections.length && !section) setSection(sections[0])
  }, [sections, section])

  // Filter slots by section
  const filteredDaySlots = useMemo(() => {
    if (!section) return daySlots
    const out = {}
    for (const [day, slots] of Object.entries(daySlots)) {
      const f = slots.filter(s => s.section === section)
      if (f.length) out[day] = f
    }
    return out
  }, [daySlots, section])

  const selectedGrade    = grades.find(g => g._id === gradeId)
  const selectedSemester = semesters.find(s => s._id === semesterId)
  const isLoading        = plansLoading || rosterLoading
  const hasData          = Object.keys(filteredDaySlots).length > 0

  // ── PDF print ────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print()

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Print-only global style: hide everything except the plan table */}
      <style>{`
        @media print {
          * { visibility: hidden !important; }
          #weekly-plan-print,
          #weekly-plan-print * { visibility: visible !important; }
          #weekly-plan-print {
            position: fixed !important;
            top: 0 !important; left: 0 !important;
            width: 100% !important;
            padding: 6mm !important;
            box-sizing: border-box !important;
            background: #fff !important;
          }
          @page { size: A4 landscape; margin: 8mm; }
        }
      `}</style>

      {/* ── App chrome (hidden on print) ──────────────────────────── */}
      <div className="print:hidden">
        <PageHeader
          title="Weekly Plan"
          subtitle={`Week ${weekNo ?? '…'}${selectedSemester ? ` · ${selectedSemester.label}` : ''}`}
          action={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Week navigator */}
              <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-1">
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-neutral-600 disabled:opacity-40"
                  onClick={() => setWeekNo(w => Math.max(1, w - 1))}
                  disabled={!weekNo || weekNo <= 1}
                >‹</button>
                <span className="px-3 text-sm font-semibold text-neutral-700 min-w-[70px] text-center">
                  {weekNo ? `Week ${weekNo}` : '…'}
                </span>
                <button
                  className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white hover:shadow-sm transition-all text-neutral-600 disabled:opacity-40"
                  onClick={() => setWeekNo(w => Math.min(52, w + 1))}
                  disabled={!weekNo || weekNo >= 52}
                >›</button>
              </div>

              {/* Semester */}
              <select className="select" value={semesterId} onChange={e => setSemesterId(e.target.value)}>
                <option value="">Semester</option>
                {semesters.filter(s => s.isActive).sort((a, b) => a.order - b.order).map(s => (
                  <option key={s._id} value={s._id}>{s.label}</option>
                ))}
              </select>

              {/* Import Weekly Plan (admin only) */}
              {isAdmin && (
                <button
                  className="btn-secondary flex items-center gap-1.5"
                  onClick={() => setImportOpen(true)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Import Excel
                </button>
              )}

              {/* Export PDF */}
              <button
                className="btn-secondary flex items-center gap-1.5"
                onClick={handlePrint}
                disabled={!hasData}
                title={!hasData ? 'No data to export' : 'Export to PDF'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.056 48.056 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Export PDF
              </button>
            </div>
          }
        />

        {/* ── Grade tabs ─────────────────────────────── */}
        {activeGrades.length > 0 && (
          <div className="flex gap-0.5 flex-wrap border-b border-neutral-200 mb-0 -mt-2 px-1">
            {activeGrades.map(g => (
              <button
                key={g._id}
                onClick={() => { setGradeId(g._id); setSection('') }}
                className={cn(
                  'px-4 py-2 text-sm font-semibold rounded-t-lg border border-b-0 transition-all',
                  gradeId === g._id
                    ? 'bg-white border-neutral-200 text-brand shadow-sm -mb-px z-10'
                    : 'bg-neutral-50 border-transparent text-neutral-400 hover:text-neutral-700'
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {/* ── Section sub-tabs ──────────────────────────────────────── */}
        {sections.length > 0 && (
          <div className="flex gap-1 bg-white border border-neutral-200 rounded-b-lg rounded-tr-lg px-3 pt-2 pb-1 mb-4">
            {sections.map(s => (
              <button
                key={s}
                onClick={() => setSection(s)}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-semibold transition-all',
                  section === s
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                )}
              >
                {selectedGrade?.label} {s}
              </button>
            ))}
          </div>
        )}

        {/* ── Loading / empty states ───────────────────────────────── */}
        {isLoading ? (
          <div className="card p-12 text-center animate-pulse text-neutral-400">
            Loading weekly plan…
          </div>
        ) : !gradeId ? (
          <div className="card p-12 text-center text-neutral-400">
            Select a grade to view the weekly plan.
          </div>
        ) : !section ? (
          <div className="card p-12 text-center text-neutral-400">
            <p className="font-medium">No roster data found for this grade.</p>
            <p className="text-sm mt-1">Add roster entries to generate the weekly plan.</p>
          </div>
        ) : !hasData ? (
          <div className="card p-12 text-center">
            <p className="text-neutral-500 font-medium">No timetable data for Week {weekNo}</p>
            <p className="text-neutral-400 text-sm mt-1">
              {roster.length === 0
                ? 'No roster entries found for this grade and section.'
                : 'No lesson plans or roster entries for this week.'}
            </p>
          </div>
        ) : null}
      </div>

      {/* ── Printable plan (always rendered when data available) ───── */}
      {hasData && !isLoading && (
        <div className="print:block">
          {/* Screen preview wrapper */}
          <div className="print:p-0">
            <WeeklyPlanTable
              grade={selectedGrade}
              section={section}
              weekNo={weekNo}
              semester={selectedSemester}
              daySlots={filteredDaySlots}
            />
          </div>
        </div>
      )}

      <WeeklyPlanImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  )
}
