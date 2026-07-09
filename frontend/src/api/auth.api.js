import api from './axios'

export const loginUser = (body) =>
  api.post('/auth/login', body).then(r => r.data.data)

export const registerUser = (body) =>
  api.post('/auth/register', body).then(r => r.data.data)
