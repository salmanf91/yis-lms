import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCurriculumById } from '../../api/curriculum.api'
import PageHeader from '../../components/PageHeader'
import { cn } from '../../utils/cn'

function InfoCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-neutral-800 whitespace-pre-wrap">{value || '—'}</p>
    </div>
  )
}

export default function CurriculumDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['curriculum', 'detail', id],
    queryFn: () => getCurriculumById(id),
  })

  if (isLoading) return <div className="p-8 text-neutral-400">Loading…</div>
  if (!data) return <div className="p-8 text-neutral-400">Curriculum entry not found.</div>

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={data.standardCode}
        subtitle={`${data.gradeId?.label} · ${data.subjectId?.label} · ${data.semesterId?.label} · Week ${data.weekNo}`}
        action={
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => navigate('/curriculum')}>← Back</button>
            <button className="btn-primary" onClick={() => navigate(`/curriculum/${id}/edit`)}>Edit</button>
          </div>
        }
      />

      {/* Status */}
      <div className="mb-6">
        <span className={cn('badge', data.isActive ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500')}>
          {data.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Standard description */}
      <div className="card p-6 mb-4">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2">Standard Description</p>
        <p className="text-neutral-800 leading-relaxed">{data.standardDescription}</p>
      </div>

      {/* Learning 2×2 grid */}
      <div className="grid grid-cols-2 gap-4">
        <InfoCard label="Skills" value={data.skills} />
        <InfoCard label="Input" value={data.input} />
        <InfoCard label="Process" value={data.process} />
        <InfoCard label="Outcome" value={data.outcome} />
      </div>
    </div>
  )
}
