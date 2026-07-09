import { cn } from '../utils/cn'

export default function FormField({ label, error, required, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="label">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger-500 mt-0.5">{error}</p>}
    </div>
  )
}
