import api from './axios'

export const getLessonPlans = (params) =>
  api.get('/lesson-plans', { params }).then(r => r.data.data)

export const getLessonPlanById = (id) =>
  api.get(`/lesson-plans/${id}`).then(r => r.data.data)

export const createLessonPlan = (body) =>
  api.post('/lesson-plans', body).then(r => r.data.data)

export const updateLessonPlan = (id, body) =>
  api.put(`/lesson-plans/${id}`, body).then(r => r.data.data)

export const submitLessonPlan = (id) =>
  api.patch(`/lesson-plans/${id}/submit`).then(r => r.data.data)

export const approveLessonPlan = (id, comments) =>
  api.patch(`/lesson-plans/${id}/approve`, { comments }).then(r => r.data.data)

export const rejectLessonPlan = (id, comments) =>
  api.patch(`/lesson-plans/${id}/reject`, { comments }).then(r => r.data.data)

export const deactivateLessonPlan = (id) =>
  api.patch(`/lesson-plans/${id}/deactivate`)
