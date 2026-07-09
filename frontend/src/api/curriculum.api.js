import api from './axios'

export const getCurriculum = (params) =>
  api.get('/curriculum', { params }).then(r => r.data.data)

export const getCurriculumById = (id) =>
  api.get(`/curriculum/${id}`).then(r => r.data.data)

export const createCurriculum = (body) =>
  api.post('/curriculum', body).then(r => r.data.data)

export const updateCurriculum = (id, body) =>
  api.put(`/curriculum/${id}`, body).then(r => r.data.data)

export const deleteCurriculum = (id) =>
  api.delete(`/curriculum/${id}`)

export const deactivateCurriculum = (id) =>
  api.patch(`/curriculum/${id}/deactivate`)

export const bulkUpdateStandard = (body) =>
  api.put('/curriculum/bulk-standard', body).then(r => r.data.data)

export const bulkDeactivateStandard = (body) =>
  api.patch('/curriculum/bulk-standard/deactivate', body).then(r => r.data.data)

export const bulkDeleteStandard = (body) =>
  api.delete('/curriculum/bulk-standard/delete', { data: body }).then(r => r.data.data)

export const reactivateCurriculum = (id) =>
  api.patch(`/curriculum/${id}/reactivate`).then(r => r.data.data)

export const bulkReactivateStandard = (body) =>
  api.patch('/curriculum/bulk-standard/reactivate', body).then(r => r.data.data)
