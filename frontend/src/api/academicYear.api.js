import api from './axios'

export const getAcademicYears = () =>
  api.get('/academic-years').then(r => r.data.data)

export const getActiveAcademicYear = () =>
  api.get('/academic-years/active').then(r => r.data.data)

export const getCurrentAcademicWeek = () =>
  api.get('/academic-years/current-week').then(r => r.data.data)

export const createAcademicYear = (body) =>
  api.post('/academic-years', body).then(r => r.data.data)

export const updateAcademicYear = (id, body) =>
  api.put(`/academic-years/${id}`, body).then(r => r.data.data)

export const setActiveAcademicYear = (id) =>
  api.patch(`/academic-years/${id}/set-active`).then(r => r.data.data)
