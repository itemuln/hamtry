export function meetingError(meeting, meetings, now = Date.now()) {
  const start = meeting.start.getTime()
  if (!Number.isFinite(start) || start <= now) return 'Уулзалтын огноо, цаг одоогоос хойш байх ёстой.'
  if (![30, 45, 60].includes(meeting.duration)) return 'Уулзалтын хугацаагаа сонгоно уу.'
  const end = start + meeting.duration * 60000
  if (meetings.some(item => start < item.start.getTime() + (item.duration || 30) * 60000 && end > item.start.getTime())) return 'Энэ цагт өөр уулзалт товлогдсон байна. Өөр цаг сонгоно уу.'
  return ''
}