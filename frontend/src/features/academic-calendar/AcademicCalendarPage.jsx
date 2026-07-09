// import { useState, useRef } from 'react'
// import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
// import { useForm, useFieldArray } from 'react-hook-form'
// import { getAcademicYears, createAcademicYear, setActiveAcademicYear, getCurrentAcademicWeek } from '../../api/academicYear.api'
// import api from '../../api/axios'
// import PageHeader from '../../components/PageHeader'
// import FormField from '../../components/FormField'
// import { toast } from 'sonner'
// import { cn } from '../../utils/cn'

// // ─── New Year Form ────────────────────────────────────────────────────────────
// function AcademicYearForm({ onSuccess }) {
//   const { register, control, handleSubmit, formState: { errors } } = useForm({
//     defaultValues: {
//       name: '',
//       startDate: '',
//       endDate: '',
//       semesters: [
//         { code: 'S01', name: 'Term 1', startDate: '', endDate: '', weekCount: 15, breaks: [] },
//         { code: 'S02', name: 'Term 2', startDate: '', endDate: '', weekCount: 15, breaks: [] },
//       ],
//     },
//   })

//   const { fields: semFields } = useFieldArray({ control, name: 'semesters' })

//   const mutation = useMutation({
//     mutationFn: createAcademicYear,
//     onSuccess: () => { toast.success('Academic year created and set as active'); onSuccess() },
//     onError: (e) => toast.error(e.response?.data?.message || 'Failed to create'),
//   })

//   return (
//     <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
//       {/* Year-level info */}
//       <div className="card p-6">
//         <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100">Academic Year</h3>
//         <div className="grid grid-cols-3 gap-4">
//           <FormField label="Year Name" error={errors.name?.message} required>
//             <input className={cn('input', errors.name && 'input-error')} placeholder="e.g. 2024-2025"
//               {...register('name', { required: 'Year name is required' })} />
//           </FormField>
//           <FormField label="Start Date" error={errors.startDate?.message} required>
//             <input type="date" className={cn('input', errors.startDate && 'input-error')}
//               {...register('startDate', { required: 'Start date is required' })} />
//           </FormField>
//           <FormField label="End Date" error={errors.endDate?.message} required>
//             <input type="date" className={cn('input', errors.endDate && 'input-error')}
//               {...register('endDate', { required: 'End date is required' })} />
//           </FormField>
//         </div>
//       </div>

//       {/* Semesters */}
//       {semFields.map((sem, si) => (
//         <SemesterSection key={sem.id} si={si} register={register} control={control} errors={errors} />
//       ))}

//       <div className="flex justify-end">
//         <button type="submit" className="btn-primary" disabled={mutation.isPending}>
//           {mutation.isPending ? 'Creating…' : 'Create & Set Active'}
//         </button>
//       </div>
//     </form>
//   )
// }

// function SemesterSection({ si, register, control, errors }) {
//   const { fields: breakFields, append: addBreak, remove: removeBreak } = useFieldArray({
//     control, name: `semesters.${si}.breaks`,
//   })

//   return (
//     <div className="card p-6">
//       <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100 flex items-center gap-2">
//         <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">{si + 1}</span>
//         Semester {si + 1}
//       </h3>

//       <div className="grid grid-cols-2 gap-4 mb-4">
//         <FormField label="Semester Code">
//           <input className="input" placeholder="S01"
//             {...register(`semesters.${si}.code`, { required: true })} />
//         </FormField>
//         <FormField label="Semester Name">
//           <input className="input" placeholder="Term 1"
//             {...register(`semesters.${si}.name`, { required: true })} />
//         </FormField>
//         <FormField label="Start Date">
//           <input type="date" className="input"
//             {...register(`semesters.${si}.startDate`, { required: true })} />
//         </FormField>
//         <FormField label="End Date">
//           <input type="date" className="input"
//             {...register(`semesters.${si}.endDate`, { required: true })} />
//         </FormField>
//         <FormField label="Teaching Weeks" required>
//           <input type="number" className="input" min={1} max={30} placeholder="15"
//             {...register(`semesters.${si}.weekCount`, { required: true, valueAsNumber: true, min: 1 })} />
//           <p className="text-xs text-neutral-400 mt-1">Number of teaching weeks (excluding breaks)</p>
//         </FormField>
//       </div>

