import api from './axios'

export const getRoster = (params) =>
  api.get('/roaster', { params }).then(r => r.data.data)

export const createRosterEntry = (body) =>
  api.post('/roaster', body).then(r => r.data.data)

export const updateRosterEntry = (id, body) =>
  api.put(`/roaster/${id}`, body).then(r => r.data.data)

export const deleteRosterEntry = (id) =>
  api.delete(`/roaster/${id}`)

export const deactivateRosterEntry = (id) =>
  api.patch(`/roaster/${id}/deactivate`)

export const syncSections = () =>
  api.post('/roaster/sync-sections').then(r => r.data.data)
