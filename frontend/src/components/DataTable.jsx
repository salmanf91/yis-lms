import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from '@tanstack/react-table'
import { useState } from 'react'
import { cn } from '../utils/cn'

export default function DataTable({
  columns,
  data = [],
  isLoading = false,
  emptyMessage = 'No records found.',
  onRowClick,
}) {
  const [sorting, setSorting] = useState([])

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 15 } },
  })

  if (isLoading) {
    return (
      <div className="card overflow-hidden">
        <table className="w-full">
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i} className="border-b border-neutral-100">
                {columns.map((_, j) => (
                  <td key={j} className="table-cell">
                    <div className="h-4 bg-neutral-100 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    className={cn('table-header', header.column.getCanSort() && 'cursor-pointer select-none')}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && <span>↑</span>}
                      {header.column.getIsSorted() === 'desc' && <span>↓</span>}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="table-cell text-center text-neutral-400 py-12">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={cn('hover:bg-neutral-50 transition-colors', onRowClick && 'cursor-pointer')}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="table-cell">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {table.getPageCount() > 1 && (
        <div className="px-4 py-3 border-t border-neutral-200 flex items-center justify-between bg-neutral-50">
          <p className="text-xs text-neutral-500">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <button
              className="btn-secondary btn-sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
