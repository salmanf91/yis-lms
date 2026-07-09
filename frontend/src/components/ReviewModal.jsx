import { useForm } from 'react-hook-form'
import { cn } from '../utils/cn'

export default function ReviewModal({ open, action, onSubmit, onCancel, isLoading }) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()

  if (!open) return null

  const isReject = action === 'reject'

  const submit = (data) => {
    onSubmit(data.comments)
    reset()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card p-6 w-full max-w-md shadow-xl">
        <h3 className="text-base font-semibold text-neutral-900 mb-1">
          {isReject ? 'Reject Lesson Plan' : 'Approve Lesson Plan'}
        </h3>
        <p className="text-sm text-neutral-500 mb-4">
          {isReject
            ? 'Please provide feedback so the teacher can revise their plan.'
            : 'Optionally add a note for the teacher.'}
        </p>

        <form onSubmit={handleSubmit(submit)}>
          <textarea
            rows={4}
            placeholder={isReject ? 'Required feedback…' : 'Optional comments…'}
            className={cn('input resize-none mb-1', errors.comments && 'input-error')}
            {...register('comments', {
              required: isReject ? 'Feedback is required when rejecting' : false,
              minLength: isReject ? { value: 10, message: 'Please provide at least 10 characters' } : undefined,
            })}
          />
          {errors.comments && (
            <p className="text-xs text-danger mb-3">{errors.comments.message}</p>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
              Cancel
            </button>
            <button
              type="submit"
              className={isReject ? 'btn-danger' : 'btn-primary'}
              disabled={isLoading}
            >
              {isLoading ? 'Saving…' : isReject ? 'Reject Plan' : 'Approve Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
