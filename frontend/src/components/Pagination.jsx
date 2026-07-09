const PAGE_SIZES = [10, 50, 100]

export default function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }) {
  const effectiveTotal = totalPages || 1
  const from = total > 0 ? (page - 1) * (limit === 9999 ? total : limit) + 1 : 0
  const to = limit === 9999 ? total : Math.min(page * limit, total)

  const start = Math.max(1, page - 2)
  const end = Math.min(effectiveTotal, page + 2)
  const pages = []
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100 bg-neutral-50/50">
      {/* Left: rows per page + count */}
      <div className="flex items-center gap-2.5">
        <span className="text-xs text-neutral-500 whitespace-nowrap">Rows per page:</span>
        <select
          className="text-xs border border-neutral-200 rounded-md px-2 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand transition-colors cursor-pointer"
          value={limit === 9999 ? 'all' : limit}
          onChange={e => {
            const v = e.target.value
            onLimitChange?.(v === 'all' ? 9999 : Number(v))
            onPageChange(1)
          }}
        >
          {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          <option value="all">All</option>
        </select>
        <span className="text-xs text-neutral-400">
          {total > 0 ? `${from}–${to} of ${total}` : 'No results'}
        </span>
      </div>

      {/* Right: page navigation */}
      {effectiveTotal > 1 && (
        <div className="flex items-center gap-0.5">
          <NavBtn onClick={() => onPageChange(1)} disabled={page === 1} label="«" />
          <NavBtn onClick={() => onPageChange(page - 1)} disabled={page === 1} label="‹" />

          {start > 1 && <span className="w-8 h-8 flex items-center justify-center text-neutral-400 text-xs select-none">…</span>}

          {pages.map(p => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`w-8 h-8 flex items-center justify-center rounded-md text-xs font-medium transition-all ${
                p === page
                  ? 'bg-brand text-white shadow-sm ring-1 ring-brand/20'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >{p}</button>
          ))}

          {end < effectiveTotal && <span className="w-8 h-8 flex items-center justify-center text-neutral-400 text-xs select-none">…</span>}

          <NavBtn onClick={() => onPageChange(page + 1)} disabled={page === effectiveTotal} label="›" />
          <NavBtn onClick={() => onPageChange(effectiveTotal)} disabled={page === effectiveTotal} label="»" />
        </div>
      )}
    </div>
  )
}

function NavBtn({ onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-8 h-8 flex items-center justify-center rounded-md text-sm text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {label}
    </button>
  )
}
