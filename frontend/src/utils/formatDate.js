import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import weekOfYear from 'dayjs/plugin/weekOfYear'

dayjs.extend(relativeTime)
dayjs.extend(weekOfYear)

export const formatDate = (date) =>
  date ? dayjs(date).format('DD MMM YYYY') : '—'

export const formatDateTime = (date) =>
  date ? dayjs(date).format('DD MMM YYYY, h:mm A') : '—'

export const fromNow = (date) =>
  date ? dayjs(date).fromNow() : '—'

export const getCurrentWeek = () => dayjs().week()
