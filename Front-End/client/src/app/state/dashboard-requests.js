export const rentalRequests = []

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