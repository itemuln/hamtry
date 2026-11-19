export const findListing = (db, id) => db.prepare("SELECT id,owner_id FROM listings WHERE id=? AND status='published' AND demo=0").bind(id).first()
export const findChat = (db, id, userId) => db.prepare('SELECT * FROM chats WHERE id=? AND (owner_id=? OR seeker_id=?)').bind(id, userId, userId).first()
export async function createChat(db, listing, seekerId) {
  await db.prepare('INSERT INTO chats (id,listing_id,seeker_id,owner_id,created_at,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(listing_id,seeker_id) DO NOTHING').bind(crypto.randomUUID(), listing.id, seekerId, listing.owner_id, Date.now(), Date.now()).run()
  return db.prepare('SELECT id FROM chats WHERE listing_id=? AND seeker_id=?').bind(listing.id, seekerId).first()
}
export async function listChats(db, userId) {
  // shortcut: only the newest 100 conversations are shown, add cursor paging when accounts can exceed this.
  return (await db.prepare(`SELECT c.id,c.listing_id,l.title AS listing_title,c.owner_id,c.seeker_id,u.name AS other_name,m.body AS last_message,m.created_at AS last_at
    FROM chats c JOIN listings l ON l.id=c.listing_id JOIN user u ON u.id=CASE WHEN c.owner_id=? THEN c.seeker_id ELSE c.owner_id END
    LEFT JOIN chat_messages m ON m.id=(SELECT id FROM chat_messages WHERE chat_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1)
    WHERE c.owner_id=? OR c.seeker_id=? ORDER BY c.updated_at DESC LIMIT 100`).bind(userId, userId, userId).all()).results
}
export async function listMessages(db, chatId) {
  // shortcut: only the newest 100 messages are shown, add cursor paging when longer history is needed.
  return (await db.prepare('SELECT id,sender_id,body,created_at FROM chat_messages WHERE chat_id=? ORDER BY created_at DESC,id DESC LIMIT 100').bind(chatId).all()).results.reverse()
}
export async function saveMessage(db, chatId, senderId, body) {
  const message = { id: crypto.randomUUID(), sender_id: senderId, body, created_at: Date.now() }
  await db.batch([
    db.prepare('INSERT INTO chat_messages (id,chat_id,sender_id,body,created_at) VALUES (?,?,?,?,?)').bind(message.id, chatId, senderId, body, message.created_at),
    db.prepare('UPDATE chats SET updated_at=? WHERE id=?').bind(message.created_at, chatId),
  ])
  return message
}
