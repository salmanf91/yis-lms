import api from './axios'

export const getTimetable = (params) =>
  api.get('/timetable', { params }).then(r => r.data.data)