//       {/* Breaks */}
//       <div>
//         <div className="flex items-center justify-between mb-3">
//           <p className="text-sm font-medium text-neutral-700">Mid-term / Holiday Breaks</p>
//           <button type="button" className="btn-secondary btn-sm"
//             onClick={() => addBreak({ name: '', startDate: '', endDate: '' })}>
//             + Add Break
//           </button>
//         </div>
//         {breakFields.length === 0 && (
//           <p className="text-xs text-neutral-400">No breaks added. Week count above is used as-is.</p>
//         )}
//         <div className="space-y-3">
//           {breakFields.map((br, bi) => (
//             <div key={br.id} className="grid grid-cols-4 gap-3 items-end bg-neutral-50 rounded-lg p-3">
//               <FormField label="Break Name">
//                 <input className="input" placeholder="Mid-term break"
//                   {...register(`semesters.${si}.breaks.${bi}.name`, { required: true })} />
//               </FormField>
//               <FormField label="From">
//                 <input type="date" className="input"
//                   {...register(`semesters.${si}.breaks.${bi}.startDate`, { required: true })} />
//               </FormField>
//               <FormField label="To">
//                 <input type="date" className="input"
//                   {...register(`semesters.${si}.breaks.${bi}.endDate`, { required: true })} />
//               </FormField>
//               <button type="button" className="btn-ghost btn-sm text-danger hover:bg-red-50 mb-0.5"
//                 onClick={() => removeBreak(bi)}>Remove</button>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   )
// }

// // ─── Year card ────────────────────────────────────────────────────────────────
// function YearCard({ year, onSetActive }) {
//   return (
//     <div className={cn('card p-5', year.isActive && 'border-brand/30 bg-brand/5')}>
//       <div className="flex items-start justify-between mb-3">
//         <div>
//           <div className="flex items-center gap-2">
//             <h4 className="font-semibold text-neutral-800">{year.name}</h4>
//             {year.isActive && <span className="badge bg-brand text-white text-[10px]">Active</span>}
//           </div>
//           <p className="text-xs text-neutral-500 mt-0.5">
//             {new Date(year.startDate).toLocaleDateString()} – {new Date(year.endDate).toLocaleDateString()}
//           </p>
//         </div>
//         {!year.isActive && (
//           <button className="btn-secondary btn-sm" onClick={() => onSetActive(year._id)}>
//             Set Active
//           </button>
//         )}
//       </div>
//       <div className="grid grid-cols-2 gap-3 mt-4">
//         {year.semesters.map((sem, i) => (
//           <div key={i} className="bg-white rounded-lg border border-neutral-200 p-3">
//             <div className="flex items-center justify-between mb-2">
//               <p className="text-sm font-semibold text-neutral-800">{sem.name}</p>
//               <span className="badge bg-brand/10 text-brand text-[10px]">{sem.weekCount} weeks</span>
//             </div>
//             <p className="text-xs text-neutral-500">
//               {new Date(sem.startDate).toLocaleDateString()} – {new Date(sem.endDate).toLocaleDateString()}
//             </p>
//             {sem.breaks.length > 0 && (
//               <div className="mt-2 space-y-1">
//                 {sem.breaks.map((b, bi) => (
//                   <p key={bi} className="text-xs text-neutral-400">
//                     🏖 {b.name}: {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
//                   </p>
//                 ))}
//               </div>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   )
// }

// // ─── Main page ────────────────────────────────────────────────────────────────
// export default function AcademicCalendarPage() {
//   const qc = useQueryClient()
//   const [showForm, setShowForm] = useState(false)
//   const [importing, setImporting] = useState(false)
//   const fileRef = useRef(null)

//   const handleImport = async (e) => {
//     const file = e.target.files?.[0]
//     if (!file) return
//     setImporting(true)
//     try {
//       const fd = new FormData()
//       fd.append('file', file)
//       await api.post('/academic-years/import-xlsx', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
//       toast.success('Academic year imported and set as active')
//       qc.invalidateQueries({ queryKey: ['academicYears'] })
//       qc.invalidateQueries({ queryKey: ['currentWeek'] })
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Import failed')
//     } finally {
//       setImporting(false)
//       e.target.value = ''
//     }
//   }

