import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

// Explicitly local, disposable integration accounts; never targets remote D1 or real users.
const origin = 'http://127.0.0.1:8787', client = resolve(import.meta.dirname, '../../../Front-End/client')
const users = [], suffix = randomBytes(6).toString('hex')
let checks = 0
async function call(path, { cookie, body, ...options } = {}, expected = 200) {
  const response = await fetch(origin + path, { ...options, headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) })
  const data = response.headers.get('content-type')?.includes('json') ? await response.json() : null
  assert.equal(response.status, expected, JSON.stringify({ path, expected, status: response.status, error: data?.error || data?.message })); checks++
  return { data, cookie: response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ') }
}
try {
  const credentials = { password: randomBytes(18).toString('hex') }
  const first = await call('/api/auth/sign-up/email', { method:'POST',body:{...credentials,name:'Disposable API A',email:`api-a-${suffix}@hamtry.invalid`} })
  users.push(first.data.user.id)
  const second = await call('/api/auth/sign-up/email', { method:'POST',body:{...credentials,name:'Disposable API B',email:`api-b-${suffix}@hamtry.invalid`} })
  users.push(second.data.user.id)
  const a=first.cookie,b=second.cookie
  assert.ok(a && b)
  await call('/api/v1/me',{cookie:a})
  const listing={kind:'rooms',title:`Integration room ${suffix}`,description:'A disposable local test listing.',district:'Хан-Уул',price:800000,available:'2026-11-20',location:[106.91,47.91]}
  await call('/api/v1/listings',{method:'POST',body:listing},401)
  await call('/api/v1/listings',{method:'POST',cookie:a,body:{...listing,ownerId:users[1]}},422)
  const draft=(await call('/api/v1/listings',{method:'POST',cookie:a,body:listing},201)).data.data
  await call(`/api/v1/listings/${draft.id}`,{},404)
  await call(`/api/v1/listings/${draft.id}`,{method:'PUT',cookie:b,body:listing},404)
  await call(`/api/v1/listings/${draft.id}/publish`,{method:'POST',cookie:a},409)
  const room=(await call(`/api/v1/listings/${draft.id}/rooms`,{method:'POST',cookie:a,body:{name:'Зочны өрөө',position:0}},201)).data.data
  const upload=(blob)=>{const form=new FormData();form.set('roomId',room.id);form.set('position','0');form.set('caption','Local fixture');for(const variant of ['detail','card','map'])form.set(variant,blob,'photo.png');return form}
  await call(`/api/v1/listings/${draft.id}/photos`,{method:'POST',cookie:a,body:upload(new Blob(['<svg/>'],{type:'image/png'}))},422)
  const bytes=readFileSync(resolve(client,'public/demo/room.png'))
  const media=(await call(`/api/v1/listings/${draft.id}/photos`,{method:'POST',cookie:a,body:upload(new Blob([bytes],{type:'image/png'}))},201)).data.data
  await call(`/api/v1/media/${media[0].id}`,{cookie:b},404)
  await call(`/api/v1/media/${media[0].id}`,{cookie:a})
  await call(`/api/v1/listings/${draft.id}/publish`,{method:'POST',cookie:a})
  const published=(await call(`/api/v1/listings/${draft.id}`)).data.data
  assert.equal(published.rooms[0].photos.length,1)
  assert.equal(published.ownerId,users[0]);assert.ok(!('email' in published))
  const searched=(await call(`/api/v1/listings?q=${suffix}&limit=1`)).data
  assert.equal(searched.data[0].id,draft.id)
  await call(`/api/v1/media/${media[0].id}`)
  await call(`/api/v1/saved/${draft.id}`,{method:'PUT',cookie:b},204)
  assert.equal((await call('/api/v1/saved',{cookie:b})).data.data[0].id,draft.id)
  await call(`/api/v1/saved/${draft.id}`,{method:'DELETE',cookie:b},204)
  await call('/api/v1/reports',{method:'POST',cookie:b,body:{listingId:draft.id,reason:'Disposable integration test report.'}},201)
  await call('/api/v1/admin/reports',{cookie:b},403)
  await call('/api/v1/listings',{method:'POST',cookie:a,body:listing,headers:{Origin:'https://untrusted.example'}},403)
  await call(`/api/v1/listings/${draft.id}`,{method:'DELETE',cookie:a},204)
  await call(`/api/v1/listings/${draft.id}`,{},404)
  await call('/api/auth/sign-out',{method:'POST',cookie:a,body:{}})
  await call('/api/v1/me',{cookie:a},401)
  console.log(`${checks} local API checks passed: auth, ownership, publication, R2 uploads, saved items, moderation and CSRF.`)
} finally {
  if (users.length && users.every(id=>/^[\w-]+$/.test(id))) {
    const ids=users.map(id=>`'${id}'`).join(',')
    const sql=`DELETE FROM reports WHERE reporter_id IN (${ids}) OR listing_id IN (SELECT id FROM listings WHERE owner_id IN (${ids})); DELETE FROM photos WHERE owner_id IN (${ids}); DELETE FROM rooms WHERE listing_id IN (SELECT id FROM listings WHERE owner_id IN (${ids})); DELETE FROM saved_listings WHERE user_id IN (${ids}); DELETE FROM verification_checks WHERE user_id IN (${ids}); DELETE FROM listings WHERE owner_id IN (${ids}); DELETE FROM user WHERE id IN (${ids});`
    execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute','hamtry-db-local','--local','--config','wrangler.local.jsonc','--command',sql],{cwd:client,stdio:'pipe'})
  }
}
