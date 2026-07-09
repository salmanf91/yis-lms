export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900">{title}</h2>
        {subtitle && <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}
