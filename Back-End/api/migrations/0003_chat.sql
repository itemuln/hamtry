CREATE TABLE chats (id TEXT PRIMARY KEY, listing_id TEXT NOT NULL REFERENCES listings(id), seeker_id TEXT NOT NULL REFERENCES user(id), owner_id TEXT NOT NULL REFERENCES user(id), created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, UNIQUE(listing_id,seeker_id), CHECK(seeker_id != owner_id));
CREATE INDEX chats_seeker_updated ON chats(seeker_id,updated_at DESC);
CREATE INDEX chats_owner_updated ON chats(owner_id,updated_at DESC);
CREATE TABLE chat_messages (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE, sender_id TEXT NOT NULL REFERENCES user(id), body TEXT NOT NULL CHECK(length(body) BETWEEN 1 AND 1000), created_at INTEGER NOT NULL);
CREATE INDEX chat_messages_chat_created ON chat_messages(chat_id,created_at DESC,id DESC);
