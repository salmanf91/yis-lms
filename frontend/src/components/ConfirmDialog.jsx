export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
  isLoading = false,
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative card p-6 w-full max-w-md shadow-xl">
        <h3 className="text-base font-semibold text-neutral-900 mb-2">{title}</h3>
        <p className="text-sm text-neutral-500 mb-6">{description}</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={onCancel} disabled={isLoading}>
            {cancelLabel}
          </button>
          <button
            className={variant === 'destructive' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