//   const { data: years = [], isLoading } = useQuery({
//     queryKey: ['academicYears'],
//     queryFn: getAcademicYears,
//   })

//   const { data: currentWeek } = useQuery({
//     queryKey: ['currentWeek'],
//     queryFn: getCurrentAcademicWeek,
//   })

//   const setActiveMutation = useMutation({
//     mutationFn: setActiveAcademicYear,
//     onSuccess: () => { qc.invalidateQueries({ queryKey: ['academicYears'] }); toast.success('Active year updated') },
//     onError: () => toast.error('Failed to update'),
//   })

//   return (
//     <div>
//       <PageHeader
//         title="Academic Calendar"
//         subtitle="Set up academic years, semesters, and holiday breaks for week tracking"
//         action={
//           <div className="flex gap-2">
//             <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
//             <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
//               {importing ? 'Importing...' : 'Import from Excel'}
//             </button>
//             <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
//               {showForm ? '✕ Cancel' : '+ New Academic Year'}
//             </button>
//           </div>
//         }
//       />

//       {/* Current week banner */}
//       {currentWeek?.inSession && (
//         <div className="card p-4 mb-6 bg-brand/5 border-brand/20 flex items-center gap-4">
//           <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-sm">
//             W{currentWeek.weekNo}
//           </div>
//           <div>
//             <p className="font-semibold text-neutral-800">Current Academic Week: {currentWeek.weekNo}</p>
//             <p className="text-sm text-neutral-500">{currentWeek.semesterName} · {currentWeek.semesterCode}</p>
//           </div>
//         </div>
//       )}

//       {!currentWeek?.inSession && !isLoading && years.length > 0 && (
//         <div className="card p-4 mb-6 bg-amber-50 border-amber-200">
//           <p className="text-sm text-amber-700 font-medium">Today is outside the active academic year dates.</p>
//         </div>
//       )}

//       {/* New year form */}
//       {showForm && (
//         <div className="mb-6">
//           <AcademicYearForm onSuccess={() => {
//             setShowForm(false)
//             qc.invalidateQueries({ queryKey: ['academicYears'] })
//             qc.invalidateQueries({ queryKey: ['currentWeek'] })
//           }} />
//         </div>
//       )}

//       {/* Existing years */}
//       {isLoading ? (
//         <div className="card p-8 text-center text-neutral-400">Loading…</div>
//       ) : years.length === 0 ? (
//         <div className="card p-12 text-center text-neutral-400">
//           <p className="font-medium mb-1">No academic years configured</p>
//           <p className="text-sm">Click <strong>New Academic Year</strong> to set up your first year.</p>
//         </div>
//       ) : (
//         <div className="space-y-4">
//           {years.map(y => (
//             <YearCard key={y._id} year={y} onSetActive={(id) => setActiveMutation.mutate(id)} />
//           ))}
//         </div>
//       )}
//     </div>
//   )
// }


import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { getAcademicYears, createAcademicYear, setActiveAcademicYear, getCurrentAcademicWeek } from '../../api/academicYear.api'
import api from '../../api/axios'
import PageHeader from '../../components/PageHeader'
import FormField from '../../components/FormField'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'

// ─── Helper: Clean up messy backend strings ──────────────────────────────────
const formatBreakName = (rawName) => {
  if (!rawName) return 'School Break';

  // Split by '|' to handle the concatenated backend strings
  let parts = rawName.split('|').map(p => p.trim());

  // Filter out standalone numbers (like "9", "16") and empty parts
  parts = parts.filter(p => p && !/^\d+$/.test(p));

  // Remove day prefixes with colons (e.g., "24: National Day" -> "National Day")
  parts = parts.map(p => p.replace(/^\d+:\s*/, ''));

  // Remove duplicates
  const uniqueParts = [...new Set(parts)];

  // Return a clean joined string, or a fallback if everything was filtered out
  return uniqueParts.length > 0 ? uniqueParts.join(' • ') : 'School Break';
};

