import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { useQuery, useMutation } from '@tanstack/react-query'
import { createLessonPlan, updateLessonPlan, getLessonPlanById, submitLessonPlan } from '../../api/lessonPlan.api'
import { getCurriculum } from '../../api/curriculum.api'
import LookupSelect from '../../components/LookupSelect'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'

export default function LessonPlanFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const [submitAfterSave, setSubmitAfterSave] = useState(false)
  const [curricMatch, setCurricMatch] = useState(null)

  const { data: existing } = useQuery({
    queryKey: ['lessonPlan', id],
    queryFn: () => getLessonPlanById(id),
    enabled: isEdit,
  })

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (isEdit && existing) {
      reset({
        gradeId: existing.gradeId?._id || existing.gradeId,
        subjectId: existing.subjectId?._id || existing.subjectId,
        semesterId: existing.semesterId?._id || existing.semesterId,
        weekNo: existing.weekNo,
        curriculumId: existing.curriculumId?._id || existing.curriculumId,
        topic: existing.topic,
        resource: existing.resource || '',
        assessment: existing.assessment || '',
      })
    }
  }, [existing, isEdit, reset])

  const [gradeId, subjectId, semesterId, weekNo] = watch(['gradeId','subjectId','semesterId','weekNo'])

  // Auto-load matching curriculum
  const { data: curricData = [] } = useQuery({
    queryKey: ['curriculum', { gradeId, subjectId, semesterId, weekNo: Number(weekNo) }],
    queryFn: () => getCurriculum({ gradeId, subjectId, semesterId, weekNo }),
    enabled: !!(gradeId && subjectId && semesterId && weekNo),
  })

  useEffect(() => {
    const list = curricData.data || (Array.isArray(curricData) ? curricData : [])
    if (list.length > 0) {
      setCurricMatch(list[0])
      setValue('curriculumId', list[0]._id)
    } else {
      setCurricMatch(null)
      setValue('curriculumId', '')
    }
  }, [curricData, setValue])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? updateLessonPlan(id, data) : createLessonPlan(data),
    onSuccess: async (saved) => {
      if (submitAfterSave) {
        const planId = saved._id || id
        try {
          await submitLessonPlan(planId)
          toast.success('Plan submitted for review')
        } catch {
          toast.success('Plan saved. Submission failed — try submitting from the detail page.')
        }
      } else {
        toast.success(isEdit ? 'Plan updated' : 'Plan saved as draft')
      }
      navigate('/lesson-plans')
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save'),
  })

  const onSubmit = (data, andSubmit = false) => {
    setSubmitAfterSave(andSubmit)
    mutation.mutate(data)
  }

  return (
    <div className="max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/lesson-plans')}
        className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Lesson Plans
      </button>
      <PageHeader
        title={isEdit ? 'Edit Lesson Plan' : 'New Lesson Plan'}
        subtitle="Link your plan to a curriculum entry and add lesson details"
      />

      <form className="space-y-6">
        {/* Step 1: Curriculum Selection */}
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">1</span>
            Select Curriculum
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <FormField label="Grade" error={errors.gradeId?.message} required>
              <Controller name="gradeId" control={control} rules={{ required: 'Grade is required' }}
                render={({ field }) => <LookupSelect type="GRADE" value={field.value} onChange={field.onChange} error={errors.gradeId} />} />
            </FormField>
            <FormField label="Subject" error={errors.subjectId?.message} required>
              <Controller name="subjectId" control={control} rules={{ required: 'Subject is required' }}
                render={({ field }) => <LookupSelect type="SUBJECT" value={field.value} onChange={field.onChange} error={errors.subjectId} />} />
            </FormField>
            <FormField label="Semester" error={errors.semesterId?.message} required>
              <Controller name="semesterId" control={control} rules={{ required: 'Semester is required' }}
                render={({ field }) => <LookupSelect type="SEMESTER" value={field.value} onChange={field.onChange} error={errors.semesterId} />} />
            </FormField>
            <FormField label="Week No" error={errors.weekNo?.message} required>
              <input type="number" className={cn('input', errors.weekNo && 'input-error')} placeholder="1–52"
                {...register('weekNo', { required: 'Week is required', min: { value: 1, message: 'Min 1' }, max: { value: 52, message: 'Max 52' } })} />
            </FormField>
          </div>

          {/* Curriculum preview */}
          {gradeId && subjectId && semesterId && weekNo && (
            curricMatch ? (
              <div className="rounded-lg bg-brand/5 border border-brand/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="font-mono text-sm font-bold text-brand">{curricMatch.standardCode}</span>
                  <span className="badge bg-green-100 text-green-700">Curriculum found</span>
                </div>
                <p className="text-sm text-neutral-700 mb-3">{curricMatch.standardDescription}</p>
                <div className="grid grid-cols-2 gap-3">
                  {['skills','input','process','outcome'].map(k => (
                    <div key={k} className="bg-white rounded-lg p-3 border border-neutral-100">
                      <p className="text-xs font-semibold text-neutral-400 uppercase mb-1">{k}</p>
                      <p className="text-xs text-neutral-600">{curricMatch[k]}</p>
                    </div>
                  ))}
                </div>
                <input type="hidden" {...register('curriculumId', { required: true })} />
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-700">
                No curriculum entry found for this Grade + Subject + Semester + Week combination. Contact your administrator.
              </div>
            )
          )}
        </div>

        {/* Step 2: Plan Details */}
        <div className="card p-6">
          <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">2</span>
            Plan Details
          </h3>
          <div className="space-y-4">
            <FormField label="Topic" error={errors.topic?.message} required>
              <input className={cn('input', errors.topic && 'input-error')} placeholder="Lesson topic for this week"
                {...register('topic', { required: 'Topic is required' })} />
            </FormField>
            <FormField label="Classwork" error={errors.resource?.message}>
              <textarea rows={3} className="input resize-none" placeholder="Materials, textbooks, classwork details… (optional)"
                {...register('resource')} />
            </FormField>
            <FormField label="Homework" error={errors.assessment?.message}>
              <textarea rows={3} className="input resize-none" placeholder="Homework assignments, tasks… (optional)"
                {...register('assessment')} />
            </FormField>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={() => navigate('/lesson-plans')}>Cancel</button>
          <button
            type="button"
            className="btn-secondary"
            disabled={mutation.isPending}
            onClick={handleSubmit(d => onSubmit(d, false))}
          >
            {mutation.isPending && !submitAfterSave ? 'Saving…' : 'Save as Draft'}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={mutation.isPending || !curricMatch}
            onClick={handleSubmit(d => onSubmit(d, true))}
          >
            {mutation.isPending && submitAfterSave ? 'Submitting…' : 'Save & Submit'}
          </button>
        </div>
      </form>
    </div>
  )
}
