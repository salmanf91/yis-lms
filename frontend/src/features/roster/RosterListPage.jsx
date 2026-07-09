import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { getRoster, createRosterEntry, updateRosterEntry, deactivateRosterEntry, deleteRosterEntry } from '../../api/roster.api'
import { getLookupsByType } from '../../api/lookup.api'
import { getUsers } from '../../api/user.api'
import api from '../../api/axios'
import PageHeader from '../../components/PageHeader'
import FormField from '../../components/FormField'
import ConfirmDialog from '../../components/ConfirmDialog'
import LookupSelect from '../../components/LookupSelect'
import Pagination from '../../components/Pagination'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']

function RosterFormModal({ open, onClose, existing }) {
  const qc = useQueryClient()
  const isEdit = !!existing
  const { register, handleSubmit, control, formState: { errors }, reset } = useForm({
    values: isEdit ? {
      teacherId: existing.teacherId?._id || existing.teacherId,
      gradeId: existing.gradeId?._id || existing.gradeId,
      subjectId: existing.subjectId?._id || existing.subjectId,
      section: existing.section,
      day: existing.day,
      period: existing.period,
      startTime: existing.startTime,
      endTime: existing.endTime,
    } : {},
  })

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateRosterEntry(existing._id, data) : createRosterEntry(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roster'] })
      toast.success(isEdit ? 'Roster entry updated' : 'Roster entry created')
      reset(); onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save'),
  })

  const watchedGradeId = useWatch({ control, name: 'gradeId' })
  const watchedSubjectId = useWatch({ control, name: 'subjectId' })

  // Fetch all active teachers
  const { data: allTeachers = [], isLoading: loadingTeachers } = useQuery({
    queryKey: ['users', 'TEACHER'],
    queryFn: () => getUsers({ role: 'TEACHER', isActive: true }),
  })

  // Fetch existing roster entries for the selected grade+subject to filter teachers
  const { data: filteredRoster = [] } = useQuery({
    queryKey: ['roster', 'filter', watchedGradeId, watchedSubjectId],
    queryFn: () => getRoster({ gradeId: watchedGradeId, subjectId: watchedSubjectId, limit: 999 })
      .then(r => (Array.isArray(r) ? r : r?.data ?? [])),
    enabled: !!(watchedGradeId && watchedSubjectId),
  })

  // Determine which teachers to show
  const teacherOptions = (() => {
    if (watchedGradeId && watchedSubjectId && filteredRoster.length > 0) {
      const assignedIds = new Set(filteredRoster.map(r => r.teacherId?._id || r.teacherId))
      const matched = allTeachers.filter(u => assignedIds.has(u._id))
      return matched.length > 0 ? matched : allTeachers
    }
    return allTeachers
  })()

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-lg shadow-xl">
        <h3 className="font-semibold text-neutral-900 mb-4">{isEdit ? 'Edit' : 'Add'} Roster Entry</h3>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <FormField label="Teacher" error={errors.teacherId?.message} required>
            <Controller
              name="teacherId"
              control={control}
              rules={{ required: 'Teacher is required' }}
              render={({ field }) => (
                <select
                  className={cn('select', errors.teacherId && 'input-error')}
                  value={field.value || ''}
                  onChange={field.onChange}
                >
                  <option value="">
                    {loadingTeachers ? 'Loading teachers...' : 'Select teacher'}
                  </option>
                  {teacherOptions.map(u => (
                    <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              )}
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Grade" error={errors.gradeId?.message} required>
              <Controller name="gradeId" control={control} rules={{ required: 'Grade is required' }}
                render={({ field }) => (
                  <LookupSelect type="GRADE" value={field.value} onChange={field.onChange} error={errors.gradeId} />
                )} />
            </FormField>
            <FormField label="Subject" error={errors.subjectId?.message} required>
              <Controller name="subjectId" control={control} rules={{ required: 'Subject is required' }}
                render={({ field }) => (
                  <LookupSelect type="SUBJECT" value={field.value} onChange={field.onChange} error={errors.subjectId} />
                )} />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Section" error={errors.section?.message} required>
              <Controller name="section" control={control} rules={{ required: 'Section is required' }}
                render={({ field }) => (
                  <LookupSelect type="SECTION" valueField="code" value={field.value} onChange={field.onChange} error={errors.section} />
                )} />
            </FormField>
            <FormField label="Day" error={errors.day?.message} required>
              <select className={cn('select', errors.day && 'input-error')} {...register('day', { required: 'Day is required' })}>
                <option value="">Select day</option>
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FormField>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Period" error={errors.period?.message} required>
              <input type="number" className={cn('input', errors.period && 'input-error')} placeholder="1"
                {...register('period', { required: true, valueAsNumber: true, min: { value: 1, message: 'Min 1' }, max: { value: 10, message: 'Max 10' } })} />
            </FormField>
            <FormField label="Start Time" error={errors.startTime?.message} required>
              <input type="time" className={cn('input', errors.startTime && 'input-error')}
                {...register('startTime', { required: 'Start time required' })} />
            </FormField>
            <FormField label="End Time" error={errors.endTime?.message} required>
              <input type="time" className={cn('input', errors.endTime && 'input-error')}
                {...register('endTime', { required: 'End time required' })} />
            </FormField>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function RosterListPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ day: '', section: '' })
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [importing, setImporting] = useState(false)
  const ascFileRef = useRef(null)

  useEffect(() => setPage(1), [filters])

  const handleAscImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/roaster/import-asc', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      const { created, skipped, teachersCreated, masterDataSynced } = res.data.data || {}
      toast.success(`Import complete: ${created} roster entries created, ${skipped} skipped`)
      if (teachersCreated > 0) {
        toast.info(`${teachersCreated} teacher account(s) created — temp password is "Welcome@123". Ask admin to reset.`)
      }
      if (masterDataSynced) {
        toast.info(`Master data synced: ${masterDataSynced.grades} grades, ${masterDataSynced.subjects} subjects in DB`)
      }
      qc.invalidateQueries({ queryKey: ['roster'] })
      qc.invalidateQueries({ queryKey: ['lookup'] })
      qc.invalidateQueries({ queryKey: ['users'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const { data: sectionLookups = [] } = useQuery({
    queryKey: ['lookup', 'SECTION'],
    queryFn: () => getLookupsByType('SECTION'),
  })

  const { data: result = {}, isLoading } = useQuery({
    queryKey: ['roster', filters, page, limit],
    queryFn: () => getRoster({ ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)), page, limit }),
  })
  const data = result.data || []

  const deleteMutation = useMutation({
    mutationFn: () => deleteRosterEntry(deleting._id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roster'] }); toast.success('Deleted'); setDeleting(null) },
    onError: () => toast.error('Could not delete'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => deactivateRosterEntry(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roster'] }); toast.success('Deactivated') },
    onError: () => toast.error('Could not deactivate'),
  })

  return (
    <div>
      <PageHeader
        title="Roster"
        subtitle="Assign teachers to grade/subject/section time slots"
        action={
          <div className="flex gap-2">
            <input ref={ascFileRef} type="file" accept=".xml" className="hidden" onChange={handleAscImport} />
            <button className="btn-secondary" onClick={() => ascFileRef.current?.click()} disabled={importing}>
              {importing ? 'Importing...' : 'Import aSc XML'}
            </button>
            <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>+ Add Entry</button>
          </div>
        }
      />

      <div className="card p-4 mb-4 flex flex-wrap gap-3">
        <select className="select w-44" value={filters.day} onChange={e => setFilters(f => ({ ...f, day: e.target.value }))}>
          <option value="">All Days</option>
          {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="select w-36" value={filters.section} onChange={e => setFilters(f => ({ ...f, section: e.target.value }))}>
          <option value="">All Sections</option>
          {sectionLookups.filter(s => s.isActive).sort((a, b) => a.order - b.order).map(s =>
            <option key={s._id} value={s.code}>{s.label}</option>
          )}
        </select>
        <button className="btn-secondary btn-sm" onClick={() => setFilters({ day: '', section: '' })}>Reset</button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? <div className="p-8 text-center text-neutral-400">Loading…</div> : (
          <table className="w-full">
            <thead>
              <tr>{['Teacher','Grade','Subject','Section','Day','Period','Time','Status','Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={9} className="table-cell text-center py-12 text-neutral-400">No roster entries found.</td></tr>
              ) : data.map(r => (
                <tr key={r._id} className="hover:bg-neutral-50">
                  <td className="table-cell font-medium">{r.teacherId?.name || r.teacherId}</td>
                  <td className="table-cell">{r.gradeId?.label || '—'}</td>
                  <td className="table-cell">{r.subjectId?.label || '—'}</td>
                  <td className="table-cell">{r.section}</td>
                  <td className="table-cell">{r.day}</td>
                  <td className="table-cell text-center">{r.period}</td>
                  <td className="table-cell text-neutral-500 text-xs">{r.startTime}–{r.endTime}</td>
                  <td className="table-cell">
                    <span className={cn('badge', r.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500')}>
                      {r.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex gap-1">
                      <button className="btn-ghost btn-sm" onClick={() => { setEditing(r); setModalOpen(true) }}>Edit</button>
                      {r.isActive && (
                        <button className="btn-ghost btn-sm text-amber-600 hover:bg-amber-50" onClick={() => deactivateMutation.mutate(r._id)}>
                          Deactivate
                        </button>
                      )}
                      <button className="btn-ghost btn-sm text-danger hover:bg-red-50" onClick={() => setDeleting(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination page={page} totalPages={result.totalPages} total={result.total} limit={limit} onPageChange={setPage} onLimitChange={setLimit} />
      </div>

      <RosterFormModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} existing={editing} />
      <ConfirmDialog open={!!deleting} title="Delete roster entry?" description={`Delete this roster slot? Existing lesson plans will not be removed.`}
        confirmLabel="Delete" variant="destructive" onConfirm={() => deleteMutation.mutate()} onCancel={() => setDeleting(null)}
        isLoading={deleteMutation.isPending} />
    </div>
  )
}