// ─── New Year Form ────────────────────────────────────────────────────────────
function AcademicYearForm({ onSuccess }) {
  const { register, control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      startDate: '',
      endDate: '',
      semesters: [
        { code: 'S01', name: 'Term 1', startDate: '', endDate: '', weekCount: 15, breaks: [] },
        { code: 'S02', name: 'Term 2', startDate: '', endDate: '', weekCount: 15, breaks: [] },
      ],
    },
  })

  const { fields: semFields } = useFieldArray({ control, name: 'semesters' })

  const mutation = useMutation({
    mutationFn: createAcademicYear,
    onSuccess: () => { toast.success('Academic year created and set as active'); onSuccess() },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to create'),
  })

  return (
    <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-6">
      {/* Year-level info */}
      <div className="card p-6">
        <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100">Academic Year</h3>
        <div className="grid grid-cols-3 gap-4">
          <FormField label="Year Name" error={errors.name?.message} required>
            <input className={cn('input', errors.name && 'input-error')} placeholder="e.g. 2024-2025"
              {...register('name', { required: 'Year name is required' })} />
          </FormField>
          <FormField label="Start Date" error={errors.startDate?.message} required>
            <input type="date" className={cn('input', errors.startDate && 'input-error')}
              {...register('startDate', { required: 'Start date is required' })} />
          </FormField>
          <FormField label="End Date" error={errors.endDate?.message} required>
            <input type="date" className={cn('input', errors.endDate && 'input-error')}
              {...register('endDate', { required: 'End date is required' })} />
          </FormField>
        </div>
      </div>

      {/* Semesters */}
      {semFields.map((sem, si) => (
        <SemesterSection key={sem.id} si={si} register={register} control={control} errors={errors} />
      ))}

      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating…' : 'Create & Set Active'}
        </button>
      </div>
    </form>
  )
}

