import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { getCurriculum, deactivateCurriculum } from '../../api/curriculum.api'
import { getLookupsByType } from '../../api/lookup.api'
import api from '../../api/axios'
import PageHeader from '../../components/PageHeader'
import ConfirmDialog from '../../components/ConfirmDialog'
import Pagination from '../../components/Pagination'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'

// ─── Subject name normalisation ──────────────────────────────────────────────
const SUBJECT_MAP = {
  'english language arts': 'english',
  'ela': 'english',
  'english': 'english',
  'mathematics': 'mathematics',
  'math': 'mathematics',
  'maths': 'mathematics',
  'science': 'science',
  'social studies': 'social studies',
  'physical education': 'physical education',
  'pe': 'physical education',
  'music': 'music',
  'chinese': 'chinese',
}

function normaliseSubject(raw = '') {
  const lower = raw.toLowerCase().trim()
  for (const [key, val] of Object.entries(SUBJECT_MAP)) {
    if (lower.includes(key)) return val
  }
  return lower
}

function matchLookup(items, rawName) {
  if (!rawName) return null
  const norm = normaliseSubject(rawName)
  return items.find(i => normaliseSubject(i.label) === norm) || null
}

// ─── Import Modal ─────────────────────────────────────────────────────────────
function CurriculumImportModal({ open, onClose, grades, subjects, semesters }) {
  const qc = useQueryClient()
  const [rows, setRows] = useState([])
  const [duplicateRows, setDuplicateRows] = useState([])
  const [step, setStep] = useState('upload') // upload | preview | done
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  const reset = () => { setRows([]); setDuplicateRows([]); setStep('upload'); if (fileRef.current) fileRef.current.value = '' }

  const parseFile = (file) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' })
        const parsed = []

        for (const sheetName of wb.SheetNames) {
          // Each sheet = one grade
          const ws = wb.Sheets[sheetName]
          const json = XLSX.utils.sheet_to_json(ws, { defval: '' })

          // Detect header offset: if first row looks like a merged title row, skip it
          let data = json
          if (data.length > 0) {
            const firstKeys = Object.keys(data[0])
            if (firstKeys.some(k => k.startsWith('__EMPTY') || k.startsWith('Unnamed'))) {
              // Try second row as header
              const ws2 = XLSX.read(e.target.result, { type: 'array' }).Sheets[sheetName]
              data = XLSX.utils.sheet_to_json(ws2, { defval: '', range: 1 })
            }
          }

          // Find grade lookup
          const grade = grades.find(g => g.label.toLowerCase() === sheetName.toLowerCase().trim()) ||
                        grades.find(g => g.label.toLowerCase().replace(/\s/g,'') === sheetName.toLowerCase().replace(/\s/g,''))

          for (const row of data) {
            // Get column values (handle typo "Titel" and "Title")
            const subjectRaw = row['Course Titel'] || row['Course Title'] || row['course_title'] || ''
            const semCode = (row['Semester'] || '').toString().trim()
            const weekRaw = (row['Week'] || row['week'] || '').toString().trim()
            const standardCode = (row['Standard Code'] || row['standard_code'] || '').toString().trim()
            const standardDescription = (row['Standard Description'] || row['standard_description'] || '').toString().trim()
            const skills = (row['Skills'] || '').toString().trim()
            const input = (row['Input'] || '').toString().trim()
            const process = (row['Process'] || '').toString().trim()
            const outcome = (row['Outcome'] || '').toString().trim()

            // Skip rows missing essentials
            if (!subjectRaw || !semCode || !weekRaw || !standardCode || !standardDescription) continue

            // Parse week number: W01 → 1, W1 → 1, 1 → 1
            const weekNo = parseInt(weekRaw.replace(/^W0?/, ''), 10)
            if (!weekNo || isNaN(weekNo)) continue

            // Match semester: S01 → find by code S01, or label containing "1"
            const semester = semesters.find(s => s.code?.toUpperCase() === semCode.toUpperCase()) ||
                             semesters.find(s => s.label?.includes(semCode.replace('S0','').replace('S','')))

            // Match subject
            const subject = matchLookup(subjects, subjectRaw)

            parsed.push({
              _sheet: sheetName,
              _subjectRaw: subjectRaw,
              _semRaw: semCode,
              gradeId: grade?._id || null,
              subjectId: subject?._id || null,
              semesterId: semester?._id || null,
              weekNo,
              standardCode,
              standardDescription,
              skills: skills || '—',
              input: input || '—',
              process: process || '—',
              outcome: outcome || '—',
              _gradeMatch: grade?.label,
              _subjectMatch: subject?.label,
              _semMatch: semester?.label,
            })
          }
        }

        const validMapped = parsed.filter(r => r.gradeId && r.subjectId && r.semesterId)
        let duplicatesIndices = []
        if (validMapped.length > 0) {
          const payload = validMapped.map(r => ({
            gradeId: r.gradeId,
            subjectId: r.subjectId,
            semesterId: r.semesterId,
            weekNo: r.weekNo,
            standardCode: r.standardCode
          }))
          const res = await api.post('/curriculum/validate-bulk', { rows: payload })
          duplicatesIndices = res.data.data?.duplicates || []
        }

        const duplicates = duplicatesIndices.map(i => validMapped[i])

        setRows(parsed)
        setDuplicateRows(duplicates)
        setStep('preview')
        setImporting(false)
      } catch (err) {
        console.error(err)
        toast.error('Failed to parse or validate Excel file. Please check the format.')
        setImporting(false)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setImporting(true)
      parseFile(file)
    }
  }

  const mappedRows = rows.filter(r => r.gradeId && r.subjectId && r.semesterId)
  const validRows = mappedRows.filter(r => !duplicateRows.includes(r))
  const invalidRows = rows.filter(r => !r.gradeId || !r.subjectId || !r.semesterId)

  const downloadErrors = () => {
    const ws = XLSX.utils.json_to_sheet(invalidRows.map(r => ({
      'Sheet / Grade': r._sheet,
      'Grade Error': r._gradeMatch ? '' : `NOT FOUND: ${r._sheet}`,
      'Subject Error': r._subjectMatch ? '' : `NOT FOUND: ${r._subjectRaw}`,
      'Semester Error': r._semMatch ? '' : `NOT FOUND: ${r._semRaw}`,
      'Week': r.weekNo || '',
      'Standard Code': r.standardCode || '',
      'Standard Description': r.standardDescription || ''
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Import Errors')
    XLSX.writeFile(wb, 'curriculum_import_errors.xlsx')
  }

  const handleImport = async () => {
    if (validRows.length === 0) return
    setImporting(true)
    try {
      const payload = validRows.map(r => ({
        gradeId: r.gradeId,
        subjectId: r.subjectId,
        semesterId: r.semesterId,
        weekNo: r.weekNo,
        standardCode: r.standardCode,
        standardDescription: r.standardDescription,
        skills: r.skills,
        input: r.input,
        process: r.process,
        outcome: r.outcome,
      }))
      const res = await api.post('/curriculum/bulk', { rows: payload })
      toast.success(`${res.data.data?.count || validRows.length} curriculum entries imported!`)
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      setStep('done')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { reset(); onClose() }} />
      <div className="relative card w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-neutral-900">Import Curriculum from Excel</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Supports the Yenepoya curriculum Excel format (one sheet per grade)</p>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => { reset(); onClose() }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-neutral-200 rounded-xl">
              <svg className="w-12 h-12 text-neutral-300 mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="font-medium text-neutral-700 mb-1">Upload your Excel file</p>
              <p className="text-sm text-neutral-400 mb-4">One sheet per grade (Grade 1–8, KG)</p>
              <label className="btn-primary cursor-pointer">
                Choose File
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </label>
              <div className="mt-6 text-xs text-neutral-400 text-center max-w-sm">
                <p className="font-medium text-neutral-500 mb-1">Required columns in each sheet:</p>
                <p>Course Titel, Semester (S01/S02), Week (W01–W15), Standard Code, Standard Description, Skills, Input, Process, Outcome</p>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="card p-4 text-center border-green-200 bg-green-50">
                  <p className="text-2xl font-bold text-green-700">{validRows.length}</p>
                  <p className="text-sm text-green-600">Ready to import</p>
                </div>
                <div className={cn('card p-4 text-center', duplicateRows.length > 0 ? 'border-blue-200 bg-blue-50' : 'border-neutral-200')}>
                  <p className={cn('text-2xl font-bold', duplicateRows.length > 0 ? 'text-blue-700' : 'text-neutral-400')}>{duplicateRows.length}</p>
                  <p className={cn('text-sm', duplicateRows.length > 0 ? 'text-blue-600' : 'text-neutral-400')}>Skipped (Duplicates)</p>
                </div>
                <div className={cn('card p-4 text-center', invalidRows.length > 0 ? 'border-amber-200 bg-amber-50' : 'border-neutral-200')}>
                  <p className={cn('text-2xl font-bold', invalidRows.length > 0 ? 'text-amber-700' : 'text-neutral-400')}>{invalidRows.length}</p>
                  <p className={cn('text-sm', invalidRows.length > 0 ? 'text-amber-600' : 'text-neutral-400')}>Cannot be mapped</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-neutral-700">{rows.length}</p>
                  <p className="text-sm text-neutral-500">Total rows parsed</p>
                </div>
              </div>

              {duplicateRows.length > 0 && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm">
                  <p className="font-medium text-blue-800">
                    ℹ {duplicateRows.length} records will be skipped as they are duplicates.
                  </p>
                </div>
              )}

              {invalidRows.length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm">
                  <div className="flex justify-between items-start mb-2 gap-4">
                    <p className="font-medium text-amber-800">⚠ {invalidRows.length} rows cannot be mapped — they will be skipped:</p>
                    <button className="btn-secondary btn-sm bg-white text-xs whitespace-nowrap shrink-0" onClick={downloadErrors}>
                      ↓ Download Errors (Excel)
                    </button>
                  </div>
                  <ul className="text-amber-700 space-y-1 max-h-28 overflow-y-auto">
                    {invalidRows.slice(0, 10).map((r, i) => (
                      <li key={i} className="text-xs">
                        Sheet: <b>{r._sheet}</b> | Grade: {r._gradeMatch || <span className="text-red-600">NOT FOUND ({r._sheet})</span>} |
                        Subject: {r._subjectMatch || <span className="text-red-600">NOT FOUND ({r._subjectRaw})</span>} |
                        Sem: {r._semMatch || <span className="text-red-600">NOT FOUND ({r._semRaw})</span>}
                      </li>
                    ))}
                    {invalidRows.length > 10 && <li className="text-xs text-amber-600">…and {invalidRows.length - 10} more</li>}
                  </ul>
                  <p className="text-xs text-amber-600 mt-2">Make sure Grades, Subjects, and Semesters are set up in Master Data with matching labels first.</p>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="w-full text-xs">
                  <thead className="bg-neutral-50">
                    <tr>
                      {['Grade','Subject','Sem','Week','Code','Description'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-neutral-500 uppercase text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {validRows.slice(0, 20).map((r, i) => (
                      <tr key={i} className="border-t border-neutral-100 hover:bg-neutral-50">
                        <td className="px-3 py-2">{r._gradeMatch}</td>
                        <td className="px-3 py-2">{r._subjectMatch}</td>
                        <td className="px-3 py-2">{r._semRaw}</td>
                        <td className="px-3 py-2 text-center">{r.weekNo}</td>
                        <td className="px-3 py-2 font-mono text-brand">{r.standardCode}</td>
                        <td className="px-3 py-2 max-w-xs truncate text-neutral-600">{r.standardDescription}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {validRows.length > 20 && (
                  <p className="text-xs text-neutral-400 text-center py-2">Showing 20 of {validRows.length} rows</p>
                )}
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h4 className="font-semibold text-neutral-900 mb-1">Import complete!</h4>
              <p className="text-sm text-neutral-500">{validRows.length} entries have been added to the curriculum.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex justify-between items-center flex-shrink-0">
          <button className="btn-secondary" onClick={() => { reset(); onClose() }}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          {step === 'preview' && (
            <div className="flex items-center gap-3">
              <button className="btn-secondary" onClick={reset}>← Re-upload</button>
              <button
                className="btn-primary"
                disabled={validRows.length === 0 || importing}
                onClick={handleImport}
              >
                {importing ? 'Importing…' : `Import ${validRows.length} entries`}
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

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CurriculumListPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ gradeId: '', subjectId: '', semesterId: '', weekNo: '' })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [deactivating, setDeactivating] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => setPage(1), [filters])

  const { data: grades = [] } = useQuery({ queryKey: ['lookup', 'GRADE'], queryFn: () => getLookupsByType('GRADE') })
  const { data: subjects = [] } = useQuery({ queryKey: ['lookup', 'SUBJECT'], queryFn: () => getLookupsByType('SUBJECT') })
  const { data: semesters = [] } = useQuery({ queryKey: ['lookup', 'SEMESTER'], queryFn: () => getLookupsByType('SEMESTER') })

  const activeFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  const { data: result = {}, isLoading } = useQuery({
    queryKey: ['curriculum', activeFilters, page, limit],
    queryFn: () => getCurriculum({ ...activeFilters, page, limit }),
  })
  const data = result.data || []

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateCurriculum(deactivating._id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['curriculum'] }); toast.success('Deactivated'); setDeactivating(null) },
    onError: () => toast.error('Could not deactivate'),
  })

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  return (
    <div>
      <PageHeader
        title="Curriculum"
        subtitle="Manage weekly curriculum standards for all grades and subjects"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>
              ↑ Import Excel
            </button>
            <button className="btn-primary" onClick={() => navigate('/curriculum/new')}>+ Add Entry</button>
          </div>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="select flex-1 min-w-36" value={filters.gradeId} onChange={e => setFilter('gradeId', e.target.value)}>
          <option value="">All Grades</option>
          {grades.filter(g => g.isActive).sort((a, b) => a.order - b.order).map(g => <option key={g._id} value={g._id}>{g.label}</option>)}
        </select>
        <select className="select flex-1 min-w-36" value={filters.subjectId} onChange={e => setFilter('subjectId', e.target.value)}>
          <option value="">All Subjects</option>
          {subjects.filter(s => s.isActive).sort((a, b) => a.order - b.order).map(s => <option key={s._id} value={s._id}>{s.label}</option>)}
        </select>
        <select className="select flex-1 min-w-36" value={filters.semesterId} onChange={e => setFilter('semesterId', e.target.value)}>
          <option value="">All Semesters</option>
          {semesters.filter(s => s.isActive).sort((a, b) => a.order - b.order).map(s => <option key={s._id} value={s._id}>{s.label}</option>)}
        </select>
        <input type="number" className="input w-28" placeholder="Week No" min={1} max={52}
          value={filters.weekNo} onChange={e => setFilter('weekNo', e.target.value)} />
        <button className="btn-secondary btn-sm" onClick={() => setFilters({ gradeId: '', subjectId: '', semesterId: '', weekNo: '' })}>
          Reset
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-400">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Code', 'Grade', 'Subject', 'Semester', 'Week', 'Skills', 'Status', 'Actions'].map(h =>
                  <th key={h} className="table-header">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={8} className="table-cell text-center py-12 text-neutral-400">
                  No curriculum entries found. Use <strong>Import Excel</strong> to bulk-upload or <strong>Add Entry</strong> to create one.
                </td></tr>
              ) : data.map(c => (
                <tr key={c._id} className="hover:bg-neutral-50">
                  <td className="table-cell font-mono text-sm font-semibold text-brand">{c.standardCode}</td>
                  <td className="table-cell">{c.gradeId?.label || '—'}</td>
                  <td className="table-cell">{c.subjectId?.label || '—'}</td>
                  <td className="table-cell">{c.semesterId?.label || '—'}</td>
                  <td className="table-cell text-center font-medium">{c.weekNo}</td>
                  <td className="table-cell max-w-xs">
                    <p className="truncate text-neutral-500 text-xs">{c.skills}</p>
                  </td>
                  <td className="table-cell">
                    <span className={cn('badge', c.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500')}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button className="btn-ghost btn-sm" onClick={() => navigate(`/curriculum/${c._id}`)}>View</button>
                      <button className="btn-ghost btn-sm" onClick={() => navigate(`/curriculum/${c._id}/edit`)}>Edit</button>
                      {c.isActive && (
                        <button className="btn-ghost btn-sm text-amber-600 hover:bg-amber-50" onClick={() => setDeactivating(c)}>Deactivate</button>
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

      <ConfirmDialog open={!!deactivating} title="Deactivate curriculum entry?"
        description={`Deactivate "${deactivating?.standardCode}"? Teachers won't be able to link new plans to it.`}
        confirmLabel="Deactivate"
        onConfirm={() => deactivateMutation.mutate()} onCancel={() => setDeactivating(null)}
        isLoading={deactivateMutation.isPending} />

      <CurriculumImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        grades={grades}
        subjects={subjects}
        semesters={semesters}
      />
    </div>
  )
}
