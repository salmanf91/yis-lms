import api from './axios'

export const getAdminSummary = () =>
  api.get('/reports/summary').then(r => r.data.data)

export const getCoverageReport = (params) =>
  api.get('/reports/coverage', { params }).then(r => r.data.data)

export const getComplianceReport = (params) =>
  api.get('/reports/compliance', { params }).then(r => r.data.data)

export const getHodSummary = () =>
  api.get('/reports/hod-summary').then(r => r.data.data)
