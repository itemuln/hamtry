import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { testDatabase } from './d1.js'

test('demo cleanup is repeatable and preserves real listings and accounts', async t => {
  const db = testDatabase(); t.after(() => db.close())
  await db.exec(`INSERT INTO user (id,name,email,emailVerified,createdAt,updatedAt) VALUES ('owner','Real owner','owner@example.test',0,'2026-11-01','2026-11-01');
    INSERT INTO listings (id,owner_id,kind,status,title,description,district,price,available,demo,created_at,updated_at) VALUES
    ('example','owner','rooms','published','Example','Example','Хан-Уул',1,'2026-12-01',1,1,1),
    ('real','owner','rooms','published','Real listing','Real description','Хан-Уул',800000,'2026-12-01',0,1,1);`)
  const migration = readFileSync(new URL('../migrations/0002_archive_demo_listings.sql', import.meta.url), 'utf8')
  await db.exec(migration); await db.exec(migration)
  assert.equal((await db.prepare("SELECT status FROM listings WHERE id='example'").first()).status, 'archived')
  assert.equal((await db.prepare("SELECT status FROM listings WHERE id='real'").first()).status, 'published')
  assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM user').first()).count, 1)
})
