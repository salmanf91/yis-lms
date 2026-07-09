import api from './axios'

export const getLookupsByType = (type) =>
  api.get(`/lookup/${type}`).then(r => r.data.data)

export const getAllLookups = () =>
  api.get('/lookup/all').then(r => r.data.data)

export const createLookup = (body) =>
  api.post('/lookup', body).then(r => r.data.data)

export const updateLookup = (id, body) =>
  api.put(`/lookup/${id}`, body).then(r => r.data.data)

export const deleteLookup = (id) =>
  api.delete(`/lookup/${id}`)
