import * as repo from './repo.js'

export async function startChat(db, listingId, userId) {
  const listing = await repo.findListing(db, listingId)
  if (!listing) return { error: 'NOT_FOUND' }
  if (listing.owner_id === userId) return { error: 'SELF_CHAT' }
  return { data: await repo.createChat(db, listing, userId) }
}
export const getChats = (db, userId) => repo.listChats(db, userId)
export async function getMessages(db, chatId, userId) {
  if (!(await repo.findChat(db, chatId, userId))) return null
  return repo.listMessages(db, chatId)
}
export async function sendMessage(db, chatId, userId, body) {
  if (!(await repo.findChat(db, chatId, userId))) return null
  return repo.saveMessage(db, chatId, userId, body)
}
