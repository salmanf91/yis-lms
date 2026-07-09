import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLessonPlanById, submitLessonPlan, approveLessonPlan, rejectLessonPlan, deactivateLessonPlan } from '../../api/lessonPlan.api'
import { useRole } from '../../hooks/useRole'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/StatusBadge'
import ReviewModal from '../../components/ReviewModal'
import ConfirmDialog from '../../components/ConfirmDialog'
import { formatDateTime } from '../../utils/formatDate'
import { toast } from 'sonner'

function InfoBlock({ label, value }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-neutral-800 leading-relaxed whitespace-pre-wrap">{value}</p>
    </div>
  )
}

export default function LessonPlanDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { isTeacher, isHod, isAdmin } = useRole()
  const { user } = useAuth()
  const [reviewModal, setReviewModal] = useState(null) // 'approve' | 'reject'
  const [confirmSubmit, setConfirmSubmit] = useState(false)

  const { data: plan, isLoading } = useQuery({
    queryKey: ['lessonPlan', id],
    queryFn: () => getLessonPlanById(id),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['lessonPlan', id] })
    qc.invalidateQueries({ queryKey: ['lessonPlans'] })
  }

  const submitMutation = useMutation({
    mutationFn: () => submitLessonPlan(id),
    onSuccess: () => { toast.success('Plan submitted for review'); invalidate(); setConfirmSubmit(false) },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not submit'),
  })

  const approveMutation = useMutation({
    mutationFn: (comments) => approveLessonPlan(id, comments),
    onSuccess: () => { toast.success('Plan approved'); invalidate(); setReviewModal(null) },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not approve'),
  })

  const rejectMutation = useMutation({
    mutationFn: (comments) => rejectLessonPlan(id, comments),
    onSuccess: () => { toast.success('Plan rejected'); invalidate(); setReviewModal(null) },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not reject'),
  })

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateLessonPlan(id),
    onSuccess: () => { toast.success('Plan deactivated'); invalidate() },
    onError: () => toast.error('Could not deactivate'),
  })

  if (isLoading) return <div className="p-8 text-neutral-400">Loading…</div>
  if (!plan) return <div className="p-8 text-neutral-400">Plan not found.</div>

  const curric = plan.curriculumId
  const isOwner = (plan.teacherId?._id || plan.teacherId) === user?.id

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StatusBadge status={plan.status} />
            {!plan.isActive && <span className="badge bg-neutral-100 text-neutral-500">Inactive</span>}
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">{plan.topic}</h2>
          <p className="text-sm text-neutral-500 mt-1">
            {plan.gradeId?.label} · {plan.subjectId?.label} · {plan.semesterId?.label} · Week {plan.weekNo}
          </p>
          {!isTeacher && <p className="text-sm text-neutral-400 mt-0.5">Teacher: {plan.teacherId?.name}</p>}
        </div>
        <button className="btn-secondary btn-sm" onClick={() => navigate('/lesson-plans')}>← Back</button>
      </div>

      {/* Curriculum Reference */}
      {curric && typeof curric === 'object' && (
        <div className="card p-5 mb-4 border-l-4 border-l-brand">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-sm font-bold text-brand">{curric.standardCode}</span>
            <span className="text-xs text-neutral-400">Curriculum Reference</span>
          </div>
          <p className="text-sm text-neutral-700 mb-4">{curric.standardDescription}</p>
          <div className="grid grid-cols-2 gap-3">
            {['skills','input','process','outcome'].map(k => (
              <div key={k} className="bg-neutral-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-neutral-400 uppercase mb-1">{k}</p>
                <p className="text-xs text-neutral-600">{curric[k]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plan Content */}
      <div className="card p-5 mb-4 space-y-4">
        <h3 className="font-semibold text-neutral-800 border-b border-neutral-100 pb-3">Lesson Plan</h3>
        <InfoBlock label="Topic" value={plan.topic} />
        <InfoBlock label="Classwork" value={plan.resource} />
        <InfoBlock label="Homework" value={plan.assessment} />
      </div>

      {/* Metadata */}
      <div className="card p-5 mb-4">
        <h3 className="font-semibold text-neutral-800 border-b border-neutral-100 pb-3 mb-3">Timeline</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-neutral-400 mb-0.5">Created</p>
            <p className="text-neutral-700">{formatDateTime(plan.createdAt)}</p>
          </div>
          {plan.submittedAt && (
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Submitted</p>
              <p className="text-neutral-700">{formatDateTime(plan.submittedAt)}</p>
            </div>
          )}
          {plan.reviewedAt && (
            <div>
              <p className="text-xs text-neutral-400 mb-0.5">Reviewed by</p>
              <p className="text-neutral-700">{plan.reviewedBy?.name || '—'} · {formatDateTime(plan.reviewedAt)}</p>
            </div>
          )}
        </div>
        {plan.reviewComments && (
          <div className={`mt-4 rounded-lg p-3 ${plan.status === 'REJECTED' ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <p className="text-xs font-semibold text-neutral-500 mb-1">HOD Comments</p>
            <p className="text-sm text-neutral-700">{plan.reviewComments}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3 justify-end">
        {isTeacher && isOwner && (plan.status === 'DRAFT' || plan.status === 'REJECTED') && plan.isActive && (
          <>
            <button className="btn-secondary" onClick={() => navigate(`/lesson-plans/${id}/edit`)}>Edit</button>
            <button className="btn-primary" onClick={() => setConfirmSubmit(true)}>
              {plan.status === 'REJECTED' ? 'Re-submit for Review' : 'Submit for Review'}
            </button>
          </>
        )}
        {isHod && plan.status === 'SUBMITTED' && (
          <>
            <button className="btn-danger" onClick={() => setReviewModal('reject')}>Reject</button>
            <button className="btn-primary" onClick={() => setReviewModal('approve')}>Approve</button>
          </>
        )}
        {isAdmin && plan.isActive && (
          <button className="btn-secondary text-danger hover:bg-red-50" onClick={() => deactivateMutation.mutate()}>
            Deactivate
          </button>
        )}
      </div>

      <ReviewModal
        open={!!reviewModal}
        action={reviewModal}
        onCancel={() => setReviewModal(null)}
        isLoading={approveMutation.isPending || rejectMutation.isPending}
        onSubmit={(comments) =>
          reviewModal === 'approve' ? approveMutation.mutate(comments) : rejectMutation.mutate(comments)
        }
      />

      <ConfirmDialog
        open={confirmSubmit}
        title="Submit lesson plan?"
        description="Once submitted, you won't be able to edit this plan. The HOD will review it."
        confirmLabel="Submit"
        onConfirm={() => submitMutation.mutate()}
        onCancel={() => setConfirmSubmit(false)}
        isLoading={submitMutation.isPending}
      />
    </div>
  )
}