function SemesterSection({ si, register, control, errors }) {
  const { fields: breakFields, append: addBreak, remove: removeBreak } = useFieldArray({
    control, name: `semesters.${si}.breaks`,
  })

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-neutral-800 mb-4 pb-3 border-b border-neutral-100 flex items-center gap-2">
        <span className="w-6 h-6 rounded-full bg-brand text-white text-xs flex items-center justify-center font-bold">{si + 1}</span>
        Semester {si + 1}
      </h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <FormField label="Semester Code">
          <input className="input" placeholder="S01"
            {...register(`semesters.${si}.code`, { required: true })} />
        </FormField>
        <FormField label="Semester Name">
          <input className="input" placeholder="Term 1"
            {...register(`semesters.${si}.name`, { required: true })} />
        </FormField>
        <FormField label="Start Date">
          <input type="date" className="input"
            {...register(`semesters.${si}.startDate`, { required: true })} />
        </FormField>
        <FormField label="End Date">
          <input type="date" className="input"
            {...register(`semesters.${si}.endDate`, { required: true })} />
        </FormField>
        <FormField label="Teaching Weeks" required>
          <input type="number" className="input" min={1} max={30} placeholder="15"
            {...register(`semesters.${si}.weekCount`, { required: true, valueAsNumber: true, min: 1 })} />
          <p className="text-xs text-neutral-400 mt-1">Number of teaching weeks (excluding breaks)</p>
        </FormField>
      </div>

      {/* Breaks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-neutral-700">Mid-term / Holiday Breaks</p>
          <button type="button" className="btn-secondary btn-sm"
            onClick={() => addBreak({ name: '', startDate: '', endDate: '' })}>
            + Add Break
          </button>
        </div>
        {breakFields.length === 0 && (
          <p className="text-xs text-neutral-400">No breaks added. Week count above is used as-is.</p>
        )}
        <div className="space-y-3">
          {breakFields.map((br, bi) => (
            <div key={br.id} className="grid grid-cols-4 gap-3 items-end bg-neutral-50 rounded-lg p-3">
              <FormField label="Break Name">
                <input className="input" placeholder="Mid-term break"
                  {...register(`semesters.${si}.breaks.${bi}.name`, { required: true })} />
              </FormField>
              <FormField label="From">
                <input type="date" className="input"
                  {...register(`semesters.${si}.breaks.${bi}.startDate`, { required: true })} />
              </FormField>
              <FormField label="To">
                <input type="date" className="input"
                  {...register(`semesters.${si}.breaks.${bi}.endDate`, { required: true })} />
              </FormField>
              <button type="button" className="btn-ghost btn-sm text-danger hover:bg-red-50 mb-0.5"
                onClick={() => removeBreak(bi)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Year card ────────────────────────────────────────────────────────────────
function YearCard({ year, onSetActive }) {
  return (
    <div className={cn('card p-5', year.isActive && 'border-brand/30 bg-brand/5')}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-neutral-800">{year.name}</h4>
            {year.isActive && <span className="badge bg-brand text-white text-[10px]">Active</span>}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            {new Date(year.startDate).toLocaleDateString()} – {new Date(year.endDate).toLocaleDateString()}
          </p>
        </div>
        {!year.isActive && (
          <button className="btn-secondary btn-sm" onClick={() => onSetActive(year._id)}>
            Set Active
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {year.semesters.map((sem, i) => (
          <div key={i} className="bg-white rounded-lg border border-neutral-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-neutral-800">{sem.name}</p>
              <span className="badge bg-amber-100 text-amber-700 text-[10px]">{sem.weekCount} weeks</span>
            </div>
            <p className="text-xs text-neutral-500 mb-3 pb-3 border-b border-neutral-100">
              {new Date(sem.startDate).toLocaleDateString()} – {new Date(sem.endDate).toLocaleDateString()}
            </p>

            {/* CLEANED UP BREAKS LIST */}
            {sem.breaks.length > 0 && (
              <div className="space-y-2.5">
                {sem.breaks.map((b, bi) => (
                  <div key={bi} className="text-xs flex items-start gap-1.5">
                    <span className="mt-0.5">🏖</span>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-medium text-neutral-700 truncate" title={b.name}>
                        {formatBreakName(b.name)}
                      </p>
                      <p className="text-neutral-400">
                        {new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AcademicCalendarPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post('/academic-years/import-xlsx', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Academic year imported and set as active')
      qc.invalidateQueries({ queryKey: ['academicYears'] })
      qc.invalidateQueries({ queryKey: ['currentWeek'] })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Import failed')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const { data: years = [], isLoading } = useQuery({
    queryKey: ['academicYears'],
    queryFn: getAcademicYears,
  })

  const { data: currentWeek } = useQuery({
    queryKey: ['currentWeek'],
    queryFn: getCurrentAcademicWeek,
  })

  const setActiveMutation = useMutation({
    mutationFn: setActiveAcademicYear,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['academicYears'] }); toast.success('Active year updated') },
    onError: () => toast.error('Failed to update'),
  })

  return (
    <div>
      <PageHeader
        title="Academic Calendar"
        subtitle="Set up academic years, semesters, and holiday breaks for week tracking"
        action={
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
            <button className="btn-secondary" onClick={() => fileRef.current?.click()} disabled={importing}>
              {importing ? 'Importing...' : 'Import from Excel'}
            </button>
            <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
              {showForm ? '✕ Cancel' : '+ New Academic Year'}
            </button>
          </div>
        }
      />

      {/* Current week banner */}
      {currentWeek?.inSession && (
        <div className="card p-4 mb-6 bg-brand/5 border-brand/20 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold text-sm">
            W{currentWeek.weekNo}
          </div>
          <div>
            <p className="font-semibold text-neutral-800">Current Academic Week: {currentWeek.weekNo}</p>
            <p className="text-sm text-neutral-500">{currentWeek.semesterName} · {currentWeek.semesterCode}</p>
          </div>
        </div>
      )}

      {!currentWeek?.inSession && !isLoading && years.length > 0 && (
        <div className="card p-4 mb-6 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-700 font-medium">Today is outside the active academic year dates.</p>
        </div>
      )}

      {/* New year form */}
      {showForm && (
        <div className="mb-6">
          <AcademicYearForm onSuccess={() => {
            setShowForm(false)
            qc.invalidateQueries({ queryKey: ['academicYears'] })
            qc.invalidateQueries({ queryKey: ['currentWeek'] })
          }} />
        </div>
      )}

      {/* Existing years */}
      {isLoading ? (
        <div className="card p-8 text-center text-neutral-400">Loading…</div>
      ) : years.length === 0 ? (
        <div className="card p-12 text-center text-neutral-400">
          <p className="font-medium mb-1">No academic years configured</p>
          <p className="text-sm">Click <strong>New Academic Year</strong> to set up your first year.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {years.map(y => (
            <YearCard key={y._id} year={y} onSetActive={(id) => setActiveMutation.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  )
}