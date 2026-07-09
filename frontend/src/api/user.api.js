import api from './axios'

export const createUser = (body) =>
  api.post('/users', body).then(r => r.data.data)

export const getUsers = (params) =>
  api.get('/users', { params }).then(r => r.data.data)

export const deactivateUser = (id, replacementTeacherId = null) =>
  api.patch(`/users/${id}/deactivate`, replacementTeacherId ? { replacementTeacherId } : {}).then(r => r.data)

export const activateUser = (id) =>
  api.patch(`/users/${id}/activate`).then(r => r.data.data)

export const bulkCreateUsers = (users) =>
  api.post('/users/bulk', { users }).then(r => r.data)

export const resetUserPassword = (id, newPassword) =>
  api.patch(`/users/${id}/reset-password`, { newPassword }).then(r => r.data.data)

export const changeUserRole = (id, role) =>
  api.patch(`/users/${id}/role`, { role }).then(r => r.data.data)

export const clearAllData = () =>
  api.delete('/users/clear-all-data').then(r => r.data)

export const getDepartments = () =>
  api.get('/users/departments').then(r => r.data.data)
