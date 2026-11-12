export const demoListings = [
  { id: 'sample-narnii', title: 'Нарны хороолол · 2 өрөө', detail: 'Баянгол · 52 м² · Тавилгатай', district: 'Баянгол', area: 'Нарны хороолол', size: '52 м²', price: 1500000, location: [106.884, 47.914] },
  { id: 'sample-khan-uul', title: 'Хажуу өрөө · Хан-Уул', detail: 'Хан-Уул · 18 м² · 1 хүн', district: 'Хан-Уул', area: '120 мянгат', size: '18 м²', price: 650000, location: [106.903, 47.898] },
]

export const rentalRequests = [
  { id: 'request-nomin', person: 'nomin', listingId: 'sample-narnii', received: '10 мин өмнө' },
  { id: 'request-temuulen', person: 'temuulen', listingId: 'sample-khan-uul', received: '35 мин өмнө' },
  { id: 'request-anu', person: 'anu', listingId: 'sample-narnii', received: '1 цагийн өмнө' },
]

export function requestedListing(personId, listings, requests = rentalRequests) {
  const request = requests.find(item => item.person === personId)
  return request ? listings.find(item => item.id === request.listingId) : undefined
}
export const requestStatus = request => request.status || 'pending'
export const pendingRequests = (requests = rentalRequests) => requests.filter(request => requestStatus(request) === 'pending')
export function decideRequest(request, decision) {
  if (!request || requestStatus(request) !== 'pending' || !['accepted', 'rejected'].includes(decision)) return false
  request.status = decision
  return true
}
export function meetingsForRequest(request, meetings) {
  return meetings.filter(meeting => meeting.person === request.person && meeting.listingId === request.listingId).sort((a, b) => a.start - b.start)
}