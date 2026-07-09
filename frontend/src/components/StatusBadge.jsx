import { cn } from '../utils/cn'

const config = {
  DRAFT:     { label: 'Draft',     cls: 'bg-neutral-100 text-neutral-600' },
  SUBMITTED: { label: 'Submitted', cls: 'bg-blue-100 text-blue-700' },
  APPROVED:  { label: 'Approved',  cls: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Rejected',  cls: 'bg-red-100 text-danger-600' },
}

export default function StatusBadge({ status }) {
  const c = config[status] || { label: status, cls: 'bg-neutral-100 text-neutral-600' }
  return (
    <span className={cn('badge', c.cls)}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 opacity-70" />
      {c.label}
    </span>
  )
}
