import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCurriculum, createCurriculum, updateCurriculum, deleteCurriculum, deactivateCurriculum, reactivateCurriculum } from '../../api/curriculum.api'
import { bulkUpdateStandard, bulkDeactivateStandard, bulkDeleteStandard, bulkReactivateStandard } from '../../api/curriculum.api'
import { getLookupsByType } from '../../api/lookup.api'
import { getLessonPlans, createLessonPlan, updateLessonPlan } from '../../api/lessonPlan.api'
import { useAuth } from '../../context/AuthContext'
import LookupSelect from '../../components/LookupSelect'
import FormField from '../../components/FormField'
import PageHeader from '../../components/PageHeader'
import ConfirmDialog from '../../components/ConfirmDialog'
import { toast } from 'sonner'
import { cn } from '../../utils/cn'

// Accents for standards based on standard code hash
const COLORS = [
  { key: 'orange', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100 hover:bg-amber-50/50', badge: 'bg-amber-100 text-amber-800', circle: 'bg-amber-500' },
  { key: 'red', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100 hover:bg-red-50/50', badge: 'bg-red-100 text-red-800', circle: 'bg-red-500' },
  { key: 'green', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100 hover:bg-emerald-50/50', badge: 'bg-emerald-100 text-emerald-800', circle: 'bg-emerald-500' },
  { key: 'purple', text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100 hover:bg-purple-50/50', badge: 'bg-purple-100 text-purple-800', circle: 'bg-purple-500' },
  { key: 'blue', text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100 hover:bg-blue-50/50', badge: 'bg-blue-100 text-blue-800', circle: 'bg-blue-500' },
  { key: 'pink', text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100 hover:bg-rose-50/50', badge: 'bg-rose-100 text-rose-800', circle: 'bg-rose-500' }
]

const getColorForCode = (code = '') => {
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = code.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % COLORS.length
  return COLORS[idx]
}

export default function DomainsPage() {
  const qc = useQueryClient()
  const [filters, setFilters] = useState({ gradeId: '', subjectId: '', semesterId: '' })
  const [previewStandardCode, setPreviewStandardCode] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  
  // Modals state
  const [mainDomainModal, setMainDomainModal] = useState({ open: false, isEdit: false, data: null })
  const [subDomainModal, setSubDomainModal] = useState({ open: false, isEdit: false, data: null })
  
  // Deletion confirm state
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: '', data: null }) // type: 'main' | 'sub'
  const [deactivateConfirm, setDeactivateConfirm] = useState({ open: false, type: '', data: null }) // type: 'main' | 'sub'
  const [reactivateConfirm, setReactivateConfirm] = useState({ open: false, type: '', data: null }) // type: 'main' | 'sub'

  // Expanded skills state
  const [expandedSkillId, setExpandedSkillId] = useState(null)

  const { user } = useAuth()
  const [activeActivityFormId, setActiveActivityFormId] = useState(null)
  const [activityForm, setActivityForm] = useState({ topic: '', classwork: '', homework: '' })

  const { gradeId, subjectId, semesterId } = filters
  const isFilterSelected = !!(gradeId && subjectId && semesterId)

  // Fetch lesson plans for this teacher to find matched activities
  const { data: plansResult = {} } = useQuery({
    queryKey: ['lessonPlans', { gradeId, subjectId, semesterId, teacherId: user?.userId || user?.id }],
    queryFn: () => getLessonPlans({ gradeId, subjectId, semesterId, limit: 1000 }),
    enabled: isFilterSelected && !!user,
  })
  
  const plansData = plansResult.data || (Array.isArray(plansResult) ? plansResult : [])

  // Fetch Lookups
  const { data: grades = [] } = useQuery({ queryKey: ['lookup', 'GRADE'], queryFn: () => getLookupsByType('GRADE') })
  const { data: subjects = [] } = useQuery({ queryKey: ['lookup', 'SUBJECT'], queryFn: () => getLookupsByType('SUBJECT') })
  const { data: semesters = [] } = useQuery({ queryKey: ['lookup', 'SEMESTER'], queryFn: () => getLookupsByType('SEMESTER') })

  // Fetch Curriculum rows (fetch both active and inactive if showInactive is true)
  const { data: result = {}, isLoading: isCurriculumLoading } = useQuery({
    queryKey: ['curriculum', { gradeId, subjectId, semesterId, isActive: showInactive ? 'all' : 'true', limit: 200 }],
    queryFn: () => getCurriculum({ gradeId, subjectId, semesterId, isActive: showInactive ? 'all' : 'true', limit: 200 }),
    enabled: isFilterSelected,
  })

  const curriculumRows = result.data || (Array.isArray(result) ? result : [])

  // Auto-reset preview on filter change
  useEffect(() => {
    setPreviewStandardCode(null)
  }, [filters])

  // Group curriculum rows by standardCode (Main Domain)
  const mainDomainsGrouped = {}
  curriculumRows.forEach(row => {
    const code = row.standardCode
    if (!mainDomainsGrouped[code]) {
      mainDomainsGrouped[code] = {
        code,
        description: row.standardDescription,
        isActive: false, // will set to true if at least one sub-item is active
        color: getColorForCode(code),
        items: []
      }
    }
    if (row.isActive) {
      mainDomainsGrouped[code].isActive = true
    }
    mainDomainsGrouped[code].items.push(row)
  })
  const mainDomains = Object.values(mainDomainsGrouped)

  // Filter sub domains (skills) based on selected standard code
  const activeMainDomain = previewStandardCode ? mainDomainsGrouped[previewStandardCode] : null
  const subDomains = activeMainDomain ? activeMainDomain.items : []

  // Mutations
  const createCurriculumMutation = useMutation({
    mutationFn: createCurriculum,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      toast.success('Added successfully')
      closeAllModals()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save')
  })

  const updateCurriculumMutation = useMutation({
    mutationFn: ({ id, data }) => updateCurriculum(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      toast.success('Updated successfully')
      closeAllModals()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to update')
  })

  const deleteCurriculumMutation = useMutation({
    mutationFn: deleteCurriculum,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      toast.success('Deleted successfully')
      setDeleteConfirm({ open: false, type: '', data: null })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete')
  })

  const deactivateCurriculumMutation = useMutation({
    mutationFn: deactivateCurriculum,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      toast.success('Deactivated successfully')
      setDeactivateConfirm({ open: false, type: '', data: null })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to deactivate')
  })

  // Bulk standard mutations
  const bulkUpdateStandardMutation = useMutation({
    mutationFn: bulkUpdateStandard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      toast.success('Main Domain updated successfully')
      closeAllModals()
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save update')
  })

  const bulkDeactivateStandardMutation = useMutation({
    mutationFn: bulkDeactivateStandard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      toast.success('Main Domain deactivated successfully')
      setDeactivateConfirm({ open: false, type: '', data: null })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to deactivate')
  })

  const bulkDeleteStandardMutation = useMutation({
    mutationFn: bulkDeleteStandard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      setPreviewStandardCode(null)
      toast.success('Main Domain deleted successfully')
      setDeleteConfirm({ open: false, type: '', data: null })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to delete')
  })

  const reactivateCurriculumMutation = useMutation({
    mutationFn: reactivateCurriculum,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      toast.success('Reactivated successfully')
      setReactivateConfirm({ open: false, type: '', data: null })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to reactivate')
  })

  const bulkReactivateStandardMutation = useMutation({
    mutationFn: bulkReactivateStandard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      toast.success('Main Domain reactivated successfully')
      setReactivateConfirm({ open: false, type: '', data: null })
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to reactivate')
  })

  const saveActivityMutation = useMutation({
    mutationFn: async ({ itemId, matchedPlan, item, topic, classwork, homework }) => {
      // 1. Update Curriculum input with Classwork data
      await updateCurriculum(itemId, { input: classwork })
      
      // 2. Create or Update Lesson Plan
      if (matchedPlan) {
        await updateLessonPlan(matchedPlan._id, {
          topic,
          resource: classwork,
          assessment: homework
        })
      } else {
        await createLessonPlan({
          curriculumId: itemId,
          gradeId: item.gradeId?._id || item.gradeId,
          subjectId: item.subjectId?._id || item.subjectId,
          semesterId: item.semesterId?._id || item.semesterId,
          weekNo: item.weekNo,
          topic,
          resource: classwork,
          assessment: homework
        })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['curriculum'] })
      qc.invalidateQueries({ queryKey: ['lessonPlans'] })
      toast.success('Activity saved and curriculum updated successfully!')
      setActiveActivityFormId(null)
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed to save Activity')
  })

  const closeAllModals = () => {
    setMainDomainModal({ open: false, isEdit: false, data: null })
    setSubDomainModal({ open: false, isEdit: false, data: null })
  }

  // Handle Main Domain Actions
  const handleSaveMainDomain = (e) => {
    e.preventDefault()
    const form = e.target
    const newCode = form.code.value.trim()
    const newDescription = form.description.value.trim()

    if (!newCode || !newDescription) return toast.error('All fields are required')

    if (mainDomainModal.isEdit) {
      // Bulk update matching standard codes
      bulkUpdateStandardMutation.mutate({
        gradeId,
        subjectId,
        semesterId,
        oldCode: mainDomainModal.data.code,
        newCode,
        newDescription
      })
    } else {
      // Creating standard requires at least one curriculum entry
      const week = form.weekNo.value
      const skill = form.skills.value.trim()
      const input = form.input.value.trim()
      const process = form.process.value.trim()
      const outcome = form.outcome.value.trim()

      if (!week || !skill || !input || !process || !outcome) {
        return toast.error('Please fill in the week number and all learning details')
      }

      createCurriculumMutation.mutate({
        gradeId,
        subjectId,
        semesterId,
        weekNo: Number(week),
        standardCode: newCode,
        standardDescription: newDescription,
        skills: skill,
        input,
        process,
        outcome
      })
    }
  }

  // Handle Sub Domain Actions
  const handleSaveSubDomain = (e) => {
    e.preventDefault()
    const form = e.target
    const skill = form.skills.value.trim()
    const week = form.weekNo.value
    const input = form.input.value.trim()
    const process = form.process.value.trim()
    const outcome = form.outcome.value.trim()

    if (!skill || !week || !input || !process || !outcome) {
      return toast.error('All fields are required')
    }

    if (subDomainModal.isEdit) {
      updateCurriculumMutation.mutate({
        id: subDomainModal.data._id,
        data: {
          skills: skill,
          weekNo: Number(week),
          input,
          process,
          outcome
        }
      })
    } else {
      // Adding a skill under selected Main Domain
      createCurriculumMutation.mutate({
        gradeId,
        subjectId,
        semesterId,
        standardCode: activeMainDomain.code,
        standardDescription: activeMainDomain.description,
        weekNo: Number(week),
        skills: skill,
        input,
        process,
        outcome
      })
    }
  }

  // Delete confirms
  const handleConfirmDelete = () => {
    const { type, data } = deleteConfirm
    if (type === 'main') {
      bulkDeleteStandardMutation.mutate({
        gradeId,
        subjectId,
        semesterId,
        standardCode: data.code
      })
    } else {
      deleteCurriculumMutation.mutate(data._id)
    }
  }

  const handleConfirmDeactivate = () => {
    const { type, data } = deactivateConfirm
    if (type === 'main') {
      bulkDeactivateStandardMutation.mutate({
        gradeId,
        subjectId,
        semesterId,
        standardCode: data.code
      })
    } else {
      deactivateCurriculumMutation.mutate(data._id)
    }
  }

  const handleConfirmReactivate = () => {
    const { type, data } = reactivateConfirm
    if (type === 'main') {
      bulkReactivateStandardMutation.mutate({
        gradeId,
        subjectId,
        semesterId,
        standardCode: data.code
      })
    } else {
      reactivateCurriculumMutation.mutate(data._id)
    }
  }

  return (
    <div className="space-y-6 max-w-screen-xl mx-auto">
      <PageHeader
        title="Domains Explorer"
        subtitle="Browse and manage curriculum standards (Main Domains) and skills (Sub Domains)"
      />

      {/* Selectors Bar */}
      <div className="card p-5 bg-white border border-neutral-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label text-xs font-semibold text-neutral-500 uppercase tracking-wider">Grade</label>
          <LookupSelect
            type="GRADE"
            value={gradeId}
            onChange={(val) => setFilters(f => ({ ...f, gradeId: val }))}
            placeholder="Select Grade"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label text-xs font-semibold text-neutral-500 uppercase tracking-wider">Subject</label>
          <LookupSelect
            type="SUBJECT"
            value={subjectId}
            onChange={(val) => setFilters(f => ({ ...f, subjectId: val }))}
            placeholder="Select Subject"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="label text-xs font-semibold text-neutral-500 uppercase tracking-wider">Semester</label>
          <LookupSelect
            type="SEMESTER"
            value={semesterId}
            onChange={(val) => setFilters(f => ({ ...f, semesterId: val }))}
            placeholder="Select Semester"
          />
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 select-none h-10 shrink-0">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-brand border-neutral-300 rounded focus:ring-brand cursor-pointer"
            />
            <label htmlFor="showInactive" className="text-sm font-medium text-neutral-600 cursor-pointer">
              Show Inactive
            </label>
          </div>
          <button
            onClick={() => setFilters({ gradeId: '', subjectId: '', semesterId: '' })}
            className="btn-secondary w-full"
            disabled={!gradeId && !subjectId && !semesterId}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Content panels */}
      {!isFilterSelected ? (
        <div className="card p-12 text-center border border-dashed border-neutral-300">
          <svg className="w-16 h-16 text-neutral-300 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
          <h3 className="font-semibold text-neutral-700 text-lg">No Classification Selected</h3>
          <p className="text-neutral-400 text-sm mt-1 max-w-sm mx-auto">
            Please choose a Grade, Subject, and Semester above to explore and manage the curriculum domains.
          </p>
        </div>
      ) : isCurriculumLoading ? (
        <div className="p-12 text-center text-neutral-400">Loading curriculum details…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Domains Panel */}
          <div className={cn("card p-5 border border-neutral-200 transition-all duration-300 shadow-sm", activeMainDomain ? "lg:col-span-6" : "lg:col-span-12")}>
            <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="font-bold text-neutral-800 text-lg">Main Domains (Standards)</h3>
                <p className="text-xs text-neutral-400 mt-0.5">{mainDomains.length} unique standards found</p>
              </div>
              <button
                onClick={() => setMainDomainModal({ open: true, isEdit: false, data: null })}
                className="btn-primary btn-sm flex items-center gap-1 bg-green-600 hover:bg-green-700 focus:ring-green-500 rounded-full"
              >
                <span>Add Main Domain</span>
                <span className="text-lg font-bold leading-none">+</span>
              </button>
            </div>

            {mainDomains.length === 0 ? (
              <div className="py-8 text-center text-neutral-400 text-sm">
                No standards defined for this subject. Click "Add Main Domain" to create one.
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {mainDomains.map((domain, index) => {
                  const isPreviewing = previewStandardCode === domain.code
                  return (
                    <div
                      key={domain.code}
                      className={cn(
                        "group border rounded-xl p-4 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                        domain.color.border,
                        isPreviewing ? "bg-white ring-2 ring-brand ring-offset-1 shadow-md" : "bg-neutral-50 hover:bg-white"
                      )}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Drag handle visual */}
                        <div className="text-neutral-300 select-none group-hover:text-neutral-400 transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5h.01M12 12h.01M12 19h.01M12 6h.01M12 13h.01M12 20h.01" />
                          </svg>
                        </div>

                        {/* Order Index Badge */}
                        <div className="w-7 h-7 rounded-full bg-neutral-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>

                        {/* Text */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("font-mono font-bold text-sm px-2.5 py-0.5 rounded-full", domain.color.badge)}>
                              {domain.code}
                            </span>
                            {!domain.isActive && (
                              <span className="badge bg-neutral-200 text-neutral-600">Inactive</span>
                            )}
                          </div>
                          <p className="text-neutral-700 text-sm font-medium mt-1.5 leading-relaxed truncate">
                            {domain.description}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons & toggle */}
                      <div className="flex items-center justify-end gap-3.5 shrink-0 self-end sm:self-center">
                        <div className="flex items-center gap-1.5">
                          {/* Edit */}
                          <button
                            onClick={() => setMainDomainModal({ open: true, isEdit: true, data: domain })}
                            className="p-1.5 text-neutral-400 hover:text-amber-500 rounded-lg hover:bg-neutral-100 transition-colors"
                            title="Edit Standard"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirm({ open: true, type: 'main', data: domain })}
                            className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors"
                            title="Delete Standard"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>

                          {/* Deactivate Status Toggle */}
                          {domain.isActive ? (
                            <button
                              onClick={() => setDeactivateConfirm({ open: true, type: 'main', data: domain })}
                              className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="Deactivate Standard"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" />
                              </svg>
                            </button>
                          ) : (
                            <button
                              onClick={() => setReactivateConfirm({ open: true, type: 'main', data: domain })}
                              className="p-1.5 text-neutral-400 hover:text-green-600 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="Reactivate Standard"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                              </svg>
                            </button>
                          )}
                        </div>

                        {/* Preview Switch */}
                        <button
                          onClick={() => setPreviewStandardCode(isPreviewing ? null : domain.code)}
                          className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-semibold select-none transition-all duration-200 border flex items-center gap-1.5 shadow-sm",
                            isPreviewing
                              ? "bg-green-100 text-green-700 border-green-200"
                              : "bg-white text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 border-neutral-200"
                          )}
                        >
                          {isPreviewing && (
                            <svg className="w-3.5 h-3.5 stroke-[3px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          <span>Preview</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Sub Domains Panel */}
          {activeMainDomain && (
            <div className="card p-5 border border-neutral-200 lg:col-span-6 animate-fade-in shadow-sm">
              <div className="flex items-center justify-between mb-4 border-b border-neutral-100 pb-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPreviewStandardCode(null)}
                    className="p-1.5 hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 rounded-lg"
                    title="Close preview"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div>
                    <h3 className="font-bold text-neutral-800 text-lg flex items-center gap-2">
                      <span>Sub Domains</span>
                      <span className={cn("font-mono font-bold text-xs px-2 py-0.5 rounded", activeMainDomain.color.badge)}>
                        {activeMainDomain.code}
                      </span>
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{subDomains.length} skills listed</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setSubDomainModal({ open: true, isEdit: false, data: null })}
                  className="btn-primary btn-sm flex items-center gap-1 bg-green-600 hover:bg-green-700 focus:ring-green-500 rounded-full"
                >
                  <span>Add Sub Domain</span>
                  <span className="text-lg font-bold leading-none">+</span>
                </button>
              </div>

              {subDomains.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-sm">
                  No sub domains/skills registered under this standard. Add one now!
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {subDomains.map((item) => {
                    const isExpanded = expandedSkillId === item._id
                    return (
                      <div
                        key={item._id}
                        className={cn(
                          "border rounded-xl p-4 transition-all duration-200 bg-white hover:shadow-sm",
                          item.isActive ? "border-neutral-200" : "border-neutral-200 opacity-60 bg-neutral-50/50"
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div
                            onClick={() => setExpandedSkillId(isExpanded ? null : item._id)}
                            className="flex items-start gap-3 cursor-pointer min-w-0 flex-1 select-none"
                          >
                            {/* Sort drag icon visual */}
                            <div className="text-neutral-300 mt-0.5">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5h.01M12 12h.01M12 19h.01M12 6h.01M12 13h.01M12 20h.01" />
                              </svg>
                            </div>

                            {/* Arrow expand icon */}
                            <div className={cn("text-neutral-400 mt-1 transition-transform duration-200 shrink-0", isExpanded && "rotate-90")}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                              </svg>
                            </div>

                            {/* Code inherits parent domain color */}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={cn("font-bold text-sm uppercase", activeMainDomain.color.text)}>
                                  {item.skills}
                                </span>
                                <span className="badge bg-neutral-100 text-neutral-500 font-mono">
                                  Week {item.weekNo}
                                </span>
                              </div>
                              <p className="text-neutral-500 text-xs mt-1.5 leading-relaxed truncate">
                                Click to view learning Details (Input, Process, Outcome)
                              </p>
                            </div>
                          </div>

                          {/* Skill Action buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Edit */}
                            <button
                              onClick={() => setSubDomainModal({ open: true, isEdit: true, data: item })}
                              className="p-1.5 text-neutral-400 hover:text-amber-500 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="Edit Skill"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                              </svg>
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirm({ open: true, type: 'sub', data: item })}
                              className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors"
                              title="Delete Skill"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>

                            {/* Deactivate/Reactivate */}
                            {item.isActive ? (
                              <button
                                onClick={() => setDeactivateConfirm({ open: true, type: 'sub', data: item })}
                                className="p-1.5 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 transition-colors"
                                title="Deactivate Skill"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3zm7-13h3a2 2 0 012 2v7a2 2 0 01-2 2h-3" />
                                </svg>
                              </button>
                            ) : (
                              <button
                                onClick={() => setReactivateConfirm({ open: true, type: 'sub', data: item })}
                                className="p-1.5 text-neutral-400 hover:text-green-600 rounded-lg hover:bg-neutral-100 transition-colors"
                                title="Reactivate Skill"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-neutral-100 space-y-3.5 text-sm animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1">Input</span>
                                <p className="text-neutral-700 text-xs leading-relaxed whitespace-pre-line">{item.input || '—'}</p>
                              </div>
                              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1">Process</span>
                                <p className="text-neutral-700 text-xs leading-relaxed whitespace-pre-line">{item.process || '—'}</p>
                              </div>
                              <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-1">Outcome</span>
                                <p className="text-neutral-700 text-xs leading-relaxed whitespace-pre-line">{item.outcome || '—'}</p>
                              </div>
                            </div>

                            {/* Inline Activity Management */}
                            <div className="border-t border-neutral-100 pt-3 mt-3 flex flex-col gap-3">
                              {activeActivityFormId === item._id ? (
                                <form
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const matchedPlan = plansData.find(p => (p.curriculumId?._id || p.curriculumId) === item._id);
                                    saveActivityMutation.mutate({
                                      itemId: item._id,
                                      matchedPlan,
                                      item,
                                      topic: activityForm.topic,
                                      classwork: activityForm.classwork,
                                      homework: activityForm.homework
                                    });
                                  }}
                                  className="space-y-3 bg-neutral-50 rounded-xl p-4 border border-neutral-200"
                                >
                                  <h4 className="font-semibold text-xs text-neutral-500 uppercase tracking-wide">
                                    Lesson Activity
                                  </h4>
                                  
                                  <FormField label="Topic" required>
                                    <input
                                      type="text"
                                      className="input text-xs"
                                      placeholder="Enter topic"
                                      value={activityForm.topic}
                                      onChange={(e) => setActivityForm(f => ({ ...f, topic: e.target.value }))}
                                      required
                                    />
                                  </FormField>
                                  
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <FormField label="Classwork (overwrites Curriculum Input)">
                                      <textarea
                                        rows={3}
                                        className="input text-xs resize-none"
                                        placeholder="Enter classwork details..."
                                        value={activityForm.classwork}
                                        onChange={(e) => setActivityForm(f => ({ ...f, classwork: e.target.value }))}
                                      />
                                    </FormField>
                                    
                                    <FormField label="Homework">
                                      <textarea
                                        rows={3}
                                        className="input text-xs resize-none"
                                        placeholder="Enter homework assignments..."
                                        value={activityForm.homework}
                                        onChange={(e) => setActivityForm(f => ({ ...f, homework: e.target.value }))}
                                      />
                                    </FormField>
                                  </div>
                                  
                                  <div className="flex justify-end gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setActiveActivityFormId(null)}
                                      className="btn-secondary btn-sm"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={saveActivityMutation.isPending}
                                      className="btn-primary btn-sm bg-brand hover:bg-brand-600"
                                    >
                                      {saveActivityMutation.isPending ? 'Saving...' : 'Save Activity'}
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <div className="flex items-center justify-between bg-neutral-50 rounded-xl p-3 border border-neutral-100">
                                  <div className="min-w-0 flex-1 pr-4">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wide block mb-0.5">Lesson Plan Activity</span>
                                    {(() => {
                                      const matchedPlan = plansData.find(p => (p.curriculumId?._id || p.curriculumId) === item._id);
                                      if (matchedPlan) {
                                        return (
                                          <div className="text-xs text-neutral-600 truncate max-w-md">
                                            <span className="font-semibold text-neutral-800">Topic:</span> {matchedPlan.topic}
                                            {matchedPlan.resource && <div className="mt-0.5 truncate"><span className="font-semibold text-neutral-800">Classwork:</span> {matchedPlan.resource}</div>}
                                            {matchedPlan.assessment && <div className="mt-0.5 truncate"><span className="font-semibold text-neutral-800">Homework:</span> {matchedPlan.assessment}</div>}
                                          </div>
                                        );
                                      }
                                      return <p className="text-xs text-neutral-400">No activity registered for this skill yet.</p>;
                                    })()}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const matchedPlan = plansData.find(p => (p.curriculumId?._id || p.curriculumId) === item._id);
                                      setActivityForm({
                                        topic: matchedPlan?.topic || '',
                                        classwork: matchedPlan?.resource || '',
                                        homework: matchedPlan?.assessment || ''
                                      });
                                      setActiveActivityFormId(item._id);
                                    }}
                                    className="btn-secondary btn-sm border-brand text-brand hover:bg-brand/5 flex items-center gap-1 shrink-0"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    <span>Activity</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Main Domain Modal */}
      {mainDomainModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAllModals} />
          <div className="relative card p-6 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b border-neutral-100 pb-2">
              {mainDomainModal.isEdit ? 'Edit Main Domain (Standard)' : 'Add Main Domain (Standard)'}
            </h3>
            
            <form onSubmit={handleSaveMainDomain} className="space-y-4">
              <FormField label="Standard Code" required>
                <input
                  name="code"
                  type="text"
                  className="input font-mono uppercase"
                  placeholder="e.g. MATH-1.2"
                  defaultValue={mainDomainModal.data?.code || ''}
                />
              </FormField>

              <FormField label="Standard Description" required>
                <textarea
                  name="description"
                  rows={2}
                  className="input resize-none"
                  placeholder="Describe the learning standard…"
                  defaultValue={mainDomainModal.data?.description || ''}
                />
              </FormField>

              {!mainDomainModal.isEdit && (
                <div className="border-t border-neutral-100 pt-4 mt-2 space-y-4">
                  <h4 className="font-semibold text-sm text-neutral-800">Learning Details (Creates First Skill Entry)</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Week No" required>
                      <input
                        name="weekNo"
                        type="number"
                        min={1}
                        max={52}
                        className="input"
                        placeholder="Week 1-52"
                      />
                    </FormField>
                    
                    <FormField label="Skill Name (Sub Domain)" required>
                      <input
                        name="skills"
                        type="text"
                        className="input"
                        placeholder="e.g. Arabic"
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <FormField label="Input" required>
                      <textarea name="input" rows={3} className="input text-xs resize-none" placeholder="Required inputs..." />
                    </FormField>
                    <FormField label="Process" required>
                      <textarea name="process" rows={3} className="input text-xs resize-none" placeholder="Teaching process..." />
                    </FormField>
                    <FormField label="Outcome" required>
                      <textarea name="outcome" rows={3} className="input text-xs resize-none" placeholder="Expected outcomes..." />
                    </FormField>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                <button type="button" className="btn-secondary" onClick={closeAllModals}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCurriculumMutation.isPending || bulkUpdateStandardMutation.isPending}
                  className="btn-primary"
                >
                  {createCurriculumMutation.isPending || bulkUpdateStandardMutation.isPending ? 'Saving…' : 'Save Domain'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sub Domain Modal */}
      {subDomainModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeAllModals} />
          <div className="relative card p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-neutral-900 mb-4 border-b border-neutral-100 pb-2">
              {subDomainModal.isEdit ? 'Edit Sub Domain (Skill)' : 'Add Sub Domain (Skill)'}
            </h3>
            
            <form onSubmit={handleSaveSubDomain} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Skill Name (Sub Domain)" required>
                  <input
                    name="skills"
                    type="text"
                    className="input"
                    placeholder="e.g. Creating"
                    defaultValue={subDomainModal.data?.skills || ''}
                  />
                </FormField>

                <FormField label="Week Number" required>
                  <input
                    name="weekNo"
                    type="number"
                    min={1}
                    max={52}
                    className="input"
                    placeholder="Week 1-52"
                    defaultValue={subDomainModal.data?.weekNo || ''}
                  />
                </FormField>
              </div>

              <FormField label="Input" required>
                <textarea
                  name="input"
                  rows={2}
                  className="input resize-none"
                  placeholder="Learning materials / resources..."
                  defaultValue={subDomainModal.data?.input || ''}
                />
              </FormField>

              <FormField label="Process" required>
                <textarea
                  name="process"
                  rows={2}
                  className="input resize-none"
                  placeholder="Teaching process / methods..."
                  defaultValue={subDomainModal.data?.process || ''}
                />
              </FormField>

              <FormField label="Outcome" required>
                <textarea
                  name="outcome"
                  rows={2}
                  className="input resize-none"
                  placeholder="Expected outcomes / targets..."
                  defaultValue={subDomainModal.data?.outcome || ''}
                />
              </FormField>

              <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
                <button type="button" className="btn-secondary" onClick={closeAllModals}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCurriculumMutation.isPending || updateCurriculumMutation.isPending}
                  className="btn-primary"
                >
                  {createCurriculumMutation.isPending || updateCurriculumMutation.isPending ? 'Saving…' : 'Save Skill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title={deleteConfirm.type === 'main' ? 'Delete Main Domain & Linked Skills?' : 'Delete Sub Domain?'}
        description={
          deleteConfirm.type === 'main'
            ? `Warning: This action will delete standard "${deleteConfirm.data?.code}" and ALL its linked skills in this classification.`
            : `Are you sure you want to delete skill "${deleteConfirm.data?.skills}"?`
        }
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, type: '', data: null })}
        isLoading={deleteCurriculumMutation.isPending || bulkDeleteStandardMutation.isPending}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={deactivateConfirm.open}
        title={deactivateConfirm.type === 'main' ? 'Deactivate Main Domain?' : 'Deactivate Sub Domain?'}
        description={
          deactivateConfirm.type === 'main'
            ? `Are you sure you want to deactivate standard "${deactivateConfirm.data?.code}" and all its linked skills?`
            : `Are you sure you want to deactivate skill "${deactivateConfirm.data?.skills}"?`
        }
        confirmLabel="Deactivate"
        onConfirm={handleConfirmDeactivate}
        onCancel={() => setDeactivateConfirm({ open: false, type: '', data: null })}
        isLoading={deactivateCurriculumMutation.isPending || bulkDeactivateStandardMutation.isPending}
      />

      {/* Reactivate Confirmation Dialog */}
      <ConfirmDialog
        open={reactivateConfirm.open}
        title={reactivateConfirm.type === 'main' ? 'Reactivate Main Domain?' : 'Reactivate Sub Domain?'}
        description={
          reactivateConfirm.type === 'main'
            ? `Are you sure you want to reactivate standard "${reactivateConfirm.data?.code}" and all its linked skills?`
            : `Are you sure you want to reactivate skill "${reactivateConfirm.data?.skills}"?`
        }
        confirmLabel="Reactivate"
        onConfirm={handleConfirmReactivate}
        onCancel={() => setReactivateConfirm({ open: false, type: '', data: null })}
        isLoading={reactivateCurriculumMutation.isPending || bulkReactivateStandardMutation.isPending}
      />
    </div>
  )
}
