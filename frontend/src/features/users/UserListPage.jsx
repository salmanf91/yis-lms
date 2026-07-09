import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createUser, getUsers, deactivateUser, activateUser, bulkCreateUsers, resetUserPassword, changeUserRole, clearAllData, getDepartments } from '../../api/user.api'
import * as XLSX from 'xlsx'
import PageHeader from '../../components/PageHeader'
import FormField from '../../components/FormField'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'
import { formatDate } from '../../utils/formatDate'
import Pagination from '../../components/Pagination'

const ROLE_CONFIG = {
  ADMIN:   { cls: 'bg-purple-100 text-purple-700', label: 'Admin' },
  HOD:     { cls: 'bg-blue-100 text-blue-700',     label: 'HOD' },
  TEACHER: { cls: 'bg-green-100 text-green-700',   label: 'Teacher' },
}

// ─── User Create Modal ────────────────────────────────────────────────────────
function UserCreateModal({ open, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    staleTime: 5 * 60_000,
  })

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['departments'] })
      toast.success('User created successfully')
      reset(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create user'),
  })

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-neutral-900 mb-4">Add User</h3>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <FormField label="Full Name" error={errors.name?.message} required>
            <input className={cn('input', errors.name && 'input-error')} placeholder="Jane Doe"
              {...register('name', { required: 'Name is required' })} />
          </FormField>
          <FormField label="Email" error={errors.email?.message} required>
            <input type="email" className={cn('input', errors.email && 'input-error')} placeholder="jane@school.edu"
              {...register('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })} />
          </FormField>
          <FormField label="Password" error={errors.password?.message} required>
            <input type="password" className={cn('input', errors.password && 'input-error')} placeholder="Min 8 characters"
              {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Role" error={errors.role?.message} required>
              <select className={cn('select', errors.role && 'input-error')} {...register('role', { required: 'Role is required' })}>
                <option value="">Select role</option>
                <option value="HOD">HOD</option>
                <option value="TEACHER">Teacher</option>
              </select>
            </FormField>
            <FormField label="Department" error={errors.department?.message}>
              <select className="select" {...register('department')}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  const mutation = useMutation({
    mutationFn: ({ newPassword }) => resetUserPassword(user._id, newPassword),
    onSuccess: () => { toast.success(`Password reset for ${user.name}`); reset(); onClose() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to reset password'),
  })

  if (!user) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-neutral-900 mb-1">Reset Password</h3>
        <p className="text-sm text-neutral-500 mb-4">Set a new password for <span className="font-medium text-neutral-800">{user.name}</span></p>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <FormField label="New Password" error={errors.newPassword?.message} required>
            <input type="password" className={cn('input', errors.newPassword && 'input-error')} placeholder="Min 8 characters"
              {...register('newPassword', { required: 'Password is required', minLength: { value: 8, message: 'Min 8 characters' } })} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Resetting…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Parse school's standard Staff Directory xlsx ────────────────────────────
function cleanDeptName(raw) {
  // "  MATH DEPT" → "Math", "  PE / MUSIC / DRAMA" → "PE / Music / Drama"
  const trimmed = raw.trim().replace(/\s+DEPT$/i, '').trim()
  return trimmed.split(/\s*\/\s*/)
    .map(part => part.trim().split(' ')
      .map(w => ['KG', 'ICT', 'PE'].includes(w.toUpperCase())
        ? w.toUpperCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' '))
    .join(' / ')
}

function parseStaffDirectoryXlsx(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const valid = []
  const skipped = []
  let currentDept = ''

  for (const row of rows) {
    if (!row || row.length < 2) continue

    const col0Raw = row[0]
    const col0 = col0Raw?.toString().trim()
    const isHod = col0?.toUpperCase() === 'HOD'
    const isNumber = typeof col0Raw === 'number' || /^\d+$/.test(col0)

    // Section header rows (e.g. "  KG", "  MATH DEPT") — capture as department
    if (!isHod && !isNumber) {
      const name1 = row[1]?.toString().trim()
      // Only treat as dept header if col0 has content, isn't the title/footer, and col1 is empty or also non-email
      if (col0 && col0 !== '#' && !col0.includes('Yenepoya') && !col0.includes('STAFF') && col0.length < 40) {
        currentDept = cleanDeptName(col0)
      }
      continue
    }

    const name = row[1]?.toString().trim()
    const designation = row[2]?.toString().trim() || ''
    const email = row[3]?.toString().trim()

    if (!name) continue

    const role = isHod ? 'HOD' : 'TEACHER'

    if (!email || !email.includes('@')) {
      skipped.push({ name, designation, role, department: currentDept, reason: 'No email address' })
      continue
    }

    valid.push({ name, email, designation, role, department: currentDept, password: 'Welcome@123', mustResetPassword: true })
  }

  return { valid, skipped }
}

// ─── Staff Directory Import Modal ─────────────────────────────────────────────
function UserImportModal({ open, onClose }) {
  const qc = useQueryClient()
  const [parsed, setParsed] = useState(null)   // { valid, skipped }
  const [step, setStep] = useState('upload')   // upload | preview | done
  const [result, setResult] = useState(null)   // server response
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  const reset = () => {
    setParsed(null); setStep('upload'); setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = parseStaffDirectoryXlsx(ev.target.result)
        setParsed(data)
        setStep('preview')
      } catch {
        toast.error('Could not read the file. Please use the school\'s Staff Directory xlsx.')
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (!parsed?.valid?.length) return
    setImporting(true)
    try {
      const res = await bulkCreateUsers(parsed.valid)
      setResult(res)
      qc.invalidateQueries({ queryKey: ['users'] })
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
      <div className="relative card w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-neutral-900">Import Staff Directory</h3>
            <p className="text-xs text-neutral-400 mt-0.5">Upload the school's standard Staff Directory (.xlsx)</p>
          </div>
          <button className="btn-ghost btn-sm text-lg leading-none" onClick={() => { reset(); onClose() }}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ── Step: Upload ── */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Format info */}
              <div className="rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-3 bg-neutral-50 border-b border-neutral-200">
                  <p className="text-sm font-medium text-neutral-700">Expected format — Staff Directory columns</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      {['Col A (#)', 'Col B (Name)', 'Col C (Designation)', 'Col D (Email)'].map(h => (
                        <th key={h} className="px-4 py-2 text-left font-semibold text-neutral-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-50">
                    <tr className="text-neutral-500 bg-amber-50/50">
                      <td className="px-4 py-2 font-mono font-bold text-amber-700">  KG</td>
                      <td colSpan={3} className="px-4 py-2 text-neutral-400 italic">← section divider row, auto-skipped</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 font-mono">1</td>
                      <td className="px-4 py-2 font-medium">Jane Smith</td>
                      <td className="px-4 py-2 text-neutral-500">KG 1 S Homeroom Teacher</td>
                      <td className="px-4 py-2 text-neutral-500">jane@yenschoolksa.com</td>
                    </tr>
                    <tr className="bg-neutral-50">
                      <td className="px-4 py-2 font-mono font-bold text-blue-700">HOD</td>
                      <td className="px-4 py-2 font-medium">John Doe</td>
                      <td className="px-4 py-2 text-neutral-500">Math HOD - Grade 6-8</td>
                      <td className="px-4 py-2 text-neutral-500">john@yenschoolksa.com</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Temp password notice */}
              <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-800">
                  All imported users will receive a temporary password <span className="font-mono font-semibold">Welcome@123</span> and will be prompted to change it on first login.
                </p>
              </div>

              {/* Upload button */}
              <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-neutral-300 rounded-xl p-8 cursor-pointer hover:border-brand hover:bg-brand/5 transition-colors group">
                <svg className="w-10 h-10 text-neutral-300 group-hover:text-brand transition-colors" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-neutral-700 group-hover:text-brand transition-colors">Click to upload Staff Directory</p>
                  <p className="text-xs text-neutral-400 mt-0.5">Accepts .xlsx files only</p>
                </div>
                <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
              </label>
            </div>
          )}

          {/* ── Step: Preview ── */}
          {step === 'preview' && parsed && (
            <div className="space-y-4">
              {/* Summary badges */}
              <div className="flex gap-3 flex-wrap">
                <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-100 px-4 py-2.5">
                  <span className="text-2xl font-bold text-green-700">{parsed.valid.length}</span>
                  <span className="text-sm text-green-600">ready to import</span>
                </div>
                {parsed.skipped.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5">
                    <span className="text-2xl font-bold text-amber-600">{parsed.skipped.length}</span>
                    <span className="text-sm text-amber-600">will be skipped (no email)</span>
                  </div>
                )}
              </div>

              {/* Valid users table */}
              <div className="rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200">
                  <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Users to Import</p>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-white border-b border-neutral-100">
                      <tr>
                        {['Name', 'Email', 'Department', 'Designation', 'Role'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-neutral-500 uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {parsed.valid.map((r, i) => (
                        <tr key={i} className="hover:bg-neutral-50">
                          <td className="px-3 py-2 font-medium text-neutral-800">{r.name}</td>
                          <td className="px-3 py-2 text-neutral-500 text-xs">{r.email}</td>
                          <td className="px-3 py-2">
                            {r.department
                              ? <span className="badge bg-blue-50 text-blue-700 border border-blue-100">{r.department}</span>
                              : <span className="text-neutral-300 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2 text-neutral-400 text-xs max-w-[160px] truncate" title={r.designation}>{r.designation || '—'}</td>
                          <td className="px-3 py-2">
                            <span className={cn('badge', ROLE_CONFIG[r.role]?.cls)}>
                              {ROLE_CONFIG[r.role]?.label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Skipped users */}
              {parsed.skipped.length > 0 && (
                <div className="rounded-xl border border-amber-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Skipped — Missing Email</p>
                  </div>
                  <div className="divide-y divide-amber-50">
                    {parsed.skipped.map((r, i) => (
                      <div key={i} className="px-4 py-2 flex items-center gap-3 text-sm">
                        <span className="font-medium text-neutral-700">{r.name}</span>
                        <span className={cn('badge', ROLE_CONFIG[r.role]?.cls)}>{ROLE_CONFIG[r.role]?.label}</span>
                        {r.designation && <span className="text-neutral-400 text-xs truncate">{r.designation}</span>}
                        <span className="ml-auto text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">No email</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step: Done ── */}
          {step === 'done' && result && (
            <div className="flex flex-col items-center py-10 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-semibold text-neutral-900 text-lg">Import complete!</p>
                <p className="text-sm text-neutral-500 mt-1">
                  <span className="font-medium text-green-700">{result.created} users created</span>
                  {result.skipped > 0 && <span className="text-neutral-400"> · {result.skipped} skipped (duplicate email)</span>}
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700 text-center max-w-sm">
                All new accounts use the temporary password <span className="font-mono font-semibold">Welcome@123</span>. Users will be prompted to change it on first login.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex justify-between items-center flex-shrink-0">
          <button className="btn-secondary" onClick={() => { reset(); onClose() }}>
            {step === 'done' ? 'Close' : 'Cancel'}
          </button>
          <div className="flex gap-3">
            {step === 'preview' && (
              <>
                <button className="btn-secondary" onClick={reset}>← Re-upload</button>
                <button
                  className="btn-primary"
                  disabled={importing || !parsed?.valid?.length}
                  onClick={handleImport}
                >
                  {importing ? 'Importing…' : `Import ${parsed?.valid?.length} Users`}
                </button>
              </>
            )}
            {step === 'done' && (
              <button className="btn-primary" onClick={() => { reset(); onClose() }}>Done</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Teacher Replacement Modal ────────────────────────────────────────────────
function TeacherReplacementModal({ leavingTeacher, onConfirm, onClose, isPending }) {
  const [replacementId, setReplacementId] = useState('')

  // Fetch all active teachers except the one being deactivated
  const { data: result = {} } = useQuery({
    queryKey: ['users', 'TEACHER', '', 1, 999],
    queryFn: () => getUsers({ role: 'TEACHER', limit: 999 }),
    enabled: !!leavingTeacher,
  })
  const candidates = (result.data || []).filter(u => u.isActive && u._id !== leavingTeacher?._id)

  if (!leavingTeacher) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-neutral-100">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900">Deactivate Teacher</h3>
              <p className="text-sm text-neutral-500 mt-0.5">
                You are about to deactivate <span className="font-medium text-neutral-800">{leavingTeacher.name}</span>.
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* What gets transferred */}
          <div className="rounded-lg bg-blue-50 border border-blue-100 p-3.5 text-sm text-blue-800 space-y-1">
            <p className="font-medium">The following will be reassigned to the replacement:</p>
            <ul className="list-disc list-inside space-y-0.5 text-blue-700">
              <li>All lesson plans created by this teacher</li>
              <li>All roster / timetable slots assigned to this teacher</li>
            </ul>
          </div>

          {/* Replacement picker */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1.5">
              Select replacement teacher
              <span className="ml-1 text-neutral-400 font-normal">(optional)</span>
            </label>
            {candidates.length === 0 ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                No other active teachers found. Add the replacement teacher first, then deactivate.
              </div>
            ) : (
              <select
                className="select w-full"
                value={replacementId}
                onChange={e => setReplacementId(e.target.value)}
              >
                <option value="">— No replacement (skip transfer) —</option>
                {candidates.map(t => (
                  <option key={t._id} value={t._id}>{t.name} · {t.email}</option>
                ))}
              </select>
            )}
          </div>

          {/* Warning when skipping */}
          {!replacementId && (
            <p className="text-xs text-neutral-400">
              If you skip, lesson plans and roster slots will remain in the system but will no longer have an active teacher assigned.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end gap-3">
          <button className="btn-secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50',
              replacementId
                ? 'bg-brand text-white hover:bg-brand/90'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            )}
            onClick={() => onConfirm(replacementId || null)}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Processing…
              </>
            ) : replacementId ? 'Transfer & Deactivate' : 'Deactivate without Transfer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UserListPage() {
  const { user: currentUser } = useAuth()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [resetUser, setResetUser] = useState(null)
  const [replacingTeacher, setReplacingTeacher] = useState(null) // teacher being deactivated
  const [roleFilter, setRoleFilter] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [searchQuery, setSearchQuery] = useState('')   // debounced value sent to API
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [clearInput, setClearInput] = useState('')
  const [clearing, setClearing] = useState(false)

  // Debounce: update searchQuery 350ms after the user stops typing
  useEffect(() => {
    const t = setTimeout(() => setSearchQuery(searchInput.trim()), 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Reset to page 1 whenever any filter changes
  useEffect(() => setPage(1), [roleFilter, deptFilter, searchQuery])

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: getDepartments,
    staleTime: 5 * 60_000,
  })

  const { data: result = {}, isLoading } = useQuery({
    queryKey: ['users', roleFilter, deptFilter, searchQuery, page, limit],
    queryFn: () => getUsers({
      ...(roleFilter  && { role: roleFilter }),
      ...(deptFilter  && { department: deptFilter }),
      ...(searchQuery && { search: searchQuery }),
      page,
      limit,
    }),
  })
  const users = result.data || []

  const deactivateMutation = useMutation({
    mutationFn: ({ id, replacementTeacherId }) => deactivateUser(id, replacementTeacherId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['lessonPlans'] })
      qc.invalidateQueries({ queryKey: ['roster'] })
      const msg = data?.message || 'User deactivated'
      toast.success(msg)
      setReplacingTeacher(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to deactivate'),
  })

  const handleDeactivateClick = (user) => {
    if (user.role === 'TEACHER') {
      setReplacingTeacher(user)
    } else {
      // HOD — deactivate directly, no transfer needed
      deactivateMutation.mutate({ id: user._id, replacementTeacherId: null })
    }
  }

  const activateMutation = useMutation({
    mutationFn: activateUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User activated') },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to activate'),
  })

  const handleRoleChange = async (userId, newRole) => {
    try {
      await changeUserRole(userId, newRole)
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(`Role changed to ${newRole}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change role')
    }
  }

  const handleClearAllData = async () => {
    if (clearInput !== 'RESET') return
    setClearing(true)
    try {
      const res = await clearAllData()
      toast.success(`Cleared: ${res.data.usersDeleted} users, ${res.data.rosterDeleted} roster, ${res.data.curriculumDeleted} curriculum, ${res.data.plansDeleted} plans`)
      qc.invalidateQueries()
      setShowClearConfirm(false)
      setClearInput('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear data')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage HOD and Teacher accounts"
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setImportOpen(true)}>↑ Import Staff Directory</button>
            <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add User</button>
          </div>
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            className="input pl-9 pr-8 w-full"
            placeholder="Search by name or email…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              onClick={() => setSearchInput('')}
              aria-label="Clear search"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Role filter */}
        <select className="select w-36" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="HOD">HOD</option>
          <option value="TEACHER">Teacher</option>
        </select>

        {/* Department filter */}
        <select className="select w-44" value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Clear all filters */}
        {(roleFilter || deptFilter || searchQuery) && (
          <button className="btn-secondary btn-sm" onClick={() => { setRoleFilter(''); setDeptFilter(''); setSearchInput('') }}>
            Clear filters
          </button>
        )}

        {/* Result count */}
        {result.total > 0 && (
          <span className="ml-auto text-xs text-neutral-400 bg-neutral-50 border border-neutral-200 rounded-full px-3 py-1">
            {result.total} user{result.total !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-400">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Name', 'Email', 'Department', 'Role', 'Status', 'Created', 'Actions'].map(h =>
                  <th key={h} className="table-header">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={7} className="table-cell text-center py-12 text-neutral-400">No users found.</td></tr>
              ) : users.map(u => {
                const isSelf = u._id === (currentUser?.userId || currentUser?.id)
                const isAdminUser = u.role === 'ADMIN'
                return (
                  <tr key={u._id} className={cn('hover:bg-neutral-50', !u.isActive && 'opacity-60')}>
                    <td className="table-cell font-medium">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>{u.name}</span>
                        {isSelf && <span className="text-xs text-neutral-400">(you)</span>}
                        {u.mustResetPassword && (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Temp Password</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell text-neutral-500 text-xs">{u.email}</td>
                    <td className="table-cell">
                      {u.department
                        ? <span className="badge bg-blue-50 text-blue-700 border border-blue-100">{u.department}</span>
                        : <span className="text-neutral-300 text-xs">—</span>}
                    </td>
                    <td className="table-cell">
                      {!isAdminUser && !isSelf ? (
                        <select
                          className="select text-xs py-1 px-2 h-auto w-28"
                          value={u.role}
                          onChange={e => handleRoleChange(u._id, e.target.value)}
                        >
                          <option value="TEACHER">Teacher</option>
                          <option value="HOD">HOD</option>
                        </select>
                      ) : (
                        <span className={cn('badge', ROLE_CONFIG[u.role]?.cls)}>
                          {ROLE_CONFIG[u.role]?.label}
                        </span>
                      )}
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge', u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600')}>
                        {u.isActive ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="table-cell text-neutral-400 text-xs">{formatDate(u.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex gap-1 flex-wrap">
                        <button className="btn-ghost btn-sm text-neutral-500" onClick={() => setResetUser(u)}>
                          Reset PWD
                        </button>
                        {!isAdminUser && !isSelf && u.isActive && (
                          <button
                            className="btn-ghost btn-sm text-amber-600 hover:bg-amber-50"
                            onClick={() => handleDeactivateClick(u)}
                            disabled={deactivateMutation.isPending}
                          >
                            Deactivate
                          </button>
                        )}
                        {!isAdminUser && !u.isActive && (
                          <button
                            className="btn-ghost btn-sm text-green-600 hover:bg-green-50"
                            onClick={() => activateMutation.mutate(u._id)}
                            disabled={activateMutation.isPending}
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={result.totalPages} total={result.total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>

      {/* Danger Zone */}
      <div className="mt-10 border border-red-200 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h3>
        <p className="text-xs text-neutral-500 mb-3">
          Clears all non-admin data: users, roster, curriculum, lesson plans, lookups, and academic years.
          Use this before a fresh aSc import. This action cannot be undone.
        </p>
        {!showClearConfirm ? (
          <button
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            onClick={() => setShowClearConfirm(true)}
          >
            Clear All Data
          </button>
        ) : (
          <div className="flex flex-col gap-2 max-w-sm">
            <p className="text-xs text-red-600 font-medium">Type RESET to confirm:</p>
            <input
              className="input"
              placeholder="RESET"
              value={clearInput}
              onChange={e => setClearInput(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50"
                disabled={clearInput !== 'RESET' || clearing}
                onClick={handleClearAllData}
              >
                {clearing ? 'Clearing…' : 'Confirm Clear'}
              </button>
              <button className="btn-secondary" onClick={() => { setShowClearConfirm(false); setClearInput('') }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <UserCreateModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <UserImportModal open={importOpen} onClose={() => setImportOpen(false)} />
      <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      <TeacherReplacementModal
        leavingTeacher={replacingTeacher}
        onClose={() => setReplacingTeacher(null)}
        onConfirm={(replacementTeacherId) =>
          deactivateMutation.mutate({ id: replacingTeacher._id, replacementTeacherId })
        }
        isPending={deactivateMutation.isPending}
      />
    </div>
  )
}
