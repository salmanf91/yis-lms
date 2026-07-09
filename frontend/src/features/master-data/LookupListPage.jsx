import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLookupsByType, createLookup, updateLookup, deleteLookup } from '../../api/lookup.api'
import { syncSections } from '../../api/roster.api'
import PageHeader from '../../components/PageHeader'
import ConfirmDialog from '../../components/ConfirmDialog'
import FormField from '../../components/FormField'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'

const TYPES = [
  { key: 'GRADE',    label: 'Grades' },
  { key: 'SUBJECT',  label: 'Subjects' },
  { key: 'SEMESTER', label: 'Semesters' },
  { key: 'SECTION',  label: 'Sections' },
]

function LookupFormModal({ open, onClose, existing, type }) {
  const qc = useQueryClient()
  const isEdit = !!existing
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm()

  useEffect(() => {
    if (open) {
      reset(existing ? { code: existing.code, label: existing.label, order: existing.order } : { code: '', label: '', order: '' })
    }
  }, [open, existing, reset])

  const mutation = useMutation({
    mutationFn: (data) =>
      isEdit ? updateLookup(existing._id, data) : createLookup({ ...data, type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lookup', type] })
      qc.invalidateQueries({ queryKey: ['lookup', 'all'] })
      toast.success(isEdit ? 'Updated successfully' : 'Created successfully')
      reset()
      onClose()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error saving'),
  })

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card p-6 w-full max-w-md shadow-xl">
        <h3 className="font-semibold text-neutral-900 mb-4">
          {isEdit ? 'Edit' : 'Add'} {TYPES.find(t => t.key === type)?.label.slice(0, -1)}
        </h3>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <FormField label="Code" error={errors.code?.message} required>
            <input className={cn('input', errors.code && 'input-error')} placeholder="e.g. G1, MATH"
              {...register('code', { required: 'Code is required' })} />
          </FormField>
          <FormField label="Label" error={errors.label?.message} required>
            <input className={cn('input', errors.label && 'input-error')} placeholder="e.g. Grade 1, Mathematics"
              {...register('label', { required: 'Label is required' })} />
          </FormField>
          <FormField label="Display Order" error={errors.order?.message} required>
            <input type="number" className={cn('input', errors.order && 'input-error')} placeholder="10"
              {...register('order', { required: 'Order is required', valueAsNumber: true, min: { value: 1, message: 'Min 1' } })} />
          </FormField>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LookupTab({ type }) {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['lookup', type],
    queryFn: () => getLookupsByType(type),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteLookup(deleting._id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lookup', type] })
      toast.success('Deleted')
      setDeleting(null)
    },
    onError: () => toast.error('Could not delete'),
  })

  const syncMutation = useMutation({
    mutationFn: syncSections,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['lookup', 'SECTION'] })
      toast.success(result?.created > 0
        ? `Synced ${result.created} new section(s) from roster`
        : 'All sections already up to date')
    },
    onError: () => toast.error('Sync failed'),
  })

  const sorted = [...data].sort((a, b) => a.order - b.order)

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        {type === 'SECTION' && (
          <button
            className="btn-secondary"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            title="Extract all unique section letters from the roster and add any missing ones"
          >
            {syncMutation.isPending ? 'Syncing…' : '↻ Sync from Roster'}
          </button>
        )}
        <button className="btn-primary" onClick={() => { setEditing(null); setModalOpen(true) }}>
          + Add
        </button>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-400">Loading…</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr>
                {['Code','Label','Order','Status','Actions'].map(h => <th key={h} className="table-header">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr><td colSpan={5} className="table-cell text-center py-10 text-neutral-400">No entries yet. Add one to get started.</td></tr>
              ) : sorted.map(item => (
                <tr key={item._id} className="hover:bg-neutral-50">
                  <td className="table-cell font-mono text-sm font-medium text-neutral-700">{item.code}</td>
                  <td className="table-cell">{item.label}</td>
                  <td className="table-cell text-neutral-400">{item.order}</td>
                  <td className="table-cell">
                    <span className={cn('badge', item.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500')}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <button className="btn-ghost btn-sm" onClick={() => { setEditing(item); setModalOpen(true) }}>Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <LookupFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null) }}
        existing={editing}
        type={type}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete entry?"
        description={`This will permanently delete "${deleting?.label}". If it is referenced by curriculum or roster entries, this may cause issues.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setDeleting(null)}
        isLoading={deleteMutation.isPending}
      />
    </div>
  )
}

export default function LookupListPage() {
  const [activeTab, setActiveTab] = useState('GRADE')

  return (
    <div>
      <PageHeader
        title="Master Data"
        subtitle="Manage grades, subjects, semesters and sections used across the system"
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-6 w-fit">
        {TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={cn(
              'px-5 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === t.key
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <LookupTab type={activeTab} />
    </div>
  )
}
