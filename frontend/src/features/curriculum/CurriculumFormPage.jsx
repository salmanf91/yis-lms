import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createCurriculum, updateCurriculum, getCurriculumById } from '../../api/curriculum.api'
import LookupSelect from '../../components/LookupSelect'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'

export default function CurriculumFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['curriculum', 'detail', id],
    queryFn: () => getCurriculumById(id),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        gradeId: existing.gradeId?._id || existing.gradeId,
        subjectId: existing.subjectId?._id || existing.subjectId,
        semesterId: existing.semesterId?._id || existing.semesterId,
        weekNo: existing.weekNo,
        standardCode: existing.standardCode,
        standardDescription: existing.standardDescription,
        skills: existing.skills,
        input: existing.input,
        process: existing.process,
        outcome: existing.outcome,
      })
    }
  }, [existing, isEdit, reset])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateCurriculum(id, data) : createCurriculum(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Curriculum updated' : 'Curriculum entry created')
      navigate('/curriculum')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save'),
  })

  if (isEdit && loadingExisting) return <div className="p-8 text-neutral-400">Loading…</div>

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/curriculum')}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Curriculum
      </button>
      <PageHeader
        title={isEdit ? 'Edit Curriculum Entry' : 'New Curriculum Entry'}
        subtitle="Define a weekly standard for a specific grade and subject"
      />

      <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
        {/* Classification */}
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100">Classification</h3>
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
            <FormField label="Semester" error={errors.semesterId?.message} required>
              <Controller name="semesterId" control={control} rules={{ required: 'Semester is required' }}
                render={({ field }) => (
                  <LookupSelect type="SEMESTER" value={field.value} onChange={field.onChange} error={errors.semesterId} />
                )} />
            </FormField>
            <FormField label="Week No" error={errors.weekNo?.message} required>
              <input type="number" className={cn('input', errors.weekNo && 'input-error')} placeholder="1–52"
                {...register('weekNo', { required: 'Week is required', valueAsNumber: true, min: { value: 1, message: 'Min 1' }, max: { value: 52, message: 'Max 52' } })} />
            </FormField>
          </div>
        </div>

        {/* Standard */}
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100">Standard</h3>
          <div className="space-y-4">
            <FormField label="Standard Code" error={errors.standardCode?.message} required>
              <input className={cn('input font-mono', errors.standardCode && 'input-error')} placeholder="e.g. ELA-2.1"
                {...register('standardCode', { required: 'Standard code is required' })} />
            </FormField>
            <FormField label="Standard Description" error={errors.standardDescription?.message} required>
              <textarea rows={3} className={cn('input resize-none', errors.standardDescription && 'input-error')}
                placeholder="Describe the learning standard…"
                {...register('standardDescription', { required: 'Description is required' })} />
            </FormField>
          </div>
        </div>

        {/* Learning Details */}
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100">Learning Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: 'skills', label: 'Skills', placeholder: 'Skills addressed in this week…' },
              { name: 'input', label: 'Input', placeholder: 'Resources and inputs used…' },
              { name: 'process', label: 'Process', placeholder: 'Teaching process description…' },
              { name: 'outcome', label: 'Outcome', placeholder: 'Expected learning outcomes…' },
            ].map(f => (
              <FormField key={f.name} label={f.label} error={errors[f.name]?.message} required>
                <textarea rows={4} className={cn('input resize-none', errors[f.name] && 'input-error')} placeholder={f.placeholder}
                  {...register(f.name, { required: `${f.label} is required` })} />
              </FormField>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/curriculum')}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Update Entry' : 'Create Entry'}
          </button>
        </div>
      </form>
    </div>
  )
}
